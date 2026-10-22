/* =============================================================================
   轻启 · 新标签页 Demo 交互脚本（纯静态演示，非扩展真实逻辑）
   复刻来源：HomeView.vue（壁纸色调采样 / 推挤布局）、SearchBox.vue（引擎列表）、
             QuickAccessSection.vue（分页 / 编辑态 / 渐变底）、CalendarPopover.vue（月视图）
   说明：所有数据均为演示假数据；美化稿回交后按真实组件逐个替换。
   ============================================================================= */

/* ---------------- 每日一言 / 秒级时钟（WelcomeHero） ---------------- */

const clockEl = document.getElementById('clock');
const pad = (n) => String(n).padStart(2, '0');
const tickClock = () => {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
tickClock();
window.setInterval(tickClock, 1000);

/* ---------------- 壁纸明暗采样（wallpaperBrightness.ts 同源算法） ----------------
   偏暗 → body.photo-tone-dark（图上文字浅）；偏亮 → body.photo-tone-light（图上文字深）。
   面板内的深字由 tokens.css 的 rd-photo 清单恒定固化，不受 tone 影响。
   注意：CSS 自定义属性里的相对 URL 会按「声明该属性的样式表所在目录」解析（本 demo 是
   assets/styles.css → 相对 resources），因此必须注入绝对 URL —— 真实扩展里壁纸是
   chrome-extension:// / blob: / https: 绝对地址，不存在该问题。
   ------------------------------------------------------------------ */

const WALLPAPER_LOCAL = new URL('assets/wallpaper.webp', document.baseURI).href;
const WALLPAPER_REMOTE =
  'https://img.haowallpaper.com/pre_cache_file/2026_06_10_file/19132969098040192.png';

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
      // 与真实实现一致的感知亮度权重
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const avg = sum / n;
    const dark = avg < 140;
    document.body.classList.toggle('photo-tone-dark', dark);
    document.body.classList.toggle('photo-tone-light', !dark);
    setHint(`图片壁纸 · 采样亮度 ${avg.toFixed(0)} → ${dark ? '暗图（图上浅字 + 深色蒙层）' : '亮图（图上深字 + 浅色提亮）'}`);
  } catch (e) {
    // 跨域取像素失败时保持默认（中强深色蒙层 + 浅字），与真实实现的兜底口径一致
    document.body.classList.add('photo-tone-dark');
    setHint('图片壁纸 · 采样失败兜底（中强深色蒙层 + 图上浅字）');
  }
};

const loadWallpaper = (primary, fallback) => {
  const probe = new Image();
  probe.onload = () => {
    document.documentElement.style.setProperty('--wallpaper-url', `url("${primary}")`);
    applyPhotoTone(probe);
  };
  probe.onerror = () => {
    if (!fallback) return;
    const second = new Image();
    second.onload = () => {
      document.documentElement.style.setProperty('--wallpaper-url', `url("${fallback}")`);
      applyPhotoTone(second);
    };
    second.src = fallback;
  };
  probe.src = primary;
};

function setHint(text) {
  const hint = document.getElementById('wpHint');
  if (hint) hint.textContent = text;
}

/* 设置抽屉里的壁纸缩略图同样注入绝对 URL（原因见上） */
document.querySelectorAll('[data-thumb]').forEach((el) => {
  el.style.backgroundImage = `url("${new URL(el.dataset.thumb, document.baseURI).href}")`;
});

/* ---------------- 搜索引擎（SearchBox.ENGINES 原样搬运） ---------------- */

const ENGINES = [
  { key: 'bing', label: 'Bing', letter: 'B', color: '#3478f6' },
  { key: 'google', label: 'Google', letter: 'G', color: '#eb4b3e' },
  { key: 'baidu', label: '百度', letter: '百', color: '#2769e8' },
  { key: 'duckduckgo', label: 'DuckDuckGo', letter: 'D', color: '#de5833' },
  { key: 'sogou', label: '搜狗', letter: '搜', color: '#ff6f37' },
  { key: 'so360', label: '360', letter: '3', color: '#00b25c' },
];

let activeEngine = ENGINES[0];
const engineMenu = document.getElementById('engineMenu');
const engineLogo = document.getElementById('engineLogo');
const engineName = document.getElementById('engineName');

const renderEngineMenu = () => {
  engineMenu.innerHTML = ENGINES.map(
    (e) => `<button type="button" class="engine-option${e.key === activeEngine.key ? ' selected' : ''}" data-key="${e.key}" role="menuitem">
        <span class="mini-logo" style="background:${e.color}">${e.letter}</span>${e.label}
      </button>`
  ).join('');
};
renderEngineMenu();

