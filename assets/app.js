/* =============================================================================
   轻启 · 新标签页 Demo 交互脚本（零依赖纯前端实现，兼容 http:// 与 file://）
   对应真实组件：
   - HomeView.vue（壁纸亮度采样 / 侧库推挤与拖拽调宽 / 全局快捷键）
   - AppHeader.vue（四模块侧库切换 / 独立天气与日历双入口 / 常驻未读待办徽标）
   - WelcomeHero.vue（主次分明秒级时钟 / 公历星期农历节气 / 可切换每日一言）
   - SearchBox.vue（本土化多引擎矢量图标 / ⌘K 聚焦 / 回车直达搜索）
   - QuickAccessSection.vue（默认 8×2 大圆角 App 图标宫格 + 4×4 精致卡片切换 / 滑动与圆点翻页 / 编辑态）
   - WeatherPopover.vue / CalendarPopover.vue / SettingsDrawer.vue
   ============================================================================= */

const pad = (n) => String(n).padStart(2, '0');

/* ---------------- 轻提示 Toast ---------------- */

const toastEl = document.getElementById('rdToast');
let toastTimer = null;
const showToast = (msg) => {
  if (!toastEl || !msg) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2100);
};

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-toast]');
  if (trigger) showToast(trigger.dataset.toast);
});

/* ---------------- 中国农历与二十四节气工具（纯原生 Intl 零依赖） ---------------- */

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAY_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 二十四节气近似定气表（适配 2020–2035 常见年份展示）
const SOLAR_TERMS_BASE = [
  ['小寒', 1, 5], ['大寒', 1, 20], ['立春', 2, 4], ['雨水', 2, 19],
  ['惊蛰', 3, 5], ['春分', 3, 20], ['清明', 4, 4], ['谷雨', 4, 20],
  ['立夏', 5, 5], ['小满', 5, 21], ['芒种', 6, 5], ['夏至', 6, 21],
  ['小暑', 7, 7], ['大暑', 7, 22], ['立秋', 8, 7], ['处暑', 8, 23],
  ['白露', 9, 7], ['秋分', 9, 23], ['寒露', 10, 8], ['霜降', 10, 23],
  ['立冬', 11, 7], ['小雪', 11, 22], ['大雪', 12, 7], ['冬至', 12, 22],
];

const chineseFmt = (() => {
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch {
    return null;
  }
})();

const getSolarTerm = (date) => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hit = SOLAR_TERMS_BASE.find(([, tm, td]) => tm === m && td === d);
  return hit ? hit[0] : '';
};

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIACS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const getLunarInfo = (date) => {
  const term = getSolarTerm(date);
  const y = date.getFullYear();
  const stemBranch = `${STEMS[(y - 4) % 10]}${BRANCHES[(y - 4) % 12]}${ZODIACS[(y - 4) % 12]}年`;
  if (!chineseFmt) {
    return { monthStr: '九月', dayStr: '十三', full: '农历九月十三', short: '九月十三', cell: term || '十三', isTerm: Boolean(term), ganzhi: stemBranch };
  }
  const parts = chineseFmt.formatToParts(date);
  const rawMonth = (parts.find((p) => p.type === 'month')?.value || '9').replace(/月$/u, '');
  const rawDay = parseInt(parts.find((p) => p.type === 'day')?.value || '13', 10);
  const isLeap = /闰/.test(rawMonth);
  const cleanMonth = rawMonth.replace(/闰/u, '');
  const mNum = parseInt(cleanMonth, 10);
  const monthCore = Number.isNaN(mNum) ? cleanMonth : (LUNAR_MONTHS[(mNum - 1) % 12] || cleanMonth);
  const monthLabel = `${isLeap ? '闰' : ''}${monthCore}月`;
  const dayLabel = LUNAR_DAYS[rawDay] || String(rawDay);
  const cell = term || (rawDay === 1 ? monthLabel : dayLabel);
  return {
    monthStr: monthLabel,
    dayStr: dayLabel,
    full: `农历${monthLabel}${dayLabel}${term ? ` · ${term}` : ''}`,
    short: `${monthLabel}${dayLabel}`,
    cell,
    isTerm: Boolean(term) || rawDay === 1,
    ganzhi: stemBranch,
  };
};

/* ---------------- 欢迎区时钟、日期与每日一言 ---------------- */

const clockEl = document.getElementById('clock');
const tickClock = () => {
  const now = new Date();
  clockEl.innerHTML = `<span class="clock-hm">${pad(now.getHours())}:${pad(now.getMinutes())}</span><span class="clock-sec">:${pad(now.getSeconds())}</span>`;
};
tickClock();
window.setInterval(tickClock, 1000);

const syncHeroDates = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const lunar = getLunarInfo(now);
  document.getElementById('headerDateDay').textContent = `${m}月${d}日`;
  document.getElementById('headerDateWeek').textContent = WEEKDAY_SHORT[now.getDay()];
  document.getElementById('headerDateLunar').textContent = lunar.short;
  document.getElementById('welcomeSubdate').textContent = `${m}月${d}日 ${WEEKDAY_LONG[now.getDay()]}  ·  ${lunar.full}`;
  document.getElementById('calendarTodayLabel').textContent = `今天 · ${m}月${d}日 ${lunar.short}`;
};
syncHeroDates();
if (/Mac|iPhone|iPad/i.test(navigator.platform || '')) {
  document.getElementById('keyHint').textContent = '⌘ K';
  document.getElementById('footerKeyLabel').textContent = '⌘ K';
}

const QUOTES = [
  '把每一个新标签页，过成舒服的起点。',
  '心有山海，静而不争；行有章法，事半功倍。',
  '万物皆有裂痕，那是光透进来的地方。',
  '慢品人间烟火色，闲观万事岁月长。',
  '今日事今日毕，留白处自有清风来。',
];
let quoteIndex = 0;
document.getElementById('quoteBtn').addEventListener('click', () => {
  quoteIndex = (quoteIndex + 1) % QUOTES.length;
  document.getElementById('quoteText').textContent = QUOTES[quoteIndex];
});

/* ---------------- 壁纸加载与明暗自动采样（同源 wallpaperBrightness 算法） ---------------- */

const WALLPAPER_DEFAULT = 'assets/wallpaper.webp';
const WALLPAPER_REMOTE_FALLBACK =
  'https://img.haowallpaper.com/pre_cache_file/2026_06_10_file/19132969098040192.png';
let currentPhotoRel = WALLPAPER_DEFAULT;

function setHint(text) {
  const hint = document.getElementById('wpHint');
  if (hint) hint.textContent = text;
}

const applyPhotoTone = (img) => {
  try {
    const canvas = document.createElement('canvas');
    const w = 32;
    const h = Math.max(8, Math.round((img.naturalHeight / img.naturalWidth) * w) || 18);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let sum = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avg = sum / n;
    const dark = avg < 140;
    document.body.classList.toggle('photo-tone-dark', dark);
    document.body.classList.toggle('photo-tone-light', !dark);
    setHint(`图片壁纸 · 亮度 ${avg.toFixed(0)} → ${dark ? '暗景浅字 + 通透蒙层' : '亮景深字 + 清透提亮'}`);
  } catch {
    document.body.classList.add('photo-tone-dark');
    document.body.classList.remove('photo-tone-light');
    setHint('图片壁纸 · 智能通透蒙层（图上浅字）');
  }
};

