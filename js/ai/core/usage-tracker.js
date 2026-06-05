/**
 * Usage Tracker - Track API usage, demo quota, costs
 */

import { ref, get, set, increment } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

// Demo limits
const DEMO_LIMITS = {
  daily: 5,
  monthly: 100
};

// Cost per 1K tokens (approximate)
const COST_PER_1K = {
  gemini: { input: 0.0001, output: 0.0004 },
  claude: { input: 0.003, output: 0.015 }
};

export function initUsageTracker(database) {
  db = database;
}

/**
 * Check if user can make a request (demo mode)
 */
export async function checkDemoQuota(userId) {
  if (!db || !userId) return { allowed: false, reason: 'Not initialized' };

  const today = new Date().toISOString().split('T')[0];

  try {
    const snapshot = await get(ref(db, `users/${userId}/aiSettings/usage/demo`));
    const demoUsage = snapshot.exists() ? snapshot.val() : { date: today, count: 0 };

    // Reset if new day
    if (demoUsage.date !== today) {
      demoUsage.date = today;
      demoUsage.count = 0;
    }

    const remaining = DEMO_LIMITS.daily - demoUsage.count;

    if (remaining > 0) {
      return {
        allowed: true,
        remaining,
        limit: DEMO_LIMITS.daily,
        used: demoUsage.count
      };
    } else {
      return {
        allowed: false,
        reason: 'Daily demo limit reached',
        remaining: 0,
        limit: DEMO_LIMITS.daily,
        used: demoUsage.count,
        resetAt: getNextMidnight()
      };
    }

  } catch (error) {
    console.error('Error checking demo quota:', error);
    return { allowed: false, reason: error.message };
  }
}

/**
 * Record a demo usage
 */
export async function recordDemoUsage(userId) {
  if (!db || !userId) return false;

  const today = new Date().toISOString().split('T')[0];

  try {
    const usageRef = ref(db, `users/${userId}/aiSettings/usage/demo`);
    const snapshot = await get(usageRef);
    const current = snapshot.exists() ? snapshot.val() : { date: today, count: 0 };

    // Reset if new day
    if (current.date !== today) {
      current.date = today;
      current.count = 0;
    }

    current.count += 1;
    await set(usageRef, current);

    return true;
  } catch (error) {
    console.error('Error recording demo usage:', error);
    return false;
  }
}

/**
 * Record API usage (tokens, cost)
 */
export async function recordUsage(userId, data) {
  if (!db || !userId) return false;

  const {
    provider,
    model,
    inputTokens = 0,
    outputTokens = 0,
    taskType = 'unknown'
  } = data;

  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7); // YYYY-MM

  // Calculate estimated cost
  const costs = COST_PER_1K[provider] || COST_PER_1K.gemini;
  const estimatedCost = (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);

  try {
    // Update daily stats
    const dailyRef = ref(db, `users/${userId}/aiSettings/usage/daily/${today}`);
    const dailySnapshot = await get(dailyRef);
    const daily = dailySnapshot.exists() ? dailySnapshot.val() : {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0
    };

    daily.requests += 1;
    daily.inputTokens += inputTokens;
    daily.outputTokens += outputTokens;
    daily.estimatedCost += estimatedCost;

    await set(dailyRef, daily);

    // Update monthly stats
    const monthlyRef = ref(db, `users/${userId}/aiSettings/usage/monthly/${month}`);
    const monthlySnapshot = await get(monthlyRef);
    const monthly = monthlySnapshot.exists() ? monthlySnapshot.val() : {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0
    };

    monthly.requests += 1;
    monthly.inputTokens += inputTokens;
    monthly.outputTokens += outputTokens;
    monthly.estimatedCost += estimatedCost;

    await set(monthlyRef, monthly);

    // Update total stats
    const totalRef = ref(db, `users/${userId}/aiSettings/usage/total`);
    const totalSnapshot = await get(totalRef);
    const total = totalSnapshot.exists() ? totalSnapshot.val() : {
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      firstUse: new Date().toISOString()
    };

    total.requests += 1;
    total.inputTokens += inputTokens;
    total.outputTokens += outputTokens;
    total.estimatedCost += estimatedCost;
    total.lastUse = new Date().toISOString();

    await set(totalRef, total);

    return true;

  } catch (error) {
    console.error('Error recording usage:', error);
    return false;
  }
}

/**
 * Get usage statistics
 */
export async function getUsageStats(userId, period = 'all') {
  if (!db || !userId) return null;

  try {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);

    const stats = {
      demo: null,
      daily: null,
      monthly: null,
      total: null
    };

    // Demo usage
    const demoSnapshot = await get(ref(db, `users/${userId}/aiSettings/usage/demo`));
    if (demoSnapshot.exists()) {
      const demo = demoSnapshot.val();
      stats.demo = {
        ...demo,
        remaining: demo.date === today ? (DEMO_LIMITS.daily - demo.count) : DEMO_LIMITS.daily,
        limit: DEMO_LIMITS.daily
      };
    } else {
      stats.demo = { count: 0, remaining: DEMO_LIMITS.daily, limit: DEMO_LIMITS.daily };
    }

    // Daily usage
    if (period === 'all' || period === 'daily') {
      const dailySnapshot = await get(ref(db, `users/${userId}/aiSettings/usage/daily/${today}`));
      stats.daily = dailySnapshot.exists() ? dailySnapshot.val() : {
        requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0
      };
    }

    // Monthly usage
    if (period === 'all' || period === 'monthly') {
      const monthlySnapshot = await get(ref(db, `users/${userId}/aiSettings/usage/monthly/${month}`));
      stats.monthly = monthlySnapshot.exists() ? monthlySnapshot.val() : {
        requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0
      };
    }

    // Total usage
    if (period === 'all' || period === 'total') {
      const totalSnapshot = await get(ref(db, `users/${userId}/aiSettings/usage/total`));
      stats.total = totalSnapshot.exists() ? totalSnapshot.val() : {
        requests: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0
      };
    }

    return stats;

  } catch (error) {
    console.error('Error getting usage stats:', error);
    return null;
  }
}

/**
 * Get next midnight timestamp (for quota reset)
 */
function getNextMidnight() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Format cost for display
 */
export function formatCost(cost) {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Format tokens for display
 */
export function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export default {
  initUsageTracker,
  checkDemoQuota,
  recordDemoUsage,
  recordUsage,
  getUsageStats,
  formatCost,
  formatTokens,
  DEMO_LIMITS
};
