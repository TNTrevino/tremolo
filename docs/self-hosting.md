# Self-Hosting Tremolo on Raspberry Pi 5

This guide walks through deploying Tremolo on a Raspberry Pi 5 with automated CI/CD via GitHub Actions.

## Architecture Overview

```
                    Internet
                        │
                        ▼
              ┌─────────────────┐
              │     Caddy       │  (HTTPS, Let's Encrypt)
              │  Port 80/443    │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
tremolonotes.com  api.tremolonotes.com
   (static)           /api/* → Go:5001
                      /music/* → Python:8000
                             │
                             ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    │  (internal) │
                    └─────────────┘
```

**Deployment Flow:** Push to GitHub → Self-hosted runner builds on Pi → Services restart

---

## 1. Prerequisites

### Install Build Dependencies

```bash
sudo apt update
sudo apt install -y \
    python3-venv \
    python3-pip \
    nodejs \
    npm \
    golang-go \
    caddy \
    postgresql
```

### Verify Versions

```bash
node --version    # Should be 18+
go version        # Should be 1.21+
python3 --version # Should be 3.10+
psql --version    # Should be 14+
```

If Node.js is too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

## 2. Project Setup

### Clone the Repository

```bash
mkdir -p ~/projects/tremolo
cd ~/projects/tremolo
git clone https://github.com/<your-username>/tremolo.git .
```

### Initial Build (one-time)

```bash
# Frontend
cd ~/projects/tremolo/frontend
npm ci
npm run build

# Python
cd ~/projects/tremolo/backend/music
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt

# Go
cd ~/projects/tremolo/backend/main
go build -o tremolo-api main.go
```

---

## 3. PostgreSQL

### Create Database and User

```bash
sudo -u postgres psql << 'EOF'
CREATE USER tremolo_user WITH PASSWORD '<your-password>';
CREATE DATABASE tremolo OWNER tremolo_user;
EOF
```

### Apply Schema

```bash
cd ~/projects/tremolo/backend/main
psql -U tremolo_user -d tremolo -f database/schema.sql
```

### Verify Connection

```bash
psql -U tremolo_user -d tremolo -c "SELECT 1;"
```

---

## 4. Environment Configuration

Create a single `.env` file at the project root:

```bash
cat > ~/projects/tremolo/.env << 'EOF'
# Database
DATABASE_URL=postgresql://tremolo_user:<password>@localhost:5432/tremolo
DATABASE_USER=tremolo_user
DATABASE_PW=<password>

# JWT Authentication
JWT_SECRET=<run: openssl rand -base64 32>
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_HOURS=168

# Security
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=15

# CORS
ALLOWED_ORIGINS=https://tremolonotes.com

# Logging
LOG_LEVEL=WARN
LOG_FORMAT=json

# Python-specific
ENVIRONMENT=production
DEBUG=false
EOF
```

Generate a secure JWT secret:

```bash
openssl rand -base64 32
```

---

## 5. Systemd Services

### Go API Service

Create `/etc/systemd/system/tremolo-api.service`:

```bash
sudo tee /etc/systemd/system/tremolo-api.service << 'EOF'
[Unit]
Description=Tremolo User Tracking API
After=network.target postgresql.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/tremolo/backend/main
EnvironmentFile=/home/pi/projects/tremolo/.env
ExecStart=/home/pi/projects/tremolo/backend/main/tremolo-api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Python Music Service

Create `/etc/systemd/system/tremolo-music.service`:

```bash
sudo tee /etc/systemd/system/tremolo-music.service << 'EOF'
[Unit]
Description=Tremolo Music Generation Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/projects/tremolo/backend/music
EnvironmentFile=/home/pi/projects/tremolo/.env
ExecStart=/home/pi/projects/tremolo/backend/music/env/bin/gunicorn main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    -b 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Enable and Start Services

```bash
sudo systemctl daemon-reload
sudo systemctl enable tremolo-api tremolo-music
sudo systemctl start tremolo-api tremolo-music
```

### Verify Services

```bash
sudo systemctl status tremolo-api
sudo systemctl status tremolo-music
```

---

## 6. Caddy (Reverse Proxy + HTTPS)

### Configure Caddy

Create `/etc/caddy/Caddyfile`:

```bash
sudo tee /etc/caddy/Caddyfile << 'EOF'
tremolonotes.com {
    root * /home/pi/projects/tremolo/frontend/dist
    file_server
    try_files {path} /index.html
    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}

api.tremolonotes.com {
    handle /api/* {
        reverse_proxy localhost:5001
    }

    handle /music/* {
        reverse_proxy localhost:8000
    }

    handle /health {
        respond "OK" 200
    }
}
EOF
```

### Enable and Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

### Verify Caddy

```bash
sudo systemctl status caddy
curl http://localhost:80
```

---

## 7. GitHub Actions Runner

### Download Runner

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner

# ARM64 for Pi 5
curl -o actions-runner-linux-arm64-2.321.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-arm64-2.321.0.tar.gz

