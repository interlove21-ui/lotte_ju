const MIN = 1;
const MAX = 45;
const COUNT = 6;

const ballsEl = document.getElementById("balls");
const bonusBallEl = document.getElementById("bonusBall");
const drawBtn = document.getElementById("drawBtn");
const copyBtn = document.getElementById("copyBtn");
const historySection = document.getElementById("historySection");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toastEl = document.getElementById("toast");
const drawStatusEl = document.getElementById("drawStatus");
const boardStepEl = document.getElementById("boardStep");
const drawRoundEl = document.getElementById("drawRound");
const lottoMachineEl = document.getElementById("lottoMachine");
const tumblerEl = document.getElementById("tumbler");
const chuteBallEl = document.getElementById("chuteBall");
const drawStageEl = document.querySelector(".main-draw");
const birthdayInputEl = document.getElementById("birthdayInput");
const birthdayDisplayEl = document.getElementById("birthdayDisplay");
const fortunePanelEl = document.getElementById("fortunePanel");
const fortuneTextEl = document.getElementById("fortuneText");
const fortuneSummaryEl = document.getElementById("fortuneSummary");
const fortuneReasonsEl = document.getElementById("fortuneReasons");
const fortuneBonusEl = document.getElementById("fortuneBonus");

let currentNumbers = [];
let currentBonus = null;
let isDrawing = false;
let sessionDrawCount = 0;

birthdayInputEl.max = new Date().toISOString().slice(0, 10);

function parseBirthday(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (date > new Date()) return null;
  return date;
}

function formatBirthday(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function formatBirthdayForApi(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function getBirthdayLuckyNumbers(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const nums = new Set();

  if (m >= MIN && m <= MAX) nums.add(m);
  if (d >= MIN && d <= MAX) nums.add(d);
  const dayMonth = m + d;
  if (dayMonth >= MIN && dayMonth <= MAX) nums.add(dayMonth);
  nums.add(y % MAX || MAX);
  const digitSum = String(y).split("").reduce((sum, ch) => sum + Number(ch), 0);
  if (digitSum >= MIN && digitSum <= MAX) nums.add(digitSum);

  return [...nums];
}

function updateBirthdayState() {
  const date = parseBirthday(birthdayInputEl.value);

  if (date) {
    birthdayDisplayEl.textContent = formatBirthday(date);
    birthdayDisplayEl.classList.add("is-set");
    if (!isDrawing) drawBtn.disabled = false;
  } else {
    birthdayDisplayEl.textContent = "NOT SET";
    birthdayDisplayEl.classList.remove("is-set");
    drawBtn.disabled = true;
  }
}

function generateDraw(birthday) {
  const pool = Array.from({ length: MAX }, (_, i) => i + MIN);
  const main = [];
  const lucky = getBirthdayLuckyNumbers(birthday).filter((n) => pool.includes(n));

  if (lucky.length > 0) {
    const pick = lucky[Math.floor(Math.random() * lucky.length)];
    main.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }

  for (let i = main.length; i < COUNT; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    main.push(pool.splice(idx, 1)[0]);
  }

  const bonusIdx = Math.floor(Math.random() * pool.length);
  const bonus = pool[bonusIdx];

  return { main: main.sort((a, b) => a - b), bonus };
}

function initTumbler() {
  tumblerEl.innerHTML = "";
  for (let i = 0; i < 18; i++) {
    const n = Math.floor(Math.random() * MAX) + MIN;
    const ball = document.createElement("span");
    ball.className = `tumbler-ball ${getBallColorClass(n)}`;
    ball.textContent = n;
    ball.style.setProperty("--i", String(i));
    ball.style.setProperty("--delay", `${(i * 0.17).toFixed(2)}s`);
    tumblerEl.appendChild(ball);
  }
}

function resetBalls() {
  ballsEl.innerHTML = "";
  for (let i = 0; i < COUNT; i++) {
    const slot = document.createElement("div");
    slot.className = "ball-slot";
    const ball = document.createElement("div");
    ball.className = "ball placeholder";
    ball.textContent = "—";
    slot.appendChild(ball);
    ballsEl.appendChild(slot);
  }

  bonusBallEl.className = "ball placeholder bonus-ball";
  bonusBallEl.textContent = "—";
  boardStepEl.textContent = "";
  fortunePanelEl.hidden = true;
}

function setStatus(text) {
  drawStatusEl.textContent = text.toUpperCase();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastEl.setAttribute("aria-hidden", "false");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toastEl.classList.remove("show");
    toastEl.setAttribute("aria-hidden", "true");
  }, 2200);
}

