const { getDB, userQueries, userParticipationQueries, campaignQueries, linkQueries, clickQueries, postQueries } = require('./db');
const { slugify, makeCode, buildUrl, isValidUrl, formatDate, calculatePercentage, formatNumber } = require('./utils/helpers');
const logger = require('./utils/logger');

/**
 * Create a new campaign
 * @param {object} campaignData - Campaign data
 * @returns {object} Created campaign with ID
 */
function createCampaign(campaignData) {
  const db = getDB();

  // Validate URL
  if (!isValidUrl(campaignData.raw_url)) {
    throw new Error('Invalid URL. Must be http or https.');
  }

  // Generate utm_campaign if not provided
  if (!campaignData.utm_campaign) {
    const date = new Date().toISOString().split('T')[0];
    campaignData.utm_campaign = `${slugify(campaignData.name)}-${date}`;
  }

  // Set defaults
  campaignData.utm_source = campaignData.utm_source || 'telegram';
  campaignData.utm_medium = campaignData.utm_medium || 'channel';

  try {
    const id = campaignQueries.create(db, campaignData);
    logger.info(`Campaign created: ${campaignData.name} (ID: ${id})`);

    return {
      id,
      ...campaignData
    };
  } catch (error) {
    logger.error('Error creating campaign:', error);
    throw error;
  }
}

/**
 * Get campaign by ID
 * @param {number} campaignId - Campaign ID
 * @returns {object|null} Campaign object or null
 */
function getCampaign(campaignId) {
  const db = getDB();
  return campaignQueries.findById(db, campaignId);
}

/**
 * List all campaigns with pagination
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Results per page
 * @returns {object} Campaigns array and pagination info
 */
function listCampaigns(page = 1, limit = 20) {
  const db = getDB();
  const offset = (page - 1) * limit;
  const campaigns = campaignQueries.findAll(db, limit, offset);
  const totalCount = campaignQueries.count(db);

  return {
    campaigns,
    page,
    limit,
    totalCount,
    totalPages: Math.ceil(totalCount / limit)
  };
}

/**
 * Delete a campaign (soft delete)
 * @param {number} campaignId - Campaign ID
 * @returns {boolean} Success status
 */
