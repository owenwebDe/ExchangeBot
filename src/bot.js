const { Telegraf, Markup } = require('telegraf');
const { isAdmin } = require('./middleware/auth');
const {
  createCampaign,
  getCampaign,
  listCampaigns,
  deleteCampaign,
  generateLink,
  getLinksForCampaign,
  getCampaignStats,
  getLinkStats,
  formatCampaignStats,
  formatLinkStats,
  createOrUpdateUser
} = require('./campaigns');
const { recordPost } = require('./campaigns');
const { getHealthInfo, getDB } = require('./db');
const { slugify, getCurrentDate, isValidUrl } = require('./utils/helpers');
const logger = require('./utils/logger');

const BOT_TOKEN = process.env.BOT_TOKEN;
const DEFAULT_CHANNEL = process.env.DEFAULT_CHANNEL || '';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required in .env file');
}

const bot = new Telegraf(BOT_TOKEN);

// Store temporary state for multi-step commands
const userState = new Map();

/**
 * Start command - Welcome message with Mini App and user tracking
 */
bot.command('start', async (ctx) => {
  try {
    // Extract referrer ID from start parameter (e.g., /start ref_123456)
    const startParam = ctx.message.text.split(' ')[1];
    let referrerId = null;

    if (startParam && startParam.startsWith('ref_')) {
      referrerId = startParam.substring(4); // Remove 'ref_' prefix
    }

    // Create or update user in database
    const userData = {
      id: ctx.from.id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name
    };

    const user = createOrUpdateUser(userData, referrerId);

    const webAppUrl = `${BASE_URL}/app`;

    // Check if this is a new user (first time using the bot)
    const isNewUser = !user.last_seen || (Date.now() - new Date(user.last_seen).getTime()) > 86400000; // More than 24 hours

    if (isNewUser) {
      // Show welcome message with brief description and skip option
      const welcomeKeyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Get Started', webAppUrl)],
        [Markup.button.callback('ℹ️ Learn More', 'learn_more')]
      ]);

      let welcomeMessage = `👋 *Welcome to AI Exchange Bot*${ctx.from.first_name ? `, ${ctx.from.first_name}` : ''}!\n\n`;

      if (referrerId) {
        welcomeMessage += `✅ You were referred by a friend! You'll both earn rewards.\n\n`;
      }

      welcomeMessage += `🎯 *What This Bot Does:*\n\n` +
        `This bot helps you earn rewards by joining exchange campaigns and referring friends!\n\n` +
        `• Join tasks from top exchanges\n` +
        `• Share your referral links\n` +
        `• Earn points for every referral\n` +
        `• Compete on the leaderboard\n\n` +
        `Tap "Get Started" to begin or "Learn More" for details 👇`;

      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown', ...welcomeKeyboard });
    } else {
      // Returning user - show standard interface
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.webApp('🚀 Open App', webAppUrl)]
      ]);

      let message = `👋 *Welcome back*${ctx.from.first_name ? `, ${ctx.from.first_name}` : ''}!\n\n`;
      message += `Ready to earn more points? Open the app to see new tasks and check your stats! 👇`;

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
  } catch (error) {
    logger.error('Error in start command:', error);
    await ctx.reply('Welcome! There was an error processing your request. Please try again.');
  }
});

/**
 * Handle "Learn More" callback from welcome message
 */
bot.action('learn_more', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const webAppUrl = `${BASE_URL}/app`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.webApp('🚀 Open App', webAppUrl)]
    ]);

    const detailsMessage = `📚 *How AI Exchange Bot Works:*\n\n` +
      `*1️⃣ Join Tasks*\n` +
      `Browse available exchange campaigns and join the ones you like. Each task shows how many points you can earn.\n\n` +
      `*2️⃣ Get Your Links*\n` +
      `When you join a task, you'll get a personal referral link that tracks your referrals.\n\n` +
      `*3️⃣ Share & Earn*\n` +
      `Share your referral links with friends. Every time someone uses your link, you earn points!\n\n` +
      `*4️⃣ Climb the Leaderboard*\n` +
      `Track your progress and compete with other users on the global leaderboard.\n\n` +
      `*5️⃣ Refer More Friends*\n` +
      `Share your bot referral link (@AiExchangeBot_bot?start=ref_${ctx.from.id}) to invite friends directly to the bot and earn even more!\n\n` +
      `Ready to start earning? 👇`;

    await ctx.editMessageText(detailsMessage, { parse_mode: 'Markdown', ...keyboard });
  } catch (error) {
    logger.error('Error in learn_more callback:', error);
  }
});

