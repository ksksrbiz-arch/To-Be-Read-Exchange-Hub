const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Multi-provider AI enrichment service
 * Supports OpenAI, Anthropic Claude, Google Gemini with cost-aware fallbacks
 */

const AI_PROVIDERS = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
};

// Default fallback chain (cheapest first)
const DEFAULT_CHAIN = [
  AI_PROVIDERS.GEMINI,
  AI_PROVIDERS.CLAUDE,
  AI_PROVIDERS.OPENAI,
];

/**
 * Enrich book metadata using AI when traditional APIs fail
 * @param {Object} bookData - Partial book data
 * @returns {Promise<Object>} - Enriched metadata
 */
async function enrichWithAI(bookData) {
  const { isbn, upc, asin, title, author } = bookData;
  
  // Build search context
  const identifiers = [
    isbn && `ISBN: ${isbn}`,
    upc && `UPC: ${upc}`,
    asin && `ASIN: ${asin}`,
    title && `Title: "${title}"`,
    author && `Author: ${author}`,
  ].filter(Boolean).join(', ');

  if (!identifiers) {
    throw new Error('No identifiers provided for AI enrichment');
  }

  const chain = process.env.AI_PROVIDER_ORDER 
    ? process.env.AI_PROVIDER_ORDER.split(',') 
    : DEFAULT_CHAIN;

  let lastError;
  
  for (const provider of chain) {
    if (!isProviderEnabled(provider)) continue;

    try {
      logger.info(`Attempting AI enrichment via ${provider} for: ${identifiers}`);
      const result = await callProvider(provider, identifiers);
      
      if (result && result.title) {
        logger.info(`AI enrichment successful via ${provider}`);
        return {
          ...result,
          enrichment_source: `ai_${provider}`,
          enrichment_status: 'completed',
        };
      }
    } catch (error) {
      logger.warn(`AI enrichment failed via ${provider}: ${error.message}`);
      lastError = error;
    }
  }

  logger.warn('All AI providers failed', { lastError: lastError?.message });
  return null;
}

/**
 * Check if provider is enabled via env vars
 */
function isProviderEnabled(provider) {
  const envKeys = {
    [AI_PROVIDERS.OPENAI]: 'OPENAI_API_KEY',
    [AI_PROVIDERS.CLAUDE]: 'ANTHROPIC_API_KEY',
    [AI_PROVIDERS.GEMINI]: 'GEMINI_API_KEY',
  };
  
  return Boolean(process.env[envKeys[provider]]);
}

/**
 * Call specific AI provider
 */
async function callProvider(provider, identifiers) {
  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return await callOpenAI(identifiers);
    case AI_PROVIDERS.CLAUDE:
      return await callClaude(identifiers);
    case AI_PROVIDERS.GEMINI:
      return await callGemini(identifiers);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * OpenAI GPT enrichment
 */
async function callOpenAI(identifiers) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const prompt = buildEnrichmentPrompt(identifiers);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a book metadata expert. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const content = response.data.choices[0]?.message?.content;
  return parseAIResponse(content);
}

/**
 * Anthropic Claude enrichment
 */
async function callClaude(identifiers) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const prompt = buildEnrichmentPrompt(identifiers);

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        { role: 'user', content: prompt },
      ],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );

  const content = response.data.content[0]?.text;
  return parseAIResponse(content);
}

/**
 * Google Gemini enrichment
 */
async function callGemini(identifiers) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const prompt = buildEnrichmentPrompt(identifiers);
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  const content = response.data.candidates[0]?.content?.parts[0]?.text;
  return parseAIResponse(content);
}

/**
 * Build enrichment prompt
 */
function buildEnrichmentPrompt(identifiers) {
  return `Find metadata for this book: ${identifiers}

Return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "title": "full book title",
  "author": "author name(s)",
  "publisher": "publisher name",
  "description": "2-3 sentence description",
  "genre": "primary genre",
  "pages": number of pages,
  "format": "Hardcover/Paperback/eBook/etc"
}

If you cannot find accurate information, use null for unknown fields. Do not fabricate data.`;
}

/**
 * Parse AI response (handle markdown code blocks)
 */
function parseAIResponse(content) {
  if (!content) throw new Error('Empty AI response');

  // Strip markdown code blocks if present
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```json\n?/i, '').replace(/\n?```$/,'');
  cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    
    // Validate required fields
    if (!parsed.title && !parsed.author) {
      throw new Error('AI response missing critical fields (title/author)');
    }

    return {
      title: parsed.title || null,
      author: parsed.author || null,
      publisher: parsed.publisher || null,
      description: parsed.description || null,
      genre: parsed.genre || null,
      pages: parsed.pages ? parseInt(parsed.pages, 10) : null,
      format: parsed.format || null,
    };
  } catch (error) {
    logger.error(`Failed to parse AI response: ${content}`);
    throw new Error(`AI response parsing failed: ${error.message}`);
  }
}

/**
 * Generate book cover image using AI (DALL-E, Stable Diffusion, etc.)
 */
async function generateCoverImage(bookData) {
  const { title, author, genre } = bookData;
  
  if (!process.env.OPENAI_API_KEY || process.env.DISABLE_AI_IMAGE_GEN === 'true') {
    return null;
  }

  try {
    const prompt = `Book cover design for "${title}" by ${author || 'unknown author'}${genre ? `, ${genre} genre` : ''}. Professional, clean, typography-focused.`;

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return response.data.data[0]?.url || null;
  } catch (error) {
    logger.warn(`AI image generation failed: ${error.message}`);
    return null;
  }
}

module.exports = {
  enrichWithAI,
  generateCoverImage,
  AI_PROVIDERS,
};
