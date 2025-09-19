#!/bin/bash
# Auto-commit script for mijn-webapp
cd /Users/renevanderwerff/Projects/mijn-webapp
git add .
git commit -m "$1"
git push
echo "✅ Changes committed and pushed successfully!"
