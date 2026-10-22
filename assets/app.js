/* =============================================================================
   轻启 · 新标签页 —— 全功能交互脚本（零依赖纯前端，http:// 与 file:// 均可运行）
   -----------------------------------------------------------------------------
   设计目标（对应本轮修复）：
   1. 全量持久化：外观、壁纸、模糊/遮罩、宫格/卡片、快捷站点、待办、城市、便签、
      稍后阅读、收藏夹、历史、阅读进度、账号昵称、侧栏宽度、搜索历史等全部写入
      localStorage，刷新 / 重开浏览器 / 切换外观后都不再回退到初始状态。
   2. 全量可用：页面上每一个可点击的按钮、标签、开关、图标都有真实行为与统一的
      灵动通透毛玻璃视觉反馈，不再出现「点了没反应 / 点了变回旧样式」。
   ============================================================================= */

const STORAGE_KEY = 'qingqi_newtab_state_v2';
const pad = (n) => String(n).padStart(2, '0');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const escapeHtml = (str) =>
  String(str == null ? '' : str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const nowISO = () => new Date().toISOString();

/* ---------------- 默认状态 ---------------- */

const defaultQuick = () => [
  { webName: '哔哩哔哩', webUrl: 'https://www.bilibili.com' },
  { webName: '知乎', webUrl: 'https://www.zhihu.com' },
  { webName: '微博', webUrl: 'https://weibo.com' },
  { webName: 'GitHub', webUrl: 'https://github.com' },
  { webName: 'MDN Web Docs', webUrl: 'https://developer.mozilla.org/zh-CN/' },
  { webName: 'Vite 文档', webUrl: 'https://cn.vitejs.dev' },
  { webName: 'Vue.js', webUrl: 'https://vuejs.org' },
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
  { webName: '小红书', webUrl: 'https://www.xiaohongshu.com' },
  { webName: '淘宝', webUrl: 'https://www.taobao.com' },
  { webName: '京东', webUrl: 'https://www.jd.com' },
  { webName: '豆瓣', webUrl: 'https://www.douban.com' },
  { webName: '腾讯文档', webUrl: 'https://docs.qq.com' },
  { webName: '飞书', webUrl: 'https://www.feishu.cn' },
  { webName: 'Notion', webUrl: 'https://www.notion.so' },
];

const kstamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const defaultBookmarks = () => {
  const t = kstamp();
  return {
    folders: [
      { id: 'f-work', name: '工作台' },
      { id: 'f-design', name: '设计灵感' },
      { id: 'f-dev', name: '前端研发' },
      { id: 'f-life', name: '生活收藏' },
    ],
    items: [
      { id: 'b1', title: '轻启 · 产品需求文档', url: 'https://docs.qq.com/sheet/qingqi-prd', folder: 'f-work', added: t },
      { id: 'b2', title: '新标签页改版走查清单', url: 'https://www.yuque.com/qingqi/newtab-check', folder: 'f-work', added: t },
      { id: 'b3', title: 'Figma · 组件规范库', url: 'https://www.figma.com/file/qingqi-design-system', folder: 'f-design', added: t },
      { id: 'b4', title: 'Dribbble 每周灵感精选', url: 'https://dribbble.com/shots/popular', folder: 'f-design', added: t },
      { id: 'b5', title: '玻璃拟态配色灵感', url: 'https://www.behance.net/search/projects?search=glassmorphism', folder: 'f-design', added: t },
      { id: 'b6', title: 'MDN · CSS backdrop-filter', url: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS/backdrop-filter', folder: 'f-dev', added: t },
      { id: 'b7', title: 'Vue 3 官方文档', url: 'https://cn.vuejs.org/guide/introduction.html', folder: 'f-dev', added: t },
      { id: 'b8', title: 'Vite 构建配置参考', url: 'https://cn.vitejs.dev/config/', folder: 'f-dev', added: t },
      { id: 'b9', title: '掘金 · 新标签页性能优化', url: 'https://juejin.cn/post/7300000000000000000', folder: 'f-dev', added: t },
      { id: 'b10', title: '故宫博物院数字文物库', url: 'https://digicol.dpm.org.cn', folder: 'f-life', added: t },
      { id: 'b11', title: '中国国家地理', url: 'https://www.dili360.com', folder: 'f-life', added: t },
      { id: 'b12', title: '下厨房 · 家常菜谱', url: 'https://www.xiachufang.com', folder: 'f-life', added: t },
    ],
  };
};

const defaultHistory = () => {
  const base = Date.now();
  const at = (mins) => new Date(base - mins * 60000).toISOString();
  return [
    { id: 'h1', title: '玻璃拟态在新标签页中的落地实践 - 掘金', url: 'https://juejin.cn/post/7290000000000000001', time: at(12), group: 'g1', starred: true },
    { id: 'h2', title: 'MDN · backdrop-filter 兼容性说明', url: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS/backdrop-filter', time: at(34), group: 'g2' },
    { id: 'h3', title: 'Vue 3.5 响应式系统性能优化解读', url: 'https://cn.vuejs.org/guide/best-practices/performance.html', time: at(58), group: 'g2' },
    { id: 'h4', title: 'Figma 社区 · 桌面端新标签页模板', url: 'https://www.figma.com/community/file/qingqi-newtab', time: at(96), group: 'g1' },
    { id: 'h5', title: '故宫数字文物库 · 明清瓷器专题', url: 'https://digicol.dpm.org.cn/collection', time: at(150), group: 'g3' },
    { id: 'h6', title: 'Notion 官方 · 模板画廊', url: 'https://www.notion.so/templates', time: at(210), group: 'g1' },
    { id: 'h7', title: '中国国家地理 · 秋日山野特辑', url: 'https://www.dili360.com/cng/article', time: at(320), group: 'g3' },
    { id: 'h8', title: '语雀 · 产品设计知识库', url: 'https://www.yuque.com/explore', time: at(430), group: 'g2' },
  ];
};

const defaultGroups = () => [
  { id: 'g1', title: '视觉改版调研', color: '#4c86ff', tabs: ['掘金 · 玻璃拟态落地实践', 'Figma 社区 · 新标签页模板', 'Notion 模板画廊'] },
  { id: 'g2', title: '前端技术资料', color: '#18a06a', tabs: ['MDN · backdrop-filter', 'Vue 3 性能优化', '语雀 · 设计知识库'] },
  { id: 'g3', title: '周末灵感', color: '#d4881c', tabs: ['故宫数字文物库', '中国国家地理 · 秋日山野'] },
];

const defaultClosed = () => [
  { id: 'c1', title: 'WeTab 官网 · 桌面美化灵感', url: 'https://wetab.link', closedAt: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: 'c2', title: 'iTab 组件库使用手册', url: 'https://www.itab.link/docs', closedAt: new Date(Date.now() - 46 * 60000).toISOString() },
  { id: 'c3', title: 'Infinity 新标签页功能总览', url: 'https://www.infinitytab.com', closedAt: new Date(Date.now() - 140 * 60000).toISOString() },
];

const defaultSnapshots = () => [
  { id: 's1', title: '界面改版调研 · 6 个页面', time: new Date(Date.now() - 26 * 60000).toISOString(), pages: ['掘金 · 玻璃拟态落地实践', 'Figma 社区 · 新标签页模板', 'Dribbble 每周灵感', 'Behance 玻璃拟态', 'WeTab 官网', 'Infinity 新标签页'] },
  { id: 's2', title: '周末阅读清单 · 3 个页面', time: new Date(Date.now() - 320 * 60000).toISOString(), pages: ['故宫数字文物库', '中国国家地理 · 秋日山野', '下厨房 · 家常菜谱'] },
];

const defaultReadLater = () => [
  { id: 'r1', title: '为什么新标签页要做得「轻」：信息密度与留白的平衡', source: '少数派', url: 'https://sspai.com/post/newtab-light', excerpt: '新标签页是一场每天发生数十次的微型交互，首屏只需要回答一个问题：我接下来要做什么。把所有能力藏进二级面板，让首屏保持通透，是当前国内桌面美化类插件的共识。', minutes: 6, read: false, addedAt: nowISO(), progress: 0 },
  { id: 'r2', title: '毛玻璃层级设计：如何让半透明面板依旧清晰可读', source: '优设网', url: 'https://www.uisdc.com/glassmorphism-hierarchy', excerpt: '毛玻璃不是把透明度调低就完事。真正好用的玻璃层级需要三层：贴近背景的柔和层、承载内容的标准层、以及需要强调的强玻璃层，配合 1px 亮边与柔和投影形成“厚度感”。', minutes: 9, read: false, addedAt: nowISO(), progress: 0 },
  { id: 'r3', title: '中国用户的浏览习惯：搜索、导航与聚合的三重需求', source: '36氪', url: 'https://36kr.com/p/chinese-browsing-habits', excerpt: '与海外用户相比，国内用户更依赖“多引擎聚合 + 网址导航”，并希望在首屏就能看到天气、待办与农历这些生活信息。', minutes: 7, read: false, addedAt: nowISO(), progress: 0 },
  { id: 'r4', title: '深色模式不是简单反色：语义化令牌的正确做法', source: '掘金', url: 'https://juejin.cn/post/dark-mode-tokens', excerpt: '把颜色拆成语义令牌后，深浅色只需要切换令牌值，组件层无需任何 if 判断。这套做法同样适用于壁纸明暗自适应的场景。', minutes: 5, read: true, addedAt: nowISO(), progress: 100 },
];

const defaultNotes = () => [
  { id: 'n1', text: '今天要完成：新标签页深色模式走查（浮层 / 抽屉 / 侧栏全覆盖）', updatedAt: nowISO() },
  { id: 'n2', text: '周五 15:00 向客户演示 8×2 图标宫格与胶囊卡片双视图切换', updatedAt: nowISO() },
  { id: 'n3', text: '灵感：壁纸亮度自动采样之后，页脚文字也要跟着切换深浅', updatedAt: nowISO() },
];

const defaultState = () => ({
  version: 2,
  appearanceMode: 'light', // light | dark | auto
  sceneKey: 'scene-photo',
  photo: 'assets/wallpaper.webp',
  photoLabel: '宫墙夜色 · 默认精选',
  blur: 0,
  mask: 28,
  layout: 'icon', // icon | card
  openTarget: 'blank',
  seconds: true,
  weatherOn: true,
  hintOn: true,
  sidebarWidth: 312,
  engine: 'bing',
  quoteIndex: 0,
  customQuote: '',
  quick: defaultQuick(),
  tasks: {},
  cities: ['合肥', '北京', '上海', '深圳', '杭州'],
  activeCity: '合肥',
  notes: defaultNotes(),
  readLater: defaultReadLater(),
  readLaterFilter: 'unread',
  bookmarks: defaultBookmarks(),
  history: defaultHistory(),
  groups: defaultGroups(),
  closed: defaultClosed(),
  snapshots: defaultSnapshots(),
  searchHistory: ['新标签页 视觉改版', 'backdrop-filter 兼容性', 'Vue3 性能优化'],
  username: 'qingqi',
  plan: 'PRO',
  loggedIn: true,
  privatePassword: '',
  demoCollapsed: false,
  syncDismissed: false,
});

/* ---------------- 状态读写 ---------------- */

let state = defaultState();

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const base = defaultState();
    state = { ...base, ...parsed };
    // 数据向后兼容与类型矫正
    if (!Array.isArray(state.quick) || !state.quick.length) state.quick = base.quick;
    if (!state.bookmarks || !Array.isArray(state.bookmarks.items)) state.bookmarks = base.bookmarks;
    if (!Array.isArray(state.history)) state.history = base.history;
    if (!Array.isArray(state.groups)) state.groups = base.groups;
    if (!Array.isArray(state.closed)) state.closed = base.closed;
    if (!Array.isArray(state.snapshots)) state.snapshots = base.snapshots;
    if (!Array.isArray(state.notes)) state.notes = base.notes;
    if (!Array.isArray(state.readLater)) state.readLater = base.readLater;
    if (!state.tasks || typeof state.tasks !== 'object') state.tasks = base.tasks;
    if (!Array.isArray(state.cities) || !state.cities.length) state.cities = base.cities;
    if (!Array.isArray(state.searchHistory)) state.searchHistory = base.searchHistory;
    state.blur = Math.max(0, Math.min(20, Number(state.blur) || 0));
    state.mask = Math.max(0, Math.min(70, Number(state.mask) || 0));
    state.sidebarWidth = Math.max(200, Math.min(1000, Number(state.sidebarWidth) || 312));
  } catch (err) {
    console.warn('[轻启] 状态读取失败，使用默认值', err);
    state = defaultState();
  }
};

let saveTimer = null;
const saveState = (immediate = false) => {
  const commit = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('[轻启] 状态保存失败（可能超出存储配额）', err);
      showToast('本地存储空间不足，已优先保留界面设置');
    }
  };
  window.clearTimeout(saveTimer);
  if (immediate) commit();
  else saveTimer = window.setTimeout(commit, 160);
};

/* ---------------- 轻提示 Toast（支持撤销动作） ---------------- */

const toastEl = $('#rdToast');
const toastTextEl = $('#rdToastText');
const toastActionBtn = $('#rdToastAction');
let toastTimer = null;
let toastActionHandler = null;

const hideToast = () => {
  if (toastEl) toastEl.classList.remove('show');
  if (toastActionBtn) toastActionBtn.style.display = 'none';
  toastActionHandler = null;
};

const showToast = (msg, action) => {
  if (!toastEl || !msg) return;
  if (toastTextEl) toastTextEl.textContent = msg;
  toastEl.classList.add('show');
  if (action && action.label && toastActionBtn) {
    toastActionBtn.textContent = action.label;
    toastActionBtn.style.display = 'inline-flex';
    toastActionHandler = action.onClick;
  } else if (toastActionBtn) {
    toastActionBtn.style.display = 'none';
    toastActionHandler = null;
  }
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, action ? 5200 : 2400);
};

if (toastActionBtn) {
  toastActionBtn.addEventListener('click', () => {
    if (typeof toastActionHandler === 'function') toastActionHandler();
    hideToast();
  });
}

/* ---------------- 通用毛玻璃模态框 ---------------- */

const modalBackdrop = $('#modalBackdrop');
const modalDialog = $('#modalDialog');
const modalTitle = $('#modalTitle');
const modalSubtitle = $('#modalSubtitle');
const modalBody = $('#modalBody');
let modalStack = [];

const closeModal = () => {
  if (!modalBackdrop) return;
  modalBackdrop.classList.remove('show');
  modalDialog.classList.remove('wide', 'compact', 'tall', 'reader');
  window.setTimeout(() => {
    if (!modalBackdrop.classList.contains('show')) modalBody.innerHTML = '';
  }, 220);
  modalStack = [];
};

const openModal = ({ title, subtitle = '', body = '', size = '', onMount }) => {
  if (!modalBackdrop) return;
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalSubtitle.style.display = subtitle ? '' : 'none';
  modalBody.innerHTML = body;
  modalDialog.className = `rd-dialog${size ? ` ${size}` : ''}`;
  modalBackdrop.classList.add('show');
  closeHeaderOverlays();
  closeDrawer();
  if (typeof onMount === 'function') onMount(modalBody);
};

const modalCloseBtn = $('#modalCloseBtn');
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (modalBackdrop) {
  modalBackdrop.addEventListener('click', (event) => {
    if (event.target === modalBackdrop) closeModal();
  });
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('show')) {
    closeModal();
  }
});

/* ---------------- 中国农历与二十四节气（零依赖 Intl 实现） ---------------- */

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const WEEKDAY_SHORT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAY_LONG = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

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
    return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'numeric', day: 'numeric' });
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
  const monthCore = Number.isNaN(mNum) ? cleanMonth : LUNAR_MONTHS[(mNum - 1) % 12] || cleanMonth;
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

/* ---------------- 时钟 / 日期 / 每日一言 ---------------- */

const clockEl = $('#clock');
const tickClock = () => {
  if (!clockEl) return;
  const now = new Date();
  clockEl.innerHTML = `<span class="clock-hm">${pad(now.getHours())}:${pad(now.getMinutes())}</span>${state.seconds ? `<span class="clock-sec">:${pad(now.getSeconds())}</span>` : ''}`;
};
window.setInterval(tickClock, 1000);

const syncHeroDates = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const lunar = getLunarInfo(now);
  $('#headerDateDay').textContent = `${m}月${d}日`;
  $('#headerDateWeek').textContent = WEEKDAY_SHORT[now.getDay()];
  $('#headerDateLunar').textContent = lunar.short;
  $('#welcomeSubdate').textContent = `${m}月${d}日 ${WEEKDAY_LONG[now.getDay()]}  ·  ${lunar.full}`;
  $('#calendarTodayLabel').textContent = `今天 · ${m}月${d}日 ${lunar.short}`;
};

if (/Mac|iPhone|iPad/i.test(navigator.platform || '')) {
  $('#keyHint').textContent = '⌘ K';
  $('#footerKeyLabel').textContent = '⌘ K';
}

const QUOTES = [
  '把每一个新标签页，过成舒服的起点。',
  '心有山海，静而不争；行有章法，事半功倍。',
  '万物皆有裂痕，那是光透进来的地方。',
  '慢品人间烟火色，闲观万事岁月长。',
  '今日事今日毕，留白处自有清风来。',
];