const loadWallpaper = (primaryUrl, fallbackUrl) => {
  const probe = new Image();
  probe.onload = () => {
    document.documentElement.style.setProperty('--wallpaper-url', `url("${primaryUrl}")`);
    applyPhotoTone(probe);
  };
  probe.onerror = () => {
    if (!fallbackUrl) return;
    const second = new Image();
    second.onload = () => {
      document.documentElement.style.setProperty('--wallpaper-url', `url("${fallbackUrl}")`);
      applyPhotoTone(second);
    };
    second.src = fallbackUrl;
  };
  probe.src = primaryUrl;
};

document.querySelectorAll('[data-wp]').forEach((el) => {
  el.style.backgroundImage = `url("${new URL(el.dataset.wp, document.baseURI).href}")`;
});

/* ---------------- 聚合搜索引擎（本土主流优先 + 矢量品牌图标） ---------------- */

const ENGINES = [
  {
    key: 'bing',
    label: '必应',
    color: 'linear-gradient(135deg, #2b7de9, #1557d0)',
    url: 'https://cn.bing.com/search?q=',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 3.5v13.2l4.6 3.8 8.4-4.7v-4.1l-6.1-2.2-1.8 3.7 3.7 1.4-4.2 2.3V5.1z"/></svg>',
  },
  {
    key: 'baidu',
    label: '百度',
    color: 'linear-gradient(135deg, #3a6ff8, #2350d8)',
    url: 'https://www.baidu.com/s?wd=',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="7.2" cy="8.5" r="2.1"/><circle cx="11.2" cy="6.2" r="2.1"/><circle cx="15.5" cy="7.2" r="2.1"/><circle cx="17.8" cy="11.2" r="2"/><path d="M12.2 11.2c-2.6 0-5.4 2.1-5.4 4.8 0 1.9 1.5 3.1 3.5 3.1 1.2 0 2-.4 2.8-.4.8 0 1.6.4 2.6.4 1.8 0 3.1-1.1 3.1-2.9 0-2.7-3.6-5-6.6-5z"/></svg>',
  },
  {
    key: 'google',
    label: 'Google',
    color: 'linear-gradient(135deg, #ea4335, #fbbc05 55%, #34a853)',
    url: 'https://www.google.com/search?q=',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.2 10.2v3.8h5.3c-.2 1.2-1.4 3.6-5.3 3.6-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .8 3.7 1.5l2.6-2.5C16.8 3.1 14.7 2 12.2 2 6.7 2 2.2 6.5 2.2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-2h-9.4z"/></svg>',
  },
  {
    key: 'bilibili',
    label: 'B站',
    color: 'linear-gradient(135deg, #ff7ea5, #fb5b89)',
    url: 'https://search.bilibili.com/all?keyword=',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="17" height="12.5" rx="3.5"/><path d="m8 3 3 3.5M16 3l-3 3.5M9 11.5v2M15 11.5v2"/></svg>',
  },
  {
    key: 'zhihu',
    label: '知乎',
    color: 'linear-gradient(135deg, #2986ff, #0f62e6)',
    url: 'https://www.zhihu.com/search?type=content&q=',
    svg: '<span style="font-size:12px;font-weight:800">知</span>',
  },
  {
    key: 'sogou',
    label: '搜狗',
    color: 'linear-gradient(135deg, #ff7a3e, #f0511d)',
    url: 'https://www.sogou.com/web?query=',
    svg: '<span style="font-size:12px;font-weight:800">搜</span>',
  },
  {
    key: 'so360',
    label: '360搜索',
    color: 'linear-gradient(135deg, #16c469, #099a4e)',
    url: 'https://www.so.com/s?q=',
    svg: '<span style="font-size:12px;font-weight:800">360</span>',
  },
  {
    key: 'duckduckgo',
    label: 'DuckGo',
    color: 'linear-gradient(135deg, #eb6a38, #d6471c)',
    url: 'https://duckduckgo.com/?q=',
    svg: '<span style="font-size:12px;font-weight:800">D</span>',
  },
];

let activeEngine = ENGINES[0];
const engineMenu = document.getElementById('engineMenu');
const engineLogo = document.getElementById('engineLogo');
const engineName = document.getElementById('engineName');
const searchInput = document.getElementById('searchInput');

const updateEngineButton = () => {
  engineLogo.style.background = activeEngine.color;
  engineLogo.innerHTML = activeEngine.svg;
  engineName.textContent = activeEngine.label;
};

const renderEngineMenu = () => {
  engineMenu.innerHTML = ENGINES.map(
    (e) => `<button type="button" class="engine-option${e.key === activeEngine.key ? ' selected' : ''}" data-key="${e.key}" role="menuitem">
        <span class="mini-logo" style="background:${e.color}">${e.svg}</span>
        <span>${e.label}</span>
      </button>`
  ).join('');
};

updateEngineButton();
renderEngineMenu();

document.getElementById('engineBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const willShow = !engineMenu.classList.contains('show');
  closeHeaderOverlays();
  if (willShow) engineMenu.classList.add('show');
});

engineMenu.addEventListener('click', (event) => {
  const btn = event.target.closest('.engine-option');
  if (!btn) return;
  activeEngine = ENGINES.find((e) => e.key === btn.dataset.key) || ENGINES[0];
  updateEngineButton();
  renderEngineMenu();
  engineMenu.classList.remove('show');
  searchInput.focus();
});

document.getElementById('searchForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const q = searchInput.value.trim();
  if (!q) {
    searchInput.focus();
    showToast(`当前使用「${activeEngine.label}」引擎，请输入搜索词`);
    return;
  }
  showToast(`正在通过 ${activeEngine.label} 搜索：${q}`);
});

/* ---------------- 快捷访问（17个高频站点精绘矢量图标 + 8×2 宫格 / 4×4 卡片双视图） ---------------- */

