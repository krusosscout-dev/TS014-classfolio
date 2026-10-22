function nameCell(s) { return `<span class="nm1">${esc([s.prefix, s.first].filter(Boolean).join(''))}</span> <span class="nm2">${esc(s.last || '')}</span>`; }
/* สมุดวัดผล ปพ.5 · หน้าจอแต่ละเมนูของรายวิชา */

function checkPages(c) {
  const st = S.settings, studs = Calc.activeStudents(c);
  const units = c.units || [];
  const midSum = units.filter(u => !u.isFinal).reduce((a, u) => a + (Number(u.weight) || 0), 0);
  const tot = units.reduce((a, u) => a + (Number(u.weight) || 0), 0);
  const res = studs.map(s => Calc.studentResult(c, s.id, st));
  const missingStu = res.filter(r => r.missing.length).length;
  const assessDone = k => studs.filter(s => { const v = (c[k] || {})[s.id] || []; return ASSESS[k].items.every((_, i) => v[i] !== undefined && v[i] !== '' && v[i] !== null); }).length;
  const needFix = res.filter(r => ['0', 'ร', 'มส'].includes(r.grade));
  const fixed = needFix.filter((r, i) => { const s = studs[res.indexOf(r)]; return ((c.remedial || {})[s.id] || {}).grade; }).length;
  const P = [];
  const add = (key, name, ok, hint, tab) => P.push({ key, name, ok, hint, tab });
  add('1', 'ปก', !!(c.code && c.name && c.teacher && st.signers.some(x => x.name)), c.code && c.name ? 'ใส่ชื่อผู้ลงนามที่ตั้งค่า' : 'ใส่ข้อมูลรายวิชา', c.code && c.name ? 'settings' : 'structure');
  add('2', 'คำอธิบายรายวิชา', String(c.descHtml || '').replace(/<[^>]+>/g, '').trim().length > 20, 'ยังไม่ได้พิมพ์', 'desc');
  add('3', 'โครงสร้างรายวิชา', units.length > 1 && tot === 100 && midSum === Number(c.ratio.mid), tot !== 100 ? 'คะแนนรวม ' + tot + '/100' : 'ระหว่างเรียนไม่ตรง ' + c.ratio.mid, 'structure');
  const noTask = units.filter(u => !Calc.unitTasks(c, u.id).length).length;
  add('3.1', 'คะแนนย่อย', !!studs.length && !noTask, noTask ? noTask + ' หน่วยยังไม่มีงาน' : 'ยังไม่มีนักเรียน', 'book');
  add('4', 'เวลาเรียน', Number(c.hours) > 0 && !!studs.length, 'ใส่ชั่วโมงเรียน', 'att');
  add('5', 'ผลการเรียน', !!studs.length && !missingStu, missingStu + ' คนมีงานค้าง', 'book');
  ['attr', 'rtw', 'comp'].forEach((k, i) => { const d = assessDone(k); add(String(6 + i), ['คุณลักษณะ', 'อ่าน คิด เขียน', 'สมรรถนะ'][i], !!studs.length && d === studs.length, 'ประเมินแล้ว ' + d + '/' + studs.length, 'assess'); });
  add('9', 'สรุปผล', !!studs.length && !missingStu, 'รอผลการเรียนครบ', 'results');
  add('10', 'แก้ผลการเรียน', fixed === needFix.length, (needFix.length - fixed) + ' คนรอแก้', 'results');
  return P;
}

/* งานที่เริ่มเก็บแล้ว (มีคนได้คะแนน หรือเลยกำหนดส่ง) ใช้นับงานค้างในหน้าแรก เพื่อให้ภาคเรียนใหม่ไม่ขึ้นเตือนทั้งห้อง */
function startedTasks(c) {
  const today = dateId();
  return new Set((c.tasks || []).filter(t => (t.due && t.due < today) || Object.values(c.scores[t.id] || {}).some(v => Calc.num(v) !== null)).map(t => t.id));
}
function risksOf(c) {
  const st = S.settings, started = startedTasks(c);
  return Calc.activeStudents(c).map(s => {
    const r0 = Calc.studentResult(c, s.id, st);
    const any = r0.units.some(x => x.hasAny);
    const r = Object.assign({}, r0, { missing: r0.missing.filter(id => started.has(id)), failedUnits: r0.units.filter(x => x.pass === false && x.hasAny).map(x => x.unit), projected: any ? r0.projected : null });
    const why = [];
    if (!r.att.pass) why.push(['bad', 'เวลาเรียน ' + r.att.pct.toFixed(1) + '%']);
    else if (r.att.early) why.push(['bad', 'มาเรียน ' + r.att.came + '/' + r.att.taught + ' คาบ (' + Math.round(r.att.sesPct) + '%)']);
    else if (r.att.pct < Number(st.minAtt) + 5) why.push(['warn', 'เวลาเรียนใกล้เกณฑ์ ' + r.att.pct.toFixed(1) + '%']);
    if (r.missing.length) why.push([r.missing.length >= 2 ? 'bad' : 'warn', 'งานค้าง ' + r.missing.length + ' ชิ้น']);
    if (['0', '1'].includes(r.projected)) why.push(['bad', 'แนวโน้มเกรด ' + r.projected]);
    if (r.failedUnits.length) why.push(['warn', 'ไม่ผ่านเกณฑ์ ' + r.failedUnits.length + ' หน่วย']);
    return { s, r, why };
  }).filter(x => x.why.length).sort((a, b) => b.why.filter(w => w[0] === 'bad').length - a.why.filter(w => w[0] === 'bad').length);
}

/* ---------------- ส่วนประกอบร่วม ---------------- */
const GRADE_COLORS = { '4': 'var(--h-green)', '3.5': 'var(--h-green)', '3': 'var(--h-teal)', '2.5': 'var(--h-teal)', '2': 'var(--h-blue)', '1.5': 'var(--h-blue)', '1': 'var(--h-amber)', '0': 'var(--h-rose)', 'ร': 'var(--h-rose)', 'มส': 'var(--h-rose)' };
function statTile(label, value, unit, icon, hue, solid) {
  return `<div class="stat${solid ? ' solid' : ''}" data-hue="${hue}"><small>${label}</small><b>${value}${unit ? `<span>${unit}</span>` : ''}</b><span class="sico">${ico(icon)}</span></div>`;
}
function ring(done, total, color) {
  const r = 30, L = 2 * Math.PI * r, f = total ? done / total : 0;
  return `<div class="ring"><svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="${r}" fill="none" stroke="var(--panel-2)" stroke-width="7"/><circle cx="35" cy="35" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(L * f).toFixed(1)} ${L.toFixed(1)}"/></svg><b>${done}/${total}</b><small>หน้า ปพ.5</small></div>`;
}
function distHtml(sm) {
  const G = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'];
  const max = Math.max(1, ...G.map(k => sm.counts[k]));
  return `<div class="dist">${G.map(k => `<div class="dist-row"><b>${k}</b><div class="dist-bar"><i style="width:${sm.counts[k] / max * 100}%;--gc:${GRADE_COLORS[k]}"></i></div><span>${sm.counts[k]}</span></div>`).join('')}</div>`;
}

