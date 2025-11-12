const logger = require('../utils/logger');

/**
 * Parse admin IDs from environment variable
 * @returns {array} Array of admin user IDs
 */
function getAdminIds() {
  const adminIdsEnv = process.env.ADMIN_IDS || '';
  return adminIdsEnv
    .split(',')
    .map(id => id.trim())
    .filter(id => id && !isNaN(id))
    .map(id => parseInt(id));
}

const ADMIN_IDS = getAdminIds();

/**
 * Middleware to check if user is admin
 * @param {object} ctx - Telegraf context
 * @param {function} next - Next middleware function
 */
async function isAdmin(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    logger.warn('Authentication failed: No user ID in context');
    await ctx.reply('❌ Authentication error. Please try again.');
    return;
  }

  if (!ADMIN_IDS.includes(userId)) {
    logger.warn(`Unauthorized access attempt by user ID: ${userId}`);
    await ctx.reply('⛔️ Access denied. This bot is for authorized administrators only.');
    return;
  }

  // User is admin, continue
  logger.debug(`Admin access granted for user ID: ${userId}`);
  return next();
}

/**
 * Check if a user is admin (without middleware)
 * @param {number} userId - Telegram user ID
 * @returns {boolean} True if user is admin
 */
function checkIsAdmin(userId) {
  return ADMIN_IDS.includes(userId);
}

/**
 * Get list of admin IDs
 * @returns {array} Array of admin IDs
 */
function getAdmins() {
  return ADMIN_IDS;
}

module.exports = {
  isAdmin,
  checkIsAdmin,
  getAdmins
};
