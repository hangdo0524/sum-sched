/**
 * Curriculum Sources Manager
 * Load, parse, and manage curriculum reference sources
 */

import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { aiProvider } from '../ai/index.js';

let db = null;
const sourceCache = new Map();

export function initSources(database) {
  db = database;
}

// ============================================
// BUILT-IN SOURCES
// ============================================

const BUILT_IN_SOURCES = {
  gdpt_2018: {
    path: './data/curricula/gdpt-2018.json',
    name: 'Chương trình GDPT 2018',
    country: 'Vietnam',
    type: 'curriculum'
  },
  cambridge: {
    path: './data/curricula/cambridge.json',
    name: 'Cambridge International',
    country: 'International',
    type: 'curriculum'
  },
  ib_pyp: {
    path: './data/curricula/ib-pyp.json',
    name: 'IB Primary Years Programme',
    country: 'International',
    type: 'curriculum'
  }
};

// ============================================
// SOURCE LOADING
// ============================================

/**
 * Load a source by ID
 */
export async function loadSource(sourceId) {
  // Check cache first
  if (sourceCache.has(sourceId)) {
    return sourceCache.get(sourceId);
  }

  // Check built-in sources
  if (BUILT_IN_SOURCES[sourceId]) {
    const source = await loadBuiltInSource(sourceId);
    if (source) {
      sourceCache.set(sourceId, source);
      return source;
    }
  }

  // Check custom sources in Firebase
  if (db) {
    const customSource = await loadCustomSource(sourceId);
    if (customSource) {
      sourceCache.set(sourceId, customSource);
      return customSource;
    }
  }

  return null;
}

/**
 * Load built-in source from JSON file
 */
async function loadBuiltInSource(sourceId) {
  const info = BUILT_IN_SOURCES[sourceId];
  if (!info) return null;

  try {
    const response = await fetch(info.path);
    if (!response.ok) {
      console.error(`Failed to load source ${sourceId}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error loading source ${sourceId}:`, error);
    return null;
  }
}

/**
 * Load custom source from Firebase
 */
async function loadCustomSource(sourceId) {
  if (!db) return null;

  try {
    const snapshot = await get(ref(db, `curriculumSources/${sourceId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error loading custom source:', error);
    return null;
  }
}

// ============================================
// SOURCE MANAGEMENT
// ============================================

/**
 * Get list of all available sources
 */
export async function getSources(userId = null) {
  const sources = [];

  // Built-in sources
  for (const [id, info] of Object.entries(BUILT_IN_SOURCES)) {
    sources.push({
      id,
      name: info.name,
      country: info.country,
      type: info.type,
      isBuiltIn: true
    });
  }

  // Custom sources from Firebase
  if (db && userId) {
    try {
      const snapshot = await get(ref(db, `users/${userId}/customSources`));
      if (snapshot.exists()) {
        const customSources = snapshot.val();
        for (const [id, source] of Object.entries(customSources)) {
          sources.push({
            id,
            name: source.name,
            type: source.type,
            isBuiltIn: false,
            addedAt: source.addedAt
          });
        }
      }
    } catch (error) {
      console.error('Error loading custom sources:', error);
    }
  }

  return sources;
}

/**
 * Add a custom source
 */
export async function addCustomSource(userId, source) {
  if (!db || !userId) {
    return { error: 'Database not initialized' };
  }

  const sourceId = `custom_${Date.now()}`;

  const sourceData = {
    ...source,
    id: sourceId,
    addedAt: new Date().toISOString(),
    addedBy: userId
  };

  try {
    await set(ref(db, `users/${userId}/customSources/${sourceId}`), sourceData);

    // Also save parsed content for quick access
    if (source.parsedContent) {
      await set(ref(db, `curriculumSources/${sourceId}`), {
        _metadata: {
          id: sourceId,
          name: source.name,
          type: source.type,
          lastUpdated: sourceData.addedAt
        },
        ...source.parsedContent
      });
    }

    // Clear cache
    sourceCache.delete(sourceId);

    return { success: true, sourceId };
  } catch (error) {
    console.error('Error adding custom source:', error);
    return { error: error.message };
  }
}

/**
 * Delete a custom source
 */
export async function deleteCustomSource(userId, sourceId) {
  if (!db || !userId) return false;

  try {
    await set(ref(db, `users/${userId}/customSources/${sourceId}`), null);
    await set(ref(db, `curriculumSources/${sourceId}`), null);
    sourceCache.delete(sourceId);
    return true;
  } catch (error) {
    console.error('Error deleting source:', error);
    return false;
  }
}

// ============================================
// SOURCE PARSING (AI-powered)
// ============================================

/**
 * Parse raw content (text, link) into structured curriculum data
 */
export async function parseSourceContent(options) {
  const { content, type, name, sourceType } = options;

  // If already JSON, validate and return
  if (type === 'json') {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return {
        success: true,
        parsedContent: parsed,
        format: 'json'
      };
    } catch (error) {
      return { error: 'Invalid JSON format' };
    }
  }

  // Use AI to parse text/link content
  const prompt = buildParsePrompt(content, name, sourceType);

  try {
    const response = await aiProvider.chat({
      task: 'analysis',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
      temperature: 0.3
    });

    if (!response.success) {
      return { error: response.error?.message || 'AI parsing failed' };
    }

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        parsedContent: parsed,
        format: 'ai_parsed'
      };
    }

    return { error: 'Could not extract structured data' };

  } catch (error) {
    console.error('Source parsing error:', error);
    return { error: error.message };
  }
}

function buildParsePrompt(content, name, sourceType) {
  return `
Phân tích nội dung sau và trích xuất thông tin chương trình học:

## NGUỒN: ${name}
## LOẠI: ${sourceType}

## NỘI DUNG:
${content.substring(0, 10000)}

## YÊU CẦU
Trích xuất và cấu trúc thành JSON với format:

{
  "subjects": {
    "subject_id": {
      "name": "Tên môn",
      "outline": {
        "grade_number": ["Topic 1", "Topic 2", ...]
      },
      "notes": "Ghi chú đặc biệt"
    }
  },
  "assessment": {
    "methods": ["Phương pháp đánh giá"],
    "criteria": ["Tiêu chí"]
  },
  "additionalInfo": "Thông tin bổ sung quan trọng"
}

Nếu không thể parse, trả về:
{
  "error": "Lý do",
  "rawSummary": "Tóm tắt nội dung"
}

Chỉ trả về JSON.
`;
}

// ============================================
// URL CONTENT FETCHING
// ============================================

/**
 * Fetch content from URL (for link-based sources)
 */
export async function fetchURLContent(url) {
  try {
    // Use a CORS proxy or backend endpoint in production
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `Failed to fetch: ${response.status}` };
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return { content: await response.json(), type: 'json' };
    }

    if (contentType.includes('text/html')) {
      const html = await response.text();
      // Extract text content from HTML
      const textContent = extractTextFromHTML(html);
      return { content: textContent, type: 'text' };
    }

    return { content: await response.text(), type: 'text' };

  } catch (error) {
    console.error('URL fetch error:', error);
    return { error: error.message };
  }
}

function extractTextFromHTML(html) {
  // Simple extraction - in production, use DOMParser
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 20000);
}

// ============================================
// EXPORTS
// ============================================

export default {
  initSources,
  loadSource,
  getSources,
  addCustomSource,
  deleteCustomSource,
  parseSourceContent,
  fetchURLContent,
  BUILT_IN_SOURCES
};
