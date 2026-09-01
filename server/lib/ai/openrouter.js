const config = require('./aiConfig');

/**
 * Generate completion using OpenRouter API fallback
 * @param {string} prompt 
 * @param {object} options 
 * @returns {Promise<string>}
 */
async function generateOpenRouter(prompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not defined.');
  }

  const model = options.model || config.OPENROUTER.MODEL;
  const endpoint = config.OPENROUTER.API_URL;

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: options.systemPrompt || 'Sen uzman bir YKS/LGS Matematik öğretmenisin ve SEO uzmanısın.' },
      { role: 'user', content: prompt }
    ],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 4096,
    ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || config.DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://fullematematigi.com.tr',
        'X-Title': 'Fullematematigi AI Blog System'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API HTTP Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Invalid or empty response from OpenRouter API.');
    }

    return content;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('OpenRouter API call timed out.');
    }
    throw err;
  }
}

module.exports = { generateOpenRouter };