function deleteCampaign(campaignId) {
  const db = getDB();

  try {
    campaignQueries.softDelete(db, campaignId);
    logger.info(`Campaign ${campaignId} soft deleted`);
    return true;
  } catch (error) {
    logger.error(`Error deleting campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Generate a tracked link for a campaign
 * @param {number} campaignId - Campaign ID
 * @param {string} channel - Channel name (e.g., @mychannel)
 * @param {string} inlineLabel - Label for inline button
 * @param {string} userId - Optional Telegram user ID for user-specific links
 * @returns {object} Link object with code and URL
 */
function generateLink(campaignId, channel, inlineLabel = 'Open Exchange', userId = null) {
  const db = getDB();

  // Get campaign
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Generate unique code
  let code;
  let attempts = 0;
  do {
    code = makeCode(7);
    attempts++;
    if (attempts > 10) {
      code = makeCode(8); // Use longer code if collision
    }
  } while (linkQueries.codeExists(db, code));

  // Build final URL with UTM parameters and channel
  const utmParams = {
    utm_source: campaign.utm_source,
    utm_medium: campaign.utm_medium,
    utm_campaign: campaign.utm_campaign,
    tg_channel: channel
  };

  // Add user ID to UTM if provided
  if (userId) {
    utmParams.ref = userId;
  }

  const finalUrl = buildUrl(campaign.raw_url, utmParams);

  // Save link to database
  const link = {
    campaign_id: campaignId,
    code,
    final_url: finalUrl,
    channel,
    inline_label: inlineLabel,
    user_id: userId
  };

  const linkId = linkQueries.create(db, link);

  logger.info(`Link generated: ${code} for campaign ${campaignId}, channel ${channel}${userId ? `, user ${userId}` : ''}`);

  return {
    id: linkId,
    code,
    shortUrl: `${process.env.BASE_URL}/r/${code}`,
    finalUrl,
    channel,
    inlineLabel,
    userId
  };
}

/**
 * Get link by code
 * @param {string} code - Link code
 * @returns {object|null} Link object or null
 */
function getLinkByCode(code) {
  const db = getDB();
  return linkQueries.findByCode(db, code);
}

/**
 * Get all links for a campaign
 * @param {number} campaignId - Campaign ID
 * @returns {array} Array of links
 */
function getLinksForCampaign(campaignId) {
  const db = getDB();
  return linkQueries.findByCampaign(db, campaignId);
}

/**
 * Record a click on a link and process referral if applicable
 * @param {number} linkId - Link ID
 * @param {object} clickData - Click metadata (user_agent, ip, tg_user_id)
 * @returns {number} Click ID
 */
function recordClick(linkId, clickData) {
  const db = getDB();

  const click = {
    link_id: linkId,
    user_agent: clickData.user_agent || null,
    ip: clickData.ip || null,
    tg_user_id: clickData.tg_user_id || null
  };

  const clickId = clickQueries.create(db, click);
  logger.debug(`Click recorded: link ${linkId}, IP ${clickData.ip}`);

  // Check if this is a referral click
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(linkId);
  if (link && link.user_id && clickData.tg_user_id && link.user_id !== clickData.tg_user_id) {
    // This is a referral - award points to the referrer
    const campaign = getCampaign(link.campaign_id);
    if (campaign && campaign.points_per_referral > 0) {
      // Award points to referrer
      userQueries.addPoints(db, link.user_id, campaign.points_per_referral);

      // Update participation stats
      if (userParticipationQueries.isParticipating(db, link.user_id, link.campaign_id)) {
        userParticipationQueries.incrementReferrals(db, link.user_id, link.campaign_id, campaign.points_per_referral);
      }

      logger.info(`Referral tracked: User ${link.user_id} earned ${campaign.points_per_referral} points from user ${clickData.tg_user_id}`);
    }
  }

  return clickId;
}

/**
 * Check rate limit for an IP address
 * @param {string} ip - IP address
 * @param {number} maxClicks - Maximum clicks allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {boolean} True if rate limit exceeded
 */
function isRateLimited(ip, maxClicks = 10, windowSeconds = 60) {
  const db = getDB();
  const clickCount = clickQueries.countByIPRecent(db, ip, windowSeconds);
  return clickCount >= maxClicks;
}

/**
 * Record a post to a channel
 * @param {number} campaignId - Campaign ID
 * @param {string} channel - Channel name
 * @param {number} messageId - Telegram message ID
 * @param {number} impressions - Initial impressions (optional)
 * @returns {number} Post ID
 */
function recordPost(campaignId, channel, messageId, impressions = null) {
  const db = getDB();

  const post = {
    campaign_id: campaignId,
    channel,
    message_id: messageId,
    impressions
  };

  const postId = postQueries.create(db, post);
  logger.info(`Post recorded: campaign ${campaignId}, channel ${channel}, message ${messageId}`);

  return postId;
}

/**
 * Get statistics for a campaign
 * @param {number} campaignId - Campaign ID
 * @returns {object} Campaign statistics
 */
function getCampaignStats(campaignId) {
  const db = getDB();

  const campaign = getCampaign(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Get total clicks
  const totalClicks = clickQueries.countByCampaign(db, campaignId);

  // Get posts
  const posts = postQueries.findByCampaign(db, campaignId);
  const postCount = posts.length;

  // Calculate total impressions
  const totalImpressions = posts.reduce((sum, post) => {
    return sum + (post.impressions || 0);
  }, 0);

  // Get links with click counts
  const links = getLinksForCampaign(campaignId);

  // Group by channel
  const channelStats = {};
  links.forEach(link => {
    if (!channelStats[link.channel]) {
      channelStats[link.channel] = {
        links: 0,
        clicks: 0,
        posts: 0
      };
    }
    channelStats[link.channel].links++;
    channelStats[link.channel].clicks += link.click_count || 0;
  });

  // Add post counts to channel stats
  posts.forEach(post => {
    if (channelStats[post.channel]) {
      channelStats[post.channel].posts++;
    }
  });

  // Find top link
  const topLink = links.reduce((max, link) => {
    return (link.click_count || 0) > (max?.click_count || 0) ? link : max;
  }, null);

  // Calculate CTR
  let ctr = 0;
  if (totalImpressions > 0) {
    ctr = (totalClicks / totalImpressions) * 100;
  } else if (postCount > 0) {
    // Fallback: estimate based on clicks per post
    ctr = (totalClicks / postCount) * 100;
  }

  return {
    campaign,
    totalClicks,
    postCount,
    totalImpressions,
    ctr: ctr.toFixed(1),
    channelStats,
    topLink: topLink ? {
      code: topLink.code,
      clicks: topLink.click_count,
      channel: topLink.channel
    } : null,
    links
  };
}

/**
 * Get statistics for a specific link
 * @param {string} code - Link code
 * @param {number} timeWindowHours - Time window in hours (default: 24)
 * @returns {object} Link statistics
 */
function getLinkStats(code, timeWindowHours = 24) {
  const db = getDB();

  const link = getLinkByCode(code);
  if (!link) {
    throw new Error('Link not found');
  }

  // Get total clicks
  const totalClicks = clickQueries.countByLink(db, link.id);

  // Get recent clicks
  const recentClicks = clickQueries.getRecentByLink(db, link.id, timeWindowHours);

  // Get timeline
  const timeline = clickQueries.getTimelineByLink(db, link.id, timeWindowHours);

  // Get last 7 days for comparison
  const last7DaysClicks = clickQueries.getRecentByLink(db, link.id, 168); // 7 * 24 hours

  return {
    link,
    totalClicks,
    recentClicks: recentClicks.length,
    timeWindow: `${timeWindowHours}h`,
    timeline,
    last7DaysClicks: last7DaysClicks.length
  };
}

/**
 * Format campaign stats for display
 * @param {object} stats - Campaign stats object
 * @returns {string} Formatted stats message
 */
function formatCampaignStats(stats) {
  const { campaign, totalClicks, postCount, totalImpressions, ctr, channelStats, topLink } = stats;

  let message = `📊 *Campaign #${campaign.id}* — "${campaign.name}"\n`;
  message += `Exchange: ${campaign.exchange}\n\n`;

  message += `📝 Posts: ${postCount}  |  👆 Total Clicks: ${formatNumber(totalClicks)}\n`;

  if (totalImpressions > 0) {
    message += `👀 Impressions: ${formatNumber(totalImpressions)}\n`;
    message += `📈 CTR: ${ctr}%\n`;
  } else {
    message += `📈 Avg clicks/post: ${postCount > 0 ? (totalClicks / postCount).toFixed(1) : '0'}\n`;
  }

  message += `\n*Channels:*\n`;

  const channels = Object.entries(channelStats);
  if (channels.length > 0) {
    channels.forEach(([channel, data]) => {
      message += `  ${channel}: ${data.posts} posts, ${formatNumber(data.clicks)} clicks\n`;
    });
  } else {
    message += `  (no posts yet)\n`;
  }

  if (topLink) {
    message += `\n🏆 Top link: \`r/${topLink.code}\` — ${formatNumber(topLink.clicks)} clicks`;
  }

  return message;
}

/**
 * Format link stats for display
 * @param {object} stats - Link stats object
 * @returns {string} Formatted stats message
 */
function formatLinkStats(stats) {
  const { link, totalClicks, recentClicks, timeWindow, timeline, last7DaysClicks } = stats;

  let message = `🔗 *Link Stats:* \`${link.code}\`\n`;
  message += `Channel: ${link.channel}\n`;
  message += `Created: ${formatDate(link.created_at)}\n\n`;

  message += `👆 Total Clicks: ${formatNumber(totalClicks)}\n`;
  message += `📅 Last ${timeWindow}: ${formatNumber(recentClicks)} clicks\n`;
  message += `📅 Last 7 days: ${formatNumber(last7DaysClicks)} clicks\n\n`;

  if (timeline.length > 0) {
    message += `*Recent Timeline:*\n`;
    timeline.slice(-12).forEach(item => {
      const hour = new Date(item.hour).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit'
      });
      message += `  ${hour}: ${item.clicks} clicks\n`;
    });
  }

  return message;
}

