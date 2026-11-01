/* ClassFolio · เริ่มภาคเรียนใหม่ และคลังภาคเรียนเก่า */
/* ---------- ภาคเรียนปัจจุบัน (ใช้ทั้งระบบ) ----------
   settings.period = { year: 2569, term: '1'|'2' } · มัธยมแสดงเฉพาะวิชาของภาคนั้น · ประถม (ตัดสินรายปี) แสดงทั้งปี และรู้ว่าตอนนี้ภาคไหน */
function isYearly(c) { return levelOfCourse(c) === 'ป' || c.term === 'ปี'; }
function guessPeriod() {
  const live = S.courses.filter(c => !c.archived), sec = live.filter(c => !isYearly(c)).sort((a, b) => (b.year - a.year) || String(b.term).localeCompare(String(a.term)))[0];
  if (sec) return { year: Number(sec.year), term: String(sec.term) === '2' ? '2' : '1' };
  const d = new Date(), y = d.getFullYear() + 543 - (d.getMonth() < 4 ? 1 : 0), yr = live.length ? Math.max(...live.map(c => Number(c.year) || y)) : y;
  return { year: yr, term: d.getMonth() >= 4 && d.getMonth() < 9 ? '1' : '2' };
}
function period() {
  const p = S.settings && S.settings.period;
  if (p && Number(p.year)) return { year: Number(p.year), term: String(p.term) === '2' ? '2' : '1' };
  return guessPeriod();
}
function setPeriod(p) { S.settings.period = { year: Number(p.year), term: String(p.term) === '2' ? '2' : '1' }; touchSettings(); }
function nextPeriod(p) { return p.term === '1' ? { year: p.year, term: '2' } : { year: p.year + 1, term: '1' }; }
function periodText(p) { return 'ภาคเรียนที่ ' + p.term + '/' + p.year; }
function inPeriod(c, p) { p = p || period(); return Number(c.year) === p.year && (isYearly(c) || String(c.term) === p.term); }
/* ป้ายภาคเรียนของรายวิชาบนหน้าจอ (ประถมบอกว่าตอนนี้ภาคไหนด้วย) · เอกสาร ปพ.5 ยังใช้ termLabel */
function courseTermUI(c) { const p = period(); return isYearly(c) ? 'ปีการศึกษา ' + c.year + (Number(c.year) === p.year ? ' · ภาค ' + p.term : '') : termLabel(c); }
/* กำลังดูภาคเรียนย้อนหลังอยู่หรือไม่ (ภาคปัจจุบันเก่ากว่าภาคล่าสุดที่มีรายวิชา) */
function pKey(p) { return Number(p.year) * 10 + Number(p.term); }
function latestKey() { return Math.max(0, ...S.courses.map(c => isYearly(c) ? Number(c.year) * 10 + 1 : Number(c.year) * 10 + (String(c.term) === '2' ? 2 : 1))); }
function viewingPast() { return pKey(period()) < latestKey(); }
function activeCourses() { const past = viewingPast(); return S.courses.filter(c => inPeriod(c) && (past || !c.archived)); }
function archivedCourses() { const act = new Set(activeCourses()); return S.courses.filter(c => !act.has(c)).sort((a, b) => (b.year - a.year) || String(b.term).localeCompare(String(a.term)) || thColl.compare(a.code, b.code)); }
function termKey(c) { return c.year + '|' + c.term; }
function nextTerm(c) {
  if (c.term === '1') return { year: Number(c.year), term: '2' };
  return { year: Number(c.year) + 1, term: c.term === 'ปี' ? 'ปี' : '1' };
}
function termText(t, c) { return t.term === 'ปี' || (c && levelOfCourse(c) === 'ป') ? 'ปีการศึกษา ' + t.year : 'ภาคเรียนที่ ' + t.term + '/' + t.year; }

