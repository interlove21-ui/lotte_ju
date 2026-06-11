const ENV_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
];

function getGeminiApiKey() {
  for (const name of ENV_KEYS) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function getEnvDiagnostics() {
  const present = {};
  for (const name of ENV_KEYS) {
    const value = process.env[name];
    present[name] = typeof value === "string" && value.trim().length > 0;
  }
  return present;
}

module.exports = { getGeminiApiKey, getEnvDiagnostics, ENV_KEYS };
