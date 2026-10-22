/* ClassFolio · ทะเบียนนักเรียน (รายชื่อกลางรายชั้น ใช้ซ้ำได้ทุกรายวิชา และเลื่อนชั้นทั้งโรงเรียนได้)
   เก็บใน settings.roster = { classes:[{id, grade, room, students:[{id, no, code, prefix, first, last}]}], graduated:[{id, year, grade, room, students}], undo }
   นักเรียนในรายวิชาใช้ id เดียวกับในทะเบียน จึงจับคู่กันได้ตลอด */
const GRADE_ORDER = ['อ.1', 'อ.2', 'อ.3', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
function roster() {
  const r = S.settings.roster || (S.settings.roster = { classes: [], graduated: [] });
  if (!Array.isArray(r.classes)) r.classes = [];
  if (!Array.isArray(r.graduated)) r.graduated = [];
  return r;
}
function gradeRank(g) { const i = GRADE_ORDER.indexOf(String(g || '').trim()); return i < 0 ? 99 : i; }
function rosterSorted() { return roster().classes.slice().sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || String(a.room || '').localeCompare(String(b.room || ''), 'th', { numeric: true })); }
function rosterFind(grade, room) { const g = String(grade || '').trim(), r = String(room || '').trim(); return roster().classes.find(k => String(k.grade).trim() === g && String(k.room || '').trim() === r) || null; }
function rosterFor(c) { return c ? rosterFind(c.grade, c.room) : null; }
function rosterStudents(k) { return (k.students || []).slice().sort((a, b) => (a.no || 0) - (b.no || 0)); }
function rosterRenumber(k) { rosterStudents(k).forEach((s, i) => s.no = i + 1); }
/* ดึงรายชื่อเข้ารายวิชา: เพิ่มคนที่ยังไม่มี · อัปเดตชื่อคนที่มีแล้ว · ไม่ลบใคร และไม่แตะคะแนน */
function courseStudentsFromRoster(k) { return rosterStudents(k).map(s => ({ id: s.id, no: s.no, code: s.code || '', prefix: s.prefix || '', first: s.first || '', last: s.last || '', status: 'active' })); }
function syncCourseFromRoster(c, k) {
  let add = 0, upd = 0;
  rosterStudents(k).forEach(s => {
    const m = c.students.find(x => x.id === s.id) || (s.code && c.students.find(x => x.code && x.code === s.code));
    if (m) { ['code', 'prefix', 'first', 'last'].forEach(f => { if ((s[f] || '') !== (m[f] || '')) { m[f] = s[f] || ''; upd++; } }); if (m.status === 'out') { m.status = 'active'; upd++; } }
    else { c.students.push({ id: s.id, no: 999, code: s.code || '', prefix: s.prefix || '', first: s.first || '', last: s.last || '', status: 'active' }); add++; }
  });
  /* เรียงเลขที่ตามทะเบียน คนที่ไม่มีในทะเบียนต่อท้าย */
  const order = rosterStudents(k).map(s => s.id);
  Calc.activeStudents(c).sort((a, b) => { const ia = order.indexOf(a.id), ib = order.indexOf(b.id); return (ia < 0 ? 1e4 + (a.no || 0) : ia) - (ib < 0 ? 1e4 + (b.no || 0) : ib); }).forEach((s, i) => s.no = i + 1);
  const extra = Calc.activeStudents(c).filter(s => !order.includes(s.id)).length;
  return { add, upd, extra };
}
/* แยกชื่อ-นามสกุลที่เคยนำเข้ามาอยู่ช่องเดียวกัน */
function needSplit(list) { return (list || []).filter(s => !String(s.last || '').trim() && /\s/.test(String(s.first || '').trim())); }
function splitNames(list) {
  const n = needSplit(list);
  n.forEach(s => { const p = String(s.first).trim().split(/\s+/); s.first = p.shift(); s.last = p.join(' '); });
  return n.length;
}
function splitBanner(n, act, v) { return n ? `<div class="banner">${ico('alert')}<span><b>มี ${n} คนที่ชื่อและนามสกุลอยู่ช่องเดียวกัน</b> กดปุ่มเพื่อแยกนามสกุลไปไว้ช่องของมันให้อัตโนมัติ</span><button class="btn sm pri" data-act="${act}" data-v="${v}" style="margin-left:auto">แยกชื่อ-นามสกุล</button></div>` : ''; }
function nextGradeOf(g, p6up) {
  const i = GRADE_ORDER.indexOf(g); if (i < 0) return null;
  if (g === 'ม.6' || g === 'ม.3' && !rosterSorted().some(k => k.grade === 'ม.4')) return 'จบ';
  if (g === 'ป.6' && !p6up) return 'จบ';
  if (g === 'อ.3') return 'ป.1';
  return GRADE_ORDER[i + 1];
}

