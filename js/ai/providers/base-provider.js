/**
 * Base AI Provider - Abstract class for all AI providers
 */

export class BaseProvider {
  constructor(config = {}) {
    this.name = 'base';
    this.apiKey = null;
    this.baseUrl = '';
    this.models = {};
    this.defaultModel = '';
    this.config = config;
  }

  /**
   * Initialize provider with API key
   */
  async init(apiKey) {
    this.apiKey = apiKey;
    return this.validateKey();
  }

  /**
   * Validate API key - must be implemented by subclass
   */
  async validateKey() {
    throw new Error('validateKey() must be implemented');
  }

  /**
   * Send chat completion request - must be implemented by subclass
   */
  async chat(options) {
    throw new Error('chat() must be implemented');
  }

  /**
   * Get available models
   */
  getModels() {
    return this.models;
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Check if provider is ready
   */
  isReady() {
    return !!this.apiKey;
  }

  /**
   * Estimate tokens for a message (rough estimate)
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Format messages for the provider's API
   */
  formatMessages(messages, systemPrompt = null) {
    const formatted = [];

    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      formatted.push({
        role: msg.role || 'user',
        content: msg.content
      });
    }

    return formatted;
  }

  /**
   * Handle API errors uniformly
   */
  handleError(error, context = '') {
    const errorInfo = {
      provider: this.name,
      context,
      message: error.message || 'Unknown error',
      status: error.status || error.statusCode || null,
      retryable: false
    };

    // Determine if error is retryable
    if (error.status === 429 || error.message?.includes('rate limit')) {
      errorInfo.retryable = true;
      errorInfo.retryAfter = error.retryAfter || 60;
    } else if (error.status >= 500) {
      errorInfo.retryable = true;
    }

    return errorInfo;
  }
}

export default BaseProvider;
