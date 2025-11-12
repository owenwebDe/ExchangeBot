const crypto = require('crypto');

/**
 * Slugify a string for URL-safe usage
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Generate a random base62 code
 * @param {number} length - Length of the code (default: 7)
 * @returns {string} Random base62 code
 */
function makeCode(length = 7) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let code = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    code += chars[randomBytes[i] % chars.length];
  }

  return code;
}

/**
 * Build a URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {object} params - Query parameters object
 * @returns {string} Complete URL with parameters
 */
function buildUrl(baseUrl, params = {}) {
  // Validate URL
  try {
    const url = new URL(baseUrl);

    // Add/merge parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${baseUrl}`);
  }
}

/**
 * Validate if a URL is safe (http/https only)
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Format a date to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {string} Percentage string (e.g., "45.2%")
 */
function calculatePercentage(part, total) {
  if (total === 0) return '0.0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

/**
 * Format large numbers with K/M suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Escape special characters for Markdown (Telegram MarkdownV2)
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;
  specialChars.forEach(char => {
    escaped = escaped.replace(new RegExp('\\' + char, 'g'), '\\' + char);
  });
  return escaped;
}

/**
 * Truncate text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse comma-separated values into array
 * @param {string} csv - Comma-separated values
 * @returns {array} Array of trimmed values
 */
function parseCSV(csv) {
  if (!csv) return [];
  return csv.split(',').map(item => item.trim()).filter(item => item);
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} Current date
 */
function getCurrentDate() {
  return new Date().toISOString().split('T')[0];
}

module.exports = {
  slugify,
  makeCode,
  buildUrl,
  isValidUrl,
  formatDate,
  calculatePercentage,
  formatNumber,
  escapeMarkdown,
  truncate,
  parseCSV,
  getCurrentDate
};