/* ---------------- หน้า ทะเบียนนักเรียน ---------------- */
function viewRoster() {
  const list = rosterSorted(), R = roster();
  if (!S.rosterCid || !list.some(k => k.id === S.rosterCid)) S.rosterCid = (list[0] || {}).id || null;
  const k = list.find(x => x.id === S.rosterCid) || null;
  const total = list.reduce((a, x) => a + (x.students || []).length, 0);
  const head = `<div class="card bar"><div class="row">
      <span class="chip acc">${list.length} ชั้นเรียน · ${total} คน</span>
      <button class="btn pri" data-act="rosterAdd">${ico('plus')} เพิ่มชั้นเรียน</button>
      <button class="btn" data-act="rosterPromote" ${list.length ? '' : 'disabled'}>${ico('bolt')} เลื่อนชั้น (ขึ้นปีการศึกษาใหม่)</button>
      ${R.undo ? `<button class="btn ghost" data-act="rosterUndo">${ico('undo')} ย้อนการเลื่อนชั้นล่าสุด</button>` : ''}
    </div><p class="note" style="margin-top:8px">นำเข้ารายชื่อครั้งเดียวต่อชั้น แล้วเลือกใช้ได้ทุกรายวิชาของชั้นนั้น ตอนสร้างรายวิชาหรือเริ่มภาคเรียนใหม่ระบบดึงรายชื่อให้เอง · ขึ้นปีการศึกษาใหม่กด "เลื่อนชั้น" ทุกคนขยับขึ้น 1 ชั้นพร้อมกัน</p></div>`;
  if (!list.length) return head + `<div class="card empty"><h3>ยังไม่มีชั้นเรียนในทะเบียน</h3><p>เพิ่มชั้นเรียน เช่น ป.4 หรือ ม.1/1 แล้ววางรายชื่อจาก Excel ครั้งเดียว</p><button class="btn pri" data-act="rosterAdd">${ico('plus')} เพิ่มชั้นเรียนแรก</button></div>`;
  const chips = `<div class="ros-chips">${list.map(x => `<button class="ros-chip ${x.id === S.rosterCid ? 'on' : ''}" data-act="rosterPick" data-v="${x.id}" data-hue="${gradeRank(x.grade) < 9 ? 'teal' : 'indigo'}"><b>${esc(classOf(x))}</b><small>${(x.students || []).length} คน</small></button>`).join('')}</div>`;
  const studs = rosterStudents(k);
  const courses = S.courses.filter(c => !c.archived && classOf(c) === classOf(k));
  const usage = courses.length ? `<div class="ros-use"><b>ใช้กับรายวิชา</b>${courses.map(c => {
      const ids = new Set(Calc.activeStudents(c).map(s => s.id)), miss = studs.filter(s => !ids.has(s.id)).length;
      return `<div class="ros-use-row"><span><b>${esc(c.code)}</b> ${esc(c.name)} <small class="muted">· ${esc(termLabel(c))}</small></span>${miss ? `<span class="chip warn">ยังไม่มี ${miss} คน</span><button class="btn sm" data-act="rosterSync" data-v="${c.id}">${ico('download')} ดึงรายชื่อเข้า</button>` : '<span class="chip ok">รายชื่อตรงกัน</span>'}</div>`;
    }).join('')}</div>` : `<p class="note">ยังไม่มีรายวิชาของชั้น ${esc(classOf(k))} · ตอนสร้างรายวิชา ใส่ชั้น/ห้องให้ตรง ระบบจะดึงรายชื่อนี้ให้เอง</p>`;
  const grad = R.graduated.length ? `<details class="card ros-grad"><summary><b>นักเรียนที่จบการศึกษา</b> <span class="chip">${R.graduated.reduce((a, g) => a + g.students.length, 0)} คน</span></summary>${R.graduated.slice().sort((a, b) => b.year - a.year).map(g => `<p class="small" style="margin:8px 0 2px"><b>ปีการศึกษา ${esc(g.year)} · ${esc(classOf(g))}</b> ${g.students.length} คน</p><p class="note" style="margin:0">${g.students.map(s => esc(studentName(s))).join(' · ')}</p>`).join('')}</details>` : '';
  return head + chips + `<div class="card">
    <div class="card-h"><h2>ชั้น ${esc(classOf(k))}</h2><span class="chip acc">${studs.length} คน</span>
      <span class="row" style="margin-left:auto;gap:6px"><button class="btn sm pri" data-act="rosterImport">${ico('upload')} วางรายชื่อจาก Excel</button><button class="btn sm" data-act="rosterAddStu">${ico('plus')} เพิ่มทีละคน</button><button class="btn sm" data-act="rosterSort">${ico('sort')} เรียงตามเลขประจำตัว</button><button class="btn sm" data-act="rosterEdit">${ico('pen')} แก้ชั้น/ห้อง</button><button class="btn sm ghost danger" data-act="rosterDel" aria-label="ลบชั้นนี้">${ico('trash')}</button></span></div>
    ${splitBanner(needSplit(studs).length, 'rosterSplit', k.id)}
    ${usage}
    ${studs.length ? `<div class="tbl-wrap flat"><table class="tbl stack stu-tbl"><thead><tr><th>เลขที่</th><th class="l">เลขประจำตัว</th><th class="l">คำนำหน้า</th><th class="l">ชื่อ</th><th class="l">นามสกุล</th><th></th></tr></thead><tbody>
      ${studs.map(s => `<tr><td class="n" data-label="เลขที่">${s.no}</td>
        <td data-label="เลขประจำตัว"><input class="inp t" data-rs="${k.id}|${s.id}|code" value="${esc(s.code || '')}" style="width:110px" inputmode="numeric"></td>
        <td data-label="คำนำหน้า"><input class="inp t" data-rs="${k.id}|${s.id}|prefix" value="${esc(s.prefix || '')}" list="prefixList" style="width:90px"></td>
        <td data-label="ชื่อ"><input class="inp t" data-rs="${k.id}|${s.id}|first" value="${esc(s.first || '')}" style="width:150px"></td>
        <td data-label="นามสกุล"><input class="inp t" data-rs="${k.id}|${s.id}|last" value="${esc(s.last || '')}" style="width:150px"></td>
        <td class="st-del"><button class="btn sm ghost danger" data-act="rosterDelStu" data-v="${s.id}" aria-label="ลบ">${ico('trash')}</button></td></tr>`).join('')}
    </tbody></table></div><datalist id="prefixList">${PREFIXES.map(p => `<option value="${p}">`).join('')}</datalist>` : `<div class="empty"><p>ยังไม่มีรายชื่อในชั้นนี้</p><button class="btn pri" data-act="rosterImport">${ico('upload')} วางรายชื่อจาก Excel</button></div>`}
  </div>` + grad;
}

