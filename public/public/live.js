/* ClassFolio · Live Class (เช็คชื่อ บันทึกการสอน มอบงาน คะแนนพิเศษ) · บันทึกการสอน · Class Tools (สุ่มชื่อ จับกลุ่ม) */
const ATT_STATES = [['มา', 'ok'], ['ขาด', 'bad'], ['ลา', 'warn'], ['ป่วย', 'warn'], ['สาย', 'acc'], ['หนี', 'bad']];
const ATT_HUES = { 'มา': 'green', 'ขาด': 'rose', 'ลา': 'amber', 'ป่วย': 'cyan', 'สาย': 'indigo', 'หนี': 'violet' };
const GROUP_HUES = ['blue', 'rose', 'green', 'amber', 'violet', 'teal', 'pink', 'cyan', 'indigo'];

function dateId(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function sessionsOf(c) { return c.sessions || (c.sessions = []); }
function findSession(c, date, period) { return sessionsOf(c).find(x => x.date === date && Number(x.period) === Number(period)) || null; }
function bonusReasons() { if (!S.settings.bonusReasons) S.settings.bonusReasons = ['ตอบคำถาม', 'ช่วยเพื่อน', 'อาสา', 'งานเสร็จก่อนเวลา']; return S.settings.bonusReasons; }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function isGirl(s) { return /(ด\.ญ\.|เด็กหญิง|นางสาว|น\.ส\.|นาง)/.test(s.prefix || ''); }
/* Firestore ห้ามเก็บ array ซ้อน array: เก็บชุดกลุ่มเป็น [{m:[...]}] แล้วแปลงกลับตอนใช้ */
function setGroups(x) { return (x && x.groups || []).map(g => Array.isArray(g) ? g : (g && g.m) || []); }
function shortName(s) { return [s.prefix, s.first].filter(Boolean).join(''); }

/* หาคาบปัจจุบันจากตารางสอน */
function currentSlot() {
  const T = tt(), d = new Date().getDay() || 7, now = new Date().toTimeString().slice(0, 5);
  const today = T.periods.map((p, i) => ({ p, period: i + 1, course: ttCourseAt(d + '-' + (i + 1)) })).filter(x => x.course);
  const live = today.find(x => now >= x.p.s && now < x.p.e) || today.find(x => now < x.p.s) || today[today.length - 1];
  return live ? { cid: live.course.id, period: live.period } : null;
}
function liveState() {
  if (!S.live || !activeCourses().some(c => c.id === S.live.cid)) {
    const cs = currentSlot();
    const ac = activeCourses(), cc = cur && cur();
    S.live = { cid: (cs && cs.cid) || (cc && !cc.archived ? cc.id : null) || (ac[0] && ac[0].id), date: dateId(), period: (cs && cs.period) || 1, mode: 'att' };
  }
  return S.live;
}
function liveCourse() { const L = liveState(); const c = S.courses.find(x => x.id === L.cid) || null; if (c && S.view === 'live') S.cur = c.id; return c; }
function ensureSession(c) {
  const L = liveState();
  let se = findSession(c, L.date, L.period);
  if (!se) {
    const last = sessionsOf(c).slice().sort((a, b) => (b.date + b.period).localeCompare(a.date + a.period))[0];
    const unit = last ? last.unit : ((c.units || []).find(u => !u.isFinal) || {}).id;
    se = { id: newId('se'), date: L.date, period: Number(L.period), unit, topic: '', note: '', att: {}, bonus: {}, bonusLog: [], tasks: [], createdAt: Date.now() };
    sessionsOf(c).push(se);
    log('เปิดคาบ ' + thaiDate(L.date) + ' คาบ ' + L.period);
  }
  return se;
}
function syncBonus(c) {
  const byUnit = {};
  sessionsOf(c).forEach(se => Object.entries(se.bonus || {}).forEach(([sid, n]) => { if (!n) return; const u = se.unit || 'none'; (byUnit[u] = byUnit[u] || {})[sid] = (byUnit[u][sid] || 0) + Number(n); }));
  Object.entries(byUnit).forEach(([uid, m]) => {
    if (uid === 'none' || !c.units.some(u => u.id === uid)) return;
    let t = c.tasks.find(x => x.auto === 'bonus' && x.unit === uid);
    if (!t) { t = { id: newId('t'), name: 'คะแนนพิเศษในห้อง', full: 10, unit: uid, weight: 1, bonus: true, auto: 'bonus' }; c.tasks.push(t); }
    c.scores[t.id] = {};
    Object.entries(m).forEach(([sid, n]) => { if (n > 0) c.scores[t.id][sid] = n; });
  });
  c.tasks.filter(x => x.auto === 'bonus' && !byUnit[x.unit]).forEach(t => { c.scores[t.id] = {}; });
}
function sessionSummary(c, se) {
  const studs = Calc.activeStudents(c), cnt = {};
  studs.forEach(s => { const st = (se.att || {})[s.id] || 'มา'; cnt[st] = (cnt[st] || 0) + 1; });
  return cnt;
}

/* ---------------- Live Class ---------------- */
function viewLive() {
  const L = liveState(), c = liveCourse();
  if (!c) return `<div class="card empty"><h3>ยังไม่มีรายวิชา</h3><button class="btn pri" data-act="newCourse">${ico('plus')} สร้างรายวิชา</button></div>`;
  const studs = Calc.activeStudents(c);
  const se = findSession(c, L.date, L.period);
  const T = tt(), per = T.periods[L.period - 1];
  const units = (c.units || []).filter(u => !u.isFinal);
  const cnt = se ? sessionSummary(c, se) : { 'มา': studs.length };
  const absentToday = new Set(se ? Object.entries(se.att || {}).filter(([, v]) => Calc.ABSENT_STATUS.includes(v)).map(([k]) => k) : []);
  const unitTotals = {};
  if (se && se.unit) sessionsOf(c).filter(x => x.unit === se.unit).forEach(x => Object.entries(x.bonus || {}).forEach(([sid, n]) => unitTotals[sid] = (unitTotals[sid] || 0) + n));
  const sets = c.groupSets || [];
  const gset = sets[sets.length - 1];
  const tiles = studs.map(s => {
    const st = se ? ((se.att || {})[s.id] || 'มา') : 'มา', kind = ATT_STATES.find(x => x[0] === st)[1];
    const b = se ? ((se.bonus || {})[s.id] || 0) : 0;
    if (L.mode === 'bonus') return `<div class="lv-tile b ${absentToday.has(s.id) ? 'dim' : ''}"><button class="lv-main" data-act="liveBonus" data-v="${s.id}"><span class="lv-no">${s.no}</span><span class="lv-name">${esc(shortName(s))}<small>รวม ${unitTotals[s.id] || 0} คะแนน</small></span><span class="lv-pts${b ? ' on' : ''}">${b ? '+' + b : '+'}</span></button>${b ? `<button class="lv-minus" data-act="liveBonusMinus" data-v="${s.id}" aria-label="ลดคะแนน ${esc(shortName(s))}">−</button>` : ''}</div>`;
    return `<div class="att-row${st !== 'มา' ? ' marked' : ''}" data-hue="${ATT_HUES[st]}"><span class="lv-no">${s.no}</span><span class="att-name"><b>${esc(studentName(s))}</b></span><div class="att-btns" role="radiogroup" aria-label="สถานะของ ${esc(shortName(s))}">${ATT_STATES.map(([k]) => `<button class="${k === st ? 'on' : ''}" data-hue="${ATT_HUES[k]}" data-act="liveSet" data-v="${s.id}|${k}" role="radio" aria-checked="${k === st}">${k}</button>`).join('')}</div>${attStat(c, s.id)}</div>`;
  }).join('');
  const tasks = se ? (se.tasks || []).map(id => c.tasks.find(t => t.id === id)).filter(Boolean) : [];
  return `
  <div class="card bar live-head">
    <div class="live-ctl">
      <label class="field"><span>รายวิชา</span><select class="inp" id="liveCourse">${activeCourses().map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.code)} ${esc(x.name)} · ${esc(x.grade)}/${esc(x.room)}</option>`).join('')}</select></label>
      <label class="field"><span>วันที่</span><input class="inp" type="date" id="liveDate" value="${esc(L.date)}"></label>
      <label class="field"><span>คาบ</span><select class="inp" id="livePeriod">${T.periods.map((p, i) => `<option value="${i + 1}" ${i + 1 === Number(L.period) ? 'selected' : ''}>คาบ ${i + 1} · ${esc(p.s)}–${esc(p.e)}</option>`).join('')}</select></label>
    </div>
    <div class="live-sum">${ATT_STATES.map(([k]) => `<span class="sum-chip" data-hue="${ATT_HUES[k]}">${k} <b>${cnt[k] || 0}</b></span>`).join('')}${se ? `<button class="btn sm ghost" data-act="liveAllPresent">ทุกคนมา</button>` : ''}</div>
  </div>
  <div class="live-grid">
    <div class="card live-main">
      <div class="card-h"><div class="seg"><button data-act="liveMode" data-v="att" class="${L.mode !== 'bonus' ? 'on' : ''}">${ico('check')} เช็คชื่อ</button><button data-act="liveMode" data-v="bonus" class="${L.mode === 'bonus' ? 'on' : ''}">${ico('star')} คะแนนพิเศษ</button></div>
        <span class="note">${L.mode === 'bonus' ? 'แตะชื่อเพื่อให้ +' + (Number(S.settings.bonusPts) || 1) + ' · ปุ่ม − เพื่อคืน' : 'ทุกคนเริ่มเป็น "มา" · แตะปุ่มสถานะของคนที่ไม่มา · ด้านขวาคือยอดรวมทุกคาบของแต่ละคน'}</span></div>
      ${L.mode === 'bonus' ? `<div class="reason-row">${bonusReasons().map((r, i) => `<button class="chip ${S.liveReason === i ? 'acc' : ''}" data-act="liveReason" data-v="${i}">${esc(r)}</button>`).join('')}<button class="chip" data-act="liveReasonEdit">${ico('pen')} แก้เหตุผล</button></div>
        ${gset ? `<div class="reason-row"><span class="note">ให้ทั้งกลุ่ม:</span>${setGroups(gset).map((g, i) => `<button class="chip grp" data-hue="${GROUP_HUES[i % GROUP_HUES.length]}" data-act="liveGroupBonus" data-v="${i}">กลุ่ม ${i + 1}</button>`).join('')}</div>` : ''}` : ''}
      ${studs.length ? `<div class="${L.mode === 'bonus' ? 'lv-grid' : 'att-list'}">${tiles}</div>` : `<div class="empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3><button class="btn pri" data-act="go" data-v="${c.id}|students">วางรายชื่อ</button></div>`}
    </div>
    <div class="card live-side">
      <div class="card-h"><h3>บันทึกการสอนคาบนี้</h3>${per ? `<span class="note">${esc(per.s)}–${esc(per.e)} น.</span>` : ''}</div>
      <label class="field"><span>หน่วยการเรียนรู้</span><select class="inp" id="liveUnit">${units.map(u => `<option value="${u.id}" ${se && se.unit === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
      <label class="field"><span>เรื่องที่สอน / กิจกรรม</span><input class="inp" id="liveTopic" value="${esc(se ? se.topic : '')}" placeholder="เช่น บทบาทสมมติ สภานักเรียน"></label>
      <div class="field"><span>งานที่มอบในคาบนี้</span>
        <div class="task-list">${tasks.map(t => `<div class="task-chip"><span><b>${esc(t.name)}</b><small>เต็ม ${esc(t.full)}${t.due ? ' · ส่ง ' + esc(thaiDate(t.due)) : ''}</small></span><button class="btn sm ghost" data-act="task" data-v="${t.id}">แก้</button></div>`).join('') || '<p class="note">ยังไม่ได้มอบงาน</p>'}</div>
        <button class="btn sm" data-act="liveAssign">${ico('plus')} มอบงาน</button></div>
      <label class="field"><span>บันทึกหลังสอน (ผลที่เกิด ปัญหา แนวทางแก้)</span><textarea class="inp" id="liveNote" rows="4" placeholder="ไม่บังคับ">${esc(se ? se.note : '')}</textarea></label>
      ${se ? `<button class="btn sm ghost danger" data-act="liveDelete">${ico('trash')} ลบบันทึกคาบนี้</button>` : '<p class="note">แตะชื่อหรือพิมพ์ช่องใดก็ได้ ระบบจะเปิดบันทึกคาบนี้ให้เอง</p>'}
    </div>
  </div>`;
}

/* สรุปรายคน: นับจากทุกคาบที่เช็คชื่อแล้วในวิชานี้ */
function attStat(c, sid) {
  const a = Calc.attendance(c, sid, S.settings), cnt = a.counts || {};
  const total = (c.sessions || []).length;
  const parts = ATT_STATES.filter(([k]) => k !== 'มา' && cnt[k]).map(([k]) => `<span data-hue="${ATT_HUES[k]}">${k} <b>${cnt[k] || 0}</b></span>`).join('');
  const min = Number(S.settings.minAtt || 80), sp = a.sesPct === null ? 100 : a.sesPct;
  const lvl = !a.pass || a.early ? 'bad' : sp < min + 10 || a.pct < min + 5 ? 'warn' : 'ok';
  return `<div class="att-stat" title="มาเรียน ${a.came} จาก ${total} คาบที่สอนแล้ว · เวลาเรียนทั้ง${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} ${a.pct.toFixed(1)}% (เกณฑ์ ${min}%)"><span class="pct ${lvl}"><small>มา</small> ${a.came}/${total} <small>คาบ</small><span class="sep"> ·</span> ${total ? Math.round(sp) + '%' : ''}</span><span class="cnts">${parts}<span class="term">ทั้ง${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} <b>${Math.floor(a.pct)}%</b></span></span></div>`;
}

function liveSetStatus(sid, st) {
  const c = liveCourse(); snap(c); const se = ensureSession(c);
  if (st === 'มา') delete se.att[sid]; else se.att[sid] = st;
  touch(c); render();
}

/* ---------------- บันทึกการสอน (เมนูในรายวิชา) ---------------- */
function viewTeach(c) {
  const T = tt(), hp = Number(T.hrsPerPeriod) || 1;
  const ses = sessionsOf(c).slice().sort((a, b) => (b.date + String(b.period).padStart(2, '0')).localeCompare(a.date + String(a.period).padStart(2, '0')));
  const taught = ses.length * hp, total = Number(c.hours) || 0;
  const units = (c.units || []).filter(u => !u.isFinal);
  const byU = {}; ses.forEach(x => byU[x.unit] = (byU[x.unit] || 0) + hp);
  const n = Calc.activeStudents(c).length;
  return `
  <div class="card">
    <div class="card-h"><h2>ความคืบหน้าการสอน</h2><span class="chip acc">สอนแล้ว ${taught} จาก ${total} ชั่วโมง</span><button class="btn sm" data-act="teachPrint">${ico('print')} พิมพ์บันทึกการสอน</button><button class="btn sm pri" data-act="liveFor" data-v="${c.id}">${ico('check')} เปิด Live Class</button></div>
    <div class="prog-list">${units.map((u, i) => { const h = byU[u.id] || 0, plan = Number(u.hours) || 0, pct = plan ? Math.min(100, h / plan * 100) : 0; return `<div class="prog-row" data-hue="${['blue', 'violet', 'teal', 'amber', 'pink', 'cyan', 'green'][i % 7]}"><span><b>หน่วย ${i + 1}</b> ${esc(u.name)}</span><div class="prog-bar"><i style="width:${pct}%"></i></div><span class="num">${h}/${plan || '–'} ชม.</span></div>`; }).join('')}</div>
  </div>
  <div class="card">
    <div class="card-h"><h2>บันทึกรายคาบ</h2><span class="note">${ses.length} คาบ · แตะเพื่อเปิดแก้ใน Live Class</span></div>
    ${ses.length ? `<div class="timeline">${ses.map(x => {
      const u = c.units.find(z => z.id === x.unit), cnt = sessionSummary(c, x), absent = Calc.ABSENT_STATUS.reduce((a, k) => a + (cnt[k] || 0), 0);
      const bonus = Object.values(x.bonus || {}).reduce((a, b) => a + b, 0);
      const tasks = (x.tasks || []).map(id => c.tasks.find(t => t.id === id)).filter(Boolean);
      return `<button class="tl-item" data-act="liveOpen" data-v="${c.id}|${x.date}|${x.period}"><span class="tl-date"><b>${new Date(x.date).getDate()}</b><small>${esc(thaiDate(x.date).split(' ').slice(1, 2).join(''))}</small></span><span class="tl-body"><b>${esc(x.topic || (u ? u.name : 'ไม่ระบุเรื่อง'))}</b><small>คาบ ${x.period}${u ? ' · ' + esc(u.name) : ''}</small><span class="row" style="gap:5px;margin-top:4px"><span class="chip ${absent ? 'warn' : 'ok'}">มา ${n - absent}/${n}</span>${bonus ? `<span class="chip acc">พิเศษ +${bonus}</span>` : ''}${tasks.map(t => `<span class="chip">${esc(t.name)}</span>`).join('')}</span>${x.note ? `<small class="tl-note">${esc(x.note)}</small>` : ''}</span></button>`;
    }).join('')}</div>` : `<div class="empty"><p>ยังไม่มีบันทึก เริ่มจากเปิด Live Class ในคาบที่สอน</p><button class="btn pri" data-act="liveFor" data-v="${c.id}">${ico('check')} เปิด Live Class</button></div>`}
  </div>`;
}

function teachPrint(c) {
  const ses = sessionsOf(c).slice().sort((a, b) => (a.date + String(a.period).padStart(2, '0')).localeCompare(b.date + String(b.period).padStart(2, '0')));
  const n = Calc.activeStudents(c).length;
  const rows = ses.map(x => { const u = c.units.find(z => z.id === x.unit), cnt = sessionSummary(c, x), ab = Calc.ABSENT_STATUS.reduce((a, k) => a + (cnt[k] || 0), 0); const tasks = (x.tasks || []).map(id => (c.tasks.find(t => t.id === id) || {}).name).filter(Boolean).join(', ');
    return `<tr><td class="c">${esc(thaiDate(x.date))}</td><td class="c">${x.period}</td><td>${esc(u ? u.name : '')}${x.topic ? '<br>' + esc(x.topic) : ''}</td><td class="c">${n - ab}/${n}</td><td>${esc(tasks)}</td><td>${esc(x.note || '')}</td></tr>`; }).join('');
  $('#printRoot').innerHTML = `<section class="sheet"><div class="run"><span>บันทึกการสอน · ${esc(c.code)} ${esc(c.name)} · ชั้น ${esc(c.grade)}/${esc(c.room)} · ${esc(termLabel(c))}</span><span>${esc(c.teacher || '')}</span></div><h2 class="doc">บันทึกการสอน</h2>
    <table class="pt"><thead><tr><th style="width:30mm">วันที่</th><th style="width:10mm">คาบ</th><th>หน่วย / เรื่องที่สอน</th><th style="width:16mm">มาเรียน</th><th style="width:34mm">งานที่มอบ</th><th style="width:45mm">บันทึกหลังสอน</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="c">ยังไม่มีบันทึก</td></tr>'}</tbody></table>
    <div class="signs"><div class="sign" style="grid-column:2"><div class="ln">ลงชื่อ ......................................................</div><div>( ${esc(c.teacher || '......................................................')} )</div><div>ครูผู้สอน</div></div></div></section>`;
  printNow();
}

/* ---------------- Class Tools ---------------- */
function toolsCourse() { if (!S.toolsCid || !activeCourses().some(c => c.id === S.toolsCid)) S.toolsCid = (liveCourse() || {}).id; return S.courses.find(c => c.id === S.toolsCid) || null; }
function todayAbsent(c) {
  const set = new Set(); sessionsOf(c).filter(x => x.date === dateId()).forEach(x => Object.entries(x.att || {}).forEach(([sid, v]) => { if (Calc.ABSENT_STATUS.includes(v)) set.add(sid); }));
  return set;
}
function viewTools() {
  const c = toolsCourse();
  if (!c) return `<div class="card empty"><h3>ยังไม่มีรายวิชา</h3></div>`;
  const mode = S.toolsMode || 'random';
  const studs = Calc.activeStudents(c), absent = todayAbsent(c);
  const head = `<div class="card bar"><div class="row">
    <div class="seg"><button data-act="toolsMode" data-v="random" class="${mode === 'random' ? 'on' : ''}">${ico('target')} สุ่มชื่อ</button><button data-act="toolsMode" data-v="group" class="${mode === 'group' ? 'on' : ''}">${ico('users')} จับกลุ่ม</button></div>
    <select class="inp" id="toolsCourse" style="width:auto;max-width:100%">${activeCourses().map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${esc(x.code)} ${esc(x.name)} · ${esc(x.grade)}/${esc(x.room)}</option>`).join('')}</select>
    <button class="btn sm" data-act="toolsPresent" style="margin-left:auto">${ico('grid')} เต็มจอ</button>
  </div>${absent.size ? `<p class="note" style="margin-top:8px">วันนี้ขาด ${absent.size} คน (จาก Live Class) · ระบบข้ามให้เมื่อเลือก "ข้ามคนที่ขาดวันนี้"</p>` : ''}</div>`;
  if (mode === 'random') {
    const R = S.rand = S.rand || {};
    const drawn = (R.drawn = R.drawn || {})[c.id] = R.drawn[c.id] || [];
    const pool = studs.filter(s => (!R.skipAbsent || !absent.has(s.id)) && (!R.noRepeat || !drawn.includes(s.id)));
    return head + `<div class="card tool-stage" id="toolStage">
      <div class="rand-show" id="randShow">${(R.last || []).length ? R.last.map(id => { const s = studs.find(x => x.id === id); return s ? `<div class="rand-card"><span>เลขที่ ${s.no}</span><b>${esc(shortName(s))}</b><small>${esc(s.last || '')}</small></div>` : ''; }).join('') : `<div class="rand-card idle"><b>พร้อมสุ่ม</b><small>${pool.length} คนในรายการ</small></div>`}</div>
      <div class="row" style="justify-content:center"><button class="btn pri rand-go" data-act="randGo">${ico('target')} สุ่มชื่อ</button>
        <label class="small row" style="flex-wrap:nowrap">ครั้งละ <select class="inp" id="randN" style="width:auto">${[1, 2, 3, 4, 5].map(n => `<option ${Number(R.n || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select> คน</label></div>
      <div class="row" style="justify-content:center"><label class="row small"><input type="checkbox" id="randNoRep" ${R.noRepeat ? 'checked' : ''}> ไม่ซ้ำจนครบห้อง</label><label class="row small"><input type="checkbox" id="randSkip" ${R.skipAbsent ? 'checked' : ''}> ข้ามคนที่ขาดวันนี้</label></div>
      ${R.noRepeat ? `<div class="drawn"><span class="note">สุ่มแล้ว ${drawn.length}/${studs.length} คน</span>${drawn.map(id => { const s = studs.find(x => x.id === id); return s ? `<span class="chip">${s.no} ${esc(s.first)}</span>` : ''; }).join('')}${drawn.length ? '<button class="chip" data-act="randReset">เริ่มใหม่</button>' : ''}</div>` : ''}
    </div>`;
  }
  const G = S.grp = S.grp || {};
  const groups = (G.cur || {})[c.id];
  const sets = c.groupSets || [];
  return head + `<div class="card">
    <div class="grp-opts">
      <label class="field"><span>แบ่งตาม</span><select class="inp" id="grpBy"><option value="count" ${G.by !== 'size' ? 'selected' : ''}>จำนวนกลุ่ม</option><option value="size" ${G.by === 'size' ? 'selected' : ''}>จำนวนคนต่อกลุ่ม</option></select></label>
      <label class="field"><span>${G.by === 'size' ? 'คนต่อกลุ่ม' : 'จำนวนกลุ่ม'}</span><input class="inp" type="number" id="grpN" min="1" max="${studs.length || 1}" value="${esc(G.n || (G.by === 'size' ? 5 : 6))}"></label>
      <label class="field"><span>วิธีจัด</span><select class="inp" id="grpMethod"><option value="random" ${G.method === 'random' || !G.method ? 'selected' : ''}>สุ่ม</option><option value="ability" ${G.method === 'ability' ? 'selected' : ''}>คละเก่ง-อ่อน (จากคะแนน)</option><option value="gender" ${G.method === 'gender' ? 'selected' : ''}>คละชาย-หญิง</option></select></label>
      <label class="row small" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="grpSkip" ${G.skipAbsent ? 'checked' : ''}> ไม่รวมคนที่ขาดวันนี้</label>
      <button class="btn pri" data-act="grpMake" style="align-self:end">${ico('users')} จัดกลุ่ม</button>
    </div>
    ${sets.length ? `<div class="reason-row" style="margin-top:12px"><span class="note">ชุดที่บันทึกไว้:</span>${sets.map((x, i) => `<button class="chip" data-act="grpLoad" data-v="${i}">${esc(x.name)}</button>`).join('')}</div>` : ''}
  </div>
  ${groups ? `<div class="card tool-stage" id="toolStage"><div class="card-h"><h3>${groups.length} กลุ่ม</h3><span class="note">${G.pick ? 'แตะกลุ่มที่ต้องการย้ายไป' : 'แตะชื่อแล้วแตะกลุ่มเพื่อย้าย · คอมลากวางได้'}</span><button class="btn sm" data-act="grpSave">บันทึกชุดกลุ่มนี้</button></div>
    <div class="grp-grid">${groups.map((g, i) => `<div class="grp" data-hue="${GROUP_HUES[i % GROUP_HUES.length]}" data-gi="${i}" data-act="grpDrop" data-v="${i}"><div class="grp-h"><b>กลุ่ม ${i + 1}</b><span>${g.length} คน</span></div>${g.map(id => { const s = studs.find(x => x.id === id); return s ? `<button class="grp-m ${G.pick === id ? 'pick' : ''}" draggable="true" data-sid="${id}" data-act="grpPick" data-v="${id}">${s.no}. ${esc(shortName(s))}</button>` : ''; }).join('')}</div>`).join('')}</div></div>` : ''}`;
}

