#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci || npm install

echo "Building project..."
npm run build

echo "Build completed successfully!"