function rosterClassDialog(k) {
  const body = `<div class="form-grid">
    <label class="field"><span>ชั้น</span><input class="inp" id="rgGrade" list="rgGrades" value="${esc(k ? k.grade : '')}" placeholder="เช่น ป.4 หรือ ม.1"><datalist id="rgGrades">${GRADE_ORDER.map(g => `<option value="${g}">`).join('')}</datalist></label>
    <label class="field"><span>ห้อง <small class="muted">(เว้นว่างได้ ถ้ามีห้องเดียว)</small></span><input class="inp" id="rgRoom" value="${esc(k ? k.room || '' : '')}" placeholder="เช่น 1"></label></div>`;
  dialog(k ? 'แก้ชั้น/ห้อง' : 'เพิ่มชั้นเรียน', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: k ? 'บันทึก' : 'เพิ่มชั้นเรียน', cls: 'pri', fn: d => {
      const grade = $('#rgGrade', d).value.trim(), room = $('#rgRoom', d).value.trim();
      if (!grade) { toast('ใส่ชั้นก่อน'); return false; }
      const dup = rosterFind(grade, room); if (dup && dup !== k) { toast('มีชั้น ' + classOf({ grade, room }) + ' อยู่แล้ว'); return false; }
      if (k) Object.assign(k, { grade, room }); else { k = { id: newId('k'), grade, room, students: [] }; roster().classes.push(k); }
      S.rosterCid = k.id; touchSettings(); render();
      if (!k.students.length) setTimeout(rosterImportDialog, 80);
    }
  }]);
}

