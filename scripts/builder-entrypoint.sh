#!/bin/sh
set -e
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
exec node apps/builder/server.js
