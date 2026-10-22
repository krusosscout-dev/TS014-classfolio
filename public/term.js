/* ClassFolio · เริ่มภาคเรียนใหม่ และคลังภาคเรียนเก่า */
function activeCourses() { return S.courses.filter(c => !c.archived); }
function archivedCourses() { return S.courses.filter(c => c.archived).sort((a, b) => (b.year - a.year) || String(b.term).localeCompare(String(a.term)) || thColl.compare(a.code, b.code)); }
function termKey(c) { return c.year + '|' + c.term; }
function nextTerm(c) {
  if (c.term === '1') return { year: Number(c.year), term: '2' };
  return { year: Number(c.year) + 1, term: c.term === 'ปี' ? 'ปี' : '1' };
}
function termText(t, c) { return t.term === 'ปี' || (c && levelOfCourse(c) === 'ป') ? 'ปีการศึกษา ' + t.year : 'ภาคเรียนที่ ' + t.term + '/' + t.year; }

function newTermDialog() {
  const list = activeCourses().slice().sort((a, b) => thColl.compare(a.code, b.code));
  if (!list.length) { toast('ยังไม่มีรายวิชาที่ใช้อยู่'); return; }
  const rows = list.map(c => {
    const t = nextTerm(c), nx = catalogNext(c.code) || { code: c.code, name: c.name };
    return `<div class="nt-row" data-cid="${c.id}">
      <label class="nt-pick"><input type="checkbox" data-nt="on" checked><span><b>${esc(c.code)} ${esc(c.name)}</b><small>${esc(classOf(c))} · ${esc(termLabel(c))} → <b>${esc(termText(t, c))}</b></small></span></label>
      <div class="nt-fields">
        <label class="field"><span>รหัสวิชาใหม่</span><input class="inp" data-nt="code" value="${esc(nx.code)}"></label>
        <label class="field"><span>ชื่อวิชา</span><input class="inp" data-nt="name" value="${esc(nx.name)}"></label>
        <label class="field"><span>ชั้น</span><input class="inp" data-nt="grade" value="${esc(c.grade)}"></label>
        <label class="field"><span>ห้อง</span><input class="inp" data-nt="room" value="${esc(c.room)}"></label>
      </div>
    </div>`;
  }).join('');
  const body = `<p class="note">เลือกรายวิชาที่จะสอนต่อ ระบบสร้างรายวิชาใหม่ให้ คะแนน เวลาเรียน และบันทึกการสอนเริ่มใหม่ ส่วนรายวิชาเดิมย้ายเข้าคลังภาคเรียนเก่า ยังเปิดดู พิมพ์ ปพ.5 และส่งออก Excel ได้ตลอด</p>
    <div class="row small nt-all"><button class="btn sm ghost" type="button" data-ntall="1">เลือกทั้งหมด</button><button class="btn sm ghost" type="button" data-ntall="0">ไม่เลือกเลย</button></div>
    <div class="nt-list">${rows}</div>
    <div class="nt-opts">
      <b>คัดลอกไปด้วย</b>
      <label class="row small"><input type="checkbox" id="ntStu" checked> รายชื่อนักเรียน (ไม่รวมคนที่ย้ายออก)</label>
      ${roster().classes.length ? `<label class="row small" style="padding-left:26px"><input type="checkbox" id="ntRos" checked> ใช้รายชื่อจาก<b>ทะเบียนนักเรียน</b>ของชั้นในภาคใหม่ ถ้ามี (ขึ้นปีใหม่ ให้กด "เลื่อนชั้น" ในทะเบียนก่อน)</label>` : ''}
      <label class="row small"><input type="checkbox" id="ntStruct" checked> โครงสร้างรายวิชา หน่วย และรายการงาน (คะแนนว่าง)</label>
      <label class="row small"><input type="checkbox" id="ntDesc" checked> คำอธิบายรายวิชาและตัวชี้วัด</label>
      <label class="row small"><input type="checkbox" id="ntTT" checked> ย้ายตารางสอนไปใช้กับรายวิชาใหม่</label>
      <label class="row small"><input type="checkbox" id="ntArc" checked> ย้ายรายวิชาเดิมเข้าคลังภาคเรียนเก่า</label>
    </div>`;
  const d = dialog('เริ่มภาคเรียนใหม่', body, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'เริ่มภาคเรียนใหม่', cls: 'pri', fn: dd => {
      const picks = Array.from(dd.querySelectorAll('.nt-row')).filter(r => r.querySelector('[data-nt="on"]').checked);
      if (!picks.length) { toast('เลือกอย่างน้อย 1 รายวิชา'); return false; }
      if (picks.some(r => !r.querySelector('[data-nt="code"]').value.trim())) { toast('ใส่รหัสวิชาให้ครบ'); return false; }
      const opt = { ros: !!($('#ntRos', dd) && $('#ntRos', dd).checked), stu: $('#ntStu', dd).checked, struct: $('#ntStruct', dd).checked, desc: $('#ntDesc', dd).checked, tt: $('#ntTT', dd).checked, arc: $('#ntArc', dd).checked };
      const made = picks.map(r => {
        const f = S.courses.find(x => x.id === r.dataset.cid), v = k => r.querySelector(`[data-nt="${k}"]`).value.trim();
        return [f, startNextTerm(f, { code: v('code'), name: v('name') || f.name, grade: v('grade') || f.grade, room: v('room') || f.room }, opt)];
      });
      if (opt.tt && S.settings.tt && S.settings.tt.cells) {
        const map = {}; made.forEach(([f, n]) => map[f.id] = n.id);
        let moved = 0;
        Object.values(S.settings.tt.cells).forEach(x => { if (x && map[x.course]) { x.course = map[x.course]; moved++; } });
        if (moved) touchSettings();
      }
      S.cur = made[0][1].id; S.view = 'home'; S.switcher = false; S.live = null; S.toolsCid = null;
      render(); window.scrollTo(0, 0);
      toast(`เริ่มภาคเรียนใหม่แล้ว ${made.length} รายวิชา${opt.arc ? ' · รายวิชาเดิมอยู่ในคลังภาคเรียนเก่า' : ''}`);
    }
  }], { wide: true });
  d.querySelectorAll('[data-ntall]').forEach(b => b.onclick = () => d.querySelectorAll('[data-nt="on"]').forEach(x => { x.checked = b.dataset.ntall === '1'; x.dispatchEvent(new Event('change')); }));
  d.querySelectorAll('[data-nt="on"]').forEach(x => x.onchange = () => x.closest('.nt-row').classList.toggle('off', !x.checked));
}