function rosterImportDialog() {
  const k = roster().classes.find(x => x.id === S.rosterCid); if (!k) return;
  const body = `<p class="small">คัดลอกจาก Excel หรือ Google Sheet แล้ววางด้านล่าง ลำดับคอลัมน์: เลขประจำตัว · คำนำหน้า · ชื่อ · นามสกุล (ไม่มีบางคอลัมน์ก็ได้)</p>
    <textarea class="inp" id="rImp" rows="8" placeholder="12401	ด.ช.	ธนกฤต	ทองดี&#10;12402	ด.ญ.	กนกพร	ศรีสุข"></textarea>
    ${k.students.length ? `<div class="row small"><label class="row"><input type="radio" name="rMode" value="append" checked> ต่อท้ายรายชื่อเดิม (${k.students.length} คน)</label><label class="row"><input type="radio" name="rMode" value="replace"> แทนที่รายชื่อทั้งหมด</label></div>` : ''}
    <div id="rPrev"></div>`;
  const d = dialog('วางรายชื่อ ชั้น ' + classOf(k), body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'นำเข้า', cls: 'pri', fn: d => {
      const list = parseStudents($('#rImp', d).value);
      if (!list.length) { toast('ยังไม่มีรายชื่อที่อ่านได้'); return false; }
      const mode = (d.querySelector('input[name=rMode]:checked') || {}).value || 'append';
      if (mode === 'replace') {
        /* คงรหัสเดิมของคนที่ยังอยู่ (เลขประจำตัวตรงกัน) เพื่อให้จับคู่กับรายวิชาได้ */
        const old = k.students; k.students = list.map(s => { const m = s.code && old.find(o => o.code === s.code); return Object.assign({ id: m ? m.id : newId('s') }, s); });
      } else {
        list.forEach(s => { const m = s.code && k.students.find(o => o.code && o.code === s.code); if (m) Object.assign(m, s); else k.students.push(Object.assign({ id: newId('s'), no: 9999 }, s)); });
      }
      if (mode === 'replace') k.students.forEach((s, i) => s.no = i + 1); else rosterRenumber(k);
      touchSettings(); render(); toast('นำเข้ารายชื่อ ชั้น ' + classOf(k) + ' ' + list.length + ' คนแล้ว');
    }
  }], { wide: true });
  $('#rImp', d).addEventListener('input', e => {
    const list = parseStudents(e.target.value);
    $('#rPrev', d).innerHTML = list.length ? `<p class="small"><b>ตรวจก่อนนำเข้า ${list.length} คน</b></p><div class="tbl-wrap" style="max-height:220px"><table class="tbl"><thead><tr><th>ลำดับ</th><th>เลขประจำตัว</th><th>คำนำหน้า</th><th>ชื่อ</th><th>นามสกุล</th></tr></thead><tbody>${list.map((s, i) => `<tr><td class="n">${i + 1}</td><td>${esc(s.code) || '<span class="chip warn">ไม่มี</span>'}</td><td>${esc(s.prefix)}</td><td>${esc(s.first)}</td><td>${esc(s.last)}</td></tr>`).join('')}</tbody></table></div>` : '';
  });
}