window.showToast = showToast;

function formatTime(date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function createMiniBall(num, isBonus = false) {
  const mini = document.createElement("span");
  mini.className = `mini-ball ${getBallColorClass(num)}${isBonus ? " bonus-mini" : ""}`;
  mini.textContent = num;
  return mini;
}

function addHistoryEntry(main, bonus) {
  historySection.hidden = false;
  const li = document.createElement("li");
  li.className = "history-item";

  const time = document.createElement("span");
  time.className = "history-time";
  time.textContent = formatTime(new Date());

  const nums = document.createElement("span");
  nums.className = "history-numbers";
  main.forEach((n) => nums.appendChild(createMiniBall(n)));
  const plus = document.createElement("span");
  plus.className = "history-plus";
  plus.textContent = "+";
  nums.append(plus, createMiniBall(bonus, true));

  li.append(time, nums);
  historyList.prepend(li);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rollNumber(ballEl, finalNum, ticks = 12) {
  for (let t = 0; t < ticks; t++) {
    ballEl.textContent = Math.floor(Math.random() * MAX) + MIN;
    await sleep(55 + t * 8);
  }
  ballEl.textContent = finalNum;
}

async function animateChute(num) {
  chuteBallEl.hidden = false;
  chuteBallEl.className = `chute-ball ${getBallColorClass(num)} rolling`;
  chuteBallEl.textContent = num;
  await sleep(520);
  chuteBallEl.hidden = true;
  chuteBallEl.classList.remove("rolling");
}

async function revealBall(slot, num, label) {
  const ball = slot.querySelector(".ball");
  boardStepEl.textContent = label.toUpperCase();
  setStatus(`${label} 추첨 중`);

  slot.classList.add("active");
  await animateChute(num);
  ball.classList.remove("placeholder");
  ball.classList.add("rolling");
  await rollNumber(ball, num);
  ball.classList.remove("rolling");
  ball.classList.add("revealed", getBallColorClass(num));
  slot.classList.add("filled");
  slot.classList.remove("active");

  drawStageEl.classList.add("flash");
  await sleep(80);
  drawStageEl.classList.remove("flash");
}

async function animateDraw(main, bonus) {
  lottoMachineEl.classList.add("spinning");
  drawStageEl.classList.add("drawing");
  initTumbler();

  for (let i = 0; i < COUNT; i++) {
    await sleep(i === 0 ? 500 : 350);
    await revealBall(ballsEl.children[i], main[i], `${i + 1}번`);
  }

  await sleep(600);
  setStatus("보너스 추첨");
  boardStepEl.textContent = "BONUS";

  const bonusSlot = bonusBallEl.closest(".ball-slot");
  bonusSlot?.classList.add("active");
  await animateChute(bonus);
  bonusBallEl.classList.remove("placeholder");
  bonusBallEl.classList.add("rolling");
  await rollNumber(bonusBallEl, bonus);
  bonusBallEl.classList.remove("rolling");
  bonusBallEl.classList.add("revealed", getBallColorClass(bonus));
  bonusSlot?.classList.add("filled");
  bonusSlot?.classList.remove("active");

  lottoMachineEl.classList.remove("spinning");
  drawStageEl.classList.remove("drawing");
  setStatus("추첨 완료");
  boardStepEl.textContent = "DONE";
}

function renderFortune(data) {
  fortunePanelEl.hidden = false;
  fortuneTextEl.textContent = data.todayFortune;
  fortuneSummaryEl.textContent = data.summary;

  fortuneReasonsEl.innerHTML = "";
  data.reasons.forEach(({ number, reason }) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="caption">${number}</span><span class="body-sm">${reason}</span>`;
    fortuneReasonsEl.appendChild(li);
  });

  fortuneBonusEl.innerHTML = `<span class="caption">BONUS ${currentBonus}</span> ${data.bonusReason}`;
}

function renderFortuneFallback() {
  fortunePanelEl.hidden = false;
  fortuneTextEl.textContent =
    "오늘은 차분한 마음으로 한 걸음씩 나아가면 좋은 하루입니다. 추첨된 번호에 긍정의 기운을 담아 보세요.";
  fortuneSummaryEl.textContent = "생년월일을 반영한 오늘의 추첨 결과입니다.";
  fortuneReasonsEl.innerHTML = "";
  currentNumbers.forEach((n) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="caption">${n}</span><span class="body-sm">행운의 기운이 느껴지는 번호입니다.</span>`;
    fortuneReasonsEl.appendChild(li);
  });
  fortuneBonusEl.innerHTML = `<span class="caption">BONUS ${currentBonus}</span> 보너스 번호에도 좋은 기운이 담겨 있습니다.`;
}

async function fetchFortune(birthday) {
  setStatus("운세 분석 중");
  fortunePanelEl.hidden = false;
  fortuneTextEl.textContent = "AI가 오늘의 운세를 분석하고 있습니다...";
  fortuneSummaryEl.textContent = "";
  fortuneReasonsEl.innerHTML = "";
  fortuneBonusEl.textContent = "";

  try {
    const res = await fetch("/api/fortune", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthday: formatBirthdayForApi(birthday),
        luckyNumbers: getBirthdayLuckyNumbers(birthday),
        numbers: currentNumbers,
        bonus: currentBonus,
        today: new Date().toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        }),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      renderFortuneFallback();
      return;
    }

    renderFortune(data);
  } catch {
    renderFortuneFallback();
  }
}