const currentQuote = () => state.customQuote || QUOTES[state.quoteIndex % QUOTES.length];
const renderQuote = () => {
  const el = $('#quoteText');
  if (el) el.textContent = currentQuote();
};

$('#quoteBtn').addEventListener('click', () => {
  state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length;
  state.customQuote = '';
  renderQuote();
  saveState();
});
$('#quoteBtn').addEventListener('contextmenu', (event) => {
  event.preventDefault();
  openModal({
    title: '自定义每日一言',
    subtitle: '留空则恢复内置的东方文案库，保存后立即生效并持久化',
    size: 'compact',
    body: `
      <label class="field-label">一言内容</label>
      <textarea class="rd-textarea" id="customQuoteInput" maxlength="60" rows="3" placeholder="写一句每天打开新标签页想看到的话…">${escapeHtml(state.customQuote)}</textarea>
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="customQuoteReset">恢复默认文案库</button>
        <button class="primary-btn" type="button" id="customQuoteSave">保存这一句</button>
      </div>`,
    onMount: () => {
      $('#customQuoteSave').addEventListener('click', () => {
        state.customQuote = $('#customQuoteInput').value.trim();
        renderQuote();
        saveState(true);
        closeModal();
        showToast(state.customQuote ? '已保存自定义一言' : '已恢复默认一言文案');
      });
      $('#customQuoteReset').addEventListener('click', () => {
        state.customQuote = '';
        renderQuote();
        saveState(true);
        closeModal();
        showToast('已恢复默认一言文案');
      });
    },
  });
});

clockEl.addEventListener('click', () => {
  state.seconds = !state.seconds;
  const sw = $('#switchSeconds');
  if (sw) {
    sw.classList.toggle('on', state.seconds);
    sw.setAttribute('aria-checked', String(state.seconds));
  }
  tickClock();
  saveState();
  showToast(state.seconds ? '时钟已显示秒数' : '时钟已隐藏秒数，专注当下');
});

/* ---------------- 场景壁纸 / 明暗采样 / 外观模式 ---------------- */

const SCENE_META = {
  'scene-photo': { preset: false, label: '图片壁纸' },
  'scene-default': { preset: true, label: '晨雾渐变' },
  'scene-dusk': { preset: true, label: '暮色流光', theme: 'theme-dusk', tone: 'dark' },
  'scene-mint': { preset: true, label: '薄荷晨风', theme: 'theme-mint', tone: 'light' },
  'scene-night': { preset: true, label: '静谧深夜', theme: 'theme-night', tone: 'dark' },
};

const sceneEl = $('#scene');
const sceneMedia = $('#sceneMedia');
const sceneMaskEl = $('#sceneMask');

const setSceneVars = () => {
  if (!sceneEl) return;
  sceneEl.style.setProperty('--scene-blur', `${state.blur}px`);
  sceneEl.style.setProperty('--scene-mask', String(state.mask / 100));
};

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
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avg = sum / (data.length / 4);
    const dark = avg < 140;
    document.body.classList.toggle('photo-tone-dark', dark);
    document.body.classList.toggle('photo-tone-light', !dark);
    const hint = $('#wpHint');
    if (hint) hint.textContent = `图片壁纸 · 亮度 ${avg.toFixed(0)} → ${dark ? '暗景浅字 + 通透蒙层' : '亮景深字 + 清透提亮'}`;
  } catch {
    document.body.classList.add('photo-tone-dark');
    document.body.classList.remove('photo-tone-light');
  }
};

const resolveAsset = (url) => {
  if (!url || /^(data:|blob:|https?:)/i.test(url)) return url;
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
};

const applyPhoto = (rawUrl, label) => {
  const url = resolveAsset(rawUrl);
  const probe = new Image();
  probe.crossOrigin = 'anonymous';
  probe.onload = () => {
    if (sceneMedia) sceneMedia.style.backgroundImage = `url("${url}")`;
    document.documentElement.style.setProperty('--wallpaper-url', `url("${url}")`);
    applyPhotoTone(probe);
  };
  probe.onerror = () => {
    if (sceneMedia) sceneMedia.style.backgroundImage = 'url("assets/wallpaper.webp")';
    showToast('壁纸加载失败，已回退到默认精选壁纸');
  };
  probe.src = url;
  const hint = $('#wpHint');
  if (hint && label) hint.textContent = label;
};

const applyScene = (key, opts = {}) => {
  const meta = SCENE_META[key] || SCENE_META['scene-photo'];
  state.sceneKey = SCENE_META[key] ? key : 'scene-photo';
  document.body.classList.remove('theme-dusk', 'theme-mint', 'theme-night', 'theme-photo');
  if (meta.theme) document.body.classList.add(meta.theme);
  const preview = $('#wpPreview');

  if (meta.preset) {
    document.body.classList.remove('rd-photo');
    document.body.classList.add(`photo-tone-${meta.tone || 'light'}`);
    if (sceneMedia) sceneMedia.style.backgroundImage = 'none';
    document.documentElement.style.setProperty('--wallpaper-url', 'none');
    if (preview) preview.classList.add('preset');
    const hint = $('#wpHint');
    if (hint) hint.textContent = `流体渐变 · ${meta.label}`;
  } else {
    document.body.classList.add('rd-photo', 'theme-photo');
    if (preview) preview.classList.remove('preset');
    if (opts.photo) {
      state.photo = opts.photo;
      state.photoLabel = opts.label || '自定义壁纸';
    }
    applyPhoto(state.photo, state.photoLabel);
  }

  syncScenePickers();
  $$('.demo-bar [data-demo^="scene-"]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.demo === state.sceneKey);
  });
  setSceneVars();
  saveState();
};

const syncScenePickers = () => {
  $$('.theme-swatches .swatch').forEach((s) => s.classList.toggle('selected', s.dataset.swatch === state.sceneKey));
  $$('.remote-wallpaper').forEach((s) => {
    if (s.dataset.wp) s.classList.toggle('selected', state.sceneKey === 'scene-photo' && s.dataset.wp === state.photo);
    else if (s.dataset.scenePreset) s.classList.toggle('selected', s.dataset.scenePreset === state.sceneKey);
  });
};

const isSystemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
const effectiveDark = () => state.appearanceMode === 'dark' || (state.appearanceMode === 'auto' && isSystemDark());

const applyAppearance = (mode, opts = {}) => {
  if (['light', 'dark', 'auto'].includes(mode)) state.appearanceMode = mode;
  const dark = effectiveDark();
  document.documentElement.classList.toggle('dark', dark);
  $('#modeAuto').classList.toggle('active', state.appearanceMode === 'auto');
  $('#modeLight').classList.toggle('active', state.appearanceMode === 'light');
  $('#modeDark').classList.toggle('active', state.appearanceMode === 'dark');
  const demoDark = $('.demo-bar [data-demo="dark"]');
  if (demoDark) demoDark.classList.toggle('active', dark);
  const icon = $('#quickThemeIcon');
  if (icon) {
    icon.innerHTML = dark
      ? '<circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />'
      : '<path d="M20.4 14.8A8.5 8.5 0 0 1 9.2 3.6a8.5 8.5 0 1 0 11.2 11.2Z" />';
  }
  const btn = $('#quickThemeBtn');
  if (btn) btn.title = dark ? '切换到浅色玻璃外观' : '切换到深色曜石外观';
  saveState();
  if (!opts.silent) {
    showToast(
      state.appearanceMode === 'auto'
        ? `已跟随系统外观（当前${dark ? '深色' : '浅色'}），设置已记住`
        : `已切换到${dark ? '深色曜石' : '浅色玻璃'}外观，刷新后依然保持`
    );
  }
};

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.appearanceMode === 'auto') applyAppearance('auto', { silent: true });
});

$('#modeLight').addEventListener('click', () => applyAppearance('light'));
$('#modeDark').addEventListener('click', () => applyAppearance('dark'));
$('#modeAuto').addEventListener('click', () => applyAppearance('auto'));
$('#quickThemeBtn').addEventListener('click', () => applyAppearance(effectiveDark() ? 'light' : 'dark'));

/* 壁纸模糊 / 遮罩滑块 */
const blurSlider = $('#wpBlurSlider');
const maskSlider = $('#wpMaskSlider');
const syncSliderLabels = () => {
  $('#blurValLabel').textContent = `${state.blur} px`;
  $('#maskValLabel').textContent = `${state.mask}%`;
};
if (blurSlider) {
  blurSlider.value = state.blur;
  blurSlider.addEventListener('input', () => {
    state.blur = Number(blurSlider.value);
    syncSliderLabels();
    setSceneVars();
    saveState();
  });
}
if (maskSlider) {
  maskSlider.value = state.mask;
  maskSlider.addEventListener('input', () => {
    state.mask = Number(maskSlider.value);
    syncSliderLabels();
    setSceneVars();
    saveState();
  });
}

/* 精选壁纸选择 / 渐变预设 / 上传 / 换一张 / 恢复默认 */
const REMOTE_WALLPAPERS = [
  { file: 'assets/wallpaper.webp', label: '宫墙夜色 · 暗景浅字' },
  { file: 'assets/wp-mist.jpg', label: '江南烟雨 · 亮景深字' },
  { file: 'assets/wp-sunset.jpg', label: '暮海霞光 · 暖调暮色' },
  { file: 'assets/wp-bamboo.jpg', label: '竹林晨光 · 清新竹影' },
  { file: 'assets/wp-snow.jpg', label: '梅里星河 · 静谧雪峰' },
];

$$('.remote-grid .remote-wallpaper').forEach((btn) => {
  if (btn.dataset.wp) {
    btn.style.backgroundImage = `url("${new URL(btn.dataset.wp, document.baseURI).href}")`;
  }
});

$('#remoteGrid').addEventListener('click', (event) => {
  const btn = event.target.closest('.remote-wallpaper');
  if (!btn) return;
  if (btn.dataset.wp) {
    const known = REMOTE_WALLPAPERS.find((w) => w.file === btn.dataset.wp);
    applyScene('scene-photo', { photo: btn.dataset.wp, label: known ? known.label : '精选壁纸' });
    showToast(`已应用壁纸：${known ? known.label : btn.title}`);
  } else if (btn.dataset.scenePreset) {
    applyScene(btn.dataset.scenePreset);
    showToast(`已切换流体渐变：${SCENE_META[btn.dataset.scenePreset].label}`);
  }
});

$$('.theme-swatches .swatch').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    applyScene(swatch.dataset.swatch);
    showToast(`已切换流体渐变：${SCENE_META[swatch.dataset.swatch].label}`);
  });
});

$('#wpResetBtn').addEventListener('click', () => {
  applyScene('scene-photo', { photo: REMOTE_WALLPAPERS[0].file, label: REMOTE_WALLPAPERS[0].label });
  showToast('已恢复默认精选壁纸');
});

$('#wpCycleNextBtn').addEventListener('click', () => {
  const idx = Math.max(0, REMOTE_WALLPAPERS.findIndex((w) => w.file === state.photo));
  const next = REMOTE_WALLPAPERS[(idx + 1) % REMOTE_WALLPAPERS.length];
  applyScene('scene-photo', { photo: next.file, label: next.label });
  showToast(`已换一张：${next.label}`);
});

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const shrinkImage = (dataUrl, maxWidth = 1920) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= maxWidth) return resolve(dataUrl);
      const ratio = maxWidth / img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = Math.round(img.naturalHeight * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

$('#wpUploadInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const raw = await readFileAsDataURL(file);
    const compressed = await shrinkImage(raw);
    applyScene('scene-photo', { photo: compressed, label: `本地壁纸 · ${file.name}` });
    showToast(`已应用本地壁纸并保存：${file.name}`);
  } catch {
    showToast('图片读取失败，请换一张试试');
  }
  event.target.value = '';
});

/* 设置抽屉中的壁纸 / 渐变二级标签 */
$('#wpTabRemote').addEventListener('click', () => {
  $('#wpTabRemote').classList.add('active');
  $('#wpTabPreset').classList.remove('active');
  $('#wpPaneRemote').classList.add('show');
  $('#wpPanePreset').classList.remove('show');
});
$('#wpTabPreset').addEventListener('click', () => {
  $('#wpTabPreset').classList.add('active');
  $('#wpTabRemote').classList.remove('active');
  $('#wpPanePreset').classList.add('show');
  $('#wpPaneRemote').classList.remove('show');
});

/* 壁纸画廊模态框 */
const openWallpaperGallery = () => {
  const cards = REMOTE_WALLPAPERS.map(
    (w) => `<button class="gallery-card${state.photo === w.file && state.sceneKey === 'scene-photo' ? ' active' : ''}" type="button" data-gallery-wp="${w.file}">
      <span class="gallery-thumb" style="background-image:url('${new URL(w.file, document.baseURI).href}')"></span>
      <b>${w.label}</b>
      <small>${state.photo === w.file && state.sceneKey === 'scene-photo' ? '当前使用中' : '点击立即应用'}</small>
    </button>`
  ).join('');
  const presets = Object.entries(SCENE_META)
    .filter(([, meta]) => meta.preset)
    .map(
      ([key, meta]) => `<button class="gallery-card gradient-card${state.sceneKey === key ? ' active' : ''}" type="button" data-gallery-scene="${key}">
        <span class="gallery-thumb ${key}"></span>
        <b>${meta.label}</b>
        <small>${state.sceneKey === key ? '当前使用中' : '东方流体渐变'}</small>
      </button>`
    )
    .join('');
  openModal({
    title: '精选壁纸画廊',
    subtitle: '11 款高清壁纸与东方流体渐变，全部离线内置，点击即刻应用并持久保存',
    size: 'wide',
    body: `
      <div class="gallery-section-label">高清壁纸（自动采样亮度匹配字色）</div>
      <div class="gallery-grid">${cards}</div>
      <div class="gallery-section-label">流体渐变（自动匹配深浅外观）</div>
      <div class="gallery-grid preset-gallery">${presets}</div>
      <div class="rd-modal-actions">
        <label class="primary-btn file-btn">上传本地壁纸<input type="file" id="galleryUploadInput" accept="image/*" hidden /></label>
        <button class="ghost-btn" type="button" id="galleryResetWp">恢复默认壁纸</button>
      </div>`,
    onMount: (root) => {
      root.addEventListener('click', (event) => {
        const wpBtn = event.target.closest('[data-gallery-wp]');
        if (wpBtn) {
          const known = REMOTE_WALLPAPERS.find((w) => w.file === wpBtn.dataset.galleryWp);
          applyScene('scene-photo', { photo: wpBtn.dataset.galleryWp, label: known ? known.label : '精选壁纸' });
          closeModal();
          showToast(`已应用壁纸：${known ? known.label : '精选壁纸'}`);
          return;
        }
        const sceneBtn = event.target.closest('[data-gallery-scene]');
        if (sceneBtn) {
          applyScene(sceneBtn.dataset.galleryScene);
          closeModal();
          showToast(`已切换流体渐变：${SCENE_META[sceneBtn.dataset.galleryScene].label}`);
        }
      });
      $('#galleryResetWp').addEventListener('click', () => {
        applyScene('scene-photo', { photo: REMOTE_WALLPAPERS[0].file, label: REMOTE_WALLPAPERS[0].label });
        closeModal();
        showToast('已恢复默认精选壁纸');
      });
      $('#galleryUploadInput').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const raw = await readFileAsDataURL(file);
        const compressed = await shrinkImage(raw);
        applyScene('scene-photo', { photo: compressed, label: `本地壁纸 · ${file.name}` });
        closeModal();
        showToast(`已应用本地壁纸：${file.name}`);
      });
    },
  });
};
$('#openWpGalleryBtn').addEventListener('click', openWallpaperGallery);
$('#openGalleryFooterBtn').addEventListener('click', openWallpaperGallery);

/* ---------------- 聚合搜索引擎 + 搜索建议 ---------------- */

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
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.2 6h6.6v1.9H9.3v2.6h2.9v1.9H9.1c-.3 1.9-1.1 3.7-2.6 5.2l-1.4-1.3c1.2-1.1 1.9-2.5 2.1-3.9H4.4V10.5h3V7.9H5.2l-.7 1.4-1.4-.9C4 6.9 4.7 5.3 5.1 4l1.7.5-.4 1.5zm8.2.5h6.2v12h-1.9v-1.2h-2.4v1.4h-1.9v-12.2zm1.9 1.9v6.9h2.4V8.4h-2.4z"/></svg>',
  },
  {
    key: 'sogou',
    label: '搜狗',
    color: 'linear-gradient(135deg, #ff7a3e, #f0511d)',
    url: 'https://www.sogou.com/web?query=',
    svg: '<span class="engine-letter">搜</span>',
  },
  {
    key: 'so360',
    label: '360搜索',
    color: 'linear-gradient(135deg, #16c469, #099a4e)',
    url: 'https://www.so.com/s?q=',
    svg: '<span class="engine-letter">360</span>',
  },
  {
    key: 'duckduckgo',
    label: 'DuckGo',
    color: 'linear-gradient(135deg, #eb6a38, #d6471c)',
    url: 'https://duckduckgo.com/?q=',
    svg: '<span class="engine-letter">D</span>',
  },
];

const engineMenu = $('#engineMenu');
const engineLogo = $('#engineLogo');
const engineName = $('#engineName');
const searchInput = $('#searchInput');
const searchSuggest = $('#searchSuggest');
const searchClearBtn = $('#searchClearBtn');

