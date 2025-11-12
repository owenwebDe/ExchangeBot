const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./utils/logger');

const DB_PATH = path.join(__dirname, '..', 'app.db');

/**
 * Initialize SQLite database with schema
 */
function initDatabase() {
  const db = new Database(DB_PATH);

  logger.info(`Initializing database at ${DB_PATH}`);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tg_user_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      points INTEGER DEFAULT 0,
      referred_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create campaigns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exchange TEXT NOT NULL,
      raw_url TEXT NOT NULL,
      utm_source TEXT DEFAULT 'telegram',
      utm_medium TEXT DEFAULT 'channel',
      utm_campaign TEXT NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      points_per_referral INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create links table
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      final_url TEXT NOT NULL,
      channel TEXT NOT NULL,
      inline_label TEXT DEFAULT 'Open Exchange',
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(tg_user_id) ON DELETE SET NULL
    )
  `);

  // Create clicks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      ip TEXT,
      tg_user_id TEXT,
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    )
  `);

  // Create posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      message_id INTEGER NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      impressions INTEGER,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Create user_participations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_participations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      campaign_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_referrals INTEGER DEFAULT 0,
      total_points_earned INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(tg_user_id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE(user_id, campaign_id)
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_tg_user_id ON users(tg_user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_clicks_ts ON clicks(ts)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_links_code ON links(code)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_links_campaign_id ON links(campaign_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_campaign_id ON posts(campaign_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_campaigns_is_deleted ON campaigns(is_deleted)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_participations_user_id ON user_participations(user_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_user_participations_campaign_id ON user_participations(campaign_id)`);

  logger.info('Database schema initialized successfully');

  return db;
}

/**
 * Get database instance (singleton pattern)
 */
let dbInstance = null;

function getDB() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

/**
 * User queries
 */
const userQueries = {
  createOrUpdate: (db, user) => {
    const stmt = db.prepare(`
      INSERT INTO users (tg_user_id, username, first_name, last_name, referred_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(tg_user_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        last_seen = CURRENT_TIMESTAMP
    `);
    const result = stmt.run(
      user.tg_user_id,
      user.username || null,
      user.first_name || null,
      user.last_name || null,
      user.referred_by || null
    );
    return result.lastInsertRowid || result.changes;
  },

  findByTgUserId: (db, tgUserId) => {
    const stmt = db.prepare('SELECT * FROM users WHERE tg_user_id = ?');
    return stmt.get(tgUserId);
  },

  addPoints: (db, tgUserId, points) => {
    const stmt = db.prepare('UPDATE users SET points = points + ? WHERE tg_user_id = ?');
    return stmt.run(points, tgUserId);
  },

  getLeaderboard: (db, limit = 10) => {
    const stmt = db.prepare(`
      SELECT tg_user_id, username, first_name, points
      FROM users
      ORDER BY points DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  countReferrals: (db, tgUserId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE referred_by = ?');
    return stmt.get(tgUserId).count;
  }
};

/**
 * User participation queries
 */
const userParticipationQueries = {
  joinCampaign: (db, userId, campaignId) => {
    const stmt = db.prepare(`
      INSERT INTO user_participations (user_id, campaign_id)
      VALUES (?, ?)
      ON CONFLICT(user_id, campaign_id) DO NOTHING
    `);
    return stmt.run(userId, campaignId);
  },

  isParticipating: (db, userId, campaignId) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM user_participations
      WHERE user_id = ? AND campaign_id = ?
    `);
    return stmt.get(userId, campaignId).count > 0;
  },

  getUserStats: (db, userId, campaignId) => {
    const stmt = db.prepare(`
      SELECT * FROM user_participations
      WHERE user_id = ? AND campaign_id = ?
    `);
    return stmt.get(userId, campaignId);
  },

  incrementReferrals: (db, userId, campaignId, points) => {
    const stmt = db.prepare(`
      UPDATE user_participations
      SET total_referrals = total_referrals + 1,
          total_points_earned = total_points_earned + ?
      WHERE user_id = ? AND campaign_id = ?
    `);
    return stmt.run(points, userId, campaignId);
  },

  getCampaignLeaderboard: (db, campaignId, limit = 10) => {
    const stmt = db.prepare(`
      SELECT up.*, u.username, u.first_name
      FROM user_participations up
      JOIN users u ON up.user_id = u.tg_user_id
      WHERE up.campaign_id = ?
      ORDER BY up.total_points_earned DESC
      LIMIT ?
    `);
    return stmt.all(campaignId, limit);
  }
};

/**
 * Campaign queries
 */
const campaignQueries = {
  create: (db, campaign) => {
    const stmt = db.prepare(`
      INSERT INTO campaigns (name, exchange, raw_url, utm_source, utm_medium, utm_campaign, points_per_referral)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      campaign.name,
      campaign.exchange,
      campaign.raw_url,
      campaign.utm_source,
      campaign.utm_medium,
      campaign.utm_campaign,
      campaign.points_per_referral || 10
    );
    return result.lastInsertRowid;
  },

  findById: (db, id) => {
    const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ? AND is_deleted = 0');
    return stmt.get(id);
  },

  findAll: (db, limit = 20, offset = 0) => {
    const stmt = db.prepare(`
      SELECT * FROM campaigns
      WHERE is_deleted = 0
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  },

  count: (db) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE is_deleted = 0');
    return stmt.get().count;
  },

  softDelete: (db, id) => {
    const stmt = db.prepare('UPDATE campaigns SET is_deleted = 1 WHERE id = ?');
    return stmt.run(id);
  }
};

/**
 * Link queries
 */
const linkQueries = {
  create: (db, link) => {
    const stmt = db.prepare(`
      INSERT INTO links (campaign_id, code, final_url, channel, inline_label, user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      link.campaign_id,
      link.code,
      link.final_url,
      link.channel,
      link.inline_label,
      link.user_id || null
    );
    return result.lastInsertRowid;
  },

  findByCode: (db, code) => {
    const stmt = db.prepare('SELECT * FROM links WHERE code = ?');
    return stmt.get(code);
  },

  findByCampaign: (db, campaignId) => {
    const stmt = db.prepare(`
      SELECT l.*, COUNT(c.id) as click_count
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      WHERE l.campaign_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    return stmt.all(campaignId);
  },

  findByUser: (db, userId) => {
    const stmt = db.prepare(`
      SELECT l.*, COUNT(c.id) as click_count
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      WHERE l.user_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    return stmt.all(userId);
  },

  findByUserAndCampaign: (db, userId, campaignId) => {
    const stmt = db.prepare(`
      SELECT l.*, COUNT(c.id) as click_count
      FROM links l
      LEFT JOIN clicks c ON l.id = c.link_id
      WHERE l.user_id = ? AND l.campaign_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    return stmt.all(userId, campaignId);
  },

  codeExists: (db, code) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM links WHERE code = ?');
    return stmt.get(code).count > 0;
  }
};

/**
 * Click queries
 */
const clickQueries = {
  create: (db, click) => {
    const stmt = db.prepare(`
      INSERT INTO clicks (link_id, user_agent, ip, tg_user_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      click.link_id,
      click.user_agent,
      click.ip,
      click.tg_user_id
    );
    return result.lastInsertRowid;
  },

  countByLink: (db, linkId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM clicks WHERE link_id = ?');
    return stmt.get(linkId).count;
  },

  countByCampaign: (db, campaignId) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM clicks c
      JOIN links l ON c.link_id = l.id
      WHERE l.campaign_id = ?
    `);
    return stmt.get(campaignId).count;
  },

  getRecentByLink: (db, linkId, hoursAgo = 24) => {
    const stmt = db.prepare(`
      SELECT * FROM clicks
      WHERE link_id = ? AND ts >= datetime('now', '-' || ? || ' hours')
      ORDER BY ts DESC
    `);
    return stmt.all(linkId, hoursAgo);
  },

  getTimelineByLink: (db, linkId, hoursAgo = 24) => {
    const stmt = db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', ts) as hour,
        COUNT(*) as clicks
      FROM clicks
      WHERE link_id = ? AND ts >= datetime('now', '-' || ? || ' hours')
      GROUP BY hour
      ORDER BY hour ASC
    `);
    return stmt.all(linkId, hoursAgo);
  },

  countByIPRecent: (db, ip, seconds = 60) => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM clicks
      WHERE ip = ? AND ts >= datetime('now', '-' || ? || ' seconds')
    `);
    return stmt.get(ip, seconds).count;
  }
};

/**
 * Post queries
 */
const postQueries = {
  create: (db, post) => {
    const stmt = db.prepare(`
      INSERT INTO posts (campaign_id, channel, message_id, impressions)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      post.campaign_id,
      post.channel,
      post.message_id,
      post.impressions || null
    );
    return result.lastInsertRowid;
  },

  findByCampaign: (db, campaignId) => {
    const stmt = db.prepare(`
      SELECT * FROM posts
      WHERE campaign_id = ?
      ORDER BY sent_at DESC
    `);
    return stmt.all(campaignId);
  },

  updateImpressions: (db, id, impressions) => {
    const stmt = db.prepare('UPDATE posts SET impressions = ? WHERE id = ?');
    return stmt.run(impressions, id);
  },

  countByCampaign: (db, campaignId) => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM posts WHERE campaign_id = ?');
    return stmt.get(campaignId).count;
  }
};

/**
 * Get database health info
 */
function getHealthInfo(db) {
  const campaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE is_deleted = 0').get();
  const links = db.prepare('SELECT COUNT(*) as count FROM links').get();
  const clicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get();
  const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get();

  return {
    dbPath: DB_PATH,
    campaigns: campaigns.count,
    links: links.count,
    clicks: clicks.count,
    posts: posts.count
  };
}

module.exports = {
  getDB,
  userQueries,
  userParticipationQueries,
  campaignQueries,
  linkQueries,
  clickQueries,
  postQueries,
  getHealthInfo
};