function newTermDialog() {
  const p = period(), nx = nextPeriod(p);
  const list = activeCourses().slice().sort((a, b) => thColl.compare(a.code, b.code));
  if (!list.length) { { setPeriod(nx); render(); toast('เปลี่ยนเป็น' + periodText(nx) + ' แล้ว · ยังไม่มีรายวิชาให้คัดลอก'); } return; }
  /* ประถมขึ้นภาค 2 ในปีเดิม = ใช้รายวิชาเดิมต่อ ไม่ต้องสร้างใหม่ */
  const keep = list.filter(c => isYearly(c) && nx.year === Number(c.year)), copy = list.filter(c => !keep.includes(c));
  const rows = copy.map(c => {
    const t = isYearly(c) ? { year: nx.year, term: 'ปี' } : { year: nx.year, term: nx.term }, nx2 = isYearly(c) ? { code: c.code, name: c.name } : (catalogNext(c.code) || { code: c.code, name: c.name });
    return `<div class="nt-row" data-cid="${c.id}">
      <label class="nt-pick"><input type="checkbox" data-nt="on" checked><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(classOf(c))} · ${esc(courseTermUI(c))} → <b>${esc(termText(t, c))}</b></small></span></label>
      <div class="nt-fields">
        <label class="field"><span>รหัสวิชาใหม่</span><input class="inp" data-nt="code" value="${esc(nx2.code)}"></label>
        <label class="field"><span>ชื่อวิชา</span><input class="inp" data-nt="name" value="${esc(nx2.name)}"></label>
        <label class="field"><span>ชั้น</span><input class="inp" data-nt="grade" value="${esc(c.grade)}"></label>
        <label class="field"><span>ห้อง</span><input class="inp" data-nt="room" value="${esc(c.room)}"></label>
      </div>
    </div>`;
  }).join('');
  const keepRows = keep.map(c => `<div class="nt-keep"><span class="lv">ป</span><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(classOf(c))} · ใช้รายวิชาเดิมต่อในภาคเรียนที่ ${nx.term} ${Calc.semOn(c) ? '(แบ่งคะแนนภาคละ 50 ไว้แล้ว)' : '· ตัดเกรดรายปี คะแนนภาค 1 อยู่ครบ'}</small></span></div>`).join('');
  const body = `<div class="nt-head"><span>${esc(periodText(p))}</span>${ico('chev')}<b>${esc(periodText(nx))}</b></div>
    <p class="note">รายวิชาที่ตัดสินรายภาค ระบบสร้างรายวิชาของภาคใหม่ให้ คะแนน เวลาเรียน บันทึกการสอนเริ่มว่าง ส่วนรายวิชาเดิมไปอยู่ใน<b>คลังภาคเรียนเก่า</b> เปิดดู พิมพ์ ปพ.5 และส่งออก Excel ย้อนหลังได้ตลอด</p>
    ${keep.length ? `<div class="nt-keeps"><b>ประถม ตัดเกรดรายปี · ใช้รายวิชาเดิมต่อ</b>${keepRows}</div>` : ''}
    ${copy.length ? `<div class="row small nt-all"><b style="margin-right:auto">สร้างรายวิชาของภาคใหม่</b><button class="btn sm ghost" type="button" data-ntall="1">เลือกทั้งหมด</button><button class="btn sm ghost" type="button" data-ntall="0">ไม่เลือกเลย</button></div>
    <div class="nt-list">${rows}</div>
    <div class="nt-opts">
      <b>คัดลอกไปด้วย</b>
      <label class="row small"><input type="checkbox" id="ntStu" checked> รายชื่อนักเรียน (ไม่รวมคนที่ย้ายออก)</label>
      ${roster().classes.length ? `<label class="row small" style="padding-left:26px"><input type="checkbox" id="ntRos" checked> ใช้รายชื่อจาก<b>ทะเบียนนักเรียน</b>ของชั้นในภาคใหม่ ถ้ามี (ขึ้นปีใหม่ ให้กด "เลื่อนชั้น" ในทะเบียนก่อน)</label>` : ''}
      <label class="row small"><input type="checkbox" id="ntStruct" checked> โครงสร้างรายวิชา หน่วย และรายการงาน (คะแนนว่าง)</label>
      <label class="row small"><input type="checkbox" id="ntDesc" checked> คำอธิบายรายวิชาและตัวชี้วัด</label>
      <label class="row small"><input type="checkbox" id="ntTT" checked> ย้ายตารางสอนไปใช้กับรายวิชาใหม่</label>
      <label class="row small"><input type="checkbox" id="ntArc" checked> ย้ายรายวิชาเดิมเข้าคลังภาคเรียนเก่า</label>
    </div>` : ''}`;
  const d = dialog('เริ่ม' + periodText(nx), body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'เริ่ม' + periodText(nx), cls: 'pri', fn: async dd => {
      const picks = Array.from(dd.querySelectorAll('.nt-row')).filter(r => r.querySelector('[data-nt="on"]').checked);
      if (picks.some(r => !r.querySelector('[data-nt="code"]').value.trim())) { toast('ใส่รหัสวิชาให้ครบ'); return false; }
      /* เก็บสำเนาถาวรของภาคเรียนที่จบก่อน (ไม่ถูกลบอัตโนมัติ) */
      try { await flush(); await saveBackupNow('term', 'สิ้น' + periodText(p)); S.backups = await Store.listBackups(); } catch (e) { console.warn(e); }
      const opt = copy.length ? { ros: !!($('#ntRos', dd) && $('#ntRos', dd).checked), stu: $('#ntStu', dd).checked, struct: $('#ntStruct', dd).checked, desc: $('#ntDesc', dd).checked, tt: $('#ntTT', dd).checked, arc: $('#ntArc', dd).checked } : {};
      const made = picks.map(r => {
        const f = S.courses.find(x => x.id === r.dataset.cid), v = k => r.querySelector(`[data-nt="${k}"]`).value.trim();
        return [f, startNextTerm(f, { code: v('code'), name: v('name') || f.name, grade: v('grade') || f.grade, room: v('room') || f.room }, opt, nx)];
      });
      if (opt.tt && S.settings.tt && S.settings.tt.cells) {
        const map = {}; made.forEach(([f, n]) => map[f.id] = n.id);
        Object.values(S.settings.tt.cells).forEach(x => { if (x && map[x.course]) x.course = map[x.course]; });
      }
      setPeriod(nx);
      S.cur = (made[0] && made[0][1].id) || (keep[0] && keep[0].id) || S.cur; S.view = 'home'; S.switcher = false; S.live = null; S.toolsCid = null;
      render(); window.scrollTo(0, 0);
      toast(`เริ่ม${periodText(nx)}แล้ว${made.length ? ' · สร้างรายวิชาใหม่ ' + made.length + ' วิชา' : ''}${keep.length ? ' · ประถมใช้วิชาเดิมต่อ ' + keep.length + ' วิชา' : ''}`);
    }
  }], { wide: true });
  d.querySelectorAll('[data-ntall]').forEach(b => b.onclick = () => d.querySelectorAll('[data-nt="on"]').forEach(x => { x.checked = b.dataset.ntall === '1'; x.dispatchEvent(new Event('change')); }));
  d.querySelectorAll('[data-nt="on"]').forEach(x => x.onchange = () => x.closest('.nt-row').classList.toggle('off', !x.checked));
}