const activeEngine = () => ENGINES.find((e) => e.key === state.engine) || ENGINES[0];

const updateEngineButton = () => {
  const engine = activeEngine();
  engineLogo.style.background = engine.color;
  engineLogo.innerHTML = engine.svg;
  engineName.textContent = engine.label;
};

const renderEngineMenu = () => {
  engineMenu.innerHTML = ENGINES.map(
    (e) => `<button type="button" class="engine-option${e.key === activeEngine().key ? ' selected' : ''}" data-key="${e.key}" role="menuitem">
        <span class="mini-logo" style="background:${e.color}">${e.svg}</span>
        <span>${e.label}</span>
        ${e.key === activeEngine().key ? '<em class="engine-check">✓</em>' : ''}
      </button>`
  ).join('');
};

const openUrl = (url) => {
  try {
    if (state.openTarget === 'self') {
      window.location.href = url;
      return;
    }
    const target = window.open(url, state.openTarget === 'window' ? '_blank' : '_blank', 'noopener');
    if (!target) {
      showToast('浏览器拦截了新标签页，请允许弹出窗口');
    }
  } catch {
    showToast('链接打开失败，请检查浏览器设置');
  }
};

const renderSuggest = (mode = 'recent') => {
  const keyword = searchInput.value.trim();
  const engine = activeEngine();
  const recents = state.searchHistory.slice(0, 6);
  if (!recents.length && !keyword) {
    searchSuggest.innerHTML = `<div class="suggest-empty">试试搜索「新标签页 设计」或直接输入网址</div>`;
  } else {
    const rows = (keyword
      ? recents.filter((r) => r.toLowerCase().includes(keyword.toLowerCase()))
      : recents
    )
      .map(
        (r) => `<button type="button" class="suggest-row" data-suggest="${escapeHtml(r)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="8.4"/><path d="M12 7.6v4.8l3.1 1.9"/></svg>
          <span>${escapeHtml(r)}</span>
          <small>最近搜索</small>
        </button>`
      )
      .join('');
    searchSuggest.innerHTML =
      (keyword
        ? `<button type="button" class="suggest-row primary" data-suggest="${escapeHtml(keyword)}">
            <span class="suggest-engine" style="background:${engine.color}">${engine.svg}</span>
            <span>用 ${engine.label} 搜索「${escapeHtml(keyword)}」</span>
            <small>回车</small>
          </button>`
        : '') +
      rows ||
      `<div class="suggest-empty">没有匹配的最近搜索，回车直接用 ${engine.label} 检索</div>`;
  }
  searchSuggest.classList.toggle('show', mode !== 'hide');
};

const doSearch = (keyword) => {
  const q = (keyword == null ? searchInput.value : keyword).trim();
  if (!q) {
    searchInput.focus();
    showToast(`当前使用「${activeEngine().label}」，请输入搜索关键词`);
    return;
  }
  state.searchHistory = [q, ...state.searchHistory.filter((s) => s !== q)].slice(0, 12);
  saveState();
  searchSuggest.classList.remove('show');
  openUrl(activeEngine().url + encodeURIComponent(q));
};

const syncSearchClear = () => {
  searchClearBtn.style.display = searchInput.value ? 'grid' : 'none';
};

$('#engineBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const willShow = !engineMenu.classList.contains('show');
  closeHeaderOverlays();
  if (willShow) engineMenu.classList.add('show');
  searchSuggest.classList.remove('show');
});

engineMenu.addEventListener('click', (event) => {
  const btn = event.target.closest('.engine-option');
  if (!btn) return;
  state.engine = btn.dataset.key;
  updateEngineButton();
  renderEngineMenu();
  saveState();
  engineMenu.classList.remove('show');
  searchInput.focus();
  showToast(`已切换搜索引擎：${activeEngine().label}（已记住）`);
});

$('#searchForm').addEventListener('submit', (event) => {
  event.preventDefault();
  doSearch();
});

searchInput.addEventListener('focus', () => renderSuggest('recent'));
searchInput.addEventListener('input', () => {
  syncSearchClear();
  renderSuggest();
});
searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  syncSearchClear();
  searchInput.focus();
  renderSuggest();
});
searchSuggest.addEventListener('mousedown', (event) => {
  event.preventDefault();
  const row = event.target.closest('[data-suggest]');
  if (!row) return;
  searchInput.value = row.dataset.suggest;
  syncSearchClear();
  doSearch(row.dataset.suggest);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-wrap')) searchSuggest.classList.remove('show');
});

/* ---------------- 品牌矢量图标库（与 README §五 品牌映射保持一致） ---------------- */

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

/* ---------------- 快捷访问：8×2 图标宫格 / 4×4 胶囊卡片（全量可增删改拖拽排序） ---------------- */

const gradientOf = (name) => {
  let hash = 0;
  const text = name || '·';
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 360;
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
const normalizeUrl = (input) => {
  const text = String(input || '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(text)) return `https://${text}`;
  return '';
};

const PER_PAGE = () => (window.innerWidth <= 760 ? 8 : 16);
const quickSection = $('#quickSection');
const grid = $('#quickGrid');
const quickDots = $('#quickDots');
const pagerStatus = $('#pagerStatus');
const prevBtn = $('#prevPage');
const nextBtn = $('#nextPage');
const manageBtn = $('#manageBtn');

let page = 0;
let editing = false;
let draggedIndex = null;

const setLayoutMode = (mode, opts = {}) => {
  state.layout = mode === 'card' ? 'card' : 'icon';
  quickSection.classList.toggle('mode-card', state.layout === 'card');
  $$('.view-mode-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.view === state.layout));
  const select = $('#drawerLayoutSelect');
  if (select) select.value = state.layout;
  const demoCardBtn = $('.demo-bar [data-demo="card-mode"]');
  if (demoCardBtn) demoCardBtn.classList.toggle('active', state.layout === 'card');
  renderQuick();
  saveState();
  if (!opts.silent) showToast(state.layout === 'card' ? '已切换为灵动胶囊卡片视图（已记住）' : '已切换为 App 图标宫格视图（已记住）');
};

const cardsOf = () => {
  const list = state.quick.map((item, idx) => ({ type: 'item', item, idx }));
  list.push({ type: 'add' });
  return list;
};

const pageCount = () => Math.max(1, Math.ceil(cardsOf().length / PER_PAGE()));

const shortcutHtml = (card) => {
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
  const target = state.openTarget === 'self' ? '_self' : '_blank';
  return `<a class="shortcut${editing ? ' editing' : ''}" href="${escapeHtml(item.webUrl)}" target="${target}" rel="noopener" data-idx="${idx}" draggable="${editing}" title="${escapeHtml(item.webName)} · ${escapeHtml(domainOf(item.webUrl))}">
    ${editing ? `<button class="shortcut-delete" type="button" data-del="${idx}" aria-label="移除 ${escapeHtml(item.webName)}">
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 2.2l5.6 5.6M7.8 2.2l-5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
    </button>
    <button class="shortcut-edit" type="button" data-edit="${idx}" aria-label="编辑 ${escapeHtml(item.webName)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
    </button>` : ''}
    <span class="shortcut-icon" style="background:${bg}">${glyph}</span>
    <span class="shortcut-body">
      <span class="shortcut-label">${escapeHtml(item.webName)}</span>
      <span class="shortcut-domain">${escapeHtml(domainOf(item.webUrl))}</span>
    </span>
  </a>`;
};

const renderQuick = () => {
  const cards = cardsOf();
  const per = PER_PAGE();
  const pages = [];
  for (let i = 0; i < cards.length; i += per) pages.push(cards.slice(i, i + per));
  if (!pages.length) pages.push([]);
  grid.innerHTML = pages.map((chunk) => `<div class="quick-page">${chunk.map(shortcutHtml).join('')}</div>`).join('');
  grid.classList.toggle('editing', editing);
  manageBtn.classList.toggle('is-editing', editing);
  $('#quickNote').classList.toggle('show', editing);
  $('#manageBtnText').textContent = editing ? '完成' : '编辑';
  const demoEditBtn = $('.demo-bar [data-demo="edit"]');
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
  quickDots.querySelectorAll('.quick-dot').forEach((d, i) => d.classList.toggle('active', i === page));
};

/* 新增 / 编辑网站 */
const openSiteEditor = (index = -1) => {
  const isEdit = index >= 0 && state.quick[index];
  const item = isEdit ? state.quick[index] : { webName: '', webUrl: '' };
  openModal({
    title: isEdit ? '编辑常用网站' : '添加常用网站',
    subtitle: '图标会根据站点名称自动匹配内置矢量品牌图标，未收录的站点使用首字母渐变',
    size: 'compact',
    body: `
      <label class="field-label">站点名称</label>
      <input class="rd-input" id="siteNameInput" maxlength="20" autocomplete="off" placeholder="例如：小红书 / 公司内网" value="${escapeHtml(item.webName)}" />
      <label class="field-label">站点网址</label>
      <input class="rd-input" id="siteUrlInput" autocomplete="off" placeholder="例如：https://www.xiaohongshu.com" value="${escapeHtml(item.webUrl)}" />
      <p class="field-tip">支持省略 https://，保存后立即出现在快捷访问中并自动持久化。</p>
      <div class="rd-modal-actions">
        ${isEdit ? '<button class="ghost-btn" type="button" id="siteDeleteBtn">删除该网站</button>' : ''}
        <button class="primary-btn" type="button" id="siteSaveBtn">${isEdit ? '保存修改' : '添加到快捷访问'}</button>
      </div>`,
    onMount: () => {
      $('#siteNameInput').focus();
      const save = () => {
        const name = $('#siteNameInput').value.trim();
        const url = normalizeUrl($('#siteUrlInput').value);
        if (!name) {
          showToast('请填写站点名称');
          $('#siteNameInput').focus();
          return;
        }
        if (!url) {
          showToast('网址格式不正确，请输入完整链接或域名');
          $('#siteUrlInput').focus();
          return;
        }
        if (isEdit) {
          state.quick[index] = { webName: name, webUrl: url };
        } else {
          state.quick.push({ webName: name, webUrl: url });
          page = Math.floor((state.quick.length - 1) / PER_PAGE());
        }
        saveState(true);
        renderQuick();
        closeModal();
        showToast(isEdit ? `已保存「${name}」` : `已添加「${name}」到快捷访问`);
      };
      $('#siteSaveBtn').addEventListener('click', save);
      modalBody.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        }
      });
      const del = $('#siteDeleteBtn');
      if (del) {
        del.addEventListener('click', () => {
          const removed = state.quick[index];
          state.quick.splice(index, 1);
          saveState(true);
          renderQuick();
          closeModal();
          showToast(`已删除「${removed.webName}」`, {
            label: '撤销',
            onClick: () => {
              state.quick.splice(index, 0, removed);
              saveState(true);
              renderQuick();
              showToast(`已恢复「${removed.webName}」`);
            },
          });
        });
      }
    },
  });
};

$('#topAddSiteBtn').addEventListener('click', () => openSiteEditor(-1));

grid.addEventListener('click', (event) => {
  const delBtn = event.target.closest('[data-del]');
  if (delBtn) {
    event.preventDefault();
    event.stopPropagation();
    const idx = Number(delBtn.dataset.del);
    const removed = state.quick.splice(idx, 1)[0];
    saveState(true);
    renderQuick();
    if (removed) {
      showToast(`已移除「${removed.webName}」`, {
        label: '撤销',
        onClick: () => {
          state.quick.splice(idx, 0, removed);
          saveState(true);
          renderQuick();
          showToast(`已恢复「${removed.webName}」`);
        },
      });
    }
    return;
  }
  const editBtn = event.target.closest('[data-edit]');
  if (editBtn) {
    event.preventDefault();
    event.stopPropagation();
    openSiteEditor(Number(editBtn.dataset.edit));
    return;
  }
  const addBtn = event.target.closest('[data-action="add"]');
  if (addBtn) {
    event.preventDefault();
    openSiteEditor(-1);
    return;
  }
  const link = event.target.closest('a.shortcut');
  if (!link) return;
  if (editing) {
    event.preventDefault();
    showToast('编辑模式：点击图标可修改，右上角 × 移除，按住图标可拖拽排序');
    return;
  }
  const item = state.quick[Number(link.dataset.idx)];
  if (item) showToast(`正在打开 ${item.webName} · ${domainOf(item.webUrl)}`);
});

/* 编辑态拖拽排序（HTML5 Drag & Drop，同时兼容鼠标与触控板） */
grid.addEventListener('dragstart', (event) => {
  const link = event.target.closest('a.shortcut');
  if (!editing || !link) {
    event.preventDefault();
    return;
  }
  draggedIndex = Number(link.dataset.idx);
  link.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  try {
    event.dataTransfer.setData('text/plain', String(draggedIndex));
  } catch {}
});
grid.addEventListener('dragover', (event) => {
  if (!editing || draggedIndex == null) return;
  const link = event.target.closest('a.shortcut');
  if (!link) return;
  event.preventDefault();
  $$('#quickGrid a.shortcut').forEach((el) => el.classList.remove('drag-over'));
  if (Number(link.dataset.idx) !== draggedIndex) link.classList.add('drag-over');
});
grid.addEventListener('drop', (event) => {
  if (!editing || draggedIndex == null) return;
  const link = event.target.closest('a.shortcut');
  if (!link) return;
  event.preventDefault();
  const targetIdx = Number(link.dataset.idx);
  if (targetIdx !== draggedIndex) {
    const [moved] = state.quick.splice(draggedIndex, 1);
    state.quick.splice(targetIdx, 0, moved);
    saveState(true);
    showToast(`已调整「${moved.webName}」的位置`);
  }
  draggedIndex = null;
  renderQuick();
});
grid.addEventListener('dragend', () => {
  draggedIndex = null;
  $$('#quickGrid a.shortcut').forEach((el) => el.classList.remove('dragging', 'drag-over'));
});

quickDots.addEventListener('click', (event) => {
  const dot = event.target.closest('.quick-dot');
  if (!dot) return;
  page = Number(dot.dataset.page);
  moveGrid();
});

$$('.view-mode-btn').forEach((btn) => btn.addEventListener('click', () => setLayoutMode(btn.dataset.view)));
$('#drawerLayoutSelect').addEventListener('change', (event) => setLayoutMode(event.target.value));

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
  renderQuick();
  showToast(editing ? '已进入编辑模式：拖拽排序 / 点击编辑 / × 移除' : '已退出编辑模式');
});

/* 指针滑动 + 滚轮顺滑翻页 */
const viewport = $('#quickViewport');
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

/* ---------------- 页头浮层与菜单互斥开关 ---------------- */

const weatherPopover = $('#weatherPopover');
const calendarPopover = $('#calendarPopover');
const accountPop = $('#accountPop');
const moreMenu = $('#moreMenu');

const closeHeaderOverlays = () => {
  weatherPopover.classList.remove('show');
  calendarPopover.classList.remove('show');
  accountPop.classList.remove('show');
  moreMenu.classList.remove('show');
  engineMenu.classList.remove('show');
  if (searchSuggest) searchSuggest.classList.remove('show');
  $('#weatherBtn').setAttribute('aria-expanded', 'false');
  $('#calendarBtn').setAttribute('aria-expanded', 'false');
  $('#accountBtn').setAttribute('aria-expanded', 'false');
};

$('#weatherBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = weatherPopover.classList.contains('show');
  closeHeaderOverlays();
  if (!open) {
    weatherPopover.classList.add('show');
    event.currentTarget.setAttribute('aria-expanded', 'true');
  }
});
$('#calendarBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = calendarPopover.classList.contains('show');
  closeHeaderOverlays();
  if (!open) {
    calendarPopover.classList.add('show');
    event.currentTarget.setAttribute('aria-expanded', 'true');
    renderCalendar();
  }
});
$('#accountBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = accountPop.classList.contains('show');
  closeHeaderOverlays();
  if (!open) {
    accountPop.classList.add('show');
    event.currentTarget.setAttribute('aria-expanded', 'true');
    renderAccount();
  }
});
$('#moreBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  const open = moreMenu.classList.contains('show');
  closeHeaderOverlays();
  if (!open) moreMenu.classList.add('show');
});
$('#calendarClose').addEventListener('click', closeHeaderOverlays);

document.addEventListener('click', (event) => {
  if (event.target.closest('.more-wrap, .status-control, .weather-popover, .calendar-popover, .account-btn, .account-pop, .engine-anchor, #demoBar, .search-wrap')) return;
  closeHeaderOverlays();
});

