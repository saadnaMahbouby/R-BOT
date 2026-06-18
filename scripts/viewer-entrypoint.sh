#!/bin/bash

node ./check-license.mjs || exit 1

cd apps/viewer;
node  -e "const { configureRuntimeEnv } = require('next-runtime-env/build/configure'); configureRuntimeEnv();"
cd ../..;

NODE_OPTIONS=--no-node-snapshot HOSTNAME=${HOSTNAME:-0.0.0.0} PORT=${PORT:-3000} node apps/viewer/server.js;