/**
 * AI Provider - Main entry point
 * Unified interface for multiple AI providers (Gemini, Claude)
 */

import { GeminiProvider } from './providers/gemini-provider.js';
import { ClaudeProvider } from './providers/claude-provider.js';
import {
  initKeyManager,
  encryptKey,
  decryptKey,
  saveEncryptedKeys,
  loadEncryptedKeys,
  saveAISettings,
  loadAISettings
} from './core/key-manager.js';
import {
  initUsageTracker,
  checkDemoQuota,
  recordDemoUsage,
  recordUsage,
  getUsageStats,
  formatCost,
  formatTokens
} from './core/usage-tracker.js';
import {
  getRoute,
  recordSuccess,
  recordFailure,
  isProviderHealthy,
  getProviderHealth,
  resetAllCircuitBreakers
} from './core/router.js';

// Demo mode API keys (owner's keys - limited usage)
const DEMO_KEYS = {
  gemini: null,  // Set via setDemoKeys()
  claude: null
};

class AIProvider {
  constructor() {
    this.providers = {
      gemini: new GeminiProvider(),
      claude: new ClaudeProvider()
    };

    this.initialized = false;
    this.userId = null;
    this.userPIN = null;
    this.settings = {
      mode: 'demo',
      preferredProvider: 'auto'
    };
    this.decryptedKeys = {
      gemini: null,
      claude: null
    };
  }

  /**
   * Initialize AI Provider with user context
   */
  async init(userId, userPIN, database) {
    this.userId = userId;
    this.userPIN = userPIN;

    // Initialize sub-modules
    initKeyManager(database);
    initUsageTracker(database);

    // Load user settings
    this.settings = await loadAISettings(userId) || {
      mode: 'demo',
      preferredProvider: 'auto'
    };

    // If BYOK mode, decrypt user's keys
    if (this.settings.mode === 'byok' && userPIN) {
      await this.loadUserKeys();
    }

    this.initialized = true;
    return this.getStatus();
  }

  /**
   * Load and decrypt user's API keys
   */
  async loadUserKeys() {
    if (!this.userId || !this.userPIN) return;

    const encryptedKeys = await loadEncryptedKeys(this.userId);
    if (!encryptedKeys) return;

    // Decrypt keys
    if (encryptedKeys.gemini) {
      this.decryptedKeys.gemini = await decryptKey(encryptedKeys.gemini, this.userPIN);
      if (this.decryptedKeys.gemini) {
        await this.providers.gemini.init(this.decryptedKeys.gemini);
      }
    }

    if (encryptedKeys.claude) {
      this.decryptedKeys.claude = await decryptKey(encryptedKeys.claude, this.userPIN);
      if (this.decryptedKeys.claude) {
        await this.providers.claude.init(this.decryptedKeys.claude);
      }
    }
  }

  /**
   * Save a new API key (encrypted)
   */
  async saveKey(provider, apiKey) {
    if (!this.userId || !this.userPIN) {
      throw new Error('User not initialized');
    }

    // Validate key first
    const tempProvider = provider === 'gemini' ? new GeminiProvider() : new ClaudeProvider();
    await tempProvider.init(apiKey);
    const validation = await tempProvider.validateKey();

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid API key');
    }

    // Encrypt and save
    const encryptedKey = await encryptKey(apiKey, this.userPIN);
    if (!encryptedKey) {
      throw new Error('Failed to encrypt key');
    }

    // Load existing keys
    const existingKeys = await loadEncryptedKeys(this.userId) || {};
    existingKeys[provider] = encryptedKey;

    await saveEncryptedKeys(this.userId, existingKeys);

    // Update local state
    this.decryptedKeys[provider] = apiKey;
    await this.providers[provider].init(apiKey);

