const MODEL = "gemini-2.5-flash-lite";
const { getGeminiApiKey } = require("./env");

function parseJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { ok: false, code: "MISSING_API_KEY", error: "Gemini API 키가 설정되지 않았습니다." };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    console.error("Gemini API error:", response.status, errBody);

    let error = "AI 응답을 가져오지 못했습니다.";
    if (response.status === 403) error = "API 키가 유효하지 않습니다.";
    if (response.status === 429) error = "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";

    return { ok: false, code: "GEMINI_ERROR", error, status: response.status };
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    return { ok: false, code: "EMPTY_RESPONSE", error: "AI 응답이 비어 있습니다." };
  }

  try {
    return { ok: true, data: parseJson(text) };
  } catch {
    return { ok: false, code: "INVALID_JSON", error: "AI 응답 형식 오류" };
  }
}

module.exports = { MODEL, callGemini, parseJson };