/* ---------------- 天气浮层（多城市 + 自定义城市 + 实时联动页头） ---------------- */

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
  合肥: { temp: 18, cond: '多云', feel: 17, hum: '63%', wind: '东北风 3 级', icon: 'partly', aqi: 28, fc: [['partly', '今天', '21° / 14°'], ['rain', '明天', '19° / 13°'], ['partly', '周六', '22° / 15°'], ['sunny', '周日', '25° / 16°']] },
  北京: { temp: 16, cond: '晴朗', feel: 15, hum: '41%', wind: '西北风 2 级', icon: 'sunny', aqi: 42, fc: [['sunny', '今天', '18° / 7°'], ['sunny', '明天', '19° / 8°'], ['partly', '周六', '17° / 6°'], ['sunny', '周日', '20° / 8°']] },
  上海: { temp: 21, cond: '多云', feel: 20, hum: '68%', wind: '东风 3 级', icon: 'partly', aqi: 35, fc: [['partly', '今天', '23° / 16°'], ['rain', '明天', '20° / 15°'], ['partly', '周六', '22° / 16°'], ['sunny', '周日', '24° / 17°']] },
  深圳: { temp: 26, cond: '晴间多云', feel: 27, hum: '72%', wind: '南风 2 级', icon: 'sunny', aqi: 24, fc: [['sunny', '今天', '28° / 22°'], ['partly', '明天', '27° / 21°'], ['sunny', '周六', '29° / 22°'], ['sunny', '周日', '29° / 23°']] },
  杭州: { temp: 19, cond: '小雨转晴', feel: 18, hum: '74%', wind: '东北风 2 级', icon: 'rain', aqi: 31, fc: [['rain', '今天', '20° / 14°'], ['partly', '明天', '22° / 14°'], ['sunny', '周六', '24° / 15°'], ['sunny', '周日', '25° / 16°']] },
  成都: { temp: 17, cond: '多云', feel: 17, hum: '76%', wind: '微风 1 级', icon: 'partly', aqi: 46, fc: [['partly', '今天', '19° / 13°'], ['partly', '明天', '20° / 14°'], ['rain', '周六', '18° / 13°'], ['partly', '周日', '21° / 14°']] },
  南京: { temp: 19, cond: '晴朗', feel: 18, hum: '58%', wind: '东风 2 级', icon: 'sunny', aqi: 38, fc: [['sunny', '今天', '21° / 13°'], ['partly', '明天', '20° / 13°'], ['sunny', '周六', '23° / 14°'], ['sunny', '周日', '24° / 15°']] },
  武汉: { temp: 20, cond: '多云', feel: 19, hum: '61%', wind: '北风 2 级', icon: 'partly', aqi: 44, fc: [['partly', '今天', '22° / 14°'], ['sunny', '明天', '23° / 15°'], ['sunny', '周六', '24° / 15°'], ['partly', '周日', '22° / 14°']] },
  西安: { temp: 15, cond: '晴间薄雾', feel: 14, hum: '52%', wind: '静风 1 级', icon: 'partly', aqi: 68, fc: [['partly', '今天', '18° / 9°'], ['sunny', '明天', '19° / 10°'], ['partly', '周六', '17° / 9°'], ['sunny', '周日', '20° / 11°']] },
  青岛: { temp: 17, cond: '海雾转晴', feel: 16, hum: '79%', wind: '东南风 4 级', icon: 'rain', aqi: 26, fc: [['rain', '今天', '19° / 12°'], ['partly', '明天', '20° / 13°'], ['sunny', '周六', '21° / 14°'], ['sunny', '周日', '22° / 15°']] },
  重庆: { temp: 23, cond: '阴转多云', feel: 24, hum: '71%', wind: '西南风 1 级', icon: 'partly', aqi: 52, fc: [['partly', '今天', '25° / 18°'], ['partly', '明天', '24° / 17°'], ['rain', '周六', '22° / 16°'], ['partly', '周日', '25° / 18°']] },
  广州: { temp: 27, cond: '晴热', feel: 29, hum: '70%', wind: '南风 2 级', icon: 'sunny', aqi: 29, fc: [['sunny', '今天', '30° / 23°'], ['partly', '明天', '29° / 22°'], ['sunny', '周六', '31° / 23°'], ['rain', '周日', '28° / 22°']] },
};

const RECOMMEND_CITIES = ['合肥', '北京', '上海', '成都', '南京', '武汉', '广州', '西安', '青岛', '重庆'];

const cityWeatherOf = (city) => {
  if (CITY_WEATHER[city]) return CITY_WEATHER[city];
  let hash = 0;
  for (let i = 0; i < city.length; i += 1) hash = (hash * 31 + city.charCodeAt(i)) % 997;
  const temp = 14 + (hash % 14);
  const icons = ['sunny', 'partly', 'rain'];
  const conds = { sunny: '晴朗', partly: '多云', rain: '阵雨' };
  const icon = icons[hash % 3];
  return {
    temp,
    cond: conds[icon],
    feel: temp - 1,
    hum: `${52 + (hash % 30)}%`,
    wind: `微风 ${1 + (hash % 3)} 级`,
    icon,
    aqi: 20 + (hash % 60),
    fc: [
      [icon, '今天', `${temp + 3}° / ${temp - 4}°`],
      ['partly', '明天', `${temp + 2}° / ${temp - 5}°`],
      ['sunny', '周六', `${temp + 4}° / ${temp - 3}°`],
      ['partly', '周日', `${temp + 3}° / ${temp - 4}°`],
    ],
  };
};

const activeCity = () => state.activeCity || '合肥';

const renderWeather = () => {
  const city = activeCity();
  const data = cityWeatherOf(city);
  $('#headerCityName').textContent = city;
  $('#headerCond').textContent = data.cond;
  $('#headerTemp').textContent = `${data.temp}°`;

  $('#weatherCityTitle').textContent = city;
  $('#weatherAqiKicker').textContent = `实时气象 · 空气${data.aqi < 50 ? '优' : data.aqi < 100 ? '良' : '轻度污染'} ${data.aqi}`;
  $('#weatherNowIcon').innerHTML = WEATHER_SVGS[data.icon];
  $('#weatherNowTemp').textContent = `${data.temp}°`;
  $('#weatherNowDesc').textContent = `${data.cond} · 体感 ${data.feel}°`;
  $('#weatherHumidity').textContent = data.hum;
  $('#weatherWind').textContent = data.wind;

  $('#weatherForecastList').innerHTML = data.fc
    .map(
      ([ic, day, range]) => `<article class="forecast-day">
        <div class="fc-icon">${WEATHER_SVGS[ic]}</div>
        <span>${day}</span>
        <small>${range}</small>
      </article>`
    )
    .join('');

  $('#cityCountLabel').textContent = `(${state.cities.length}/8)`;
  $('#cityOptions').innerHTML = state.cities
    .map(
      (c) => `<div class="city-chip${c === city ? ' active' : ''}" role="button" tabindex="0" data-city="${escapeHtml(c)}">
        <span>${escapeHtml(c)}</span>
        ${state.cities.length > 1 ? `<button class="city-chip-remove" type="button" data-remove-city="${escapeHtml(c)}" aria-label="移除 ${escapeHtml(c)}">×</button>` : ''}
      </div>`
    )
    .join('');

  const q = ($('#citySearchInput').value || '').trim();
  const pool = q ? Object.keys(CITY_WEATHER).filter((c) => c.includes(q) || c.includes(q.slice(0, 1))) : RECOMMEND_CITIES;
  $('#cityRecommendList').innerHTML = pool
    .slice(0, 8)
    .map((c) => {
      const exists = state.cities.includes(c);
      return `<button type="button" data-add-city="${escapeHtml(c)}" ${exists ? 'disabled' : ''}>${exists ? `✓ ${c}` : `＋ ${c}`}</button>`;
    })
    .join('') || '<span class="city-empty-tip">暂无匹配城市，可直接点击右侧「添加」自定义</span>';
  $('#weatherUpdateTime').textContent = `数据源中国气象 / Open-Meteo · ${state.weatherUpdatedLabel || '刚刚更新'}`;
};

const addCity = (city) => {
  const name = String(city || '').trim().replace(/\s+/g, '');
  if (!name) {
    showToast('请输入城市名称');
    return;
  }
  if (state.cities.includes(name)) {
    state.activeCity = name;
    renderWeather();
    showToast(`已切换到「${name}」`);
    return;
  }
  if (state.cities.length >= 8) {
    showToast('常用城市已达上限 8 个，请先移除一个');
    return;
  }
  state.cities.push(name);
  state.activeCity = name;
  saveState(true);
  renderWeather();
  showToast(`已添加城市「${name}」并切换`);
};

$('#cityOptions').addEventListener('click', (event) => {
  const rm = event.target.closest('[data-remove-city]');
  if (rm) {
    event.stopPropagation();
    const target = rm.dataset.removeCity;
    if (state.cities.length <= 1) return;
    state.cities = state.cities.filter((c) => c !== target);
    if (state.activeCity === target) state.activeCity = state.cities[0];
    saveState(true);
    renderWeather();
    showToast(`已移除城市「${target}」`);
    return;
  }
  const chip = event.target.closest('[data-city]');
  if (chip) {
    state.activeCity = chip.dataset.city;
    saveState();
    renderWeather();
    showToast(`已切换城市：${state.activeCity}`);
  }
});

$('#cityRecommendList').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-add-city]');
  if (!btn || btn.disabled) return;
  addCity(btn.dataset.addCity);
});

$('#citySearchInput').addEventListener('input', renderWeather);
$('#citySearchInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addCity(event.currentTarget.value);
    event.currentTarget.value = '';
    renderWeather();
  }
});

const toggleCityAddPanel = () => {
  const list = $('#cityAddList');
  list.classList.toggle('show');
  $('#cityAddToggle').textContent = list.classList.contains('show') ? '收起管理' : '＋ 添加城市';
};
$('#cityAddToggle').addEventListener('click', toggleCityAddPanel);
$('#cityQuickAddLink').addEventListener('click', toggleCityAddPanel);

$('#cityCustomAddBtn').addEventListener('click', () => {
  const input = $('#citySearchInput');
  addCity(input.value);
  input.value = '';
  renderWeather();
});

$('#weatherRefreshBtn').addEventListener('click', () => {
  state.weatherUpdatedLabel = `刚刚更新 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  saveState();
  renderWeather();
  showToast('气象数据已刷新');
});
/* ---------------- 日历与待办浮层（农历标注 + 未读徽标 + 增删改持久化） ---------------- */

const today = new Date();
const todayKey = kstamp(today);
let cursorYear = today.getFullYear();
let cursorMonth = today.getMonth();
let selectedKey = todayKey;

const seedTasks = () => {
  if (Object.keys(state.tasks).length) return;
  state.tasks[todayKey] = [
    { time: '09:30', title: '晨会：新标签页视觉改版对齐', category: '工作 · 产品研发组', type: 'work', done: true },
    { time: '14:00', title: '客户 UI 演示稿终审汇报', category: '会议 · 腾讯会议 882-910', type: 'meeting', done: false },
    { time: '20:30', title: '夜跑 5 公里与阅读半小时', category: '个人生活', type: 'personal', done: false },
  ];
};

const syncTaskBadge = () => {
  const list = state.tasks[todayKey] || [];
  const unread = list.filter((t) => !t.done).length;
  const badge = $('#headerTaskBadge');
  badge.textContent = unread > 99 ? '99+' : String(unread);
  badge.title = `今日 ${unread} 项未完成任务`;
  badge.style.display = unread > 0 ? 'inline-grid' : 'none';
};

const renderCalendar = () => {
  $('#monthTitle').textContent = `${cursorYear} 年 ${cursorMonth + 1} 月`;
  const midLunar = getLunarInfo(new Date(cursorYear, cursorMonth, 15));
  $('#monthLunarSub').textContent = `${midLunar.ganzhi} · 农历${midLunar.monthStr}`;

  const firstWeekday = new Date(cursorYear, cursorMonth, 1).getDay();
  const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
  const daysInPrev = new Date(cursorYear, cursorMonth, 0).getDate();
  const slots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = [];

  for (let i = 0; i < slots; i += 1) {
    if (i < firstWeekday) {
      const d = daysInPrev - firstWeekday + 1 + i;
      cells.push({ day: d, muted: true, lunar: getLunarInfo(new Date(cursorYear, cursorMonth - 1, d)) });
    } else if (i >= firstWeekday + daysInMonth) {
      const d = i - firstWeekday - daysInMonth + 1;
      cells.push({ day: d, muted: true, lunar: getLunarInfo(new Date(cursorYear, cursorMonth + 1, d)) });
    } else {
      const day = i - firstWeekday + 1;
      const key = `${cursorYear}-${pad(cursorMonth + 1)}-${pad(day)}`;
      cells.push({
        day,
        key,
        lunar: getLunarInfo(new Date(cursorYear, cursorMonth, day)),
        isToday: key === todayKey,
        isSelected: key === selectedKey,
        hasTask: Boolean((state.tasks[key] || []).length),
      });
    }
  }

  $('#calendarDays').innerHTML = cells
    .map((c) => {
      if (c.muted) {
        return `<button type="button" class="muted" tabindex="-1"><span class="cal-num">${c.day}</span><span class="cal-lunar">${c.lunar.cell}</span></button>`;
      }
      const cls = [c.isToday ? 'today' : '', c.isSelected ? 'selected' : '', c.hasTask ? 'has-task' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-key="${c.key}" aria-pressed="${c.isSelected}">
        <span class="cal-num">${c.day}</span>
        <span class="cal-lunar${c.lunar.isTerm ? ' is-term' : ''}">${c.lunar.cell}</span>
      </button>`;
    })
    .join('');

  renderAgenda();
  syncTaskBadge();
};

const TYPE_LABEL = { work: '工作事项', meeting: '日程会议', personal: '个人生活' };

const renderAgenda = () => {
  const [y, m, d] = selectedKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const lunar = getLunarInfo(date);
  $('#agendaDate').textContent = `${m} 月 ${d} 日`;
  $('#agendaWeek').textContent = `${WEEKDAY_SHORT[date.getDay()]} · ${lunar.short}`;
  const tasks = state.tasks[selectedKey] || [];
  if (!tasks.length) {
    $('#agendaList').innerHTML = '<div class="agenda-empty">当天暂无待办安排<br />点击右上角「＋ 新建待办」记录重要事项</div>';
    return;
  }
  $('#agendaList').innerHTML = tasks
    .map(
      (t, i) => `<article class="agenda-task ${t.type}${t.done ? ' done' : ''}">
          <div class="agenda-task-time">
            <button class="agenda-task-done${t.done ? ' done' : ''}" type="button" aria-pressed="${t.done}" data-i="${i}" title="切换完成状态">✓</button>
            <time>${escapeHtml(t.time)}</time>
          </div>
          <div class="agenda-task-body"><b>${escapeHtml(t.title)}</b><span>${escapeHtml(t.category || TYPE_LABEL[t.type] || '待办')}</span></div>
          <button class="agenda-task-edit" type="button" data-edit-task="${i}" title="编辑该事项" aria-label="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="agenda-task-del" type="button" data-rm-task="${i}" title="删除该事项" aria-label="删除">×</button>
        </article>`
    )
    .join('');
};

$('#calendarDays').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-key]');
  if (!btn) return;
  selectedKey = btn.dataset.key;
  renderCalendar();
});

$('#agendaList').addEventListener('click', (event) => {
  const doneBtn = event.target.closest('.agenda-task-done');
  if (doneBtn) {
    const tasks = state.tasks[selectedKey] || [];
    const idx = Number(doneBtn.dataset.i);
    if (tasks[idx]) tasks[idx].done = !tasks[idx].done;
    saveState();
    renderAgenda();
    syncTaskBadge();
    showToast(tasks[idx] && tasks[idx].done ? '待办已完成，继续加油' : '已恢复为未完成');
    return;
  }
  const editBtn = event.target.closest('[data-edit-task]');
  if (editBtn) {
    const tasks = state.tasks[selectedKey] || [];
    const idx = Number(editBtn.dataset.editTask);
    const task = tasks[idx];
    if (!task) return;
    const editor = $('#agendaEditor');
    $('#taskEditIndex').value = String(idx);
    $('#taskTitleInput').value = task.title;
    $('#taskTimeInput').value = task.time;
    $('#taskTypeSelect').value = task.type;
    $('#taskSubInput').value = (task.category || '').replace(/^(工作|会议|个人生活|日程会议|工作事项)\s*·?\s*/u, '');
    editor.classList.add('show');
    $('#taskTitleInput').focus();
    $('#agendaSubmitBtn').textContent = '保存修改';
    return;
  }
  const rmBtn = event.target.closest('[data-rm-task]');
  if (rmBtn) {
    const tasks = state.tasks[selectedKey] || [];
    const idx = Number(rmBtn.dataset.rmTask);
    const [removed] = tasks.splice(idx, 1);
    saveState();
    renderCalendar();
    if (removed) {
      showToast(`已删除待办「${removed.title}」`, {
        label: '撤销',
        onClick: () => {
          if (!state.tasks[selectedKey]) state.tasks[selectedKey] = [];
          state.tasks[selectedKey].splice(idx, 0, removed);
          saveState();
          renderCalendar();
          showToast('待办已恢复');
        },
      });
    }
  }
});

$('#prevMonth').addEventListener('click', () => {
  cursorMonth -= 1;
  if (cursorMonth < 0) {
    cursorMonth = 11;
    cursorYear -= 1;
  }
  renderCalendar();
});
$('#nextMonth').addEventListener('click', () => {
  cursorMonth += 1;
  if (cursorMonth > 11) {
    cursorMonth = 0;
    cursorYear += 1;
  }
  renderCalendar();
});
$('#backToday').addEventListener('click', () => {
  cursorYear = today.getFullYear();
  cursorMonth = today.getMonth();
  selectedKey = todayKey;
  renderCalendar();
  showToast('已回到今天');
});

const resetAgendaEditor = () => {
  $('#agendaEditor').classList.remove('show');
  $('#taskEditIndex').value = '-1';
  $('#taskTitleInput').value = '';
  $('#taskSubInput').value = '';
  $('#agendaSubmitBtn').textContent = '保存待办';
};