function makeGroups(c) {
  const G = S.grp, studs = Calc.activeStudents(c), absent = todayAbsent(c);
  let list = studs.filter(s => !G.skipAbsent || !absent.has(s.id));
  const N = list.length; if (!N) return [];
  let k = G.by === 'size' ? Math.ceil(N / Math.max(1, Number(G.n) || 5)) : Math.max(1, Math.min(N, Number(G.n) || 6));
  const out = Array.from({ length: k }, () => []);
  if (G.method === 'ability') {
    const sc = s => Calc.studentResult(c, s.id, S.settings).total || 0;
    list = shuffle(list).sort((a, b) => sc(b) - sc(a));
    list.forEach((s, i) => { const r = Math.floor(i / k), j = i % k; out[r % 2 ? k - 1 - j : j].push(s.id); });
  } else if (G.method === 'gender') {
    const order = shuffle(list.filter(s => !isGirl(s))).concat(shuffle(list.filter(isGirl)));
    order.forEach((s, i) => out[i % k].push(s.id));
  } else shuffle(list).forEach((s, i) => out[i % k].push(s.id));
  return out;
}

function randGo(c) {
  const R = S.rand, studs = Calc.activeStudents(c), absent = todayAbsent(c);
  const drawn = R.drawn[c.id];
  let pool = studs.filter(s => (!R.skipAbsent || !absent.has(s.id)) && (!R.noRepeat || !drawn.includes(s.id)));
  if (!pool.length) { if (R.noRepeat && drawn.length) { toast('สุ่มครบทั้งห้องแล้ว เริ่มรอบใหม่'); R.drawn[c.id] = []; pool = studs.filter(s => !R.skipAbsent || !absent.has(s.id)); } else { toast('ไม่มีรายชื่อให้สุ่ม'); return; } }
  const n = Math.min(Number(R.n) || 1, pool.length);
  const pick = shuffle(pool).slice(0, n);
  const box = $('#randShow'); const btn = $('[data-act="randGo"]'); if (btn) btn.disabled = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0; const iv = setInterval(() => {
    t++; if (box) box.innerHTML = Array.from({ length: n }, () => { const s = pool[Math.floor(Math.random() * pool.length)]; return `<div class="rand-card spin"><span>เลขที่ ${s.no}</span><b>${esc(shortName(s))}</b><small>${esc(s.last || '')}</small></div>`; }).join('');
    if (t > (reduce ? 0 : 16)) { clearInterval(iv); R.last = pick.map(s => s.id); if (R.noRepeat) R.drawn[c.id] = R.drawn[c.id].concat(R.last); render(); const cards = $$('.rand-card'); cards.forEach(x => x.classList.add('hit')); }
  }, 70);
}