const BRAND_PRESETS = {
  哔哩哔哩: {
    bg: 'linear-gradient(145deg, #ff7ca3, #fb5686)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6.5" width="18" height="13" rx="4"/><path d="m8 2.8 3.2 3.7M16 2.8l-3.2 3.7M8.8 11.8v2.2M15.2 11.8v2.2"/></svg>',
  },
  知乎: {
    bg: 'linear-gradient(145deg, #2989ff, #0f62e8)',
    svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M5.2 6h6.6v1.9H9.3v2.6h2.9v1.9H9.1c-.3 1.9-1.1 3.7-2.6 5.2l-1.4-1.3c1.2-1.1 1.9-2.5 2.1-3.9H4.4V10.5h3V7.9H5.2l-.7 1.4-1.4-.9C4 6.9 4.7 5.3 5.1 4l1.7.5-.4 1.5zm8.2.5h6.2v12h-1.9v-1.2h-2.4v1.4h-1.9v-12.2zm1.9 1.9v6.9h2.4V8.4h-2.4z"/></svg>',
  },
  微博: {
    bg: 'linear-gradient(145deg, #ff6347, #e52d27)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"><ellipse cx="10.8" cy="14.5" rx="6.8" ry="4.5"/><circle cx="9.6" cy="14.6" r="1.6" fill="#fff"/><path d="M14.5 6.8a5.2 5.2 0 0 1 4.2 4.2M16.2 4.3a8.2 8.2 0 0 1 5 5"/></svg>',
  },
  GitHub: {
    bg: 'linear-gradient(145deg, #2b3137, #161b22)',
    svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2.2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2.2z"/></svg>',
  },
  'MDN Web Docs': {
    bg: 'linear-gradient(145deg, #1e293b, #0f172a)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 17 3.8-10M12.6 17l3.8-10M17.2 17h2.3"/></svg>',
  },
  'Vite 文档': {
    bg: 'linear-gradient(145deg, #8b5cf6, #4f46e5)',
    svg: '<svg viewBox="0 0 24 24" fill="#fde047"><path d="M13.5 2.5 5.5 13.2h5.6l-1.1 8.3 8.5-11.2h-5.7z"/></svg>',
  },
  'Vue.js': {
    bg: 'linear-gradient(145deg, #34d399, #059669)',
    svg: '<svg viewBox="0 0 24 24"><polygon points="3,5 12,20.5 21,5 17.4,5 12,14.2 6.6,5" fill="#fff"/><polygon points="7,5 12,13.6 17,5 14.1,5 12,8.6 9.9,5" fill="#064e3b" opacity="0.55"/></svg>',
  },
  掘金: {
    bg: 'linear-gradient(145deg, #388bff, #1664ff)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m12 4.5 2.6 2.1L12 8.7 9.4 6.6z" fill="#fff"/><path d="m6.5 10.6 5.5 4.4 5.5-4.4"/><path d="m4.5 14.6 7.5 5.8 7.5-5.8"/></svg>',
  },
  语雀: {
    bg: 'linear-gradient(145deg, #25d07d, #00a859)',
    svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M16.8 5.2c-2.6 0-4.8 1.5-5.9 3.8L5.2 18.8l6.2-1.9c3.9-.6 6.8-3.8 6.8-7.6 0-1.1-.4-2.1-1.4-2.9l2-.9-2-.3z"/></svg>',
  },
  Figma: {
    bg: 'linear-gradient(145deg, #333742, #1b1e26)',
    svg: '<svg viewBox="0 0 24 24"><path d="M8.5 3.5h3.5v5H8.5a2.5 2.5 0 1 1 0-5z" fill="#f24e1e"/><path d="M12 3.5h3.5a2.5 2.5 0 1 1 0 5H12v-5z" fill="#ff7262"/><path d="M12 8.5h3.5a2.5 2.5 0 1 1 0 5H12v-5z" fill="#1abcfe"/><path d="M8.5 8.5H12v5H8.5a2.5 2.5 0 1 1 0-5z" fill="#a259ff"/><path d="M8.5 13.5H12v2.5a2.5 2.5 0 1 1-3.5-2.5z" fill="#0acf83"/></svg>',
  },
  Dribbble: {
    bg: 'linear-gradient(145deg, #f472b6, #db2777)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.85"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 4.3c3.5 4.2 5.7 9 6.6 15.6M3.8 11c5.2 0 9.8-.9 14.3-4.2M5.8 17.8c3.6-3.5 8-4.8 14.5-3.8"/></svg>',
  },
  Behance: {
    bg: 'linear-gradient(145deg, #2d7dff, #0d55df)',
    svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M3.2 7h4.6c1.9 0 3.1.9 3.1 2.4 0 1-.5 1.8-1.4 2.1 1.2.3 1.9 1.2 1.9 2.5 0 1.9-1.4 3-3.6 3H3.2V7zm2.1 4h2.1c.8 0 1.3-.4 1.3-1.1 0-.7-.5-1.1-1.3-1.1H5.3V11zm0 4.2h2.3c.9 0 1.5-.4 1.5-1.2 0-.8-.6-1.2-1.5-1.2H5.3v2.4zm9-6.9h4.6v1.4h-4.6V8.3zm2.4 1.9c2.3 0 3.9 1.6 3.9 4v.6h-5.8c.2 1 .9 1.6 2 1.6.8 0 1.4-.3 1.8-.9l1.6.9c-.7 1.1-1.9 1.7-3.5 1.7-2.4 0-4.1-1.6-4.1-3.9 0-2.3 1.7-4 4.1-4zm-1.9 3.2h3.8c-.2-.9-.8-1.5-1.9-1.5-1 0-1.7.6-1.9 1.5z"/></svg>',
  },
  Steam: {
    bg: 'linear-gradient(145deg, #243b55, #141e30)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="15.2" cy="8.8" r="3"/><circle cx="8.5" cy="16.2" r="2.3"/><path d="M13.2 11 9.8 14.5M3.8 14.2l4.7 2"/></svg>',
  },
  网易云音乐: {
    bg: 'linear-gradient(145deg, #ff4b4b, #d8131b)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M14.2 6.2v6.6a2.8 2.8 0 1 1-1.9-2.65"/><circle cx="12" cy="12.5" r="7.5"/></svg>',
  },
  百度翻译: {
    bg: 'linear-gradient(145deg, #4b8bff, #2460e8)',
    svg: '<span style="font-size:18px;font-weight:700">译</span>',
  },
  高德地图: {
    bg: 'linear-gradient(145deg, #3da4ff, #1677ff)',
    svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M19.8 4.2 3.8 10.9l6.2 2.2 2.2 6.2z"/></svg>',
  },
  中国知网: {
    bg: 'linear-gradient(145deg, #1d70c9, #0c4a94)',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5z"/><path d="M8.5 8h7M8.5 12h5"/></svg>',
  },
};

const QUICK_ITEMS = [
  { webName: '哔哩哔哩', webUrl: 'https://www.bilibili.com' },
  { webName: '知乎', webUrl: 'https://www.zhihu.com' },
  { webName: '微博', webUrl: 'https://weibo.com' },
  { webName: 'GitHub', webUrl: 'https://github.com' },
  { webName: 'MDN Web Docs', webUrl: 'https://developer.mozilla.org/zh-CN/' },
  { webName: 'Vite 文档', webUrl: 'https://cn.vitejs.dev' },
  { webName: 'Vue.js', webUrl: 'https://vuejs.org', pendingSync: true },
  { webName: '掘金', webUrl: 'https://juejin.cn' },
  { webName: '语雀', webUrl: 'https://www.yuque.com' },
  { webName: 'Figma', webUrl: 'https://www.figma.com' },
  { webName: 'Dribbble', webUrl: 'https://dribbble.com' },
  { webName: 'Behance', webUrl: 'https://www.behance.net' },
  { webName: 'Steam', webUrl: 'https://store.steampowered.com' },
  { webName: '网易云音乐', webUrl: 'https://music.163.com' },
  { webName: '百度翻译', webUrl: 'https://fanyi.baidu.com' },
  { webName: '高德地图', webUrl: 'https://www.amap.com' },
  { webName: '中国知网', webUrl: 'https://www.cnki.net' },
];