/**
 * Create or update user in database
 * @param {object} userData - User data from Telegram
 * @param {string} referredBy - Optional referrer user ID
 * @returns {object} User object
 */
function createOrUpdateUser(userData, referredBy = null) {
  const db = getDB();

  const user = {
    tg_user_id: userData.id.toString(),
    username: userData.username || null,
    first_name: userData.first_name || null,
    last_name: userData.last_name || null,
    referred_by: referredBy
  };

  userQueries.createOrUpdate(db, user);
  logger.info(`User created/updated: ${user.tg_user_id} (@${user.username})`);

  return userQueries.findByTgUserId(db, user.tg_user_id);
}

/**
 * Join a campaign (user participation)
 * @param {string} userId - Telegram user ID
 * @param {number} campaignId - Campaign ID
 * @returns {boolean} Success status
 */
function joinCampaign(userId, campaignId) {
  const db = getDB();

  try {
    userParticipationQueries.joinCampaign(db, userId, campaignId);
    logger.info(`User ${userId} joined campaign ${campaignId}`);
    return true;
  } catch (error) {
    logger.error(`Error joining campaign: ${error.message}`);
    return false;
  }
}

/**
 * Get user's participation stats for a campaign
 * @param {string} userId - Telegram user ID
 * @param {number} campaignId - Campaign ID
 * @returns {object|null} Participation stats or null
 */
