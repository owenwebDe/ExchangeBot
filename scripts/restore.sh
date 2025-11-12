#!/bin/bash

# Database Restore Script
# Usage: ./scripts/restore.sh <backup_file>

if [ $# -eq 0 ]; then
    echo "Usage: ./scripts/restore.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/app_db_*.db 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1
DB_FILE="./app.db"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Create backup of current database
if [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    echo "📦 Creating safety backup of current database..."
    cp "$DB_FILE" "./backups/pre_restore_$TIMESTAMP.db"
fi

# Restore database
echo "♻️  Restoring database from: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
    echo "⚠️  Please restart the bot for changes to take effect."
else
    echo "❌ Restore failed!"
    exit 1
fi
