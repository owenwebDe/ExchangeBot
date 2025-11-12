const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { getLinkByCode, recordClick, isRateLimited } = require('./campaigns');
const { getHealthInfo, getDB } = require('./db');
const apiRouter = require('./api');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (important for getting real IP behind reverse proxies)
app.set('trust proxy', 1);

// Basic middleware
app.use(express.json());

// Serve Mini App at /app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve static files for Mini App
app.use('/app', express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiRouter);

// Rate limiter for redirect endpoint - sliding window
const redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).send('Too many requests. Please try again later.');
  }
});

/**
 * Health check endpoint
 */
app.get('/healthz', (req, res) => {
  try {
    const db = getDB();
    const health = getHealthInfo(db);

    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Service unhealthy'
    });
  }
});

/**
 * Root endpoint - basic info
 */
app.get('/', (req, res) => {
  res.send('Exchange Bot Redirect Service - Running');
});

/**
 * Redirect endpoint with click tracking
 * GET /r/:code
 */
app.get('/r/:code', redirectLimiter, async (req, res) => {
  const { code } = req.params;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const tgUserId = req.query.tg_user_id || null;

  logger.debug(`Redirect request: code=${code}, ip=${ip}`);

  try {
    // Additional rate limiting check (burst protection)
    if (isRateLimited(ip, 10, 60)) {
      logger.warn(`Burst rate limit exceeded for IP: ${ip}`);
      return res.status(429).send('Too many clicks. Please slow down.');
    }

    // Look up link
    const link = getLinkByCode(code);

    if (!link) {
      logger.warn(`Link not found: ${code}`);
      return res.status(404).send('Link not found');
    }

    // Validate redirect URL (prevent open redirect)
    try {
      const url = new URL(link.final_url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      logger.error(`Invalid redirect URL for link ${code}: ${link.final_url}`);
      return res.status(400).send('Invalid redirect URL');
    }

    // Record click
    recordClick(link.id, {
      user_agent: userAgent,
      ip: ip,
      tg_user_id: tgUserId
    });

    // Log successful redirect
    logger.info(`Redirect: ${code} -> ${link.final_url} (IP: ${ip})`);

    // Perform 302 redirect
    res.redirect(302, link.final_url);

  } catch (error) {
    logger.error(`Error processing redirect for ${code}:`, error);
    res.status(500).send('Internal server error');
  }
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).send('Not found');
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).send('Internal server error');
});

/**
 * Start server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      logger.info(`Express server listening on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/healthz`);
      resolve(server);
    });

    server.on('error', (error) => {
      logger.error('Failed to start server:', error);
      reject(error);
    });
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = { app, startServer };
