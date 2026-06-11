const PAGE_SIZE = 30;

const winnersMetaEl = document.getElementById("winnersMeta");
const winnersListEl = document.getElementById("winnersList");
const drawSearchEl = document.getElementById("drawSearch");
const numberFilterEl = document.getElementById("numberFilter");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let allWinners = [];
let filteredWinners = [];
let visibleCount = 0;

function formatDrawDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPrize(amount) {
  if (!amount) return "";
  const eok = Math.floor(amount / 100000000);
  const man = Math.floor((amount % 100000000) / 10000);
  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${man.toLocaleString()}만원`;
}

function createWinnerRow(entry) {
  const li = document.createElement("li");
  li.className = "winner-item";

  const draw = document.createElement("span");
  draw.className = "winner-draw";
  draw.textContent = `${entry.draw_no}`;

  const date = document.createElement("span");
  date.className = "winner-date";
  date.textContent = formatDrawDate(entry.date);
  date.title = entry.divisions?.[0]?.winners
    ? `1등 ${entry.divisions[0].winners}명 · ${formatPrize(entry.divisions[0].prize)}`
    : "";

  const nums = document.createElement("span");
  nums.className = "winner-numbers";
  entry.numbers.forEach((n) => nums.appendChild(createMiniBall(n)));

  const plus = document.createElement("span");
  plus.className = "history-plus";
  plus.textContent = "+";
  nums.append(plus, createMiniBall(entry.bonus_no, true));

  li.append(draw, date, nums);
  return li;
}

function applyFilters() {
  const drawQuery = parseInt(drawSearchEl.value, 10);
  const numberQuery = parseInt(numberFilterEl.value, 10);

  filteredWinners = allWinners.filter((entry) => {
    if (drawQuery && entry.draw_no !== drawQuery) return false;
    if (numberQuery >= 1 && numberQuery <= 45) {
      const allNums = [...entry.numbers, entry.bonus_no];
      if (!allNums.includes(numberQuery)) return false;
    }
    return true;
  });

  visibleCount = 0;
  winnersListEl.innerHTML = "";
  renderMore();
  updateMeta();
}

function renderMore() {
  const next = filteredWinners.slice(visibleCount, visibleCount + PAGE_SIZE);
  next.forEach((entry) => winnersListEl.appendChild(createWinnerRow(entry)));
  visibleCount += next.length;

  if (filteredWinners.length === 0) {
    winnersListEl.innerHTML = '<li class="winners-empty">NO RESULTS</li>';
    loadMoreBtn.hidden = true;
    return;
  }

  loadMoreBtn.hidden = visibleCount >= filteredWinners.length;
}

function updateMeta() {
  const latest = allWinners[0]?.draw_no ?? 0;
  const shown = Math.min(visibleCount, filteredWinners.length);
  winnersMetaEl.textContent = `1–${latest} · ${shown}/${filteredWinners.length}`;
}

function initWinners(data) {
  allWinners = [...data].sort((a, b) => b.draw_no - a.draw_no);
  filteredWinners = allWinners;
  visibleCount = 0;
  winnersListEl.innerHTML = "";
  renderMore();
  updateMeta();

  drawSearchEl.max = allWinners[0]?.draw_no ?? 9999;
}

async function loadWinners() {
  if (window.LOTTO_WINNERS?.length) {
    initWinners(window.LOTTO_WINNERS);
    return;
  }

  const sources = ["lotto-data.json", "https://smok95.github.io/lotto/results/all.json"];

  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        initWinners(data);
        return;
      }
    } catch {
      /* try next source */
    }
  }

  winnersMetaEl.textContent = "LOAD FAILED";
  winnersListEl.innerHTML =
    '<li class="winners-empty">Unable to load lotto-data.js</li>';
}

drawSearchEl.addEventListener("input", applyFilters);
numberFilterEl.addEventListener("input", applyFilters);
resetFiltersBtn.addEventListener("click", () => {
  drawSearchEl.value = "";
  numberFilterEl.value = "";
  applyFilters();
});
loadMoreBtn.addEventListener("click", () => {
  renderMore();
  updateMeta();
});

loadWinners();
