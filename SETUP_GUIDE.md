# Quick Setup Guide 🚀

Follow these steps to get your Exchange Campaign Manager Bot up and running in minutes.

## Step 1: Get Your Bot Token 🤖

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "My Exchange Bot")
4. Choose a username ending in 'bot' (e.g., "myexchange_bot")
5. **Copy the token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

## Step 2: Get Your Telegram User ID 🆔

1. Open Telegram and search for **@userinfobot**
2. Send `/start` command
3. **Copy your user ID** (just the number, e.g., `123456789`)

## Step 3: Configure the Bot ⚙️

1. Open the `.env` file in the project directory
2. Replace the placeholder values:

```env
BOT_TOKEN=paste_your_token_here
ADMIN_IDS=paste_your_user_id_here
DEFAULT_CHANNEL=@yourchannelname
BASE_URL=https://yourdomain.com
```

**Important:**
- Remove any spaces in `ADMIN_IDS`
- Multiple admins: `ADMIN_IDS=123456789,987654321`
- Your public domain for `BASE_URL` (no trailing slash)

## Step 4: Install Dependencies 📦

Open terminal in the project directory:

```bash
npm install
```

Wait for all dependencies to install (~30 seconds).

## Step 5: Start the Bot 🎬

### Option A: Development Mode (with auto-reload)

```bash
npm run dev
```

### Option B: Production Mode

```bash
npm start
```

### Option C: Docker (Recommended for production)

```bash
docker-compose up -d
```

## Step 6: Test the Bot ✅

1. Open Telegram and find your bot
2. Send `/start` command
3. You should see the welcome message!

Try creating your first campaign:
```
/newcampaign
```

## Step 7: Set Up Your Channel 📢

To post to channels, the bot needs admin rights:

1. Go to your Telegram channel
2. Open channel info → Administrators
3. Click "Add Administrator"
4. Search for your bot username
5. Enable "Post Messages" permission
6. Click "Done"

## Testing Your Setup 🧪

### 1. Create a Campaign

```
/newcampaign
```

Follow the wizard to create your first campaign.

### 2. Generate a Link

```
/newlink 1 @yourchannel "Click Here"
```

### 3. Test the Link

Click or visit the generated short link. It should redirect to your affiliate URL.

### 4. Post to Channel

```
/post 1 @yourchannel "🔥 Check out this amazing offer!"
```

### 5. View Stats

```
/stats 1
```

You should see your campaign statistics!

## Common Issues 🔧

### Bot doesn't respond
- ✅ Check `BOT_TOKEN` is correct (no spaces)
- ✅ Verify your user ID is in `ADMIN_IDS`
- ✅ Make sure bot is running (check terminal)

### "Access denied" message
- ✅ Your Telegram user ID must be in `ADMIN_IDS`
- ✅ Get your ID from @userinfobot
- ✅ Restart bot after changing `.env`

### Can't post to channel
- ✅ Bot must be added as admin to channel
- ✅ "Post Messages" permission must be enabled
- ✅ Use channel username with @ (e.g., @mychannel)
- ✅ Channel must be public (not private group)

### Links don't redirect
- ✅ Express server must be running (starts with bot)
- ✅ `BASE_URL` must match your public domain
- ✅ Port 3000 must be accessible
- ✅ Check firewall settings

### "Database error"
- ✅ Check write permissions in project directory
- ✅ Ensure enough disk space
- ✅ Try deleting `app.db` and restart (recreates database)

## Next Steps 🎯

1. **Set up a domain**: Point a domain to your server
2. **Enable HTTPS**: Use Let's Encrypt with nginx/caddy
3. **Configure backups**: Set up automatic database backups
4. **Monitor health**: Use external monitoring service
5. **Create campaigns**: Start tracking your affiliate links!

## Need Help? 💬

- Check the [README.md](README.md) for detailed documentation
- Review [CHANGELOG.md](CHANGELOG.md) for version history
- Open an issue on GitHub for bugs or questions

## Quick Command Reference 📝

```bash
# View all campaigns
/campaigns

# Create new campaign
/newcampaign

# Generate link
/newlink <id> @channel "label"

# Post to channel
/post <id> @channel "message"

# View stats
/stats <id>

# Health check
/health
```

---

**Congratulations! Your bot is ready to track affiliate campaigns! 🎉**

Start by creating your first campaign with `/newcampaign`