tar xzf ./actions-runner-linux-arm64-2.321.0.tar.gz
```

### Configure Runner

1. Go to your GitHub repo → Settings → Actions → Runners → New self-hosted runner
2. Copy the token from the config command
3. Run:

```bash
./config.sh --url https://github.com/<your-username>/tremolo --token <YOUR_TOKEN>
```

### Install as System Service

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

### Allow Runner to Restart Services

The runner needs passwordless sudo for service restarts:

```bash
sudo tee /etc/sudoers.d/tremolo-deploy << 'EOF'
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart tremolo-api
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart tremolo-music
pi ALL=(ALL) NOPASSWD: /bin/systemctl reload caddy
EOF
```

### Configure GitHub Secret

In your GitHub repo, add a secret:

1. Settings → Secrets and variables → Actions → New repository secret
2. Name: `BASE_DIR`
3. Value: `/home/pi/projects/tremolo`

---

## 8. DNS & Router Configuration

### DNS Records

At your domain registrar, add A records pointing to your public IP:

| Type | Name | Value |
|------|------|-------|
| A | tremolonotes.com | `<your-public-ip>` |
| A | api | `<your-public-ip>` |

### Router Port Forwarding

Forward these ports to your Pi's local IP:

| External Port | Internal Port | Protocol |
|---------------|---------------|----------|
| 80 | 80 | TCP |
| 443 | 443 | TCP |

### Find Your Pi's Local IP

```bash
hostname -I
```

---

## 9. Firewall (Optional)

```bash
sudo apt install ufw
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 10. Verification

### Check All Services

```bash
sudo systemctl status tremolo-api tremolo-music caddy
```

### View Logs

```bash
# Go API logs
journalctl -u tremolo-api -f

# Python Music logs
journalctl -u tremolo-music -f

# Caddy logs
journalctl -u caddy -f
```

### Test Endpoints

```bash
# Health check
curl https://api.tremolonotes.com/health

# Music API
curl -X POST https://api.tremolonotes.com/music/note-game \
  -H "Content-Type: application/json" \
  -d '{"scale":"C","octave":"4"}'

# Frontend
curl https://tremolonotes.com
```

---

## Troubleshooting

### Service won't start

```bash
# Check logs for errors
journalctl -u tremolo-api -n 50 --no-pager

# Verify env file exists
cat ~/projects/tremolo/.env

# Test binary manually
cd ~/projects/tremolo/backend/main
./tremolo-api
```

### Caddy certificate issues

```bash
# Check Caddy logs
journalctl -u caddy -n 50

# Verify DNS is pointing to your IP
dig tremolonotes.com

# Test with HTTP first
curl http://tremolonotes.com
```

### GitHub runner not picking up jobs

```bash
# Check runner status
cd ~/actions-runner
./svc.sh status

# Restart runner
sudo ./svc.sh restart

# Check logs
journalctl -u actions.runner.* -f
```

### Database connection issues

```bash
# Test connection
psql -U tremolo_user -d tremolo -c "SELECT 1;"

# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL in .env
grep DATABASE_URL ~/projects/tremolo/.env
```

---

## Port Summary

| Service | Port | Binding | External Access |
|---------|------|---------|-----------------|
| Caddy | 80, 443 | 0.0.0.0 | Yes (internet) |
| Go API | 5001 | 127.0.0.1 | No (via Caddy) |
| Python Music | 8000 | 127.0.0.1 | No (via Caddy) |
| PostgreSQL | 5432 | 127.0.0.1 | No (internal) |

---

## Directory Structure

```
/home/pi/
├── projects/tremolo/              # Git repo
│   ├── .env                       # Shared environment (NOT committed)
│   ├── frontend/
│   │   └── dist/                  # Built static files
│   ├── backend/
│   │   ├── main/
│   │   │   └── tremolo-api        # Built Go binary
│   │   └── music/
│   │       └── env/               # Python virtual environment
│   └── .github/workflows/
│       └── deploy.yml             # CI/CD workflow
└── actions-runner/                # GitHub Actions runner
```

## DATABASE USERS

```
● Yes! In PostgreSQL, you can restrict the app user to only have CRUD permissions, no DDL (drop/alter).

  Setup with two users:

  -- Run as postgres superuser
  sudo -u postgres psql

  -- 1. Create an admin user that owns the schema (for migrations)
  CREATE USER tremolo_admin WITH PASSWORD '<admin-password>';

  -- 2. Create the app user (limited permissions)
  CREATE USER tremolo_app WITH PASSWORD '<app-password>';

  -- 3. Create database owned by admin
  CREATE DATABASE tremolo OWNER tremolo_admin;

  -- 4. Connect to the database
  \c tremolo

  -- 5. Admin creates the schema (run migrations as admin)
  -- ... your schema.sql runs here as tremolo_admin ...

  -- 6. Grant limited permissions to app user
  GRANT CONNECT ON DATABASE tremolo TO tremolo_app;
  GRANT USAGE ON SCHEMA public TO tremolo_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tremolo_app;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tremolo_app;

  -- 7. Make sure future tables also get these grants
  ALTER DEFAULT PRIVILEGES FOR USER tremolo_admin IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tremolo_app;
  ALTER DEFAULT PRIVILEGES FOR USER tremolo_admin IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO tremolo_app;
```
