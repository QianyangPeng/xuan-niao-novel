/* ========== Xuan-Niao Novel Reader ========== */

const CHAPTERS = [
  { id: 1, num: '01', title: '王者归来', file: './chapters/01.md' },
  { id: 2, num: '02', title: '神秘ID', file: './chapters/02.md' },
  { id: 3, num: '03', title: '碾压式测试', file: './chapters/03.md' },
  { id: 4, num: '04', title: '硬核解析', file: './chapters/04.md' },
  { id: 5, num: '05', title: '玄鸟之主', file: './chapters/05.md' },
  { id: 6, num: '06', title: '涨停', file: './chapters/06.md' },
  { id: 7, num: '07', title: '旧秩序崩塌', file: './chapters/07.md' },
  { id: 8, num: '08', title: '新纪元', file: './chapters/08.md' }
];

const STORAGE_KEYS = {
  theme: 'xn_theme',
  fontScale: 'xn_font_scale',
  lastChapter: 'xn_last_chapter'
};

/* ---- Elements ---- */
const $ = (id) => document.getElementById(id);
const body = document.body;
const sidebar = $('sidebar');
const chapterList = $('chapterList');
const homeView = $('homeView');
const chapterView = $('chapterView');
const chapterBody = $('chapterBody');
const prevBtn = $('prevChapter');
const nextBtn = $('nextChapter');
const homeBtn = $('homeBtn');
const startBtn = $('startReading');
const progressFill = $('progressFill');
const sidebarToggle = $('sidebarToggle');
const themeToggle = $('themeToggle');
const fontInc = $('fontIncrease');
const fontDec = $('fontDecrease');
const fontReset = $('fontReset');

/* ---- State ---- */
let currentChapter = null; // null = home
const chapterCache = {};

/* ---- Theme ---- */
function applyTheme(theme) {
  body.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}
function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'dark';
  applyTheme(saved);
}
themeToggle.addEventListener('click', () => {
  const cur = body.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

/* ---- Font Scale ---- */
function applyFontScale(scale) {
  const clamped = Math.max(0.75, Math.min(1.5, scale));
  document.documentElement.style.setProperty('--font-scale', clamped);
  localStorage.setItem(STORAGE_KEYS.fontScale, clamped);
}
function initFontScale() {
  const saved = parseFloat(localStorage.getItem(STORAGE_KEYS.fontScale)) || 1;
  applyFontScale(saved);
}
fontInc.addEventListener('click', () => {
  const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'));
  applyFontScale(cur + 0.1);
});
fontDec.addEventListener('click', () => {
  const cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale'));
  applyFontScale(cur - 0.1);
});
fontReset.addEventListener('click', () => applyFontScale(1));

/* ---- Sidebar list ---- */
function buildChapterList() {
  chapterList.innerHTML = '';
  CHAPTERS.forEach((ch) => {
    const a = document.createElement('a');
    a.className = 'chapter-item';
    a.href = `#/chapter/${ch.id}`;
    a.dataset.id = ch.id;
    a.innerHTML = `<span class="chapter-num">${ch.num}</span><span class="chapter-title">${ch.title}</span>`;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadChapter(ch.id);
      closeSidebarMobile();
    });
    chapterList.appendChild(a);
  });
}

function highlightActiveChapter() {
  chapterList.querySelectorAll('.chapter-item').forEach((el) => {
    el.classList.toggle('active', parseInt(el.dataset.id, 10) === currentChapter);
  });
}

/* ---- Sidebar (mobile) ---- */
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
function closeSidebarMobile() {
  if (window.innerWidth <= 900) sidebar.classList.remove('open');
}
document.addEventListener('click', (e) => {
  if (window.innerWidth > 900) return;
  if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

/* ---- Markdown loading & rendering ---- */
async function fetchChapter(id) {
  if (chapterCache[id]) return chapterCache[id];
  const ch = CHAPTERS.find((c) => c.id === id);
  const res = await fetch(ch.file);
  if (!res.ok) throw new Error('加载失败');
  const md = await res.text();
  chapterCache[id] = md;
  return md;
}

async function loadChapter(id) {
  const ch = CHAPTERS.find((c) => c.id === id);
  if (!ch) return;

  chapterBody.innerHTML = '<p style="text-align:center; color:var(--text-faint)">正在加载...</p>';
  homeView.hidden = true;
  chapterView.hidden = false;

  try {
    const md = await fetchChapter(id);
    chapterBody.innerHTML = marked.parse(md);
  } catch (err) {
    chapterBody.innerHTML = `<p style="text-align:center; color:var(--text-faint)">加载失败：${err.message}</p>`;
  }

  currentChapter = id;
  localStorage.setItem(STORAGE_KEYS.lastChapter, id);
  location.hash = `#/chapter/${id}`;
  highlightActiveChapter();
  updateNavButtons();
  window.scrollTo({ top: 0, behavior: 'instant' });
  updateProgress();
}

function showHome() {
  homeView.hidden = false;
  chapterView.hidden = true;
  currentChapter = null;
  location.hash = '';
  highlightActiveChapter();
  window.scrollTo({ top: 0, behavior: 'instant' });
  updateProgress();
}

function updateNavButtons() {
  const idx = CHAPTERS.findIndex((c) => c.id === currentChapter);
  prevBtn.disabled = idx <= 0;
  nextBtn.disabled = idx >= CHAPTERS.length - 1;
}

prevBtn.addEventListener('click', () => {
  const idx = CHAPTERS.findIndex((c) => c.id === currentChapter);
  if (idx > 0) loadChapter(CHAPTERS[idx - 1].id);
});
nextBtn.addEventListener('click', () => {
  const idx = CHAPTERS.findIndex((c) => c.id === currentChapter);
  if (idx < CHAPTERS.length - 1) loadChapter(CHAPTERS[idx + 1].id);
});
homeBtn.addEventListener('click', showHome);
startBtn.addEventListener('click', () => loadChapter(1));

/* ---- Progress bar ---- */
function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressFill.style.width = Math.min(100, pct) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);

/* ---- Keyboard shortcuts ---- */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (currentChapter !== null) {
    if (e.key === 'ArrowLeft' && !prevBtn.disabled) {
      e.preventDefault();
      prevBtn.click();
    } else if (e.key === 'ArrowRight' && !nextBtn.disabled) {
      e.preventDefault();
      nextBtn.click();
    } else if (e.key === 'Escape') {
      showHome();
    }
  } else {
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      loadChapter(1);
    }
  }
});

/* ---- Hash routing ---- */
function handleHash() {
  const m = location.hash.match(/^#\/chapter\/(\d+)$/);
  if (m) {
    const id = parseInt(m[1], 10);
    if (CHAPTERS.some((c) => c.id === id) && id !== currentChapter) {
      loadChapter(id);
    }
  } else if (currentChapter !== null) {
    showHome();
  }
}
window.addEventListener('hashchange', handleHash);

/* ---- Init ---- */
(function init() {
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
  }

  initTheme();
  initFontScale();
  buildChapterList();

  // Route: hash > last read > home
  if (location.hash) {
    handleHash();
  } else {
    showHome();
  }

  updateProgress();
})();
