/**
 * AI Router - Smart model routing based on task type
 */

// Task type to model mapping
const TASK_ROUTING = {
  // Quick responses - use fast/cheap models
  quick_answer: {
    primary: { provider: 'gemini', model: 'gemini-2.0-flash' },
    fallback: { provider: 'claude', model: 'claude-haiku-4-5-20251001' }
  },

  casual_chat: {
    primary: { provider: 'gemini', model: 'gemini-2.0-flash' },
    fallback: { provider: 'claude', model: 'claude-haiku-4-5-20251001' }
  },

  // Deep explanation - use powerful models
  deep_explanation: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' }
  },

  // Analysis tasks - need reasoning
  analysis: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' }
  },

  // Tutoring session - balanced
  tutor_session: {
    primary: { provider: 'gemini', model: 'gemini-1.5-flash' },
    fallback: { provider: 'claude', model: 'claude-sonnet-4-20250514' }
  },

  tutor_math: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'claude', model: 'claude-sonnet-4-20250514' }
  },

  tutor_english: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' }
  },

  tutor_science: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'claude', model: 'claude-sonnet-4-20250514' }
  },

  // Exercise generation
  exercise_generation: {
    primary: { provider: 'gemini', model: 'gemini-1.5-flash' },
    fallback: { provider: 'claude', model: 'claude-haiku-4-5-20251001' }
  },

  // Grading/feedback
  grading: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' }
  },

  // Roadmap/strategic planning
  roadmap_analysis: {
    primary: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' }
  },

  // Default
  default: {
    primary: { provider: 'gemini', model: 'gemini-2.0-flash' },
    fallback: { provider: 'claude', model: 'claude-haiku-4-5-20251001' }
  }
};

// Provider health status
const providerHealth = {
  gemini: { healthy: true, lastError: null, consecutiveFailures: 0 },
  claude: { healthy: true, lastError: null, consecutiveFailures: 0 }
};

// Circuit breaker config
const CIRCUIT_BREAKER = {
  failureThreshold: 3,
  resetTimeout: 5 * 60 * 1000 // 5 minutes
};

/**
 * Get best route for a task
 */
export function getRoute(taskType, options = {}) {
  const { preferredProvider, availableProviders = ['gemini', 'claude'] } = options;

  const routing = TASK_ROUTING[taskType] || TASK_ROUTING.default;

  // If user has preference and it's available
  if (preferredProvider && preferredProvider !== 'auto') {
    if (availableProviders.includes(preferredProvider) && isProviderHealthy(preferredProvider)) {
      const preferredModel = getPreferredModel(preferredProvider, taskType);
      return {
        provider: preferredProvider,
        model: preferredModel,
        fallback: routing.fallback
      };
    }
  }

  // Use smart routing
  const primary = routing.primary;
  const fallback = routing.fallback;

  // Check if primary is available and healthy
  if (availableProviders.includes(primary.provider) && isProviderHealthy(primary.provider)) {
    return { ...primary, fallback };
  }

  // Use fallback
  if (availableProviders.includes(fallback.provider) && isProviderHealthy(fallback.provider)) {
    return { ...fallback, fallback: primary };
  }

  // Return whatever is available
  for (const provider of availableProviders) {
    if (isProviderHealthy(provider)) {
      return {
        provider,
        model: getPreferredModel(provider, taskType),
        fallback: null
      };
    }
  }

  return null;
}

/**
 * Get preferred model for a provider and task
 */
function getPreferredModel(provider, taskType) {
  const routing = TASK_ROUTING[taskType] || TASK_ROUTING.default;

  if (routing.primary.provider === provider) {
    return routing.primary.model;
  }
  if (routing.fallback.provider === provider) {
    return routing.fallback.model;
  }

  // Default models
  const defaultModels = {
    gemini: 'gemini-2.0-flash',
    claude: 'claude-sonnet-4-20250514'
  };

  return defaultModels[provider];
}

/**
 * Check if provider is healthy (circuit breaker)
 */
export function isProviderHealthy(provider) {
  const health = providerHealth[provider];
  if (!health) return true;

  if (!health.healthy) {
    // Check if reset timeout has passed
    if (health.lastError) {
      const timeSinceError = Date.now() - health.lastError;
      if (timeSinceError > CIRCUIT_BREAKER.resetTimeout) {
        // Reset circuit breaker
        health.healthy = true;
        health.consecutiveFailures = 0;
        return true;
      }
    }
    return false;
  }

  return true;
}

/**
 * Record provider success
 */
export function recordSuccess(provider) {
  const health = providerHealth[provider];
  if (health) {
    health.healthy = true;
    health.consecutiveFailures = 0;
  }
}

/**
 * Record provider failure
 */
export function recordFailure(provider, error) {
  const health = providerHealth[provider];
  if (health) {
    health.consecutiveFailures += 1;
    health.lastError = Date.now();

    if (health.consecutiveFailures >= CIRCUIT_BREAKER.failureThreshold) {
      health.healthy = false;
      console.warn(`Circuit breaker OPEN for ${provider} after ${health.consecutiveFailures} failures`);
    }
  }
}

/**
 * Get all available task types
 */
export function getTaskTypes() {
  return Object.keys(TASK_ROUTING);
}

/**
 * Get routing config for a task
 */
export function getRoutingConfig(taskType) {
  return TASK_ROUTING[taskType] || TASK_ROUTING.default;
}

/**
 * Get provider health status
 */
export function getProviderHealth() {
  return { ...providerHealth };
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers() {
  for (const provider of Object.keys(providerHealth)) {
    providerHealth[provider] = {
      healthy: true,
      lastError: null,
      consecutiveFailures: 0
    };
  }
}

export default {
  getRoute,
  isProviderHealthy,
  recordSuccess,
  recordFailure,
  getTaskTypes,
  getRoutingConfig,
  getProviderHealth,
  resetAllCircuitBreakers,
  TASK_ROUTING
};
