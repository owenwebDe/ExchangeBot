# AI Exchange Bot - Admin Guide

## Overview
AI Exchange Bot is a Telegram Mini App that helps manage exchange affiliate campaigns with built-in referral tracking and points system. This guide explains how to use the admin panel and what users experience on the frontend.

---

## Getting Started

### Accessing the Bot
1. Open Telegram and search for **@AiExchangeBot_bot**
2. Start a conversation with the bot by clicking `/start`
3. Click **"🚀 Get Started"** or **"🚀 Open App"** to open the Mini App

### Admin Access
The bot automatically recognizes authorized admin users (IDs: 496429218, 8016701415, 6714870473). When you open the Mini App as an admin, you'll see the **Admin Panel** interface instead of the regular user interface.

---

## Admin Panel Features

### 1. Campaigns Tab

This is where you manage all your exchange affiliate campaigns.

#### Creating a New Campaign

1. Click the **"➕ New Campaign"** button
2. Fill in the required information:
   - **Campaign Name**: A descriptive name (e.g., "Binance January Promo")
   - **Exchange**: The exchange name (e.g., "Binance", "OKX", "Bybit")
   - **Affiliate URL**: Your raw affiliate link from the exchange
   - **Points per Referral**: How many points users earn per successful referral (default: 10)
3. Click **"Create Campaign"**

**What happens:**
- The system creates a campaign and makes it available to all users
- Users can now see this task in their "Tasks" tab
- Each user who joins gets a unique tracking link

#### Campaign Information Display

Each campaign card shows:
- **Campaign Name** and **Exchange**
- **Creation Date**
- **Total Clicks** - How many times referral links have been clicked
- **Active Links** - How many users have joined this campaign

#### Managing Campaigns

- Click on a campaign card to view detailed statistics
- Click the **"🗑️"** button to delete a campaign (requires confirmation)

### 2. Links Tab

This tab shows all generated referral links across all campaigns.

#### Generating Admin Links

1. Select a campaign from the dropdown menu
2. Click **"🔗 Generate Link"**
3. Enter a channel username (e.g., "@mychannel")
4. Click **"Generate Link"**

**What you get:**
- A short tracking link (e.g., `https://exchangebot-kj7w.onrender.com/r/ABC123`)
- The link redirects to the exchange with UTM parameters for tracking
- All clicks on this link are tracked and attributed to the specified channel

#### Link Information Display

Each link shows:
- **Short Code** (e.g., "ABC123")
- **Campaign Name**
- **Channel/User** who owns the link
- **Total Clicks**
- **Click Through Rate**
- **Short URL** (click to copy)

### 3. Statistics Tab

View detailed analytics for any campaign.

#### Viewing Campaign Stats

1. Select a campaign from the dropdown
2. View comprehensive statistics:
   - **Total Clicks** - All-time clicks on this campaign's links
   - **Unique Users** - Number of users who joined this campaign
   - **Active Links** - Total referral links generated
   - **Conversion Rate** - Percentage of users who completed the action
   - **Top Performing Links** - Which links/channels are getting the most clicks
   - **Click Timeline** - Hourly breakdown of traffic

---

## User Experience (Frontend)

### What Regular Users See

When non-admin users open the Mini App, they see the **User Interface** with three main tabs:

### 1. Tasks Tab

**What Users See:**
- A list of all available campaigns/tasks
- Each task card displays:
  - Exchange name and logo
  - Campaign name
  - Points they can earn per referral
  - "Join Task" button

**User Actions:**
- Click on a task to view details
- Click **"Get Link"** to join the campaign
- Receive their personal referral link instantly

**What Happens Behind the Scenes:**
- System creates a unique tracking code for this user + campaign
- Generates a short URL with embedded tracking
- Records the user's participation in the database

### 2. Referral Tab

**What Users See:**
- **Bot Referral Link** - Their personal link to invite friends to the bot itself
  - Format: `https://t.me/AiExchangeBot_bot?start=ref_[USER_ID]`
  - Each friend who joins using this link is tracked as their referral
- **Copy Button** - Quick copy to clipboard
- **Share Button** - Opens Telegram share dialog
- **My Referral Links** - All campaign links they've generated
  - Each shows the campaign name, their unique code, and click count
  - One-click copy functionality

**User Actions:**
- Share their bot referral link on social media, channels, or directly to friends
- Share campaign-specific links for different exchanges
- Track performance of each link

**What Happens Behind the Scenes:**
- When someone joins via their referral link, they earn points
- System tracks the referral relationship in the database
- Points are automatically awarded based on campaign settings

### 3. Leaderboard Tab

**What Users See:**
- **Global Rankings** - Top 10 users by total points
- Each entry shows:
  - Rank position (🥇 🥈 🥉 for top 3)
  - Username
  - Total points earned
  - Number of referrals

**Gamification Effect:**
- Creates competition among users
- Encourages more sharing and engagement
- Shows who the top performers are

---