/**
 * Help command
 */
bot.command('help', isAdmin, async (ctx) => {
  await ctx.replyWithMarkdown(
    `*📖 Command Reference*\n\n` +
    `*Campaign Management:*\n` +
    `/newcampaign - Start wizard to create campaign\n` +
    `/campaigns [page] - List all campaigns\n` +
    `/deletecampaign <id> - Delete a campaign\n\n` +
    `*Link Management:*\n` +
    `/newlink <campaignId> [@channel] [label] - Generate tracked link\n` +
    `  Example: /newlink 12 @DexNewToken "Trade on OKX"\n` +
    `/links <campaignId> - View all links for campaign\n\n` +
    `*Posting:*\n` +
    `/post <campaignId> [@channel] [text] - Post to channel\n` +
    `  Example: /post 12 @DexNewToken "Check out this offer!"\n\n` +
    `*Analytics:*\n` +
    `/stats <campaignId> - View campaign statistics\n` +
    `/linkstats <code> - View specific link stats\n\n` +
    `*System:*\n` +
    `/health - Check bot & database health`
  );
});

/**
 * New campaign wizard - Step 1: Start
 */
bot.command('newcampaign', isAdmin, async (ctx) => {
  userState.set(ctx.from.id, { step: 'name' });
  await ctx.reply('📝 *New Campaign Wizard*\n\nPlease enter the campaign name:', { parse_mode: 'Markdown' });
});

/**
 * List campaigns
 */
bot.command('campaigns', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');
    const page = parseInt(args[1]) || 1;

    const result = listCampaigns(page, 10);

    if (result.campaigns.length === 0) {
      await ctx.reply('No campaigns found. Use /newcampaign to create one.');
      return;
    }

    let message = `📋 *Campaigns* (Page ${result.page}/${result.totalPages})\n\n`;

    result.campaigns.forEach(campaign => {
      message += `*#${campaign.id}* - ${campaign.name}\n`;
      message += `  Exchange: ${campaign.exchange}\n`;
      message += `  Created: ${new Date(campaign.created_at).toLocaleDateString()}\n\n`;
    });

    if (result.totalPages > 1) {
      message += `\nUse \`/campaigns ${page + 1}\` for next page`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error listing campaigns:', error);
    await ctx.reply('❌ Error listing campaigns. Please try again.');
  }
});

/**
 * New link command
 */
bot.command('newlink', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
      await ctx.reply('Usage: /newlink <campaignId> [@channel] ["label"]\nExample: /newlink 12 @DexNewToken "Trade on OKX"');
      return;
    }

    const campaignId = parseInt(args[1]);
    const channel = args[2] || DEFAULT_CHANNEL;
    const label = args.slice(3).join(' ').replace(/"/g, '') || 'Open Exchange';

    if (!channel || !channel.startsWith('@')) {
      await ctx.reply('❌ Please provide a valid channel (must start with @)');
      return;
    }

    // Check if campaign exists
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      await ctx.reply('❌ Campaign not found. Use /campaigns to see available campaigns.');
      return;
    }

    // Generate link
    const link = generateLink(campaignId, channel, label);

    await ctx.replyWithMarkdown(
      `✅ *Link Generated!*\n\n` +
      `Campaign: ${campaign.name}\n` +
      `Channel: ${channel}\n` +
      `Short URL: \`${link.shortUrl}\`\n` +
      `Code: \`${link.code}\`\n\n` +
      `Button label: "${link.inlineLabel}"\n\n` +
      `Use \`/post ${campaignId}\` to post this to your channel.`
    );

  } catch (error) {
    logger.error('Error generating link:', error);
    await ctx.reply('❌ Error generating link: ' + error.message);
  }
});

/**
 * List links for campaign
 */