const gradientOf = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(145deg, hsl(${hash} 72% 58%), hsl(${(hash + 38) % 360} 66% 45%))`;
};
const letterOf = (name) => (name || '·').trim().charAt(0).toUpperCase() || '·';
const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const PER_PAGE = () => (window.innerWidth <= 760 ? 8 : 16);

const quickSection = document.getElementById('quickSection');
const grid = document.getElementById('quickGrid');
const quickDots = document.getElementById('quickDots');
const pagerStatus = document.getElementById('pagerStatus');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const manageBtn = document.getElementById('manageBtn');

let page = 0;
let editing = false;
let layoutMode = 'icon'; // 'icon' (默认主流 8×2 宫格) | 'card' (精致 4×4 卡片)

const setLayoutMode = (mode) => {
  layoutMode = mode === 'card' ? 'card' : 'icon';
  quickSection.classList.toggle('mode-card', layoutMode === 'card');
  document.querySelectorAll('.view-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === layoutMode);
  });
  const select = document.getElementById('drawerLayoutSelect');
  if (select) select.value = layoutMode;
  const demoCardBtn = document.querySelector('[data-demo="card-mode"]');
  if (demoCardBtn) demoCardBtn.classList.toggle('active', layoutMode === 'card');
  moveGrid();
};

const cardsOf = () => {
  const list = QUICK_ITEMS.map((item, idx) => ({ type: 'item', item, idx }));
  if (!editing) list.push({ type: 'add' });
  return list;
};

const pageCount = () => Math.max(1, Math.ceil(cardsOf().length / PER_PAGE()));

const renderGrid = () => {
  const cards = cardsOf();
  const per = PER_PAGE();
  const pages = [];
  for (let i = 0; i < cards.length; i += per) pages.push(cards.slice(i, i + per));
  if (!pages.length) pages.push([]);

  grid.innerHTML = pages
    .map(
      (chunk) => `<div class="quick-page">${chunk
        .map((card) => {
          if (card.type === 'add') {
            return `<button class="shortcut add-card" type="button" data-action="add">
              <span class="shortcut-icon add">＋</span>
              <span class="shortcut-body">
                <span class="shortcut-label">添加网站</span>
                <span class="shortcut-domain">自定义网址</span>
              </span>
            </button>`;
          }
          const { item, idx } = card;
          const brand = BRAND_PRESETS[item.webName];
          const bg = brand ? brand.bg : gradientOf(item.webName);
          const glyph = brand ? brand.svg : `<span>${letterOf(item.webName)}</span>`;
          return `<a class="shortcut${editing ? ' editing' : ''}" href="${item.webUrl}" data-idx="${idx}" title="${item.webName} (${domainOf(item.webUrl)})">
            <button class="shortcut-delete" type="button" data-del="${idx}" aria-label="移除 ${item.webName}">
              <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 2.2l5.6 5.6M7.8 2.2l-5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
            </button>
            <span class="shortcut-icon" style="background:${bg}">
              ${glyph}
              ${item.pendingSync ? '<span class="shortcut-pending" title="待云端同步">↻</span>' : ''}
            </span>
            <span class="shortcut-body">
              <span class="shortcut-label">${item.webName}</span>
              <span class="shortcut-domain">${domainOf(item.webUrl)}</span>
            </span>
          </a>`;
        })
        .join('')}</div>`
    )
    .join('');

  grid.classList.toggle('editing', editing);
  manageBtn.classList.toggle('is-editing', editing);
  document.getElementById('quickNote').classList.toggle('show', editing);
  document.getElementById('manageBtnText').textContent = editing ? '完成' : '编辑';
  const demoEditBtn = document.querySelector('[data-demo="edit"]');
  if (demoEditBtn) demoEditBtn.classList.toggle('active', editing);

  const total = pageCount();
  page = Math.min(page, total - 1);
  quickDots.innerHTML = Array.from({ length: total }, (_, i) =>
    `<button type="button" class="quick-dot${i === page ? ' active' : ''}" data-page="${i}" aria-label="第 ${i + 1} 页"></button>`
  ).join('');
  quickDots.style.display = total > 1 ? 'flex' : 'none';

  moveGrid();
};

const moveGrid = () => {
  const step = grid.parentElement.clientWidth + 16;
  grid.style.transform = `translate3d(${-page * step}px, 0, 0)`;
  pagerStatus.textContent = `${page + 1} / ${pageCount()}`;
  prevBtn.disabled = page === 0;
  nextBtn.disabled = page >= pageCount() - 1;
  quickDots.querySelectorAll('.quick-dot').forEach((d, i) => {
    d.classList.toggle('active', i === page);
  });
};

grid.addEventListener('click', (event) => {
  const delBtn = event.target.closest('[data-del]');
  if (delBtn) {
    event.preventDefault();
    event.stopPropagation();
    const idx = Number(delBtn.dataset.del);
    const removed = QUICK_ITEMS.splice(idx, 1)[0];
    renderGrid();
    if (removed) showToast(`已移除「${removed.webName}」`);
    return;
  }
  const addBtn = event.target.closest('[data-action="add"]');
  if (addBtn) {
    QUICK_ITEMS.push({ webName: '小红书', webUrl: 'https://www.xiaohongshu.com' });
    page = pageCount() - 1;
    renderGrid();
    showToast('已添加示例网站「小红书」');
    return;
  }
  const link = event.target.closest('a.shortcut');
  if (link) {
    event.preventDefault();
    if (editing) {
      showToast('编辑模式下可点击右上角 × 移除图标');
    } else {
      const item = QUICK_ITEMS[Number(link.dataset.idx)];
      if (item) showToast(`访问 ${item.webName} · ${domainOf(item.webUrl)}`);
    }
  }
});

quickDots.addEventListener('click', (event) => {
  const dot = event.target.closest('.quick-dot');
  if (!dot) return;
  page = Number(dot.dataset.page);
  moveGrid();
});

document.querySelectorAll('.view-mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLayoutMode(btn.dataset.view));
});
document.getElementById('drawerLayoutSelect').addEventListener('change', (event) => {
  setLayoutMode(event.target.value);
});

prevBtn.addEventListener('click', () => {
  page = Math.max(0, page - 1);
  moveGrid();
});
nextBtn.addEventListener('click', () => {
  page = Math.min(pageCount() - 1, page + 1);
  moveGrid();
});
manageBtn.addEventListener('click', () => {
  editing = !editing;
  renderGrid();
  const demoEdit = document.querySelector('[data-demo="edit"]');
  if (demoEdit) demoEdit.classList.toggle('active', editing);
});

/* 指针滑动 + 鼠标滚轮顺滑翻页 */
const viewport = document.getElementById('quickViewport');
let pointerId = null;
let startX = 0;
let offset = 0;
viewport.addEventListener('pointerdown', (event) => {
  if (editing || pageCount() < 2 || event.button !== 0 || event.target.closest('button')) return;
  pointerId = event.pointerId;
  startX = event.clientX;
  offset = 0;
  grid.style.transition = 'none';
  viewport.classList.add('dragging');
});
viewport.addEventListener('pointermove', (event) => {
  if (event.pointerId !== pointerId) return;
  offset = event.clientX - startX;
  const atFirst = page === 0 && offset > 0;
  const atLast = page === pageCount() - 1 && offset < 0;
  if (atFirst || atLast) offset *= 0.28;
  const step = viewport.clientWidth + 16;
  grid.style.transform = `translate3d(${offset - page * step}px, 0, 0)`;
});
const endDrag = (event) => {
  if (event.pointerId !== pointerId) return;
  const threshold = viewport.clientWidth * 0.14;
  if (offset < -threshold && page < pageCount() - 1) page += 1;
  else if (offset > threshold && page > 0) page -= 1;
  pointerId = null;
  grid.style.transition = '';
  viewport.classList.remove('dragging');
  moveGrid();
};
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);

let wheelLock = false;
viewport.addEventListener(
  'wheel',
  (event) => {
    if (pageCount() < 2 || wheelLock) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 18) return;
    event.preventDefault();
    wheelLock = true;
    if (delta > 0 && page < pageCount() - 1) page += 1;
    else if (delta < 0 && page > 0) page -= 1;
    moveGrid();
    window.setTimeout(() => {
      wheelLock = false;
    }, 320);
  },
  { passive: false }
);

window.addEventListener('resize', renderGrid);
renderGrid();

/* ---------------- 天气浮层（多色矢量天气图标 + 城市切换实时联动页头） ---------------- */

const WEATHER_SVGS = {
  partly: `<svg viewBox="0 0 36 36" fill="none">
    <circle cx="14" cy="14" r="6.5" fill="#FBBF24"/>
    <path d="M14 3.5v2.4M14 22.1v2.4M3.5 14h2.4M6.6 6.6l1.7 1.7M21.4 6.6l-1.7 1.7" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
    <path d="M13 28.5h13.5a5 5 0 0 0 .6-9.96 6.8 6.8 0 0 0-13.1-1.6A4.7 4.7 0 0 0 13 28.5Z" fill="#E0EEFF" stroke="#93C5FD" stroke-width="1.3"/>
  </svg>`,
  sunny: `<svg viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="7.5" fill="#FBBF24"/>
    <path d="M18 4.5v3M18 28.5v3M4.5 18h3M28.5 18h3M8.5 8.5l2.1 2.1M25.4 25.4l2.1 2.1M27.5 8.5l-2.1 2.1M10.6 25.4l-2.1 2.1" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,
  rain: `<svg viewBox="0 0 36 36" fill="none">
    <path d="M10.5 23h15a5.2 5.2 0 0 0 .5-10.38 7 7 0 0 0-13.6-1.52A4.8 4.8 0 0 0 10.5 23Z" fill="#DBEAFE" stroke="#60A5FA" stroke-width="1.4"/>
    <path d="m13 26.5-1.4 3.5M18.5 26.5l-1.4 3.5M24 26.5l-1.4 3.5" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/>
  </svg>`,
};

