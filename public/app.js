/* สมุดวัดผล ปพ.5 · ตัวแอปหลัก: โครงหน้า การบันทึก เลิกทำ กล่องโต้ตอบ ตั้งค่า คีย์ลัด */

/* ---------------- ธีม ---------------- */
function applyTheme() {
  const st = S.settings || {};
  const root = document.documentElement;
  root.dataset.palette = st.palette || 'khram';
  if (st.theme === 'light' || st.theme === 'dark') root.dataset.theme = st.theme; else delete root.dataset.theme;
  root.style.setProperty('--font-print', `'${st.printFont || 'THSarabunPSK'}', 'THSarabunPSK', 'Sarabun', sans-serif`);
}

/* ---------------- บันทึก ---------------- */
function log(text) { const c = cur(); if (!c) return; c.log = (c.log || []).concat({ t: Date.now(), text }).slice(-300); }
function touch(c) {
  c = c || cur(); if (!c) return;
  S.dirty.add(c.id); S.saveState = 'saving'; pill();
  clearTimeout(S.timer); S.timer = setTimeout(flush, 700);
}
async function flush() {
  const ids = Array.from(S.dirty); S.dirty.clear();
  for (const id of ids) {
    const c = S.courses.find(x => x.id === id); if (!c) continue;
    c.updatedAt = Date.now();
    try {
      const snapJ = JSON.stringify(c);
      const p = Store.saveCourse(c);
      S.base[id] = snapJ;
      if (Store.mode === 'firebase' && !navigator.onLine) { S.saveState = 'offline'; pill(); }
      await p;
      S.saveState = 'saved';
    } catch (e) { S.saveState = 'err'; S.dirty.add(id); toast('บันทึกไม่สำเร็จ: ' + e.message); }
  }
  pill();
}
/* บันทึกตั้งค่า/ทะเบียนที่ค้างอยู่ทันที (ตอนปิดหรือสลับแท็บ) */
function flushSettings() { if (!S.setPending) return; clearTimeout(S.setTimer); S.setPending = false; try { const j = JSON.stringify(S.settings); Store.saveSettings(S.settings); S.baseSettings = j; } catch (e) { } }
function touchSettings() {
  clearTimeout(S.setTimer); S.setPending = true;
  S.saveState = 'saving'; pill();
  S.setTimer = setTimeout(async () => {
    S.setPending = false;
    try { const j = JSON.stringify(S.settings); const p = Store.saveSettings(S.settings); S.baseSettings = j; await p; S.saveState = 'saved'; } catch (e) { S.saveState = 'err'; toast('บันทึกตั้งค่าไม่สำเร็จ: ' + e.message); }
    pill();
  }, 600);
}
/* ---------------- ซิงก์กับเครื่องอื่น ---------------- */
async function saveNow(c) { const j = JSON.stringify(c); await Store.saveCourse(c); S.base[c.id] = j; }
function normCourse(c) {
  c.ratio = c.ratio || { mid: 70, final: 30 };
  ['scores', 'attendance', 'attr', 'rtw', 'comp', 'remedial'].forEach(k => c[k] = c[k] || {});
  ['tasks', 'students', 'units', 'sessions'].forEach(k => c[k] = c[k] || []);
  if (c.descFont === 'THSarabunIT') c.descFont = 'THSarabunPSK';
  return c;
}
function scheduleRender() {
  const a = document.activeElement;
  const typing = a && a !== document.body && a.closest && a.closest('#app') && a.matches('input, textarea, select, [contenteditable="true"]');
  if (typing || document.querySelector('dialog[open]')) { S.renderPending = true; return; }
  S.renderPending = false; if (S.user) render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (S.renderPending) scheduleRender(); }, 500));
setInterval(() => { if (S.renderPending) scheduleRender(); }, 2500);
let syncToastAt = 0;
function syncToast() { if (Date.now() - syncToastAt > 8000) { syncToastAt = Date.now(); toast('อัปเดตข้อมูลจากอุปกรณ์อื่นแล้ว'); } }
function onRemoteCourse(id, obj) {
  const i = S.courses.findIndex(c => c.id === id);
  if (obj === null) {
    if (i >= 0 && !S.dirty.has(id)) { S.courses.splice(i, 1); delete S.base[id]; if (S.cur === id) { S.cur = (S.courses[0] || {}).id || null; if (S.view === 'course') S.view = 'home'; } scheduleRender(); syncToast(); }
    return;
  }
  normCourse(obj);
  const rj = JSON.stringify(obj);
  if (S.base[id] === rj) return;
  if (i < 0) { S.courses.push(obj); S.base[id] = rj; if (!S.cur) S.cur = id; scheduleRender(); syncToast(); return; }
  const local = S.courses[i];
  const base = S.base[id] ? JSON.parse(S.base[id]) : null;
  const merged = base ? Sync.merge3(base, local, obj) : (S.dirty.has(id) ? local : obj);
  Sync.replaceInPlace(local, JSON.parse(JSON.stringify(merged)));
  S.base[id] = rj;
  S.undo[id] = []; S.redo[id] = [];
  if (JSON.stringify(local) !== rj) touch(local);
  scheduleRender(); syncToast();
}
function onRemoteSettings(obj) {
  const rj = JSON.stringify(obj);
  if (S.baseSettings === rj) return;
  const base = S.baseSettings ? JSON.parse(S.baseSettings) : null;
  const merged = base ? Sync.merge3(base, S.settings, obj) : obj;
  Sync.replaceInPlace(S.settings, Object.assign(defaultSettings(), JSON.parse(JSON.stringify(merged))));
  S.settings.scale = clone(Calc.DEFAULT_SCALE); S.settings.rounding = 'int'; S.settings.printFont = 'THSarabunPSK';
  S.baseSettings = rj;
  if (JSON.stringify(S.settings) !== rj) touchSettings();
  applyTheme(); scheduleRender();
}