bot.command('links', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
      await ctx.reply('Usage: /links <campaignId>');
      return;
    }

    const campaignId = parseInt(args[1]);
    const campaign = getCampaign(campaignId);

    if (!campaign) {
      await ctx.reply('❌ Campaign not found.');
      return;
    }

    const links = getLinksForCampaign(campaignId);

    if (links.length === 0) {
      await ctx.reply(`No links found for campaign #${campaignId}. Use /newlink to create one.`);
      return;
    }

    let message = `🔗 *Links for Campaign #${campaignId}*\n${campaign.name}\n\n`;

    links.forEach(link => {
      message += `\`${link.code}\` - ${link.channel}\n`;
      message += `  Clicks: ${link.click_count || 0}\n`;
      message += `  URL: ${BASE_URL}/r/${link.code}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error listing links:', error);
    await ctx.reply('❌ Error listing links.');
  }
});

/**
 * Post to channel
 */
bot.command('post', isAdmin, async (ctx) => {
  try {
    const text = ctx.message.text;
    const match = text.match(/\/post\s+(\d+)(?:\s+(@\w+))?(?:\s+(.+))?/);

    if (!match) {
      await ctx.reply(
        'Usage: /post <campaignId> [@channel] [text]\n' +
        'Example: /post 12 @DexNewToken "🔥 New listing promo!"'
      );
      return;
    }

    const campaignId = parseInt(match[1]);
    const channel = match[2] || DEFAULT_CHANNEL;
    const messageText = match[3] || '🚀 Check out this exclusive offer!';

    if (!channel || !channel.startsWith('@')) {
      await ctx.reply('❌ Please provide a valid channel (must start with @) or set DEFAULT_CHANNEL in .env');
      return;
    }

    // Get campaign
    const campaign = getCampaign(campaignId);
    if (!campaign) {
      await ctx.reply('❌ Campaign not found.');
      return;
    }

    // Get or create link for this channel
    const existingLinks = getLinksForCampaign(campaignId);
    let link = existingLinks.find(l => l.channel === channel);

    if (!link) {
      // Generate new link
      const generatedLink = generateLink(campaignId, channel, `Open ${campaign.exchange}`);
      link = {
        code: generatedLink.code,
        inline_label: generatedLink.inlineLabel
      };
      await ctx.reply(`✨ Generated new link for ${channel}: \`${generatedLink.code}\``, { parse_mode: 'Markdown' });
    }

    // Create inline keyboard with button
    const keyboard = Markup.inlineKeyboard([
      Markup.button.url(link.inline_label || 'Open Exchange', `${BASE_URL}/r/${link.code}`)
    ]);

    // Post to channel
    const sentMessage = await ctx.telegram.sendMessage(channel, messageText, {
      parse_mode: 'Markdown',
      ...keyboard
    });

    // Record post
    recordPost(campaignId, channel, sentMessage.message_id);

    await ctx.reply(
      `✅ *Posted to ${channel}!*\n\n` +
      `Campaign: ${campaign.name}\n` +
      `Message ID: ${sentMessage.message_id}\n` +
      `Link: \`${link.code}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    logger.error('Error posting to channel:', error);
    await ctx.reply('❌ Error posting to channel: ' + error.message + '\n\nMake sure the bot is admin in the channel.');
  }
});

/**
 * Campaign statistics
 */
bot.command('stats', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
      await ctx.reply('Usage: /stats <campaignId>');
      return;
    }

    const campaignId = parseInt(args[1]);
    const stats = getCampaignStats(campaignId);

    const message = formatCampaignStats(stats);
    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error getting campaign stats:', error);
    await ctx.reply('❌ Error: ' + error.message);
  }
});

/**
 * Link statistics
 */
bot.command('linkstats', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
      await ctx.reply('Usage: /linkstats <code>');
      return;
    }

    const code = args[1];
    const timeWindow = parseInt(args[2]) || 24;

    const stats = getLinkStats(code, timeWindow);
    const message = formatLinkStats(stats);

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error getting link stats:', error);
    await ctx.reply('❌ Error: ' + error.message);
  }
});

/**
 * Delete campaign
 */
bot.command('deletecampaign', isAdmin, async (ctx) => {
  try {
    const args = ctx.message.text.split(' ');

    if (args.length < 2) {
      await ctx.reply('Usage: /deletecampaign <campaignId>');
      return;
    }

    const campaignId = parseInt(args[1]);
    const campaign = getCampaign(campaignId);

    if (!campaign) {
      await ctx.reply('❌ Campaign not found.');
      return;
    }

    deleteCampaign(campaignId);

    await ctx.reply(`✅ Campaign #${campaignId} "${campaign.name}" has been deleted.`);

  } catch (error) {
    logger.error('Error deleting campaign:', error);
    await ctx.reply('❌ Error deleting campaign.');
  }
});

