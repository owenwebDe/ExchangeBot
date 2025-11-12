#!/usr/bin/env node

/**
 * Main entry point - starts both Express server and Telegram bot
 */

require('dotenv').config();
const logger = require('./utils/logger');
const { startBot } = require('./bot');
const { startServer } = require('./server');
const { getDB } = require('./db');

/**
 * Initialize application
 */
async function init() {
  logger.info('🚀 Starting Exchange Campaign Manager Bot...');

  try {
    // Initialize database
    logger.info('Initializing database...');
    getDB();

    // Start Express server (critical)
    logger.info('Starting Express server...');
    await startServer();

    // Start Telegram bot (non-critical - may fail in multi-instance deployments)
    logger.info('Starting Telegram bot...');
    try {
      await startBot();
      logger.info('✅ Telegram bot started successfully!');
    } catch (botError) {
      logger.warn('⚠️  Telegram bot failed to start (this is OK if another instance is running):', botError.message);
      logger.info('📱 Mini App and API endpoints are still available');
    }

    logger.info('✅ Application started successfully!');
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
init();