function pill() {
  const el = $('#savePill'); if (!el) return;
  const m = { saved: ['บันทึกแล้ว', ''], saving: ['กำลังบันทึก…', 'saving'], offline: ['ออฟไลน์ · จะส่งเมื่อเน็ตกลับมา', 'saving'], err: ['บันทึกไม่สำเร็จ', 'err'] }[S.saveState] || ['', ''];
  el.innerHTML = `<i></i><span>${m[0]}</span>`; el.className = 'save-dot ' + m[1]; el.title = m[0];
}
window.addEventListener('online', () => { if (S.saveState === 'offline') flush(); });
window.addEventListener('beforeunload', e => { flushSettings(); if (S.dirty.size) { flush(); e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('pagehide', () => { flushSettings(); if (S.dirty.size) flush(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushSettings(); if (S.dirty.size) flush(); } });

/* ---------------- เลิกทำ / ทำซ้ำ ---------------- */
function snap(c) {
  c = c || cur(); if (!c) return;
  const u = S.undo[c.id] = S.undo[c.id] || [];
  u.push(JSON.stringify(c)); if (u.length > 80) u.shift();
  S.redo[c.id] = [];
}
function restore(json) {
  const obj = JSON.parse(json);
  const i = S.courses.findIndex(x => x.id === obj.id);
  if (i >= 0) S.courses[i] = obj;
  touch(obj); render();
}
function undo() {
  const c = cur(); if (!c) return;
  const u = S.undo[c.id]; if (!u || !u.length) { toast('ไม่มีสิ่งที่เลิกทำได้'); return; }
  (S.redo[c.id] = S.redo[c.id] || []).push(JSON.stringify(c));
  restore(u.pop()); toast('เลิกทำแล้ว');
}
function redo() {
  const c = cur(); if (!c) return;
  const r = S.redo[c.id]; if (!r || !r.length) return;
  (S.undo[c.id] = S.undo[c.id] || []).push(JSON.stringify(c));
  restore(r.pop()); toast('ทำซ้ำแล้ว');
}

/* ---------------- แจ้งเตือน ---------------- */
function toast(msg, action) {
  let w = $('#toasts'); if (!w) { w = document.createElement('div'); w.id = 'toasts'; w.className = 'toast-wrap'; document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { action.fn(); t.remove(); }; t.appendChild(b); }
  w.appendChild(t); setTimeout(() => t.remove(), action ? 6000 : 2600);
}

/* ---------------- กล่องโต้ตอบ ---------------- */
function dialog(title, body, buttons, opts) {
  const d = document.createElement('dialog'); d.className = 'dlg' + (opts && opts.wide ? ' wide' : '');
  if (opts && opts.wide) d.style.width = 'min(820px, calc(100vw - 32px))';
  d.innerHTML = `<div class="dlg-h"><h2>${esc(title)}</h2><button class="btn ghost sm" data-x aria-label="ปิด">✕</button></div><div class="dlg-b">${body}</div><div class="dlg-f"></div>`;
  const f = d.querySelector('.dlg-f');
  (buttons || []).forEach(b => {
    const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.type = 'button';
    el.onclick = async () => { const r = b.fn ? await b.fn(d) : true; if (r !== false) close(); };
    f.appendChild(el);
  });
  const close = () => { d.close(); d.remove(); };
  d.querySelector('[data-x]').onclick = close;
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.body.appendChild(d); d.showModal();
  const first = d.querySelector('input, select, textarea'); if (first) first.focus();
  return d;
}
function confirmBox(title, msg, okLabel, fn) {
  dialog(title, `<p>${msg}</p>`, [{ label: 'ยกเลิก', cls: 'ghost' }, { label: okLabel || 'ยืนยัน', cls: 'pri', fn }]);
}

/* ---------------- โครงหน้า ---------------- */
function pageMeta(c) {
  if (S.view === 'home') return { icon: 'home', hue: 'indigo', title: 'หน้าแรก', crumb: thaiDate(new Date()) };
  if (S.view === 'settings') return { icon: 'settings', hue: 'slate', title: 'ตั้งค่า', crumb: 'ใช้กับทุกรายวิชา' };
  if (S.view === 'timetable') return { icon: 'calendar', hue: 'cyan', title: 'ตารางสอน', crumb: 'ตารางสอนของฉัน และตารางเรียนรายห้อง' };
  if (S.view === 'live') { const L = S.live || {}; return { icon: 'live', hue: 'rose', title: 'Live Class', crumb: 'เช็คชื่อ · บันทึกการสอน · มอบงาน · คะแนนพิเศษ' + (L.date ? ' · ' + thaiDate(L.date) + ' คาบ ' + L.period : '') }; }
  if (S.view === 'tools') return { icon: 'dice', hue: 'violet', title: 'Class Tools', crumb: 'สุ่มชื่อ · จับกลุ่ม' };
  if (S.view === 'roster') return { icon: 'users', hue: 'teal', title: 'ทะเบียนนักเรียน', crumb: 'รายชื่อกลางรายชั้น ใช้ได้ทุกรายวิชา' };
  if (!c) return { icon: 'book', hue: 'indigo', title: 'ClassFolio', crumb: '' };
  const t = TABS.find(x => x[0] === S.tab) || TABS[0];
  return { icon: t[2], hue: t[3], title: t[1], crumb: 'รายวิชา › ' + c.code + ' ' + c.name };
}
function lvClass(c) { return levelOfCourse(c) === 'ป' ? 'lv-p' : 'lv-t'; }
function todoMap(c) { const m = {}; if (c) checkPages(c).forEach(p => { if (!p.ok) m[p.tab] = (m[p.tab] || 0) + 1; }); return m; }
const DOCK_MAIN = [['home', 'หน้าแรก', 'home', 'indigo'], ['live', 'Live Class', 'live', 'rose'], ['book', 'คะแนน', 'book', 'blue'], ['results', 'ตัดเกรด', 'check', 'green'], ['print', 'ปพ.5', 'print', 'pink']];

function render() {
  const root = $('#app');
  if (!S.user) return;
  const scrollY = window.scrollY;
  const tw = $('.tbl-wrap'); const tScroll = tw ? [tw.scrollLeft, tw.scrollTop] : null;
  const c = cur();
  const todo = todoMap(c);
  const m = pageMeta(c);
  const sorted = activeCourses().concat(c && c.archived ? [c] : []).slice().sort((a, b) => (b.year - a.year) || String(b.term).localeCompare(String(a.term)) || thColl.compare(a.code, b.code));
  const isOn = k => ['home', 'timetable', 'settings', 'live', 'tools', 'roster'].includes(k) ? S.view === k : S.view === 'course' && S.tab === k;
  const navBtn = (act, v, label, ic, hue, n) => `<button class="nav ${isOn(v || act) ? 'on' : ''}" data-hue="${hue}" data-act="${act}" ${v ? `data-v="${v}"` : ''} ${act === 'tab' && !c ? 'disabled' : ''}><span class="chipico">${ico(ic)}</span><span class="nl">${label}</span>${n ? `<span class="todo" title="หน้า ปพ.5 ที่ยังไม่ครบ ${n} หน้า">${n}</span>` : ''}</button>`;
  const initial = String(S.settings.teacher || 'ครู').trim().charAt(0);
  root.innerHTML = `
  <div class="app">
    <aside class="side">
      <button class="brand" data-act="home"><img class="brand-logo" src="icons/icon-192.png" alt="ClassFolio"><span><b>ClassFolio</b><small>Smart Teacher Workspace</small></span></button>
      <div class="side-top">
        ${navBtn('home', '', 'หน้าแรก', 'home', 'indigo')}
        ${navBtn('live', '', 'Live Class', 'live', 'rose')}
        ${navBtn('timetable', '', 'ตารางสอน', 'calendar', 'cyan')}
        ${navBtn('tools', '', 'Class Tools', 'dice', 'violet')}
        ${navBtn('roster', '', 'ทะเบียนนักเรียน', 'users', 'teal')}
      </div>
      <div class="side-label">รายวิชา</div>
      ${c ? `<button class="switch ${lvClass(c)}" data-act="switcher" aria-expanded="${S.switcher}"><span class="lv">${levelOfCourse(c)}</span><span class="sw-t"><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(classOf(c))} · ${esc(termLabel(c))}</small></span>${ico('chev')}</button>` : `<button class="switch" data-act="newCourse"><span class="sw-t"><b>สร้างรายวิชา</b><small>ยังไม่มีรายวิชา</small></span>${ico('plus')}</button>`}
      ${S.switcher ? `<div class="course-list">${sorted.map(x => `<button class="course-item ${lvClass(x)} ${x.id === S.cur ? 'on' : ''}" data-act="open" data-v="${x.id}"><span class="lv">${levelOfCourse(x)}</span><b>${esc(x.code)} ${esc(x.name)}</b><span>${esc(classOf(x))} · ${esc(termLabel(x))}</span></button>`).join('')}<button class="course-item" data-act="newCourse" style="--lvc:rgba(255,255,255,.18)"><span class="lv">+</span><b>สร้างรายวิชา</b><span>หรือคัดลอกจากวิชาเดิม</span></button></div>` : ''}
      <div class="side-scroll">
        ${TABS.map(([k, n, ic, hue]) => navBtn('tab', k, n, ic, hue, k !== 'overview' ? todo[k] : 0)).join('')}
      </div>
      <div class="side-foot">
        <div class="legend"><span class="todo">1</span> = หน้า ปพ.5 ที่ยังขาด แตะเมนูเพื่อเติม</div>
        ${navBtn('settings', '', 'ตั้งค่า', 'settings', 'slate', todo.settings)}
      </div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="tb-card">
        <span class="pageico" data-hue="${m.hue}">${ico(m.icon)}</span>
        <div class="title"><small>${esc(m.crumb)}</small><h1>${esc(m.title)}</h1></div>
        ${c ? `<button class="course-pill ${lvClass(c)}" data-act="pickCourse" title="เปลี่ยนรายวิชา"><span class="lv">${levelOfCourse(c)}</span><span class="cp-t"><b>${esc(c.code)}</b><small>${esc(classOf(c))}</small></span>${ico('chev')}</button>` : ''}
        <div class="top-actions">
          <button class="iconbtn" data-act="palette" title="ค้นหา (Ctrl+K)" aria-label="ค้นหา">${ico('search')}</button>
          ${c && ['course', 'live'].includes(S.view) ? `<button class="iconbtn hide-s" data-act="undo" title="เลิกทำ (Ctrl+Z)" aria-label="เลิกทำ">${ico('undo')}</button><button class="iconbtn hide-s" data-act="redo" title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">${ico('redo')}</button>` : ''}
          <button class="iconbtn" data-act="cycleTheme" title="โหมดสี: ${{ system: 'ตามเครื่อง', light: 'สว่าง', dark: 'มืด' }[S.settings.theme] || 'ตามเครื่อง'}" aria-label="สลับโหมดสี">${ico(S.settings.theme === 'dark' ? 'moon' : 'sun')}</button>
          <span class="save-dot" id="savePill" title="สถานะการบันทึก"></span>
          <button class="avatar" data-act="settings" title="${esc(S.settings.teacher || 'ตั้งค่า')}">${esc(initial)}</button>
        </div>
      </div></header>
      <div class="view" id="view">${renderView(c)}</div>
    </main>
  </div>
  <nav class="dock" aria-label="เมนูหลัก">
    ${DOCK_MAIN.map(([k, n, ic, hue]) => `<button class="${isOn(k) ? 'on' : ''}" data-hue="${hue}" data-act="${['home', 'timetable', 'live'].includes(k) ? k : 'tab'}" ${['home', 'timetable', 'live'].includes(k) ? '' : `data-v="${k}"`}><span class="chipico">${ico(ic)}</span><span class="${n.length > 7 ? 'tight' : ''}">${n}</span>${k !== 'home' && todo[k] ? `<span class="todo">${todo[k]}</span>` : ''}</button>`).join('')}
    <button class="${DOCK_MAIN.some(d => isOn(d[0])) ? '' : 'on'}" data-hue="violet" data-act="more"><span class="chipico">${ico('grid')}</span><span>เพิ่มเติม</span></button>
  </nav>`;
  pill();
  afterRender(c);
  fitBrand();
  window.scrollTo(0, scrollY);
  const tw2 = $('.tbl-wrap'); if (tw2 && tScroll) { tw2.scrollLeft = tScroll[0]; tw2.scrollTop = tScroll[1]; }
}

function moreSheet() {
  const c = cur(), todo = todoMap(c);
  const items = [['home', '', 'หน้าแรก', 'home', 'indigo'], ['live', '', 'Live Class', 'live', 'rose'], ['timetable', '', 'ตารางสอน', 'calendar', 'cyan'], ['tools', '', 'Class Tools', 'dice', 'violet'], ['roster', '', 'ทะเบียนนักเรียน', 'users', 'teal']].concat(c ? TABS.map(([k, n, ic, hue]) => ['tab', k, n, ic, hue]) : []).concat([['settings', '', 'ตั้งค่า', 'settings', 'slate']]);
  const d = document.createElement('dialog'); d.className = 'dlg sheet-dlg';
  d.innerHTML = `<div class="dlg-h"><h2>เมนูทั้งหมด</h2><button class="btn ghost sm" data-x aria-label="ปิด">✕</button></div>
    ${c ? `<button class="sheet-course ${lvClass(c)}" data-go="pick"><span class="lv">${levelOfCourse(c)}</span><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(classOf(c))} · ${esc(termLabel(c))} · แตะเพื่อเปลี่ยนวิชา</small></span>${ico('chev')}</button>` : ''}
    <div class="sheet-grid">${items.map(([a, v, n, ic, hue]) => { const t = a === 'tab' && v !== 'overview' ? todo[v] : a === 'settings' ? todo.settings : 0; return `<button data-hue="${hue}" data-go="${a}|${v}"><span class="chipico">${ico(ic)}</span><span>${n}</span>${t ? `<span class="todo">${t}</span>` : ''}</button>`; }).join('')}</div>
    ${isStandalone() ? '' : `<button class="sheet-course" data-go="install|" style="margin-bottom:10px"><span class="lv" style="--lvc:#7444dc">${ico('download')}</span><span><b>ติดตั้งเป็นแอป</b><small>มีไอคอนบนหน้าจอ เปิดเต็มจอ</small></span></button>`}
    <p class="note" style="padding:0 22px 18px"><span class="todo">1</span> = หน้า ปพ.5 ที่ยังไม่ครบ ยังขาดกี่หน้า</p>`;
  document.body.appendChild(d); d.showModal();
  const close = () => { d.close(); d.remove(); };
  d.querySelector('[data-x]').onclick = close;
  d.addEventListener('click', e => { if (e.target === d) close(); const b = e.target.closest('[data-go]'); if (!b) return; close(); const [a, v] = b.dataset.go.split('|'); if (a === 'pick') coursePicker(); else ACT[a](v); });
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
}

function renderView(c) {
  if (S.view === 'settings') return viewSettings();
  if (S.view === 'home') return viewHome();
  if (S.view === 'timetable') return viewTimetable();
  if (S.view === 'live') return viewLive();
  if (S.view === 'tools') return viewTools();
  if (S.view === 'roster') return viewRoster();
  if (!c) return `${Store.mode === 'local' ? localBanner() : ''}<div class="card empty"><h3>ยังไม่มีรายวิชา</h3><p>สร้างรายวิชาแรก หรือโหลดข้อมูลตัวอย่างเพื่อทดลองใช้</p><div class="row"><button class="btn pri" data-act="newCourse">${ico('plus')} สร้างรายวิชา</button><button class="btn" data-act="demo">โหลดข้อมูลตัวอย่าง</button></div></div>`;
  const v = { overview: viewOverview, book: viewBook, teach: viewTeach, structure: viewStructure, desc: viewDesc, students: viewStudents, att: viewAtt, assess: viewAssess, results: viewResults, print: viewPrint, log: viewLog }[S.tab] || viewOverview;
  return (c.archived ? `<div class="banner arc">${ico('book')}<span><b>คลังภาคเรียนเก่า</b> รายวิชานี้จบภาคเรียนแล้ว ไม่แสดงใน Live Class และตารางสอน แก้ไข พิมพ์ ปพ.5 และส่งออก Excel ได้ตามปกติ</span><button class="btn sm" data-act="unarchive">${ico('undo')} นำกลับมาใช้งาน</button></div>` : '') + v(c);
}
function localBanner() {
  return `<div class="banner">${ico('alert')}<span><b>โหมดทดลอง</b> ข้อมูลเก็บในเบราว์เซอร์เครื่องนี้เท่านั้น เมื่อติดตั้งบน Vercel + Firebase ข้อมูลจะเก็บบนคลาวด์และเข้าได้ทุกเครื่อง</span></div>`;
}

/* เริ่มพิมพ์: ถ้าแผ่นแรกเป็นแนวนอน ให้ทั้งเอกสารเริ่มด้วยหน้าแนวนอน (กันหน้าว่างแผ่นแรก) */
/* name = ชื่อไฟล์ตอน "บันทึกเป็น PDF" (เบราว์เซอร์ใช้ชื่อหน้าเว็บเป็นชื่อไฟล์) */
function printNow(name) {
  const root = $('#printRoot'), first = root && root.querySelector('.sheet');
  if (root) root.style.page = first && first.classList.contains('land') ? 'land' : 'auto';
  const old = 'ClassFolio';
  if (name) document.title = safeFile(name);
  let done = false;
  const back = () => { if (done) return; done = true; document.title = old; window.removeEventListener('afterprint', back); };
  window.addEventListener('afterprint', back);
  setTimeout(() => { window.print(); setTimeout(back, 1500); }, 60);
}
function fitSheets() {
  const wrap = $('#sheets'); if (!wrap) return;
  const avail = wrap.clientWidth - 24;
  $$('.sheet', wrap).forEach(sh => { sh.style.zoom = ''; const z = Math.min(1, avail / sh.offsetWidth); sh.style.zoom = z < 1 ? z.toFixed(3) : ''; });
}
window.addEventListener('resize', () => { if (S.view === 'course' && S.tab === 'print') fitSheets(); });
function afterRender(c) {
  if (S.view === 'course' && S.tab === 'desc') setupEditor(c);
  if (S.view === 'course' && S.tab === 'print') fitSheets();
  // หัวตารางหลายแถว: คำนวณตำแหน่งติดด้านบนจากความสูงจริง
  $$('table.tbl thead').forEach(th => { let top = 0; Array.from(th.rows).forEach(r => { Array.from(r.cells).forEach(cell => { cell.style.top = top + 'px'; }); top += r.offsetHeight; }); });
}

/* ---------------- ตัวแก้ไขคำอธิบายรายวิชา ---------------- */
function setupEditor(c) {
  const paper = $('#paper'); if (!paper) return;
  let t;
  paper.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { c.descHtml = paper.innerHTML; touch(c); }, 400); });
  paper.addEventListener('focus', () => { S.pending = JSON.stringify(c); });
  paper.addEventListener('blur', () => { if (S.pending && S.pending !== JSON.stringify(c)) { (S.undo[c.id] = S.undo[c.id] || []).push(S.pending); } S.pending = null; c.descHtml = paper.innerHTML; touch(c); });
  const exec = (cmd, val) => { paper.focus(); try { document.execCommand('styleWithCSS', false, true); } catch (e) { } document.execCommand(cmd, false, val); c.descHtml = paper.innerHTML; touch(c); };
  $$('[data-ed]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); exec(b.dataset.ed); }));
  $('#edFont').addEventListener('change', e => exec('fontName', e.target.value));
  $('#edColor').addEventListener('change', e => exec('foreColor', e.target.value));
  $('#edSize').addEventListener('change', e => {
    paper.focus();
    try { document.execCommand('styleWithCSS', false, false); } catch (x) { }
    document.execCommand('fontSize', false, '7');
    $$('font[size="7"]', paper).forEach(fe => { const sp = document.createElement('span'); sp.style.fontSize = e.target.value + 'pt'; sp.innerHTML = fe.innerHTML; fe.replaceWith(sp); });
    $$('span', paper).forEach(sp => { if (sp.style.fontSize === 'xxx-large' || sp.style.fontSize === '-webkit-xxx-large') sp.style.fontSize = e.target.value + 'pt'; });
    c.descHtml = paper.innerHTML; touch(c);
  });
  $('#edLine').addEventListener('change', e => { snap(c); c.descLine = Number(e.target.value); paper.style.lineHeight = c.descLine; touch(c); });
  $('#edPage').addEventListener('change', e => { snap(c); c.descSize = Number(e.target.value); render(); touch(c); });
  $('#edShowInd').addEventListener('change', e => { snap(c); c.showInd = e.target.checked; render(); touch(c); });
  $('#edBase').addEventListener('change', e => { snap(c); c.descFont = e.target.value; paper.style.fontFamily = `'${c.descFont}',Sarabun,sans-serif`; touch(c); });
}

/* ---------------- ตั้งค่า ---------------- */
function viewSettings() {
  const st = S.settings;
  const demoN = S.courses.filter(c => c.demo).length;
  return `
  <div class="grid2">
    <div class="card">
      <div class="card-h"><h2>ข้อมูลโรงเรียน</h2></div>
      <div class="form-grid" style="grid-template-columns:minmax(0,1fr)">
        <label class="field"><span>ชื่อโรงเรียน</span><input class="inp" data-set="school" value="${esc(st.school)}"></label>
        <label class="field"><span>สังกัด / เขตพื้นที่</span><input class="inp" data-set="area" value="${esc(st.area)}"></label>
        <label class="field"><span>ชื่อครูผู้สอน (ค่าเริ่มต้นของรายวิชาใหม่)</span><input class="inp" data-set="teacher" value="${esc(st.teacher)}"></label>
        <div class="field"><span>ตราโรงเรียน (ใช้บนปกและลายน้ำ)</span>
          <div class="row">${st.logo ? `<img src="${st.logo}" alt="ตราโรงเรียน" style="width:56px;height:56px;object-fit:contain;border:1px solid var(--line);border-radius:8px">` : ''}
          <label class="btn">${ico('upload')} เลือกรูป<input type="file" accept="image/*" id="logoFile" hidden></label>
          ${st.logo ? '<button class="btn ghost danger sm" data-act="delLogo">ลบรูป</button>' : ''}</div></div>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h2>ผู้ลงนามบนปก</h2><button class="btn sm" data-act="addSigner" ${st.signers.length >= 6 ? 'disabled' : ''}>${ico('plus')} เพิ่ม</button></div>
      <div style="display:grid;gap:8px">${st.signers.map((x, i) => `<div class="sg-row"><input class="inp" data-sg="${i}|role" value="${esc(x.role)}" placeholder="ตำแหน่ง" aria-label="ตำแหน่ง"><input class="inp" data-sg="${i}|name" value="${esc(x.name)}" placeholder="ชื่อ-สกุล" aria-label="ชื่อ-สกุล"><button class="btn ghost sm danger" data-act="delSigner" data-v="${i}" aria-label="ลบผู้ลงนาม">${ico('trash')}</button></div>`).join('')}</div>
      <p class="note" style="margin-top:8px">เรียงจากผู้เสนอถึงผู้อนุมัติ ไม่เกิน 6 ชั้น · คนสุดท้ายมีช่อง อนุมัติ/ไม่อนุมัติ · ช่องชื่อครูผู้สอนเว้นว่างได้ ระบบใช้ชื่อครูของรายวิชา</p>
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-h"><h2>เกณฑ์การวัดผล</h2><span class="chip acc">หลักสูตรแกนกลางฯ 2551</span></div>
      <div class="form-grid">
        <label class="field"><span>เกณฑ์ผ่านหน่วย (% ของคะแนนเต็ม)</span><input class="inp" type="number" data-set="minPct" value="${esc(st.minPct)}"></label>
        <label class="field"><span>เวลาเรียนขั้นต่ำ (%)</span><input class="inp" type="number" data-set="minAtt" value="${esc(st.minAtt)}"></label>
        <label class="field"><span>สัดส่วนเริ่มต้น ประถม (ระหว่างปี : ปลายปี)</span><div class="row" style="flex-wrap:nowrap"><input class="inp" type="number" min="0" max="100" data-set="ratioMidP" value="${esc(st.ratioMidP ?? st.ratioMid)}"><span>:</span><input class="inp" type="number" min="0" max="100" data-set="ratioFinalP" value="${esc(st.ratioFinalP ?? st.ratioFinal)}"></div></label>
        <label class="field"><span>สัดส่วนเริ่มต้น มัธยม (ระหว่างภาค : ปลายภาค)</span><div class="row" style="flex-wrap:nowrap"><input class="inp" type="number" min="0" max="100" data-set="ratioMid" value="${esc(st.ratioMid)}"><span>:</span><input class="inp" type="number" min="0" max="100" data-set="ratioFinal" value="${esc(st.ratioFinal)}"></div></label>
        <p class="note wide" style="grid-column:1/-1;margin:0">ใช้ตอนสร้างรายวิชาใหม่ (เลือกให้ตามรหัสวิชา) แต่ละรายวิชาเปลี่ยนเองได้ที่ <b>โครงสร้างรายวิชา</b></p>
      </div>
      <h3 style="margin:18px 0 8px">ระดับผลการเรียน 8 ระดับ</h3>
      <div class="tbl-wrap flat"><table class="tbl"><thead><tr><th>ระดับ</th><th>ช่วงคะแนน (ร้อยละ)</th><th class="l">ความหมาย</th></tr></thead><tbody>${GRADE_TABLE.map(([g, r, m]) => `<tr><td class="c"><b class="g-${g}">${g}</b></td><td class="c num">${r}</td><td>${m}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin-top:8px">คะแนนทุกช่องปัดเป็นจำนวนเต็มก่อนเทียบช่วง (ทศนิยม .5 ขึ้นไปปัดขึ้น) · <b>ร</b> = รอการตัดสิน มีงานค้าง · <b>มส</b> = ไม่มีสิทธิ์สอบ เวลาเรียนไม่ถึง ${esc(st.minAtt)}%</p>
    </div>
    <div class="card">
      ${isStandalone() ? '' : `<div class="install-box"><img src="icons/icon-192.png" alt="" width="44" height="44" onerror="this.remove()"><div><b>ติดตั้ง ClassFolio เป็นแอป</b><small>มีไอคอนบนหน้าจอ เปิดเต็มจอ ใช้ได้แม้เน็ตหลุด</small></div><button class="btn pri sm" data-act="install">${ico('download')} ติดตั้ง</button></div>`}
      <div class="card-h"><h2>หน้าตา</h2></div>
      <div class="field"><span>สีประจำระบบ</span><div class="row">${PALETTES.map(([k, n, col]) => `<button class="btn ${st.palette === k ? 'pri' : ''}" data-act="palette-set" data-v="${k}"><span style="width:14px;height:14px;border-radius:50%;background:${col};display:inline-block"></span> ${n}</button>`).join('')}</div></div>
      <div class="field" style="margin-top:12px"><span>โหมดสี</span><div class="seg">${[['system', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']].map(([k, n]) => `<button data-act="theme-set" data-v="${k}" class="${st.theme === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="card-h" style="margin-top:22px"><h2>การสำรองข้อมูล</h2><span class="chip ok">${ico('check')} อัตโนมัติ</span></div>
      <p class="small" style="margin:0 0 10px">ระบบบันทึกทุกครั้งที่พิมพ์ และสำรองข้อมูลทั้งหมดให้เองวันละ 1 ครั้ง เก็บย้อนหลัง ${Store.mode === 'firebase' ? 14 : 7} วัน ถ้ากรอกผิดหรือลบพลาด กู้คืนจากรายการนี้ได้</p>
      <div style="display:grid;gap:6px">${(S.backups || []).length ? S.backups.map(b => `<div class="row" style="justify-content:space-between;background:var(--panel-2);border-radius:10px;padding:7px 12px"><span><b>${esc(thaiDate(b.at))}</b> <span class="note">${new Date(b.at).toTimeString().slice(0, 5)} น. · ${b.n} รายวิชา${b.pre ? ' · ก่อนกู้คืน' : ''}</span></span><button class="btn sm" data-act="restoreBk" data-v="${b.id}">กู้คืนฉบับนี้</button></div>`).join('') : '<p class="note">ยังไม่มีฉบับสำรอง</p>'}</div>
      <details style="margin-top:12px"><summary class="small" style="cursor:pointer;color:var(--muted)">ตัวเลือกเพิ่มเติม</summary>
        <div class="row" style="margin-top:10px"><button class="btn sm" data-act="backup">${ico('download')} ดาวน์โหลดสำเนาเก็บเอง</button><label class="btn sm">${ico('upload')} นำเข้าจากไฟล์<input type="file" accept=".json,application/json" id="restoreFile" hidden></label>${Store.mode === 'local' ? '<button class="btn sm" data-act="demo">สร้างข้อมูลตัวอย่าง</button>' : ''}</div>
        <p class="note" style="margin-top:6px">ใช้เมื่อต้องการย้ายข้อมูลข้ามบัญชี หรือเก็บสำเนาไว้ในเครื่องตัวเอง</p>
      </details>
      ${demoN ? `<button class="btn sm danger" data-act="delDemo" style="margin-top:12px">${ico('trash')} ลบข้อมูลตัวอย่าง (${demoN} วิชา)</button>` : ''}
    </div>
  </div>`;
}

/* ---------------- คำสั่ง ---------------- */
const ACT = {
  tab(v) { if (!cur()) return; S.view = 'course'; S.tab = v; render(); window.scrollTo(0, 0); },
  open(v) { flush(); S.cur = v; S.view = 'course'; S.switcher = false; render(); window.scrollTo(0, 0); },
  go(v) { const [id, tab] = v.split('|'); flush(); S.cur = id; S.view = 'course'; S.tab = tab; render(); window.scrollTo(0, 0); },
  home() { S.view = 'home'; S.switcher = false; render(); window.scrollTo(0, 0); },
  settings() { S.view = 'settings'; render(); window.scrollTo(0, 0); },
  switcher() { S.switcher = !S.switcher; render(); },
  pickCourse() { coursePicker(); },
  more() { moreSheet(); },
  printAtt() { const c = cur(); $('#printRoot').innerHTML = Print.render(c, S.settings, { pages: ['4'], bw: S.printBW, wm: S.watermark }); log('พิมพ์บันทึกเวลาเรียน'); touch(c); printNow('บันทึกเวลาเรียน ' + courseFileTag(c)); },
  install() { installApp(); },
  xlsx() { exportExcel(cur()); },
  timetable() { S.view = 'timetable'; render(); window.scrollTo(0, 0); },
  ttMode(v) { S.ttMode = v; render(); },
  ttDay(v) { S.ttDay = Number(v); render(); },
  ttEdit(v) { ttEditDialog(v); },
  ttClassEdit(v) { ttClassEditDialog(v); },
  ttPeriods() { ttPeriodsDialog(); },
  ttPrint() { ttPrint(); },
  ttAddRoom() {
    const dlg = dialog('เพิ่มห้องเรียน', '<label class="field"><span>ชั้น/ห้อง เช่น ม.2/1</span><input class="inp" id="ttNewRoom"></label>', [{ label: 'ยกเลิก', cls: 'ghost' }, { label: 'เพิ่ม', cls: 'pri', fn: d => { const r = $('#ttNewRoom', d).value.trim(); if (!r) return false; tt().extraRooms = (tt().extraRooms || []).concat(r); S.ttRoom = r; touchSettings(); render(); } }]);
  },
  palette() { openPalette(); },
  undo, redo,
  cycleTheme() { const o = ['system', 'light', 'dark']; S.settings.theme = o[(o.indexOf(S.settings.theme) + 1) % 3]; applyTheme(); touchSettings(); render(); },
  'theme-set'(v) { S.settings.theme = v; applyTheme(); touchSettings(); render(); },
  'palette-set'(v) { S.settings.palette = v; applyTheme(); touchSettings(); render(); },
  async signOut() { await flush(); if (S.unwatch) { S.unwatch(); S.unwatch = null; } await Store.signOut(); S.user = null; renderLanding(null); },
  newCourse() { newCourseDialog(); },
  async demo() {
    const list = makeDemoCourses(S.settings);
    for (const c of list) { S.courses.push(c); await saveNow(c); }
    S.cur = list[0].id; S.view = 'home'; render(); toast('สร้างข้อมูลตัวอย่าง 2 รายวิชาแล้ว');
  },
  delDemo() {
    confirmBox('ลบข้อมูลตัวอย่าง', 'ลบรายวิชาตัวอย่างทั้งหมด ข้อมูลจริงของครูไม่ถูกลบ', 'ลบ', async () => {
      for (const c of S.courses.filter(x => x.demo)) await Store.deleteCourse(c.id);
      S.courses = S.courses.filter(x => !x.demo); if (!cur()) S.cur = S.courses[0]?.id || null; render(); toast('ลบข้อมูลตัวอย่างแล้ว');
    });
  },
  addTask() { taskDialog(null); },
  task(v) { taskDialog(v); },
  addUnit() { const c = cur(); snap(c); const fi = c.units.findIndex(u => u.isFinal); c.units.splice(fi < 0 ? c.units.length : fi, 0, newUnit('หน่วยการเรียนรู้ที่ ' + (c.units.filter(u => !u.isFinal).length + 1), 0)); log('เพิ่มหน่วยการเรียนรู้'); touch(c); render(); },
  delUnit(v) {
    const c = cur(), u = c.units.find(x => x.id === v), n = Calc.unitTasks(c, v).length;
    confirmBox('ลบหน่วย', `ลบ "${esc(u.name)}"${n ? ` และงาน ${n} ชิ้นในหน่วยนี้พร้อมคะแนน` : ''} กด Ctrl+Z เพื่อเลิกทำได้`, 'ลบหน่วย', () => {
      snap(c); c.tasks.filter(t => t.unit === v).forEach(t => delete c.scores[t.id]); c.tasks = c.tasks.filter(t => t.unit !== v); c.units = c.units.filter(x => x.id !== v); log('ลบหน่วย ' + u.name); touch(c); render();
    });
  },
  unitUp(v) { const c = cur(), i = c.units.findIndex(u => u.id === v); if (i > 0) { snap(c); [c.units[i - 1], c.units[i]] = [c.units[i], c.units[i - 1]]; touch(c); render(); } },
  fitUnits() { const c = cur(); snap(c); fitUnitWeights(c); log('ปรับคะแนนหน่วยให้รวม ' + c.ratio.mid); touch(c); render(); toast('ปรับคะแนนหน่วยให้รวมเท่ากับ ' + c.ratio.mid + ' แล้ว', { label: 'เลิกทำ', fn: undo }); },
  convert(v) { const c = cur(); snap(c); c.convert = v; log('เปลี่ยนวิธีแปลงคะแนน'); touch(c); render(); },
  dupCourse() {
    const c = cur(); const n = clone(c); n.id = newId('c'); n.code = c.code; n.name = c.name + ' (สำเนา)'; n.demo = false;
    n.scores = {}; n.attendance = {}; n.attr = {}; n.rtw = {}; n.comp = {}; n.remedial = {}; n.log = [{ t: Date.now(), text: 'คัดลอกโครงสร้างจาก ' + c.code + ' ' + c.name }];
    S.courses.push(n); S.cur = n.id; S.tab = 'structure'; touch(n); render(); toast('คัดลอกโครงสร้าง งาน และรายชื่อแล้ว คะแนนเริ่มใหม่');
  },
  delCourse() {
    const c = cur();
    confirmBox('ลบรายวิชา', `ลบ <b>${esc(c.code)} ${esc(c.name)}</b> ทั้งหมด รวมคะแนนและรายชื่อ ลบแล้วกู้คืนไม่ได้ ควรสำรองข้อมูลก่อน`, 'ลบถาวร', async () => {
      await Store.deleteCourse(c.id); S.courses = S.courses.filter(x => x.id !== c.id); S.cur = S.courses[0]?.id || null; S.tab = 'overview'; render(); toast('ลบรายวิชาแล้ว');
    });
  },
  saveTpl() {
    const c = cur(), name = ($('#tplName').value || '').trim();
    if (!name) { toast('ตั้งชื่อต้นแบบก่อน'); $('#tplName').focus(); return; }
    const p = $('#paper'); c.descHtml = p.innerHTML;
    S.settings.templates = (S.settings.templates || []).concat({ name, html: c.descHtml, font: c.descFont, line: c.descLine });
    touchSettings(); render(); toast('บันทึกต้นแบบ "' + name + '" แล้ว');
  },
  useTpl(v) { const c = cur(), t = S.settings.templates[v]; snap(c); c.descHtml = t.html; c.descFont = t.font || c.descFont; c.descLine = t.line || c.descLine; log('ใช้ต้นแบบคำอธิบายรายวิชา ' + t.name); touch(c); render(); },
  delTpl(v) { S.settings.templates.splice(Number(v), 1); touchSettings(); render(); },
  importStu() { importDialog(); },
  addStu() {
    const c = cur(); snap(c); const n = Calc.activeStudents(c).length + 1;
    c.students.push({ id: newId('s'), no: n, code: '', prefix: '', first: '', last: '', status: 'active' }); log('เพิ่มนักเรียนเลขที่ ' + n); touch(c); render();
    const ins = $$('[data-st$="|code"]'); if (ins.length) ins[ins.length - 1].focus();
  },
  renumber() { renumberDialog(); },
  stuOut(v) { const c = cur(), s = c.students.find(x => x.id === v); snap(c); s.status = 'out'; renumberKeep(c); log('ย้ายออก ' + studentName(s)); touch(c); render(); toast('ย้ายออกแล้ว เลขที่ต่อเนื่องให้อัตโนมัติ', { label: 'เลิกทำ', fn: undo }); },
  stuIn(v) { const c = cur(), s = c.students.find(x => x.id === v); snap(c); s.status = 'active'; s.no = 9999; renumberKeep(c); log('กลับเข้าเรียน ' + studentName(s)); touch(c); render(); },
  delStu(v) {
    const c = cur(), s = c.students.find(x => x.id === v);
    confirmBox('ลบนักเรียน', `ลบ ${esc(studentName(s) || 'แถวนี้')} พร้อมคะแนนทั้งหมด ถ้านักเรียนย้ายออกกลางภาค แนะนำให้กด "ย้ายออก" แทน`, 'ลบ', () => {
      snap(c); c.students = c.students.filter(x => x.id !== v);
      Object.values(c.scores).forEach(m => delete m[v]);['attendance', 'attr', 'rtw', 'comp', 'remedial'].forEach(k => delete (c[k] || {})[v]);
      renumberKeep(c); log('ลบนักเรียน ' + studentName(s)); touch(c); render();
    });
  },
  assessKind(v) { S.assessKind = v; render(); },
  fillAssess() {
    const c = cur(), k = S.assessKind, val = Number($('#fillVal').value); snap(c);
    let n = 0; Calc.activeStudents(c).forEach(s => { const a = (c[k][s.id] = c[k][s.id] || []); ASSESS[k].items.forEach((_, i) => { if (a[i] === undefined || a[i] === null || a[i] === '') { a[i] = val; n++; } }); });
    log('เติมผลประเมิน ' + ASSESS[k].title + ' ' + n + ' ช่อง'); touch(c); render(); toast('เติมแล้ว ' + n + ' ช่อง');
  },
  bw(v) { S.printBW = v === '1'; render(); },
  doPrint() {
    const c = cur();
    $('#printRoot').innerHTML = Print.render(c, S.settings, { pages: S.printPages || PAGES.map(p => p[0]), bw: S.printBW, wm: S.watermark });
    log('พิมพ์ ปพ.5'); touch(c);
    const pp = S.printPages || PAGES.map(p => p[0]), all = pp.length === PAGES.length;
    printNow('ปพ.5 ' + courseFileTag(c) + (all ? '' : ' (หน้า ' + pp.join(',') + ')'));
  },
  addSigner() { if (S.settings.signers.length < 6) { S.settings.signers.splice(S.settings.signers.length - 1, 0, { role: '', name: '' }); touchSettings(); render(); } },
  delSigner(v) { S.settings.signers.splice(Number(v), 1); touchSettings(); render(); },
  delLogo() { S.settings.logo = ''; touchSettings(); render(); },
  restoreBk(v) {
    const b = (S.backups || []).find(x => x.id === v);
    confirmBox('กู้คืนข้อมูล', `ย้อนข้อมูลทุกรายวิชากลับไปเป็นฉบับวันที่ <b>${esc(thaiDate(b.at))}</b> ระบบจะสำรองข้อมูลปัจจุบันไว้ก่อน จึงย้อนกลับมาได้อีก`, 'กู้คืน', async () => {
      await flush();
      await saveBackupNow(true);
      const data = JSON.parse(await Store.getBackup(v));
      const keep = new Set(data.courses.map(c => c.id));
      for (const c of S.courses) if (!keep.has(c.id)) await Store.deleteCourse(c.id);
      for (const c of data.courses) await saveNow(c);
      S.courses = data.courses; S.cur = S.courses[0]?.id || null; S.undo = {}; S.redo = {};
      if (data.roster) { S.settings.roster = data.roster; touchSettings(); }
      S.backups = await Store.listBackups(); S.view = 'home'; render(); toast('กู้คืนข้อมูลแล้ว');
    });
  },
  backup() {
    const data = { app: 'samutwadphon', version: 1, exportedAt: new Date().toISOString(), settings: S.settings, courses: S.courses };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ClassFolio สำรองข้อมูล ' + thaiDateFile() + '.json'; document.body.appendChild(a); a.click(); a.remove();
    toast('ดาวน์โหลดไฟล์สำรองแล้ว');
  }
};
Object.assign(ACT, LIVE_ACT, TERM_ACT, ROSTER_ACT);
function coursePicker() {
  const list = activeCourses().sort((a, b) => (b.year - a.year) || thColl.compare(a.code, b.code)), arc = archivedCourses();
  const d = dialog('เลือกรายวิชา', `<div style="display:grid;gap:6px">${list.map(x => `<button class="btn ${x.id === S.cur ? 'pri' : ''}" data-pick="${x.id}" style="justify-content:flex-start;white-space:normal;text-align:left"><b>${esc(x.code)}</b> ${esc(x.name)} · ${esc(classOf(x))} · ${esc(termLabel(x))}</button>`).join('')}<button class="btn" data-pick="new">${ico('plus')} สร้างรายวิชา</button>${arc.length ? `<div class="side-label" style="color:var(--muted);margin-top:6px">คลังภาคเรียนเก่า</div>${arc.map(x => `<button class="btn ghost ${x.id === S.cur ? 'pri' : ''}" data-pick="${x.id}" style="justify-content:flex-start;white-space:normal;text-align:left"><b>${esc(x.code)}</b> ${esc(x.name)} · ${esc(classOf(x))} · ${esc(termLabel(x))}</button>`).join('')}` : ''}</div>`, []);
  d.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { d.close(); d.remove(); if (b.dataset.pick === 'new') newCourseDialog(); else ACT.open(b.dataset.pick); });
}
function renumberKeep(c) { Calc.activeStudents(c).forEach((s, i) => s.no = i + 1); }

/* ---------------- กล่อง: งาน ---------------- */
function taskDialog(tid) {
  const c = cur();
  const t = tid ? c.tasks.find(x => x.id === tid) : { name: '', full: 10, unit: (c.units.find(u => !u.isFinal) || c.units[0]).id, weight: 1, bonus: false };
  const body = `
    <label class="field"><span>ชื่องาน</span><input class="inp" id="tName" value="${esc(t.name)}" placeholder="เช่น ใบงานที่ 1, สอบย่อย, ชิ้นงานกลุ่ม"></label>
    <div class="form-grid">
      <label class="field"><span>คะแนนเต็มของงานนี้</span><input class="inp" id="tFull" type="number" min="0" step="any" value="${esc(t.full)}"></label>
      <label class="field"><span>อยู่ในหน่วย</span><select class="inp" id="tUnit">${c.units.map((u, i) => `<option value="${u.id}" ${u.id === t.unit ? 'selected' : ''}>${u.isFinal ? u.name : 'หน่วย ' + (i + 1) + ' ' + esc(u.name)}</option>`).join('')}</select></label>
      ${c.convert === 'weighted' ? `<label class="field"><span>น้ำหนักงาน (ส่วน)</span><input class="inp" id="tWeight" type="number" min="0" step="any" value="${esc(t.weight || 1)}"></label>` : ''}
    </div>
    <label class="row small"><input type="checkbox" id="tBonus" ${t.bonus ? 'checked' : ''}> คะแนนพิเศษ (บวกเพิ่มได้ แต่ไม่เกินคะแนนเต็มของหน่วย และไม่นับเป็นงานค้าง)</label>
    ${tid ? `<div class="row"><button class="btn sm" type="button" id="tFillFull">ใส่คะแนนเต็มให้คนที่ยังว่าง</button><button class="btn sm" type="button" id="tFillZero">ใส่ 0 ให้คนที่ยังว่าง</button></div>` : ''}`;
  const btns = [];
  if (tid) btns.push({ label: 'ลบงานนี้', cls: 'danger left', fn: () => { snap(c); c.tasks = c.tasks.filter(x => x.id !== tid); delete c.scores[tid]; log('ลบงาน ' + t.name); touch(c); render(); } });
  btns.push({ label: 'ยกเลิก', cls: 'ghost' });
  btns.push({
    label: tid ? 'บันทึก' : 'เพิ่มงาน', cls: 'pri', fn: d => {
      const name = $('#tName', d).value.trim(), full = Number($('#tFull', d).value);
      if (!name) { toast('ใส่ชื่องานก่อน'); $('#tName', d).focus(); return false; }
      if (!(full > 0)) { toast('คะแนนเต็มต้องมากกว่า 0'); $('#tFull', d).focus(); return false; }
      snap(c);
      const obj = tid ? t : { id: newId('t') };
      Object.assign(obj, { name, full, unit: $('#tUnit', d).value, bonus: $('#tBonus', d).checked, weight: $('#tWeight', d) ? Number($('#tWeight', d).value) || 1 : (obj.weight || 1) });
      if (!tid) { c.tasks.push(obj); c.scores[obj.id] = {}; log('เพิ่มงาน ' + name + ' (เต็ม ' + full + ')'); } else log('แก้ไขงาน ' + name);
      touch(c); render();
    }
  });
  const d = dialog(tid ? 'แก้ไขงาน' : 'เพิ่มงานในสมุดคะแนน', body, btns);
  const fill = val => { snap(c); let n = 0; Calc.activeStudents(c).forEach(s => { const m = c.scores[tid] = c.scores[tid] || {}; if (m[s.id] === '' || m[s.id] === undefined || m[s.id] === null) { m[s.id] = val === 'full' ? Number(t.full) : 0; n++; } }); log('เติมคะแนน ' + t.name + ' ' + n + ' คน'); touch(c); d.close(); d.remove(); render(); toast('เติมแล้ว ' + n + ' คน', { label: 'เลิกทำ', fn: undo }); };
  if (tid) { $('#tFillFull', d).onclick = () => fill('full'); $('#tFillZero', d).onclick = () => fill(0); }
}

/* ---------------- กล่อง: รายวิชาใหม่ ---------------- */
function newCourseDialog() {
  const others = S.courses;
  const body = `${catalogPicker()}<div class="form-grid">
    <label class="field"><span>รหัสวิชา</span><input class="inp" id="nCode" placeholder="ส21101"></label>
    <label class="field"><span>ชื่อวิชา</span><input class="inp" id="nName" placeholder="สังคมศึกษา 1"></label>
    <label class="field"><span>ชั้น</span><input class="inp" id="nGrade" placeholder="ม.1"></label>
    <label class="field"><span>ห้อง <small class="muted">(เว้นว่างได้ ถ้ามีห้องเดียว)</small></span><input class="inp" id="nRoom" value="" placeholder="เช่น 1"></label>
    <label class="field"><span>ปีการศึกษา</span><input class="inp" id="nYear" type="number" value="${new Date().getFullYear() + 543 - (new Date().getMonth() < 4 ? 1 : 0)}"></label>
    <label class="field"><span>ภาคเรียน</span><select class="inp" id="nTerm"><option value="1">1</option><option value="2">2</option><option value="ปี">ทั้งปี (ประถม)</option></select></label>
    <label class="field"><span>เวลาเรียน (ชม.)</span><input class="inp" id="nHours" type="number" value="40"></label>
    <label class="field"><span>หน่วยกิต</span><input class="inp" id="nCred" type="number" step="0.5" value="1"></label>
    <label class="field"><span id="nMidL">คะแนนระหว่างภาค</span><input class="inp" id="nMid" type="number" min="0" max="100" value="${esc(S.settings.ratioMid)}"></label>
    <label class="field"><span id="nFinL">คะแนนปลายภาค</span><input class="inp" id="nFin" type="number" min="0" max="100" value="${esc(S.settings.ratioFinal)}"></label>
  </div>
  ${others.length ? `<label class="field"><span>คัดลอกจากรายวิชาเดิม (ไม่คัดลอกคะแนน)</span><select class="inp" id="nFrom"><option value="">ไม่คัดลอก</option>${others.map(o => `<option value="${o.id}">${esc(o.code)} ${esc(o.name)} · ${esc(classOf(o))} · ${esc(termLabel(o))}</option>`).join('')}</select></label>
  <div class="row small"><label class="row"><input type="checkbox" id="nCopyStu" checked> รายชื่อนักเรียน</label><label class="row"><input type="checkbox" id="nCopyStruct" checked> โครงสร้างและงาน</label><label class="row"><input type="checkbox" id="nCopyDesc" checked> คำอธิบายรายวิชา</label></div>` : ''}
  <label class="ros-opt" id="nRosL" hidden><input type="checkbox" id="nRos" checked><span id="nRosT"></span></label>
  <p class="note">ตัวเลขตัวแรกของรหัสวิชา 1 = ประถม (ปพ.5 ป) 2–3 = มัธยม (ปพ.5 ต)</p>`;
  const nd = dialog('สร้างรายวิชา', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'สร้างรายวิชา', cls: 'pri', fn: d => {
      const code = $('#nCode', d).value.trim(), name = $('#nName', d).value.trim();
      if (!code || !name) { toast('ใส่รหัสวิชาและชื่อวิชา'); return false; }
      const rm = Math.max(0, Math.min(100, Number($('#nMid', d).value) || 0)), rf = Number($('#nFin', d).value);
      if (rm + rf !== 100) { toast('คะแนนระหว่างภาคกับปลายภาคต้องรวมกันได้ 100'); return false; }
      const c = defaultCourse(S.settings, { code, name, grade: $('#nGrade', d).value.trim() || 'ม.1', room: $('#nRoom', d).value.trim(), year: Number($('#nYear', d).value), term: $('#nTerm', d).value, hours: Number($('#nHours', d).value) || 0, credits: Number($('#nCred', d).value) || 0, ratio: { mid: rm, final: rf } });
      const fromId = $('#nFrom', d) && $('#nFrom', d).value;
      if (fromId) {
        const f = S.courses.find(x => x.id === fromId);
        if ($('#nCopyStu', d).checked) c.students = clone(Calc.activeStudents(f)).map(s => (s.id = newId('s'), s));
        if ($('#nCopyStruct', d).checked) { c.units = clone(f.units); c.tasks = clone(f.tasks).map(t => (t.id = newId('t'), t)); c.tasks.forEach(t => c.scores[t.id] = {}); c.convert = f.convert; c.group = f.group; c.type = f.type; c.ratio = { mid: rm, final: rf }; if (rm !== Number(f.ratio.mid)) fitUnitWeights(c); else { const fu = c.units.find(u => u.isFinal); if (fu) fu.weight = rf; } }
        if ($('#nCopyDesc', d).checked) { c.descHtml = f.descHtml; c.indicators = f.indicators; c.descFont = f.descFont; c.descLine = f.descLine; }
      }
      const rk = rosterFind(c.grade, c.room), copied = fromId && $('#nCopyStu', d) && $('#nCopyStu', d).checked;
      if (rk && $('#nRos', d).checked && !copied) c.students = courseStudentsFromRoster(rk);
      const cat = catalogFind(code); if (cat) { c.type = cat.type; c.group = 'สังคมศึกษา ศาสนา และวัฒนธรรม'; }
      c.log = [{ t: Date.now(), text: 'สร้างรายวิชา' + (fromId ? ' (คัดลอกจากวิชาเดิม)' : '') }];
      S.courses.push(c); S.cur = c.id; S.view = 'course'; S.tab = c.students.length ? 'book' : 'students'; touch(c); render(); toast('สร้างรายวิชาแล้ว');
    }
  }], { wide: true });
  /* เติมสัดส่วนตามระดับ (ประถม/มัธยม) จนกว่าครูจะแก้เอง */
  let touched = false;
  const fill = () => {
    const code = $('#nCode', nd).value.trim(), isP = Calc.levelOf(code) === 'ป' || $('#nTerm', nd).value === 'ปี', st = S.settings;
    $('#nMidL', nd).textContent = 'คะแนนระหว่าง' + (isP ? 'ปี' : 'ภาค'); $('#nFinL', nd).textContent = 'คะแนนปลาย' + (isP ? 'ปี' : 'ภาค');
    const src = $('#nFrom', nd) && $('#nFrom', nd).value && $('#nCopyStruct', nd).checked ? S.courses.find(x => x.id === $('#nFrom', nd).value) : null;
    if (touched) return;
    const m = src ? src.ratio.mid : isP ? (st.ratioMidP ?? st.ratioMid) : st.ratioMid;
    $('#nMid', nd).value = m; $('#nFin', nd).value = 100 - Number(m);
  };
  ['#nCode', '#nTerm', '#nFrom', '#nCopyStruct'].forEach(k => { const x = $(k, nd); if (x) x.addEventListener(x.tagName === 'INPUT' && x.type !== 'checkbox' ? 'input' : 'change', fill); });
  $('#nMid', nd).addEventListener('input', () => { touched = true; const v = Math.max(0, Math.min(100, Number($('#nMid', nd).value) || 0)); $('#nFin', nd).value = 100 - v; });
  $('#nFin', nd).addEventListener('input', () => { touched = true; const v = Math.max(0, Math.min(100, Number($('#nFin', nd).value) || 0)); $('#nMid', nd).value = 100 - v; });
  const rosInfo = () => {
    const k = rosterFind($('#nGrade', nd).value, $('#nRoom', nd).value), copied = $('#nFrom', nd) && $('#nFrom', nd).value && $('#nCopyStu', nd).checked;
    $('#nRosL', nd).hidden = !k || !k.students.length;
    if (k) $('#nRosT', nd).innerHTML = `<b>ใช้รายชื่อจากทะเบียนนักเรียน ชั้น ${esc(classOf(k))}</b> <small>${k.students.length} คน${copied ? ' · ตอนนี้เลือกคัดลอกรายชื่อจากวิชาเดิมอยู่ ระบบจะใช้รายชื่อจากวิชาเดิมแทน' : ''}</small>`;
  };
  ['#nGrade', '#nRoom'].forEach(k => $(k, nd).addEventListener('input', rosInfo));
  ['#nFrom', '#nCopyStu'].forEach(k => { const x = $(k, nd); if (x) x.addEventListener('change', rosInfo); });
  fill(); rosInfo();
  bindCatalogPicker(nd, x => {
    $('#nCode', nd).value = x.code; $('#nName', nd).value = x.name; $('#nGrade', nd).value = x.grade;
    $('#nTerm', nd).value = x.term; $('#nHours', nd).value = x.hours; $('#nCred', nd).value = x.credits;
    fill(); rosInfo();
  });
}

/* ---------------- กล่อง: นำเข้ารายชื่อ ---------------- */
function parseStudents(text) {
  /* อ่านได้ทั้งแบบแยกคอลัมน์ และแบบชื่อ-นามสกุลอยู่ช่องเดียวกัน (เว้นวรรคคั่น) · ข้ามแถวหัวตาราง */
  const head = /(ชื่อ|นามสกุล|สกุล|เลขประจำตัว|เลขที่|คำนำหน้า|ลำดับ)/;
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    let parts = line.split('\t').map(x => x.trim()).filter(Boolean).flatMap(x => x.split(/\s+/));
    if (parts.length && parts.every(x => !/\d/.test(x)) && head.test(line) && !PREFIXES.some(p => line.includes(p))) return null;
    let code = '', prefix = '';
    if (/^\d+$/.test(parts[0]) && parts.length > 1 && /^\d+$/.test(parts[1])) parts.shift(); // ข้ามคอลัมน์เลขที่
    if (/^\d{3,}$/.test(parts[0])) code = parts.shift();
    else if (/^\d{1,2}$/.test(parts[0]) && parts.length > 1) parts.shift(); // มีแต่เลขที่ ไม่มีเลขประจำตัว
    if (parts[0] && PREFIXES.includes(parts[0])) prefix = parts.shift();
    else if (parts[0]) { const p = PREFIXES.slice().sort((a, b) => b.length - a.length).find(x => parts[0].startsWith(x) && parts[0].length > x.length); if (p) { prefix = p; parts[0] = parts[0].slice(p.length); } }
    const first = parts.shift() || '', last = parts.join(' ');
    return { code, prefix, first, last };
  }).filter(s => s && s.first);
}
function importDialog() {
  const c = cur();
  const body = `<p class="small">คัดลอกจาก Excel หรือ Google Sheet แล้ววางด้านล่าง ลำดับคอลัมน์: เลขประจำตัว · คำนำหน้า · ชื่อ · นามสกุล (ไม่มีบางคอลัมน์ก็ได้)</p>
    <textarea class="inp" id="impText" rows="8" placeholder="12401	ด.ช.	ธนกฤต	ทองดี&#10;12402	ด.ญ.	กนกพร	ศรีสุข"></textarea>
    <div class="row small"><label class="row"><input type="radio" name="impMode" value="append" checked> ต่อท้ายรายชื่อเดิม</label><label class="row"><input type="radio" name="impMode" value="replace"> แทนที่รายชื่อทั้งหมด</label></div>
    <div id="impPrev"></div>`;
  const d = dialog('วางรายชื่อนักเรียน', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'นำเข้า', cls: 'pri', fn: d => {
      const list = parseStudents($('#impText', d).value);
      if (!list.length) { toast('ยังไม่มีรายชื่อที่อ่านได้'); return false; }
      snap(c);
      const mode = d.querySelector('input[name=impMode]:checked').value;
      if (mode === 'replace') c.students.forEach(s => s.status = 'out');
      const start = Calc.activeStudents(c).length;
      list.forEach((s, i) => c.students.push(Object.assign({ id: newId('s'), no: start + i + 1, status: 'active' }, s)));
      if (mode === 'replace') c.students = c.students.filter(s => s.status !== 'out' || Object.values(c.scores).some(m => m[s.id] !== undefined && m[s.id] !== ''));
      renumberKeep(c); log('นำเข้ารายชื่อ ' + list.length + ' คน'); touch(c); render(); toast('นำเข้า ' + list.length + ' คนแล้ว', { label: 'เลิกทำ', fn: undo });
    }
  }], { wide: true });
  $('#impText', d).addEventListener('input', e => {
    const list = parseStudents(e.target.value);
    $('#impPrev', d).innerHTML = list.length ? `<p class="small"><b>ตรวจก่อนนำเข้า ${list.length} คน</b></p><div class="tbl-wrap" style="max-height:220px"><table class="tbl"><thead><tr><th>ลำดับ</th><th>เลขประจำตัว</th><th>คำนำหน้า</th><th>ชื่อ</th><th>นามสกุล</th></tr></thead><tbody>${list.map((s, i) => `<tr><td class="n">${i + 1}</td><td>${esc(s.code) || '<span class="chip warn">ไม่มี</span>'}</td><td>${esc(s.prefix)}</td><td>${esc(s.first)}</td><td>${esc(s.last)}</td></tr>`).join('')}</tbody></table></div>` : '';
  });
}

/* ---------------- กล่อง: จัดเลขที่ใหม่ ---------------- */
function renumberDialog() {
  const c = cur();
  const sorters = {
    code: (a, b) => String(a.code).localeCompare(String(b.code), 'th', { numeric: true }),
    name: (a, b) => thColl.compare(a.first, b.first) || thColl.compare(a.last, b.last),
    gender: (a, b) => (/(ด\.ญ\.|เด็กหญิง|นางสาว|น\.ส\.|นาง)/.test(a.prefix) - /(ด\.ญ\.|เด็กหญิง|นางสาว|น\.ส\.|นาง)/.test(b.prefix)) || String(a.code).localeCompare(String(b.code), 'th', { numeric: true })
  };
  const body = `<div class="seg" id="rnSeg"><button data-k="code" class="on">ตามเลขประจำตัว</button><button data-k="name">ตามชื่อ (พจนานุกรม)</button><button data-k="gender">ชายก่อนหญิง</button></div><div id="rnPrev"></div>`;
  let key = 'code';
  const d = dialog('จัดเลขที่ใหม่', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'ใช้ลำดับนี้', cls: 'pri', fn: () => {
      snap(c); Calc.activeStudents(c).sort(sorters[key]).forEach((s, i) => s.no = i + 1);
      log('จัดเลขที่ใหม่ ' + { code: 'ตามเลขประจำตัว', name: 'ตามชื่อ', gender: 'ชายก่อนหญิง' }[key]); touch(c); render(); toast('จัดเลขที่ใหม่แล้ว', { label: 'เลิกทำ', fn: undo });
    }
  }], { wide: true });
  const prev = () => {
    const list = Calc.activeStudents(c).slice().sort(sorters[key]);
    $('#rnPrev', d).innerHTML = `<div class="tbl-wrap" style="max-height:300px"><table class="tbl"><thead><tr><th>เลขที่ใหม่</th><th>เดิม</th><th>เลขประจำตัว</th><th>ชื่อ - สกุล</th></tr></thead><tbody>${list.map((s, i) => `<tr><td class="n"><b>${i + 1}</b></td><td class="n ${s.no !== i + 1 ? '' : 'muted'}">${s.no}</td><td>${esc(s.code)}</td><td>${esc(studentName(s))}</td></tr>`).join('')}</tbody></table></div>`;
  };
  $$('#rnSeg button', d).forEach(b => b.onclick = () => { key = b.dataset.k; $$('#rnSeg button', d).forEach(x => x.classList.toggle('on', x === b)); prev(); });
  prev();
}

/* ---------------- ค้นหาคำสั่ง (Ctrl+K) ---------------- */
function openPalette() {
  if ($('dialog.palette')) return;
  const d = document.createElement('dialog'); d.className = 'dlg palette';
  d.innerHTML = `<input id="palIn" placeholder="พิมพ์ชื่อวิชา เมนู หรือชื่อนักเรียน" autocomplete="off"><div class="pal-list" id="palList"></div>`;
  document.body.appendChild(d); d.showModal();
  const items = [];
  S.courses.forEach(c => items.push({ label: c.code + ' ' + c.name, sub: classOf(c) + ' · ' + termLabel(c) + (c.archived ? ' · คลังเก่า' : ''), run: () => ACT.open(c.id) }));
  if (cur()) TABS.forEach(([k, n]) => items.push({ label: n, sub: 'เมนูของ ' + cur().code, run: () => ACT.tab(k) }));
  items.push({ label: 'ทะเบียนนักเรียน', sub: 'รายชื่อกลางรายชั้น · เลื่อนชั้น', run: ACT.roster });
  items.push({ label: 'Live Class', sub: 'เช็คชื่อ บันทึกการสอน คะแนนพิเศษ', run: ACT.live }, { label: 'Class Tools', sub: 'สุ่มชื่อ จับกลุ่ม', run: ACT.tools }, { label: 'ตารางสอน', sub: 'ตารางสอนและตารางเรียน', run: ACT.timetable }, { label: 'ตั้งค่า', sub: 'ทั้งระบบ', run: ACT.settings }, { label: 'สร้างรายวิชา', sub: 'คำสั่ง', run: ACT.newCourse }, { label: 'เริ่มภาคเรียนใหม่', sub: 'คำสั่ง · ย้ายวิชาเดิมเข้าคลัง', run: ACT.newTerm }, { label: 'สลับโหมดสว่าง/มืด', sub: 'คำสั่ง', run: ACT.cycleTheme });
  if (cur()) { items.push({ label: 'เพิ่มงานในสมุดคะแนน', sub: 'คำสั่ง', run: () => { ACT.tab('book'); taskDialog(null); } }); Calc.activeStudents(cur()).forEach(s => items.push({ label: studentName(s), sub: 'เลขที่ ' + s.no + ' · ดูในตัดเกรด', run: () => ACT.tab('results') })); }
  let sel = 0, shown = [];
  const draw = () => {
    const q = $('#palIn', d).value.trim().toLowerCase();
    shown = items.filter(i => !q || (i.label + ' ' + i.sub).toLowerCase().includes(q)).slice(0, 30);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    $('#palList', d).innerHTML = shown.map((i, k) => `<button class="pal-item ${k === sel ? 'on' : ''}" data-k="${k}">${esc(i.label)}<small>${esc(i.sub)}</small></button>`).join('') || '<p class="note" style="padding:12px">ไม่พบ</p>';
  };
  const go = k => { const it = shown[k]; d.close(); d.remove(); if (it) it.run(); };
  $('#palIn', d).addEventListener('input', () => { sel = 0; draw(); });
  $('#palIn', d).addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === 'Enter') { go(sel); e.preventDefault(); }
  });
  $('#palList', d).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) go(Number(b.dataset.k)); });
  d.addEventListener('click', e => { if (e.target === d) { d.close(); d.remove(); } });
  d.addEventListener('close', () => d.remove());
  draw(); $('#palIn', d).focus();
}

/* ---------------- เหตุการณ์ ---------------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.closest('dialog.palette')) return;
  const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b.dataset.v); }
});

document.addEventListener('focusin', e => {
  const el = e.target;
  if (el.matches('[data-sc],[data-f],[data-u],[data-st],[data-att],[data-as],[data-rem],[data-ratio]')) { const c = cur(); S.pending = c ? JSON.stringify(c) : null; }
  if (el.classList.contains('cell')) el.select();
});

function numOrBlank(v) { v = String(v).trim().replace(',', '.'); if (v === '') return ''; const n = Number(v); return isNaN(n) ? null : n; }

document.addEventListener('input', e => {
  const el = e.target, c = cur();
  const d = el.dataset;
  if (d.sc && c) {
    const [tid, sid] = d.sc.split('|'); const v = numOrBlank(el.value);
    if (v === null) { el.classList.add('over'); return; }
    const t = c.tasks.find(x => x.id === tid);
    (c.scores[tid] = c.scores[tid] || {})[sid] = v;
    const td = el.parentElement; td.classList.toggle('blank', v === '' && !t.bonus); td.classList.toggle('over', v !== '' && v > Number(t.full)); el.classList.remove('over');
    updateBookRow(c, sid); const av = $(`[data-avg="${tid}"]`); if (av) av.textContent = avgTask(c, t);
    touch(c); return;
  }
  if (d.att && c) {
    const v = numOrBlank(el.value); if (v === null) return;
    c.attendance[d.att] = v === '' ? 0 : v;
    const a = Calc.attendance(c, d.att, S.settings), tr = el.closest('tr');
    tr.querySelector('[data-ac="p"]').textContent = a.present; tr.querySelector('[data-ac="pct"]').textContent = a.pct.toFixed(1); const ab = tr.querySelector('[data-ac="a"]'); if (ab) ab.textContent = a.absent;
    tr.querySelector('[data-ac="res"]').innerHTML = a.pass ? '<span class="chip ok">มีสิทธิ์สอบ</span>' : '<span class="chip bad">มส</span>';
    touch(c); return;
  }
  if (d.as && c) {
    const [k, sid, i] = d.as.split('|'); let v = el.value.trim();
    if (v !== '' && !/^[0-3]$/.test(v)) { el.value = ''; toast('กรอกได้เฉพาะ 0, 1, 2, 3'); return; }
    const arr = (c[k][sid] = c[k][sid] || []); arr[Number(i)] = v === '' ? null : Number(v);
    el.parentElement.classList.toggle('blank', v === '');
    const l = Calc.levelFromValues(arr); el.closest('tr').querySelector('[data-lv]').innerHTML = l === null ? '' : `<span class="chip ${l >= 2 ? 'ok' : l === 1 ? 'acc' : 'bad'}">${Calc.LEVEL_NAMES[l]}</span>`;
    touch(c);
    if (v !== '') moveCell(el, 0, 1);
    return;
  }
  if (d.st && c) { const [sid, f] = d.st.split('|'); c.students.find(s => s.id === sid)[f] = el.value; touch(c); return; }
  if (d.f && c) {
    const v = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
    c[d.f] = v; touch(c);
    if (d.f === 'hours' && S.tab === 'att') { $$('[data-att]').forEach(x => x.dispatchEvent(new Event('input', { bubbles: true }))); }
    return;
  }
  if (d.u && c) {
    const [uid, f] = d.u.split('|'); const u = c.units.find(x => x.id === uid);
    if (['hours', 'weight', 'slots', 'minPct'].includes(f)) { const v = numOrBlank(el.value); if (v === null) return; u[f] = v === '' ? (f === 'minPct' ? null : 0) : v; } else u[f] = el.value;
    touch(c); return;
  }
  if (d.ratio && c) {
    const v = Math.max(0, Math.min(100, Number(el.value) || 0)), other = d.ratio === 'mid' ? 'final' : 'mid';
    c.ratio[d.ratio] = v; c.ratio[other] = 100 - v;
    const o = $(`[data-ratio="${other}"]`); if (o) o.value = 100 - v;
    const fu = c.units.find(u => u.isFinal); if (fu) fu.weight = c.ratio.final; touch(c); return;
  }
  if (d.rem && c) { const [sid, f] = d.rem.split('|'); const r = (c.remedial[sid] = c.remedial[sid] || {}); r[f] = el.value; if (f === 'grade' && el.value && !r.date) r.date = new Date().toISOString().slice(0, 10); touch(c); return; }
  if (d.rs) { const [kid, sid, f] = d.rs.split('|'); const k = roster().classes.find(x => x.id === kid), s = k && k.students.find(x => x.id === sid); if (s) { s[f] = el.value.trim(); touchSettings(); } return; }
  if (d.set) {
    const v = el.type === 'number' ? Number(el.value) : el.value; S.settings[d.set] = v;
    const pair = { ratioMid: 'ratioFinal', ratioFinal: 'ratioMid', ratioMidP: 'ratioFinalP', ratioFinalP: 'ratioMidP' }[d.set];
    if (pair && el.value !== '') { const o = Math.max(0, 100 - v); S.settings[pair] = o; const x = $(`[data-set="${pair}"]`); if (x) x.value = o; }
    touchSettings(); return;
  }
  if (d.sg) { const [i, f] = d.sg.split('|'); S.settings.signers[Number(i)][f] = el.value; touchSettings(); return; }
});

document.addEventListener('change', e => {
  const el = e.target, c = cur(), d = el.dataset;
  if (S.pending && c && S.pending !== JSON.stringify(c)) {
    (S.undo[c.id] = S.undo[c.id] || []).push(S.pending); S.redo[c.id] = [];
    if (d.u || d.ratio || d.f === 'code' || d.f === 'level' || d.f === 'term') { S.pending = JSON.stringify(c); render(); return; }
    if (d.rem && d.rem.endsWith('|grade')) { log('บันทึกผลหลังแก้'); }
    S.pending = JSON.stringify(c);
  }
  if (d.f && ['name', 'grade', 'room', 'year'].includes(d.f)) { const t = $('.topbar .title'); if (t && c) t.innerHTML = `<h1>${esc(c.code)} ${esc(c.name)}</h1><small>ชั้น ${esc(classOf(c))} · ${esc(termLabel(c))} · ปพ.5 ${levelOfCourse(c)}</small>`; }
  if (el.id === 'targetSel') { S.target = el.value; render(); }
  if (el.id === 'wmSel') { S.watermark = el.value; render(); }
  if (el.id === 'ttRoomSel') { S.ttRoom = el.value; render(); }
  if (d.pp) { const all = $$('[data-pp]').filter(x => x.checked).map(x => x.dataset.pp); S.printPages = all; render(); }
  if (d.f === 'signDate' && S.tab === 'print') render();
  if (d.set === 'school' || d.set === 'minAtt' || d.set === 'minPct') render();
  if (el.id === 'logoFile' && el.files[0]) readLogo(el.files[0]);
  if (el.id === 'restoreFile' && el.files[0]) restoreFile(el.files[0]);
});

function moveCell(el, dr, dc) {
  const r = Number(el.dataset.r) + dr, cc = Number(el.dataset.c) + dc;
  const key = el.dataset.sc ? 'sc' : el.dataset.as ? 'as' : el.dataset.att !== undefined ? 'att' : null;
  if (!key) return false;
  const nx = document.querySelector(`[data-${key}][data-r="${r}"][data-c="${cc}"]`);
  if (nx) { nx.focus(); return true; }
  if (key === 'as' && dc > 0) { const nr = document.querySelector(`[data-as][data-r="${r + 1}"][data-c="0"]`); if (nr) { nr.focus(); return true; } }
  return false;
}

document.addEventListener('keydown', e => {
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (mod && k.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  const inEditor = e.target.closest && e.target.closest('[contenteditable]');
  if (mod && !inEditor && ['course', 'live'].includes(S.view) && !e.target.matches('textarea, input[type=text]:not(.cell), .inp')) {
    if (k.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (k.toLowerCase() === 'y' || (k.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
  }
  const el = e.target;
  if (el.classList && el.classList.contains('cell') && el.dataset.r !== undefined) {
    if (k === 'ArrowDown' || k === 'Enter') { if (moveCell(el, 1, 0)) e.preventDefault(); }
    else if (k === 'ArrowUp') { if (moveCell(el, -1, 0)) e.preventDefault(); }
    else if (k === 'ArrowRight' && el.selectionEnd === el.value.length) { if (moveCell(el, 0, 1)) e.preventDefault(); }
    else if (k === 'ArrowLeft' && el.selectionStart === 0) { if (moveCell(el, 0, -1)) e.preventDefault(); }
  }
});

/* วางคะแนนจาก Excel ลงหลายช่อง */
document.addEventListener('paste', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('cell') || el.dataset.r === undefined) return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (!/[\t\n]/.test(text.trim())) return;
  e.preventDefault();
  const c = cur(); snap(c);
  const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(r => r.split('\t'));
  const r0 = Number(el.dataset.r), c0 = Number(el.dataset.c);
  const key = el.dataset.sc ? 'sc' : el.dataset.as ? 'as' : 'att';
  let n = 0;
  rows.forEach((row, i) => row.forEach((val, j) => {
    const t = document.querySelector(`[data-${key}][data-r="${r0 + i}"][data-c="${c0 + j}"]`);
    if (!t || t.readOnly) return;
    const v = numOrBlank(val); if (v === null) return;
    if (key === 'sc') { const [tid, sid] = t.dataset.sc.split('|'); (c.scores[tid] = c.scores[tid] || {})[sid] = v; }
    else if (key === 'att') { c.attendance[t.dataset.att] = v === '' ? 0 : v; }
    else { const [k, sid, idx] = t.dataset.as.split('|'); if (v !== '' && (v < 0 || v > 3)) return; (c[k][sid] = c[k][sid] || [])[Number(idx)] = v === '' ? null : v; }
    n++;
  }));
  log('วางคะแนนจาก Excel ' + n + ' ช่อง'); touch(c); render(); toast('วางแล้ว ' + n + ' ช่อง', { label: 'เลิกทำ', fn: undo });
});

function readLogo(file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(1, 300 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    S.settings.logo = cv.toDataURL('image/png'); URL.revokeObjectURL(url); touchSettings(); render(); toast('ใส่ตราโรงเรียนแล้ว');
  };
  img.onerror = () => toast('อ่านรูปไม่ได้ ลองไฟล์ PNG หรือ JPG');
  img.src = url;
}
function restoreFile(file) {
  const fr = new FileReader();
  fr.onload = () => {
    let data; try { data = JSON.parse(fr.result); } catch (e) { toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของสมุดวัดผล'); return; }
    if (!data || data.app !== 'samutwadphon' || !Array.isArray(data.courses)) { toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของสมุดวัดผล'); return; }
    const exist = new Set(S.courses.map(c => c.id));
    const nNew = data.courses.filter(c => !exist.has(c.id)).length, nSame = data.courses.length - nNew;
    dialog('ตรวจก่อนนำเข้า', `<p>ไฟล์สำรองวันที่ ${esc(thaiDate(data.exportedAt))} มี <b>${data.courses.length}</b> รายวิชา</p><ul><li>รายวิชาใหม่ ${nNew} วิชา จะถูกเพิ่ม</li><li>รายวิชาที่มีอยู่แล้ว ${nSame} วิชา จะถูกแทนที่ด้วยข้อมูลในไฟล์</li></ul><label class="row small"><input type="checkbox" id="rsSet"> นำเข้าตั้งค่าโรงเรียนด้วย</label>`,
      [{ label: 'ยกเลิก', cls: 'ghost' }, {
        label: 'นำเข้า', cls: 'pri', fn: async d => {
          if (data.settings && data.settings.roster && !(S.settings.roster && S.settings.roster.classes && S.settings.roster.classes.length)) { S.settings.roster = data.settings.roster; touchSettings(); }
          for (const c of data.courses) { const i = S.courses.findIndex(x => x.id === c.id); normCourse(c); if (i >= 0) S.courses[i] = c; else S.courses.push(c); await saveNow(c); }
          if ($('#rsSet', d).checked && data.settings) { S.settings = Object.assign(defaultSettings(), data.settings); applyTheme(); touchSettings(); }
          S.cur = S.cur || S.courses[0]?.id; render(); toast('นำเข้าข้อมูลแล้ว');
        }
      }]);
  };
  fr.readAsText(file);
}

/* ---------------- โลโก้: ให้คำใต้ชื่อกว้างเท่าชื่อพอดี ---------------- */
function fitBrand() {
  $$('.brand').forEach(br => {
    const b = br.querySelector('b'), sm = br.querySelector('small');
    if (!b || !sm) return;
    b.style.fontSize = '';
    const W = b.getBoundingClientRect().width, w = sm.getBoundingClientRect().width;
    if (!W || !w) return;
    const fs = parseFloat(getComputedStyle(b).fontSize) * w / W;
    b.style.fontSize = Math.max(16, Math.min(34, fs)) + 'px';
  });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBrand);
window.addEventListener('resize', () => requestAnimationFrame(fitBrand));

/* ---------------- ติดตั้งเป็นแอป ---------------- */
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (S.user) maybeInstallBanner(); });
/* แถบแนะนำติดตั้งแบบเล็ก ขึ้นหลังเข้าระบบ เฉพาะเครื่องที่ติดตั้งได้ ปิดแล้วไม่ถามซ้ำ 30 วัน */
function maybeInstallBanner() {
  if (isStandalone() || window.self !== window.top || $('.install-tip')) return;
  if (!S.installEvt && !isIOS()) return;
  let until = 0; try { until = Number(localStorage.getItem('classfolio:installLater')) || 0; } catch (e) { }
  if (Date.now() < until) return;
  const el = document.createElement('div'); el.className = 'install-tip'; el.setAttribute('role', 'status');
  el.innerHTML = `<img src="icons/icon-192.png" alt="" width="40" height="40"><span><b>ติดตั้ง ClassFolio เป็นแอป</b><small>เปิดเร็ว เต็มจอ ใช้ได้แม้เน็ตหลุด</small></span><button class="btn pri sm" data-i="go">ติดตั้ง</button><button class="iconbtn" data-i="x" aria-label="ไม่ใช่ตอนนี้">✕</button>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  const later = () => { try { localStorage.setItem('classfolio:installLater', String(Date.now() + 30 * 86400000)); } catch (e) { } el.remove(); };
  el.querySelector('[data-i="go"]').onclick = () => { el.remove(); installApp(); };
  el.querySelector('[data-i="x"]').onclick = later;
}
window.addEventListener('appinstalled', () => { S.installEvt = null; const t = $('.install-tip'); if (t) t.remove(); toast('ติดตั้ง ClassFolio แล้ว เปิดได้จากไอคอนบนหน้าจอ'); });
async function installApp() {
  if (isStandalone()) { toast('กำลังใช้งานแบบแอปอยู่แล้ว'); return; }
  if (S.installEvt) { S.installEvt.prompt(); const r = await S.installEvt.userChoice; if (r.outcome === 'accepted') S.installEvt = null; return; }
  const framed = window.self !== window.top;
  const steps = framed ? '<p>หน้าตัวอย่างบน claude.ai ติดตั้งเป็นแอปไม่ได้ เมื่อครูขึ้นระบบบน Vercel แล้ว เปิดลิงก์ของครูเองแล้วกดปุ่มนี้อีกครั้ง</p>'
    : isIOS() ? '<ol class="steps"><li>เปิดลิงก์ระบบด้วย <b>Safari</b></li><li>แตะปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ด้านล่าง</li><li>เลือก <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วแตะ <b>เพิ่ม</b></li></ol>'
    : '<ol class="steps"><li>เปิดลิงก์ระบบด้วย <b>Chrome</b> หรือ <b>Edge</b></li><li>คอม: กดไอคอน <b>ติดตั้ง</b> ท้ายช่องที่อยู่เว็บ · มือถือ Android: แตะเมนู ⋮ แล้วเลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></li><li>ไอคอน ClassFolio จะอยู่บนหน้าจอ เปิดได้เหมือนแอปทั่วไป</li></ol>';
  dialog('ติดตั้ง ClassFolio เป็นแอป', `<div class="row" style="flex-wrap:nowrap;gap:14px"><img src="icons/icon-192.png" alt="" width="56" height="56" style="border-radius:14px"><p class="small" style="margin:0">ติดตั้งแล้วจะมีไอคอนบนหน้าจอ เปิดแบบเต็มจอไม่มีแถบเบราว์เซอร์ และเปิดได้แม้เน็ตหลุด</p></div>${steps}`, [{ label: 'เข้าใจแล้ว', cls: 'pri' }]);
}

/* ---------------- สำรองอัตโนมัติ ---------------- */
const BK_KEEP = () => Store.mode === 'firebase' ? 14 : 7;
function todayId() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
async function saveBackupNow(pre) {
  const id = pre ? todayId() + '-pre' + Date.now() : todayId();
  const json = JSON.stringify({ app: 'samutwadphon', version: 1, exportedAt: new Date().toISOString(), courses: S.courses, roster: S.settings.roster || null });
  await Store.saveBackup({ id, at: Date.now(), n: S.courses.length, pre: !!pre }, json);
  const list = await Store.listBackups();
  for (const b of list.slice(BK_KEEP())) await Store.deleteBackup(b.id);
}
async function autoBackup() {
  try {
    const list = await Store.listBackups();
    if (S.courses.length && !list.some(b => b.id === todayId())) await saveBackupNow(false);
    S.backups = await Store.listBackups();
  } catch (e) { S.backups = S.backups || []; }
}

/* ---------------- หน้าแรกสุด (ก่อนเข้าระบบ) ---------------- */
function renderLanding(user, msg, pending) {
  const st = S.settings;
  const label = pending ? 'กำลังเตรียมระบบ…' : Store.mode === 'local' ? 'เข้าใช้งาน' : user ? 'เข้าสู่ระบบ' : 'เข้าสู่ระบบด้วย Google';
  const keep = $('#app .landing .ld-art');
  const feats = [['book', 'blue', 'สมุดคะแนน', 'กรอกตามจริง แปลงให้เอง'], ['check', 'green', 'ตัดเกรด', 'ร มส คำนวณอัตโนมัติ'], ['print', 'rose', 'เล่ม ปพ.5', 'จัดหน้า A4 พร้อมพิมพ์'], ['users', 'teal', 'ทุกอุปกรณ์', 'คอม แท็บเล็ต มือถือ']];
  const html = `<div class="landing"><div class="ld-in">
    <div class="ld-copy">
      <div class="brand"><img class="brand-logo" src="icons/icon-192.png" alt="ClassFolio"><span><b>ClassFolio</b><small>Smart Teacher Workspace</small></span></div>
      <h1>บันทึกคะแนน ตัดเกรด<br>พิมพ์ ปพ.5 ในที่เดียว</h1>
      <p>กรอกคะแนนตามจริงของแต่ละงาน ระบบแปลงเป็นคะแนน ปพ.5 ตัดเกรด และจัดหน้าเอกสาร A4 ให้ครบทั้งเล่ม</p>
      <div class="ld-feats">${feats.map(([i, h, t, d]) => `<div class="ld-feat" data-hue="${h}"><span class="chipico">${ico(i)}</span><span><b>${t}</b><small>${d}</small></span></div>`).join('')}</div>
      ${msg ? `<div class="badbox">${esc(msg)}</div>` : ''}
      <div class="row"><button class="btn pri ld-go" id="enterBtn" ${pending ? 'disabled' : ''}>${label} ${pending ? '' : ico('chev')}</button>${user && user.email ? `<span class="small" style="color:var(--side-muted)">${esc(user.email)}</span>` : ''}</div>
    </div>
    <div class="ld-art hasimg" aria-hidden="true"><img class="ld-img" src="hero.webp" alt="" width="1536" height="1024" fetchpriority="high" onload="this.classList.add('on')" onerror="this.parentElement.classList.remove('hasimg');this.remove()"><div class="ld-stage">
      <div class="ld-card a"><div class="ld-h" data-hue="blue"><span class="chipico">${ico('book')}</span><b>สมุดคะแนน</b></div>
        ${[['ใบงาน', '18/20', 'ok'], ['สอบย่อย', '27/30', 'ok'], ['โครงงาน', 'ค้าง', 'warn']].map(([a, b, c]) => `<div class="ld-r"><span>${a}</span><span class="chip ${c}">${b}</span></div>`).join('')}</div>
      <div class="ld-card b"><div class="ld-h" data-hue="green"><span class="chipico">${ico('check')}</span><b>ระดับผลการเรียน</b></div>
        <div class="ld-bars">${[78, 52, 64, 40, 30, 18, 10, 6].map((v, i) => `<i style="height:${v}%;--gc:${['var(--h-green)', 'var(--h-green)', 'var(--h-teal)', 'var(--h-teal)', 'var(--h-blue)', 'var(--h-blue)', 'var(--h-amber)', 'var(--h-rose)'][i]}"></i>`).join('')}</div>
        <div class="ld-r small"><span>4</span><span>3.5</span><span>3</span><span>2.5</span><span>2</span><span>1.5</span><span>1</span><span>0</span></div></div>
      <div class="ld-card c"><div class="ld-h" data-hue="rose"><span class="chipico">${ico('print')}</span><b>เล่ม ปพ.5</b></div><div class="ld-r"><span>ทุกหน้าครบถ้วน</span><span class="chip ok">พร้อมพิมพ์</span></div></div>
    </div></div>
  </div></div>`;
  /* ถ้าหน้าแรกแสดงอยู่แล้ว เปลี่ยนเฉพาะฝั่งข้อความ ภาพไม่ต้องโหลดใหม่ */
  if (keep) { const t = document.createElement('div'); t.innerHTML = html; $('#app .ld-copy').replaceWith(t.querySelector('.ld-copy')); }
  else $('#app').innerHTML = html;
  fitBrand();
  if (pending) return;
  $('#enterBtn').onclick = async () => {
    const b = $('#enterBtn'); b.disabled = true;
    try { S.user = user || await Store.signIn(); await loadAll(); } catch (e) { renderLanding(null, e.message); }
  };
}

async function loadAll() {
  const stored = (await Store.getSettings()) || {};
  S.settings = Object.assign(defaultSettings(), stored);
  S.settings.scale = clone(Calc.DEFAULT_SCALE);
  S.settings.rounding = 'int';
  S.settings.printFont = 'THSarabunPSK';
  if (!stored.v || stored.v < 3) { S.settings.v = 3; touchSettings(); }
  if (stored.ratioMid != null && stored.ratioMidP == null) { S.settings.ratioMidP = stored.ratioMid; S.settings.ratioFinalP = stored.ratioFinal; }
  applyTheme();
  S.baseSettings = JSON.stringify(stored);
  S.courses = (await Store.listCourses()).map(normCourse);
  S.base = {}; S.courses.forEach(c => { S.base[c.id] = JSON.stringify(c); });
  if (!S.courses.length && Store.mode === 'local') {
    let seeded = false; try { seeded = localStorage.getItem('samutwadphon:seeded') === '1'; } catch (e) { }
    if (!seeded) { const list = makeDemoCourses(S.settings); for (const c of list) { S.courses.push(c); await saveNow(c); } if (!S.settings.tt) { S.settings.tt = makeDemoTimetable(list); touchSettings(); } try { localStorage.setItem('samutwadphon:seeded', '1'); } catch (e) { } }
  }
  S.cur = S.courses.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0]?.id || null;
  S.view = 'home';
  render();
  if (Store.watch && !S.unwatch) { try { S.unwatch = Store.watch(onRemoteCourse, onRemoteSettings); } catch (e) { console.warn(e); } }
  setTimeout(maybeInstallBanner, 2500);
  autoBackup().then(() => { if (S.view === 'settings') render(); });
}

async function boot() {
  S.settings = defaultSettings();
  try { const st = await (Store.mode === 'local' ? Store.getSettings() : Promise.resolve(null)); if (st) Object.assign(S.settings, st); } catch (e) { }
  applyTheme();
  let user = null, err = '';
  if (Store.mode !== 'local') renderLanding(null, '', true);
  try { user = await Store.init(); } catch (e) { err = e.message; }
  renderLanding(user, err);
  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
    try { navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { }
  }
}
boot();
