// The home page: the live timeline in the hero, the view tabs and the demo video.
(() => {
  const root = document.documentElement, systemDark = matchMedia('(prefers-color-scheme: dark)');
  // js/common.js sets data-theme once someone picks a theme; until then it follows the system
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches;
  const onThemeChange = fn => {
    new MutationObserver(fn).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    systemDark.addEventListener('change', fn);
  };

  // Live timeline
  const DAY = 864e5;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (date, opts) => date.toLocaleDateString('en-GB', opts);
  // Calendar units in local time, as in the app's timeline
  const startOf = (unit, date) => {
    const y = date.getFullYear(), m = date.getMonth();
    switch (unit) {
      case 'hour': return new Date(y, m, date.getDate(), date.getHours());
      case 'day': return new Date(y, m, date.getDate());
      case 'week': return new Date(y, m, date.getDate() - (date.getDay() + 6) % 7);
      case 'month': return new Date(y, m, 1);
      case 'quarter': return new Date(y, m - m % 3, 1);
      case 'year': return new Date(y, 0, 1);
      case 'decade': return new Date(y - y % 10, 0, 1);
    }
  };
  const add = (unit, date, n) => {
    const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
    switch (unit) {
      case 'hour': return new Date(y, m, d, date.getHours() + n);
      case 'day': return new Date(y, m, d + n);
      case 'week': return new Date(y, m, d + 7 * n);
      case 'month': return new Date(y, m + n, 1);
      case 'quarter': return new Date(y, m + 3 * n, 1);
      case 'year': return new Date(y + n, 0, 1);
    }
  };
  const planStart = add('week', startOf('week', today), -1);   // the plan starts last Monday
  const dayOfPlan = days => {
    const date = add('day', planStart, Math.floor(days));
    return new Date(date.getTime() + (days % 1) * DAY);
  };
  // The H D W M Q Y scales: column unit, the unit named in the row above, the first column,
  // how many columns, how many fit across the frame, and the narrowest a column may get.
  // Week view fits the frame, so the timeline opens without scrolling sideways.
  const SCALES = {
    H: { unit: 'hour',    group: 'day',    from: () => add('day', today, -1),                         cols: 72, fit: 12, min: 40 },
    D: { unit: 'day',     group: 'month',  from: () => planStart,                                     cols: 63, fit: 21, min: 28 },
    W: { unit: 'week',    group: 'month',  from: () => planStart,                                     cols: 9,  fit: 9,  min: 75 },
    M: { unit: 'month',   group: 'year',   from: () => add('month', startOf('month', today), -1),     cols: 12, fit: 12, min: 60 },
    Q: { unit: 'quarter', group: 'year',   from: () => add('quarter', startOf('quarter', today), -1), cols: 8,  fit: 8,  min: 80 },
    Y: { unit: 'year',    group: 'decade', from: () => startOf('year', today),                        cols: 5,  fit: 5,  min: 80 }
  };
  let scaleKey = 'W';
  const colLabel = (unit, date, colPx) => {
    switch (unit) {
      case 'hour': return String(date.getHours()).padStart(2, '0') + ':00';
      case 'day': return (colPx >= 52 ? fmt(date, { weekday: 'short' }) + ' ' : '') + date.getDate();
      case 'week': return fmt(date, { month: 'short' }) + ' ' + date.getDate();
      case 'month': return fmt(date, { month: 'short' });
      case 'quarter': return 'Q' + (date.getMonth() / 3 + 1);
      case 'year': return String(date.getFullYear());
    }
  };
  const groupLabel = (unit, date) => {
    switch (unit) {
      case 'day': return fmt(date, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
      case 'month': return fmt(date, { month: 'short', year: 'numeric' }).toUpperCase();
      case 'year': return String(date.getFullYear());
      case 'decade': return startOf('decade', date).getFullYear() + 's';
    }
  };
  const people = { sam: 'Sam', priya: 'Priya', alex: 'Alex' };
  // start and end are days from the start of the plan
  const tasks = [
    { name: 'Discovery & research', tone: 'blue',   person: 'sam',   start: 7,  end: 12, done: 100 },
    { name: 'Design mockups',       tone: 'teal',   person: 'priya', start: 14, end: 23, done: 60 },
    { name: 'Content writing',      tone: 'purple', person: 'priya', start: 17, end: 31, done: 30 },
    { name: 'Build & develop',      tone: 'green',  person: 'sam',   start: 21, end: 40, done: 0 },
    { name: 'SEO & analytics',      tone: 'orange', person: 'alex',  start: 30, end: 39, done: 0 },
    { name: 'Testing & QA',         tone: 'gold',   person: 'priya', start: 38, end: 46, done: 0 },
    { name: 'Client review',        tone: 'red',    person: 'alex',  start: 45, end: 49, done: 0 },
    { name: 'Go live',              milestone: true,                 start: 52 }
  ];
  const gantt = document.getElementById('timeline'), scroller = gantt.parentElement;
  const monthRow = document.getElementById('timeline-months'), colRow = document.getElementById('timeline-cols'),
        grid = document.getElementById('timeline-grid'), rows = document.getElementById('timeline-rows'),
        names = document.getElementById('timeline-names'), chart = document.getElementById('timeline-chart');
  // Builds an element with text set as text, never as HTML
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  const todayLine = el('div', 'g-today');
  todayLine.append(el('b', null, 'Today'));
  chart.appendChild(todayLine);

  const pop = document.getElementById('task-pop');
  const WARN_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9.5"/></svg>';
  let openBtn = null;
  const closePop = () => {
    pop.hidden = true;
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus({ preventScroll: true }); openBtn = null; }
  };

  tasks.forEach(task => {
    const nameEl = el('div', 'g-name');
    nameEl.append(task.milestone ? el('span', 'diamond tone-milestone') : el('span', `dot tone-${task.tone}`), task.name);
    if (task.done) nameEl.append(el('span', 'pct', `${task.done}%`));
    names.appendChild(nameEl);
  });

  let labelGroups = () => {};
  // Draw the columns, bars and today line for the current scale
  function render() {
    const scale = SCALES[scaleKey], edges = [scale.from()];
    for (let i = 0; i < scale.cols; i++) edges.push(add(scale.unit, edges[i], 1));
    // Where a moment sits across the chart, as a %. Columns are calendar units, so months
    // aren't all the same length; anything outside the range is pinned to an edge.
    const posOf = time => {
      if (time <= edges[0]) return 0;
      if (time >= edges[scale.cols]) return 100;
      let i = 0; while (edges[i + 1] <= time) i++;
      return (i + (time - edges[i]) / (edges[i + 1] - edges[i])) / scale.cols * 100;
    };
    // Fill the frame when the columns fit; otherwise keep them readable and scroll
    const chartW = scroller.clientWidth - names.offsetWidth;
    const fits = Math.max(scale.min, chartW / scale.fit) * scale.cols <= chartW + .5;
    const colPx = fits ? chartW / scale.cols : Math.max(scale.min, chartW / scale.fit);
    gantt.dataset.scale = scaleKey;
    gantt.style.setProperty('--cols', scale.cols);
    gantt.style.setProperty('--chart', fits ? 'minmax(0,1fr)' : scale.cols * colPx + 'px');
    gantt.style.minWidth = fits ? '' : `calc(var(--name) + ${scale.cols * colPx}px)`;   // room for the task names to stay pinned
    if (gantt.classList.contains('is-live')) gantt.classList.add('static');   // the build-up plays once

    const now = scale.unit === 'hour' ? new Date() : today;
    const nowCol = edges.findIndex((date, i) => i < scale.cols && date <= now && now < edges[i + 1]);
    monthRow.textContent = colRow.textContent = grid.textContent = '';
    const groupStarts = edges.slice(0, scale.cols).map((date, i) => i === 0 || +startOf(scale.group, date) !== +startOf(scale.group, edges[i - 1]));
    for (let i = 0; i < scale.cols; i++) {
      const date = edges[i];
      monthRow.appendChild(document.createElement('span'));
      const label = colLabel(scale.unit, date, colPx);
      const colEl = i === nowCol ? el('span', 'now') : el('span', null, label);
      if (i === nowCol) colEl.append(el('i', null, label));
      colRow.appendChild(colEl);
      const cell = document.createElement('span');
      const offHours = scale.unit === 'hour' && (date.getHours() < 7 || date.getHours() >= 18);
      if (scale.unit === 'day' ? date.getDay() % 6 === 0 : offHours) cell.className = 'off';
      grid.appendChild(cell);
    }
    todayLine.style.left = posOf(scale.unit === 'hour' ? new Date() : new Date(today.getTime() + DAY / 2)) + '%';

    pop.hidden = true; openBtn = null;
    rows.replaceChildren(el('div', 'g-spacer'));
    tasks.forEach((task, i) => {
      const row = document.createElement('div'); row.className = 'g-row';
      const startDate = dayOfPlan(task.start);
      if (task.milestone) {
        const left = posOf(dayOfPlan(task.start + .5));
        if (left > 0 && left < 100) {
          const diamond = document.createElement('button');
          diamond.className = 'ms'; diamond.style.left = left + '%'; diamond.style.setProperty('--i', i);
          diamond.setAttribute('aria-label', `${task.name}, milestone, ${fmt(startDate, { day: 'numeric', month: 'long' })}`);
          diamond.setAttribute('aria-expanded', 'false');
          diamond.addEventListener('click', e => openPop(e.currentTarget, task, startDate));
          const label = document.createElement('span');
          label.className = 'ms-lbl'; label.style.left = left + '%'; label.style.setProperty('--i', i); label.textContent = task.name;
          row.append(diamond, label);
        }
      } else {
        const endDate = dayOfPlan(task.end), left = posOf(startDate), right = posOf(dayOfPlan(task.end + 1));
        if (right > left) {
          const bar = document.createElement('button');
          bar.className = `bar tone-${task.tone}`; bar.style.left = left + '%'; bar.style.width = (right - left) + '%';
          if ((right - left) / 100 * scale.cols * colPx < 44) bar.classList.add('tight');   // too short for the name and avatar
          bar.style.setProperty('--i', i);
          bar.setAttribute('aria-expanded', 'false');
          bar.setAttribute('aria-label', `${task.name}, ${people[task.person]}, ${fmt(startDate, { day: 'numeric', month: 'short' })} to ${fmt(endDate, { day: 'numeric', month: 'short' })}, ${task.done}% done`);
          if (task.done) {
            const done = el('span', 'done');
            done.style.width = task.done + '%';   // set here, not as a style attribute, which the CSP blocks
            bar.append(done);
          }
          bar.append(el('span', 'lbl', task.name), el('span', `av ${task.person}`, people[task.person][0]));
          bar.addEventListener('click', e => openPop(e.currentTarget, task, startDate, endDate));
          row.appendChild(bar);
        }
      }
      rows.appendChild(row);
    });
    // Priya's overlap: Design mockups (days 14 to 23) and Content writing (days 17 to 31)
    const clashLeft = posOf(dayOfPlan(17)), clashRight = posOf(dayOfPlan(24));
    if (clashRight > clashLeft) {
      const clash = document.createElement('div'); clash.className = 'clash';
      clash.style.left = clashLeft + '%'; clash.style.width = (clashRight - clashLeft) + '%';
      rows.appendChild(clash);
    }
    // Open with the column before now first, like the app's Today button
    scroller.scrollLeft = fits ? 0 : Math.max(0, nowCol - 1) * colPx;
    // Name the month (or day, year...) at the left edge as well as where each one starts,
    // unless the next one starts too close to fit both
    labelGroups = () => {
      const first = Math.min(scale.cols - 1, Math.floor(scroller.scrollLeft / colPx)), room = Math.ceil(80 / colPx);
      const next = groupStarts.findIndex((isStart, j) => isStart && j > first);
      [...monthRow.children].forEach((cell, j) => {
        const show = j > first ? groupStarts[j] : j === first && (next < 0 || next - first >= room);
        cell.textContent = show ? groupLabel(scale.group, edges[j]) : '';
      });
    };
    labelGroups();
  }
  render();
  scroller.addEventListener('scroll', () => labelGroups(), { passive: true });

  const scaleButtons = [...document.querySelectorAll('.scale-switch button')];
  scaleButtons.forEach(btn => btn.addEventListener('click', () => {
    scaleKey = btn.dataset.scale;
    scaleButtons.forEach(other => { other.classList.toggle('on', other === btn); other.setAttribute('aria-pressed', other === btn); });
    render();
  }));
  let lastW = scroller.clientWidth;
  addEventListener('resize', () => { if (scroller.clientWidth !== lastW) { lastW = scroller.clientWidth; render(); } });
  document.getElementById('task-count').textContent = tasks.filter(task => !task.milestone).length;

  function openPop(btn, task, startDate, endDate) {
    if (openBtn === btn) { closePop(); return; }
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    const days = endDate ? Math.round((endDate - startDate) / DAY) + 1 : 0;
    const when = endDate
      ? `${fmt(startDate, { day: 'numeric', month: 'short' })} to ${fmt(endDate, { day: 'numeric', month: 'short' })}`
      : fmt(startDate, { weekday: 'short', day: 'numeric', month: 'short' });
    const overlap = task.person === 'priya' && (task.name === 'Design mockups' || task.name === 'Content writing');
    const closeBtn = el('button', 'close', '×');
    closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', closePop);
    const kind = el('div', 'kind');
    kind.append(el('span', `sq tone-${task.milestone ? 'milestone' : task.tone}`), task.milestone ? 'MILESTONE' : 'TASK');
    const title = el('p', 'title', task.name); title.id = 'task-pop-title';   // a label, not a heading: it isn't part of the page outline
    const details = el('dl');
    const addRow = (term, ...value) => { const dd = el('dd'); dd.append(...value); details.append(el('dt', null, term), dd); };
    addRow('When', when);
    if (!task.milestone) {
      addRow('Person', el('span', `av ${task.person}`, people[task.person][0]), people[task.person]);
      addRow('Length', `${days} days`);
      const meter = el('span', 'meter'), fill = el('i');
      fill.style.width = task.done + '%';
      meter.append(fill);
      addRow('Progress', meter, `${task.done}%`);
    }
    pop.replaceChildren(closeBtn, kind, title, details);
    if (overlap) {
      const warn = el('div', 'warn');
      warn.innerHTML = WARN_ICON;   // fixed markup written in this file, with no data in it
      warn.append('Overlaps with Priya’s other task for 7 days');
      pop.append(warn);
    }
    pop.hidden = false;
    const hero = pop.offsetParent.getBoundingClientRect(), anchor = btn.getBoundingClientRect();
    let left = anchor.left - hero.left + Math.min(anchor.width / 2, 120) - 24;
    left = Math.max(8, Math.min(left, hero.width - pop.offsetWidth - 8));
    pop.style.left = left + 'px';
    pop.style.top = (anchor.bottom - hero.top + 10) + 'px';
    btn.setAttribute('aria-expanded', 'true'); openBtn = btn;
    closeBtn.focus({ preventScroll: true });   // into the popup, so it's announced; closing returns focus to the bar
  }
  // Closing from outside the popup: no focus move, unlike Esc or the close button
  const dismissPop = () => {
    pop.hidden = true;
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    openBtn = null;
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) closePop(); });
  document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('.bar,.ms')) dismissPop(); });
  addEventListener('resize', () => { if (!pop.hidden) dismissPop(); });

  // Play the build-up once when the timeline is on screen
  const buildUp = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { gantt.classList.add('is-live'); buildUp.disconnect(); }
  }), { threshold: .3 });
  buildUp.observe(gantt);

  // View tabs. Each view has a light and a dark screenshot, matching the page's theme.
  const viewAlt = {
    timeline: 'Timeline view of a website launch project with ten coloured task bars and a Go live milestone, running from late October into January',
    list: 'List view showing each task with its start date, progress bar and assigned person',
    calendar: 'Month calendar for November with task bars spanning the days they run',
    board: 'Board view with cards in columns for not started, in progress, done and milestones',
    workload: 'Workload view with a row each for Sam, Priya and Alex, and Priya flagged for a 7-day overlap between two tasks'
  };
  const tabs = [...document.querySelectorAll('.view-tab')], shot = document.getElementById('view-img'),
        caption = document.getElementById('view-cap'), panel = document.getElementById('panel-view');
  const shotFor = view => `assets/view-${view}${isDark() ? '-dark' : ''}.webp`;
  let currentView = 'timeline', nearViews = false;
  // The other views' screenshots are fetched once the section is close, so switching tabs is
  // instant without costing phone data for a section someone may never reach
  const preloadShots = () => {
    if (nearViews) Object.keys(viewAlt).forEach(view => { new Image().src = shotFor(view); });
  };
  const showTheme = () => { shot.src = shotFor(currentView); preloadShots(); };
  showTheme();
  onThemeChange(showTheme);
  const approach = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { nearViews = true; preloadShots(); approach.disconnect(); }
  }, { rootMargin: '0px 0px 300px 0px' });
  approach.observe(panel);
  const selectTab = (tab, focus) => {
    tabs.forEach(other => { const on = other === tab; other.setAttribute('aria-selected', on); other.tabIndex = on ? 0 : -1; });
    currentView = tab.dataset.view;
    shot.src = shotFor(currentView); shot.alt = viewAlt[currentView];
    caption.textContent = tab.dataset.tip;   // the description, for screen readers; others see it as the tab's tooltip
    panel.setAttribute('aria-labelledby', tab.id);
    if (focus) { tab.focus(); tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  // Escape closes the maker's profile card until the pointer or focus leaves the name (WCAG 1.4.13)
  const sig = document.querySelector('.sig');
  document.addEventListener('keydown', e => { if (e.key === 'Escape') sig.classList.add('dismissed'); });
  ['pointerleave', 'blur'].forEach(type => sig.addEventListener(type, () => sig.classList.remove('dismissed')));

  // Demo video. Plays on a loop while it's on screen and pauses when scrolled away, and only
  // downloads once it's first reached. With reduced motion turned on, the still image stays.
  // Like the screenshots there's a light and a dark recording; switching theme mid-play
  // carries on from the same moment in the other one.
  const video = document.getElementById('demo-video');
  const videoFor = () => `assets/demo${isDark() ? '-dark' : ''}.mp4`;
  // If the browser refuses to autoplay (some low-power modes do), the still image stays up
  // instead, which is the intended fallback, so there's nothing more to do.
  const playVideo = () => video.play().catch(() => {});
  let onScreen = false;
  const themeVideo = () => {
    video.poster = `assets/demo-poster${isDark() ? '-dark' : ''}.webp`;
    if (!video.src || video.src.endsWith(videoFor())) return;
    const at = video.currentTime;
    video.addEventListener('loadedmetadata', () => { video.currentTime = at; }, { once: true });
    video.src = videoFor();
    video.load();
    if (onScreen) playVideo();
  };
  themeVideo();
  onThemeChange(themeVideo);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new IntersectionObserver(entries => entries.forEach(entry => {
      onScreen = entry.isIntersecting;
      if (onScreen) {
        if (!video.src) video.src = videoFor();
        playVideo();
      } else video.pause();
    }), { threshold: .4 }).observe(video);
  }
})();
