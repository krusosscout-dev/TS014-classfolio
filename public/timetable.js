/* ClassFolio · ตารางสอนของครู และตารางเรียนรายห้อง */
const TT_ALL_DAYS = [
  [1, 'จันทร์', '#e8b400'], [2, 'อังคาร', '#e0559a'], [3, 'พุธ', '#1f9d55'], [4, 'พฤหัสบดี', '#e07a00'], [5, 'ศุกร์', '#2389e6'], [6, 'เสาร์', '#8b5cf6'], [7, 'อาทิตย์', '#e5484d']
];
const ttDays = () => { const on = tt().days || [1, 2, 3, 4, 5]; return TT_ALL_DAYS.filter(d => on.includes(d[0])); };
const TT_DAYS = TT_ALL_DAYS;
const TT_HUES = ['blue', 'violet', 'teal', 'pink', 'amber', 'cyan', 'green', 'rose', 'indigo'];

function ttDefault() {
  return {
    periods: [['08:30', '09:20'], ['09:20', '10:10'], ['10:10', '11:00'], ['11:00', '11:50'], ['12:50', '13:40'], ['13:40', '14:30'], ['14:30', '15:20'], ['15:20', '16:10']].map(([s, e]) => ({ s, e })),
    lunchAfter: 4, cells: {}, classes: {}, extraRooms: [],
    days: [1, 2, 3, 4, 5], plan: { start: '08:30', len: 50, count: 8, brk: 0, lunchLen: 60 }, hrsPerPeriod: 1, weeksTerm: 20, weeksYear: 40
  };
}
function tt() { if (!S.settings.tt) S.settings.tt = ttDefault(); const T = S.settings.tt, D = ttDefault(); ['days', 'plan', 'hrsPerPeriod', 'weeksTerm', 'weeksYear'].forEach(k => { if (T[k] === undefined) T[k] = D[k]; }); return T; }
function courseHue(c) { const i = activeCourses().indexOf(c); return TT_HUES[(i < 0 ? 0 : i) % TT_HUES.length]; }
function roomOf(c) { return classOf(c); }
function ttRooms() {
  const set = new Set(activeCourses().map(roomOf).concat(tt().extraRooms || []));
  return Array.from(set).sort((a, b) => thColl.compare(a, b));
}
function ttCell(key) { return tt().cells[key] || null; }
function ttCourseAt(key) { const x = ttCell(key); return x && x.course ? S.courses.find(c => c.id === x.course) || null : null; }

function todayPeriods() {
  const d = new Date().getDay() || 7;
  if (!(tt().days || []).includes(d)) return null;
  return tt().periods.map((p, i) => ({ p, i, key: d + '-' + (i + 1), cell: ttCell(d + '-' + (i + 1)), course: ttCourseAt(d + '-' + (i + 1)) })).filter(x => x.cell);
}

function ttCellHtml(mode, room, key, label) {
  const T = tt(), course = ttCourseAt(key), cell = ttCell(key);
  if (mode === 'mine') {
    if (course) return `<button class="tt-cell" data-hue="${courseHue(course)}" data-act="ttEdit" data-v="${key}"><b>${esc(course.code)}</b><span>${esc(course.name)}</span><small>${esc(roomOf(course))}${cell.place ? ' · ' + esc(cell.place) : ''}</small></button>`;
    if (cell && cell.text) return `<button class="tt-cell other" data-act="ttEdit" data-v="${key}"><b>${esc(cell.text)}</b>${cell.place ? `<small>${esc(cell.place)}</small>` : ''}</button>`;
    return `<button class="tt-cell empty" data-act="ttEdit" data-v="${key}" aria-label="เพิ่มคาบ ${label}">+</button>`;
  }
  if (course && roomOf(course) === room) return `<div class="tt-cell mine" data-hue="${courseHue(course)}"><b>${esc(course.name)}</b><span>${esc(course.code)}</span><small>${esc(course.teacher || 'ฉัน')}</small></div>`;
  const x = ((T.classes[room] || {})[key]) || null;
  if (x && x.subj) return `<button class="tt-cell other" data-act="ttClassEdit" data-v="${key}"><b>${esc(x.subj)}</b>${x.teacher ? `<small>${esc(x.teacher)}</small>` : ''}</button>`;
  return `<button class="tt-cell empty" data-act="ttClassEdit" data-v="${key}" aria-label="เพิ่มวิชา ${label}">+</button>`;
}