/* ---------------- งานใกล้ถึงกำหนด (หน้าแรก) ---------------- */
function dueCard() {
  const today = dateId(), limit = dateId(new Date(Date.now() + 7 * 86400000));
  const items = [];
  activeCourses().forEach(c => (c.tasks || []).filter(t => t.due && t.due <= limit && !t.bonus).forEach(t => {
    const miss = Calc.activeStudents(c).filter(s => Calc.num((c.scores[t.id] || {})[s.id]) === null).length;
    if (miss || t.due >= today) items.push({ c, t, miss });
  }));
  items.sort((a, b) => a.t.due.localeCompare(b.t.due));
  return `<div class="card"><div class="card-h"><h3>งานใกล้ถึงกำหนดส่ง</h3><span class="note">7 วันข้างหน้า และที่เลยกำหนด</span></div>
    ${items.length ? `<div class="today">${items.slice(0, 6).map(x => { const late = x.t.due < today; return `<button class="today-row" data-hue="${late ? 'rose' : 'amber'}" data-act="go" data-v="${x.c.id}|book"><span class="t">${new Date(x.t.due).getDate()}<small>${esc(thaiDate(x.t.due).split(' ')[1])}</small></span><span class="bar"></span><span><b>${esc(x.t.name)}</b><small>${esc(x.c.code)} ${esc(x.c.grade)}/${esc(x.c.room)}${late ? ' · เลยกำหนด' : ''}</small></span><span class="chip ${x.miss ? 'warn' : 'ok'}">${x.miss ? 'ยังไม่ส่ง ' + x.miss : 'ส่งครบ'}</span></button>`; }).join('')}</div>` : '<p class="note">ไม่มีงานที่ใกล้ถึงกำหนด · มอบงานพร้อมวันส่งได้ใน Live Class</p>'}</div>`;
}