$('#agendaAdd').addEventListener('click', () => {
  const editor = $('#agendaEditor');
  if (editor.classList.contains('show') && $('#taskEditIndex').value === '-1') {
    resetAgendaEditor();
    return;
  }
  resetAgendaEditor();
  editor.classList.add('show');
  $('#taskTitleInput').focus();
});
$('#agendaCancel').addEventListener('click', resetAgendaEditor);

$('#agendaEditor').addEventListener('submit', (event) => {
  event.preventDefault();
  const titleInput = $('#taskTitleInput');
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    showToast('请填写待办内容');
    return;
  }
  const type = $('#taskTypeSelect').value;
  const time = $('#taskTimeInput').value || '10:00';
  const sub = $('#taskSubInput').value.trim();
  const category = sub ? `${TYPE_LABEL[type]} · ${sub}` : TYPE_LABEL[type];
  if (!state.tasks[selectedKey]) state.tasks[selectedKey] = [];
  const editIndex = Number($('#taskEditIndex').value);
  if (editIndex >= 0 && state.tasks[selectedKey][editIndex]) {
    state.tasks[selectedKey][editIndex] = { ...state.tasks[selectedKey][editIndex], time, title, category, type };
  } else {
    state.tasks[selectedKey].push({ time, title, category, type, done: false });
  }
  state.tasks[selectedKey].sort((a, b) => a.time.localeCompare(b.time));
  saveState(true);
  resetAgendaEditor();
  renderCalendar();
  showToast(editIndex >= 0 ? '待办已更新' : '已添加待办事项');
});

/* ---------------- 账号浮层 ---------------- */

const avatarChar = () => (state.username || 'Q').trim().charAt(0).toUpperCase() || 'Q';

const renderAccount = () => {
  const syncText = state.loggedIn ? '云端实时同步中 · 上次同步刚刚' : '未登录 · 数据仅保存在本机';
  $('#popUsername').textContent = state.username;
  $('#popAvatarChar').textContent = avatarChar();
  $('#headerAvatarChar').textContent = avatarChar();
  $('#drawerAvatarChar').textContent = avatarChar();
  $('#drawerUsername').textContent = state.username;
  $('#popPlanBadge').textContent = state.plan;
  $('#drawerPlanBadge').textContent = state.plan === 'PRO' ? '专业版' : '免费版';
  $('#popSyncStatus').textContent = syncText;
  $('#drawerAccountDesc').textContent = state.loggedIn ? '端到端加密同步正常 · 自动保存已启用' : '未登录，所有数据仅保存在本机浏览器';
  $('#popLoginActionLabel').textContent = state.loggedIn ? '退出当前账号' : '登录账号并开启同步';
  $('#headerAccountDot').style.display = state.loggedIn ? '' : 'none';
  $('#toggleLoginBtn').textContent = state.loggedIn ? '退出登录' : '登录账号';
  $('#accountSyncNowBtn').querySelector('span').textContent = state.loggedIn ? '立即云端同步' : '登录后开启同步';
};

