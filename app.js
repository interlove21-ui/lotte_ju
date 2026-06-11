const MIN = 1;
const MAX = 45;
const COUNT = 6;

const ballsEl = document.getElementById("balls");
const bonusBallEl = document.getElementById("bonusBall");
const drawBtn = document.getElementById("drawBtn");
const copyBtn = document.getElementById("copyBtn");
const setCountEl = document.getElementById("setCount");
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
const drawStageEl = document.querySelector(".draw-stage");
const birthdayInputEl = document.getElementById("birthdayInput");
const birthdayDisplayEl = document.getElementById("birthdayDisplay");

let currentNumbers = [];
let currentBonus = null;
let currentBirthday = null;
let isDrawing = false;
let sessionDrawCount = 0;

birthdayInputEl.max = new Date().toISOString().slice(0, 10);

function parseBirthday(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  if (date > new Date()) return null;
  return date;
}

function formatBirthday(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
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

  const yearMod = y % MAX || MAX;
  nums.add(yearMod);

  const digitSum = String(y)
    .split("")
    .reduce((sum, ch) => sum + Number(ch), 0);
  if (digitSum >= MIN && digitSum <= MAX) nums.add(digitSum);

  return [...nums];
}

function updateBirthdayState() {
  const date = parseBirthday(birthdayInputEl.value);
  currentBirthday = date;

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

  return {
    main: main.sort((a, b) => a - b),
    bonus,
  };
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
    slot.dataset.index = String(i);

    const ball = document.createElement("div");
    ball.className = "ball placeholder";
    ball.textContent = "—";
    slot.appendChild(ball);
    ballsEl.appendChild(slot);
  }

  bonusBallEl.className = "ball placeholder bonus-ball";
  bonusBallEl.textContent = "—";
  boardStepEl.textContent = "";
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
  setStatus(`${label} DRAWING`);

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
    const slot = ballsEl.children[i];
    await revealBall(slot, main[i], `${i + 1} BALL`);
  }

  await sleep(600);
  setStatus("BONUS DRAW");
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
  setStatus("COMPLETE");
  boardStepEl.textContent = "DONE";
}

async function draw() {
  if (isDrawing) return;

  const birthday = parseBirthday(birthdayInputEl.value);
  if (!birthday) {
    showToast("ENTER YOUR BIRTHDAY");
    return;
  }
  currentBirthday = birthday;

  isDrawing = true;
  drawBtn.disabled = true;
  copyBtn.disabled = true;
  birthdayInputEl.disabled = true;

  const sets = Math.min(10, Math.max(1, parseInt(setCountEl.value, 10) || 1));

  for (let s = 0; s < sets; s++) {
    sessionDrawCount += 1;
    drawRoundEl.textContent = `ROUND ${sessionDrawCount}`;

    if (s > 0) {
      resetBalls();
      setStatus("NEXT SET");
      await sleep(500);
    } else {
      resetBalls();
    }

    setStatus("DRUM ACTIVE");
    const { main, bonus } = generateDraw(birthday);
    currentNumbers = main;
    currentBonus = bonus;
    await animateDraw(main, bonus);
    addHistoryEntry(main, bonus);

    if (sets > 1 && s < sets - 1) {
      await sleep(800);
    }
  }

  copyBtn.disabled = false;
  drawBtn.disabled = false;
  birthdayInputEl.disabled = false;
  isDrawing = false;
}

async function copyNumbers() {
  if (!currentNumbers.length || currentBonus === null) return;

  const text = `${currentNumbers.join(", ")} + ${currentBonus}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast("COPIED TO CLIPBOARD");
  } catch {
    showToast("COPY FAILED");
  }
}

drawBtn.addEventListener("click", draw);
copyBtn.addEventListener("click", copyNumbers);
birthdayInputEl.addEventListener("change", updateBirthdayState);
birthdayInputEl.addEventListener("input", updateBirthdayState);
clearHistoryBtn.addEventListener("click", () => {
  historyList.innerHTML = "";
  historySection.hidden = true;
});

function getBallColorClass(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

initTumbler();
resetBalls();
updateBirthdayState();
