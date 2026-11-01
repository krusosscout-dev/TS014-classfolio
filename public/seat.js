/* ClassFolio · ผังห้องเรียน (ที่นั่งของนักเรียน) ใช้ร่วมกันทุกรายวิชาของห้องเดียวกัน
   settings.seats = { 'ม.1/1': { rows, cols, map: { 'r-c': { id, code } } } }  r,c เริ่มที่ 1 · แถว 1 = แถวหน้าสุด (ใกล้โต๊ะครู) */
function seatKey(c) { return classOf(c) || c.id; }
function seatPlan(c) { const all = S.settings.seats || {}; return all[seatKey(c)] || null; }
function seatStudentAt(c, cell) {
  if (!cell) return null;
  const studs = Calc.activeStudents(c);
  return studs.find(s => s.id === cell.id) || (cell.code ? studs.find(s => s.code && s.code === cell.code) : null) || null;
}
function seatedIds(c, plan) { const set = new Set(); Object.values((plan || {}).map || {}).forEach(cell => { const s = seatStudentAt(c, cell); if (s) set.add(s.id); }); return set; }

/* ผังที่นั่งใน Live Class: แตะที่นั่งเพื่อเปลี่ยนสถานะ มา → ขาด → ลา → ป่วย → สาย → หนี → มา */
function seatGrid(c, se) {
  const view = S.seatView || '3d';
  const sw = `<div class="seat-view"><div class="seg"><button data-act="seatView" data-v="3d" class="${view === '3d' ? 'on' : ''}">ห้องเรียน 3 มิติ</button><button data-act="seatView" data-v="2d" class="${view === '2d' ? 'on' : ''}">ผังแบบเรียบ</button></div><button class="btn sm" data-act="seatEdit">${ico('pen')} จัดผังห้อง</button></div>`;
  if (view === '3d' && Calc.activeStudents(c).length) return sw + room3d(c, se);
  return sw + seatGrid2d(c, se);
}
function seatGrid2d(c, se) {
  const plan = seatPlan(c), studs = Calc.activeStudents(c);
  if (!plan) return `<div class="empty seat-empty">${ico('grid')}<h3>ยังไม่มีผังห้องเรียน ${esc(classOf(c))}</h3><p>จัดที่นั่งครั้งเดียว ใช้ได้ทุกวิชาของห้องนี้ ตอนเช็คชื่อจะเห็นว่าใครนั่งตรงไหน ที่นั่งไหนว่าง</p><button class="btn pri" data-act="seatEdit">${ico('grid')} จัดผังห้องเรียน</button></div>`;
  const st = sid => se ? ((se.att || {})[sid] || 'มา') : 'มา';
  const seated = seatedIds(c, plan), loose = studs.filter(s => !seated.has(s.id));
  let cells = '';
  for (let r = 1; r <= plan.rows; r++) for (let k = 1; k <= plan.cols; k++) {
    const s = seatStudentAt(c, plan.map[r + '-' + k]);
    if (!s) { cells += `<div class="seat empty" aria-hidden="true"></div>`; continue; }
    const v = st(s.id);
    cells += `<button class="seat${v !== 'มา' ? ' marked' : ''}" data-hue="${ATT_HUES[v]}" data-act="seatTap" data-v="${s.id}" title="${esc(studentName(s))} · ${v}"><span class="seat-no">${s.no}</span><b>${esc(s.first || shortName(s))}</b><span class="seat-st">${v}</span></button>`;
  }
  return `<div class="seat-wrap"><div class="seat-front">${ico('users')} หน้าห้อง · โต๊ะครู</div>
    <div class="seat-grid" style="--cols:${plan.cols}">${cells}</div></div>
    ${loose.length ? `<div class="seat-loose"><span class="note">ยังไม่มีที่นั่ง ${loose.length} คน</span>${loose.map(s => { const v = st(s.id); return `<button class="chip${v !== 'มา' ? ' marked' : ''}" data-hue="${ATT_HUES[v]}" data-act="seatTap" data-v="${s.id}">${s.no} ${esc(s.first || shortName(s))} · ${v}</button>`; }).join('')}</div>` : ''}
    <div class="seat-foot"><span class="note">แตะที่นั่งเพื่อเปลี่ยนสถานะ มา → ขาด → ลา → ป่วย → สาย → หนี</span><button class="btn sm" data-act="seatEdit">${ico('pen')} จัดผังห้อง</button></div>`;
}

