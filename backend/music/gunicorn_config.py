"""
Gunicorn configuration for FastAPI Music Service production deployment.

This configuration is optimized for:
- Production stability and performance
- Multiple worker processes
- Graceful shutdown
- Detailed logging
"""

import os
import multiprocessing

# Get environment variables
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
WORKERS = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# Gunicorn Configuration
# =====================

# Server Socket
bind = f"{HOST}:{PORT}"
backlog = 2048

# Worker Processes
workers = WORKERS
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2

# Server Mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
accesslog = "-"  # Log to stdout
errorlog = "-"  # Log to stderr
loglevel = LOG_LEVEL
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
)

# Process Naming
proc_name = "music-service"


# Server Hooks
def post_fork(server, worker):
    """Called after worker process has been forked."""
    server.log.info("Worker spawned (pid: %s)", worker.pid)


def pre_fork(server, worker):
    """Called before worker process is forked."""
    pass


def pre_exec(server):
    """Called before the new master process is forked."""
    server.log.info("Forking new master process")


def when_ready(server):
    """Called when the server is ready. Logs startup message."""
    server.log.info("Server is ready. Spawning workers")


def worker_int(worker):
    """Called when a worker receives the SIGINT signal."""
    worker.log.info("Worker received INT")


def worker_abort(worker):
    """Called when a worker receives the SIGABRT signal."""
    worker.log.info("Worker received SIGABRT")


# Environment-specific settings
if ENVIRONMENT == "development":
    workers = 1
    reload = True
    reload_extra_files = ["./routers", "./services", "./models.py"]
    loglevel = "debug"
elif ENVIRONMENT == "staging":
    workers = WORKERS // 2  # Half capacity for staging
    reload = False
    loglevel = "info"
elif ENVIRONMENT == "production":
    workers = WORKERS
    reload = False
    loglevel = "warning"
    # Production-specific optimizations
    max_requests = 1000  # Restart worker after 1000 requests
    max_requests_jitter = 50  # Add randomness to restart timing

# Application
app_uri = "main:app"

# SSL/HTTPS (optional, configure if needed)
# keyfile = "/path/to/keyfile.pem"
# certfile = "/path/to/certfile.pem"
# ca_certs = "/path/to/cacerts.pem"