/* ---------------- คำสั่ง ---------------- */
const LIVE_ACT = {
  live() { liveState(); S.view = 'live'; render(); window.scrollTo(0, 0); },
  liveFor(cid) { S.live = { cid, date: dateId(), period: (currentSlot() && currentSlot().cid === cid ? currentSlot().period : 1), mode: 'att' }; LIVE_ACT.live(); },
  liveOpen(v) { const [cid, date, period] = v.split('|'); S.live = { cid, date, period: Number(period), mode: 'att' }; LIVE_ACT.live(); },
  liveSlot(v) { const [cid, period] = v.split('|'); S.live = { cid, date: dateId(), period: Number(period), mode: 'att' }; LIVE_ACT.live(); },
  liveMode(v) { liveState().mode = v; render(); },
  liveSet(v) { const [sid, st] = v.split('|'); liveSetStatus(sid, st); },
  liveToggle(sid) { const c = liveCourse(), se = findSession(c, S.live.date, S.live.period); const st = se ? ((se.att || {})[sid] || 'มา') : 'มา'; liveSetStatus(sid, st === 'มา' ? 'ขาด' : 'มา'); },
  liveMore(sid) {
    const c = liveCourse(), s = c.students.find(x => x.id === sid), se = findSession(c, S.live.date, S.live.period), cur0 = se ? ((se.att || {})[sid] || 'มา') : 'มา';
    const d = dialog(studentName(s), `<div class="att-pick">${ATT_STATES.map(([k, kind]) => `<button class="btn ${k === cur0 ? 'pri' : ''}" data-st="${k}"><span class="chip ${kind}">${k}</span></button>`).join('')}</div>`, []);
    $$('[data-st]', d).forEach(b => b.onclick = () => { d.close(); d.remove(); liveSetStatus(sid, b.dataset.st); });
  },
  liveAllPresent() { const c = liveCourse(); snap(c); const se = ensureSession(c); se.att = {}; touch(c); render(); toast('ตั้งให้ทุกคนมาเรียน'); },
  liveBonus(sid) {
    const c = liveCourse(); snap(c); const se = ensureSession(c), pts = Number(S.settings.bonusPts) || 1;
    se.bonus[sid] = (se.bonus[sid] || 0) + pts; se.bonusLog.push({ sid, n: pts, reason: bonusReasons()[S.liveReason || 0] || '', t: Date.now() });
    syncBonus(c); touch(c); render();
    const el = $(`[data-act="liveBonus"][data-v="${sid}"]`); if (el) el.closest('.lv-tile').classList.add('pop');
  },
  liveBonusMinus(sid) { const c = liveCourse(); snap(c); const se = ensureSession(c), pts = Number(S.settings.bonusPts) || 1; se.bonus[sid] = Math.max(0, (se.bonus[sid] || 0) - pts); if (!se.bonus[sid]) delete se.bonus[sid]; se.bonusLog.push({ sid, n: -pts, reason: 'คืนคะแนน', t: Date.now() }); syncBonus(c); touch(c); render(); },
  liveGroupBonus(i) {
    const c = liveCourse(), g = (c.groupSets || []).slice(-1)[0]; if (!g) return; snap(c); const se = ensureSession(c), pts = Number(S.settings.bonusPts) || 1;
    (setGroups(g)[Number(i)] || []).forEach(sid => { if (!c.students.some(s => s.id === sid && s.status !== 'out')) return; se.bonus[sid] = (se.bonus[sid] || 0) + pts; se.bonusLog.push({ sid, n: pts, reason: (bonusReasons()[S.liveReason || 0] || '') + ' (กลุ่ม)', t: Date.now() }); });
    syncBonus(c); touch(c); render(); toast('กลุ่ม ' + (Number(i) + 1) + ' ได้ +' + pts + ' ทุกคน');
  },
  liveReason(i) { S.liveReason = Number(i); render(); },
  liveReasonEdit() {
    const d = dialog('เหตุผลคะแนนพิเศษ', `<label class="field"><span>บรรทัดละ 1 เหตุผล</span><textarea class="inp" id="rsTxt" rows="6">${esc(bonusReasons().join('\n'))}</textarea></label><label class="field"><span>1 ครั้งได้กี่คะแนน</span><input class="inp" type="number" id="rsPts" min="0.5" step="0.5" value="${esc(S.settings.bonusPts || 1)}"></label>`,
      [{ label: 'ยกเลิก', cls: 'ghost' }, { label: 'บันทึก', cls: 'pri', fn: dd => { const list = $('#rsTxt', dd).value.split('\n').map(x => x.trim()).filter(Boolean); if (!list.length) return false; S.settings.bonusReasons = list; S.settings.bonusPts = Number($('#rsPts', dd).value) || 1; S.liveReason = 0; touchSettings(); render(); } }]);
  },
  liveAssign() {
    const c = liveCourse(); const se0 = findSession(c, S.live.date, S.live.period);
    const unit = se0 ? se0.unit : (($('#liveUnit') || {}).value);
    const due = dateId(new Date(Date.now() + 7 * 86400000));
    dialog('มอบงาน', `<label class="field"><span>ชื่องาน</span><input class="inp" id="asName" placeholder="เช่น ใบงานที่ 3"></label><div class="form-grid"><label class="field"><span>คะแนนเต็ม</span><input class="inp" type="number" id="asFull" min="1" value="10"></label><label class="field"><span>กำหนดส่ง</span><input class="inp" type="date" id="asDue" value="${due}"></label></div><p class="note">งานนี้จะขึ้นเป็นคอลัมน์ใหม่ในสมุดคะแนน หน่วยเดียวกับคาบนี้ และนับคนที่ยังไม่ส่งให้บนหน้าแรก</p>`,
      [{ label: 'ยกเลิก', cls: 'ghost' }, { label: 'มอบงาน', cls: 'pri', fn: d => {
        const name = $('#asName', d).value.trim(), full = Number($('#asFull', d).value);
        if (!name) { toast('ใส่ชื่องาน'); return false; } if (!(full > 0)) { toast('คะแนนเต็มต้องมากกว่า 0'); return false; }
        snap(c); const se = ensureSession(c); if (unit) se.unit = unit;
        const t = { id: newId('t'), name, full, unit: se.unit || (c.units[0] || {}).id, weight: 1, due: $('#asDue', d).value, assigned: se.date, session: se.id };
        c.tasks.push(t); c.scores[t.id] = {}; se.tasks.push(t.id); log('มอบงาน ' + name + ' กำหนดส่ง ' + thaiDate(t.due)); touch(c); render(); toast('มอบงานแล้ว เพิ่มในสมุดคะแนนให้แล้ว');
      } }]);
  },
  liveDelete() {
    const c = liveCourse(), se = findSession(c, S.live.date, S.live.period); if (!se) return;
    confirmBox('ลบบันทึกคาบนี้', 'ลบการเช็คชื่อ คะแนนพิเศษ และบันทึกการสอนของคาบนี้ งานที่มอบไปแล้วยังอยู่ในสมุดคะแนน กด Ctrl+Z เพื่อเลิกทำได้', 'ลบ', () => { snap(c); c.sessions = sessionsOf(c).filter(x => x !== se); syncBonus(c); touch(c); render(); });
  },
  teachPrint() { teachPrint(cur()); },
  tools() { S.view = 'tools'; render(); window.scrollTo(0, 0); },
  toolsMode(v) { S.toolsMode = v; render(); },
  toolsPresent() { const st = $('#toolStage') || $('.view'); if (!st) return; st.classList.toggle('present'); if (st.classList.contains('present')) { const x = document.createElement('button'); x.className = 'btn present-x'; x.textContent = 'ออกจากเต็มจอ'; x.onclick = () => { st.classList.remove('present'); x.remove(); }; st.appendChild(x); } },
  randGo() { randGo(toolsCourse()); },
  randReset() { S.rand.drawn[S.toolsCid] = []; S.rand.last = []; render(); },
  grpMake() { const c = toolsCourse(); ((S.grp.cur = S.grp.cur || {}))[c.id] = makeGroups(c); S.grp.pick = null; render(); },
  grpPick(sid) { S.grp.pick = S.grp.pick === sid ? null : sid; render(); },
  grpDrop(i) { const c = toolsCourse(), G = S.grp, gs = (G.cur || {})[c.id]; if (!G.pick || !gs) return; gs.forEach(g => { const k = g.indexOf(G.pick); if (k >= 0) g.splice(k, 1); }); gs[Number(i)].push(G.pick); G.pick = null; render(); },
  grpSave() {
    const c = toolsCourse(), gs = (S.grp.cur || {})[c.id]; if (!gs) return;
    const d0 = dialog('บันทึกชุดกลุ่ม', `<label class="field"><span>ชื่อชุด</span><input class="inp" id="gsName" value="กลุ่ม ${esc(thaiDate(new Date()))}"></label><p class="note">ชุดล่าสุดใช้ให้คะแนนพิเศษทั้งกลุ่มใน Live Class ได้</p>`, [{ label: 'ยกเลิก', cls: 'ghost' }, { label: 'บันทึก', cls: 'pri', fn: d => { snap(c); c.groupSets = (c.groupSets || []).concat({ id: newId('g'), name: $('#gsName', d).value.trim() || 'ชุดกลุ่ม', groups: gs.map(m => ({ m: m.slice() })), at: Date.now() }).slice(-10); log('บันทึกชุดกลุ่ม'); touch(c); render(); toast('บันทึกชุดกลุ่มแล้ว'); } }]);
  },
  grpLoad(i) { const c = toolsCourse(), x = (c.groupSets || [])[Number(i)]; if (!x) return; ((S.grp.cur = S.grp.cur || {}))[c.id] = setGroups(x).map(m => m.slice()); render(); }
};