function ttGrid(mode, room) {
  const T = tt();
  const cols = [];
  T.periods.forEach((p, i) => { cols.push({ i, p }); if (i + 1 === Number(T.lunchAfter) && i < T.periods.length - 1) cols.push({ lunch: true }); });
  const head = `<tr><th class="tt-day-h">วัน / เวลา</th>${cols.map(c => c.lunch ? `<th class="tt-lunch-h"></th>` : `<th>คาบ ${c.i + 1}<span class="sub">${esc(c.p.s)}–${esc(c.p.e)}</span></th>`).join('')}</tr>`;
  const days = ttDays();
  const rows = days.map(([d, name, col]) => `<tr><th class="tt-day" style="--dc:${col}">${name}</th>${cols.map(c => {
    if (c.lunch) return d === days[0][0] ? `<td class="tt-lunch" rowspan="${days.length}"><span>พักกลางวัน</span></td>` : '';
    return `<td>${ttCellHtml(mode, room, d + '-' + (c.i + 1), name + ' คาบ ' + (c.i + 1))}</td>`;
  }).join('')}</tr>`).join('');
  /* จอเล็ก: เลือกวัน แล้วแสดงคาบเรียงลงมา */
  const today = new Date().getDay() || 7;
  if (!S.ttDay || !days.some(x => x[0] === S.ttDay)) S.ttDay = days.some(x => x[0] === today) ? today : days[0][0];
  const dayRow = days.find(x => x[0] === S.ttDay);
  const list = T.periods.map((p, i) => `<div class="ttm-row"><span class="ttm-t"><b>คาบ ${i + 1}</b><small>${esc(p.s)}–${esc(p.e)}</small></span>${ttCellHtml(mode, room, S.ttDay + '-' + (i + 1), dayRow[1] + ' คาบ ' + (i + 1))}</div>${i + 1 === Number(T.lunchAfter) && i < T.periods.length - 1 ? '<div class="ttm-lunch">พักกลางวัน</div>' : ''}`).join('');
  const mobile = `<div class="ttm"><div class="ttm-days">${days.map(([d, n, col]) => `<button class="${d === S.ttDay ? 'on' : ''}" style="--dc:${col}" data-act="ttDay" data-v="${d}">${n.replace('พฤหัสบดี', 'พฤหัส')}</button>`).join('')}</div><div class="ttm-list">${list}</div></div>`;
  return `<div class="tbl-wrap tt-wrap"><table class="tbl tt"><thead>${head}</thead><tbody>${rows}</tbody></table></div>${mobile}`;
}