function getUserCampaignStats(userId, campaignId) {
  const db = getDB();
  return userParticipationQueries.getUserStats(db, userId, campaignId);
}

/**
 * Get user's referral links
 * @param {string} userId - Telegram user ID
 * @param {number} campaignId - Optional campaign ID to filter
 * @returns {array} Array of links
 */
function getUserLinks(userId, campaignId = null) {
  const db = getDB();

  if (campaignId) {
    return linkQueries.findByUserAndCampaign(db, userId, campaignId);
  }

  return linkQueries.findByUser(db, userId);
}

/**
 * Get user profile with points and referral count
 * @param {string} userId - Telegram user ID
 * @returns {object} User profile
 */
function getUserProfile(userId) {
  const db = getDB();
  const user = userQueries.findByTgUserId(db, userId);

  if (!user) {
    return null;
  }

  const referralCount = userQueries.countReferrals(db, userId);

  return {
    ...user,
    referralCount
  };
}

/**
 * Get campaign leaderboard
 * @param {number} campaignId - Campaign ID
 * @param {number} limit - Number of top users to return
 * @returns {array} Leaderboard data
 */
function getCampaignLeaderboard(campaignId, limit = 10) {
  const db = getDB();
  return userParticipationQueries.getCampaignLeaderboard(db, campaignId, limit);
}

/**
 * Get global leaderboard
 * @param {number} limit - Number of top users to return
 * @returns {array} Leaderboard data
 */
function getGlobalLeaderboard(limit = 10) {
  const db = getDB();
  return userQueries.getLeaderboard(db, limit);
}

module.exports = {
  createCampaign,
  getCampaign,
  listCampaigns,
  deleteCampaign,
  generateLink,
  getLinkByCode,
  getLinksForCampaign,
  recordClick,
  isRateLimited,
  recordPost,
  getCampaignStats,
  getLinkStats,
  formatCampaignStats,
  formatLinkStats,
  // User functions
  createOrUpdateUser,
  joinCampaign,
  getUserCampaignStats,
  getUserLinks,
  getUserProfile,
  getCampaignLeaderboard,
  getGlobalLeaderboard
};