/* ---------------- หน้าแรก ---------------- */
function viewHome() {
  const st = S.settings;
  const list = activeCourses().sort((a, b) => (b.year - a.year) || thColl.compare(a.code, b.code));
  let studs = 0, pend = 0, ready = 0;
  const cards = list.map(c => {
    const sm = Calc.summary(c, st), pg = checkPages(c), done = pg.filter(p => p.ok).length;
    const stt = startedTasks(c), p = sm.rows.filter(x => x.r.missing.some(id => stt.has(id))).length;
    studs += sm.n; pend += p; if (done === pg.length) ready++;
    const color = levelOfCourse(c) === 'ป' ? 'var(--h-teal)' : 'var(--h-indigo)';
    return `<article class="ccard ${lvClass(c)}">
      <button class="ccard-top" data-act="go" data-v="${c.id}|overview"><b>${esc(c.code)} ${esc(c.name)}</b><small>ชั้น ${esc(classOf(c))} · ${esc(termLabel(c))}${c.demo ? ' · ตัวอย่าง' : ''}</small><span class="lvtag">ปพ.5 ${levelOfCourse(c)}</span></button>
      <div class="ccard-body">${ring(done, pg.length, color)}<div class="mini"><div><b>${sm.n}</b><span>นักเรียน</span></div><div><b>${sm.meanTotal === null ? '–' : Math.round(sm.meanTotal)}</b><span>เฉลี่ย</span></div><div><b style="color:${p ? 'var(--warn)' : 'var(--ok)'}">${p}</b><span>งานค้าง</span></div></div></div>
      <div class="ccard-foot"><button data-act="go" data-v="${c.id}|book">${ico('book')} คะแนน</button><button data-act="go" data-v="${c.id}|results">${ico('check')} ตัดเกรด</button><button data-act="go" data-v="${c.id}|print">${ico('print')} ปพ.5</button></div>
    </article>`;
  }).join('');
  const risks = [];
  list.forEach(c => risksOf(c).forEach(x => { if (x.why.some(w => w[0] === 'bad')) risks.push(Object.assign({ c }, x)); }));
  const feed = [];
  list.forEach(c => (c.log || []).forEach(l => feed.push({ c, l })));
  feed.sort((a, b) => b.l.t - a.l.t);
  const first = String(st.teacher || '').split(' ')[0];
  const h = new Date().getHours();
  const greet = h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  return `
  <section class="hero">
    <div><small>${esc(thaiDate(new Date()))} · ClassFolio</small><h1>${greet}${first ? ' ครู' + esc(first) : ''}</h1><p>${list.length ? `มี ${list.length} รายวิชา ${pend ? `· นักเรียนที่ยังมีงานค้าง ${pend} คน` : '· ไม่มีงานค้าง'}` : 'เริ่มต้นด้วยการสร้างรายวิชาแรก แล้ววางรายชื่อนักเรียนจาก Excel'}</p></div>
    <div class="row">${list.length ? `<button class="btn pri" data-act="live">${ico('live')} เปิด Live Class</button><button class="btn" data-act="newCourse">${ico('plus')} สร้างรายวิชา</button><button class="btn" data-act="newTerm">${ico('calendar')} เริ่มภาคเรียนใหม่</button>` : `<button class="btn pri" data-act="newCourse">${ico('plus')} สร้างรายวิชาแรก</button>`}</div>
  </section>
  ${Store.mode === 'local' ? localBanner() : ''}
  <div class="stats">
    ${statTile('รายวิชา', list.length, 'วิชา', 'book', 'indigo', true)}
    ${statTile('นักเรียนทั้งหมด', studs, 'คน', 'users', 'teal')}
    ${statTile('มีงานค้าง', pend, 'คน', 'alert', 'amber')}
    ${statTile('ปพ.5 พร้อมพิมพ์', ready + '/' + list.length, 'วิชา', 'print', 'rose')}
  </div>
  <div class="grid2">${todayCard()}${dueCard()}</div>
  <div class="card-h" style="margin:4px 0 -6px"><h2>รายวิชาของฉัน</h2></div>
  <div class="courses">${cards}<button class="ccard add" data-act="newCourse">${ico('plus')}<b>สร้างรายวิชา</b><span class="small">หรือคัดลอกจากวิชาเดิม</span></button></div>
  ${archiveCard()}
  <div class="grid2">
    <div class="card"><div class="card-h"><h3>นักเรียนที่ควรติดตามด่วน</h3><span class="chip ${risks.length ? 'bad' : 'ok'}">${risks.length} คน</span></div>
      ${risks.length ? `<div class="risk">${risks.slice(0, 6).map(x => `<div class="risk-row"><span class="no">${x.s.no}</span><b>${esc(studentName(x.s))} <span class="muted small">· ${esc(x.c.code)} ${esc(classOf(x.c))}</span></b><div class="chips">${x.why.map(w => `<span class="chip ${w[0]}">${esc(w[1])}</span>`).join('')}</div></div>`).join('')}</div>` : '<div class="okbox">ไม่มีนักเรียนที่ต้องติดตามด่วน</div>'}
    </div>
    <div class="card"><div class="card-h"><h3>ทำอะไรไปล่าสุด</h3></div>
      ${feed.length ? `<div class="feed">${feed.slice(0, 8).map(x => `<div class="feed-row ${lvClass(x.c)}"><span class="dotc"></span><span>${esc(x.l.text)} <span class="muted">· ${esc(x.c.code)}</span></span><span class="note">${esc(timeAgo(x.l.t))}</span></div>`).join('')}</div>` : '<p class="note">ยังไม่มีความเคลื่อนไหว</p>'}
    </div>
  </div>`;
}

