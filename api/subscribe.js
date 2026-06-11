const { validateName, validatePhone, validateEmail, formatPhone } = require("../lib/validate");
const { getSupabaseAdmin } = require("../lib/supabase");

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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({
      error: "Supabase가 설정되지 않았습니다. Vercel에 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 추가해 주세요.",
      code: "MISSING_SUPABASE",
    });
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

  const row = {
    name: name.trim(),
    phone: formatPhone(phoneDigits),
    email: email.trim().toLowerCase(),
  };

  const { error } = await supabase.from("subscribers").insert(row);

  if (error) {
    console.error("Supabase insert error:", error);

    if (error.code === "23505") {
      return res.status(409).json({ error: "이미 가입된 이메일입니다." });
    }

    if (error.code === "42P01") {
      return res.status(503).json({
        error: "subscribers 테이블이 없습니다. Supabase SQL Editor에서 schema.sql을 실행해 주세요.",
        code: "TABLE_NOT_FOUND",
      });
    }

    return res.status(500).json({ error: "가입 정보 저장에 실패했습니다." });
  }

  return res.status(200).json({
    ok: true,
    message: "가입이 완료되었습니다. AI 로또 번호 추천 서비스를 이용해 주세요.",
  });
};
