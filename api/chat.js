const MODEL = "gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `당신은 한국 로또 6/45 번호 추천 전문 챗봇입니다.
사용자의 생년월일, 오늘 날짜, 오늘의 운세를 반영하여 로또 번호를 추천합니다.

규칙:
- numbers: 1~45 사이 서로 다른 정수 6개 (응답 전 오름차순 정렬)
- bonus: numbers에 없는 1~45 사이 정수 1개
- reasons: numbers 6개 각각에 대한 추천 이유 (number, reason) 6개
- todayFortune: 오늘의 운세 2~3문장
- bonusReason: 보너스 번호 추천 이유
- summary: 한 줄 종합 메시지
- 반드시 유효한 JSON만 출력

JSON 스키마:
{
  "todayFortune": "string",
  "numbers": [number, number, number, number, number, number],
  "bonus": number,
  "reasons": [{"number": number, "reason": "string"}],
  "bonusReason": "string",
  "summary": "string"
}`;

function normalizeRecommendation(raw) {
  const data = { ...raw };
  data.numbers = [...data.numbers].map(Number).sort((a, b) => a - b);
  data.bonus = Number(data.bonus);

  const reasonMap = new Map();
  if (Array.isArray(data.reasons)) {
    data.reasons.forEach((r) => {
      if (r && r.number != null && r.reason) {
        reasonMap.set(Number(r.number), String(r.reason));
      }
    });
  }

  data.reasons = data.numbers.map((n) => ({
    number: n,
    reason: reasonMap.get(n) || "생년월일과 오늘의 운세를 반영해 선택한 번호입니다.",
  }));

  data.todayFortune = String(data.todayFortune || "오늘은 차분하게 한 걸음씩 나아가면 좋은 하루입니다.");
  data.bonusReason = String(data.bonusReason || "보너스 번호 역시 생일과 오늘 운세를 반영했습니다.");
  data.summary = String(data.summary || "오늘의 운세와 생년월일을 담은 추천 번호입니다.");

  return data;
}

function validateRecommendation(data) {
  if (!data || typeof data !== "object") return false;

  const nums = data.numbers;
  if (!Array.isArray(nums) || nums.length !== 6) return false;

  const set = new Set(nums);
  if (set.size !== 6) return false;

  for (const n of nums) {
    if (!Number.isInteger(n) || n < 1 || n > 45) return false;
  }

  const bonus = data.bonus;
  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || set.has(bonus)) return false;

  return (
    typeof data.todayFortune === "string" &&
    typeof data.bonusReason === "string" &&
    typeof data.summary === "string" &&
    Array.isArray(data.reasons) &&
    data.reasons.length === 6
  );
}

function parseJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

async function callGemini(apiKey, userPrompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  return response;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "GEMINI_API_KEY가 Vercel 환경변수에 설정되지 않았습니다. Vercel → Settings → Environment Variables에서 추가 후 재배포해 주세요.",
      code: "MISSING_API_KEY",
    });
  }

  const { birthday, luckyNumbers, today, userMessage } = req.body || {};

  if (!birthday) {
    return res.status(400).json({ error: "생년월일을 입력해 주세요." });
  }

  const todayStr =
    today ||
    new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

  const luckyStr =
    Array.isArray(luckyNumbers) && luckyNumbers.length
      ? luckyNumbers.join(", ")
      : "없음";

  const userPrompt = [
    `오늘 날짜: ${todayStr}`,
    `사용자 생년월일: ${birthday}`,
    `생년월일에서 추출한 행운 번호: ${luckyStr}`,
    userMessage ? `사용자 요청: ${userMessage}` : "사용자 요청: 오늘 운세와 생년월일을 반영한 로또 번호 6개와 보너스 1개를 추천해 주세요.",
    "",
    "위 정보를 바탕으로 JSON 형식으로만 응답하세요.",
  ].join("\n");

  try {
    let response = await callGemini(apiKey, userPrompt);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API error:", response.status, errBody);

      let detail = "AI 응답을 가져오지 못했습니다.";
      if (response.status === 400) detail = "API 요청 형식 오류입니다. 잠시 후 다시 시도해 주세요.";
      if (response.status === 403) detail = "API 키가 유효하지 않습니다. GEMINI_API_KEY를 확인해 주세요.";

      return res.status(502).json({ error: detail, code: "GEMINI_ERROR" });
    }

    const result = await response.json();
    let text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: "AI 응답이 비어 있습니다.", code: "EMPTY_RESPONSE" });
    }

    let data;
    try {
      data = normalizeRecommendation(parseJson(text));
    } catch {
      response = await callGemini(
        apiKey,
        `${userPrompt}\n\n이전 응답이 JSON 형식이 아니었습니다. 반드시 유효한 JSON만 출력하세요.`
      );
      if (!response.ok) {
        return res.status(502).json({ error: "AI 응답을 가져오지 못했습니다.", code: "GEMINI_RETRY_FAILED" });
      }
      const retryResult = await response.json();
      text = retryResult?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return res.status(502).json({ error: "AI 응답이 비어 있습니다.", code: "EMPTY_RESPONSE" });
      }
      data = normalizeRecommendation(parseJson(text));
    }

    if (!validateRecommendation(data)) {
      return res.status(502).json({ error: "AI 응답 형식이 올바르지 않습니다.", code: "INVALID_FORMAT" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Chat API error:", err);
    return res.status(500).json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" });
  }
};