    return { success: true };
  }

  /**
   * Remove an API key
   */
  async removeKey(provider) {
    if (!this.userId) return;

    const existingKeys = await loadEncryptedKeys(this.userId) || {};
    delete existingKeys[provider];

    await saveEncryptedKeys(this.userId, existingKeys);

    this.decryptedKeys[provider] = null;
    this.providers[provider].apiKey = null;
  }

  /**
   * Set mode (demo, byok, premium)
   */
  async setMode(mode) {
    this.settings.mode = mode;
    await saveAISettings(this.userId, this.settings);

    if (mode === 'byok') {
      await this.loadUserKeys();
    }
  }

  /**
   * Set preferred provider
   */
  async setPreferredProvider(provider) {
    this.settings.preferredProvider = provider;
    await saveAISettings(this.userId, this.settings);
  }

  /**
   * Main chat method - unified interface
   */
  async chat(options = {}) {
    if (!this.initialized) {
      throw new Error('AI Provider not initialized');
    }

    const {
      messages = [],
      systemPrompt = null,
      task = 'default',
      provider: forcedProvider = null,
      model: forcedModel = null,
      temperature = 0.7,
      maxTokens = 2048
    } = options;

    // Check quota for demo mode
    if (this.settings.mode === 'demo') {
      const quota = await checkDemoQuota(this.userId);
      if (!quota.allowed) {
        throw {
          code: 'QUOTA_EXCEEDED',
          message: quota.reason,
          resetAt: quota.resetAt
        };
      }
    }

    // Get available providers
    const availableProviders = this.getAvailableProviders();
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Determine which provider/model to use
    let route;
    if (forcedProvider && availableProviders.includes(forcedProvider)) {
      route = {
        provider: forcedProvider,
        model: forcedModel || this.providers[forcedProvider].defaultModel,
        fallback: null
      };
    } else {
      route = getRoute(task, {
        preferredProvider: this.settings.preferredProvider,
        availableProviders
      });
    }

    if (!route) {
      throw new Error('No suitable AI provider found');
    }

    // Try primary provider
    let result = await this.tryProvider(route.provider, route.model, {
      messages,
      systemPrompt,
      temperature,
      maxTokens
    });

    // If failed and has fallback, try fallback
    if (!result.success && route.fallback) {
      console.warn(`Primary provider ${route.provider} failed, trying fallback ${route.fallback.provider}`);
      result = await this.tryProvider(route.fallback.provider, route.fallback.model, {
        messages,
        systemPrompt,
        temperature,
        maxTokens
      });
    }

    if (!result.success) {
      throw result.error;
    }

    // Record usage
    if (this.settings.mode === 'demo') {
      await recordDemoUsage(this.userId);
    }

    await recordUsage(this.userId, {
      provider: result.provider,
      model: result.model,
      inputTokens: result.usage?.inputTokens || 0,
      outputTokens: result.usage?.outputTokens || 0,
      taskType: task
    });

    return result;
  }

  /**
   * Try a specific provider
   */
  async tryProvider(providerName, model, options) {
    const provider = this.providers[providerName];
    if (!provider) {
      return { success: false, error: { message: `Provider ${providerName} not found` } };
    }

    // Set API key based on mode
    const apiKey = this.getApiKey(providerName);
    if (!apiKey) {
      return { success: false, error: { message: `No API key for ${providerName}` } };
    }

    if (!provider.apiKey) {
      await provider.init(apiKey);
    }

    try {
      const result = await provider.chat({
        ...options,
        model
      });

      recordSuccess(providerName);
      return result;

    } catch (error) {
      recordFailure(providerName, error);
      return { success: false, error };
    }
  }

  /**
   * Get API key for a provider based on current mode
   */
  getApiKey(provider) {
    if (this.settings.mode === 'demo') {
      return DEMO_KEYS[provider];
    }

    if (this.settings.mode === 'byok') {
      return this.decryptedKeys[provider];
    }

    // Premium mode - would use backend proxy
    return null;
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders() {
    const available = [];

    for (const [name, provider] of Object.entries(this.providers)) {
      const key = this.getApiKey(name);
      if (key && isProviderHealthy(name)) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Get current status
   */
  getStatus() {
    const available = this.getAvailableProviders();

    return {
      initialized: this.initialized,
      mode: this.settings.mode,
      preferredProvider: this.settings.preferredProvider,
      availableProviders: available,
      providerHealth: getProviderHealth(),
      hasGeminiKey: !!this.decryptedKeys.gemini || !!DEMO_KEYS.gemini,
      hasClaudeKey: !!this.decryptedKeys.claude || !!DEMO_KEYS.claude
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(period = 'all') {
    return getUsageStats(this.userId, period);
  }

  /**
   * Test a provider connection
   */
  async testProvider(provider, apiKey = null) {
    const testKey = apiKey || this.getApiKey(provider);
    if (!testKey) {
      return { success: false, error: 'No API key' };
    }

    const testProvider = provider === 'gemini' ? new GeminiProvider() : new ClaudeProvider();
    await testProvider.init(testKey);

    const validation = await testProvider.validateKey();
    return validation;
  }

  /**
   * Reset circuit breakers
   */
  resetCircuitBreakers() {
    resetAllCircuitBreakers();
  }
}

// Singleton instance
const aiProvider = new AIProvider();

/**
 * Set demo keys (call during app initialization)
 */
export function setDemoKeys(keys) {
  if (keys.gemini) DEMO_KEYS.gemini = keys.gemini;
  if (keys.claude) DEMO_KEYS.claude = keys.claude;
}

/**
 * Get demo keys status
 */
export function hasDemoKeys() {
  return !!DEMO_KEYS.gemini || !!DEMO_KEYS.claude;
}

// Export singleton and utilities
export { aiProvider, formatCost, formatTokens };

export default aiProvider;