const CITY_WEATHER = {
  合肥: { temp: 18, cond: '多云', feel: 17, hum: '63%', wind: '东北风 3 级', icon: 'partly', fc: [['partly', '今天', '21° / 14°'], ['rain', '明天', '19° / 13°'], ['partly', '周六', '22° / 15°'], ['sunny', '周日', '25° / 16°']] },
  北京: { temp: 16, cond: '晴朗', feel: 15, hum: '41%', wind: '西北风 2 级', icon: 'sunny', fc: [['sunny', '今天', '18° / 7°'], ['sunny', '明天', '19° / 8°'], ['partly', '周六', '17° / 6°'], ['sunny', '周日', '20° / 8°']] },
  上海: { temp: 21, cond: '多云', feel: 20, hum: '68%', wind: '东风 3 级', icon: 'partly', fc: [['partly', '今天', '23° / 16°'], ['rain', '明天', '20° / 15°'], ['partly', '周六', '22° / 16°'], ['sunny', '周日', '24° / 17°']] },
  深圳: { temp: 26, cond: '晴间多云', feel: 27, hum: '72%', wind: '南风 2 级', icon: 'sunny', fc: [['sunny', '今天', '28° / 22°'], ['partly', '明天', '27° / 21°'], ['sunny', '周六', '29° / 22°'], ['sunny', '周日', '29° / 23°']] },
  杭州: { temp: 19, cond: '小雨转晴', feel: 18, hum: '74%', wind: '东北风 2 级', icon: 'rain', fc: [['rain', '今天', '20° / 14°'], ['partly', '明天', '22° / 14°'], ['sunny', '周六', '24° / 15°'], ['sunny', '周日', '25° / 16°']] },
  成都: { temp: 17, cond: '多云', feel: 17, hum: '76%', wind: '微风 1 级', icon: 'partly', fc: [['partly', '今天', '19° / 13°'], ['partly', '明天', '20° / 14°'], ['rain', '周六', '18° / 13°'], ['partly', '周日', '21° / 14°']] },
  南京: { temp: 19, cond: '晴朗', feel: 18, hum: '58%', wind: '东风 2 级', icon: 'sunny', fc: [['sunny', '今天', '21° / 13°'], ['partly', '明天', '20° / 13°'], ['sunny', '周六', '23° / 14°'], ['sunny', '周日', '24° / 15°']] },
  武汉: { temp: 20, cond: '多云', feel: 19, hum: '61%', wind: '北风 2 级', icon: 'partly', fc: [['partly', '今天', '22° / 14°'], ['sunny', '明天', '23° / 15°'], ['sunny', '周六', '24° / 15°'], ['partly', '周日', '22° / 14°']] },
};

let savedCities = ['合肥', '北京', '上海', '深圳', '杭州'];
let activeCity = '合肥';
const RECOMMEND_CITIES = ['合肥', '北京', '成都', '南京', '武汉', '广州'];

const renderWeather = () => {
  const data = CITY_WEATHER[activeCity] || CITY_WEATHER['合肥'];
  document.getElementById('headerCityName').textContent = activeCity;
  document.getElementById('headerCond').textContent = data.cond;
  document.getElementById('headerTemp').textContent = `${data.temp}°`;

  document.getElementById('weatherCityTitle').textContent = activeCity;
  document.getElementById('weatherNowIcon').innerHTML = WEATHER_SVGS[data.icon];
  document.getElementById('weatherNowTemp').textContent = `${data.temp}°`;
  document.getElementById('weatherNowDesc').textContent = `${data.cond} · 体感 ${data.feel}°`;
  document.getElementById('weatherHumidity').textContent = data.hum;
  document.getElementById('weatherWind').textContent = data.wind;

  document.getElementById('weatherForecastList').innerHTML = data.fc
    .map(
      ([ic, day, range]) => `<article class="forecast-day">
        <div class="fc-icon">${WEATHER_SVGS[ic]}</div>
        <span>${day}</span>
        <small>${range}</small>
      </article>`
    )
    .join('');

  document.getElementById('cityCountLabel').textContent = `(${savedCities.length}/8)`;
  document.getElementById('cityOptions').innerHTML = savedCities
    .map(
      (c) => `<div class="city-chip${c === activeCity ? ' active' : ''}" role="button" tabindex="0" data-city="${c}">
        <span>${c}</span>
        ${savedCities.length > 1 ? `<button class="city-chip-remove" type="button" data-remove-city="${c}" aria-label="移除 ${c}">×</button>` : ''}
      </div>`
    )
    .join('');

  const q = (document.getElementById('citySearchInput').value || '').trim();
  const pool = q ? Object.keys(CITY_WEATHER).filter((c) => c.includes(q)) : RECOMMEND_CITIES;
  document.getElementById('cityRecommendList').innerHTML = pool
    .map((c) => {
      const exists = savedCities.includes(c);
      return `<button type="button" data-add-city="${c}" ${exists ? 'disabled' : ''}>${exists ? `✓ ${c}` : `＋ ${c}`}</button>`;
    })
    .join('');
};

document.getElementById('cityOptions').addEventListener('click', (event) => {
  const rm = event.target.closest('[data-remove-city]');
  if (rm) {
    event.stopPropagation();
    const target = rm.dataset.removeCity;
    savedCities = savedCities.filter((c) => c !== target);
    if (activeCity === target) activeCity = savedCities[0] || '合肥';
    renderWeather();
    return;
  }
  const chip = event.target.closest('[data-city]');
  if (chip) {
    activeCity = chip.dataset.city;
    renderWeather();
  }
});

document.getElementById('cityRecommendList').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-add-city]');
  if (!btn || btn.disabled) return;
  const c = btn.dataset.addCity;
  if (savedCities.length < 8 && !savedCities.includes(c)) savedCities.push(c);
  activeCity = c;
  renderWeather();
});
document.getElementById('citySearchInput').addEventListener('input', renderWeather);
renderWeather();

/* ---------------- 日历与待办浮层（农历标注 + 未读待办徽标实时联动） ---------------- */