function rosterPromoteDialog() {
  const list = rosterSorted();
  const hasP6 = list.some(k => k.grade === 'ป.6'), hasM = list.some(k => k.grade.startsWith('ม.'));
  const y = new Date().getFullYear() + 543 - (new Date().getMonth() < 4 ? 1 : 0);
  const plan = p6up => list.slice().reverse().map(k => ({ k, to: nextGradeOf(k.grade, p6up) }));
  const table = p6up => `<div class="ros-plan">${plan(p6up).reverse().map(({ k, to }) => `<div class="ros-plan-row"><b>${esc(classOf(k))}</b><span>${(k.students || []).length} คน</span>${ico('chev')}<b class="${to === 'จบ' ? 'grad' : ''}">${to === 'จบ' ? 'จบการศึกษา' : to ? esc(classOf({ grade: to, room: k.room })) : 'คงเดิม (ไม่รู้จักชั้นนี้)'}</b></div>`).join('')}</div>`;
  const body = `<p class="note">ใช้ตอนขึ้นปีการศึกษาใหม่ นักเรียนทุกชั้นขยับขึ้น 1 ชั้นพร้อมกัน ห้องคงเดิม ชั้นที่จบไปอยู่ใน "นักเรียนที่จบการศึกษา" รายวิชาเดิมไม่เปลี่ยน คะแนนเดิมอยู่ครบ</p>
    ${hasP6 && hasM ? `<label class="row small"><input type="checkbox" id="rpP6" checked> นักเรียน ป.6 เรียนต่อ ม.1 ที่โรงเรียนนี้</label>` : ''}
    <label class="field"><span>ปีการศึกษาที่จบ (บันทึกในประวัติ)</span><input class="inp" id="rpYear" type="number" value="${y}" style="max-width:160px"></label>
    <div id="rpTable">${table(hasP6 && hasM)}</div>
    <p class="note">หลังเลื่อนชั้น ชั้นแรกเข้า (เช่น ป.1${hasM && !hasP6 ? ' หรือ ม.1' : ''}) จะว่าง ให้เพิ่มชั้นและวางรายชื่อนักเรียนใหม่ · กด "ย้อนการเลื่อนชั้นล่าสุด" ได้ถ้ากดผิด</p>`;
  const d = dialog('เลื่อนชั้นทั้งโรงเรียน', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'เลื่อนชั้น', cls: 'pri', fn: d => {
      const p6up = !!($('#rpP6', d) && $('#rpP6', d).checked), year = Number($('#rpYear', d).value) || y, R = roster();
      R.undo = JSON.stringify({ classes: R.classes, graduated: R.graduated });
      const moved = []; let grad = 0;
      plan(p6up).forEach(({ k, to }) => {
        if (!to) { moved.push(k); return; }
        if (to === 'จบ') { if (k.students.length) R.graduated.push({ id: newId('g'), year, grade: k.grade, room: k.room, students: k.students }); grad += k.students.length; return; }
        const tgt = moved.find(m => m.grade === to && String(m.room || '') === String(k.room || ''));
        if (tgt) { tgt.students = tgt.students.concat(k.students); rosterRenumber(tgt); } else { k.grade = to; moved.push(k); }
      });
      R.classes = moved; touchSettings(); render();
      toast('เลื่อนชั้นแล้ว' + (grad ? ' · จบการศึกษา ' + grad + ' คน' : ''), { label: 'ย้อน', fn: () => ACT.rosterUndo() });
    }
  }], { wide: true });
  const cb = $('#rpP6', d); if (cb) cb.onchange = () => { $('#rpTable', d).innerHTML = table(cb.checked); };
}

