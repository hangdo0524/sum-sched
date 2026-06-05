/**
 * Claude AI Provider (Anthropic)
 */

import { BaseProvider } from './base-provider.js';

export class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'claude';
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.apiVersion = '2023-06-01';

    this.models = {
      'claude-sonnet-4-20250514': {
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        maxOutput: 8192,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015,
        tier: 'powerful'
      },
      'claude-haiku-4-5-20251001': {
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        maxOutput: 8192,
        costPer1kInput: 0.0008,
        costPer1kOutput: 0.004,
        tier: 'fast'
      }
    };

    this.defaultModel = 'claude-sonnet-4-20250514';
  }

  /**
   * Validate API key
   */
  async validateKey() {
    if (!this.apiKey) return { valid: false, error: 'No API key provided' };

    try {
      // Make a minimal request to validate key
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (response.ok) {
        return { valid: true };
      } else {
        const error = await response.json();
        if (error.error?.type === 'authentication_error') {
          return { valid: false, error: 'Invalid API key' };
        }
        // Other errors might still mean key is valid
        return { valid: true };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Send chat completion request
   */
  async chat(options = {}) {
    const {
      messages = [],
      systemPrompt = null,
      model = this.defaultModel,
      temperature = 0.7,
      maxTokens = 2048,
      stream = false
    } = options;

    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    // Format messages for Claude
    const formattedMessages = this.formatMessagesForClaude(messages);

    const requestBody = {
      model,
      max_tokens: maxTokens,
      messages: formattedMessages,
      temperature
    };

    // Claude handles system prompt separately
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw {
          status: response.status,
          message: error.error?.message || 'Claude API error',
          type: error.error?.type
        };
      }

      const data = await response.json();

      // Extract response text
      const content = data.content?.[0]?.text || '';

      const usage = {
        inputTokens: data.usage?.input_tokens || this.estimateTokens(JSON.stringify(messages)),
        outputTokens: data.usage?.output_tokens || this.estimateTokens(content),
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      };

      return {
        success: true,
        content,
        model,
        provider: this.name,
        usage,
        finishReason: data.stop_reason || 'end_turn'
      };

    } catch (error) {
      const errorInfo = this.handleError(error, 'chat');
      throw errorInfo;
    }
  }

  /**
   * Format messages for Claude API
   */
  formatMessagesForClaude(messages) {
    const formatted = [];

    for (const msg of messages) {
      // Claude only accepts 'user' and 'assistant' roles
      const role = msg.role === 'system' ? 'user' : msg.role;

      formatted.push({
        role: role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }

    // Ensure conversation starts with user message
    if (formatted.length > 0 && formatted[0].role !== 'user') {
      formatted.unshift({ role: 'user', content: 'Hello' });
    }

    // Ensure alternating roles (Claude requirement)
    const cleaned = [];
    for (let i = 0; i < formatted.length; i++) {
      const msg = formatted[i];
      const lastMsg = cleaned[cleaned.length - 1];

      if (!lastMsg || lastMsg.role !== msg.role) {
        cleaned.push(msg);
      } else {
        // Merge consecutive same-role messages
        lastMsg.content += '\n\n' + msg.content;
      }
    }

    return cleaned;
  }

  /**
   * Get model for specific task type
   */
  getModelForTask(taskType) {
    const taskModelMap = {
      'quick_answer': 'claude-haiku-4-5-20251001',
      'casual_chat': 'claude-haiku-4-5-20251001',
      'deep_explanation': 'claude-sonnet-4-20250514',
      'analysis': 'claude-sonnet-4-20250514',
      'tutor_session': 'claude-sonnet-4-20250514'
    };

    return taskModelMap[taskType] || this.defaultModel;
  }
}

export default ClaudeProvider;