function startNextTerm(f, over, opt, np) {
  const t = np ? (isYearly(f) ? { year: np.year, term: 'ปี' } : { year: np.year, term: np.term }) : nextTerm(f);
  const c = defaultCourse(S.settings, Object.assign({
    year: t.year, term: t.term, hours: (catalogFind(over.code) || f).hours, credits: (catalogFind(over.code) || f).credits, teacher: f.teacher, group: f.group, type: f.type, level: f.level
  }, over));
  const rk = opt.stu && opt.ros ? rosterFind(c.grade, c.room) : null;
  if (rk && rk.students.length) c.students = courseStudentsFromRoster(rk);
  else if (opt.stu) c.students = clone(Calc.activeStudents(f)).map((s, i) => Object.assign(s, { id: newId('s'), no: i + 1, status: 'active' }));
  if (opt.struct) {
    c.units = clone(f.units); c.ratio = clone(f.ratio); c.convert = f.convert; if (f.sem) c.sem = clone(f.sem);
    c.tasks = clone(f.tasks || []).map(x => { x.id = newId('t'); delete x.due; return x; });
    c.tasks.forEach(x => c.scores[x.id] = {});
  }
  if (opt.desc) ['descHtml', 'indicators', 'descFont', 'descLine', 'descSize', 'showInd'].forEach(k => { if (f[k] !== undefined) c[k] = clone(f[k]); });
  c.prevId = f.id;
  c.log = [{ t: Date.now(), text: 'เริ่ม' + termText(t, f) + ' ต่อจาก ' + f.code + ' ' + termLabel(f) }];
  S.courses.push(c); touch(c);
  if (opt.arc) { f.archived = true; f.archivedAt = Date.now(); f.log = (f.log || []).concat({ t: Date.now(), text: 'ย้ายเข้าคลังภาคเรียนเก่า' }); touch(f); }
  return c;
}

