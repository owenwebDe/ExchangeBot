# Exchange Campaign Manager Bot 🚀

A production-ready Telegram bot for managing exchange affiliate campaigns with click tracking and analytics. Built with Node.js, Telegraf, and SQLite.

## Features ✨

- **Campaign Management**: Create and manage multiple affiliate campaigns
- **UTM Tracking**: Automatic UTM parameter generation and tracking
- **Click Tracking**: Record every click with IP, user agent, and timestamp
- **Analytics**: Comprehensive statistics with CTR, channel breakdowns, and timelines
- **Channel Posting**: Automated posting with inline buttons to Telegram channels
- **Rate Limiting**: Built-in protection against click spam
- **Health Monitoring**: System health checks and uptime monitoring
- **Admin-Only Access**: Secure access control for authorized users only

## Tech Stack 🛠️

- **Runtime**: Node.js 18+
- **Bot Framework**: Telegraf 4.x
- **Database**: SQLite 3 (better-sqlite3)
- **Web Server**: Express.js
- **Logging**: Winston
- **Containerization**: Docker & Docker Compose

## Quick Start 🏁

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Telegram Bot Token ([get one from @BotFather](https://t.me/botfather))
- Your Telegram User ID ([get it from @userinfobot](https://t.me/userinfobot))

### Installation

1. **Clone or download this repository**

```bash
cd ExchangeBot
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=123456789,987654321
DEFAULT_CHANNEL=@yourchannel
BASE_URL=https://yourdomain.com
PORT=3000
NODE_ENV=production
```

**Configuration Details:**
- `BOT_TOKEN`: Get from [@BotFather](https://t.me/botfather)
- `ADMIN_IDS`: Comma-separated Telegram user IDs (no spaces)
- `DEFAULT_CHANNEL`: Optional default channel for posting
- `BASE_URL`: Your public domain (without trailing slash)
- `PORT`: Server port (default: 3000)

4. **Run the bot**

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The bot and server will start on port 3000 (or your configured PORT).

## Docker Deployment 🐳

### Using Docker Compose (Recommended)

1. **Create `.env` file** (see Configuration above)

2. **Start the container**

```bash
docker-compose up -d
```

3. **View logs**

```bash
docker-compose logs -f
```

4. **Stop the container**

```bash
docker-compose down
```

### Using Docker directly

```bash
# Build image
docker build -t exchange-bot .

# Run container
docker run -d \
  --name exchange-bot \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  exchange-bot
```

## Bot Setup in Telegram Channels 📢

For the bot to post to your channels:

1. **Add bot to channel**: Go to your channel settings → Administrators → Add Administrator
2. **Grant permissions**: Enable "Post Messages" permission
3. **Get channel username**: Must be public channel with @ username (e.g., @mychannel)

## Command Reference 📖

### Campaign Management

**`/newcampaign`** - Create a new campaign (wizard flow)
- Guides you through: name → exchange → URL → UTM parameters

**`/campaigns [page]`** - List all campaigns
```
/campaigns        # First page
/campaigns 2      # Page 2
```

**`/deletecampaign <id>`** - Delete a campaign (soft delete)
```
/deletecampaign 5
```

### Link Management

**`/newlink <campaignId> [@channel] [label]`** - Generate tracked link
```
/newlink 12                                    # Uses default channel
/newlink 12 @DexNewToken                       # Specify channel
/newlink 12 @DexNewToken "Trade on OKX"        # Custom button label
```

**`/links <campaignId>`** - View all links for a campaign
```
/links 12
```

### Posting

**`/post <campaignId> [@channel] [text]`** - Post to channel with inline button
```
/post 12 @DexNewToken "🔥 New listing promo — fees reduced!"
```

### Analytics

**`/stats <campaignId>`** - View campaign statistics
```
/stats 12
```

Output includes:
- Total clicks and posts
- Impressions and CTR
- Per-channel breakdown
- Top performing link

**`/linkstats <code>`** - View specific link statistics
```
/linkstats aB92Kz
```

Output includes:
- Total and recent clicks
- 24-hour and 7-day trends
- Hourly timeline

### System

**`/health`** - System health check
- Database status
- Record counts
- System operational status

**`/help`** - Show help message with all commands

## Architecture 🏗️

```
/src
  ├── bot.js              # Telegraf bot with all commands
  ├── server.js           # Express redirect server
  ├── db.js               # SQLite schema and queries
  ├── campaigns.js        # Business logic for campaigns
  ├── index.js            # Main entry point
  ├── middleware/
  │   └── auth.js         # Admin authentication
  └── utils/
      ├── logger.js       # Winston logging
      └── helpers.js      # Utility functions
```

## Database Schema 💾

### Tables

**campaigns**
- Campaign metadata with UTM parameters
- Soft delete support

**links**
- Short codes and final URLs
- Associated with campaigns and channels

**clicks**
- Click events with metadata
- IP, user agent, timestamp tracking

**posts**
- Channel posts with message IDs
- Optional impression tracking

### Backup & Restore

The database file is `app.db` in the project root.

**Backup:**
```bash
cp app.db app.db.backup
# or with Docker
docker cp exchange-bot:/app/app.db ./backup/app.db.$(date +%Y%m%d)
```

**Restore:**
```bash
cp app.db.backup app.db
# or with Docker
docker cp ./backup/app.db exchange-bot:/app/app.db
docker-compose restart
```

## API Endpoints 🌐

### `GET /r/:code`
Redirect endpoint for tracked links

**Parameters:**
- `:code` - Link code (path parameter)
- `tg_user_id` - Optional Telegram user ID (query parameter)

**Response:**
- `302 Redirect` - Success, redirects to final URL
- `404 Not Found` - Invalid code
- `429 Too Many Requests` - Rate limit exceeded

**Rate Limits:**
- 20 requests per minute per IP (sliding window)
- 10 clicks per minute per IP (burst protection)

### `GET /healthz`
Health check endpoint for monitoring

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": {
    "dbPath": "/app/app.db",
    "campaigns": 15,
    "links": 87,
    "clicks": 5432,
    "posts": 43
  }
}
```

## Security Features 🔒

- **Admin-only access**: All bot commands require authorized user ID
- **URL validation**: Only http/https URLs allowed, prevents open redirects
- **Rate limiting**: Multiple layers of protection against click spam
- **Input sanitization**: All user inputs are validated and sanitized
- **Secure redirects**: Final URLs validated before redirect

## Monitoring & Logs 📊

### Log Files

- `combined.log` - All logs (info, warn, error)
- `error.log` - Error logs only

### Log Rotation

- Max file size: 5MB
- Max files: 5 (automatic rotation)

### Docker Logs

```bash
# View logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs exchange-bot
```

## Troubleshooting 🔧

### Bot doesn't respond
- Check `BOT_TOKEN` is correct
- Verify your user ID is in `ADMIN_IDS`
- Check bot logs for errors

### Can't post to channel
- Ensure bot is added as admin to channel
- Verify "Post Messages" permission is enabled
- Channel must be public with @ username

### Clicks not tracking
- Check `BASE_URL` matches your public domain
- Verify Express server is running and accessible
- Check firewall/port forwarding for port 3000

### Database errors
- Ensure write permissions on `app.db`
- Check disk space
- Try deleting `app.db` to recreate (loses data)

### Docker issues
- Check `.env` file exists and is correct
- Verify port 3000 is not already in use
- Check Docker logs: `docker-compose logs`

## Development 💻

### Project Structure

```
ExchangeBot/
├── src/                  # Source code
├── data/                 # Database and persistent data
├── logs/                 # Log files
├── .env                  # Environment configuration
├── package.json          # Dependencies
├── Dockerfile            # Docker image definition
└── docker-compose.yml    # Docker Compose configuration
```

### Scripts

```json
{
  "start": "node src/index.js",
  "dev": "node --watch src/index.js"
}
```

### Adding New Commands

1. Add command handler in [src/bot.js](src/bot.js)
2. Use `isAdmin` middleware for protection
3. Add to help text and README
4. Test thoroughly before deploying

### Extending Database

1. Add migration in [src/db.js](src/db.js)
2. Update queries module
3. Test with backup database
4. Document schema changes

## Performance Tips ⚡

- SQLite WAL mode enabled for better concurrency
- Database indexes on frequently queried columns
- Rate limiting prevents abuse
- Efficient query patterns with prepared statements

## License 📄

MIT License - feel free to use for commercial or personal projects

## Support & Contributing 💬

- Report bugs via GitHub Issues
- Pull requests welcome
- For questions, check existing issues first

## Roadmap 🗺️

Future enhancements:
- [ ] Web dashboard for campaign management
- [ ] Webhook support for real-time updates
- [ ] Advanced analytics with charts
- [ ] Multi-language support
- [ ] A/B testing for different links
- [ ] Export data to CSV/JSON
- [ ] Integration with more exchanges

## Credits 👏

Built with:
- [Telegraf](https://github.com/telegraf/telegraf) - Modern Telegram Bot Framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - Fast SQLite3 bindings
- [Express](https://expressjs.com/) - Web framework
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

**Made with ❤️ for crypto affiliate marketers**

Need help? Open an issue or check the troubleshooting section above.
