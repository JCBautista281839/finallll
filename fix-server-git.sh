#!/bin/bash

# Script to fix git merge conflict on server
# Run this on your server via SSH or cPanel terminal

echo "🔧 Fixing git merge conflict on server..."

# Navigate to the project directory
cd /home/vpxksyxtjx/viktoriasbistro.restaurant

# Check current status
echo "📋 Current git status:"
git status

# Stash any uncommitted changes
echo "💾 Stashing uncommitted changes..."
git stash

# Pull latest changes
echo "⬇️ Pulling latest changes from remote..."
git pull origin main

# If there are stashed changes, apply them back
echo "📦 Checking for stashed changes..."
if git stash list | grep -q "stash@{0}"; then
    echo "🔄 Applying stashed changes back..."
    git stash pop
else
    echo "✅ No stashed changes to apply"
fi

# Final status check
echo "📋 Final git status:"
git status

echo "✅ Git merge conflict fixed!"