const today = new Date();
const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
let cursorYear = today.getFullYear();
let cursorMonth = today.getMonth();
let selectedKey = todayKey;

const TASKS = {
  [todayKey]: [
    { time: '09:30', title: '晨会：新标签页视觉改版对齐', category: '工作 · 产品研发组', type: 'work', done: true },
    { time: '14:00', title: '客户 UI 演示稿终审汇报', category: '会议 · 腾讯会议 882-910', type: 'meeting', done: false },
    { time: '20:30', title: '夜跑 5 公里与阅读半小时', category: '个人生活', type: 'personal', done: false },
  ],
};

const syncTaskBadge = () => {
  const list = TASKS[todayKey] || [];
  const unread = list.filter((t) => !t.done).length;
  const badge = document.getElementById('headerTaskBadge');
  badge.textContent = unread > 99 ? '99+' : String(unread);
  badge.title = `今日 ${unread} 项未完成任务`;
  badge.style.display = unread > 0 ? 'inline-grid' : 'none';
};

const daysWrap = document.getElementById('calendarDays');
const monthTitle = document.getElementById('monthTitle');
const monthLunarSub = document.getElementById('monthLunarSub');
const agendaList = document.getElementById('agendaList');

const renderCalendar = () => {
  monthTitle.textContent = `${cursorYear} 年 ${cursorMonth + 1} 月`;
  const midLunar = getLunarInfo(new Date(cursorYear, cursorMonth, 15));
  monthLunarSub.textContent = `${midLunar.ganzhi} · 农历${midLunar.monthStr}`;

  const firstWeekday = new Date(cursorYear, cursorMonth, 1).getDay();
  const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
  const daysInPrev = new Date(cursorYear, cursorMonth, 0).getDate();
  const slots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = [];

  for (let i = 0; i < slots; i += 1) {
    if (i < firstWeekday) {
      const d = daysInPrev - firstWeekday + 1 + i;
      const dt = new Date(cursorYear, cursorMonth - 1, d);
      cells.push({ day: d, muted: true, lunar: getLunarInfo(dt) });
    } else if (i >= firstWeekday + daysInMonth) {
      const d = i - firstWeekday - daysInMonth + 1;
      const dt = new Date(cursorYear, cursorMonth + 1, d);
      cells.push({ day: d, muted: true, lunar: getLunarInfo(dt) });
    } else {
      const day = i - firstWeekday + 1;
      const dt = new Date(cursorYear, cursorMonth, day);
      const key = `${cursorYear}-${pad(cursorMonth + 1)}-${pad(day)}`;
      cells.push({
        day,
        key,
        lunar: getLunarInfo(dt),
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        hasTask: Boolean((TASKS[key] || []).length),
      });
    }
  }

  daysWrap.innerHTML = cells
    .map((c) => {
      const lunarCls = c.lunar.isTerm ? 'cal-lunar is-term' : 'cal-lunar';
      if (c.muted) {
        return `<button type="button" class="muted" tabindex="-1"><span class="cal-num">${c.day}</span><span class="cal-lunar">${c.lunar.cell}</span></button>`;
      }
      const cls = [c.isToday ? 'today' : '', c.isSelected ? 'selected' : '', c.hasTask ? 'has-task' : '']
        .filter(Boolean)
        .join(' ');
      return `<button type="button" class="${cls}" data-key="${c.key}" aria-pressed="${c.isSelected}">
        <span class="cal-num">${c.day}</span>
        <span class="${lunarCls}">${c.lunar.cell}</span>
      </button>`;
    })
    .join('');

  renderAgenda();
  syncTaskBadge();
};

const renderAgenda = () => {
  const [y, m, d] = selectedKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const lunar = getLunarInfo(date);
  document.getElementById('agendaDate').textContent = `${m} 月 ${d} 日`;
  document.getElementById('agendaWeek').textContent = `${WEEKDAY_SHORT[date.getDay()]} · ${lunar.short}`;
  const tasks = TASKS[selectedKey] || [];
  if (!tasks.length) {
    agendaList.innerHTML = '<div class="agenda-empty">当天暂无待办安排<br />点击右上角「＋ 新建待办」记录重要事项</div>';
    return;
  }
  agendaList.innerHTML = tasks
    .map(
      (t, i) => `<article class="agenda-task ${t.type}${t.done ? ' done' : ''}">
          <div class="agenda-task-time">
            <button class="agenda-task-done${t.done ? ' done' : ''}" type="button" aria-pressed="${t.done}" data-i="${i}" title="切换完成状态">✓</button>
            <time>${t.time}</time>
          </div>
          <div class="agenda-task-body"><b>${t.title}</b><span>${t.category}</span></div>
          <button class="agenda-task-edit" type="button" data-rm-task="${i}" title="删除该事项">×</button>
        </article>`
    )
    .join('');
};

daysWrap.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-key]');
  if (!btn) return;
  selectedKey = btn.dataset.key;
  renderCalendar();
});

agendaList.addEventListener('click', (event) => {
  const doneBtn = event.target.closest('.agenda-task-done');
  if (doneBtn) {
    const tasks = TASKS[selectedKey] || [];
    const idx = Number(doneBtn.dataset.i);
    if (tasks[idx]) tasks[idx].done = !tasks[idx].done;
    renderAgenda();
    syncTaskBadge();
    return;
  }
  const rmBtn = event.target.closest('[data-rm-task]');
  if (rmBtn) {
    const tasks = TASKS[selectedKey] || [];
    tasks.splice(Number(rmBtn.dataset.rmTask), 1);
    renderCalendar();
  }
});

document.getElementById('prevMonth').addEventListener('click', () => {
  cursorMonth -= 1;
  if (cursorMonth < 0) {
    cursorMonth = 11;
    cursorYear -= 1;
  }
  renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
  cursorMonth += 1;
  if (cursorMonth > 11) {
    cursorMonth = 0;
    cursorYear += 1;
  }
  renderCalendar();
});
document.getElementById('backToday').addEventListener('click', () => {
  cursorYear = today.getFullYear();
  cursorMonth = today.getMonth();
  selectedKey = todayKey;
  renderCalendar();
});
document.getElementById('agendaAdd').addEventListener('click', () => {
  document.getElementById('agendaEditor').classList.toggle('show');
  document.getElementById('taskTitleInput').focus();
});
document.getElementById('agendaCancel').addEventListener('click', () => {
  document.getElementById('agendaEditor').classList.remove('show');
});
document.getElementById('agendaEditor').addEventListener('submit', (event) => {
  event.preventDefault();
  const titleInput = document.getElementById('taskTitleInput');
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  const type = document.getElementById('taskTypeSelect').value;
  const typeLabel = { work: '工作事项', meeting: '日程会议', personal: '个人生活' }[type] || '待办';
  const time = document.getElementById('taskTimeInput').value || '10:00';
  if (!TASKS[selectedKey]) TASKS[selectedKey] = [];
  TASKS[selectedKey].push({ time, title, category: typeLabel, type, done: false });
  TASKS[selectedKey].sort((a, b) => a.time.localeCompare(b.time));
  titleInput.value = '';
  document.getElementById('agendaEditor').classList.remove('show');
  renderCalendar();
  showToast('已添加待办事项');
});
renderCalendar();

/* ---------------- 页头浮层与菜单互斥开关 ---------------- */

const weatherPopover = document.getElementById('weatherPopover');
const calendarPopover = document.getElementById('calendarPopover');
const accountPop = document.getElementById('accountPop');
const moreMenu = document.getElementById('moreMenu');

