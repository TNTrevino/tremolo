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
service — Prettier / Black / gofmt):

```bash
make hooks
```


### Database

Make sure you have a database named `tremolo` and you have the tables inserted properly. You can see the schema in the `./backend/main/database/schema.sql` file. 

Make the tables, then association.

TODO: automate this plz

### Environment Setup

``` bash
  export DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
  export DATABASE_USER="<username>"
  export DATABASE_PW="<password>"

  export VITE_BACKEND_MAIN="http://localhost:5001" # default local setup
  export VITE_BACKEND_MUSIC="http://localhost:8000" # default local setup

  export LOG_LEVEL=DEBUG # or WARN/ERROR/DEBUG
  export LOG_FORMAT=json # or text

  export JWT_SECRET="your-very-secure-random-string-at-least-32-characters" # min 32 chars required

  export ACCESS_TOKEN_EXPIRY_MINUTES=15 # access token expiry (15-30 minutes recommended)
  export REFRESH_TOKEN_EXPIRY_HOURS=168 # refresh token expiry (168 hours = 7 days)

  export MAX_LOGIN_ATTEMPTS=5 # max failed login attempts before account lockout
  export ACCOUNT_LOCKOUT_DURATION_MINUTES=15 # duration to lock account after max failed attempts

  export ALLOWED_ORIGINS="http://localhost:5173,http://localhost:5173" # comma-separated list
```

### Serve it locally

> [!NOTE]
> For each terminal, you must ensure you have the environment variables set in
> order for the services to communicate with each other.

#### Frontend

``` bash
cd frontend

npm install && npm run dev
```

#### Music generation microservice

``` bash

cd backend/music

python3 -m venv env

source env/bin/activate

pip install -r requirements.txt

fastapi dev main.py 

```

#### User tracking microservice


``` bash

cd backend/main
go run main.go

```

#### Scripts

Install dependencies script, nice if you use worktrees/different directories:

``` bash
chmod +x ./scripts/install-deps.sh
./scripts/install-deps.sh
```

TODO: add tmux script we made


## Technologies Used

### Frontend

React

TypeScript

Material UI - Beautiful UI components

OpenSheetMusicDisplay - Display the musical files on the web browser

### Backend

Music21 - Generate the midi and xml files as needed

FastAPI - Complementing the music21 library very well. Used for the music generations microservice.

Go - sqlc for database interaction and mapping to structs. Used for the user tracking microservice
