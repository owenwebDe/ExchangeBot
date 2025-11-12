const express = require('express');
const { webAppAuth, webAppIsAdmin } = require('./middleware/webapp-auth');
const {
  createCampaign,
  getCampaign,
  listCampaigns,
  deleteCampaign,
  generateLink,
  getLinksForCampaign,
  getCampaignStats,
  getLinkStats,
  createOrUpdateUser,
  joinCampaign,
  getUserCampaignStats,
  getUserLinks,
  getUserProfile,
  getCampaignLeaderboard,
  getGlobalLeaderboard
} = require('./campaigns');
const logger = require('./utils/logger');

const router = express.Router();

// Apply WebApp auth to all API routes
router.use(webAppAuth);

/**
 * GET /api/me - Get current user info with profile data
 */
router.get('/me', (req, res) => {
  try {
    // Create or update user in database
    createOrUpdateUser(req.telegramUser);

    // Get full user profile
    const profile = getUserProfile(req.telegramUser.id.toString());

    res.json({
      user: req.telegramUser,
      isAdmin: (process.env.ADMIN_IDS || '').split(',').includes(req.telegramUser.id.toString()),
      profile: profile || {
        points: 0,
        referralCount: 0
      }
    });
  } catch (error) {
    logger.error('API error getting user profile:', error);
    res.json({
      user: req.telegramUser,
      isAdmin: (process.env.ADMIN_IDS || '').split(',').includes(req.telegramUser.id.toString()),
      profile: { points: 0, referralCount: 0 }
    });
  }
});

/**
 * GET /api/campaigns - List all campaigns
 */
router.get('/campaigns', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = listCampaigns(page, limit);
    res.json(result);

  } catch (error) {
    logger.error('API error listing campaigns:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

/**
 * GET /api/campaigns/:id - Get campaign details
 */
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = getCampaign(campaignId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);

  } catch (error) {
    logger.error('API error getting campaign:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

/**
 * POST /api/campaigns - Create new campaign (admin only)
 */
router.post('/campaigns', webAppIsAdmin, async (req, res) => {
  try {
    const { name, exchange, raw_url, utm_source, utm_medium, utm_campaign, points_per_referral } = req.body;

    if (!name || !exchange || !raw_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const campaign = createCampaign({
      name,
      exchange,
      raw_url,
      utm_source: utm_source || 'telegram',
      utm_medium: utm_medium || 'webapp',
      utm_campaign,
      points_per_referral: points_per_referral || 10
    });

    logger.info(`Campaign created via API by user ${req.telegramUser.id}: ${campaign.id}`);
    res.status(201).json(campaign);

  } catch (error) {
    logger.error('API error creating campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
});

/**
 * DELETE /api/campaigns/:id - Delete campaign (admin only)
 */
router.delete('/campaigns/:id', webAppIsAdmin, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    deleteCampaign(campaignId);

    logger.info(`Campaign ${campaignId} deleted via API by user ${req.telegramUser.id}`);
    res.json({ success: true, message: 'Campaign deleted' });

  } catch (error) {
    logger.error('API error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

/**
 * GET /api/campaigns/:id/links - Get links for campaign
 */
router.get('/campaigns/:id/links', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const links = getLinksForCampaign(campaignId);

    res.json({ links });

  } catch (error) {
    logger.error('API error getting links:', error);
    res.status(500).json({ error: 'Failed to get links' });
  }
});

/**
 * POST /api/campaigns/:id/links - Generate new link (user-specific)
 */
router.post('/campaigns/:id/links', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { channel, inline_label } = req.body;
    const userId = req.telegramUser.id.toString();

    if (!channel) {
      return res.status(400).json({ error: 'Channel is required' });
    }

    // Generate link with user ID for tracking referrals
    const link = generateLink(
      campaignId,
      channel || `user_${userId}`,
      inline_label || 'Open Exchange',
      userId
    );

    logger.info(`Link generated via API by user ${req.telegramUser.id}: ${link.code}`);
    res.status(201).json(link);

  } catch (error) {
    logger.error('API error generating link:', error);
    res.status(500).json({ error: error.message || 'Failed to generate link' });
  }
});

/**
 * GET /api/campaigns/:id/stats - Get campaign statistics
 */
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const stats = getCampaignStats(campaignId);

    res.json(stats);

  } catch (error) {
    logger.error('API error getting campaign stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get stats' });
  }
});

/**
 * GET /api/links/:code/stats - Get link statistics
 */
router.get('/links/:code/stats', async (req, res) => {
  try {
    const { code } = req.params;
    const timeWindow = parseInt(req.query.hours) || 24;

    const stats = getLinkStats(code, timeWindow);

    res.json(stats);

  } catch (error) {
    logger.error('API error getting link stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get link stats' });
  }
});

/**
 * POST /api/campaigns/:id/join - Join a campaign
 */
router.post('/campaigns/:id/join', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.telegramUser.id.toString();

    const success = joinCampaign(userId, campaignId);

    if (success) {
      logger.info(`User ${userId} joined campaign ${campaignId}`);
      res.json({ success: true, message: 'Joined campaign successfully' });
    } else {
      res.status(400).json({ error: 'Failed to join campaign' });
    }

  } catch (error) {
    logger.error('API error joining campaign:', error);
    res.status(500).json({ error: error.message || 'Failed to join campaign' });
  }
});

/**
 * GET /api/user/links - Get current user's referral links
 */
router.get('/user/links', async (req, res) => {
  try {
    const userId = req.telegramUser.id.toString();
    const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id) : null;

    const links = getUserLinks(userId, campaignId);

    res.json({ links });

  } catch (error) {
    logger.error('API error getting user links:', error);
    res.status(500).json({ error: 'Failed to get user links' });
  }
});

/**
 * GET /api/user/campaigns/:id/stats - Get user's stats for a specific campaign
 */
router.get('/user/campaigns/:id/stats', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const userId = req.telegramUser.id.toString();

    const stats = getUserCampaignStats(userId, campaignId);

    if (!stats) {
      return res.status(404).json({ error: 'Not participating in this campaign' });
    }

    res.json(stats);

  } catch (error) {
    logger.error('API error getting user campaign stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

/**
 * GET /api/leaderboard/global - Get global leaderboard
 */
router.get('/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = getGlobalLeaderboard(limit);

    res.json({ leaderboard });

  } catch (error) {
    logger.error('API error getting global leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /api/leaderboard/campaigns/:id - Get campaign leaderboard
 */
router.get('/leaderboard/campaigns/:id', async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = getCampaignLeaderboard(campaignId, limit);

    res.json({ leaderboard });

  } catch (error) {
    logger.error('API error getting campaign leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