document.getElementById('engineBtn').addEventListener('click', (event) => {
  event.stopPropagation();
  engineMenu.classList.toggle('show');
});
engineMenu.addEventListener('click', (event) => {
  const btn = event.target.closest('.engine-option');
  if (!btn) return;
  activeEngine = ENGINES.find((e) => e.key === btn.dataset.key);
  engineLogo.style.background = activeEngine.color;
  engineLogo.textContent = activeEngine.letter;
  engineName.textContent = activeEngine.label;
  renderEngineMenu();
  engineMenu.classList.remove('show');
});

/* ---------------- 快捷访问（QuickAccessSection：16/页 + 渐变底 + 编辑态） ---------------- */

const PER_PAGE = () => (window.innerWidth <= 760 ? 8 : 16);

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

/** 与组件一致：名称哈希 → 稳定双色调渐变（同一站点颜色恒定）。 */
const gradientOf = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${hash} 68% 62%), hsl(${(hash + 48) % 360} 60% 48%))`;
};
const letterOf = (name) => (name || '·').trim().charAt(0).toUpperCase() || '·';
/** 与组件同链路：origin/favicon.ico（离线可用、不引第三方），拉不到时保留首字母底。 */
const demoIcon = (url) => {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return '';
  }
};
/**
 * 先渲染首字母（与真实组件的兜底态一致），favicon 探测成功后再换成图标。
 * 这样离线打开 demo 也不会出现加载失败的红色报错，观感与真实页面同构。
 */
const upgradeIcons = () => {
  grid.querySelectorAll('a.shortcut[data-icon]').forEach((a) => {
    const box = a.querySelector('.shortcut-icon');
    if (!box || box.dataset.upgraded) return;
    box.dataset.upgraded = '1';
    const probe = new Image();
    probe.onload = () => {
      const img = document.createElement('img');
      img.src = a.dataset.icon;
      img.alt = '';
      const letter = box.querySelector('span:not(.shortcut-pending)');
      if (letter) letter.replaceWith(img);
    };
    probe.src = a.dataset.icon;
  });
};

const grid = document.getElementById('quickGrid');
const pagerStatus = document.getElementById('pagerStatus');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');

let page = 0;
let editing = false;

const cardsOf = () => {
  const list = QUICK_ITEMS.map((item) => ({ type: 'item', item }));
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
            return `<button class="shortcut add-card" type="button"><span class="shortcut-icon add">＋</span><span class="shortcut-label">添加网站</span></button>`;
          }
          const item = card.item;
          const icon = `<span class="shortcut-icon" style="background:${gradientOf(item.webName)}">
              <span>${letterOf(item.webName)}</span>
              ${item.pendingSync ? '<span class="shortcut-pending" title="离线保存，联网后自动同步">⟳</span>' : ''}
            </span>`;
          return `<a class="shortcut${editing ? ' editing' : ''}" href="${item.webUrl}" data-icon="${demoIcon(item.webUrl)}" onclick="return false">
              <button class="shortcut-delete" type="button" aria-label="删除 ${item.webName}">
                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.2 2.2l5.6 5.6M7.8 2.2l-5.6 5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>
              </button>
              ${icon}
              <span class="shortcut-label">${item.webName}</span>
            </a>`;
        })
        .join('')}</div>`
    )
    .join('');

  grid.classList.toggle('editing', editing);
  document.getElementById('quickNote').classList.toggle('show', editing);
  document.getElementById('manageBtnText').textContent = editing ? '完成' : '编辑';

  page = Math.min(page, pageCount() - 1);
  moveGrid();
  upgradeIcons();
};

const moveGrid = () => {
  const step = grid.parentElement.clientWidth + 14;
  grid.style.transform = `translate3d(${-page * step}px, 0, 0)`;
  pagerStatus.textContent = `${page + 1} / ${pageCount()}`;
  prevBtn.disabled = page === 0;
  nextBtn.disabled = page >= pageCount() - 1;
};

prevBtn.addEventListener('click', () => {
  page = Math.max(0, page - 1);
  moveGrid();
});
nextBtn.addEventListener('click', () => {
  page = Math.min(pageCount() - 1, page + 1);
  moveGrid();
});
document.getElementById('manageBtn').addEventListener('click', () => {
  editing = !editing;
  renderGrid();
});

/* 指针滑动翻页（边缘阻尼与组件同口径） */
const viewport = document.getElementById('quickViewport');
let pointerId = null;
let startX = 0;
let offset = 0;
viewport.addEventListener('pointerdown', (event) => {
  if (editing || pageCount() < 2 || event.button !== 0) return;
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
  const step = viewport.clientWidth + 14;
  grid.style.transform = `translate3d(${offset - page * step}px, 0, 0)`;
});
const endDrag = (event) => {
  if (event.pointerId !== pointerId) return;
  const threshold = viewport.clientWidth * 0.14;
  if (offset < -threshold) page += 1;
  else if (offset > threshold) page -= 1;
  pointerId = null;
  grid.style.transition = '';
  viewport.classList.remove('dragging');
  moveGrid();
};
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);