const closeHeaderOverlays = () => {
  weatherPopover.classList.remove('show');
  calendarPopover.classList.remove('show');
  accountPop.classList.remove('show');
  moreMenu.classList.remove('show');
  engineMenu.classList.remove('show');
  document.getElementById('weatherBtn').setAttribute('aria-expanded', 'false');
  document.getElementById('calendarBtn').setAttribute('aria-expanded', 'false');
};

document.getElementById('weatherBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = weatherPopover.classList.contains('show');
  closeHeaderOverlays();
  if (!open) {
    weatherPopover.classList.add('show');
    event.currentTarget.setAttribute('aria-expanded', 'true');
  }
});
document.getElementById('calendarBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = calendarPopover.classList.contains('show');
  closeHeaderOverlays();
  if (!open) {
    calendarPopover.classList.add('show');
    event.currentTarget.setAttribute('aria-expanded', 'true');
  }
});
document.getElementById('accountBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = accountPop.classList.contains('show');
  closeHeaderOverlays();
  if (!open) accountPop.classList.add('show');
});
document.getElementById('moreBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = moreMenu.classList.contains('show');
  closeHeaderOverlays();
  if (!open) moreMenu.classList.add('show');
});
document.getElementById('calendarClose').addEventListener('click', closeHeaderOverlays);

const toggleCityAddPanel = () => {
  const list = document.getElementById('cityAddList');
  list.classList.toggle('show');
  document.getElementById('cityAddToggle').textContent = list.classList.contains('show') ? '收起搜索' : '＋ 添加城市';
};
document.getElementById('cityAddToggle').addEventListener('click', toggleCityAddPanel);
document.getElementById('cityQuickAddLink').addEventListener('click', toggleCityAddPanel);

/* ---------------- 侧边库（四模块切换 + 书签目录折叠 + 拖拽调宽） ---------------- */

const sideLibrary = document.getElementById('sideLibrary');
const homeShell = document.getElementById('homeShell');
const libraryTitle = document.getElementById('libraryTitle');
const libraryMark = document.getElementById('libraryMark');

const PANE_META = {
  bookmarks: {
    title: '收藏夹',
    icon: '<path d="m12 3.4 2.65 5.38 5.94.86-4.3 4.19 1.02 5.91L12 16.95l-5.31 2.79 1.02-5.91-4.3-4.19 5.94-.86z"/>',
  },
  history: {
    title: '历史记录',
    icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v4.8l3.2 1.9"/>',
  },
  toolbox: {
    title: '效率工具箱',
    icon: '<rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2"/><rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2"/>',
  },
  readlater: {
    title: '稍后阅读',
    icon: '<path d="M6.5 3.5h11a1.8 1.8 0 0 1 1.8 1.8v15.2L12 16.8l-7.3 3.7V5.3a1.8 1.8 0 0 1 1.8-1.8Z"/>',
  },
};