$('#accountOpenSettings').addEventListener('click', () => {
  closeHeaderOverlays();
  openDrawer();
});
$('#accountSyncNowBtn').addEventListener('click', () => {
  if (!state.loggedIn) {
    showToast('请先登录账号后再同步');
    return;
  }
  showToast('正在同步…');
  window.setTimeout(() => {
    $('#popSyncStatus').textContent = `云端实时同步中 · 上次同步 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    showToast('云端同步完成，全部设置已备份');
  }, 700);
});
$('#accountNotesQuickBtn').addEventListener('click', () => {
  closeHeaderOverlays();
  openNotes();
});
$('#accountPopToggleLogin').addEventListener('click', () => {
  toggleLogin();
  closeHeaderOverlays();
});

const toggleLogin = () => {
  state.loggedIn = !state.loggedIn;
  saveState(true);
  renderAccount();
  showToast(state.loggedIn ? `已登录 ${state.username}，云端同步已开启` : '已退出登录，数据仍安全保存在本机');
};

/* ---------------- 侧边库：收藏夹 / 历史五视图 / 工具箱 / 稍后阅读 ---------------- */

const sideLibrary = $('#sideLibrary');
const homeShell = $('#homeShell');
const libraryTitle = $('#libraryTitle');
const libraryMark = $('#libraryMark');

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

const closeLibrary = () => {
  sideLibrary.classList.remove('open');
  homeShell.classList.remove('shifted');
  $$('.header-tab[data-pane]').forEach((tab) => tab.classList.remove('active'));
};

const openPane = (pane, opts = {}) => {
  const isOpen = sideLibrary.classList.contains('open') && libraryMark.dataset.pane === pane;
  if (isOpen && !opts.force) {
    closeLibrary();
    return;
  }
  libraryMark.dataset.pane = pane;
  libraryTitle.textContent = PANE_META[pane].title;
  libraryMark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PANE_META[pane].icon}</svg>`;
  $$('.library-pane-slot').forEach((slot) => slot.classList.toggle('show', slot.dataset.pane === pane));
  sideLibrary.classList.add('open');
  homeShell.classList.add('shifted');
  $$('.header-tab[data-pane]').forEach((tab) => tab.classList.toggle('active', tab.dataset.pane === pane));
  closeHeaderOverlays();
  closeDrawer();
  moveGrid();
};

$$('.header-tab[data-pane]').forEach((tab) => tab.addEventListener('click', () => openPane(tab.dataset.pane)));
$('#libraryClose').addEventListener('click', closeLibrary);

/* 侧栏调宽：200–1000px，默认 312px，宽度持久化 */
const resizeHandle = $('#libraryResizeHandle');
let resizingLib = false;
const applySidebarWidth = (width) => {
  state.sidebarWidth = Math.max(200, Math.min(1000, Math.round(width)));
  document.documentElement.style.setProperty('--side-library-width', `${state.sidebarWidth}px`);
  moveGrid();
};
applySidebarWidth(state.sidebarWidth);
resizeHandle.addEventListener('pointerdown', (event) => {
  resizingLib = true;
  resizeHandle.setPointerCapture(event.pointerId);
  resizeHandle.classList.add('dragging');
  document.body.classList.add('resizing-sidebar');
});
resizeHandle.addEventListener('pointermove', (event) => {
  if (!resizingLib) return;
  applySidebarWidth(event.clientX);
});
resizeHandle.addEventListener('pointerup', () => {
  if (!resizingLib) return;
  resizingLib = false;
  resizeHandle.classList.remove('dragging');
  document.body.classList.remove('resizing-sidebar');
  saveState(true);
  showToast(`侧栏宽度已保存：${state.sidebarWidth}px`);
});

/* ---- 收藏夹 ---- */
const folderOpenState = new Set(['f-work']);

const bookmarkMatches = (item, kw) => !kw || `${item.title} ${item.url}`.toLowerCase().includes(kw);

const renderBookmarks = () => {
  const kw = ($('#bmSearchInput').value || '').trim().toLowerCase();
  const { folders, items } = state.bookmarks;
  const total = items.length;
  $('#bmSyncCountText').textContent = `刚刚 · 共 ${total} 项`;
  $('#bmSyncStateText').textContent = state.syncDismissed ? '全部书签已同步' : '云端收藏已同步';
  $('#syncBanner').style.display = state.syncDismissed ? 'none' : 'flex';

  const html = folders
    .map((folder) => {
      const list = items.filter((b) => b.folder === folder.id && bookmarkMatches(b, kw));
      if (kw && !list.length) return '';
      const open = kw ? true : folderOpenState.has(folder.id);
      return `<div class="tree-folder-group${open ? ' open' : ''}" data-folder="${folder.id}">
        <div class="tree-row folder" role="button" tabindex="0">
          <span class="caret">${open ? '▾' : '▸'}</span>
          <span class="node-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </span>
          <span class="node-title">${escapeHtml(folder.name)}</span>
          <span class="tree-count">${list.length}</span>
          <button class="tree-folder-add" type="button" data-folder-add="${folder.id}" title="向该目录添加书签">＋</button>
        </div>
        <div class="tree-children">
          ${
            list.length
              ? list
                  .map(
                    (b) => `<a class="tree-row bookmark-row" href="${escapeHtml(b.url)}" target="_blank" rel="noopener" data-bookmark="${b.id}" title="${escapeHtml(b.url)}">
                      <span class="bm-favicon">${escapeHtml(b.title.charAt(0))}</span>
                      <span class="node-title">${escapeHtml(b.title)}</span>
                      <button class="tree-bm-del" type="button" data-del-bookmark="${b.id}" title="删除书签" aria-label="删除书签">×</button>
                    </a>`
                  )
                  .join('')
              : '<div class="tree-empty">该目录暂无书签</div>'
          }
        </div>
      </div>`;
    })
    .join('');

  $('#bookmarkTree').innerHTML =
    html ||
    `<div class="lib-empty">没有匹配「${escapeHtml(kw)}」的收藏，试试其他关键词，或点击上方「＋ 加书签」新建。</div>`;
};

$('#bookmarkTree').addEventListener('click', (event) => {
  const addBtn = event.target.closest('[data-folder-add]');
  if (addBtn) {
    event.preventDefault();
    event.stopPropagation();
    openBookmarkEditor(addBtn.dataset.folderAdd ? addBtn.dataset.folderAdd : undefined);
    return;
  }
  const del = event.target.closest('[data-del-bookmark]');
  if (del) {
    event.preventDefault();
    event.stopPropagation();
    const idx = state.bookmarks.items.findIndex((b) => b.id === del.dataset.delBookmark);
    const removed = state.bookmarks.items.splice(idx, 1)[0];
    saveState(true);
    renderBookmarks();
    if (removed) {
      showToast(`已删除书签「${removed.title}」`, {
        label: '撤销',
        onClick: () => {
          state.bookmarks.items.splice(idx, 0, removed);
          saveState(true);
          renderBookmarks();
          showToast('书签已恢复');
        },
      });
    }
    return;
  }
  const folderRow = event.target.closest('.tree-row.folder');
  if (folderRow) {
    const group = folderRow.closest('.tree-folder-group');
    const id = group.dataset.folder;
    const open = group.classList.toggle('open');
    if (open) folderOpenState.add(id);
    else folderOpenState.delete(id);
    const caret = folderRow.querySelector('.caret');
    if (caret) caret.textContent = open ? '▾' : '▸';
    return;
  }
  const bookmark = event.target.closest('a.bookmark-row');
  if (bookmark) showToast(`正在打开收藏：${bookmark.querySelector('.node-title').textContent}`);
});

$('#bmSearchInput').addEventListener('input', renderBookmarks);

const openBookmarkEditor = (folderId) => {
  const folders = state.bookmarks.folders;
  openModal({
    title: '添加收藏书签',
    subtitle: '保存后写入本地收藏夹并立即出现在侧边栏中',
    size: 'compact',
    body: `
      <label class="field-label">书签标题</label>
      <input class="rd-input" id="bmTitleInput" maxlength="60" autocomplete="off" placeholder="例如：新标签页视觉规范" />
      <label class="field-label">网址</label>
      <input class="rd-input" id="bmUrlInput" autocomplete="off" placeholder="https://…" />
      <label class="field-label">所属目录</label>
      <select class="rd-select" id="bmFolderSelect">
        ${folders.map((f) => `<option value="${f.id}"${f.id === folderId ? ' selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
      </select>
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="bmNewFolderInline">新建目录</button>
        <button class="primary-btn" type="button" id="bmSaveBtn">保存书签</button>
      </div>`,
    onMount: () => {
      $('#bmTitleInput').focus();
      $('#bmSaveBtn').addEventListener('click', () => {
        const title = $('#bmTitleInput').value.trim();
        const url = normalizeUrl($('#bmUrlInput').value);
        if (!title) return showToast('请填写书签标题');
        if (!url) return showToast('网址格式不正确');
        state.bookmarks.items.push({ id: uid('bm'), title, url, folder: $('#bmFolderSelect').value, added: kstamp() });
        saveState(true);
        renderBookmarks();
        closeModal();
        showToast(`已收藏「${title}」`);
      });
      $('#bmNewFolderInline').addEventListener('click', () => openFolderEditor());
    },
  });
};

const openFolderEditor = () => {
  openModal({
    title: '新建收藏目录',
    size: 'compact',
    body: `
      <label class="field-label">目录名称</label>
      <input class="rd-input" id="folderNameInput" maxlength="20" autocomplete="off" placeholder="例如：竞品调研" />
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="folderCancelBtn">取消</button>
        <button class="primary-btn" type="button" id="folderSaveBtn">创建目录</button>
      </div>`,
    onMount: () => {
      $('#folderNameInput').focus();
      $('#folderCancelBtn').addEventListener('click', closeModal);
      $('#folderSaveBtn').addEventListener('click', () => {
        const name = $('#folderNameInput').value.trim();
        if (!name) return showToast('请输入目录名称');
        const id = uid('f');
        state.bookmarks.folders.push({ id, name });
        folderOpenState.add(id);
        saveState(true);
        renderBookmarks();
        openBookmarkEditor(id);
        showToast(`已创建目录「${name}」`);
      });
    },
  });
};

$('#bmAddLinkBtn').addEventListener('click', () => openBookmarkEditor());
$('#bmNewFolderBtn').addEventListener('click', openFolderEditor);
$('#syncToLocalBtn').addEventListener('click', () => {
  state.syncDismissed = true;
  saveState(true);
  renderBookmarks();
  showToast('已把 4 项云端新增书签合并到本地');
});

$('#bmImportInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    let count = 0;
    const folderId = uid('f');
    state.bookmarks.folders.push({ id: folderId, name: `导入 · ${file.name.replace(/\.html?$/i, '')}` });
    anchors.forEach((a) => {
      const url = normalizeUrl(a.getAttribute('href'));
      const title = (a.textContent || '').trim() || domainOf(url);
      if (!url || !/^https?:/i.test(url)) return;
      state.bookmarks.items.push({ id: uid('bm'), title: title.slice(0, 80), url, folder: folderId, added: kstamp() });
      count += 1;
    });
    saveState(true);
    folderOpenState.add(folderId);
    renderBookmarks();
    showToast(count ? `已从 HTML 导入 ${count} 个书签` : '该文件里没有可导入的书签');
  } catch {
    showToast('导入失败，请确认是浏览器导出的 HTML 书签文件');
  }
  event.target.value = '';
});

/* ---- 历史记录（五个真实子视图） ---- */
let historyTab = 'history';

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
};

const groupName = (id) => (state.groups.find((g) => g.id === id) || {}).title || '未分组';
const groupColor = (id) => (state.groups.find((g) => g.id === id) || {}).color || '#4c86ff';

const renderHistorySubbar = () => {
  const bar = $('#historySubbar');
  const map = {
    history: `<span>共 <b>${state.history.length}</b> 条浏览记录</span><button type="button" class="mini-btn" id="clearHistoryBtn">清空历史</button>`,
    groups: `<span>共 <b>${state.groups.length}</b> 个标签组</span><button type="button" class="mini-btn" id="newGroupBtn">新建标签组</button>`,
    open: '<span>当前窗口 <b>3</b> 个标签 · 轻启演示页</span>',
    closed: `<span>最近关闭 <b>${state.closed.length}</b> 个标签</span><button type="button" class="mini-btn" id="clearClosedBtn">清空列表</button>`,
    snapshots: `<span>共 <b>${state.snapshots.length}</b> 个会话快照</span>`,
  };
  bar.innerHTML = map[historyTab];
  if (historyTab === 'history') {
    $('#clearHistoryBtn').addEventListener('click', () => {
      if (!state.history.length) return showToast('历史记录已经是空的了');
      const backup = state.history.slice();
      state.history = [];
      saveState(true);
      renderHistory();
      showToast('已清空全部历史记录', {
        label: '撤销',
        onClick: () => {
          state.history = backup;
          saveState(true);
          renderHistory();
          showToast('历史记录已恢复');
        },
      });
    });
  }
  if (historyTab === 'groups') $('#newGroupBtn').addEventListener('click', openGroupEditor);
  if (historyTab === 'closed') {
    $('#clearClosedBtn').addEventListener('click', () => {
      if (!state.closed.length) return showToast('最近关闭列表已经是空的');
      const backup = state.closed.slice();
      state.closed = [];
      saveState(true);
      renderHistory();
      showToast('已清空最近关闭列表', {
        label: '撤销',
        onClick: () => {
          state.closed = backup;
          saveState(true);
          renderHistory();
        },
      });
    });
  }
};

const renderHistory = () => {
  renderHistorySubbar();
  const kw = ($('#historySearchInput').value || '').trim().toLowerCase();
  const wrap = $('#historyGroup');
  const match = (text) => !kw || text.toLowerCase().includes(kw);

  if (historyTab === 'history') {
    const list = state.history.filter((h) => match(`${h.title} ${h.url} ${groupName(h.group)}`));
    wrap.innerHTML = list.length
      ? `<div class="hist-day">今天</div>${list
          .map(
            (h) => `<div class="hist-item" data-history="${h.id}">
              <span class="hist-dot" style="background:${groupColor(h.group)}"></span>
              <a class="hist-text" href="${escapeHtml(h.url)}" target="_blank" rel="noopener">
                <span class="hist-title">${escapeHtml(h.title)}</span>
                <span class="hist-meta">${escapeHtml(domainOf(h.url))} · ${escapeHtml(groupName(h.group))} · ${timeAgo(h.time)}</span>
              </a>
              <button class="hist-star${h.starred ? ' on' : ''}" type="button" data-star="${h.id}" title="收藏为星标">${h.starred ? '★' : '☆'}</button>
              <button class="hist-del" type="button" data-del-history="${h.id}" title="删除该条记录">×</button>
            </div>`
          )
          .join('')}`
      : `<div class="lib-empty">没有匹配「${escapeHtml(kw)}」的历史记录。</div>`;
    return;
  }

  if (historyTab === 'groups') {
    const list = state.groups.filter((g) => match(`${g.title} ${g.tabs.join(' ')}`));
    wrap.innerHTML = list.length
      ? list
          .map(
            (g) => `<div class="hist-group-card">
              <div class="hist-group-head">
                <span class="hist-group-dot" style="background:${g.color}"></span>
                <b>${escapeHtml(g.title)}</b>
                <small>${g.tabs.length} 个页面</small>
                <div class="hist-group-actions">
                  <button class="mini-btn" type="button" data-open-group="${g.id}">全部打开</button>
                  <button class="mini-btn danger" type="button" data-del-group="${g.id}">删除</button>
                </div>
              </div>
              ${g.tabs.map((t) => `<div class="hist-group-tab"><span>${escapeHtml(t)}</span><em>标签页</em></div>`).join('')}
            </div>`
          )
          .join('')
      : `<div class="lib-empty">还没有标签组，点击右上角「新建标签组」把当前页面归档。</div>`;
    return;
  }

  if (historyTab === 'open') {
    const tabs = [
      { title: '轻启 · 新标签页（当前页）', url: location.href, current: true },
      { title: '掘金 · 玻璃拟态落地实践', url: 'https://juejin.cn/post/7290000000000000001' },
      { title: 'Figma · 新标签页模板', url: 'https://www.figma.com/community/file/qingqi-newtab' },
    ];
    wrap.innerHTML = tabs
      .map(
        (t) => `<div class="hist-item open-tab${t.current ? ' current' : ''}">
          <span class="hist-dot" style="background:${t.current ? '#18a06a' : '#4c86ff'}"></span>
          <a class="hist-text" href="${escapeHtml(t.url)}" target="_blank" rel="noopener">
            <span class="hist-title">${escapeHtml(t.title)}</span>
            <span class="hist-meta">${escapeHtml(domainOf(t.url))} · ${t.current ? '当前激活' : '后台标签'}</span>
          </a>
          <button class="mini-btn" type="button" data-close-tab="${escapeHtml(t.title)}">关闭</button>
        </div>`
      )
      .join('');
    return;
  }

  if (historyTab === 'closed') {
    const list = state.closed.filter((c) => match(`${c.title} ${c.url}`));
    wrap.innerHTML = list.length
      ? list
          .map(
            (c) => `<div class="hist-item">
              <span class="hist-dot" style="background:#d4881c"></span>
              <a class="hist-text" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">
                <span class="hist-title">${escapeHtml(c.title)}</span>
                <span class="hist-meta">${escapeHtml(domainOf(c.url))} · 关闭于 ${timeAgo(c.closedAt)}</span>
              </a>
              <button class="mini-btn" type="button" data-restore-closed="${c.id}">恢复</button>
            </div>`
          )
          .join('')
      : `<div class="lib-empty">最近没有关闭的标签页。</div>`;
    return;
  }

  const list = state.snapshots.filter((s) => match(`${s.title} ${s.pages.join(' ')}`));
  wrap.innerHTML = list.length
    ? list
        .map(
          (s) => `<div class="hist-group-card">
            <div class="hist-group-head">
              <span class="hist-group-dot" style="background:#8e56e2"></span>
              <b>${escapeHtml(s.title)}</b>
              <small>${timeAgo(s.time)}</small>
              <div class="hist-group-actions">
                <button class="mini-btn" type="button" data-restore-snapshot="${s.id}">恢复会话</button>
                <button class="mini-btn danger" type="button" data-del-snapshot="${s.id}">删除</button>
              </div>
            </div>
            ${s.pages.slice(0, 4).map((p) => `<div class="hist-group-tab"><span>${escapeHtml(p)}</span><em>快照页面</em></div>`).join('')}
          </div>`
        )
        .join('')
    : `<div class="lib-empty">还没有会话快照。</div>`;
};

const openGroupEditor = () => {
  openModal({
    title: '新建标签组',
    subtitle: '把当前打开的页面归档成一个标签组，随时一键恢复',
    size: 'compact',
    body: `
      <label class="field-label">标签组名称</label>
      <input class="rd-input" id="groupNameInput" maxlength="20" autocomplete="off" placeholder="例如：竞品调研" />
      <label class="field-label">页面（每行一个标题）</label>
      <textarea class="rd-textarea" id="groupTabsInput" rows="3" placeholder="轻启文档&#10;Figma 设计稿"></textarea>
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="groupCancelBtn">取消</button>
        <button class="primary-btn" type="button" id="groupSaveBtn">创建标签组</button>
      </div>`,
    onMount: () => {
      $('#groupNameInput').focus();
      $('#groupCancelBtn').addEventListener('click', closeModal);
      $('#groupSaveBtn').addEventListener('click', () => {
        const title = $('#groupNameInput').value.trim();
        if (!title) return showToast('请填写标签组名称');
        const tabs = $('#groupTabsInput')
          .value.split('\n')
          .map((t) => t.trim())
          .filter(Boolean);
        const colors = ['#4c86ff', '#18a06a', '#d4881c', '#8e56e2'];
        state.groups.push({ id: uid('g'), title, color: colors[state.groups.length % colors.length], tabs: tabs.length ? tabs : ['轻启 · 新标签页'] });
        saveState(true);
        historyTab = 'groups';
        $$('#historyTabs .hp-tab').forEach((t) => t.classList.toggle('active', t.dataset.htab === 'groups'));
        renderHistory();
        closeModal();
        showToast(`已创建标签组「${title}」`);
      });
    },
  });
};

$('#historyTabs').addEventListener('click', (event) => {
  const tab = event.target.closest('.hp-tab');
  if (!tab) return;
  historyTab = tab.dataset.htab;
  $$('#historyTabs .hp-tab').forEach((t) => t.classList.toggle('active', t === tab));
  renderHistory();
});
$('#historySearchInput').addEventListener('input', renderHistory);

$('#historyGroup').addEventListener('click', (event) => {
  const star = event.target.closest('[data-star]');
  if (star) {
    const item = state.history.find((h) => h.id === star.dataset.star);
    if (!item) return;
    item.starred = !item.starred;
    saveState();
    renderHistory();
    showToast(item.starred ? '已加星标，稍后可在收藏夹查看' : '已取消星标');
    return;
  }
  const del = event.target.closest('[data-del-history]');
  if (del) {
    const idx = state.history.findIndex((h) => h.id === del.dataset.delHistory);
    const removed = state.history.splice(idx, 1)[0];
    saveState(true);
    renderHistory();
    if (removed) {
      showToast('已删除该条历史', {
        label: '撤销',
        onClick: () => {
          state.history.splice(idx, 0, removed);
          saveState(true);
          renderHistory();
        },
      });
    }
    return;
  }
  const openGroup = event.target.closest('[data-open-group]');
  if (openGroup) {
    const group = state.groups.find((g) => g.id === openGroup.dataset.openGroup);
    if (group) showToast(`正在恢复标签组「${group.title}」的 ${group.tabs.length} 个页面`);
    return;
  }
  const delGroup = event.target.closest('[data-del-group]');
  if (delGroup) {
    const idx = state.groups.findIndex((g) => g.id === delGroup.dataset.delGroup);
    const removed = state.groups.splice(idx, 1)[0];
    saveState(true);
    renderHistory();
    if (removed) {
      showToast(`已删除标签组「${removed.title}」`, {
        label: '撤销',
        onClick: () => {
          state.groups.splice(idx, 0, removed);
          saveState(true);
          renderHistory();
        },
      });
    }
    return;
  }
  const closeTab = event.target.closest('[data-close-tab]');
  if (closeTab) {
    const title = closeTab.dataset.closeTab;
    const item = { id: uid('c'), title, url: location.href, closedAt: nowISO() };
    state.closed.unshift(item);
    saveState(true);
    renderHistory();
    showToast('标签已关闭，可在「最近关闭」中恢复');
    return;
  }
  const restore = event.target.closest('[data-restore-closed]');
  if (restore) {
    const idx = state.closed.findIndex((c) => c.id === restore.dataset.restoreClosed);
    const removed = state.closed.splice(idx, 1)[0];
    saveState(true);
    renderHistory();
    if (removed) showToast(`已恢复标签「${removed.title}」`);
    return;
  }
  const snapshot = event.target.closest('[data-restore-snapshot]');
  if (snapshot) {
    const snap = state.snapshots.find((s) => s.id === snapshot.dataset.restoreSnapshot);
    if (snap) showToast(`已恢复会话「${snap.title}」共 ${snap.pages.length} 个页面`);
    return;
  }
  const delSnap = event.target.closest('[data-del-snapshot]');
  if (delSnap) {
    const idx = state.snapshots.findIndex((s) => s.id === delSnap.dataset.delSnapshot);
    const removed = state.snapshots.splice(idx, 1)[0];
    saveState(true);
    renderHistory();
    if (removed) showToast(`已删除快照「${removed.title}」`);
  }
});
/* ---------------- 工具箱：点击任一工具在桌面打开真实可用的工作台 ---------------- */

const TOOL_TITLES = {
  json: { title: 'JSON 格式化与校验', subtitle: '本地实时解析，不会上传任何数据' },
  qrcode: { title: '网址与文本二维码', subtitle: '离线生成真可扫描的二维码，可导出 PNG' },
  mp4tomp3: { title: 'MP4 无损提取音频', subtitle: '在浏览器本地解码音轨，试听并导出 WAV' },
  booster: { title: '音频人声智能放大', subtitle: '100%–300% 实时增益 + 动态压缩防爆音' },
  trimmer: { title: 'MP3 可视化波形剪辑', subtitle: '真实声波绘制，拖拽区间裁剪并导出' },
};

const openTool = (key) => {
  const meta = TOOL_TITLES[key];
  if (!meta) {
    showToast('该工具即将上线');
    return;
  }
  const tools = window.QingqiTools;
  if (!tools || typeof tools[key] !== 'function') {
    openModal({
      title: meta.title,
      subtitle: meta.subtitle,
      body: '<div class="tool-fallback">工具脚本尚未加载完成，请刷新页面后重试。</div>',
      size: 'compact',
    });
    return;
  }
  const tpl = tools[key]();
  openModal({
    title: tpl.title || meta.title,
    subtitle: tpl.subtitle || meta.subtitle,
    size: tpl.size || 'wide',
    body: tpl.body,
    onMount: (root) => {
      if (typeof tpl.mount === 'function') {
        tpl.mount(root, { toast: showToast, close: closeModal });
      }
    },
  });
};

$$('.tool-entry[data-open-tool]').forEach((entry) => {
  entry.addEventListener('click', () => openTool(entry.dataset.openTool));
});

$('#toolSearchInput').addEventListener('input', (event) => {
  const kw = event.currentTarget.value.trim().toLowerCase();
  $$('.toolbox-pane .tool-entry').forEach((row) => {
    row.style.display = !kw || row.textContent.toLowerCase().includes(kw) ? '' : 'none';
  });
});

/* ---------------- 稍后阅读（精读队列 + 沉浸式阅读器） ---------------- */

const rlFiltered = () =>
  state.readLater.filter((item) => (state.readLaterFilter === 'done' ? item.read : !item.read));

const renderReadLater = () => {
  $$('#rlFilterTabs .hp-tab').forEach((t) => t.classList.toggle('active', t.dataset.rlfilter === state.readLaterFilter));
  const list = rlFiltered();
  const unread = state.readLater.filter((i) => !i.read).length;
  const badge = $('#readLaterBadge');
  badge.textContent = String(unread);
  badge.style.display = unread ? 'inline-grid' : 'none';
  $('#rlList').innerHTML = list.length
    ? list
        .map(
          (item) => `<article class="rl-item${item.read ? ' is-read' : ''}" data-rl="${item.id}">
            <div class="rl-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h11a1.8 1.8 0 0 1 1.8 1.8v15.2L12 16.8l-7.3 3.7V5.3a1.8 1.8 0 0 1 1.8-1.8Z"/></svg>
            </div>
            <div class="rl-main">
              <b>${escapeHtml(item.title)}</b>
              <div class="rl-meta"><span>${escapeHtml(item.source)}</span><i></i><span>${item.minutes} 分钟</span><i></i><span>${item.read ? '已读完' : `进度 ${item.progress || 0}%`}</span></div>
              <p class="rl-tip">${escapeHtml(item.excerpt.slice(0, 54))}…</p>
            </div>
            <div class="rl-actions">
              <button class="rl-status${item.read ? ' done' : ''}" type="button" data-rl-toggle="${item.id}">${item.read ? '✓ 已读' : '标记已读'}</button>
              <button class="rl-open" type="button" data-rl-open="${item.id}">阅读</button>
              <button class="rl-del" type="button" data-rl-del="${item.id}" aria-label="删除">×</button>
            </div>
          </article>`
        )
        .join('')
    : `<div class="lib-empty">${state.readLaterFilter === 'unread' ? '待阅读队列已清空，去「暂存文章」添加一篇吧。' : '还没有读完的文章。'}</div>`;
};

$('#rlFilterTabs').addEventListener('click', (event) => {
  const tab = event.target.closest('.hp-tab');
  if (!tab) return;
  state.readLaterFilter = tab.dataset.rlfilter;
  saveState();
  renderReadLater();
});

$('#rlList').addEventListener('click', (event) => {
  const toggle = event.target.closest('[data-rl-toggle]');
  if (toggle) {
    const item = state.readLater.find((i) => i.id === toggle.dataset.rlToggle);
    if (!item) return;
    item.read = !item.read;
    item.progress = item.read ? 100 : Math.min(item.progress || 0, 99);
    saveState(true);
    renderReadLater();
    showToast(item.read ? '已标记为读完，真棒' : '已移回待阅读');
    return;
  }
  const open = event.target.closest('[data-rl-open]');
  if (open) {
    openReader(open.dataset.rlOpen);
    return;
  }
  const del = event.target.closest('[data-rl-del]');
  if (del) {
    const idx = state.readLater.findIndex((i) => i.id === del.dataset.rlDel);
    const removed = state.readLater.splice(idx, 1)[0];
    saveState(true);
    renderReadLater();
    if (removed) {
      showToast(`已移除「${removed.title.slice(0, 14)}…」`, {
        label: '撤销',
        onClick: () => {
          state.readLater.splice(idx, 0, removed);
          saveState(true);
          renderReadLater();
        },
      });
    }
  }
});

const readerParagraphs = (item) => {
  const extra = [
    '新标签页是浏览器里出现频率最高的页面。它既要足够安静，不打扰当前正在做的事；也要足够高效，让搜索、导航与常用工具都在一屏之内完成。',
    '在真实的产品实现里，我们把「首屏」与「二级面板」分成两层：首屏只保留时钟、搜索、快捷访问三件事，其余能力统统收进右侧侧栏与设置抽屉，需要时一步可达。',
    '视觉上采用三层毛玻璃：贴近壁纸的柔和层负责承托氛围，标准层承载卡片与列表，强玻璃层用于弹出面板。1px 亮边与柔和投影共同营造出通透的“厚度感”。',
    '深色外观与壁纸明暗是两套彼此独立的语义：壁纸只影响直接压在画面上的时钟与一言文字，而面板始终使用自己的语义令牌，因此任何组合下都不会出现看不清的情况。',
  ];
  return [item.excerpt, ...extra];
};

const openReader = (id) => {
  const item = state.readLater.find((i) => i.id === id);
  if (!item) return;
  const paragraphs = readerParagraphs(item);
  openModal({
    title: item.title,
    subtitle: `${item.source} · 约 ${item.minutes} 分钟 · 已自动保存阅读进度`,
    size: 'reader',
    body: `
      <div class="reader-meta">
        <span class="reader-chip">精读模式</span>
        <span class="reader-chip ghost">${escapeHtml(item.source)}</span>
        <div class="reader-progress"><i style="width:${item.progress || 0}%"></i></div>
        <b id="readerProgressLabel">${item.progress || 0}%</b>
      </div>
      <article class="reader-article">${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</article>
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="readerMarkRead">${item.read ? '移回待阅读' : '标记为已读完'}</button>
        <a class="primary-btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">打开原文</a>
      </div>`,
    onMount: (root) => {
      const article = root.querySelector('.reader-article');
      const bar = root.querySelector('.reader-progress i');
      const label = root.querySelector('#readerProgressLabel');
      const update = () => {
        const scrollable = article.scrollHeight - article.clientHeight;
        const ratio = scrollable > 0 ? Math.min(100, Math.round((article.scrollTop / scrollable) * 100)) : 100;
        const value = Math.max(item.progress || 0, ratio);
        bar.style.width = `${value}%`;
        label.textContent = `${value}%`;
        item.progress = value;
      };
      article.addEventListener('scroll', update);
      article.scrollTop = ((item.progress || 0) / 100) * (article.scrollHeight - article.clientHeight);
      const mark = root.querySelector('#readerMarkRead');
      mark.addEventListener('click', () => {
        item.read = !item.read;
        item.progress = item.read ? 100 : Math.min(item.progress || 0, 90);
        saveState(true);
        renderReadLater();
        closeModal();
        showToast(item.read ? '已标记读完并归档' : '已移回待阅读');
      });
      modalBody.addEventListener('click', () => saveState());
    },
  });
};

$('#rlAddArticleBtn').addEventListener('click', () => {
  openModal({
    title: '暂存一篇文章',
    subtitle: '先存下来，等有空再慢慢读；内容只保存在本机',
    size: 'compact',
    body: `
      <label class="field-label">文章标题</label>
      <input class="rd-input" id="rlTitleInput" maxlength="60" autocomplete="off" placeholder="例如：新标签页设计的三条原则" />
      <label class="field-label">来源</label>
      <input class="rd-input" id="rlSourceInput" maxlength="20" autocomplete="off" placeholder="例如：少数派 / 掘金" value="手动收藏" />
      <label class="field-label">原文链接</label>
      <input class="rd-input" id="rlUrlInput" autocomplete="off" placeholder="https://…" />
      <label class="field-label">摘要 / 想记住的一句话</label>
      <textarea class="rd-textarea" id="rlExcerptInput" rows="3" maxlength="300" placeholder="粘贴一段摘要，阅读器会围绕它展开排版…"></textarea>
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="rlCancelBtn">取消</button>
        <button class="primary-btn" type="button" id="rlSaveBtn">加入稍后阅读</button>
      </div>`,
    onMount: () => {
      $('#rlTitleInput').focus();
      $('#rlCancelBtn').addEventListener('click', closeModal);
      $('#rlSaveBtn').addEventListener('click', () => {
        const title = $('#rlTitleInput').value.trim();
        if (!title) return showToast('请填写文章标题');
        const url = normalizeUrl($('#rlUrlInput').value) || 'https://sspai.com/post/newtab-light';
        const excerpt = $('#rlExcerptInput').value.trim() || '这篇文章被暂存进稍后阅读队列，等待一个安静的午后。';
        state.readLater.unshift({
          id: uid('rl'),
          title,
          source: $('#rlSourceInput').value.trim() || '手动收藏',
          url,
          excerpt,
          minutes: Math.max(3, Math.round(excerpt.length / 60) + 3),
          read: false,
          addedAt: nowISO(),
          progress: 0,
        });
        state.readLaterFilter = 'unread';
        saveState(true);
        renderReadLater();
        closeModal();
        showToast(`已加入稍后阅读：${title.slice(0, 16)}`);
      });
    },
  });
});

/* ---------------- 随手便签 ---------------- */

const syncNotesBadge = () => {
  const badge = $('#notesCountBadge');
  if (badge) badge.textContent = String(state.notes.length);
};

const renderNotes = (root) => {
  const list = root.querySelector('#notesList');
  if (!list) return;
  list.innerHTML = state.notes.length
    ? state.notes
        .map(
          (n) => `<article class="note-item" data-note="${n.id}">
            <span class="note-dot"></span>
            <p contenteditable="true" class="note-text" spellcheck="false">${escapeHtml(n.text)}</p>
            <div class="note-actions">
              <small>${timeAgo(n.updatedAt)}</small>
              <button type="button" class="note-del" data-note-del="${n.id}" aria-label="删除便签">×</button>
            </div>
          </article>`
        )
        .join('')
    : '<div class="lib-empty">还没有便签，写下第一条灵感吧。</div>';
  syncNotesBadge();
};

const openNotes = () => {
  openModal({
    title: '随手便签',
    subtitle: '所有便签自动保存在本机，支持直接点击文字编辑',
    size: 'compact',
    body: `
      <form class="note-compose" id="noteCompose">
        <textarea class="rd-textarea" id="noteInput" rows="2" maxlength="200" placeholder="记录一条灵感、待办或想法…（⌘/Ctrl + Enter 快速保存）"></textarea>
        <button class="primary-btn" type="submit">保存便签</button>
      </form>
      <div class="notes-list" id="notesList"></div>
      <p class="field-tip">共 <b id="notesTotal">0</b> 条便签 · 点击文字即可编辑，失焦自动保存</p>`,
    onMount: (root) => {
      renderNotes(root);
      root.querySelector('#notesTotal').textContent = String(state.notes.length);
      const input = root.querySelector('#noteInput');
      input.focus();
      root.querySelector('#noteCompose').addEventListener('submit', (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return showToast('先写点什么吧');
        state.notes.unshift({ id: uid('n'), text, updatedAt: nowISO() });
        input.value = '';
        saveState(true);
        renderNotes(root);
        root.querySelector('#notesTotal').textContent = String(state.notes.length);
        showToast('便签已保存');
      });
      input.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          root.querySelector('#noteCompose').requestSubmit();
        }
      });
      root.addEventListener('click', (event) => {
        const del = event.target.closest('[data-note-del]');
        if (!del) return;
        const idx = state.notes.findIndex((n) => n.id === del.dataset.noteDel);
        const removed = state.notes.splice(idx, 1)[0];
        saveState(true);
        renderNotes(root);
        root.querySelector('#notesTotal').textContent = String(state.notes.length);
        if (removed) {
          showToast('便签已删除', {
            label: '撤销',
            onClick: () => {
              state.notes.splice(idx, 0, removed);
              saveState(true);
              if (modalBody.querySelector('#notesList')) renderNotes(modalBody);
            },
          });
        }
      });
      root.addEventListener(
        'blur',
        (event) => {
          const text = event.target.closest('.note-text');
          if (!text) return;
          const note = state.notes.find((n) => n.id === text.closest('[data-note]').dataset.note);
          if (!note) return;
          const value = text.textContent.trim();
          if (!value) return;
          note.text = value;
          note.updatedAt = nowISO();
          saveState();
          showToast('便签已自动保存');
        },
        true
      );
    },
  });
};

$('#openNotesBtn').addEventListener('click', () => {
  closeHeaderOverlays();
  openNotes();
});
$('#accountNotesQuickBtn').addEventListener('click', () => {
  closeHeaderOverlays();
  openNotes();
});

/* ---------------- 番茄专注（后台计时 + 页头常驻胶囊） ---------------- */

const pomo = { mode: 'focus', remaining: 25 * 60, running: false, timer: null, rounds: 0 };

const POMO_LABEL = { focus: '专注', short: '短休息', long: '长休息' };
const fmtPomo = (sec) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;

const renderPomo = () => {
  const pill = $('#pomoHeaderPill');
  const text = $('#pomoHeaderText');
  const hint = $('#pomoMenuHint');
  if (pomo.running || pomo.remaining < (pomo.mode === 'focus' ? 25 * 60 : 5 * 60)) {
    pill.style.display = 'inline-flex';
  } else {
    pill.style.display = 'none';
  }
  text.textContent = `${POMO_LABEL[pomo.mode]} ${fmtPomo(pomo.remaining)}`;
  pill.classList.toggle('is-break', pomo.mode !== 'focus');
  if (hint) hint.textContent = `${POMO_LABEL[pomo.mode]} ${fmtPomo(pomo.remaining)}`;
  const root = modalBody.querySelector('#pomoRoot');
  if (root) {
    root.querySelector('#pomoTime').textContent = fmtPomo(pomo.remaining);
    root.querySelector('#pomoModeLabel').textContent = pomo.mode === 'focus' ? '专注中' : '休息一下';
    root.querySelector('#pomoRounds').textContent = String(pomo.rounds);
    root.querySelector('#pomoToggle').textContent = pomo.running ? '暂停' : pomo.mode === 'focus' ? '开始专注' : '开始休息';
    root.querySelector('.pomo-progress i').style.width = `${
      pomo.mode === 'focus' ? 100 - (pomo.remaining / (25 * 60)) * 100 : 100 - (pomo.remaining / (5 * 60)) * 100
    }%`;
    root.querySelectorAll('.pomo-mode-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.pomoMode === pomo.mode));
  }
};

const stopPomoTimer = () => {
  if (pomo.timer) window.clearInterval(pomo.timer);
  pomo.timer = null;
  pomo.running = false;
};

const setPomoMode = (mode) => {
  stopPomoTimer();
  pomo.mode = mode;
  pomo.remaining = mode === 'focus' ? 25 * 60 : mode === 'long' ? 15 * 60 : 5 * 60;
  renderPomo();
};

const startPomoTimer = () => {
  if (pomo.running) return;
  pomo.running = true;
  pomo.timer = window.setInterval(() => {
    if (pomo.remaining > 0) {
      pomo.remaining -= 1;
      renderPomo();
      return;
    }
    stopPomoTimer();
    if (pomo.mode === 'focus') {
      pomo.rounds += 1;
      pomo.mode = 'short';
      pomo.remaining = 5 * 60;
      showToast('专注完成！休息 5 分钟，起来活动一下', { label: '开始休息', onClick: startPomoTimer });
    } else {
      pomo.mode = 'focus';
      pomo.remaining = 25 * 60;
      showToast('休息结束，开始下一轮专注', { label: '开始专注', onClick: startPomoTimer });
    }
    renderPomo();
  }, 1000);
  renderPomo();
};

const openPomodoro = () => {
  openModal({
    title: '番茄专注',
    subtitle: '计时会在后台继续运行，页头胶囊随时可见',
    size: 'compact',
    body: `
      <div class="pomo-root" id="pomoRoot">
        <div class="pomo-ring">
          <span id="pomoTime">25:00</span>
          <small id="pomoModeLabel">专注中</small>
        </div>
        <div class="pomo-progress"><i></i></div>
        <div class="pomo-modes">
          <button type="button" class="pomo-mode-btn active" data-pomo-mode="focus">专注 25 分钟</button>
          <button type="button" class="pomo-mode-btn" data-pomo-mode="short">短休息 5 分钟</button>
          <button type="button" class="pomo-mode-btn" data-pomo-mode="long">长休息 15 分钟</button>
        </div>
        <div class="pomo-stats">今日已完成 <b id="pomoRounds">0</b> 个番茄 · 累计专注 <b id="pomoMinutes">0</b> 分钟</div>
        <div class="rd-modal-actions center">
          <button class="ghost-btn" type="button" id="pomoReset">重新计时</button>
          <button class="primary-btn" type="button" id="pomoToggle">开始专注</button>
        </div>
      </div>`,
    onMount: (root) => {
      renderPomo();
      root.querySelector('#pomoToggle').addEventListener('click', () => {
        if (pomo.running) {
          stopPomoTimer();
          renderPomo();
          showToast('已暂停计时');
        } else {
          startPomoTimer();
          showToast('专注开始，保持节奏');
        }
      });
      root.querySelector('#pomoReset').addEventListener('click', () => {
        setPomoMode(pomo.mode);
        showToast('计时已重置');
      });
      root.querySelectorAll('.pomo-mode-btn').forEach((btn) =>
        btn.addEventListener('click', () => {
          setPomoMode(btn.dataset.pomoMode);
          showToast(`已切换到${POMO_LABEL[btn.dataset.pomoMode]}模式`);
        })
      );
      const minutes = root.querySelector('#pomoMinutes');
      if (minutes) minutes.textContent = String(pomo.rounds * 25);
    },
  });
};

$('#openPomodoroBtn').addEventListener('click', () => {
  closeHeaderOverlays();
  openPomodoro();
});
$('#pomoHeaderPill').addEventListener('click', openPomodoro);
/* ---------------- 隐私空间（Alt + Q，本地密码 + 独立私密内容） ---------------- */

const ensurePrivateData = () => {
  if (!Array.isArray(state.privateNotes)) {
    state.privateNotes = [
      { id: uid('pn'), text: '私密空间示例：这里的内容不会出现在普通便签与收藏夹中。' },
      { id: uid('pn'), text: '把需要单独存放的账号备忘、灵感草稿放在这里。' },
    ];
  }
  if (!Array.isArray(state.privateBookmarks)) {
    state.privateBookmarks = [{ id: uid('pb'), title: '个人预算表（示例）', url: 'https://docs.qq.com/sheet/private-demo' }];
  }
};

const renderPrivateStage = (stage) => {
  const box = $('#privateStage');
  if (!box) return;
  ensurePrivateData();
  if (stage === 'unlock') {
    box.innerHTML = `
      <div class="private-lock">
        <div class="private-lock-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1.4" fill="currentColor"/></svg>
        </div>
        <h4>输入隐私空间密码</h4>
        <p>密码仅保存在本机浏览器，用于隔开私密便签与私密书签。</p>
        <input class="rd-input private-password-input" id="privatePasswordInput" type="password" placeholder="请输入密码" autocomplete="off" />
        <div class="rd-modal-actions center">
          <button class="ghost-btn" type="button" id="privateResetPwd">忘记密码？重置</button>
          <button class="primary-btn" type="button" id="privateUnlockBtn">解锁隐私空间</button>
        </div>
      </div>`;
    $('#privatePasswordInput').focus();
    $('#privateUnlockBtn').addEventListener('click', () => {
      if ($('#privatePasswordInput').value === state.privatePassword) {
        renderPrivateStage('content');
        showToast('隐私空间已解锁');
      } else {
        showToast('密码不正确，请重试');
      }
    });
    $('#privatePasswordInput').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') $('#privateUnlockBtn').click();
    });
    $('#privateResetPwd').addEventListener('click', () => {
      state.privatePassword = '';
      saveState(true);
      renderPrivateStage('setup');
      showToast('已清除旧密码，请设置新密码');
    });
    return;
  }

  if (stage === 'setup') {
    box.innerHTML = `
      <div class="private-lock">
        <div class="private-lock-icon setup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v6a9 9 0 0 0 7.5 8.9A9 9 0 0 0 19.5 12V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>
        </div>
        <h4>首次使用，设置一个密码</h4>
        <p>建议使用 4–12 位数字或字母组合，仅用于本机隐私空间解锁。</p>
        <input class="rd-input private-password-input" id="privateNewPwd" type="password" placeholder="设置密码（至少 4 位）" autocomplete="off" />
        <input class="rd-input private-password-input" id="privateNewPwd2" type="password" placeholder="再次输入确认" autocomplete="off" />
        <div class="rd-modal-actions center">
          <button class="primary-btn" type="button" id="privateSetPwdBtn">保存密码并进入</button>
        </div>
        <p class="private-hint">忘记密码可在解锁页一键重置，私密内容仍然保留在本机。</p>
      </div>`;
    $('#privateNewPwd').focus();
    $('#privateSetPwdBtn').addEventListener('click', () => {
      const pwd = $('#privateNewPwd').value.trim();
      const pwd2 = $('#privateNewPwd2').value.trim();
      if (pwd.length < 4) return showToast('密码至少需要 4 位');
      if (pwd !== pwd2) return showToast('两次输入的密码不一致');
      state.privatePassword = pwd;
      saveState(true);
      renderPrivateStage('content');
      showToast('密码已保存，隐私空间已开启');
    });
    return;
  }

  box.innerHTML = `
    <div class="private-panel">
      <div class="private-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="3"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
        <span>隐私空间已解锁 · 内容仅保存在本机，不会进入普通收藏与便签</span>
        <button class="mini-btn" type="button" id="privateLockAgain">立即上锁</button>
      </div>
      <div class="private-columns">
        <section class="private-block">
          <div class="private-block-head"><b>私密便签</b><button class="mini-btn" type="button" id="privateAddNote">＋ 新增</button></div>
          <div class="private-note-list" id="privateNoteList"></div>
        </section>
        <section class="private-block">
          <div class="private-block-head"><b>私密书签</b><button class="mini-btn" type="button" id="privateAddBookmark">＋ 新增</button></div>
          <div class="private-bookmark-list" id="privateBookmarkList"></div>
        </section>
      </div>
    </div>`;

  const renderPrivateLists = () => {
    const notes = $('#privateNoteList');
    const marks = $('#privateBookmarkList');
    if (notes) {
      notes.innerHTML = state.privateNotes.length
        ? state.privateNotes
            .map(
              (n) => `<div class="private-note" data-private-note="${n.id}">
                <p contenteditable="true">${escapeHtml(n.text)}</p>
                <button type="button" data-pn-del="${n.id}" aria-label="删除">×</button>
              </div>`
            )
            .join('')
        : '<div class="lib-empty">还没有私密便签。</div>';
    }
    if (marks) {
      marks.innerHTML = state.privateBookmarks.length
        ? state.privateBookmarks
            .map(
              (b) => `<div class="private-mark">
                <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener">${escapeHtml(b.title)}</a>
                <button type="button" data-pb-del="${b.id}" aria-label="删除">×</button>
              </div>`
            )
            .join('')
        : '<div class="lib-empty">还没有私密书签。</div>';
    }
  };
  renderPrivateLists();

  $('#privateLockAgain').addEventListener('click', () => renderPrivateStage('unlock'));
  $('#privateAddNote').addEventListener('click', () => {
    const text = window.prompt('输入私密便签内容');
    if (!text) return;
    state.privateNotes.unshift({ id: uid('pn'), text });
    saveState(true);
    renderPrivateLists();
    showToast('私密便签已保存');
  });
  $('#privateAddBookmark').addEventListener('click', () => {
    const title = window.prompt('私密书签标题');
    if (!title) return;
    const url = normalizeUrl(window.prompt('私密书签网址', 'https://') || '');
    if (!url) return showToast('网址格式不正确');
    state.privateBookmarks.unshift({ id: uid('pb'), title, url });
    saveState(true);
    renderPrivateLists();
    showToast('私密书签已保存');
  });
  box.addEventListener('click', (event) => {
    const pn = event.target.closest('[data-pn-del]');
    if (pn) {
      state.privateNotes = state.privateNotes.filter((n) => n.id !== pn.dataset.pnDel);
      saveState(true);
      renderPrivateLists();
      showToast('已删除私密便签');
      return;
    }
    const pb = event.target.closest('[data-pb-del]');
    if (pb) {
      state.privateBookmarks = state.privateBookmarks.filter((b) => b.id !== pb.dataset.pbDel);
      saveState(true);
      renderPrivateLists();
      showToast('已删除私密书签');
    }
  });
  box.addEventListener(
    'blur',
    (event) => {
      const p = event.target.closest('.private-note p');
      if (!p) return;
      const id = p.closest('[data-private-note]').dataset.privateNote;
      const item = state.privateNotes.find((n) => n.id === id);
      if (item && p.textContent.trim()) {
        item.text = p.textContent.trim();
        saveState();
      }
    },
    true
  );
};

const openPrivateSpace = () => {
  openModal({
    title: '隐私空间',
    subtitle: '独立加密区 · 快捷键 Alt + Q 随时呼出',
    size: 'wide',
    body: '<div id="privateStage"></div>',
    onMount: () => {
      if (!state.privatePassword) renderPrivateStage('setup');
      else renderPrivateStage('unlock');
    },
  });
};
$('#privateShortcutBtn').addEventListener('click', openPrivateSpace);

/* ---------------- 扩展与备份（导出 / 导入 / 存储占用 / 重置） ---------------- */

const storageSize = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    return (new Blob([raw]).size / 1024).toFixed(1);
  } catch {
    return '0';
  }
};

const downloadBackup = () => {
  const data = JSON.stringify({ app: '轻启 · 新标签页', exportedAt: nowISO(), state }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qingqi-newtab-backup-${kstamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  showToast('备份文件已导出，可在其他设备导入恢复');
};

const openExtensions = () => {
  openModal({
    title: '扩展与数据备份',
    subtitle: '所有设置与内容都保存在本机，可随时导出、迁移或彻底清除',
    size: 'wide',
    body: `
      <div class="ext-grid">
        <button class="ext-card" type="button" id="extExport">
          <span class="ext-icon export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>
          </span>
          <b>导出完整备份</b>
          <small>把外观、快捷访问、待办、便签等打包为 JSON</small>
        </button>
        <label class="ext-card">
          <span class="ext-icon import">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M5 20h14"/></svg>
          </span>
          <b>从备份恢复</b>
          <small>选择此前导出的 JSON 文件一键还原</small>
          <input type="file" id="extImportInput" accept=".json,application/json" hidden />
        </label>
        <button class="ext-card" type="button" id="extClearHistory">
          <span class="ext-icon clean">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>
          </span>
          <b>清理搜索与历史</b>
          <small>仅清除搜索记录与浏览历史，保留其他设置</small>
        </button>
        <button class="ext-card danger" type="button" id="extResetAll">
          <span class="ext-icon reset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
          </span>
          <b>恢复出厂设置</b>
          <small>清空全部本地数据并回到初始演示状态</small>
        </button>
      </div>
      <div class="ext-storage">
        <div class="ext-storage-head"><span>本机存储占用</span><b>${storageSize()} KB</b></div>
        <div class="ext-storage-bar"><i style="width:${Math.min(100, (Number(storageSize()) / 5120) * 100)}%"></i></div>
        <p class="field-tip">浏览器为每个站点提供约 5 MB 本地存储，壁纸使用压缩后的 JPG 存储，通常占用 200–900 KB。</p>
      </div>
      <div class="ext-list">
        <div class="ext-list-row"><span>快捷访问</span><b>${state.quick.length} 个站点</b></div>
        <div class="ext-list-row"><span>收藏夹</span><b>${state.bookmarks.items.length} 个书签 / ${state.bookmarks.folders.length} 个目录</b></div>
        <div class="ext-list-row"><span>稍后阅读</span><b>${state.readLater.length} 篇（待读 ${state.readLater.filter((i) => !i.read).length}）</b></div>
        <div class="ext-list-row"><span>随手便签</span><b>${state.notes.length} 条</b></div>
        <div class="ext-list-row"><span>待办日程</span><b>${Object.values(state.tasks).reduce((sum, list) => sum + list.length, 0)} 项</b></div>
      </div>`,
    onMount: (root) => {
      root.querySelector('#extExport').addEventListener('click', downloadBackup);
      root.querySelector('#extImportInput').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          const next = parsed.state || parsed;
          if (!next || typeof next !== 'object' || !Array.isArray(next.quick)) throw new Error('bad backup');
          state = { ...defaultState(), ...next };
          saveState(true);
          closeModal();
          hydrateUI();
          showToast('已从备份恢复全部设置');
        } catch {
          showToast('备份文件无法识别，请确认是本应用导出的 JSON');
        }
        event.target.value = '';
      });
      root.querySelector('#extClearHistory').addEventListener('click', () => {
        state.searchHistory = [];
        state.history = [];
        saveState(true);
        renderHistory();
        renderSuggest('hide');
        closeModal();
        showToast('已清理搜索记录与浏览历史');
      });
      root.querySelector('#extResetAll').addEventListener('click', () => {
        openModal({
          title: '确认恢复出厂设置？',
          subtitle: '该操作会删除本机保存的全部设置、壁纸、便签与书签，且不可撤销',
          size: 'compact',
          body: `<div class="rd-modal-actions center">
            <button class="ghost-btn" type="button" id="resetCancel">再想想</button>
            <button class="primary-btn danger-btn" type="button" id="resetConfirm">确认清空全部数据</button>
          </div>`,
          onMount: () => {
            $('#resetCancel').addEventListener('click', closeModal);
            $('#resetConfirm').addEventListener('click', () => {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {}
              state = defaultState();
              seedTasks();
              saveState(true);
              closeModal();
              hydrateUI();
              showToast('已恢复出厂设置');
            });
          },
        });
      });
    },
  });
};
$('#openExtensionsBtn').addEventListener('click', () => {
  closeHeaderOverlays();
  openExtensions();
});
/* ---------------- 设置抽屉（全部控件实时生效并记忆） ---------------- */

const drawer = $('#settingsDrawer');
const drawerBackdrop = $('#drawerBackdrop');

const openDrawer = () => {
  drawer.classList.add('open');
  drawerBackdrop.classList.add('show');
  closeHeaderOverlays();
  closeLibrary();
};
const closeDrawer = () => {
  drawer.classList.remove('open');
  drawerBackdrop.classList.remove('show');
};

$('#settingsBtn').addEventListener('click', openDrawer);
$('#footerSettingsBtn').addEventListener('click', openDrawer);
$('#drawerClose').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

const setSwitch = (el, on) => {
  if (!el) return;
  el.classList.toggle('on', Boolean(on));
  el.setAttribute('aria-checked', String(Boolean(on)));
};

const applySettingsUI = () => {
  setSwitch($('#switchSeconds'), state.seconds);
  setSwitch($('#switchWeather'), state.weatherOn);
  setSwitch($('#switchHint'), state.hintOn);
  $('#openTargetSelect').value = state.openTarget;
  $('#drawerLayoutSelect').value = state.layout;
  $('#wpBlurSlider').value = state.blur;
  $('#wpMaskSlider').value = state.mask;
  syncSliderLabels();
  $('#keyHint').style.display = state.hintOn ? '' : 'none';
  $('#footerTip').style.display = state.hintOn ? '' : 'none';
  $('#footerSpacer').style.display = state.hintOn ? 'none' : '';
  $('.header-center.status-control').style.display = state.weatherOn ? '' : 'none';
  $('#currentDeviceName').textContent = `本地浏览器 · ${/Edg\//.test(navigator.userAgent) ? 'Edge' : /Chrome\//.test(navigator.userAgent) ? 'Chrome' : '浏览器'} ${(navigator.userAgent.match(/(?:Chrome|Edg)\/(\d+)/) || [])[1] || ''}`.trim();
};

$('#switchSeconds').addEventListener('click', () => {
  state.seconds = !state.seconds;
  setSwitch($('#switchSeconds'), state.seconds);
  tickClock();
  saveState();
  showToast(state.seconds ? '时钟已显示秒数' : '时钟已隐藏秒数');
});
$('#switchWeather').addEventListener('click', () => {
  state.weatherOn = !state.weatherOn;
  setSwitch($('#switchWeather'), state.weatherOn);
  $('.header-center.status-control').style.display = state.weatherOn ? '' : 'none';
  saveState();
  showToast(state.weatherOn ? '已显示顶部天气与农历日历' : '已隐藏顶部天气与农历日历');
});
$('#switchHint').addEventListener('click', () => {
  state.hintOn = !state.hintOn;
  setSwitch($('#switchHint'), state.hintOn);
  $('#keyHint').style.display = state.hintOn ? '' : 'none';
  $('#footerTip').style.display = state.hintOn ? '' : 'none';
  $('#footerSpacer').style.display = state.hintOn ? 'none' : '';
  saveState();
  showToast(state.hintOn ? '已显示快捷键提示栏' : '已隐藏快捷键提示栏');
});
$('#openTargetSelect').addEventListener('change', (event) => {
  state.openTarget = event.target.value;
  saveState();
  renderQuick();
  const label = { blank: '新标签页打开', self: '当前标签页打开', window: '独立新窗口打开' }[state.openTarget];
  showToast(`链接打开方式：${label}（已记住）`);
});

/* 账号操作 */
$('#editNicknameBtn').addEventListener('click', () => {
  openModal({
    title: '修改昵称',
    subtitle: '昵称会显示在右上角头像与设置面板中',
    size: 'compact',
    body: `
      <label class="field-label">昵称</label>
      <input class="rd-input" id="nicknameInput" maxlength="16" autocomplete="off" value="${escapeHtml(state.username)}" />
      <div class="rd-modal-actions">
        <button class="ghost-btn" type="button" id="nicknameCancel">取消</button>
        <button class="primary-btn" type="button" id="nicknameSave">保存昵称</button>
      </div>`,
    onMount: () => {
      $('#nicknameInput').focus();
      $('#nicknameCancel').addEventListener('click', closeModal);
      $('#nicknameSave').addEventListener('click', () => {
        const name = $('#nicknameInput').value.trim();
        if (!name) return showToast('昵称不能为空');
        state.username = name;
        saveState(true);
        renderAccount();
        closeModal();
        showToast(`昵称已更新为「${name}」`);
      });
    },
  });
});

$('#openProPlanBtn').addEventListener('click', () => {
  openModal({
    title: state.plan === 'PRO' ? '专业版会员权益' : '升级专业版',
    subtitle: '当前方案：' + (state.plan === 'PRO' ? '专业版（已解锁全部能力）' : '免费版'),
    size: 'compact',
    body: `
      <ul class="plan-list">
        <li><b>无限快捷访问分页</b><span>图标宫格与胶囊卡片自由切换</span></li>
        <li><b>多端加密同步</b><span>收藏夹、待办、便签实时备份</span></li>
        <li><b>隐私空间</b><span>独立的私密便签与书签加密区</span></li>
        <li><b>全量数据导出</b><span>一键 JSON 备份与跨设备迁移</span></li>
      </ul>
      <div class="rd-modal-actions center">
        <button class="primary-btn" type="button" id="togglePlanBtn">${state.plan === 'PRO' ? '切换到免费版体验' : '立即开通专业版'}</button>
      </div>`,
    onMount: () => {
      $('#togglePlanBtn').addEventListener('click', () => {
        state.plan = state.plan === 'PRO' ? 'FREE' : 'PRO';
        saveState(true);
        renderAccount();
        closeModal();
        showToast(state.plan === 'PRO' ? '已开通专业版，全部能力已解锁' : '已切换到免费版');
      });
    },
  });
});

$('#toggleLoginBtn').addEventListener('click', toggleLogin);

const resetAllData = () => {
  openModal({
    title: '重置全部数据？',
    subtitle: '将清空本机保存的所有界面设置、快捷访问、书签、待办与便签',
    size: 'compact',
    body: `<div class="rd-modal-actions center">
      <button class="ghost-btn" type="button" id="resetAllCancel">取消</button>
      <button class="primary-btn danger-btn" type="button" id="resetAllConfirm">确认重置</button>
    </div>`,
    onMount: () => {
      $('#resetAllCancel').addEventListener('click', closeModal);
      $('#resetAllConfirm').addEventListener('click', () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        state = defaultState();
        seedTasks();
        saveState(true);
        closeModal();
        hydrateUI();
        showToast('已重置为初始状态');
      });
    },
  });
};
$('#resetAllDataBtn').addEventListener('click', resetAllData);

/* ---------------- 底部状态快切栏 ---------------- */

const demoBar = $('#demoBar');
const syncDemoCollapsed = () => {
  demoBar.classList.toggle('collapsed', state.demoCollapsed);
  $('#demoCollapseBtn').textContent = state.demoCollapsed ? '状态快切 ▸' : '状态快切 ▾';
};
$('#demoCollapseBtn').addEventListener('click', () => {
  state.demoCollapsed = !state.demoCollapsed;
  syncDemoCollapsed();
  saveState();
});

demoBar.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-demo]');
  if (!btn) return;
  const action = btn.dataset.demo;
  if (SCENE_META[action + ''] || action.startsWith('scene-')) {
    const key = action === 'scene-photo' && state.sceneKey === 'scene-photo' ? 'scene-default' : action;
    applyScene(key);
    showToast(key === 'scene-photo' ? `已切换壁纸：${state.photoLabel}` : `已切换流体渐变：${SCENE_META[key].label}`);
    return;
  }
  if (action === 'dark') {
    applyAppearance(effectiveDark() ? 'light' : 'dark');
    return;
  }
  if (action === 'card-mode') {
    setLayoutMode(state.layout === 'card' ? 'icon' : 'card');
    return;
  }
  if (action.startsWith('pane-')) {
    openPane(action.slice(5), { force: true });
    return;
  }
  if (action === 'pop-weather') return $('#weatherBtn').click();
  if (action === 'pop-calendar') return $('#calendarBtn').click();
  if (action === 'pop-account') return $('#accountBtn').click();
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
    return;
  }
  if (action === 'open-notes') {
    openNotes();
    return;
  }
  if (action === 'open-pomo') {
    openPomodoro();
    return;
  }
  if (action === 'open-private') {
    openPrivateSpace();
  }
});

/* ---------------- 全局快捷键与 Esc 逐层收起 ---------------- */

document.addEventListener('keydown', (event) => {
  const tag = (event.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target.isContentEditable;

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    closeHeaderOverlays();
    closeDrawer();
    closeLibrary();
    searchInput.focus();
    searchInput.select();
    renderSuggest();
    return;
  }
  if (event.altKey && event.key.toLowerCase() === 'q') {
    event.preventDefault();
    openPrivateSpace();
    return;
  }
  if (event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    openPane('toolbox', { force: true });
    $('#toolSearchInput').focus();
    return;
  }
  if (event.key === '/' && !typing) {
    event.preventDefault();
    searchInput.focus();
    renderSuggest();
    return;
  }
  if (event.key === 'Escape') {
    if (modalBackdrop.classList.contains('show')) {
      closeModal();
      return;
    }
    if (drawer.classList.contains('open')) {
      closeDrawer();
      return;
    }
    if (weatherPopover.classList.contains('show') || calendarPopover.classList.contains('show') || accountPop.classList.contains('show') || moreMenu.classList.contains('show') || engineMenu.classList.contains('show')) {
      closeHeaderOverlays();
      return;
    }
    if (editing) {
      editing = false;
      renderQuick();
      showToast('已退出编辑模式');
    }
  }
});

/* ---------------- 统一状态恢复入口（初始化 / 导入备份 / 重置后复用） ---------------- */

const hydrateUI = () => {
  editing = false;
  page = 0;
  syncHeroDates();
  tickClock();
  renderQuote();
  applyAppearance(state.appearanceMode, { silent: true });
  applyScene(state.sceneKey);
  setLayoutMode(state.layout, { silent: true });
  applySettingsUI();
  applySidebarWidth(state.sidebarWidth);
  updateEngineButton();
  renderEngineMenu();
  syncSearchClear();
  renderSuggest('hide');
  renderWeather();
  renderCalendar();
  renderBookmarks();
  renderHistory();
  renderReadLater();
  syncNotesBadge();
  renderAccount();
  renderPomo();
  syncDemoCollapsed();
  if (!state.weatherOn) $('.header-center.status-control').style.display = 'none';
  document.title = '轻启 · 新标签页';
};

/* ---------------- 启动 ---------------- */

loadState();
ensurePrivateData();
seedTasks();
hydrateUI();

let resizeTimer = null;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => renderQuick(), 120);
});

window.addEventListener('beforeunload', () => saveState(true));

console.info('%c轻启 · 新标签页', 'color:#2b68f6;font-weight:600', '已就绪：全部设置自动保存在本机 localStorage，刷新不会丢失。');
