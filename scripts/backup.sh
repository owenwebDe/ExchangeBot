#!/bin/bash

# Database Backup Script
# Usage: ./scripts/backup.sh

BACKUP_DIR="./backups"
DB_FILE="./app.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/app_db_$TIMESTAMP.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Database file not found: $DB_FILE"
    exit 1
fi

# Create backup
echo "📦 Creating backup..."
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"

    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup size: $SIZE"

    # Keep only last 10 backups
    echo "🗑️  Cleaning old backups (keeping last 10)..."
    ls -t "$BACKUP_DIR"/app_db_*.db | tail -n +11 | xargs -r rm

    echo "✅ Backup completed!"
else
    echo "❌ Backup failed!"
    exit 1
fi