const openPane = (pane) => {
  const isOpen = sideLibrary.classList.contains('open') && libraryMark.dataset.pane === pane;
  if (isOpen) {
    closeLibrary();
    return;
  }
  libraryMark.dataset.pane = pane;
  libraryTitle.textContent = PANE_META[pane].title;
  libraryMark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PANE_META[pane].icon}</svg>`;
  document.querySelectorAll('.library-pane-slot').forEach((slot) => {
    slot.classList.toggle('show', slot.dataset.pane === pane);
  });
  sideLibrary.classList.add('open');
  homeShell.classList.add('shifted');
  document.querySelectorAll('.header-tab[data-pane]').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.pane === pane);
  });
  closeDrawer();
  closeHeaderOverlays();
};

const closeLibrary = () => {
  sideLibrary.classList.remove('open');
  homeShell.classList.remove('shifted');
  document.querySelectorAll('.header-tab[data-pane]').forEach((tab) => tab.classList.remove('active'));
};

document.querySelectorAll('.header-tab[data-pane]').forEach((tab) => {
  tab.addEventListener('click', () => openPane(tab.dataset.pane));
});
document.getElementById('libraryClose').addEventListener('click', closeLibrary);

// 收藏夹目录折叠展开
document.getElementById('bookmarkTree').addEventListener('click', (event) => {
  const folderRow = event.target.closest('.tree-row.folder');
  if (!folderRow) return;
  const group = folderRow.closest('.tree-folder-group');
  if (!group) return;
  const open = group.classList.toggle('open');
  const caret = folderRow.querySelector('.caret');
  if (caret) caret.textContent = open ? '▾' : '▸';
});

// 历史记录子标签与星标交互
document.getElementById('historyTabs').addEventListener('click', (event) => {
  const tab = event.target.closest('.hp-tab');
  if (!tab) return;
  document.querySelectorAll('#historyTabs .hp-tab').forEach((t) => t.classList.toggle('active', t === tab));
});
document.getElementById('historyGroup').addEventListener('click', (event) => {
  const star = event.target.closest('.hist-star');
  if (!star) return;
  const on = star.classList.toggle('on');
  star.textContent = on ? '★' : '☆';
});
document.getElementById('historySearchInput').addEventListener('input', (event) => {
  const kw = event.target.value.trim().toLowerCase();
  document.querySelectorAll('#historyGroup .hist-item').forEach((row) => {
    row.style.display = !kw || row.textContent.toLowerCase().includes(kw) ? '' : 'none';
  });
});
document.getElementById('toolSearchInput').addEventListener('input', (event) => {
  const kw = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.toolbox-pane .tool-entry').forEach((row) => {
    row.style.display = !kw || row.textContent.toLowerCase().includes(kw) ? '' : 'none';
  });
});

// 侧栏宽度拖拽（README §五.8：220–620px）
const resizeHandle = document.getElementById('libraryResizeHandle');
let resizingLib = false;
resizeHandle.addEventListener('pointerdown', (event) => {
  resizingLib = true;
  resizeHandle.setPointerCapture(event.pointerId);
  resizeHandle.classList.add('dragging');
});
resizeHandle.addEventListener('pointermove', (event) => {
  if (!resizingLib) return;
  const w = Math.min(620, Math.max(240, event.clientX));
  document.documentElement.style.setProperty('--side-library-width', `${w}px`);
  moveGrid();
});
resizeHandle.addEventListener('pointerup', () => {
  resizingLib = false;
  resizeHandle.classList.remove('dragging');
});

/* ---------------- 设置抽屉与壁纸/主题切换 ---------------- */

const drawer = document.getElementById('settingsDrawer');
const backdrop = document.getElementById('drawerBackdrop');

const openDrawer = () => {
  drawer.classList.add('open');
  backdrop.classList.add('show');
  closeHeaderOverlays();
};
const closeDrawer = () => {
  drawer.classList.remove('open');
  backdrop.classList.remove('show');
};

document.getElementById('settingsBtn').addEventListener('click', openDrawer);
document.getElementById('footerSettingsBtn').addEventListener('click', openDrawer);
document.getElementById('accountOpenSettings').addEventListener('click', openDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);

document.getElementById('wpTabRemote').addEventListener('click', () => {
  document.getElementById('wpTabRemote').classList.add('active');
  document.getElementById('wpTabPreset').classList.remove('active');
  document.getElementById('wpPaneRemote').classList.add('show');
  document.getElementById('wpPanePreset').classList.remove('show');
});
document.getElementById('wpTabPreset').addEventListener('click', () => {
  document.getElementById('wpTabPreset').classList.add('active');
  document.getElementById('wpTabRemote').classList.remove('active');
  document.getElementById('wpPanePreset').classList.add('show');
  document.getElementById('wpPaneRemote').classList.remove('show');
});

const statusControl = document.querySelector('.header-center.status-control');
document.getElementById('switchWeather').addEventListener('click', (event) => {
  const on = !event.currentTarget.classList.contains('on');
  event.currentTarget.classList.toggle('on', on);
  event.currentTarget.setAttribute('aria-checked', String(on));
  statusControl.style.display = on ? '' : 'none';
});
document.getElementById('switchHint').addEventListener('click', (event) => {
  const on = !event.currentTarget.classList.contains('on');
  event.currentTarget.classList.toggle('on', on);
  event.currentTarget.setAttribute('aria-checked', String(on));
  document.getElementById('keyHint').style.display = on ? '' : 'none';
  document.getElementById('footerTip').style.display = on ? '' : 'none';
  document.getElementById('footerSpacer').style.display = on ? 'none' : '';
});

/* 全局快捷键：⌘K / Ctrl+K 聚焦搜索；Alt+S 打开工具箱；Esc 逐层收起 */
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    closeHeaderOverlays();
    closeDrawer();
    searchInput.focus();
    searchInput.select();
    return;
  }
  if (event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    openPane('toolbox');
    document.getElementById('toolSearchInput').focus();
    return;
  }
  if (event.key === 'Escape') {
    if (editing) {
      editing = false;
      renderGrid();
      return;
    }
    closeHeaderOverlays();
    closeDrawer();
  }
});

document.addEventListener('click', (event) => {
  if (
    event.target.closest(
      '.more-wrap, .status-control, .weather-popover, .calendar-popover, .account-btn, .account-pop, .engine-anchor, #demoBar'
    )
  ) {
    return;
  }
  closeHeaderOverlays();
});

/* ---------------- 场景与深浅外观状态引擎（正交切换） ---------------- */

const SCENES = {
  'scene-photo': { preset: false, theme: null },
  'scene-default': { preset: true, theme: null },
  'scene-dusk': { preset: true, theme: 'theme-dusk' },
  'scene-mint': { preset: true, theme: 'theme-mint' },
  'scene-night': { preset: true, theme: 'theme-night' },
};

const scene = document.getElementById('scene');
const wpPreview = document.getElementById('wpPreview');

const syncSwatch = (key) => {
  document.querySelectorAll('.theme-swatches .swatch').forEach((s) => {
    s.classList.toggle('selected', s.dataset.swatch === key);
  });
  document.querySelectorAll('.remote-wallpaper').forEach((s) => {
    if (s.dataset.wp) {
      s.classList.toggle('selected', key === 'scene-photo' && s.dataset.wp === currentPhotoRel);
    } else if (s.dataset.scenePreset) {
      s.classList.toggle('selected', s.dataset.scenePreset === key);
    }
  });
};

const applyScene = (key, customPhotoRel) => {
  const cfg = SCENES[key] || SCENES['scene-photo'];
  document.body.classList.remove('theme-dusk', 'theme-mint', 'theme-night');
  if (cfg.theme) document.body.classList.add(cfg.theme);

  if (cfg.preset) {
    document.body.classList.remove('rd-photo', 'photo-tone-dark', 'photo-tone-light');
    scene.classList.remove('photo');
    document.documentElement.style.setProperty('--wallpaper-url', 'none');
    wpPreview.classList.add('preset');
    const names = {
      'scene-default': '晨雾渐变',
      'scene-dusk': '暮色流光',
      'scene-mint': '薄荷晨风',
      'scene-night': '静谧深夜',
    };
    setHint(`流体渐变 · ${names[key] || '晨雾渐变'}`);
  } else {
    currentPhotoRel = customPhotoRel || currentPhotoRel || WALLPAPER_DEFAULT;
    document.body.classList.add('rd-photo');
    scene.classList.add('photo');
    wpPreview.classList.remove('preset');
    loadWallpaper(
      new URL(currentPhotoRel, document.baseURI).href,
      currentPhotoRel === WALLPAPER_DEFAULT ? WALLPAPER_REMOTE_FALLBACK : ''
    );
  }
  syncSwatch(key);
  document.querySelectorAll('.demo-bar [data-demo^="scene-"]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.demo === key);
  });
};

// 设置抽屉内点击壁纸缩略图或渐变色块实时生效
document.getElementById('remoteGrid').addEventListener('click', (event) => {
  const btn = event.target.closest('.remote-wallpaper');
  if (!btn) return;
  if (btn.dataset.wp) {
    applyScene('scene-photo', btn.dataset.wp);
  } else if (btn.dataset.scenePreset) {
    applyScene(btn.dataset.scenePreset);
  }
});
document.querySelectorAll('.theme-swatches .swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => applyScene(swatch.dataset.swatch));
});
document.getElementById('wpResetBtn').addEventListener('click', () => {
  applyScene('scene-photo', WALLPAPER_DEFAULT);
  showToast('已恢复默认精选壁纸');
});
document.getElementById('wpUploadInput').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const blobUrl = URL.createObjectURL(file);
  document.body.classList.remove('theme-dusk', 'theme-mint', 'theme-night');
  document.body.classList.add('rd-photo');
  scene.classList.add('photo');
  wpPreview.classList.remove('preset');
  loadWallpaper(blobUrl, '');
  showToast(`已应用本地壁纸：${file.name}`);
});

let forcedDark = false;
const applyDark = (on, isAuto = false) => {
  forcedDark = on;
  document.documentElement.classList.toggle('dark', on);
  document.getElementById('modeAuto').classList.toggle('active', isAuto);
  document.getElementById('modeLight').classList.toggle('active', !isAuto && !on);
  document.getElementById('modeDark').classList.toggle('active', !isAuto && on);
  document.querySelector('.demo-bar [data-demo="dark"]').classList.toggle('active', on);
};

document.getElementById('modeLight').addEventListener('click', () => applyDark(false, false));
document.getElementById('modeDark').addEventListener('click', () => applyDark(true, false));
document.getElementById('modeAuto').addEventListener('click', () => {
  applyDark(window.matchMedia('(prefers-color-scheme: dark)').matches, true);
});

/* ---------------- 演示切换栏交互 ---------------- */

document.getElementById('demoBar').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-demo]');
  if (!btn) return;
  const action = btn.dataset.demo;
  if (SCENES[action]) {
    applyScene(action, action === 'scene-photo' ? WALLPAPER_DEFAULT : undefined);
    return;
  }
  if (action === 'dark') {
    applyDark(!forcedDark);
    return;
  }
  if (action === 'card-mode') {
    setLayoutMode(layoutMode === 'card' ? 'icon' : 'card');
    return;
  }
  if (action.startsWith('pane-')) {
    openPane(action.slice(5));
    return;
  }
  if (action === 'pop-weather') {
    document.getElementById('weatherBtn').click();
    return;
  }
  if (action === 'pop-calendar') {
    document.getElementById('calendarBtn').click();
    return;
  }
  if (action === 'pop-account') {
    document.getElementById('accountBtn').click();
    return;
  }
  if (action === 'pop-engine') {
    event.stopPropagation();
    const open = engineMenu.classList.contains('show');
    closeHeaderOverlays();
    if (!open) engineMenu.classList.add('show');
    return;
  }
  if (action === 'drawer') {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
    return;
  }
  if (action === 'edit') {
    manageBtn.click();
  }
});

/* 初始化默认壁纸场景 */
applyScene('scene-photo', WALLPAPER_DEFAULT);