const ROSTER_ACT = {
  roster() { S.view = 'roster'; render(); window.scrollTo(0, 0); },
  rosterPick(v) { S.rosterCid = v; render(); },
  rosterAdd() { rosterClassDialog(null); },
  rosterEdit() { const k = roster().classes.find(x => x.id === S.rosterCid); if (k) rosterClassDialog(k); },
  rosterImport() { rosterImportDialog(); },
  rosterPromote() { rosterPromoteDialog(); },
  rosterSplit(v) { const k = roster().classes.find(x => x.id === v); if (!k) return; const n = splitNames(k.students); touchSettings(); render(); toast('แยกชื่อ-นามสกุลแล้ว ' + n + ' คน'); },
  courseSplit() { const c = cur(); if (!c) return; snap(c); const n = splitNames(c.students); c.log = (c.log || []).concat({ t: Date.now(), text: 'แยกชื่อ-นามสกุล ' + n + ' คน' }); touch(c); render(); toast('แยกชื่อ-นามสกุลแล้ว ' + n + ' คน', { label: 'เลิกทำ', fn: undo }); },
  rosterAddStu() { const k = roster().classes.find(x => x.id === S.rosterCid); if (!k) return; k.students.push({ id: newId('s'), no: k.students.length + 1, code: '', prefix: '', first: 'นักเรียนใหม่', last: '' }); touchSettings(); render(); },
  rosterSort() { const k = roster().classes.find(x => x.id === S.rosterCid); if (!k) return; k.students.sort((a, b) => String(a.code).localeCompare(String(b.code), 'th', { numeric: true })).forEach((s, i) => s.no = i + 1); touchSettings(); render(); toast('เรียงเลขที่ตามเลขประจำตัวแล้ว'); },
  rosterDelStu(v) { const k = roster().classes.find(x => x.id === S.rosterCid); if (!k) return; const s = k.students.find(x => x.id === v); confirmBox('ลบออกจากทะเบียน', `ลบ "${esc(studentName(s))}" ออกจากทะเบียน ชั้น ${esc(classOf(k))} (รายวิชาที่มีชื่อนี้อยู่แล้วไม่เปลี่ยน)`, 'ลบ', () => { k.students = k.students.filter(x => x.id !== v); rosterRenumber(k); touchSettings(); render(); }); },
  rosterDel() { const k = roster().classes.find(x => x.id === S.rosterCid); if (!k) return; confirmBox('ลบชั้นเรียน', `ลบชั้น ${esc(classOf(k))} และรายชื่อ ${k.students.length} คนออกจากทะเบียน (รายวิชาที่ดึงรายชื่อไปแล้วไม่เปลี่ยน)`, 'ลบชั้นนี้', () => { const R = roster(); R.classes = R.classes.filter(x => x !== k); S.rosterCid = null; touchSettings(); render(); }); },
  rosterSync(v) { const c = S.courses.find(x => x.id === v) || cur(), k = rosterFor(c); if (!c || !k) return; snap(c); const r = syncCourseFromRoster(c, k); c.log = (c.log || []).concat({ t: Date.now(), text: 'ดึงรายชื่อจากทะเบียน ชั้น ' + classOf(k) + ' เพิ่ม ' + r.add + ' คน' }); touch(c); render(); toast(`ดึงรายชื่อแล้ว เพิ่ม ${r.add} คน${r.upd ? ' · อัปเดต ' + r.upd + ' รายการ' : ''}${r.extra ? ' · มี ' + r.extra + ' คนในรายวิชาที่ไม่อยู่ในทะเบียน' : ''}`); },
  rosterFromCourse() { const c = cur(); if (!c) return; const studs = Calc.activeStudents(c); let k = rosterFor(c); if (!k) { k = { id: newId('k'), grade: c.grade, room: c.room || '', students: [] }; roster().classes.push(k); } studs.forEach(s => { if (!k.students.some(x => x.id === s.id || (s.code && x.code === s.code))) k.students.push({ id: s.id, no: 9999, code: s.code || '', prefix: s.prefix || '', first: s.first || '', last: s.last || '' }); }); rosterRenumber(k); touchSettings(); render(); toast('บันทึกรายชื่อ ' + studs.length + ' คนเข้าทะเบียน ชั้น ' + classOf(k) + ' แล้ว'); },
  rosterUndo() { const R = roster(); if (!R.undo) return; const o = JSON.parse(R.undo); R.classes = o.classes; R.graduated = o.graduated; delete R.undo; touchSettings(); render(); toast('ย้อนการเลื่อนชั้นแล้ว'); }
};