window.addEventListener('resize', () => {
  renderGrid();
});
renderGrid();

/* ---------------- 日历浮层（CalendarPopover 月视图 + 任务清单） ---------------- */

const WEEKDAY_FULL = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const today = new Date();
let cursorYear = today.getFullYear();
let cursorMonth = today.getMonth();
let selectedKey = dateKey(today);

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const daysWrap = document.getElementById('calendarDays');
const monthTitle = document.getElementById('monthTitle');

const TASKS = {
  [selectedKey]: [
    { time: '09:30', title: '周会：新标签页改版进度', category: '会议室 3F-05', type: 'meeting', done: true },
    { time: '14:00', title: 'UI 美化稿评审', category: '与设计同事对齐视觉口径', type: 'meeting', done: false },
    { time: '20:30', title: '跑步 5 公里', category: '个人', type: 'personal', done: false },
  ],
};

const renderCalendar = () => {
  monthTitle.textContent = `${cursorYear} 年 ${cursorMonth + 1} 月`;
  const firstWeekday = new Date(cursorYear, cursorMonth, 1).getDay();
  const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
  const daysInPrev = new Date(cursorYear, cursorMonth, 0).getDate();
  const slots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < slots; i += 1) {
    if (i < firstWeekday) {
      cells.push({ day: daysInPrev - firstWeekday + 1 + i, muted: true });
    } else if (i >= firstWeekday + daysInMonth) {
      cells.push({ day: i - firstWeekday - daysInMonth + 1, muted: true });
    } else {
      const day = i - firstWeekday + 1;
      const key = `${cursorYear}-${pad(cursorMonth + 1)}-${pad(day)}`;
      cells.push({ day, key, isToday: key === dateKey(today), isSelected: key === selectedKey });
    }
  }
  daysWrap.innerHTML = cells
    .map((c) => {
      if (c.muted) return `<button type="button" class="muted" tabindex="-1">${c.day}</button>`;
      const cls = [c.isToday ? 'today' : '', c.isSelected ? 'selected' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-key="${c.key}" data-day="${c.day}" aria-pressed="${c.isSelected}">${c.day}</button>`;
    })
    .join('');
  renderAgenda();
};

const agendaList = document.getElementById('agendaList');
const renderAgenda = () => {
  const [, m, d] = selectedKey.split('-').map(Number);
  const date = new Date(cursorYear, m - 1, d);
  document.getElementById('agendaDate').textContent = `${m} 月 ${d} 日`;
  document.getElementById('agendaWeek').textContent = WEEKDAY_FULL[date.getDay()] ?? '';
  const tasks = TASKS[selectedKey] || [];
  if (!tasks.length) {
    agendaList.innerHTML = '<div class="agenda-empty">这一天暂未安排任务<br />留一点时间给自己吧。</div>';
    return;
  }
  agendaList.innerHTML = tasks
    .map(
      (t, i) => `<article class="agenda-task ${t.type}${t.done ? ' done' : ''}">
          <div class="agenda-task-time">
            <button class="agenda-task-done${t.done ? ' done' : ''}" type="button" aria-pressed="${t.done}" data-i="${i}">✓</button>
            <time>${t.time}</time>
          </div>
          <div class="agenda-task-body"><b>${t.title}</b><span>${t.category}</span></div>
          <button class="agenda-task-edit" type="button" title="修改任务">✎</button>
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
  const btn = event.target.closest('.agenda-task-done');
  if (!btn) return;
  const tasks = TASKS[selectedKey];
  const idx = Number(btn.dataset.i);
  tasks[idx].done = !tasks[idx].done;
  renderAgenda();
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
  selectedKey = dateKey(today);
  renderCalendar();
});
document.getElementById('agendaAdd').addEventListener('click', () => {
  document.getElementById('agendaEditor').classList.add('show');
});
document.getElementById('agendaCancel').addEventListener('click', () => {
  document.getElementById('agendaEditor').classList.remove('show');
});
renderCalendar();

/* ---------------- 浮层开关（天气 / 日历 / 账号 / more / 引擎） ---------------- */

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
  moreMenu.classList.toggle('show');
});
document.getElementById('calendarClose').addEventListener('click', closeHeaderOverlays);
document.getElementById('cityAddToggle').addEventListener('click', () => {
  const list = document.getElementById('cityAddList');
  list.classList.toggle('show');
  document.getElementById('cityAddToggle').textContent = list.classList.contains('show') ? '收起' : '＋ 添加城市';
});

/* ---------------- 侧边库（推挤式布局 + 四 pane） ---------------- */

const sideLibrary = document.getElementById('sideLibrary');
const homeShell = document.getElementById('homeShell');
const libraryTitle = document.getElementById('libraryTitle');
const libraryMark = document.getElementById('libraryMark');