async function draw() {
  if (isDrawing) return;

  const birthday = parseBirthday(birthdayInputEl.value);
  if (!birthday) {
    showToast("생년월일을 입력해 주세요");
    return;
  }

  isDrawing = true;
  drawBtn.disabled = true;
  copyBtn.disabled = true;
  birthdayInputEl.disabled = true;

  sessionDrawCount += 1;
  drawRoundEl.textContent = `ROUND ${sessionDrawCount}`;
  resetBalls();

  setStatus("추첨기 가동");
  const { main, bonus } = generateDraw(birthday);
  currentNumbers = main;
  currentBonus = bonus;

  await animateDraw(main, bonus);
  addHistoryEntry(main, bonus);
  await fetchFortune(birthday);

  copyBtn.disabled = false;
  drawBtn.disabled = false;
  birthdayInputEl.disabled = false;
  isDrawing = false;

  if (typeof showSignupModal === "function") {
    setTimeout(showSignupModal, 800);
  }
}

async function copyNumbers() {
  if (!currentNumbers.length || currentBonus === null) return;
  const text = `${currentNumbers.join(", ")} + ${currentBonus}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("번호가 복사되었습니다");
  } catch {
    showToast("복사에 실패했습니다");
  }
}

function getBallColorClass(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

drawBtn.addEventListener("click", draw);
copyBtn.addEventListener("click", copyNumbers);
birthdayInputEl.addEventListener("change", updateBirthdayState);
birthdayInputEl.addEventListener("input", updateBirthdayState);
clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  historySection.hidden = true;
});

initTumbler();
resetBalls();
updateBirthdayState();
