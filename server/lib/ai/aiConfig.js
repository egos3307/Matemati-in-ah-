/**
 * AI Provider Configurations
 */
module.exports = {
  GEMINI: {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  OPENROUTER: {
    API_URL: 'https://openrouter.ai/api/v1/chat/completions',
    MODEL: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
  },
  DEFAULT_TIMEOUT_MS: 30000,
};
