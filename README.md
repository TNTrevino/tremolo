# Tremolo

<!--toc:start-->

- [Tremolo](#tremolo)
  - [Goal](#goal)
  - [Current Progress (DEPLOYMENT IS BEHIND):](#current-progress-deployment-is-behind)
  - [Run the Project Locally](#run-the-project-locally)
    - [Database](#database)
    - [Environment Setup](#environment-setup)
    - [Serve it locally](#serve-it-locally)
      - [Frontend](#frontend)
      - [Music generation microservice](#music-generation-microservice)
      - [User tracking microservice](#user-tracking-microservice)
      - [Scripts](#scripts)
  - [Technologies Used](#technologies-used)
    - [Frontend](#frontend-1)
    - [Backend](#backend)

<!--toc:end-->

## Goal

I want to make a one stop shop where educators can send students to practice their specific music, sight reading, and much more.

This project is deigned for music students 6th through 12th in public school.

This also be a technical exercise for myself as I will be learning a huge amount of things on the way.

## Current Progress (DEPLOYMENT IS BEHIND):

[deployment](https://tremolonotes.com/)

## Run the Project Locally

Once per clone, activate the git pre-commit hook (formats staged files per
service — Prettier / Black / goimports+gofumpt):

```bash
make hooks
```

### Database

Make sure you have a database named `tremolo` and you have the tables inserted properly. You can see the schema in the `./core-api/database/schema.sql` file.

Make the tables, then association.

TODO: automate this plz

### Environment Setup

```bash
  export DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
  export DATABASE_USER="<username>"
  export DATABASE_PW="<password>"

  export LOG_LEVEL=DEBUG # or INFO/WARN/ERROR. DEBUG also turns on the query log
  export LOG_FORMAT=json # or text. Leave unset on a laptop for readable colour output
  # export LOG_SQL_ARGS=true # adds query arguments to the log; they carry tokens and emails
  # export LOG_SQL_TEXT=true # prints the whole statement under each query line
  export CLICOLOR_FORCE=1 # keeps the log colour under air, which pipes the output

  export JWT_SECRET="your-very-secure-random-string-at-least-32-characters" # min 32 chars required

  export ACCESS_TOKEN_EXPIRY_MINUTES=15 # access token expiry (15-30 minutes recommended)
  export REFRESH_TOKEN_EXPIRY_HOURS=168 # refresh token expiry (168 hours = 7 days)

  export MAX_LOGIN_ATTEMPTS=5 # max failed login attempts before account lockout
  export ACCOUNT_LOCKOUT_DURATION_MINUTES=15 # duration to lock account after max failed attempts

  export ALLOWED_ORIGINS="http://localhost:4200,http://localhost:4300" # comma-separated list

  export PUBLIC_BASE_URL="http://localhost:4200" # origin every emailed link is built on

  # Email. Leave EMAIL_SMTP_HOST or EMAIL_FROM unset and email is simply off:
  # the service boots, mail is still queued, and the watcher holds it until
  # there is a relay to send it to.
  export EMAIL_SMTP_HOST="smtp.example.com"       # unset = email disabled
  export EMAIL_SMTP_PORT=587                      # default 587 (STARTTLS submission)
  export EMAIL_SMTP_USER="your-smtp-username"
  export EMAIL_SMTP_PASSWORD="your-smtp-password"
  export EMAIL_FROM="no-reply@tremolonotes.com"   # unset = email disabled
  export EMAIL_FROM_NAME="Tremolo"                # display name and app name in templates

  export EMAIL_SEND_TIMEOUT_SECONDS=20     # bound on one delivery attempt
  export EMAIL_WATCHER_INTERVAL_SECONDS=30 # gap between queue drains
  export EMAIL_BATCH_SIZE=10               # messages one drain claims
  export EMAIL_MAX_ATTEMPTS=5              # tries before a message is marked dead
  export EMAIL_CLAIM_LEASE_SECONDS=300     # before another watcher may retake a claimed row

  # Email verification is soft while unset/false: signup still mails a
  # verify link and an unverified user still sees a banner, but login is
  # never blocked. Keep this off for the pilot.
  export REQUIRE_EMAIL_VERIFICATION=false
```

The frontend needs **none** of these. It is an Angular app and reads its
config from `frontend/src/environments/environment.ts`, a source file — there
is no `.env` for it locally. `ALLOWED_ORIGINS` must list whichever port you
serve it on, though, or the Go service rejects the preflight.

### Serve it locally

> [!NOTE]
> For each terminal, you must ensure you have the environment variables set in
> order for the services to communicate with each other.

#### Frontend

Angular 22 requires Node `^22.22.3 || ^24.15.0 || >=26.0.0`. `frontend/.nvmrc`
pins 24, and on this project nvm lives at `~/.config/nvm`, not `~/.nvm`:

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24

cd frontend

npm install && npm run dev     # ng serve on http://localhost:4200
```

Add `-- --port 4300` for a second server. Both 4200 and 4300 are in the Go
service's default `ALLOWED_ORIGINS` above.

The end-to-end suite (`npm run e2e`) needs both backends running and a server
already up; point it with `E2E_BASE_URL=http://localhost:4300`. See
`frontend/e2e/README.md`.

#### Music generation microservice

```bash

cd music-api

python3 -m venv env

source env/bin/activate

pip install -r requirements.txt

fastapi dev main.py

```

#### User tracking microservice

```bash

cd core-api
go run main.go

```

#### Scripts

Install dependencies script, nice if you use worktrees/different directories:

```bash
chmod +x ./scripts/install-deps.sh
./scripts/install-deps.sh
```

TODO: add tmux script we made

## Technologies Used

### Frontend

Angular 22 - standalone components, zoneless change detection, signals for
state and RxJS for streams. Migrated from React in 2026; the migration record
lives in `frontend/.migration/`.

TypeScript

TailwindCSS - the design system lives in `frontend/DESIGN.md`

OpenSheetMusicDisplay - Display the musical files on the web browser

Playwright + vitest - the E2E parity suite and the unit tests

### Backend

Music21 - Generate the midi and xml files as needed

FastAPI - Complementing the music21 library very well. Used for the music generations microservice.

Go - sqlc for database interaction and mapping to structs. Used for the user tracking microservice
