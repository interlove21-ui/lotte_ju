function validateName(name) {
  return name.trim().length >= 2;
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatPhone(digits) {
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

module.exports = {
  validateName,
  validatePhone,
  validateEmail,
  formatPhone,
};