/* ---------------- ภาพรวมวิชา ---------------- */
function viewOverview(c) {
  const st = S.settings, sm = Calc.summary(c, st);
  const pages = checkPages(c), done = pages.filter(p => p.ok).length;
  const risks = risksOf(c);
  const pending = sm.rows.filter(x => x.r.missing.length).length;
  return `
  ${c.demo ? `<div class="banner">${ico('alert')}<span><b>ข้อมูลตัวอย่าง</b> ชื่อนักเรียนและคะแนนเป็นข้อมูลสมมุติ ลบได้ที่ ตั้งค่า › ข้อมูล</span></div>` : ''}
  <section class="course-hero">
    <div><h2>ความพร้อมของเล่ม ปพ.5 · ${done} จาก ${pages.length} หน้า</h2><p>${done === pages.length ? 'ครบทุกหน้าแล้ว พิมพ์เล่มได้เลย' : 'แตะหน้าที่เป็นสีส้มด้านล่างเพื่อไปเติมให้ครบ'}</p><div class="progress"><i style="width:${done / pages.length * 100}%"></i></div></div>
    <div class="row"><button class="btn pri" data-act="tab" data-v="book" style="background:#fff;color:var(--side);border-color:#fff">${ico('book')} สมุดคะแนน</button><button class="btn" data-act="tab" data-v="print" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff">${ico('print')} ดูเล่ม ปพ.5</button></div>
  </section>
  <div class="stats">
    ${statTile('นักเรียน', sm.n, 'คน', 'users', 'teal', true)}
    ${statTile('คะแนนเฉลี่ย', sm.meanTotal === null ? '–' : Math.round(sm.meanTotal), 'จาก 100', 'target', 'blue')}
    ${statTile('ระดับผลการเรียนเฉลี่ย', sm.gpa === null ? '–' : sm.gpa.toFixed(2), '', 'star', 'violet')}
    ${statTile('มีงานค้าง', pending, 'คน', 'alert', 'amber')}
  </div>
  <div class="card">
    <div class="card-h"><h3>รายการตรวจความครบถ้วนทีละหน้า</h3><span class="chip ${done === pages.length ? 'ok' : 'warn'}">${done === pages.length ? 'ครบทุกหน้า' : 'ครบ ' + done + '/' + pages.length + ' · เหลือ ' + (pages.length - done) + ' หน้า'}</span></div>
    <div class="pt-bar" aria-hidden="true">${pages.map(p => `<i class="${p.ok ? 'ok' : ''}" title="หน้า ${p.key}"></i>`).join('')}</div>
    <div class="board">${pages.map(p => `<button class="page-tile ${p.ok ? 'is-ok' : 'is-need'}" data-act="${p.tab === 'settings' ? 'settings' : 'tab'}" data-v="${p.tab}" aria-label="หน้า ${p.key} ${esc(p.name)} ${p.ok ? 'ครบแล้ว' : esc(p.hint)}">
      <span class="pt-ic">${p.ok ? ico('check') : esc(p.key)}</span>
      <span class="pt-tx"><small>หน้า ${p.key}</small><b>${p.name}</b><span class="st">${p.ok ? 'ครบแล้ว' : esc(p.hint)}</span></span>
      ${p.ok ? '' : `<span class="pt-go">${ico('chev')}</span>`}</button>`).join('')}</div>
  </div>
  <div class="grid2">
    <div class="card"><div class="card-h"><h3>การกระจายระดับผลการเรียน</h3></div>${distHtml(sm)}<p class="note" style="margin-top:10px">ร = ยังมีงานค้าง · มส = เวลาเรียนไม่ถึง ${esc(st.minAtt)}%</p></div>
    <div class="card">
      <div class="card-h"><h3>นักเรียนที่ควรติดตาม</h3><span class="chip ${risks.length ? 'warn' : 'ok'}">${risks.length} คน</span></div>
      ${risks.length ? `<div class="risk">${risks.slice(0, 7).map(x => `<div class="risk-row"><span class="no">${x.s.no}</span><b>${esc(studentName(x.s))}</b><div class="chips">${x.why.map(w => `<span class="chip ${w[0]}">${esc(w[1])}</span>`).join('')}</div></div>`).join('')}</div>${risks.length > 7 ? `<button class="btn sm ghost" data-act="tab" data-v="results" style="margin-top:8px">ดูทั้งหมด ${risks.length} คน</button>` : ''}` : `<div class="okbox">ไม่มีนักเรียนกลุ่มเสี่ยงในตอนนี้</div>`}
    </div>
  </div>`;
}

/* ---------------- สมุดคะแนน ---------------- */
function bookColumns(c) {
  const cols = [];
  (c.units || []).forEach(u => Calc.unitTasks(c, u.id).forEach(t => cols.push({ t, u })));
  return cols;
}
function viewBook(c) {
  const studs = Calc.activeStudents(c);
  const cols = bookColumns(c);
  const units = c.units || [];
  if (!studs.length) return `<div class="card empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3><p>เพิ่มหรือวางรายชื่อจาก Excel ก่อน แล้วจึงกรอกคะแนน</p><button class="btn pri" data-act="tab" data-v="students">${ico('users')} ไปที่รายชื่อนักเรียน</button></div>`;
  const spans = []; cols.forEach(cl => { const l = spans[spans.length - 1]; if (l && l.u === cl.u) l.n++; else spans.push({ u: cl.u, n: 1 }); });
  const rm = S.settings.rounding;
  const head1 = `<tr><th class="sticky-l" rowspan="2">เลขที่</th><th class="sticky-l2" rowspan="2">ชื่อ - สกุล</th>${spans.map(sp => `<th class="unit-h" data-hue="${sp.u.isFinal ? 'rose' : sp.u.isMid ? 'amber' : ['blue', 'violet', 'teal', 'amber', 'pink', 'cyan', 'green'][units.indexOf(sp.u) % 7]}" colspan="${sp.n}">${esc(sp.u.isFinal || sp.u.isMid ? sp.u.name : unitTag(c, sp.u, 'long') + ' · ' + sp.u.name)}</th>`).join('')}<th class="unit-h" data-hue="indigo" colspan="${units.length + 2}">แปลงเป็นคะแนน ปพ.5 (จำนวนเต็ม)</th><th rowspan="2">ระดับ</th></tr>`;
  const head2 = `<tr>${cols.map(({ t }) => `<th class="task-h" data-act="task" data-v="${t.id}" title="${esc(t.name)} · คลิกเพื่อแก้ไข"><span class="tn">${esc(t.name)}</span><span class="sub">${t.auto === 'bonus' ? '<span class="bonus">จาก Live Class</span>' : (t.bonus ? '<span class="bonus">+พิเศษ</span> ' : '') + 'เต็ม ' + esc(t.full)}${t.due ? '<br>ส่ง ' + esc(thaiDate(t.due).split(' ').slice(0, 2).join(' ')) : ''}</span></th>`).join('')}${units.map(u => `<th>${unitTag(c, u, 'short')}<span class="sub">${esc(u.weight)}</span></th>`).join('')}<th>ระหว่าง<span class="sub">${esc(c.ratio.mid)}</span></th><th>รวม<span class="sub">100</span></th></tr>`;
  const rows = studs.map((s, r) => {
    const cells = cols.map(({ t }, ci) => {
      const v = (c.scores[t.id] || {})[s.id];
      const blank = v === '' || v === undefined || v === null;
      const over = !blank && Number(v) > Number(t.full);
      return `<td class="${blank && !t.bonus ? 'blank' : ''}${over ? ' over' : ''}"><input class="cell" data-sc="${t.id}|${s.id}" data-r="${r}" data-c="${ci}" value="${blank ? '' : esc(v)}" ${t.auto === 'bonus' ? 'readonly title="รวมจาก Live Class อัตโนมัติ"' : ''} inputmode="decimal" aria-label="${esc(t.name)} ${esc(studentName(s))}"></td>`;
    }).join('');
    return `<tr data-row="${s.id}"><td class="sticky-l n">${s.no}</td><td class="sticky-l2">${nameCell(s)}</td>${cells}${calcCells(c, s.id, rm)}</tr>`;
  }).join('');
  const foot = `<tr><td class="sticky-l"></td><td class="sticky-l2 muted">ค่าเฉลี่ย</td>${cols.map(({ t }) => `<td class="n muted" data-avg="${t.id}">${avgTask(c, t)}</td>`).join('')}<td colspan="${units.length + 3}"></td></tr>`;
  return `
  <div class="card bar">
    <div class="row">
      <button class="btn pri" data-act="addTask">${ico('plus')} เพิ่มงาน/คะแนน</button>
      <span class="chip acc">${c.convert === 'weighted' ? 'แปลงตามน้ำหนักรายงาน' : 'แปลงตามสัดส่วนคะแนนรวม'}</span>
      <span class="note">คลิกหัวคอลัมน์เพื่อแก้ไขงาน · ลูกศร/Enter เลื่อนช่อง · วางคะแนนจาก Excel ได้ทั้งคอลัมน์ · ช่องสีส้ม = ยังไม่มีคะแนน</span>
    </div>
  </div>
  ${cols.length ? `<div class="tbl-wrap"><table class="tbl" id="bookTbl"><thead>${head1}${head2}</thead><tbody>${rows}</tbody><tfoot>${foot}</tfoot></table></div>` : `<div class="card empty"><h3>ยังไม่มีงานในสมุดคะแนน</h3><p>เพิ่มงานแต่ละชิ้นพร้อมคะแนนเต็มจริง เช่น ใบงาน 20 คะแนน ระบบจะแปลงเข้าหน่วยให้เอง</p><button class="btn pri" data-act="addTask">${ico('plus')} เพิ่มงานชิ้นแรก</button></div>`}`;
}
function calcCells(c, sid, rm) {
  const r = Calc.studentResult(c, sid, S.settings);
  return r.units.map(x => `<td class="calc${x.pass === false ? ' fail' : ''}" data-cc="${x.unit.id}">${Calc.fmt(x.score, rm)}</td>`).join('') +
    `<td class="calc" data-cc="mid">${Calc.fmt(r.mid, rm)}</td><td class="calc" data-cc="total">${Calc.fmt(r.total, rm)}</td><td class="grade g-${r.grade}" data-cc="grade" title="${r.grade === 'ร' ? 'งานค้าง ' + r.missing.length + ' ชิ้น · ถ้าคิดตามคะแนนที่มีได้ ' + r.projected : ''}">${r.grade}</td>`;
}
function avgTask(c, t) {
  const v = Calc.activeStudents(c).map(s => Calc.num((c.scores[t.id] || {})[s.id])).filter(x => x !== null);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '';
}
function updateBookRow(c, sid) {
  const tr = document.querySelector(`tr[data-row="${sid}"]`);
  if (!tr) return;
  const rm = S.settings.rounding;
  const r = Calc.studentResult(c, sid, S.settings);
  r.units.forEach(x => { const td = tr.querySelector(`[data-cc="${x.unit.id}"]`); if (td) { td.textContent = Calc.fmt(x.score, rm); td.classList.toggle('fail', x.pass === false); } });
  const set = (k, v) => { const td = tr.querySelector(`[data-cc="${k}"]`); if (td) td.textContent = v; };
  set('mid', Calc.fmt(r.mid, rm)); set('total', Calc.fmt(r.total, rm));
  const g = tr.querySelector('[data-cc="grade"]'); if (g) { g.textContent = r.grade; g.className = 'grade g-' + r.grade; }
}