## Points & Rewards System

### How Users Earn Points

1. **Joining Campaigns** - Users join tasks but earn points through referrals
2. **Successful Referrals** - When someone clicks their link and completes an action
   - Points awarded: Set by admin when creating campaign (default: 10 points)
3. **Bot Referrals** - When someone joins the bot using their referral link
   - Additional points may be awarded

### User Profile Stats

Users can see:
- **Total Points** - Lifetime points earned
- **Number of Referrals** - Total people referred
- **Tasks Completed** - Number of campaigns joined
- **Current Rank** - Position on leaderboard

---

## Click Tracking & Analytics

### What Gets Tracked

Every click on a referral link records:
- **Timestamp** - When the click occurred
- **IP Address** - For fraud detection and analytics
- **User Agent** - Browser/device information
- **Telegram User ID** (if available) - Links click to user account
- **Referrer Information** - Which user or channel generated this click

### Rate Limiting & Protection

The system includes built-in protections:
- **20 clicks per minute per IP** - Prevents spam
- **Burst protection** - Additional sliding window rate limiting
- **Open redirect validation** - Only redirects to valid HTTPS URLs

---

## Technical Details

### System Architecture

- **Platform**: Telegram Mini App (Web-based)
- **Backend**: Node.js + Express
- **Database**: SQLite with WAL mode (high performance)
- **Hosting**: Render.com (cloud platform)
- **URL**: https://exchangebot-kj7w.onrender.com

### Key Features

1. **Real-time Updates** - Statistics update instantly
2. **Mobile-Optimized** - Works perfectly on all devices
3. **Fast Performance** - Minimal loading times
4. **Secure Authentication** - Telegram WebApp authentication
5. **Data Persistence** - All data stored securely in database

### Short Link Format

- Base URL: `https://exchangebot-kj7w.onrender.com/r/[CODE]`
- Code: Random 6-character alphanumeric code
- Redirects to: Original affiliate URL + UTM parameters + tracking

Example:
```
Short Link: https://exchangebot-kj7w.onrender.com/r/Xy9K2m
↓
Redirects to: https://binance.com/register?ref=YOUR_ID&utm_source=telegram&utm_medium=webapp&utm_campaign=binance_jan&tg_channel=@yourchannel&ref=[USER_ID]
```

---

## Best Practices for Admins

### Campaign Setup
1. **Use clear names** - Users should immediately understand what the task is
2. **Set appropriate points** - Higher points for harder tasks or premium exchanges
3. **Test links first** - Always verify the affiliate URL works before creating campaign
4. **Monitor performance** - Check statistics regularly to see what's working

### User Engagement
1. **Create multiple campaigns** - Give users variety and options
2. **Update regularly** - Add new campaigns to keep users coming back
3. **Reward top performers** - Consider bonuses for leaderboard leaders
4. **Communicate** - Use Telegram channels to announce new campaigns

### Analytics & Optimization
1. **Track conversion rates** - Which campaigns perform best?
2. **Monitor click patterns** - When do users share links most?
3. **Identify top channels** - Which distribution channels work best?
4. **A/B test points** - Experiment with different point values

---

## Troubleshooting

### Common Issues

**"Link not found" error**
- The tracking code may have expired or been deleted
- Regenerate a new link

**Low click rates**
- Campaign may not be appealing to users
- Consider adjusting points per referral
- Promote the campaign more actively

**Users can't access admin panel**
- Verify their Telegram user ID is in the admin list
- Contact technical support to add new admins

---

## Support & Maintenance

### Bot Status
- Health check endpoint: https://exchangebot-kj7w.onrender.com/healthz
- Uptime monitoring: Available through Render dashboard

### Database Backups
- Automatic backups recommended
- Database location: `/app/app.db` on server
- Export data regularly for safety

### Adding New Admins
To add a new admin user:
1. Get their Telegram user ID
2. Add it to the `ADMIN_IDS` environment variable in Render dashboard
3. Restart the service

---

## Security & Privacy

### Data Protection
- User data encrypted in transit (HTTPS)
- Database access restricted to application only
- No passwords stored (Telegram authentication only)

### Fraud Prevention
- Rate limiting prevents abuse
- IP tracking identifies suspicious patterns
- Admin monitoring of unusual activity

### Compliance
- GDPR-ready architecture
- User data can be exported/deleted on request
- Transparent tracking and data usage

---

## Conclusion

The AI Exchange Bot provides a complete solution for managing exchange affiliate campaigns with advanced tracking, gamification, and analytics. The admin panel gives you full control over campaigns while users enjoy a smooth, engaging experience that encourages sharing and participation.

For technical support or questions, refer to the development documentation or contact the technical team.

---

**Bot URL**: https://t.me/AiExchangeBot_bot
**Admin Panel**: Open bot → Click "🚀 Get Started"
**Web Interface**: https://exchangebot-kj7w.onrender.com/app

**Admin User IDs**: 496429218, 8016701415, 6714870473