/* ช่องกรอกและการลากวางของหน้าใหม่ */
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'liveCourse') { S.live.cid = el.value; render(); }
  if (el.id === 'liveDate') { S.live.date = el.value || dateId(); render(); }
  if (el.id === 'livePeriod') { S.live.period = Number(el.value); render(); }
  if (el.id === 'liveUnit') { const c = liveCourse(); snap(c); const se = ensureSession(c); se.unit = el.value; syncBonus(c); touch(c); render(); }
  if (el.id === 'toolsCourse') { S.toolsCid = el.value; render(); }
  if (el.id === 'randN') { S.rand.n = Number(el.value); }
  if (el.id === 'randNoRep') { S.rand.noRepeat = el.checked; render(); }
  if (el.id === 'randSkip') { S.rand.skipAbsent = el.checked; render(); }
  if (el.id === 'grpBy') { S.grp.by = el.value; S.grp.n = el.value === 'size' ? 5 : 6; render(); }
  if (el.id === 'grpN') { S.grp.n = Number(el.value); }
  if (el.id === 'grpMethod') { S.grp.method = el.value; }
  if (el.id === 'grpSkip') { S.grp.skipAbsent = el.checked; }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'liveTopic' || el.id === 'liveNote') { const c = liveCourse(); const se = ensureSession(c); se[el.id === 'liveTopic' ? 'topic' : 'note'] = el.value; touch(c); }
});
document.addEventListener('dragstart', e => { const m = e.target.closest && e.target.closest('.grp-m'); if (m) { S.grp.pick = m.dataset.sid; e.dataTransfer.setData('text/plain', m.dataset.sid); } });
document.addEventListener('dragover', e => { if (e.target.closest && e.target.closest('.grp')) e.preventDefault(); });
document.addEventListener('drop', e => { const g = e.target.closest && e.target.closest('.grp'); if (g && S.grp && S.grp.pick) { e.preventDefault(); LIVE_ACT.grpDrop(g.dataset.gi); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const p = $('.present'); if (p) { p.classList.remove('present'); const x = $('.present-x'); if (x) x.remove(); } } });