/**
 * Health check
 */
bot.command('health', isAdmin, async (ctx) => {
  try {
    const db = getDB();
    const health = getHealthInfo(db);

    const message = `✅ *System Health Check*\n\n` +
      `*Database:* ${health.dbPath}\n` +
      `Campaigns: ${health.campaigns}\n` +
      `Links: ${health.links}\n` +
      `Clicks: ${health.clicks}\n` +
      `Posts: ${health.posts}\n\n` +
      `*Status:* All systems operational 🟢`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Health check error:', error);
    await ctx.reply('❌ System health check failed: ' + error.message);
  }
});

/**
 * Handle text messages (for wizard flow)
 */
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userState.get(userId);

  if (!state) {
    return; // No active wizard
  }

  const text = ctx.message.text;

  try {
    switch (state.step) {
      case 'name':
        state.name = text;
        state.step = 'exchange';
        userState.set(userId, state);
        await ctx.reply('Great! Now enter the exchange name (e.g., Binance, OKX, Bybit):');
        break;

      case 'exchange':
        state.exchange = text;
        state.step = 'url';
        userState.set(userId, state);
        await ctx.reply('Enter the base affiliate URL (must start with http:// or https://):');
        break;

      case 'url':
        if (!isValidUrl(text)) {
          await ctx.reply('❌ Invalid URL. Must start with http:// or https://. Please try again:');
          return;
        }
        state.raw_url = text;
        state.step = 'utm_source';
        userState.set(userId, state);
        await ctx.reply('Enter UTM source (default: telegram):');
        break;

      case 'utm_source':
        state.utm_source = text || 'telegram';
        state.step = 'utm_medium';
        userState.set(userId, state);
        await ctx.reply('Enter UTM medium (default: channel):');
        break;

      case 'utm_medium':
        state.utm_medium = text || 'channel';
        state.utm_campaign = `${slugify(state.name)}-${getCurrentDate()}`;

        // Show summary
        const summary = `📋 *Campaign Summary*\n\n` +
          `Name: ${state.name}\n` +
          `Exchange: ${state.exchange}\n` +
          `URL: ${state.raw_url}\n` +
          `UTM Source: ${state.utm_source}\n` +
          `UTM Medium: ${state.utm_medium}\n` +
          `UTM Campaign: ${state.utm_campaign}\n\n` +
          `Reply with "confirm" to create or "cancel" to abort.`;

        state.step = 'confirm';
        userState.set(userId, state);
        await ctx.reply(summary, { parse_mode: 'Markdown' });
        break;

      case 'confirm':
        if (text.toLowerCase() === 'confirm') {
          // Create campaign
          const campaign = createCampaign({
            name: state.name,
            exchange: state.exchange,
            raw_url: state.raw_url,
            utm_source: state.utm_source,
            utm_medium: state.utm_medium,
            utm_campaign: state.utm_campaign
          });

          await ctx.reply(
            `✅ *Campaign Created!*\n\n` +
            `ID: ${campaign.id}\n` +
            `Name: ${campaign.name}\n\n` +
            `Use \`/newlink ${campaign.id}\` to generate tracked links.`,
            { parse_mode: 'Markdown' }
          );

          userState.delete(userId);
        } else if (text.toLowerCase() === 'cancel') {
          await ctx.reply('❌ Campaign creation cancelled.');
          userState.delete(userId);
        } else {
          await ctx.reply('Please reply with "confirm" or "cancel".');
        }
        break;
    }
  } catch (error) {
    logger.error('Error in wizard flow:', error);
    await ctx.reply('❌ Error: ' + error.message);
    userState.delete(userId);
  }
});

/**
 * Error handling
 */
bot.catch((err, ctx) => {
  logger.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again or contact support.');
});

/**
 * Start bot
 */
async function startBot() {
  try {
    await bot.launch();
    logger.info('Telegram bot started successfully');
    logger.info(`Bot username: @${bot.botInfo.username}`);

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    return bot;
  } catch (error) {
    logger.error('Failed to start bot:', error);
    throw error;
  }
}

module.exports = { bot, startBot };
