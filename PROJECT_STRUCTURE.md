# Project Structure 📁

Complete overview of the Exchange Campaign Manager Bot project structure.

```
ExchangeBot/
│
├── src/                          # Source code directory
│   ├── index.js                  # Main entry point (starts bot + server)
│   ├── bot.js                    # Telegraf bot with all commands
│   ├── server.js                 # Express redirect server
│   ├── db.js                     # SQLite database schema and queries
│   ├── campaigns.js              # Campaign business logic
│   │
│   ├── middleware/               # Middleware directory
│   │   └── auth.js              # Admin authentication middleware
│   │
│   └── utils/                    # Utility functions
│       ├── logger.js            # Winston logging configuration
│       └── helpers.js           # Helper functions (slugify, makeCode, etc.)
│
├── scripts/                      # Utility scripts
│   ├── backup.sh                # Database backup script
│   └── restore.sh               # Database restore script
│
├── data/                         # Data directory (created at runtime)
│   └── (database files)         # SQLite database files
│
├── logs/                         # Log directory (created at runtime)
│   ├── combined.log             # All logs
│   └── error.log                # Error logs only
│
├── backups/                      # Backup directory (created by scripts)
│   └── (backup files)           # Database backups
│
├── .env                          # Environment variables (DO NOT COMMIT)
├── .env.example                  # Example environment file
├── .gitignore                    # Git ignore rules
├── .dockerignore                 # Docker ignore rules
│
├── package.json                  # Node.js dependencies and scripts
├── package-lock.json             # Locked dependency versions
│
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Docker Compose configuration
│
├── README.md                     # Main documentation
├── SETUP_GUIDE.md               # Quick setup instructions
├── DEPLOYMENT.md                # Production deployment guide
├── EXAMPLES.md                  # Usage examples
├── CHANGELOG.md                 # Version history
└── PROJECT_STRUCTURE.md         # This file
```

## File Descriptions 📝

### Core Application Files

#### `src/index.js`
- Main entry point for the application
- Initializes database
- Starts Express server and Telegram bot
- Handles graceful shutdown
- Error handling for uncaught exceptions

#### `src/bot.js`
- Telegram bot implementation using Telegraf
- All bot commands and handlers
- Wizard flows for campaign creation
- Admin authentication on all commands
- User state management for multi-step flows

#### `src/server.js`
- Express web server
- Redirect endpoint (`/r/:code`)
- Health check endpoint (`/healthz`)
- Rate limiting middleware
- Click tracking and logging

#### `src/db.js`
- SQLite database initialization
- Schema definitions for all tables
- Query functions for all operations
- Database health checks
- WAL mode for better concurrency

#### `src/campaigns.js`
- Campaign CRUD operations
- Link generation with unique codes
- Click recording and tracking
- Statistics calculation
- CTR and analytics functions
- Formatting functions for bot responses

### Middleware

#### `src/middleware/auth.js`
- Admin authentication middleware
- Parses ADMIN_IDS from environment
- Protects bot commands
- Logs unauthorized access attempts

### Utilities

#### `src/utils/logger.js`
- Winston logger configuration
- File and console logging
- Log levels (debug, info, warn, error)
- Automatic log rotation
- Timestamp formatting

#### `src/utils/helpers.js`
- `slugify()` - URL-safe string conversion
- `makeCode()` - Base62 code generation
- `buildUrl()` - URL builder with query params
- `isValidUrl()` - URL validation
- `formatDate()` - Date formatting
- `calculatePercentage()` - Percentage calculator
- `formatNumber()` - Number formatter (K/M)
- Other utility functions

### Scripts

#### `scripts/backup.sh`
- Creates database backup
- Timestamps backup files
- Maintains last 10 backups
- Displays backup size

#### `scripts/restore.sh`
- Restores database from backup
- Creates safety backup before restore
- Validates backup file exists

### Configuration Files

#### `.env`
- Environment variables
- Bot token, admin IDs
- Server configuration
- **NEVER COMMIT THIS FILE**

#### `.env.example`
- Template for .env file
- Safe to commit
- Documents all required variables

#### `package.json`
- Node.js project metadata
- Dependencies list
- NPM scripts
- Engine requirements

#### `Dockerfile`
- Docker image definition
- Node.js 18 Alpine base
- Multi-stage build
- Health check configuration
- Volume mounts

#### `docker-compose.yml`
- Docker Compose service definition
- Port mappings
- Environment variables
- Volume mounts
- Restart policies
- Health checks

#### `.gitignore`
- Git ignore patterns
- Excludes node_modules, .env, logs, database
- Prevents sensitive data commits