const PANE_META = {
  bookmarks: { title: '收藏夹', icon: '<path d="m12 3 2.75 5.57 6.15.89-4.45 4.33 1.05 6.11L12 17l-5.5 2.9 1.05-6.11L3.1 9.46l6.15-.89z"/>' },
  history: { title: '历史记录', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>' },
  toolbox: { title: '工具箱', icon: '<path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.9 2.1-3.1-3.1z"/>' },
  readlater: { title: '稍后阅读', icon: '<path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z"/>' },
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

/* ---------------- 设置抽屉 ---------------- */

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
document.getElementById('drawerClose').addEventListener('click', closeDrawer);
backdrop.addEventListener('click', () => {
  closeDrawer();
});

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

/* 开关：显示天气与日期 / 显示快捷键提示（与真实页面同效果） */
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

/* Esc 逐层关闭（与 HomeView 快捷键口径一致） */
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (editing) {
    editing = false;
    renderGrid();
    return;
  }
  closeHeaderOverlays();
  closeDrawer();
});

/* 点击空白关闭 header 浮层（组件用 composedPath，此处同语义；演示条不算「空白」） */
document.addEventListener('click', (event) => {
  if (event.target.closest('.more-wrap, .status-control, .weather-popover, .calendar-popover, .account-btn, .account-pop, .engine-anchor, #demoBar')) return;
  closeHeaderOverlays();
});

/* ---------------- 演示条（非系统 UI） ---------------- */

const SCENES = {
  'scene-photo': { preset: false, theme: null },
  'scene-default': { preset: true, theme: null },
  'scene-dusk': { preset: true, theme: 'theme-dusk' },
  'scene-mint': { preset: true, theme: 'theme-mint' },
  'scene-night': { preset: true, theme: 'theme-night' },
};

const scene = document.getElementById('scene');
const wpPreview = document.getElementById('wpPreview');

const applyScene = (key) => {
  const cfg = SCENES[key];
  document.body.classList.remove('theme-dusk', 'theme-mint', 'theme-night');
  if (cfg.theme) document.body.classList.add(cfg.theme);
  if (cfg.preset) {
    document.body.classList.remove('rd-photo', 'photo-tone-dark', 'photo-tone-light');
    scene.classList.remove('photo');
    document.documentElement.style.setProperty('--wallpaper-url', 'none');
    wpPreview.classList.add('preset');
    setHint(
      key === 'scene-default'
        ? '颜色预设 · 晨雾渐变（无壁纸）'
        : `颜色预设 · ${({ 'scene-dusk': '暮色', 'scene-mint': '薄荷', 'scene-night': '深夜' })[key]}`
    );
  } else {
    document.body.classList.add('rd-photo');
    scene.classList.add('photo');
    wpPreview.classList.remove('preset');
    loadWallpaper(WALLPAPER_LOCAL, WALLPAPER_REMOTE);
  }
  syncSwatch(key);
  document.querySelectorAll('.demo-bar [data-demo^="scene-"]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.demo === key);
  });
};

const syncSwatch = (key) => {
  const map = { 'scene-default': 0, 'scene-dusk': 1, 'scene-mint': 2, 'scene-night': 3 };
  document.querySelectorAll('.theme-swatches .swatch').forEach((s, i) => {
    s.classList.toggle('selected', map[key] === i);
  });
  document.querySelectorAll('.remote-wallpaper').forEach((s, i) => {
    s.classList.toggle('selected', key === 'scene-photo' && i === 0);
  });
};

let forcedDark = false;
const applyDark = (on) => {
  forcedDark = on;
  document.documentElement.classList.toggle('dark', on);
  document.getElementById('modeLight').classList.toggle('active', !on);
  document.getElementById('modeDark').classList.toggle('active', on);
  document.getElementById('modeAuto').classList.toggle('active', false);
  document.querySelector('.demo-bar [data-demo="dark"]').classList.toggle('active', on);
};

document.getElementById('demoBar').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-demo]');
  if (!btn) return;
  const action = btn.dataset.demo;
  if (SCENES[action]) {
    applyScene(action);
    return;
  }
  if (action === 'dark') {
    applyDark(!forcedDark);
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
    engineMenu.classList.toggle('show');
    return;
  }
  if (action === 'drawer') {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
    return;
  }
  if (action === 'edit') {
    document.getElementById('manageBtn').click();
    return;
  }
});

document.getElementById('modeLight').addEventListener('click', () => applyDark(false));
document.getElementById('modeDark').addEventListener('click', () => applyDark(true));
document.getElementById('modeAuto').addEventListener('click', () => applyDark(window.matchMedia('(prefers-color-scheme: dark)').matches));

/* 初始：图片壁纸 + 采样明暗 */
applyScene('scene-photo');
