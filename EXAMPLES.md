# Usage Examples 📚

Real-world examples of how to use the Exchange Campaign Manager Bot.

## Example 1: Binance New Listing Campaign

### Step 1: Create Campaign

Send `/newcampaign` to the bot and follow the wizard:

```
Bot: Please enter the campaign name:
You: Binance New Listings January

Bot: Enter the exchange name:
You: Binance

Bot: Enter the base affiliate URL:
You: https://accounts.binance.com/register?ref=ABC123

Bot: Enter UTM source (default: telegram):
You: telegram

Bot: Enter UTM medium (default: channel):
You: channel

Bot: Campaign Summary
     Name: Binance New Listings January
     Exchange: Binance
     URL: https://accounts.binance.com/register?ref=ABC123
     UTM Source: telegram
     UTM Medium: channel
     UTM Campaign: binance-new-listings-january-2025-01-15

     Reply with "confirm" to create or "cancel" to abort.

You: confirm

Bot: ✅ Campaign Created!
     ID: 1
     Name: Binance New Listings January

     Use `/newlink 1` to generate tracked links.
```

### Step 2: Generate Link for Channel

```
/newlink 1 @DexNewToken "Trade on Binance"
```

Response:
```
✅ Link Generated!

Campaign: Binance New Listings January
Channel: @DexNewToken
Short URL: `https://yourdomain.com/r/aB3xK9z`
Code: `aB3xK9z`

Button label: "Trade on Binance"

Use `/post 1` to post this to your channel.
```

### Step 3: Post to Channel

```
/post 1 @DexNewToken "🔥 NEW: $TOKEN just listed on Binance!
Sign up now and get 20% fee discount for life! 💰"
```

Response:
```
✅ Posted to @DexNewToken!

Campaign: Binance New Listings January
Message ID: 12345
Link: `aB3xK9z`
```

### Step 4: Check Stats

After some time, check performance:

```
/stats 1
```

Response:
```
📊 Campaign #1 — "Binance New Listings January"
Exchange: Binance

📝 Posts: 3  |  👆 Total Clicks: 742
👀 Impressions: 15,300
📈 CTR: 4.8%

Channels:
  @DexNewToken: 2 posts, 610 clicks
  @AlphaCalls: 1 posts, 132 clicks

🏆 Top link: `r/aB3xK9z` — 420 clicks
```

## Example 2: OKX Multi-Channel Campaign

### Create Campaign

```
/newcampaign
```

Follow wizard with these inputs:
- Name: **OKX Trading Competition**
- Exchange: **OKX**
- URL: **https://www.okx.com/join/12345678**
- UTM Source: **telegram**
- UTM Medium: **channel**

### Generate Links for Multiple Channels

```
/newlink 2 @DexNewToken "Join OKX"
/newlink 2 @CryptoSignals "Trade Now"
/newlink 2 @AltcoinDaily "Start Trading"
```

### Post to All Channels

```
/post 2 @DexNewToken "🎯 OKX Trading Competition - $100K Prize Pool!
Win big by trading your favorite altcoins. Join now! 🚀"

/post 2 @CryptoSignals "💎 Trade on OKX and compete for $100K!
Low fees, high liquidity. Sign up today!"

/post 2 @AltcoinDaily "⚡️ OKX Competition Alert!
Trade to win. New users get welcome bonus! 🎁"
```

### View All Links

```
/links 2
```

Response:
```
🔗 Links for Campaign #2
OKX Trading Competition

`bC4yL8m` - @DexNewToken
  Clicks: 234
  URL: https://yourdomain.com/r/bC4yL8m

`dE6aP2n` - @CryptoSignals
  Clicks: 187
  URL: https://yourdomain.com/r/dE6aP2n

`fG8qR5k` - @AltcoinDaily
  Clicks: 156
  URL: https://yourdomain.com/r/fG8qR5k
```

## Example 3: Tracking Specific Link Performance

### Check Individual Link Stats

```
/linkstats bC4yL8m
```

Response:
```
🔗 Link Stats: `bC4yL8m`
Channel: @DexNewToken
Created: Jan 15, 2025, 10:30 AM

👆 Total Clicks: 234
📅 Last 24h: 67 clicks
📅 Last 7 days: 234 clicks

Recent Timeline:
  Jan 15, 10AM: 12 clicks
  Jan 15, 11AM: 23 clicks
  Jan 15, 12PM: 18 clicks
  Jan 15, 01PM: 14 clicks
```

## Example 4: Managing Multiple Campaigns

### List All Campaigns

```
/campaigns
```

Response:
```
📋 Campaigns (Page 1/1)

