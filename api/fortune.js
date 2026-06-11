const { callGemini } = require("../lib/gemini");
const { getGeminiApiKey } = require("../lib/env");

const SYSTEM_PROMPT = `당신은 한국 로또 6/45 운세 해설 전문가입니다.
이미 추첨된 번호가 주어지면, 사용자 생년월일과 오늘 날짜를 바탕으로 운세와 각 번호의 의미를 설명합니다.

규칙:
- 번호는 이미 정해졌으므로 새 번호를 만들지 마세요
- todayFortune: 오늘의 운세 2~3문장, 따뜻하고 긍정적으로
- summary: 추첨 결과 한 줄 요약
- reasons: 주어진 6개 번호 각각에 대한 추천 이유 (number는 반드시 주어진 번호와 일치)
- bonusReason: 보너스 번호 추천 이유
- 반드시 유효한 JSON만 출력

JSON 스키마:
{
  "todayFortune": "string",
  "summary": "string",
  "reasons": [{"number": number, "reason": "string"}],
  "bonusReason": "string"
}`;

function normalizeFortune(raw, numbers, bonus) {
  const reasonMap = new Map();
  if (Array.isArray(raw.reasons)) {
    raw.reasons.forEach((r) => {
      if (r && r.number != null && r.reason) {
        reasonMap.set(Number(r.number), String(r.reason));
      }
    });
  }

  return {
    todayFortune: String(raw.todayFortune || "오늘은 새로운 가능성이 열리는 날입니다. 긍정적인 마음으로 하루를 시작해 보세요."),
    summary: String(raw.summary || "생년월일과 오늘의 기운이 담긴 추첨 결과입니다."),
    reasons: numbers.map((n) => ({
      number: n,
      reason: reasonMap.get(n) || "생년월일과 오늘의 운세에서 긍정적인 기운이 느껴지는 번호입니다.",
    })),
    bonusReason: String(raw.bonusReason || "보너스 번호에도 오늘의 행운이 담겨 있습니다."),
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!getGeminiApiKey()) {
    return res.status(503).json({
      error: "GEMINI_API_KEY가 설정되지 않았습니다.",
      code: "MISSING_API_KEY",
    });
  }

  const { birthday, luckyNumbers, numbers, bonus, today } = req.body || {};

  if (!birthday || !Array.isArray(numbers) || numbers.length !== 6 || !bonus) {
    return res.status(400).json({ error: "추첨 정보가 올바르지 않습니다." });
  }

  const sorted = [...numbers].map(Number).sort((a, b) => a - b);
  const bonusNum = Number(bonus);
  const luckyStr = Array.isArray(luckyNumbers) && luckyNumbers.length ? luckyNumbers.join(", ") : "없음";

  const userPrompt = [
    `오늘 날짜: ${today || new Date().toLocaleDateString("ko-KR")}`,
    `사용자 생년월일: ${birthday}`,
    `행운 번호: ${luckyStr}`,
    `추첨된 번호: ${sorted.join(", ")}`,
    `보너스 번호: ${bonusNum}`,
    "",
    "위 추첨 결과에 대해 JSON 형식으로 운세와 각 번호 설명을 작성하세요.",
  ].join("\n");

  let result = await callGemini(SYSTEM_PROMPT, userPrompt);

  if (!result.ok && result.code === "INVALID_JSON") {
    result = await callGemini(
      SYSTEM_PROMPT,
      `${userPrompt}\n\n반드시 유효한 JSON만 출력하세요.`
    );
  }

  if (!result.ok) {
    return res.status(502).json({
      error: result.error || "AI 응답을 가져오지 못했습니다.",
      code: result.code || "GEMINI_ERROR",
    });
  }

  return res.status(200).json(normalizeFortune(result.data, sorted, bonusNum));
};
