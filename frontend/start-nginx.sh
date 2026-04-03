#!/bin/sh
set -e

# Substitute only our env vars, leaving nginx variables ($host, $uri, etc.) intact
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx on port ${PORT}..."
exec nginx -g 'daemon off;'