/* ---------------- โครงสร้างรายวิชา ---------------- */
function viewStructure(c) {
  const units = c.units || [];
  const mids = units.filter(u => !u.isFinal);
  const midSum = mids.reduce((a, u) => a + (Number(u.weight) || 0), 0);
  const ratioOk = Number(c.ratio.mid) + Number(c.ratio.final) === 100;
  const lv = levelOfCourse(c);
  const fld = (k, label, type, extra) => `<label class="field"><span>${label}</span><input class="inp" data-f="${k}" type="${type || 'text'}" value="${esc(c[k])}" ${extra || ''}></label>`;
  return `
  <div class="card">
    <div class="card-h"><h2>ข้อมูลรายวิชา</h2><span class="chip acc">ปพ.5 ${lv} · ${lv === 'ป' ? 'ประถมศึกษา ตัดสินรายปี' : 'มัธยมศึกษา ตัดสินรายภาค'}</span></div>
    <div class="form-grid">
      ${fld('code', 'รหัสวิชา')}${fld('name', 'ชื่อวิชา')}
      <label class="field"><span>กลุ่มสาระการเรียนรู้</span><select class="inp" data-f="group">${GROUPS.concat(['กิจกรรมพัฒนาผู้เรียน']).map(g => `<option ${g === c.group ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <label class="field"><span>ประเภทวิชา</span><select class="inp" data-f="type">${['พื้นฐาน', 'เพิ่มเติม'].map(g => `<option ${g === c.type ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      ${fld('grade', 'ชั้น (เช่น ม.1, ป.6)')}${fld('room', 'ห้อง (เว้นว่างได้ ถ้ามีห้องเดียว)', 'text', 'placeholder="เช่น 1"')}${fld('year', 'ปีการศึกษา', 'number')}
      <label class="field"><span>ภาคเรียน</span><select class="inp" data-f="term">${[['1', 'ภาคเรียนที่ 1'], ['2', 'ภาคเรียนที่ 2'], ['ปี', 'ทั้งปี (ประถม)']].map(([v, l]) => `<option value="${v}" ${v === String(c.term) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${fld('hours', 'เวลาเรียน (ชั่วโมง)', 'number', 'min="0"')}${lv === 'ต' ? fld('credits', 'หน่วยกิต', 'number', 'step="0.5" min="0"') : ''}
      ${fld('teacher', 'ครูผู้สอน')}
      <label class="field"><span>แบบ ปพ.5</span><select class="inp" data-f="level">${[['auto', 'ตามรหัสวิชา'], ['ป', 'ปพ.5 ป (ประถม)'], ['ต', 'ปพ.5 ต (มัธยม)']].map(([v, l]) => `<option value="${v}" ${v === (c.level || 'auto') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
  </div>
  <div class="card">
    <div class="card-h"><h2>สัดส่วนคะแนนและการแปลงคะแนน</h2><span class="chip acc">เฉพาะรายวิชานี้</span></div>
    <div class="form-grid">
      <label class="field"><span>ระหว่างเรียน</span><input class="inp" type="number" data-ratio="mid" value="${esc(c.ratio.mid)}" min="0" max="100"></label>
      <label class="field"><span>ปลาย${lv === 'ป' ? 'ปี' : 'ภาค'}</span><input class="inp" type="number" data-ratio="final" value="${esc(c.ratio.final)}" min="0" max="100"></label>
      <div class="field wide"><span>วิธีแปลงสมุดคะแนนดิบเป็นคะแนนหน่วย</span><div class="seg"><button data-act="convert" data-v="ratio" class="${c.convert !== 'weighted' ? 'on' : ''}">ตามสัดส่วนคะแนนรวม</button><button data-act="convert" data-v="weighted" class="${c.convert === 'weighted' ? 'on' : ''}">กำหนดน้ำหนักรายงาน</button></div></div>
    </div>
    <p class="note" style="margin-top:10px">${c.convert === 'weighted' ? 'แต่ละงานมีน้ำหนักของตัวเอง เช่น สอบ 2 ส่วน ใบงาน 1 ส่วน ตั้งน้ำหนักได้ที่หัวคอลัมน์ในสมุดคะแนน' : 'รวมคะแนนดิบทุกงานในหน่วย แล้วเทียบสัดส่วนกับคะแนนหน่วย เช่น ได้ 80 จาก 100 ในหน่วยที่มี 10 คะแนน = 8'}</p>
    ${ratioOk ? '' : `<div class="badbox" style="margin-top:10px">ระหว่างเรียนกับปลายภาคต้องรวมกันได้ 100 (ตอนนี้ ${Number(c.ratio.mid) + Number(c.ratio.final)})</div>`}
  </div>
  <div class="card">
    <div class="card-h"><h2>หน่วยการเรียนรู้และน้ำหนักคะแนน</h2>
      <span class="chip ${midSum === Number(c.ratio.mid) ? 'ok' : 'warn'}">ระหว่างเรียน ${midSum}/${esc(c.ratio.mid)}</span>${midSum !== Number(c.ratio.mid) && mids.length ? `<button class="btn sm" data-act="fitUnits" title="คงสัดส่วนระหว่างหน่วยไว้เหมือนเดิม">${ico('bolt')} ปรับให้รวม ${esc(c.ratio.mid)} อัตโนมัติ</button>` : ''}
      <button class="btn" data-act="addUnit">${ico('plus')} เพิ่มหน่วย</button>${units.some(u => u.isMid) ? '' : `<button class="btn" data-act="addMid">${ico('plus')} เพิ่มสอบกลาง${lv === 'ป' ? 'ปี' : 'ภาค'}</button>`}</div>
    <div class="tbl-wrap flat"><table class="tbl stack unit-tbl">
      <thead><tr><th>หน่วยที่</th><th class="l">ชื่อหน่วยการเรียนรู้</th><th class="l">มาตรฐาน/ตัวชี้วัด</th><th>ชม.</th><th>คะแนน</th><th title="จำนวนช่องคะแนนย่อยในหน้า 3.1">ช่องย่อย</th><th title="เกณฑ์ผ่านของหน่วย">ผ่าน %</th><th></th></tr></thead>
      <tbody>${units.map((u, i) => `<tr>
        <td class="n st-no" data-label="หน่วยที่">${unitTag(c, u, 'long')}</td>
        <td class="wide" data-label="ชื่อหน่วยการเรียนรู้"><input class="inp t" data-u="${u.id}|name" value="${esc(u.name)}" style="min-width:200px"></td>
        <td class="wide" data-label="มาตรฐาน/ตัวชี้วัด"><textarea class="inp t" data-u="${u.id}|indicators" rows="1" style="min-width:200px;min-height:34px">${esc(u.indicators)}</textarea></td>
        <td data-label="ชั่วโมง"><input class="cell w" data-u="${u.id}|hours" value="${esc(u.hours)}" inputmode="decimal"></td>
        <td class="c" data-label="คะแนน">${u.isFinal ? `<span class="cell-fixed" title="เท่ากับสัดส่วนปลาย${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} แก้ได้ที่ช่องสัดส่วนด้านบน">${esc(c.ratio.final)}</span>` : `<input class="cell w" data-u="${u.id}|weight" value="${esc(u.weight)}" inputmode="decimal">`}</td>
        <td data-label="ช่องย่อย">${u.isFinal ? '' : `<input class="cell w" data-u="${u.id}|slots" value="${u.slots || ''}" placeholder="${Math.min(Calc.unitTasks(c, u.id).length, 10) || 1}" inputmode="numeric">`}</td>
        <td data-label="ผ่าน %"><input class="cell w" data-u="${u.id}|minPct" value="${u.minPct ?? ''}" placeholder="${esc(S.settings.minPct)}" inputmode="decimal"></td>
        <td class="st-del" style="white-space:nowrap">${u.isFinal ? '' : `<button class="btn sm ghost" data-act="unitUp" data-v="${u.id}" aria-label="เลื่อนขึ้น">↑</button><button class="btn sm ghost danger" data-act="delUnit" data-v="${u.id}" aria-label="ลบหน่วย">${ico('trash')}</button>`}</td>
      </tr>`).join('')}</tbody></table></div>
    <p class="note" style="margin-top:8px">ช่องย่อย = จำนวนช่องคะแนนในหน้า 3.1 (1–10) เว้นว่างให้ระบบใช้ตามจำนวนงาน · ผ่าน % เว้นว่างใช้เกณฑ์กลาง ${esc(S.settings.minPct)}%</p>
  </div>
  <div class="card">
    <div class="card-h"><h3>จัดการรายวิชา</h3></div>
    <div class="row"><button class="btn" data-act="dupCourse">${ico('copy')} คัดลอกเป็นรายวิชาใหม่</button>${c.archived ? `<button class="btn" data-act="unarchive">${ico('undo')} นำกลับมาใช้งาน</button>` : `<button class="btn" data-act="newTerm">${ico('calendar')} เริ่มภาคเรียนใหม่</button><button class="btn" data-act="archive">${ico('book')} ย้ายเข้าคลังภาคเรียนเก่า</button>`}<button class="btn danger" data-act="delCourse">${ico('trash')} ลบรายวิชานี้</button></div>
  </div>`;
}

/* ---------------- คำอธิบายรายวิชา ---------------- */
function viewDesc(c) {
  const tpl = S.settings.templates || [];
  return `
  <div class="card" style="padding:0;border:0;background:none">
    <div class="toolbar" role="toolbar" aria-label="จัดรูปแบบข้อความ">
      <select id="edFont" aria-label="แบบอักษร">${FONTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <select id="edSize" aria-label="ขนาดตัวอักษร">${[12, 14, 16, 18, 20, 24, 28].map(s => `<option value="${s}" ${s === 16 ? 'selected' : ''}>${s} pt</option>`).join('')}</select>
      <input type="color" id="edColor" value="#111111" aria-label="สีตัวอักษร">
      <span class="tb-sep"></span>
      <button class="tb" data-ed="bold" title="ตัวหนา"><b>B</b></button><button class="tb" data-ed="italic" title="ตัวเอียง"><i>I</i></button><button class="tb" data-ed="underline" title="ขีดเส้นใต้"><u>U</u></button>
      <span class="tb-sep"></span>
      <button class="tb" data-ed="justifyLeft" title="ชิดซ้าย">⫷</button><button class="tb" data-ed="justifyCenter" title="กึ่งกลาง">≡</button><button class="tb" data-ed="justifyRight" title="ชิดขวา">⫸</button><button class="tb" data-ed="justifyFull" title="กระจายเต็มบรรทัด">☰</button>
      <span class="tb-sep"></span>
      <button class="tb" data-ed="indent" title="ย่อหน้า">⇥</button><button class="tb" data-ed="insertUnorderedList" title="รายการ">•</button><button class="tb" data-ed="removeFormat" title="ล้างรูปแบบ">⌫</button>
      <span class="tb-sep"></span>
      <label class="small muted">ระยะบรรทัด <select id="edLine">${[1.2, 1.35, 1.5, 1.75, 2].map(v => `<option ${Number(c.descLine) === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="tb-lbl">ขนาดทั้งหน้า <select id="edPage">${[14, 15, 16, 18, 20].map(v => `<option value="${v}" ${(Number(c.descSize) || 16) === v ? 'selected' : ''}>${v} pt</option>`).join('')}</select></label>
      <label class="small muted">ฟอนต์ทั้งหน้า <select id="edBase">${FONTS.map(([v, l]) => `<option value="${v}" ${c.descFont === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    <div class="paper-wrap"><div class="paper" id="paper" contenteditable="true" spellcheck="false" style="font-family:'${esc(c.descFont || 'THSarabunPSK')}','THSarabunPSK',Sarabun,sans-serif;line-height:${Number(c.descLine) || 1.35};font-size:${Number(c.descSize) || 16}pt">${c.descHtml || '<p style="text-align:center"><b>คำอธิบายรายวิชา</b></p><p><br></p>'}</div>
      ${String(c.indicators || '').trim() && c.showInd !== false ? `<div class="paper paper-ind" style="font-family:'${esc(c.descFont || 'THSarabunPSK')}','THSarabunPSK',Sarabun,sans-serif;line-height:${Number(c.descLine) || 1.35};font-size:${Number(c.descSize) || 16}pt"><div class="desc-ind"><p><b>ตัวชี้วัด</b></p>${String(c.indicators).split('\n').filter(x => x.trim()).map(x => `<p>${esc(x)}</p>`).join('')}</div></div>` : ''}
      <p class="paper-note">ตัวชี้วัดดึงจากกล่องด้านล่าง พิมพ์ต่อท้ายคำอธิบายในหน้าเดียวกันด้วยฟอนต์และขนาดเดียวกัน</p></div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="card-h"><h3>ต้นแบบคำอธิบายรายวิชา</h3></div>
      <div class="row"><input class="inp" id="tplName" placeholder="ตั้งชื่อต้นแบบ เช่น สังคม ม.1 ภาค 1" style="flex:1;min-width:180px"><button class="btn" data-act="saveTpl">บันทึกเป็นต้นแบบ</button></div>
      ${tpl.length ? `<div style="display:grid;gap:6px;margin-top:12px">${tpl.map((t, i) => `<div class="row" style="justify-content:space-between;border:1px solid var(--line);border-radius:8px;padding:6px 10px"><span>${esc(t.name)}</span><span class="row"><button class="btn sm" data-act="useTpl" data-v="${i}">ใช้ต้นแบบนี้</button><button class="btn sm ghost danger" data-act="delTpl" data-v="${i}" aria-label="ลบต้นแบบ">${ico('trash')}</button></span></div>`).join('')}</div>` : '<p class="note" style="margin-top:10px">ยังไม่มีต้นแบบ บันทึกหน้าที่จัดรูปแบบแล้วไว้ใช้กับรายวิชาอื่นได้</p>'}
    </div>
    <div class="card">
      <div class="card-h"><h3>ตัวชี้วัด</h3><span class="note">บรรทัดละ 1 รายการ</span><label class="row small" style="flex-wrap:nowrap"><input type="checkbox" id="edShowInd" ${c.showInd !== false ? 'checked' : ''}> พิมพ์ในหน้า 2</label></div>
      <textarea class="inp" data-f="indicators" rows="7">${esc(c.indicators)}</textarea>
    </div>
  </div>`;
}

/* ---------------- นักเรียน ---------------- */
function viewStudents(c) {
  const all = (c.students || []).slice().sort((a, b) => (a.status === 'out') - (b.status === 'out') || (a.no || 0) - (b.no || 0));
  const out = all.filter(s => s.status === 'out').length;
  return `
  <div class="card bar"><div class="row">
    <button class="btn pri" data-act="importStu">${ico('upload')} วางรายชื่อจาก Excel</button>
    <button class="btn" data-act="addStu">${ico('plus')} เพิ่มทีละคน</button>
    <button class="btn" data-act="renumber">${ico('sort')} จัดเลขที่ใหม่</button>
    ${(() => { const k = rosterFor(c); return k && k.students.length ? `<button class="btn" data-act="rosterSync" data-v="${c.id}">${ico('download')} ดึงรายชื่อจากทะเบียน ${esc(classOf(k))}</button>` : Calc.activeStudents(c).length ? `<button class="btn ghost" data-act="rosterFromCourse" title="เก็บไว้ใช้กับรายวิชาอื่นของชั้นนี้">${ico('upload')} บันทึกรายชื่อนี้เข้าทะเบียน</button>` : ''; })()}
    <span class="note">${Calc.activeStudents(c).length} คนกำลังเรียน${out ? ' · ย้ายออก ' + out + ' คน (ไม่แสดงใน ปพ.5)' : ''}</span>
  </div></div>
  ${splitBanner(needSplit(Calc.activeStudents(c)).length, 'courseSplit', '')}
  ${all.length ? `<div class="tbl-wrap"><table class="tbl stack stu-tbl"><thead><tr><th>เลขที่</th><th class="l">เลขประจำตัว</th><th class="l">คำนำหน้า</th><th class="l">ชื่อ</th><th class="l">นามสกุล</th><th class="l">สถานะ</th><th></th></tr></thead><tbody>
    ${all.map(s => `<tr style="${s.status === 'out' ? 'opacity:.55' : ''}">
      <td class="n st-no" data-label="เลขที่">${s.status === 'out' ? '–' : s.no}</td>
      <td data-label="เลขประจำตัว"><input class="inp t" inputmode="numeric" data-st="${s.id}|code" value="${esc(s.code)}" style="width:110px"></td>
      <td data-label="คำนำหน้า"><input class="inp t" data-st="${s.id}|prefix" value="${esc(s.prefix)}" list="prefixList" style="width:90px"></td>
      <td data-label="ชื่อ"><input class="inp t" data-st="${s.id}|first" value="${esc(s.first)}" style="width:150px"></td>
      <td data-label="นามสกุล"><input class="inp t" data-st="${s.id}|last" value="${esc(s.last)}" style="width:150px"></td>
      <td class="st-status" data-label="สถานะ">${s.status === 'out' ? `<span class="chip warn">ย้ายออก</span> <button class="btn sm ghost" data-act="stuIn" data-v="${s.id}">กลับเข้าเรียน</button>` : `<span class="chip ok">กำลังเรียน</span> <button class="btn sm ghost" data-act="stuOut" data-v="${s.id}">ย้ายออก</button>`}</td>
      <td class="st-del"><button class="btn sm ghost danger" data-act="delStu" data-v="${s.id}" aria-label="ลบ">${ico('trash')}</button></td></tr>`).join('')}
  </tbody></table></div><datalist id="prefixList">${PREFIXES.map(p => `<option value="${p}">`).join('')}</datalist>` : `<div class="card empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3><p>คัดลอกคอลัมน์ เลขประจำตัว คำนำหน้า ชื่อ นามสกุล จาก Excel หรือ Google Sheet แล้ววางได้ทันที</p><button class="btn pri" data-act="importStu">${ico('upload')} วางรายชื่อ</button></div>`}`;
}

/* ---------------- เวลาเรียน ---------------- */
function sesChip(a) {
  if (!a.taught) return '<span class="muted">–</span>';
  const min = Number(S.settings.minAtt || 80), cls = a.early ? 'bad' : a.sesPct < min + 10 ? 'warn' : 'ok';
  return `<span class="chip ${cls}" title="มาเรียน ${a.came} จาก ${a.taught} คาบที่สอนแล้ว">${a.came}/${a.taught} · ${Math.round(a.sesPct)}%</span>`;
}
function viewAtt(c) {
  const studs = Calc.activeStudents(c);
  const st = S.settings, nSes = (c.sessions || []).length;
  return `
  <div class="card bar"><div class="row">
    <label class="field" style="width:200px"><span>เวลาเรียนทั้ง${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} (ชั่วโมง)</span><input class="inp" type="number" data-f="hours" value="${esc(c.hours)}" min="0"></label>
    <span class="note" style="flex:1;min-width:220px">ชั่วโมงขาดมาจาก Live Class อัตโนมัติ (เช็คแล้ว ${nSes} คาบ) · ขาด ลา ป่วย หนี = ไม่ได้เข้าเรียน สาย = มาเรียน · "มาแล้ว" ใช้ดูล่วงหน้าว่าใครเริ่มขาดบ่อย ส่วน มส ตัดสินจากร้อยละทั้ง${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} ต่ำกว่า ${esc(st.minAtt)}% · "ปรับเพิ่ม" ใช้กรอกชั่วโมงขาดก่อนเริ่มใช้ระบบ</span>
    ${(() => { const n = studs.filter(s => Calc.attendance(c, s.id, st).early).length; return nSes ? `<span class="chip ${n ? 'bad' : 'ok'}">${n ? `มาเรียนต่ำกว่า ${esc(st.minAtt)}% ของคาบที่สอน ${n} คน` : 'ทุกคนมาเรียนตามเกณฑ์'}</span>` : ''; })()}
    <button class="btn pri" data-act="live">${ico('check')} เช็คชื่อ Live Class</button>
    <button class="btn" data-act="printAtt">${ico('print')} พิมพ์บันทึกเวลาเรียน</button>
  </div></div>
  ${studs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="sticky-l">เลขที่</th><th class="sticky-l2">ชื่อ - สกุล</th><th>จาก Live Class<span class="sub">ชม.ขาด</span></th><th>ปรับเพิ่ม<span class="sub">ชม.ขาด</span></th><th>ขาดรวม<span class="sub">ชั่วโมง</span></th><th>มาเรียน<span class="sub">ชั่วโมง</span></th><th>ร้อยละ<span class="sub">ทั้ง${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'}</span></th><th>มาแล้ว<span class="sub">จาก ${nSes} คาบที่สอน</span></th><th>ผล</th></tr></thead><tbody>
  ${studs.map((s, r) => { const a = Calc.attendance(c, s.id, st); const det = Object.entries(a.counts).filter(([k]) => k !== 'มา').map(([k, n]) => k + ' ' + n).join(' · '); return `<tr data-row="${s.id}"><td class="sticky-l n">${s.no}</td><td class="sticky-l2">${nameCell(s)}</td>
    <td class="c" title="${esc(det)}">${a.live || ''}${det ? `<span class="sub">${esc(det)}</span>` : ''}</td>
    <td class="c"><input class="cell" data-att="${s.id}" data-r="${r}" data-c="0" value="${a.manual || ''}" placeholder="0" inputmode="decimal"></td>
    <td class="calc" data-ac="a">${a.absent}</td><td class="calc" data-ac="p">${a.present}</td><td class="calc" data-ac="pct">${a.pct.toFixed(1)}</td><td class="c">${sesChip(a)}</td><td class="c" data-ac="res">${a.pass ? '<span class="chip ok">มีสิทธิ์สอบ</span>' : '<span class="chip bad">มส</span>'}</td></tr>`; }).join('')}
  </tbody></table></div>` : `<div class="card empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3><button class="btn pri" data-act="tab" data-v="students">ไปที่รายชื่อนักเรียน</button></div>`}`;
}

/* ---------------- คุณลักษณะ / อ่านคิดเขียน / สมรรถนะ ---------------- */
function viewAssess(c) {
  const k = S.assessKind, A = ASSESS[k];
  const studs = Calc.activeStudents(c);
  return `
  <div class="card bar"><div class="row">
    <div class="seg">${Object.entries(ASSESS).map(([key, a]) => `<button data-act="assessKind" data-v="${key}" class="${key === k ? 'on' : ''}">${a.title}</button>`).join('')}</div>
    <span class="row" style="margin-left:auto"><span class="note">เติมช่องว่างทั้งหมดเป็น</span>
    <select class="inp" id="fillVal" style="width:auto"><option value="3">3 ดีเยี่ยม</option><option value="2">2 ดี</option><option value="1">1 ผ่าน</option></select>
    <button class="btn" data-act="fillAssess">เติม</button></span>
  </div><p class="note" style="margin-top:8px">กรอก 0–3 · 3 ดีเยี่ยม 2 ดี 1 ผ่าน 0 ไม่ผ่าน · สรุปผลคิดจากค่าเฉลี่ยของทุกข้อ</p></div>
  ${studs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="sticky-l">เลขที่</th><th class="sticky-l2">ชื่อ - สกุล</th>${A.items.map((x, i) => `<th class="ah" title="${esc(x)}">${esc(x.replace('ความสามารถใน', ''))}<span class="sub">ข้อ ${i + 1}</span></th>`).join('')}<th class="ah">สรุปผล</th></tr></thead><tbody>
  ${studs.map((s, r) => { const v = (c[k] || {})[s.id] || []; const l = Calc.levelFromValues(v); return `<tr data-row="${s.id}"><td class="sticky-l n">${s.no}</td><td class="sticky-l2">${nameCell(s)}</td>
    ${A.items.map((_, i) => { const x = v[i]; const blank = x === undefined || x === null || x === ''; return `<td class="c${blank ? ' blank' : ''}"><input class="cell" data-as="${k}|${s.id}|${i}" data-r="${r}" data-c="${i}" value="${blank ? '' : x}" inputmode="numeric" maxlength="1"></td>`; }).join('')}
    <td class="c" data-lv>${l === null ? '' : `<span class="chip ${l >= 2 ? 'ok' : l === 1 ? 'acc' : 'bad'}">${Calc.LEVEL_NAMES[l]}</span>`}</td></tr>`; }).join('')}
  </tbody></table></div>` : `<div class="card empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3></div>`}`;
}

/* ---------------- ตัดเกรด ---------------- */
function viewResults(c) {
  const st = S.settings, rm = st.rounding;
  const studs = Calc.activeStudents(c);
  const units = c.units || [];
  const scale = (st.scale || Calc.DEFAULT_SCALE).filter(x => x.grade !== '0');
  const finU = units.find(u => u.isFinal);
  return `
  <div class="card bar"><div class="row">
    <span class="row">${ico('target')}<span>จำลองเกรด: ต้องได้คะแนนปลายภาคเท่าไรจึงได้ระดับ</span>
    <select class="inp" id="targetSel" style="width:auto">${scale.map(x => `<option ${x.grade === S.target ? 'selected' : ''}>${x.grade}</option>`).join('')}</select></span>
    <span class="note" style="margin-left:auto">ร = ยังมีงานค้าง (กรอก 0 ถ้าไม่ส่งจริง) · มส = เวลาเรียนไม่ถึง ${esc(st.minAtt)}%</span>
    <button class="btn sm" data-act="xlsx">${ico('download')} ส่งออก Excel</button>
  </div></div>
  ${studs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="sticky-l">เลขที่</th><th class="sticky-l2">ชื่อ - สกุล</th>${units.map(u => `<th>${unitTag(c, u, 'short')}<span class="sub">${esc(u.weight)}</span></th>`).join('')}<th>ระหว่าง<span class="sub">${esc(c.ratio.mid)}</span></th><th>รวม<span class="sub">100</span></th><th>ระดับ</th><th class="l">สถานะ</th><th>ต้องได้ปลายภาค</th><th>ผลหลังแก้</th><th class="l">หมายเหตุการแก้</th></tr></thead><tbody>
  ${studs.map(s => {
    const r = Calc.studentResult(c, s.id, st);
    const need = Calc.neededFinal(c, s.id, S.target, st);
    const finTasks = finU ? Calc.unitTasks(c, finU.id) : [];
    const finDone = finTasks.length && finTasks.every(t => Calc.num((c.scores[t.id] || {})[s.id]) !== null);
    const needTxt = !need ? '–' : finDone ? '<span class="muted">สอบแล้ว</span>' : !need.possible ? '<span class="chip bad">ไม่ถึงแล้ว</span>' : `<b>${Math.ceil(need.raw)}</b> <span class="muted">/ ${need.rawFull}</span>`;
    const chips = [];
    if (!r.att.pass) chips.push('<span class="chip bad">มส ' + r.att.pct.toFixed(1) + '%</span>');
    if (r.missing.length) chips.push('<span class="chip warn">ค้าง ' + r.missing.length + ' งาน</span>');
    if (r.failedUnits.length) chips.push('<span class="chip warn">ไม่ผ่าน ' + r.failedUnits.length + ' หน่วย</span>');
    const fix = ['0', 'ร', 'มส'].includes(r.grade);
    const rem = (c.remedial || {})[s.id] || {};
    return `<tr><td class="sticky-l n">${s.no}</td><td class="sticky-l2">${nameCell(s)}</td>${r.units.map(x => `<td class="n${x.pass === false ? ' fail' : ''}">${Calc.fmt(x.score, rm)}</td>`).join('')}<td class="calc">${Calc.fmt(r.mid, rm)}</td><td class="calc">${Calc.fmt(r.total, rm)}</td><td class="grade g-${r.grade}">${r.grade}</td><td>${chips.join(' ') || '<span class="chip ok">ปกติ</span>'}</td><td class="c">${needTxt}</td>
      <td>${fix ? `<select class="inp t" data-rem="${s.id}|grade" style="width:80px"><option value=""></option>${['1', '1.5', '2', '2.5', '3', '3.5', '4'].map(g => `<option ${rem.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select>` : ''}</td>
      <td>${fix ? `<input class="inp t" data-rem="${s.id}|note" value="${esc(rem.note || '')}" placeholder="วิธีแก้ เช่น ส่งงานครบ สอบซ่อม" style="min-width:200px">` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>` : `<div class="card empty"><h3>ยังไม่มีรายชื่อนักเรียน</h3></div>`}`;
}

/* ---------------- ปพ.5 ---------------- */
function viewPrint(c) {
  const pages = S.printPages || PAGES.map(p => p[0]);
  const framed = window.self !== window.top;
  return `
  <div class="card bar" style="display:grid;gap:12px">
    <div class="page-picks">${PAGES.map(([k, n]) => `<label><input type="checkbox" data-pp="${k}" ${pages.includes(k) ? 'checked' : ''}> ${k}. ${n}</label>`).join('')}</div>
    <div class="print-ctl">
      <div class="seg"><button data-act="bw" data-v="0" class="${!S.printBW ? 'on' : ''}">สี</button><button data-act="bw" data-v="1" class="${S.printBW ? 'on' : ''}">ขาวดำ</button></div>
      <label class="small">ลายน้ำ <select class="inp" id="wmSel" style="width:auto">${[['none', 'ไม่มี'], ['draft', 'ฉบับร่าง'], ['original', 'ต้นฉบับ'], ['copy', 'สำเนา'], ['school', 'ชื่อโรงเรียน'], ['logo', 'ตราโรงเรียน']].map(([v, l]) => `<option value="${v}" ${S.watermark === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="small">วันที่บนปก <input class="inp" type="date" data-f="signDate" value="${esc(c.signDate)}" style="width:auto"></label>
      <button class="btn" data-act="xlsx" style="margin-left:auto">${ico('download')} Excel</button><button class="btn pri" data-act="doPrint">${ico('print')} พิมพ์ / บันทึก PDF</button>
    </div>
    ${framed ? '<p class="note">ปุ่มพิมพ์ทำงานเมื่อเปิดระบบจากเว็บของครูบน Vercel ในหน้าตัวอย่างนี้ดูเอกสารได้อย่างเดียว</p>' : '<p class="note">ในหน้าต่างพิมพ์ เลือกกระดาษ A4 ระยะขอบ "ไม่มี" และเปิด "กราฟิกพื้นหลัง" หน้า 3.1 จะเป็นแนวนอนอัตโนมัติ</p>'}
  </div>
  <div class="sheets" id="sheets">${Print.render(c, S.settings, { pages, bw: S.printBW, wm: S.watermark })}</div>`;
}

/* ---------------- ประวัติ ---------------- */
function viewLog(c) {
  const log = (c.log || []).slice().reverse();
  return `<div class="card"><div class="card-h"><h2>ประวัติการแก้ไข</h2><span class="note">กด Ctrl+Z เพื่อเลิกทำ · Ctrl+Y ทำซ้ำ</span></div>
  ${log.length ? `<div style="display:grid;gap:2px">${log.map(l => `<div class="row" style="padding:7px 4px;border-bottom:1px solid var(--line)"><span style="flex:1;min-width:200px">${esc(l.text)}</span><span class="note">${esc(timeAgo(l.t))}</span></div>`).join('')}</div>` : '<p class="note">ยังไม่มีประวัติ</p>'}</div>`;
}
