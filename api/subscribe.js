const { validateName, validatePhone, validateEmail, formatPhone } = require("../lib/validate");

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

  const { name, phone, email } = req.body || {};

  if (!validateName(name || "")) {
    return res.status(400).json({ error: "이름을 2자 이상 입력해 주세요." });
  }

  const phoneDigits = String(phone || "").replace(/\D/g, "");
  if (!validatePhone(phone || "")) {
    return res.status(400).json({ error: "올바른 휴대전화 번호를 입력해 주세요." });
  }

  if (!validateEmail(email || "")) {
    return res.status(400).json({ error: "올바른 이메일 주소를 입력해 주세요." });
  }

  const entry = {
    name: name.trim(),
    phone: formatPhone(phoneDigits),
    email: email.trim().toLowerCase(),
    subscribedAt: new Date().toISOString(),
  };

  const webhookUrl = process.env.SUBSCRIBE_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error("Webhook error:", err);
    }
  }

  console.log("[subscribe]", JSON.stringify(entry));

  return res.status(200).json({
    ok: true,
    message: "가입이 완료되었습니다. AI 로또 번호 추천 서비스를 이용해 주세요.",
  });
};
