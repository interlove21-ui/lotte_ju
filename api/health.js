const { getGeminiApiKey, getEnvDiagnostics } = require("../lib/env");

module.exports = async function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");

  const apiKey = getGeminiApiKey();
  const envPresent = getEnvDiagnostics();

  return res.status(200).json({
    ok: true,
    geminiConfigured: Boolean(apiKey),
    envPresent,
    deployment: {
      project: process.env.VERCEL_PROJECT_NAME || null,
      env: process.env.VERCEL_ENV || null,
      url: process.env.VERCEL_URL || null,
      repo: process.env.VERCEL_GIT_REPO_SLUG || null,
    },
    hint: apiKey
      ? "API key detected."
      : "환경변수 저장 후 Deployments → Redeploy(재배포)가 필요합니다. Production 체크도 확인하세요.",
  });
};
