#!/bin/sh
set -e
node ./check-license.mjs || exit 1
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"
exec node apps/builder/server.js
