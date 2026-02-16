#!/bin/bash
# Setup and push script for chrome-sideplay-extension

echo "Setting up chrome-sideplay-extension repository..."

# Check if origin remote exists
if git remote | grep -q "^origin$"; then
    echo "Remote 'origin' already exists. Updating..."
    git remote set-url origin https://github.com/chnlich/chrome-sideplay-extension.git
else
    echo "Adding remote 'origin'..."
    git remote add origin https://github.com/chnlich/chrome-sideplay-extension.git
fi

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

echo "Done! Repository pushed to https://github.com/chnlich/chrome-sideplay-extension"
