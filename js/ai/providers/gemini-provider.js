/**
 * Gemini AI Provider
 */

import { BaseProvider } from './base-provider.js';

export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'gemini';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    this.models = {
      'gemini-2.0-flash': {
        name: 'Gemini 2.0 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        costPer1kInput: 0.0001,
        costPer1kOutput: 0.0004,
        tier: 'fast'
      },
      'gemini-1.5-pro': {
        name: 'Gemini 1.5 Pro',
        contextWindow: 2000000,
        maxOutput: 8192,
        costPer1kInput: 0.00125,
        costPer1kOutput: 0.005,
        tier: 'powerful'
      },
      'gemini-1.5-flash': {
        name: 'Gemini 1.5 Flash',
        contextWindow: 1000000,
        maxOutput: 8192,
        costPer1kInput: 0.000075,
        costPer1kOutput: 0.0003,
        tier: 'fast'
      }
    };

    this.defaultModel = 'gemini-2.0-flash';
  }

  /**
   * Validate API key by making a simple request
   */
  async validateKey() {
    if (!this.apiKey) return { valid: false, error: 'No API key provided' };

    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
        { method: 'GET' }
      );

      if (response.ok) {
        return { valid: true };
      } else {
        const error = await response.json();
        return {
          valid: false,
          error: error.error?.message || 'Invalid API key'
        };
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
      throw new Error('Gemini API key not configured');
    }

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    // Convert messages to Gemini format
    const contents = this.convertToGeminiFormat(messages, systemPrompt);

    const requestBody = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw {
          status: response.status,
          message: error.error?.message || 'Gemini API error',
          code: error.error?.code
        };
      }

      const data = await response.json();

      // Extract response text
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Calculate tokens (Gemini provides this in usageMetadata)
      const usage = {
        inputTokens: data.usageMetadata?.promptTokenCount || this.estimateTokens(JSON.stringify(messages)),
        outputTokens: data.usageMetadata?.candidatesTokenCount || this.estimateTokens(content),
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      };

      return {
        success: true,
        content,
        model,
        provider: this.name,
        usage,
        finishReason: data.candidates?.[0]?.finishReason || 'STOP'
      };

    } catch (error) {
      const errorInfo = this.handleError(error, 'chat');
      throw errorInfo;
    }
  }

  /**
   * Convert standard messages to Gemini format
   */
  convertToGeminiFormat(messages, systemPrompt) {
    const contents = [];

    // Gemini handles system prompt differently - prepend to first user message
    let systemPrefix = systemPrompt ? `${systemPrompt}\n\n` : '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const role = msg.role === 'assistant' ? 'model' : 'user';
      let content = msg.content;

      // Add system prompt to first user message
      if (i === 0 && role === 'user' && systemPrefix) {
        content = systemPrefix + content;
        systemPrefix = '';
      }

      contents.push({
        role,
        parts: [{ text: content }]
      });
    }

    return contents;
  }

  /**
   * Get model for specific task type
   */
  getModelForTask(taskType) {
    const taskModelMap = {
      'quick_answer': 'gemini-2.0-flash',
      'casual_chat': 'gemini-2.0-flash',
      'deep_explanation': 'gemini-1.5-pro',
      'analysis': 'gemini-1.5-pro',
      'tutor_session': 'gemini-1.5-flash'
    };

    return taskModelMap[taskType] || this.defaultModel;
  }
}

export default GeminiProvider;
