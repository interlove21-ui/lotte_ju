const STORAGE_KEY = "lotto_subscribed";
const DISMISS_KEY = "lotto_signup_dismissed";

const modalEl = document.getElementById("signupModal");
const formEl = document.getElementById("signupForm");
const nameEl = document.getElementById("signupName");
const phoneEl = document.getElementById("signupPhone");
const emailEl = document.getElementById("signupEmail");
const errorEl = document.getElementById("signupError");
const submitBtnEl = document.getElementById("signupSubmitBtn");
const laterBtnEl = document.getElementById("signupCloseBtn");
const laterBtn2El = document.getElementById("signupLaterBtn");

function isSubscribed() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function isDismissed() {
  return sessionStorage.getItem(DISMISS_KEY) === "true";
}

function showSignupModal() {
  if (isSubscribed() || isDismissed()) return;

  modalEl.hidden = false;
  modalEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  nameEl.focus();
}

function hideSignupModal() {
  modalEl.hidden = true;
  modalEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  errorEl.hidden = true;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function dismissLater() {
  sessionStorage.setItem(DISMISS_KEY, "true");
  hideSignupModal();
}

phoneEl.addEventListener("input", () => {
  const digits = phoneEl.value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) {
    phoneEl.value = digits;
  } else if (digits.length <= 7) {
    phoneEl.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
  } else {
    phoneEl.value = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const email = emailEl.value.trim();

  if (name.length < 2) {
    showError("이름을 2자 이상 입력해 주세요.");
    return;
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) {
    showError("올바른 휴대전화 번호를 입력해 주세요.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("올바른 이메일 주소를 입력해 주세요.");
    return;
  }

  submitBtnEl.disabled = true;
  submitBtnEl.textContent = "처리 중...";

  try {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "가입 처리에 실패했습니다.");
      return;
    }

    localStorage.setItem(STORAGE_KEY, "true");
    hideSignupModal();

    if (typeof showToast === "function") {
      showToast("가입이 완료되었습니다");
    }
  } catch {
    showError("서버에 연결할 수 없습니다. Vercel 배포 환경에서 다시 시도해 주세요.");
  } finally {
    submitBtnEl.disabled = false;
    submitBtnEl.textContent = "가입하기";
  }
});

laterBtnEl.addEventListener("click", dismissLater);
laterBtn2El.addEventListener("click", dismissLater);

modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) dismissLater();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalEl.hidden) dismissLater();
});

window.showSignupModal = showSignupModal;
