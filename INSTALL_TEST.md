# Installation Test Checklist ✅

Use this checklist to verify your Exchange Campaign Manager Bot installation.

## Pre-Installation Checks ☑️

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Bot token obtained from @BotFather
- [ ] Admin user ID obtained from @userinfobot
- [ ] `.env` file created and configured

## Installation Steps ☑️

- [ ] Dependencies installed (`npm install`)
- [ ] No installation errors
- [ ] `node_modules` directory created
- [ ] `app.db` file created (after first run)

## Configuration Checks ☑️

### .env File
- [ ] `BOT_TOKEN` is set (66 characters, contains colon)
- [ ] `ADMIN_IDS` contains valid user IDs (numbers only)
- [ ] `BASE_URL` is set with https:// (production)
- [ ] `PORT` is set (default: 3000)
- [ ] No trailing spaces or quotes around values

Example correct .env:
```
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz-123456789
ADMIN_IDS=123456789,987654321
DEFAULT_CHANNEL=@mychannel
BASE_URL=https://track.yourdomain.com
PORT=3000
NODE_ENV=production
```

## Startup Tests ☑️

### Start the Bot

```bash
npm start
```

Expected output:
```
[TIMESTAMP] INFO: Starting Exchange Campaign Manager Bot...
[TIMESTAMP] INFO: Initializing database...
[TIMESTAMP] INFO: Database schema initialized successfully
[TIMESTAMP] INFO: Starting Express server...
[TIMESTAMP] INFO: Express server listening on port 3000
[TIMESTAMP] INFO: Starting Telegram bot...
[TIMESTAMP] INFO: Telegram bot started successfully
[TIMESTAMP] INFO: Bot username: @your_bot_name
[TIMESTAMP] INFO: All services started successfully!
```

### Check for Errors

- [ ] No error messages in console
- [ ] Bot shows "started successfully"
- [ ] Server shows port number
- [ ] No database errors

## Bot Functionality Tests ☑️

### 1. Basic Commands

Open Telegram and message your bot:

#### Test: /start
```
/start
```
**Expected:** Welcome message with command list

- [ ] Bot responds within 2 seconds
- [ ] Message shows all commands
- [ ] Markdown formatting works

#### Test: /help
```
/help
```
**Expected:** Detailed command reference

- [ ] Bot responds
- [ ] Command examples shown
- [ ] Formatting correct

#### Test: /health
```
/health
```
**Expected:** System health check

- [ ] Shows "System Health Check"
- [ ] Database path displayed
- [ ] Shows counts (0 for new installation)
- [ ] Status shows "operational"

### 2. Campaign Creation

#### Test: /newcampaign
```
/newcampaign
```

Follow wizard:
1. **Name:** Test Campaign
2. **Exchange:** Binance
3. **URL:** https://example.com
4. **UTM Source:** telegram (or press enter)
5. **UTM Medium:** channel (or press enter)
6. **Confirm:** confirm

**Expected:**
- [ ] Bot asks for name
- [ ] Bot asks for exchange
- [ ] Bot asks for URL
- [ ] Bot asks for UTM parameters
- [ ] Bot shows summary
- [ ] Bot creates campaign
- [ ] Shows campaign ID

#### Test: /campaigns
```
/campaigns
```
**Expected:**
- [ ] Shows campaign list
- [ ] Test campaign visible
- [ ] Campaign ID #1 shown

### 3. Link Generation

#### Test: /newlink
```
/newlink 1 @testchannel "Test Button"
```
**Expected:**
- [ ] Bot generates link
- [ ] Shows short URL
- [ ] Shows code (7-8 characters)
- [ ] Button label shown

Copy the short URL for next test.

### 4. Stats Commands

#### Test: /stats
```
/stats 1
```
**Expected:**
- [ ] Shows campaign stats
- [ ] 0 clicks initially
- [ ] 0 posts initially
- [ ] Formatted correctly

#### Test: /links
```
/links 1
```
**Expected:**
- [ ] Shows links for campaign
- [ ] Test link visible
- [ ] Click count shown (0)

### 5. Delete Campaign

#### Test: /deletecampaign
```
/deletecampaign 1
```
**Expected:**
- [ ] Confirmation message
- [ ] Campaign deleted

## Server Functionality Tests ☑️

### 1. Health Endpoint

Open browser or use curl:
```bash
curl http://localhost:3000/healthz
```

**Expected:**
```json
{
  "status": "OK",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": {
    "dbPath": "/path/to/app.db",
    "campaigns": 0,
    "links": 1,
    "clicks": 0,
    "posts": 0
  }
}
```

- [ ] Returns 200 status
- [ ] JSON format correct
- [ ] Status is "OK"
- [ ] Shows correct counts

### 2. Redirect Endpoint

Visit the short link from earlier test in browser.

**Expected:**
- [ ] Redirects to affiliate URL
- [ ] Redirect is instant (302)
- [ ] No errors shown

### 3. Click Tracking

After visiting the link, check stats:
```
/linkstats <your_code>
```

**Expected:**
- [ ] Shows 1 click
- [ ] Recent clicks shown
- [ ] Timeline displayed

