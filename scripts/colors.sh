#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
DIM='\033[2m'
CODE='\033[48;5;238m\033[38;5;252m'
RESET='\033[0m'

red()    { echo -e "${RED}$*${RESET}"; }
green()  { echo -e "${GREEN}$*${RESET}"; }
yellow() { echo -e "${YELLOW}$*${RESET}"; }
bold()   { echo -e "${BOLD}$*${RESET}"; }
dim()    { echo -e "${DIM}$*${RESET}"; }
code()   { echo -e "${CODE}$*${RESET}"; }