#### `.dockerignore`
- Docker ignore patterns
- Excludes files not needed in image
- Reduces image size

### Documentation

#### `README.md`
- Main project documentation
- Features overview
- Installation instructions
- Command reference
- Architecture overview
- Troubleshooting guide

#### `SETUP_GUIDE.md`
- Step-by-step setup instructions
- Beginner-friendly
- Common issues and solutions
- Quick testing guide

#### `DEPLOYMENT.md`
- Production deployment guide
- Multiple deployment options
- Security hardening
- Monitoring setup
- Scaling considerations
- Emergency procedures

#### `EXAMPLES.md`
- Real-world usage examples
- Complete workflows
- Best practices
- Tips and tricks
- Common patterns

#### `CHANGELOG.md`
- Version history
- Feature additions
- Bug fixes
- Breaking changes
- Migration notes

## Data Flow 🔄

### Campaign Creation Flow
```
User → /newcampaign
     → Wizard (bot.js)
     → createCampaign() (campaigns.js)
     → campaignQueries.create() (db.js)
     → SQLite Database
```

### Link Generation Flow
```
User → /newlink <id>
     → generateLink() (campaigns.js)
     → makeCode() (helpers.js)
     → buildUrl() (helpers.js)
     → linkQueries.create() (db.js)
     → SQLite Database
```

### Click Tracking Flow
```
User → Clicks short link
     → Express /r/:code (server.js)
     → getLinkByCode() (campaigns.js)
     → recordClick() (campaigns.js)
     → clickQueries.create() (db.js)
     → 302 Redirect → Affiliate URL
```

### Stats Generation Flow
```
User → /stats <id>
     → getCampaignStats() (campaigns.js)
     → Multiple query functions (db.js)
     → formatCampaignStats() (campaigns.js)
     → Bot Response
```

## Database Tables 💾

### campaigns
- Campaign metadata
- UTM parameters
- Soft delete flag

### links
- Short codes
- Final URLs with UTM
- Channel and label info
- Foreign key to campaigns

### clicks
- Click events
- IP, user agent
- Timestamp
- Foreign key to links

### posts
- Channel posts
- Message IDs
- Impressions (optional)
- Foreign key to campaigns

## Important Directories 📂

### Created Automatically
- `data/` - Database files
- `logs/` - Log files
- `backups/` - Backup files (when script runs)

### Docker Volumes
- `/app/data` - Persistent database
- `/app/logs` - Log files

## Environment Variables 🔧

### Required
- `BOT_TOKEN` - Telegram bot token
- `ADMIN_IDS` - Comma-separated user IDs
- `BASE_URL` - Public domain for short links

### Optional
- `DEFAULT_CHANNEL` - Default channel for posting
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## NPM Scripts 📜

```json
{
  "start": "node src/index.js",      // Production
  "dev": "node --watch src/index.js" // Development with auto-reload
}
```

## Docker Commands 🐳

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# Shell access
docker-compose exec exchange-bot sh
```

## File Sizes (Approximate) 📊

```
Source Code:     ~50 KB
Documentation:   ~100 KB
Dependencies:    ~50 MB (node_modules)
Docker Image:    ~200 MB
Database:        Variable (grows with usage)
Logs:           Variable (max 5MB per file)
```

## Dependency Tree 🌳

### Production Dependencies
```
telegraf          # Telegram bot framework
express           # Web server
better-sqlite3    # SQLite database
dotenv            # Environment variables
express-rate-limit # Rate limiting
winston           # Logging
```

### Development Dependencies
```
nodemon           # Auto-reload in development
```

## Security Considerations 🔒

### Protected Files
- `.env` - Contains sensitive tokens
- `app.db` - Contains all data
- `*.log` - May contain sensitive info

### Access Control
- All bot commands require admin authentication
- Express endpoints have rate limiting
- URL validation prevents open redirects

### Best Practices
- Never commit .env file
- Regularly backup database
- Keep dependencies updated
- Monitor logs for suspicious activity
- Use HTTPS in production

## Maintenance Tasks 🔧

### Daily
- Monitor logs for errors
- Check health endpoint

### Weekly
- Review disk space
- Check backup success

### Monthly
- Update dependencies
- Optimize database (VACUUM)
- Review performance metrics

---

**This structure is designed for:**
- ✅ Easy navigation
- ✅ Clear separation of concerns
- ✅ Production readiness
- ✅ Simple maintenance
- ✅ Docker deployment
- ✅ Scalability

**Questions?** Check other documentation files or open an issue.