## Database Tests ☑️

### Check Database File

```bash
ls -lh app.db
```

**Expected:**
- [ ] File exists
- [ ] File size > 0 bytes
- [ ] File has write permissions

### Check Database Content

```bash
sqlite3 app.db ".tables"
```

**Expected tables:**
```
campaigns  clicks  links  posts
```

- [ ] All 4 tables exist

### Check Data

```bash
sqlite3 app.db "SELECT COUNT(*) FROM campaigns;"
```

**Expected:**
- [ ] Returns a number (at least 1 if campaign created)

## File Structure Tests ☑️

Check all files exist:

```bash
ls -la
```

**Expected files:**
- [ ] `src/` directory
- [ ] `package.json`
- [ ] `.env` file
- [ ] `app.db` (after first run)
- [ ] `node_modules/` directory

**Expected structure:**
```
✓ src/index.js
✓ src/bot.js
✓ src/server.js
✓ src/db.js
✓ src/campaigns.js
✓ src/middleware/auth.js
✓ src/utils/logger.js
✓ src/utils/helpers.js
```

## Docker Tests (If Using Docker) ☑️

### Build Test
```bash
docker-compose build
```
- [ ] Builds without errors
- [ ] Image created successfully

### Start Test
```bash
docker-compose up -d
```
- [ ] Container starts
- [ ] No errors in logs

### Health Test
```bash
docker-compose ps
```
- [ ] Shows container running
- [ ] Status is "healthy" (after ~30s)

### Logs Test
```bash
docker-compose logs
```
- [ ] Shows startup messages
- [ ] No errors visible

## Security Tests ☑️

### 1. Admin Protection Test

Create a second Telegram account (or ask someone) to test:

```
/start
```

**Expected:**
- [ ] Bot responds with "Access denied"
- [ ] No commands execute
- [ ] Admin-only protection working

### 2. Rate Limit Test

Visit same short link 25+ times quickly.

**Expected:**
- [ ] After ~20 requests: "Too many requests"
- [ ] Rate limiting working
- [ ] Protection active

## Performance Tests ☑️

### Resource Usage

```bash
# If using Docker
docker stats exchange-bot

# If using Node directly
top -p $(pgrep -f "node src/index.js")
```

**Expected:**
- [ ] CPU: < 10% (idle)
- [ ] Memory: < 200 MB
- [ ] No memory leaks

### Response Time

```bash
time curl http://localhost:3000/healthz
```

**Expected:**
- [ ] Response < 100ms
- [ ] Consistent response times

## Log Tests ☑️

### Check Log Files

```bash
ls -la *.log
```

**Expected files:**
- [ ] `combined.log`
- [ ] `error.log`

### Check Log Content

```bash
tail -n 50 combined.log
```

**Expected:**
- [ ] Contains startup messages
- [ ] Timestamps present
- [ ] Log levels shown (INFO, DEBUG)
- [ ] No unexpected ERRORs

## Cleanup After Tests ☑️

If this was just a test installation:

```bash
# Stop bot (Ctrl+C)

# Remove test data
rm app.db

# Remove logs
rm *.log

# Or start fresh
npm start
```

## Troubleshooting Failed Tests ❌

### Bot doesn't start
1. Check `.env` file exists and is correct
2. Verify `BOT_TOKEN` format
3. Check node version: `node --version`
4. Reinstall dependencies: `rm -rf node_modules && npm install`

### Bot doesn't respond
1. Check bot is running (terminal shows no errors)
2. Verify your user ID in `ADMIN_IDS`
3. Check bot username is correct
4. Try `/start` with the exact bot username

### Server doesn't respond
1. Check port 3000 is not in use: `lsof -i :3000`
2. Try different port in `.env`
3. Check firewall settings
4. Verify server started (check logs)

### Database errors
1. Check write permissions: `chmod 755 .`
2. Delete and recreate: `rm app.db && npm start`
3. Check disk space: `df -h`

### Docker issues
1. Check Docker is running: `docker ps`
2. Check `.env` file exists
3. View logs: `docker-compose logs`
4. Rebuild: `docker-compose down && docker-compose up -d --build`

## Success Criteria ✅

Your installation is successful if:

- [ ] All basic commands work
- [ ] Campaign creation works
- [ ] Link generation works
- [ ] Stats display correctly
- [ ] Health endpoint responds
- [ ] Redirects work
- [ ] Click tracking works
- [ ] No errors in logs
- [ ] Admin protection active
- [ ] Rate limiting works

## Final Test: Complete Workflow ☑️

Perform complete workflow:

1. Create campaign: `/newcampaign`
2. Generate link: `/newlink 1 @test "Click"`
3. Visit link in browser
4. Check stats: `/stats 1`
5. View link stats: `/linkstats <code>`

**If all 5 steps work:** ✅ **Installation successful!**

---

## Need Help? 🆘

If any tests fail:

1. Check [SETUP_GUIDE.md](SETUP_GUIDE.md)
2. Review [README.md](README.md) troubleshooting section
3. Check logs for specific errors
4. Verify all configuration files
5. Open an issue with test results

---

**Print this checklist and check off items as you test! 📋**