/* ---------------- กล่องจัดผังห้องเรียน ---------------- */
function seatEditor(c) {
  const key = seatKey(c), old = seatPlan(c);
  const P = old ? clone(old) : { rows: 5, cols: 6, map: {} };
  let pick = null; /* นักเรียนที่เลือกไว้รอวาง */
  const studs = Calc.activeStudents(c);
  const d = dialog('จัดผังห้องเรียน ' + classOf(c), `<div class="seat-ed">
      <div class="seat-ed-bar">
        <label class="field"><span>จำนวนแถว (หน้า → หลัง)</span><input class="inp" type="number" id="seR" min="1" max="12" value="${P.rows}"></label>
        <label class="field"><span>จำนวนโต๊ะต่อแถว</span><input class="inp" type="number" id="seC" min="1" max="12" value="${P.cols}"></label>
        <div class="row" style="align-self:end;gap:6px"><button class="btn sm" type="button" id="seAuto">${ico('sort')} เรียงตามเลขที่</button><button class="btn sm" type="button" id="seRand">${ico('dice')} สุ่มที่นั่ง</button><button class="btn sm ghost danger" type="button" id="seClear">ล้างผัง</button></div>
      </div>
      <p class="note" id="seHint"></p>
      <div class="seat-wrap"><div class="seat-front">${ico('users')} หน้าห้อง · โต๊ะครู</div><div class="seat-grid ed" id="seGrid"></div></div>
      <div class="seat-pool"><b>ยังไม่มีที่นั่ง</b><div id="sePool"></div></div>
    </div>`, [{ label: 'ยกเลิก', cls: 'ghost' }, {
    label: 'บันทึกผังห้อง', cls: 'pri', fn: () => {
      Object.keys(P.map).forEach(k => { const [r, q] = k.split('-').map(Number); if (r > P.rows || q > P.cols) delete P.map[k]; });
      S.settings.seats = Object.assign({}, S.settings.seats || {}, { [key]: P });
      touchSettings(); render(); toast('บันทึกผังห้องเรียน ' + classOf(c) + ' แล้ว · ใช้กับทุกวิชาของห้องนี้');
    }
  }], { wide: true });
  const cellOf = sid => Object.keys(P.map).find(k => { const s = seatStudentAt(c, P.map[k]); return s && s.id === sid; });
  const put = (k, s) => { P.map[k] = { id: s.id, code: s.code || '' }; };
  const draw = () => {
    const g = $('#seGrid', d); g.style.setProperty('--cols', P.cols);
    let h = '';
    for (let r = 1; r <= P.rows; r++) for (let q = 1; q <= P.cols; q++) {
      const k = r + '-' + q, s = seatStudentAt(c, P.map[k]);
      h += s ? `<button type="button" class="seat${pick === s.id ? ' pick' : ''}" data-k="${k}"><span class="seat-no">${s.no}</span><b>${esc(s.first || shortName(s))}</b></button>` : `<button type="button" class="seat empty" data-k="${k}" aria-label="ที่นั่งว่าง แถว ${r} โต๊ะ ${q}">${pick ? '+' : ''}</button>`;
    }
    g.innerHTML = h;
    const seated = new Set(studs.filter(s => cellOf(s.id)).map(s => s.id));
    const pool = studs.filter(s => !seated.has(s.id));
    $('#sePool', d).innerHTML = pool.length ? pool.map(s => `<button type="button" class="chip${pick === s.id ? ' acc' : ''}" data-s="${s.id}">${s.no} ${esc(s.first || shortName(s))}</button>`).join('') : '<span class="note">นั่งครบทุกคนแล้ว</span>';
    $('#seHint', d).textContent = pick ? 'แตะที่นั่งเพื่อวาง (ถ้ามีคนนั่งอยู่จะสลับที่กัน) · แตะชื่อเดิมอีกครั้งเพื่อยกเลิก' : 'แตะชื่อนักเรียนด้านล่าง แล้วแตะที่นั่ง · แตะคนที่นั่งอยู่เพื่อย้าย · ' + seated.size + '/' + studs.length + ' คนมีที่นั่ง';
    $('#seRemove', d) && $('#seRemove', d).remove();
    if (pick && cellOf(pick)) { const b = document.createElement('button'); b.type = 'button'; b.id = 'seRemove'; b.className = 'btn sm ghost danger'; b.textContent = 'เอาออกจากที่นั่ง'; b.onclick = () => { delete P.map[cellOf(pick)]; pick = null; draw(); }; $('#seHint', d).after(b); }
  };
  d.addEventListener('click', e => {
    const seat = e.target.closest('[data-k]'), chip = e.target.closest('[data-s]');
    if (chip) { pick = pick === chip.dataset.s ? null : chip.dataset.s; draw(); return; }
    if (!seat) return;
    const k = seat.dataset.k, here = seatStudentAt(c, P.map[k]);
    if (pick) {
      const from = cellOf(pick), ps = studs.find(s => s.id === pick);
      if (here && here.id === pick) { pick = null; draw(); return; }
      if (here && from) put(from, here); else if (from) delete P.map[from];
      put(k, ps); pick = null; draw(); return;
    }
    if (here) { pick = here.id; draw(); }
  });
  const resize = () => { P.rows = Math.max(1, Math.min(12, Number($('#seR', d).value) || 1)); P.cols = Math.max(1, Math.min(12, Number($('#seC', d).value) || 1)); draw(); };
  $('#seR', d).oninput = resize; $('#seC', d).oninput = resize;
  const fill = list => { P.map = {}; let i = 0; for (let r = 1; r <= P.rows && i < list.length; r++) for (let q = 1; q <= P.cols && i < list.length; q++) put(r + '-' + q, list[i++]); if (list.length > P.rows * P.cols) toast('ที่นั่งไม่พอ ' + (list.length - P.rows * P.cols) + ' คน เพิ่มแถวหรือโต๊ะ'); pick = null; draw(); };
  $('#seAuto', d).onclick = () => fill(studs);
  $('#seRand', d).onclick = () => fill(shuffle(studs));
  $('#seClear', d).onclick = () => { P.map = {}; pick = null; draw(); };
  if (!old) { const need = Math.max(1, studs.length); P.cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(need * 1.3)))); P.rows = Math.ceil(need / P.cols); $('#seR', d).value = P.rows; $('#seC', d).value = P.cols; fill(studs); } else draw();
}

const SEAT_ACT = {
  seatEdit() { const c = liveCourse() || cur(); if (c) seatEditor(c); },
  seatTap(v) { const c = liveCourse(), se = ensureSession(c), cur0 = (se.att || {})[v] || 'มา', ks = ATT_STATES.map(x => x[0]); liveSetStatus(v, ks[(ks.indexOf(cur0) + 1) % ks.length]); }
};