function startNextTerm(f, over, opt) {
  const t = nextTerm(f);
  const c = defaultCourse(S.settings, Object.assign({
    year: t.year, term: t.term, hours: (catalogFind(over.code) || f).hours, credits: (catalogFind(over.code) || f).credits, teacher: f.teacher, group: f.group, type: f.type, level: f.level
  }, over));
  const rk = opt.stu && opt.ros ? rosterFind(c.grade, c.room) : null;
  if (rk && rk.students.length) c.students = courseStudentsFromRoster(rk);
  else if (opt.stu) c.students = clone(Calc.activeStudents(f)).map((s, i) => Object.assign(s, { id: newId('s'), no: i + 1, status: 'active' }));
  if (opt.struct) {
    c.units = clone(f.units); c.ratio = clone(f.ratio); c.convert = f.convert;
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

const TERM_ACT = {
  newTerm() { flush(); newTermDialog(); },
  showArchive() { S.showArchive = !S.showArchive; render(); },
  archive() { const c = cur(); if (!c) return; confirmBox('ย้ายเข้าคลัง', `ย้าย "${esc(c.code)} ${esc(c.name)}" เข้าคลังภาคเรียนเก่า ข้อมูลทั้งหมดยังอยู่ นำกลับมาใช้ได้ทุกเมื่อ`, 'ย้ายเข้าคลัง', () => { setArchived(c, true); S.view = 'home'; render(); toast('ย้ายเข้าคลังภาคเรียนเก่าแล้ว'); }); },
  unarchive(v) { const c = v ? S.courses.find(x => x.id === v) : cur(); if (!c) return; setArchived(c, false); render(); toast('นำ ' + c.code + ' กลับมาใช้งานแล้ว'); }
};
