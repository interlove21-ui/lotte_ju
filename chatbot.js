const chatMessagesEl = document.getElementById("chatMessages");
const chatInputEl = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatRecommendBtn = document.getElementById("chatRecommendBtn");
const chatAlertEl = document.getElementById("chatAlert");

let isChatLoading = false;

function getBirthdayValue() {
  return document.getElementById("birthdayInput")?.value || "";
}

function parseBirthdayForChat(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  if (date > new Date()) return null;
  return date;
}

function getLuckyNumbers(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const nums = new Set();

  if (m >= 1 && m <= 45) nums.add(m);
  if (d >= 1 && d <= 45) nums.add(d);
  const dayMonth = m + d;
  if (dayMonth >= 1 && dayMonth <= 45) nums.add(dayMonth);
  nums.add(y % 45 || 45);
  const digitSum = String(y)
    .split("")
    .reduce((sum, ch) => sum + Number(ch), 0);
  if (digitSum >= 1 && digitSum <= 45) nums.add(digitSum);

  return [...nums];
}

function formatBirthdayLabel(value) {
  const [y, m, d] = value.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function showChatAlert(message) {
  chatAlertEl.textContent = message;
  chatAlertEl.hidden = false;
}

function hideChatAlert() {
  chatAlertEl.hidden = true;
  chatAlertEl.textContent = "";
}

async function checkApiHealth() {
  if (window.location.protocol === "file:") {
    showChatAlert("로컬 파일로 열면 챗봇이 동작하지 않습니다. Vercel 배포 URL(https://lotte-ju.vercel.app)에서 이용해 주세요.");
    return;
  }

  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (!data.geminiConfigured) {
      const envInfo = data.envPresent
        ? Object.entries(data.envPresent)
            .map(([k, v]) => `${k}: ${v ? "OK" : "없음"}`)
            .join(" · ")
        : "";
      showChatAlert(
        `Gemini API 키가 서버에 전달되지 않았습니다. Vercel에서 GEMINI_API_KEY를 Production에 등록한 뒤 Redeploy(재배포)하세요. ${envInfo ? `[${envInfo}]` : ""}`
      );
    }
  } catch {
    showChatAlert("API 서버에 연결할 수 없습니다. 배포가 완료됐는지 확인해 주세요.");
  }
}

function createMiniBall(num, isBonus = false) {
  const el = document.createElement("span");
  el.className = `mini-ball chat-mini-ball${isBonus ? " bonus-mini" : ""}`;
  el.textContent = num;
  return el;
}

function appendMessage(role, contentEl) {
  const wrap = document.createElement("div");
  wrap.className = `chat-message chat-message--${role}`;
  contentEl.classList.add("chat-bubble");
  wrap.appendChild(contentEl);
  chatMessagesEl.appendChild(wrap);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function appendTextMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = "body-md";
  bubble.textContent = text;
  appendMessage(role, bubble);
}

function renderRecommendation(data) {
  hideChatAlert();

  const bubble = document.createElement("div");
  bubble.className = "chat-recommendation";

  const fortune = document.createElement("div");
  fortune.className = "chat-fortune";
  fortune.innerHTML = `<span class="caption">TODAY'S FORTUNE</span><p class="body-md">${escapeHtml(data.todayFortune)}</p>`;
  bubble.appendChild(fortune);

  const numsRow = document.createElement("div");
  numsRow.className = "chat-numbers-row";
  data.numbers.forEach((n) => numsRow.appendChild(createMiniBall(n)));
  const plus = document.createElement("span");
  plus.className = "history-plus";
  plus.textContent = "+";
  numsRow.append(plus, createMiniBall(data.bonus, true));
  bubble.appendChild(numsRow);

  const summary = document.createElement("p");
  summary.className = "body-md chat-summary";
  summary.textContent = data.summary;
  bubble.appendChild(summary);

  const reasons = document.createElement("ul");
  reasons.className = "chat-reasons";
  data.reasons.forEach(({ number, reason }) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="caption">${number}</span><span class="body-sm">${escapeHtml(reason)}</span>`;
    reasons.appendChild(li);
  });
  bubble.appendChild(reasons);

  const bonusReason = document.createElement("p");
  bonusReason.className = "body-sm chat-bonus-reason";
  bonusReason.innerHTML = `<span class="caption">BONUS ${data.bonus}</span> ${escapeHtml(data.bonusReason)}`;
  bubble.appendChild(bonusReason);

  appendMessage("assistant", bubble);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showTyping() {
  const bubble = document.createElement("div");
  bubble.className = "chat-typing";
  bubble.id = "chatTyping";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  appendMessage("assistant", bubble);
}

function hideTyping() {
  document.getElementById("chatTyping")?.closest(".chat-message")?.remove();
}

function setChatLoading(loading) {
  isChatLoading = loading;
  chatSendBtn.disabled = loading;
  chatRecommendBtn.disabled = loading;
  chatInputEl.disabled = loading;
}

async function requestRecommendation(userMessage = "") {
  const birthdayValue = getBirthdayValue();
  const birthday = parseBirthdayForChat(birthdayValue);

  if (!birthday) {
    appendTextMessage("assistant", "번호 추천을 받으려면 먼저 생년월일을 입력해 주세요.");
    return;
  }

  const defaultMsg = "오늘 운세와 제 생년월일을 반영해서 로또 번호를 추천해 주세요.";
  const message = userMessage.trim() || defaultMsg;

  appendTextMessage("user", message);
  setChatLoading(true);
  showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthday: formatBirthdayLabel(birthdayValue),
        luckyNumbers: getLuckyNumbers(birthday),
        today: getTodayLabel(),
        userMessage: message,
      }),
    });

    hideTyping();

    let data;
    try {
      data = await res.json();
    } catch {
      appendTextMessage("assistant", "서버 응답을 읽을 수 없습니다.");
      return;
    }

    if (!res.ok) {
      if (data.code === "MISSING_API_KEY") {
        showChatAlert(data.error);
      }
      appendTextMessage("assistant", data.error || "추천을 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    renderRecommendation(data);
    if (typeof showSignupModal === "function") {
      setTimeout(showSignupModal, 600);
    }
  } catch {
    hideTyping();
    appendTextMessage(
      "assistant",
      "서버에 연결할 수 없습니다. Vercel 배포 URL에서 이용해 주세요."
    );
  } finally {
    setChatLoading(false);
  }
}

function sendChat() {
  if (isChatLoading) return;
  const text = chatInputEl.value.trim();
  if (!text) return;
  chatInputEl.value = "";
  requestRecommendation(text);
}

chatSendBtn.addEventListener("click", sendChat);
chatRecommendBtn.addEventListener("click", () => requestRecommendation());
chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

appendTextMessage(
  "assistant",
  "안녕하세요. 생년월일을 입력한 뒤 「번호 추천받기」를 누르면, 오늘의 운세와 생일을 반영한 로또 번호를 추천해 드립니다."
);

checkApiHealth();
