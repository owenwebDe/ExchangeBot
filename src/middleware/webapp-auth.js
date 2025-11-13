const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Validate Telegram WebApp initData
 * @param {string} initData - Telegram WebApp initData string
 * @param {string} botToken - Bot token
 * @returns {object|null} Parsed user data or null if invalid
 */
function validateTelegramWebAppData(initData, botToken) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify hash
    if (calculatedHash !== hash) {
      logger.warn('Invalid Telegram WebApp hash');
      return null;
    }

    // Parse user data
    const userString = urlParams.get('user');
    if (!userString) {
      logger.warn('No user data in initData');
      return null;
    }

    const user = JSON.parse(userString);

    // Check auth date (not older than 7 days for better UX)
    const authDate = parseInt(urlParams.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
    if (now - authDate > maxAge) {
      logger.warn(`Telegram WebApp auth data expired (age: ${now - authDate}s, max: ${maxAge}s)`);
      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      language_code: user.language_code,
      is_premium: user.is_premium || false
    };

  } catch (error) {
    logger.error('Error validating Telegram WebApp data:', error);
    return null;
  }
}

/**
 * Express middleware for Telegram WebApp authentication
 */
function webAppAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData;

  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  const botToken = process.env.BOT_TOKEN;
  const user = validateTelegramWebAppData(initData, botToken);

  if (!user) {
    return res.status(401).json({ error: 'Invalid Telegram authentication' });
  }

  // Attach user to request
  req.telegramUser = user;
  logger.debug(`WebApp auth: User ${user.id} (${user.username})`);

  next();
}

/**
 * Check if user is admin (for WebApp)
 */
function webAppIsAdmin(req, res, next) {
  const adminIds = (process.env.ADMIN_IDS || '')
    .split(',')
    .map(id => parseInt(id.trim()))
    .filter(id => !isNaN(id));

  if (!req.telegramUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!adminIds.includes(req.telegramUser.id)) {
    logger.warn(`WebApp: Unauthorized access attempt by user ${req.telegramUser.id}`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

module.exports = {
  validateTelegramWebAppData,
  webAppAuth,
  webAppIsAdmin
};