function viewTimetable() {
  const mode = S.ttMode || 'mine';
  const rooms = ttRooms();
  if (mode === 'room' && (!S.ttRoom || !rooms.includes(S.ttRoom))) S.ttRoom = rooms[0] || '';
  const T = tt();
  let summary = '';
  if (mode === 'mine') {
    const counts = {};
    Object.values(T.cells).forEach(x => { if (x && x.course) counts[x.course] = (counts[x.course] || 0) + 1; });
    const list = activeCourses().filter(c => counts[c.id]);
    summary = `<div class="card"><div class="card-h"><h3>คาบสอนต่อสัปดาห์</h3><span class="chip acc">รวม ${Object.values(counts).reduce((a, b) => a + b, 0)} คาบ</span></div>
      ${list.length ? `<div class="tt-sum">${list.map(c => { const per = counts[c.id], weeks = levelOfCourse(c) === 'ป' || c.term === 'ปี' ? Number(T.weeksYear) || 40 : Number(T.weeksTerm) || 20, need = Number(c.hours) ? Math.round(Number(c.hours) / weeks / (Number(T.hrsPerPeriod) || 1)) : 0; return `<div data-hue="${courseHue(c)}"><span class="tt-dot"></span><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(roomOf(c))} · ${per} คาบ/สัปดาห์${need ? ` · ตามเวลาเรียนควรมี ${need} คาบ` : ''}</small></span>${need && need !== per ? '<span class="chip warn">ไม่ตรง</span>' : need ? '<span class="chip ok">ตรง</span>' : ''}</div>`; }).join('')}</div>` : '<p class="note">แตะช่องว่างในตารางเพื่อใส่รายวิชาที่สอน</p>'}
      <p class="note" style="margin-top:8px">คิดจากเวลาเรียน ÷ ${esc(T.weeksTerm)} สัปดาห์ (รายภาค) หรือ ÷ ${esc(T.weeksYear)} สัปดาห์ (รายปี) · 1 คาบ = ${esc(T.hrsPerPeriod)} ชั่วโมง เปลี่ยนได้ที่ "ตั้งเวลาคาบ"</p></div>`;
  }
  return `
  <div class="card bar"><div class="row">
    <div class="seg"><button data-act="ttMode" data-v="mine" class="${mode === 'mine' ? 'on' : ''}">ตารางสอนของฉัน</button><button data-act="ttMode" data-v="room" class="${mode === 'room' ? 'on' : ''}">ตารางเรียนรายห้อง</button></div>
    ${mode === 'room' ? `<select class="inp" id="ttRoomSel" style="width:auto">${rooms.map(r => `<option ${r === S.ttRoom ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><button class="btn sm" data-act="ttAddRoom">${ico('plus')} เพิ่มห้อง</button>` : ''}
    <span class="row" style="margin-left:auto"><button class="btn sm" data-act="ttPeriods">${ico('clock')} ตั้งวันและคาบเรียน</button><button class="btn sm" data-act="ttPrint">${ico('print')} พิมพ์</button></span>
  </div><p class="note" style="margin-top:8px">${mode === 'mine' ? 'แตะช่องเพื่อใส่รายวิชาที่สอน หรือกิจกรรมอื่น เช่น ประชุม เวรประจำวัน' : 'วิชาที่ครูสอนเองขึ้นให้อัตโนมัติจากตารางสอน แตะช่องว่างเพื่อใส่วิชาอื่นของห้องนี้'}</p></div>
  ${mode === 'room' && !rooms.length ? '<div class="card empty"><h3>ยังไม่มีห้องเรียน</h3><p>สร้างรายวิชาก่อน หรือกดเพิ่มห้อง</p></div>' : ttGrid(mode, S.ttRoom)}
  ${summary}`;
}

function ttEditDialog(key) {
  const [d, p] = key.split('-').map(Number);
  const cell = ttCell(key) || {};
  const day = TT_DAYS.find(x => x[0] === d)[1], per = tt().periods[p - 1];
  const list = activeCourses().sort((a, b) => thColl.compare(a.code, b.code));
  const body = `<p class="small muted">วัน${day} คาบ ${p} · ${esc(per.s)}–${esc(per.e)} น.</p>
    <div class="tt-pick">${list.map(c => `<label data-hue="${courseHue(c)}"><input type="radio" name="ttc" value="${c.id}" ${cell.course === c.id ? 'checked' : ''}><span class="tt-dot"></span><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(roomOf(c))} · ${esc(termLabel(c))}</small></span></label>`).join('')}
    <label><input type="radio" name="ttc" value="__text" ${cell.text ? 'checked' : ''}><span class="tt-dot" style="background:var(--muted)"></span><span><b>กิจกรรมอื่น</b><small>เช่น ประชุม ลูกเสือ ชุมนุม เวร</small></span></label></div>
    <label class="field"><span>ชื่อกิจกรรม (ถ้าเลือกกิจกรรมอื่น)</span><input class="inp" id="ttText" value="${esc(cell.text || '')}"></label>
    <label class="field"><span>สถานที่ / ห้อง (ไม่บังคับ)</span><input class="inp" id="ttPlace" value="${esc(cell.place || '')}" placeholder="เช่น ห้องสังคม อาคาร 2"></label>`;
  const btns = [];
  if (cell.course || cell.text) btns.push({ label: 'ล้างช่องนี้', cls: 'danger left', fn: () => { delete tt().cells[key]; touchSettings(); render(); } });
  btns.push({ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'บันทึก', cls: 'pri', fn: dlg => {
      const v = (dlg.querySelector('input[name=ttc]:checked') || {}).value;
      const text = $('#ttText', dlg).value.trim(), place = $('#ttPlace', dlg).value.trim();
      if (!v && !text) { toast('เลือกรายวิชา หรือพิมพ์ชื่อกิจกรรม'); return false; }
      tt().cells[key] = v && v !== '__text' ? { course: v, place } : { text: text || 'กิจกรรม', place };
      touchSettings(); render();
    }
  });
  const dlg = dialog('คาบสอน', body, btns);
  $('#ttText', dlg).addEventListener('input', () => { const r = dlg.querySelector('input[value="__text"]'); if (r) r.checked = true; });
}

function ttClassEditDialog(key) {
  const room = S.ttRoom, T = tt();
  const x = ((T.classes[room] || {})[key]) || {};
  const [d, p] = key.split('-').map(Number);
  const day = TT_DAYS.find(z => z[0] === d)[1];
  const known = new Set(); Object.values(T.classes).forEach(m => Object.values(m).forEach(v => v && v.subj && known.add(v.subj)));
  const body = `<p class="small muted">ห้อง ${esc(room)} · วัน${day} คาบ ${p}</p>
    <label class="field"><span>วิชา</span><input class="inp" id="tcSubj" list="tcList" value="${esc(x.subj || '')}" placeholder="เช่น คณิตศาสตร์ 1"></label>
    <datalist id="tcList">${Array.from(known).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <label class="field"><span>ครูผู้สอน (ไม่บังคับ)</span><input class="inp" id="tcTeacher" value="${esc(x.teacher || '')}"></label>`;
  const btns = [];
  if (x.subj) btns.push({ label: 'ล้างช่องนี้', cls: 'danger left', fn: () => { delete T.classes[room][key]; touchSettings(); render(); } });
  btns.push({ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'บันทึก', cls: 'pri', fn: dlg => {
      const subj = $('#tcSubj', dlg).value.trim();
      if (!subj) { toast('ใส่ชื่อวิชา'); return false; }
      (T.classes[room] = T.classes[room] || {})[key] = { subj, teacher: $('#tcTeacher', dlg).value.trim() };
      touchSettings(); render();
    }
  });
  dialog('ตารางเรียน ' + room, body, btns);
}

function ttPeriodsDialog() {
  const T = tt(), P = T.plan;
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const toTime = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const rows = () => T.periods.map((p, i) => `<div class="pr-row"><b>คาบ ${i + 1}</b><input class="inp" type="time" data-pi="${i}|s" value="${esc(p.s)}"><span>–</span><input class="inp" type="time" data-pi="${i}|e" value="${esc(p.e)}"><span class="note">${Math.max(0, toMin(p.e) - toMin(p.s))} นาที</span></div>${i + 1 === Number(T.lunchAfter) && i < T.periods.length - 1 ? '<div class="pr-lunch">พักกลางวัน</div>' : ''}`).join('');
  const body = `
    <div class="pr-sec"><h3>วันที่มีเรียน</h3><div class="row">${TT_ALL_DAYS.map(([d, n, col]) => `<label class="day-pick" style="--dc:${col}"><input type="checkbox" data-day="${d}" ${(T.days || []).includes(d) ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
    <div class="pr-sec"><h3>สร้างเวลาคาบอัตโนมัติ</h3>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <label class="field"><span>เริ่มคาบแรก</span><input class="inp" type="time" id="pStart" value="${esc(P.start)}"></label>
        <label class="field"><span>คาบละ (นาที)</span><input class="inp" type="number" id="pLen" min="10" max="180" value="${esc(P.len)}"></label>
        <label class="field"><span>จำนวนคาบต่อวัน</span><input class="inp" type="number" id="pCount" min="1" max="14" value="${esc(T.periods.length)}"></label>
        <label class="field"><span>พักระหว่างคาบ (นาที)</span><input class="inp" type="number" id="pBrk" min="0" max="60" value="${esc(P.brk)}"></label>
        <label class="field"><span>พักกลางวันหลังคาบที่</span><input class="inp" type="number" id="pLunchAt" min="0" max="14" value="${esc(T.lunchAfter)}"></label>
        <label class="field"><span>พักกลางวันนาน (นาที)</span><input class="inp" type="number" id="pLunchLen" min="0" max="120" value="${esc(P.lunchLen)}"></label>
      </div>
      <button class="btn sm pri" type="button" id="pGen" style="margin-top:10px">${ico('clock')} สร้างเวลาทั้งหมดตามนี้</button>
      <p class="note" style="margin-top:6px">ถ้าบางคาบไม่เท่ากัน แก้เวลารายคาบด้านล่างได้</p></div>
    <div class="pr-sec"><h3>เวลารายคาบ</h3><div id="ttRows" class="pr-list">${rows()}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" type="button" id="ttAddP">${ico('plus')} เพิ่มคาบ</button><button class="btn sm" type="button" id="ttDelP">ลบคาบสุดท้าย</button></div></div>
    <div class="pr-sec"><h3>การนับชั่วโมงเรียน</h3>
      <div class="form-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <label class="field"><span>1 คาบ นับเป็น (ชั่วโมง)</span><input class="inp" type="number" id="pHrs" min="0.25" step="0.25" value="${esc(T.hrsPerPeriod)}"></label>
        <label class="field"><span>สัปดาห์ต่อภาคเรียน</span><input class="inp" type="number" id="pWT" min="1" value="${esc(T.weeksTerm)}"></label>
        <label class="field"><span>สัปดาห์ต่อปี (ประถม)</span><input class="inp" type="number" id="pWY" min="1" value="${esc(T.weeksYear)}"></label>
      </div><p class="note" style="margin-top:6px">ใช้ตรวจว่าจำนวนคาบในตารางตรงกับเวลาเรียนของแต่ละวิชาไหม</p></div>`;
  const dlg = dialog('ตั้งค่าวันและคาบเรียน', body, [{
    label: 'บันทึก', cls: 'pri', fn: d => {
      T.lunchAfter = Number($('#pLunchAt', d).value) || 0;
      T.hrsPerPeriod = Number($('#pHrs', d).value) || 1; T.weeksTerm = Number($('#pWT', d).value) || 20; T.weeksYear = Number($('#pWY', d).value) || 40;
      const days = $$('[data-day]', d).filter(x => x.checked).map(x => Number(x.dataset.day));
      if (!days.length) { toast('เลือกวันเรียนอย่างน้อย 1 วัน'); return false; }
      T.days = days; touchSettings(); render(); toast('บันทึกวันและคาบเรียนแล้ว');
    }
  }], { wide: true });
  const bind = () => $$('[data-pi]', dlg).forEach(el => el.onchange = () => { const [i, k] = el.dataset.pi.split('|'); T.periods[Number(i)][k] = el.value; $('#ttRows', dlg).innerHTML = rows(); bind(); });
  bind();
  $('#pGen', dlg).onclick = () => {
    const start = toMin($('#pStart', dlg).value || '08:30'), len = Number($('#pLen', dlg).value) || 50, n = Math.max(1, Math.min(14, Number($('#pCount', dlg).value) || 8));
    const brk = Number($('#pBrk', dlg).value) || 0, lunchAt = Number($('#pLunchAt', dlg).value) || 0, lunchLen = Number($('#pLunchLen', dlg).value) || 0;
    Object.assign(T.plan, { start: toTime(start), len, count: n, brk, lunchLen }); T.lunchAfter = lunchAt;
    let t = start; T.periods = [];
    for (let i = 1; i <= n; i++) { T.periods.push({ s: toTime(t), e: toTime(t + len) }); t += len + (i === lunchAt ? lunchLen : brk); }
    $('#ttRows', dlg).innerHTML = rows(); bind(); toast('สร้างเวลา ' + n + ' คาบแล้ว');
  };
  $('#ttAddP', dlg).onclick = () => { const last = T.periods[T.periods.length - 1] || { e: '08:30' }; const s0 = toMin(last.e) + (Number(T.plan.brk) || 0); T.periods.push({ s: toTime(s0), e: toTime(s0 + (Number(T.plan.len) || 50)) }); $('#ttRows', dlg).innerHTML = rows(); bind(); };
  $('#ttDelP', dlg).onclick = () => { if (T.periods.length > 1) { T.periods.pop(); $('#ttRows', dlg).innerHTML = rows(); bind(); } };
}

function ttPrint() {
  const mode = S.ttMode || 'mine', T = tt();
  const title = mode === 'mine' ? 'ตารางสอน ' + (S.settings.teacher || '') : 'ตารางเรียน ชั้น ' + S.ttRoom;
  const cols = []; T.periods.forEach((p, i) => { cols.push({ i, p }); if (i + 1 === Number(T.lunchAfter) && i < T.periods.length - 1) cols.push({ lunch: true }); });
  const cellTxt = (d, i) => {
    const key = d + '-' + (i + 1), c = ttCourseAt(key), cell = ttCell(key);
    if (mode === 'mine') return c ? `<b>${esc(c.code)}</b><br>${esc(c.name)}<br>${esc(roomOf(c))}` : cell && cell.text ? esc(cell.text) : '';
    if (c && roomOf(c) === S.ttRoom) return `<b>${esc(c.name)}</b><br>${esc(c.teacher || '')}`;
    const x = (T.classes[S.ttRoom] || {})[key]; return x ? `<b>${esc(x.subj)}</b><br>${esc(x.teacher || '')}` : '';
  };
  const html = `<section class="sheet land"><h1 class="doc">${esc(title)}</h1><p class="cen" style="margin-bottom:4mm">${esc(S.settings.school)}</p>
    <table class="pt tt-print"><thead><tr><th style="width:24mm">วัน / เวลา</th>${cols.map(c => c.lunch ? '<th style="width:10mm"></th>' : `<th>คาบ ${c.i + 1}<br>${esc(c.p.s)}–${esc(c.p.e)}</th>`).join('')}</tr></thead>
    <tbody>${ttDays().map(([d, n], di, arr) => `<tr><th>${n}</th>${cols.map(c => c.lunch ? (di === 0 ? `<td rowspan="${arr.length}" class="c"><div class="vt">พักกลางวัน</div></td>` : '') : `<td class="c">${cellTxt(d, c.i)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
  $('#printRoot').innerHTML = html;
  printNow(mode === 'mine' ? 'ตารางสอน ' + (S.settings.teacher || '') : 'ตารางเรียน ' + String(S.ttRoom || '').replace('/', '-'));
}

function todayCard() {
  const list = todayPeriods();
  const d = new Date().getDay();
  const head = `<div class="card-h"><h3>ตารางสอนวันนี้</h3><button class="btn sm ghost" data-act="timetable">ดูทั้งสัปดาห์</button></div>`;
  if (list === null) return `<div class="card">${head}<p class="note">วันนี้วันหยุด</p></div>`;
  if (!list.length) return `<div class="card">${head}<p class="note">${Object.keys(tt().cells).length ? 'วันนี้ไม่มีคาบสอน' : 'ยังไม่ได้ใส่ตารางสอน แตะ "ดูทั้งสัปดาห์" เพื่อเริ่ม'}</p></div>`;
  const now = new Date().toTimeString().slice(0, 5);
  return `<div class="card">${head}<div class="today">${list.map(x => {
    const on = now >= x.p.s && now < x.p.e, past = now >= x.p.e;
    return `<button class="today-row${on ? ' now' : ''}${past ? ' past' : ''}" ${x.course ? `data-hue="${courseHue(x.course)}" data-act="liveSlot" data-v="${x.course.id}|${x.i + 1}" title="เปิด Live Class คาบนี้"` : 'data-hue="slate" data-act="timetable"'}><span class="t">${esc(x.p.s)}<small>${esc(x.p.e)}</small></span><span class="bar"></span><span><b>${x.course ? esc(x.course.code + ' ' + x.course.name) : esc(x.cell.text)}</b><small>คาบ ${x.i + 1}${x.course ? ' · ' + esc(roomOf(x.course)) : ''}${x.cell.place ? ' · ' + esc(x.cell.place) : ''}</small></span>${on ? '<span class="chip ok">กำลังสอน</span>' : ''}${x.course ? `<span class="go-live">${ico('live')}</span>` : ''}</button>`;
  }).join('')}</div></div>`;
}
