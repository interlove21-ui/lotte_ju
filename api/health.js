const { getGeminiApiKey, getEnvDiagnostics } = require("../lib/env");

module.exports = async function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");

  const apiKey = getGeminiApiKey();
  const envPresent = getEnvDiagnostics();

  return res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(apiKey),
    envPresent,
    hint: apiKey
      ? "API key detected."
      : "GEMINI_API_KEY를 Vercel Environment Variables에 추가하고 Production에 체크한 뒤 Redeploy 하세요.",
  });
};
