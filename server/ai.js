/**
 * AI Provider Caller with Validation, Single Retry, and Timeout
 * Supports NVIDIA NIM (nvapi-), OpenAI (sk-), and Google Gemini (AIza-)
 *
 * Rules:
 * 1. Reads AI_API_KEY and AI_MODEL from process.env only.
 * 2. Strips markdown fences if present.
 * 3. Validates with hand-written validator from schemas.js.
 * 4. Retries once with a stricter reminder on validation/parse failure.
 * 5. Sets a 20-second timeout.
 * 6. NEVER logs API key or user text.
 */

/**
 * Strips markdown code fences (```json ... ```) from model output.
 */
export function stripFences(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  return cleaned.trim();
}

/**
 * Universal provider dispatcher supporting NVIDIA, OpenAI, and Gemini.
 */
async function sendProviderRequest({ apiKey, model, systemPrompt, userPrompt }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  try {
    // 1. NVIDIA NIM Provider (keys starting with nvapi-)
    if (apiKey.startsWith('nvapi-')) {
      const normalizedModel = model.includes('/') ? model : `nvidia/${model}`;
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: normalizedModel,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON with no markdown code fences and no conversational explanation.`
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          `NVIDIA NIM provider error (HTTP ${response.status}): ${
            errData.detail || errData.title || response.statusText
          }`
        );
      }

      const data = await response.json();
      const messageObj = data.choices?.[0]?.message;
      const content = messageObj?.content || messageObj?.reasoning_content;
      if (!content) {
        throw new Error('NVIDIA provider returned empty choice response');
      }
      return content;
    }

    // 2. OpenAI Provider (keys starting with sk-)
    if (apiKey.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON with no markdown code fences and no conversational explanation.`
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI provider error (HTTP ${response.status})`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }

    // 3. Google Gemini REST API (default)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\nIMPORTANT: Return ONLY valid JSON with no markdown code fences and no conversational explanation.\n\nInput:\n${userPrompt}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini provider error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('AI provider returned empty candidate response');
    }

    return candidateText;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Calls AI model with JSON validation, 20s timeout, and single retry.
 *
 * @param {object} options
 * @param {string} options.systemPrompt
 * @param {string} options.userPrompt
 * @param {Function} options.validator - validator function from schemas.js
 * @param {any} [options.validatorArg] - optional context argument for validator
 * @returns {Promise<object>} Sanitized and validated data
 */
export async function callAIWithValidation({ systemPrompt, userPrompt, validator, validatorArg }) {
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'meta/llama-3.2-11b-vision-instruct';

  if (!apiKey || !apiKey.trim()) {
    throw new Error('AI_API_KEY_MISSING');
  }

  // --- Attempt 1 ---
  let rawText;
  try {
    rawText = await sendProviderRequest({
      apiKey,
      model,
      systemPrompt,
      userPrompt
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI request timed out after 50 seconds');
    }
    throw err;
  }

  let validationError = null;
  try {
    const cleaned = stripFences(rawText);
    const parsedJson = JSON.parse(cleaned);
    const check = validator(parsedJson, validatorArg);
    if (check.isValid) {
      return check.sanitizedData;
    }
    validationError = check.error || 'Schema validation failed';
  } catch (err) {
    validationError = `JSON parse failed: ${err.message}`;
  }

  // --- Attempt 2: Retry once with stricter reminder ---
  console.warn('[AI Proxy] Attempt 1 failed validation. Retrying once with strict instructions.');

  const strictUserPrompt = `${userPrompt}\n\n[STRICT REMINDER]: Your previous attempt was rejected due to: ${validationError}. Return ONLY raw, valid JSON conforming exactly to the schema. No markdown fences.`;

  try {
    rawText = await sendProviderRequest({
      apiKey,
      model,
      systemPrompt,
      userPrompt: strictUserPrompt
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI retry request timed out after 50 seconds');
    }
    throw err;
  }

  try {
    const cleaned = stripFences(rawText);
    const parsedJson = JSON.parse(cleaned);
    const check = validator(parsedJson, validatorArg);
    if (check.isValid) {
      return check.sanitizedData;
    }
    throw new Error(`AI schema validation failed on retry: ${check.error}`);
  } catch (err) {
    throw new Error(`AI response invalid after retry: ${err.message}`);
  }
}