function setArchived(c, on) {
  c.archived = !!on; if (on) c.archivedAt = Date.now(); else delete c.archivedAt;
  c.log = (c.log || []).concat({ t: Date.now(), text: on ? 'ย้ายเข้าคลังภาคเรียนเก่า' : 'นำออกจากคลังกลับมาใช้งาน' });
  touch(c);
}

/* การ์ดคลังภาคเรียนเก่าในหน้าแรก */
function archiveCard() {
  const arc = archivedCourses();
  if (!arc.length) return '';
  const open = !!S.showArchive;
  const groups = []; arc.forEach(c => { const k = termKey(c); let g = groups.find(x => x.k === k); if (!g) groups.push(g = { k, label: termLabel(c), list: [] }); g.list.push(c); });
  return `<div class="card arc-card">
    <div class="card-h"><h3>${ico('book')} คลังภาคเรียนเก่า</h3><span class="chip">${arc.length} รายวิชา</span><button class="btn sm ghost" data-act="showArchive" aria-expanded="${open}" style="margin-left:auto">${open ? 'ซ่อน' : 'แสดง'}</button></div>
    ${open ? groups.map(g => `<div class="arc-g"><div class="arc-h">${esc(g.label)}</div>${g.list.map(c => `<div class="arc-row ${lvClass(c)}"><span class="lv">${levelOfCourse(c)}</span><button class="arc-t" data-act="go" data-v="${c.id}|overview"><b>${esc(c.code)} ${esc(c.name)}</b><small>ชั้น ${esc(classOf(c))} · ${Calc.activeStudents(c).length} คน</small></button><span class="arc-b"><button class="btn sm" data-act="go" data-v="${c.id}|print" title="ปพ.5">${ico('print')}<span class="arc-lbl"> ปพ.5</span></button><button class="btn sm" data-act="unarchive" data-v="${c.id}" title="นำกลับมาใช้งาน">${ico('undo')}<span class="arc-lbl"> นำกลับ</span></button></span></div>`).join('')}</div>`).join('') : '<p class="note">รายวิชาของภาคเรียนที่จบแล้ว เปิดดู พิมพ์ ปพ.5 และส่งออก Excel ได้ตลอด</p>'}
  </div>`;
}