*#1* - Binance New Listings January
  Exchange: Binance
  Created: 1/15/2025

*#2* - OKX Trading Competition
  Exchange: OKX
  Created: 1/15/2025

*#3* - Bybit Copy Trading
  Exchange: Bybit
  Created: 1/15/2025
```

### Compare Campaign Performance

```
/stats 1
/stats 2
/stats 3
```

Analyze which campaign performs best and optimize accordingly.

## Example 5: Delete Old Campaign

### Delete a Campaign

```
/deletecampaign 3
```

Response:
```
✅ Campaign #3 "Bybit Copy Trading" has been deleted.
```

Note: This is a soft delete - data remains in database but campaign is hidden.

## Advanced Usage

### Custom Button Labels

Make your buttons more appealing:

```
/newlink 1 @DexNewToken "🔥 Get 20% Discount"
/newlink 1 @DexNewToken "💰 Claim Welcome Bonus"
/newlink 1 @DexNewToken "🚀 Start Trading Now"
```

### A/B Testing

Create multiple links with different labels for the same campaign:

```
/newlink 1 @DexNewToken "Sign Up Now"
/newlink 1 @DexNewToken "Start Trading"
/newlink 1 @DexNewToken "Join Binance"
```

Then track which performs best with `/linkstats`.

### Scheduled Campaigns

Create campaigns in advance:

```
/newcampaign
# Name: Binance February Promo
# Set everything up but don't post yet
# When ready, use /post to publish
```

### Multi-Exchange Strategy

Track performance across different exchanges:

```
Campaign #1: Binance - Average CTR: 4.8%
Campaign #2: OKX - Average CTR: 3.2%
Campaign #3: Bybit - Average CTR: 5.1%
Campaign #4: KuCoin - Average CTR: 2.9%

Result: Bybit performs best for our audience!
```

## Tips & Best Practices 💡

### 1. Naming Conventions

Use clear, descriptive names:
- ✅ "Binance New Listings January 2025"
- ✅ "OKX Trading Competition Q1"
- ❌ "Campaign 1"
- ❌ "Test"

### 2. UTM Consistency

Keep UTM parameters consistent:
- **Source**: Always use "telegram"
- **Medium**: Use "channel" for channels, "group" for groups
- **Campaign**: Auto-generated, descriptive

### 3. Button Labels

Make them action-oriented:
- ✅ "Trade Now", "Get Bonus", "Join Competition"
- ❌ "Click Here", "Link", "Open"

### 4. Message Templates

Create effective messages:

**Good Example:**
```
🔥 NEW LISTING: $TOKEN on Binance!

✅ 20% fee discount
✅ $100 welcome bonus
✅ Trade 200+ pairs

Limited time offer! 👇
```

**Poor Example:**
```
Check out this link
```

### 5. Timing

Post when your audience is most active:
- Morning: 8-10 AM
- Lunch: 12-2 PM
- Evening: 6-9 PM

### 6. Regular Monitoring

Check stats daily:
```
/stats <id>  # Daily check
/linkstats <code>  # For top performers
/health  # System health
```

### 7. Backup Regularly

```bash
# Run backup script weekly
./scripts/backup.sh
```

## Common Workflows 🔄

### Daily Routine

1. Check yesterday's performance: `/stats <recent_campaign_id>`
2. Post new offers: `/post <id> @channel "message"`
3. Monitor top links: `/linkstats <top_code>`

### Weekly Routine

1. Review all campaigns: `/campaigns`
2. Analyze which channels perform best
3. Archive old campaigns: `/deletecampaign <old_id>`
4. Backup database: `./scripts/backup.sh`

### Monthly Routine

1. Compare month-over-month performance
2. Identify top performing exchanges
3. Optimize UTM strategy
4. Plan next month's campaigns

## Troubleshooting Examples 🔧

### Issue: Low CTR

**Solution:** Try different approaches:
```
# Test different button labels
/newlink <id> @channel "🔥 Limited Offer"
/newlink <id> @channel "💰 Claim Bonus"

# Test different message styles
/post <id> @channel "Short punchy message 🚀"
/post <id> @channel "Detailed benefits:
✅ Feature 1
✅ Feature 2
✅ Feature 3"
```

### Issue: One Channel Underperforming

**Check stats:**
```
/stats <campaign_id>
```

Compare channel performance and adjust strategy for low performers.

### Issue: Can't Post to New Channel

**Verify setup:**
1. Bot is admin: `/health` (check if bot is running)
2. Channel username correct: Must start with @
3. Permissions enabled: "Post Messages" must be on

---

**Need more help?** Check [README.md](README.md) or [SETUP_GUIDE.md](SETUP_GUIDE.md)