/* ป้ายภาคเรียนปัจจุบันที่แถบด้านบน */
function currentTermCourse() { const c = cur(); if (c && !c.archived) return c; const a = activeCourses(); return a.sort((x, y) => (y.year - x.year) || String(y.term).localeCompare(String(x.term)))[0] || null; }
function termChip() {
  if (!S.courses.length) return '';
  return `<button class="term-chip" data-act="periodDlg" title="ภาคเรียนปัจจุบัน · กดเพื่อเปลี่ยนหรือเริ่มภาคเรียนใหม่">${ico('calendar')}<span><small>ภาคเรียนปัจจุบัน</small><b>${esc(periodText(period()))}</b></span></button>`;
}
/* กล่องภาคเรียนปัจจุบัน: เลือกดูภาคอื่น หรือเริ่มภาคเรียนถัดไป */
function periodDialog() {
  const p = period(), nx = nextPeriod(p);
  const years = Array.from(new Set(S.courses.map(c => Number(c.year)).concat([p.year, nx.year]))).filter(Boolean).sort((a, b) => b - a);
  const count = q => S.courses.filter(c => inPeriod(c, q)).length;
  const opts = years.flatMap(y => ['2', '1'].map(t => ({ year: y, term: t })));
  const body = `<div class="pd-now"><small>ตอนนี้</small><b>${esc(periodText(p))}</b><span class="note">${count(p)} รายวิชา</span></div>
    <div class="pd-next"><div><b>ขึ้น${esc(periodText(nx))}</b><small>สร้างรายวิชาของภาคใหม่ คะแนนเริ่มว่าง รายวิชาเดิมเก็บไว้ดูย้อนหลัง${nx.year === p.year ? ' · วิชาประถม (ตัดเกรดรายปี) ใช้รายวิชาเดิมต่อในภาคเรียนที่ 2' : ''}</small></div><button class="btn pri" type="button" id="pdNext">${ico('calendar')} เริ่ม${esc(periodText(nx))}</button></div>
    <details class="pd-other"><summary class="small">ดูภาคเรียนอื่น (ไม่สร้างอะไรใหม่)</summary>
      <div class="pd-list">${opts.map(q => { const n = count(q), on = q.year === p.year && q.term === p.term; return `<button type="button" class="pd-opt${on ? ' on' : ''}" data-y="${q.year}" data-t="${q.term}"><b>${esc(periodText(q))}</b><small>${n ? n + ' รายวิชา' : 'ยังไม่มีรายวิชา'}</small></button>`; }).join('')}</div></details>`;
  const d = dialog('ภาคเรียนปัจจุบัน', body, [{ label: 'ปิด', cls: 'ghost' }]);
  if (viewingPast()) {
    const k = latestKey(), lp = { year: Math.floor(k / 10), term: String(k % 10 === 2 ? 2 : 1) };
    $('.pd-next', d).innerHTML = `<div><b>กำลังดูภาคเรียนย้อนหลัง</b><small>ภาคเรียนล่าสุดคือ ${esc(periodText(lp))}</small></div><button class="btn pri" type="button" id="pdBack">${ico('undo')} กลับ${esc(periodText(lp))}</button>`;
    $('#pdBack', d).onclick = () => { setPeriod(lp); d.close(); d.remove(); S.cur = (activeCourses()[0] || {}).id || S.cur; S.view = 'home'; S.live = null; render(); toast('กลับ' + periodText(lp) + ' แล้ว'); };
  } else $('#pdNext', d).onclick = () => { d.close(); d.remove(); newTermDialog(); };
  d.querySelectorAll('.pd-opt').forEach(b => b.onclick = () => { setPeriod({ year: b.dataset.y, term: b.dataset.t }); d.close(); d.remove(); S.cur = (activeCourses()[0] || {}).id || S.cur; S.view = 'home'; S.live = null; S.toolsCid = null; render(); toast('เปลี่ยนเป็น' + periodText(period()) + ' แล้ว'); });
}
const TERM_ACT = {
  periodDlg() { flush(); periodDialog(); },
  newTerm() { flush(); if (viewingPast()) { periodDialog(); return; } newTermDialog(); },
  showArchive() { S.showArchive = !S.showArchive; render(); },
  archive() { const c = cur(); if (!c) return; confirmBox('ย้ายเข้าคลัง', `ย้าย "${esc(c.code)} ${esc(c.name)}" เข้าคลังภาคเรียนเก่า ข้อมูลทั้งหมดยังอยู่ นำกลับมาใช้ได้ทุกเมื่อ`, 'ย้ายเข้าคลัง', () => { setArchived(c, true); S.view = 'home'; render(); toast('ย้ายเข้าคลังภาคเรียนเก่าแล้ว'); }); },
  unarchive(v) { const c = v ? S.courses.find(x => x.id === v) : cur(); if (!c) return; if (!inPeriod(c)) { const p = period(); c.year = p.year; if (!isYearly(c)) c.term = p.term; } setArchived(c, false); render(); toast('นำ ' + c.code + ' กลับมาใช้งานแล้ว'); }
};
