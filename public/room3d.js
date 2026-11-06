/* ClassFolio · ห้องเรียน 3 มิติ (CSS 3D ล้วน ไม่ใช้ไลบรารีภายนอก ทำงานได้ทุกอุปกรณ์และออฟไลน์)
   ใช้ผังที่นั่งจาก seat.js · แตะนักเรียน = เช็คชื่อ หรือให้ดาว · สุ่มชื่อมีสปอตไลต์ · เปิดเต็มจอฉายให้นักเรียนดูได้ */
const R3 = { PX: 112, PY: 104, H: 30 };
function r3s() { return S.r3 || (S.r3 = { rz: -24, zoom: 1, tilt: 58, names: true, mode: 'att', task: null, spot: null, pop: null, spin: false }); }
function autoSeatPlan(c) {
  const studs = Calc.activeStudents(c), n = Math.max(1, studs.length), cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(n * 1.3)))), rows = Math.ceil(n / cols), map = {};
  studs.forEach((s, i) => { map[(Math.floor(i / cols) + 1) + '-' + (i % cols + 1)] = { id: s.id, code: s.code || '' }; });
  return { rows, cols, map, auto: true };
}
/* กล่อง 3 มิติ: พื้นที่ w×d สูง h มีหน้าบน หน้า ซ้าย ขวา หลัง */
function r3box(x, y, w, d, h, cls, extra, attrs) {
  return `<div class="r3-bx ${cls || ''}" ${attrs || ''} style="left:${x}px;top:${y}px;width:${w}px;height:${d}px">
    <i class="t" style="width:${w}px;height:${d}px;transform:translateZ(${h}px)">${extra || ''}</i>
    <i class="f" style="width:${w}px;height:${h}px;top:${d}px;transform:rotateX(90deg)"></i>
    <i class="b" style="width:${w}px;height:${h}px;top:0;transform:rotateX(90deg)"></i>
    <i class="l" style="width:${d}px;height:${h}px;top:0;transform:rotateZ(90deg) rotateX(90deg)"></i>
    <i class="r" style="width:${d}px;height:${h}px;left:${w}px;top:0;transform:rotateZ(90deg) rotateX(90deg)"></i></div>`;
}
/* ป้าย/คนที่หันหน้าเข้าหากล้องเสมอ */
function r3bb(x, y, z, html, cls, attrs) { return `<div class="r3-bb ${cls || ''}" style="left:${x}px;top:${y}px;--z:${z}px" ${attrs || ''}>${html}</div>`; }

const R3_ROWS = ['indigo', 'teal', 'amber', 'pink', 'cyan', 'violet']; /* สีประจำแถว ใช้ชุดสีของ ClassFolio */
/* ธีมห้องเรียน เลือกได้รายวิชา (เก็บใน c.r3theme) */
const R3_THEMES = { sky: 'ห้องเรียนลอยฟ้า', space: 'ห้องเรียนอวกาศ', sea: 'ห้องเรียนใต้ทะเล', thai: 'ห้องเรียนเรือนไทย' };
const R3_BOARD = { sky: 'ClassFolio', space: 'สถานีอวกาศ ClassFolio', sea: 'ห้องเรียนใต้สมุทร', thai: 'ศาลาการเรียนรู้' };
function r3theme(c) { return R3_THEMES[c.r3theme] ? c.r3theme : 'sky'; }
/* ยังยืนรอหน้าห้องไหม: คาบที่ยังไม่เปิด หรือคาบที่เริ่มเช็คในห้อง 3 มิติ (มี se.inRoom) แต่ยังไม่ได้แตะ · คาบเก่าที่ไม่มี inRoom ถือว่านั่งครบแล้ว */
function r3queued(se, sid) {
  if (!se) return true;
  if (!se.inRoom) return (se.date || '') >= todayId() && !(se.att || {})[sid]; /* คาบวันนี้/อนาคตที่ยังไม่เคยเข้าห้อง 3 มิติ ก็ยืนรอได้ · คาบที่ผ่านมาแล้วถือว่านั่งครบ */
  return !se.inRoom[sid] && !(se.att || {})[sid];
}
function r3walkIn(c, se, ids) {
  const R = r3s(), studs = Calc.activeStudents(c), plan = seatPlan(c) || autoSeatPlan(c), now = Date.now();
  const X0 = (plan.cols * R3.PX + 180 - plan.cols * R3.PX) / 2, W = plan.cols * R3.PX + 180, Dc = plan.rows * R3.PY + 250, GX = X0 - 45, QX = GX + 90, QS = 46, perRow = Math.max(4, Math.floor((W - QX - 30) / QS));
  const qList = studs.filter(s => r3queued(se, s.id));
  R.walk = R.walk || {};
  ids.forEach((sid, n) => {
    const i = qList.findIndex(s => s.id === sid); if (i < 0) return;
    const sx = QX + (i % perRow) * QS, sy = Dc + 70 + Math.floor(i / perRow) * 52;
    R.walk[sid] = { t: now + n * 260, x: sx, y: sy, dur: 2600 };
  });
  se.inRoom = se.inRoom || {}; ids.forEach(sid => { se.inRoom[sid] = 1; });
}
function r3tasks(c) { return (c.tasks || []).filter(t => Number(t.full) > 0); }
function r3task(c, se) {
  const R = r3s(), list = r3tasks(c);
  let t = list.find(x => x.id === R.task);
  if (!t && se) t = list.find(x => (se.tasks || []).includes(x.id));
  if (!t) t = list.filter(x => !x.bonus).pop() || list[list.length - 1];
  return t || null;
}

function room3d(c, se) {
  const R = r3s(), th = r3theme(c), studs = Calc.activeStudents(c), plan = seatPlan(c) || autoSeatPlan(c);
  if (!R.mode) R.mode = R.star ? 'star' : 'att';
  const st = sid => se ? ((se.att || {})[sid] || 'มา') : 'มา', bonus = sid => se ? ((se.bonus || {})[sid] || 0) : 0;
  const W = plan.cols * R3.PX + 180, Dc = plan.rows * R3.PY + 250, X0 = (W - plan.cols * R3.PX) / 2, Y0 = 220;
  /* หน้าห้อง: นักเรียนที่ยังไม่เช็คชื่อยืนต่อแถวรอ เช็คแล้วเดินผ่านประตูหน้าห้อง (มุมซ้าย) ไปนั่งที่ */
  const GX = X0 - 45, QX = GX + 90, QS = 46, perRow = Math.max(4, Math.floor((W - QX - 30) / QS)), PORCH = 70 + Math.ceil(Math.max(1, studs.length) / perRow) * 52, D = Dc + PORCH;
  const queued = sid => r3queued(se, sid), qList = studs.filter(s => queued(s.id)), qPos = {};
  qList.forEach((s, i) => { qPos[s.id] = [QX + (i % perRow) * QS, Dc + 70 + Math.floor(i / perRow) * 52]; });
  const now = Date.now(); let walkCss = '';
  const seated = seatedIds(c, plan), loose = studs.filter(s => !seated.has(s.id));
  const cnt = {}; studs.forEach(s => { const v = st(s.id); cnt[v] = (cnt[v] || 0) + 1; });
  const present = studs.filter(s => !Calc.ABSENT_STATUS.includes(st(s.id))).length;
  const pct = studs.length ? Math.round(present / studs.length * 100) : 0;
  const tasks = se ? (se.tasks || []).map(id => c.tasks.find(t => t.id === id)).filter(Boolean) : [];
  const sent = tasks.length ? studs.filter(s => tasks.every(t => Calc.num((c.scores[t.id] || {})[s.id]) !== null)).length : 0;
  const topic = se && se.topic ? se.topic : (se && se.unit ? ((c.units.find(u => u.id === se.unit) || {}).name || '') : '');
  const T = R.mode === 'score' ? r3task(c, se) : null, tsc = sid => T ? Calc.num((c.scores[T.id] || {})[sid]) : null;
  const done = T ? studs.filter(s => tsc(s.id) !== null).length : 0;
  let desks = '', people = '';
  for (let r = 1; r <= plan.rows; r++) for (let k = 1; k <= plan.cols; k++) {
    const x = X0 + (k - 1) * R3.PX + 18, y = Y0 + (r - 1) * R3.PY, s = seatStudentAt(c, plan.map[r + '-' + k]), hue = R3_ROWS[(r - 1) % R3_ROWS.length];
    desks += r3box(x, y, 64, 34, R3.H, 'desk' + (s ? '' : ' free'), '<b></b>', `data-hue="${hue}"`);
    desks += r3box(x + 17, y + 46, 30, 24, 14, 'chair' + (s ? '' : ' free'), '', `data-hue="${hue}"`);
    if (!s) continue;
    const v = st(s.id), away = Calc.ABSENT_STATUS.includes(v), b = bonus(s.id), spot = R.spot === s.id, pop = R.pop && R.pop.sid === s.id && Date.now() - R.pop.t < 1500;
    const sc = tsc(s.id), q = qPos[s.id];
    let px = x + 32, py = y + 60, walk = '';
    if (q) { px = q[0]; py = q[1]; }
    else if (R.walk && R.walk[s.id] && now - R.walk[s.id].t < R.walk[s.id].dur) {
      /* เดินจากแถวหน้าห้อง → ประตู → ทางเดินข้างห้อง → ช่องระหว่างแถว → ที่นั่ง */
      const w = R.walk[s.id], lane = y + 90, pts = [[w.x, w.y], [GX, Dc + 24], [GX, lane], [px, lane], [px, py]];
      const seg = pts.slice(1).map((p2, i) => Math.hypot(p2[0] - pts[i][0], p2[1] - pts[i][1])), tot = seg.reduce((a, b) => a + b, 0) || 1;
      let acc = 0; const kf = pts.map((p2, i) => { if (i) acc += seg[i - 1]; return `${(acc / tot * 100).toFixed(1)}%{left:${p2[0]}px;top:${p2[1]}px}`; }).join('');
      const k = 'r3w' + s.id.replace(/\W/g, ''), el = (now - w.t) / 1000;
      walkCss += `@keyframes ${k}{${kf}}.kid-wrap[data-v="${s.id}"]{animation:${k} ${w.dur / 1000}s linear ${-el}s both}.kid-wrap[data-v="${s.id}"] .r3-tok{animation:r3step .3s ease-in-out ${-el}s ${Math.ceil(w.dur / 300)}}`;
      walk = ' walking'; px = w.x; py = w.y;
    }
    const top = T ? `<span class="r3-score${sc === null ? ' none' : ''}">${sc === null ? 'ยังไม่ให้' : `${sc}<small>/${Number(T.full)}</small>`}</span>`
      : (v === 'มา' ? '' : `<span class="r3-tag" data-hue="${ATT_HUES[v]}">${v}</span>`);
    people += r3bb(px, py, q ? 0 : 12, `
      ${spot ? '<span class="r3-spot"></span>' : ''}${top}
      ${b ? `<span class="r3-star">${ico('star')}<b>${b}</b></span>` : ''}
      ${pop ? `<span class="r3-pop">${esc(R.pop.txt || '+' + (Number(S.settings.bonusPts) || 1))}</span>` : ''}
      <span class="r3-tok${away ? ' away' : ''}" data-hue="${hue}"><i class="bd"></i><i class="hd"><b>${s.no}</b></i>${v === 'มา' && !T && !q ? '<i class="ok"></i>' : ''}</span>
      ${R.names && !q ? `<span class="r3-name">${esc(s.first || shortName(s))}</span>` : ''}
      <span class="r3-tip" data-hue="${ATT_HUES[v]}"><b>${esc(studentName(s))}</b><small>เลขที่ ${s.no}${s.code ? ' · ' + esc(s.code) : ''}</small><span class="row"><i class="st">${q ? 'รอเช็คชื่อ' : v}</i>${b ? `<i class="sr">${ico('star')} ${b}</i>` : ''}${T ? `<i class="sc">${sc === null ? 'ยังไม่ให้คะแนน' : sc + '/' + Number(T.full)}</i>` : ''}</span><em>${R.mode === 'star' ? 'แตะเพื่อให้ดาว' : R.mode === 'score' ? 'แตะเพื่อกรอกคะแนน' : q ? 'แตะเพื่อเช็คชื่อ เดินเข้าห้อง' : 'แตะเพื่อเปลี่ยนสถานะ'}</em></span>`,
      'kid-wrap' + (spot ? ' spot' : '') + (away ? ' away' : '') + (q ? ' queue' : '') + walk, `data-act="r3Tap" data-v="${s.id}" role="button" tabindex="0" aria-label="${s.no} ${esc(studentName(s))} · ${q ? 'รอเช็คชื่อ' : v}"`);
  }
  const sp = R.spot ? studs.find(s => s.id === R.spot) : null;
  const tl = ['สุโขทัย', 'อยุธยา', 'ธนบุรี', 'รัตนโกสินทร์'];
  const tlist = r3tasks(c);
  const hint = { att: 'แตะนักเรียนเพื่อเช็คชื่อ', star: 'แตะนักเรียนเพื่อให้ดาว', score: 'แตะนักเรียนเพื่อกรอกคะแนน' }[R.mode];
  return `<div class="r3-themes" role="radiogroup" aria-label="ธีมห้องเรียน"><span>ธีมห้องเรียนของวิชานี้</span>${Object.keys(R3_THEMES).map(k => `<button class="r3-th${k === th ? ' on' : ''}" data-r3="${k}" data-act="r3Theme" data-v="${k}" role="radio" aria-checked="${k === th}"><i></i>${R3_THEMES[k].replace('ห้องเรียน', '')}</button>`).join('')}</div>
  <div class="r3-card${R.full ? ' full' : ''}" id="r3card" data-r3="${th}">
    <div class="r3-hud top">
      <span class="r3-chip"><i class="dot"></i><b>${esc(c.code)} ${esc(c.name)}</b><span>${esc(classOf(c))}</span></span>
      ${qList.length ? `<span class="r3-chip" data-hue="amber">${ico('clock')} รอเช็คชื่อ <b>${qList.length}</b></span><button class="r3-chip act" data-act="r3AllIn">${ico('check')} ทุกคนมา เข้าห้องเลย</button>` : `<span class="r3-chip" data-hue="teal">${ico('users')} มาเรียน <b>${present}/${studs.length}</b></span>`}
      ${Object.keys(cnt).filter(k => k !== 'มา').map(k => `<span class="r3-chip sm" data-hue="${ATT_HUES[k]}">${k} <b>${cnt[k]}</b></span>`).join('')}
      ${T ? `<span class="r3-chip" data-hue="amber">${ico('clipboard')} ให้คะแนนแล้ว <b>${done}/${studs.length}</b></span>` : tasks.length ? `<span class="r3-chip" data-hue="violet">${ico('clipboard')} ส่งงาน <b>${sent}/${studs.length}</b></span>` : ''}
    </div>
    ${sp ? `<button class="r3-hud spot-banner" data-act="r3Clear" title="แตะเพื่อปิด">${ico('target')}<span><small>สุ่มได้</small><b>${sp.no} ${esc(studentName(sp))}</b></span></button>` : ''}
    <div class="r3-stage" id="r3stage"><div class="r3-world${R.spin ? ' nt' : ''}" id="r3world" data-w="${W}" data-d="${D}" style="--rz:${R.rz}deg;--zoom:.6;--tilt:${R.tilt}deg;--w:${W}px;--d:${D}px">
      <div class="r3-island" style="left:-26px;top:-26px">${r3box(0, 0, W + 52, D + 52, 46, 'base')}</div>
      <style>${walkCss}</style>
      <div class="r3-floor" style="width:${W}px;height:${Dc}px"><i class="aisle"></i></div>
      <div class="r3-porch" style="top:${Dc}px;width:${W}px;height:${PORCH}px"><span>หน้าห้องเรียน${qList.length ? ' · ยืนรอเช็คชื่อ' : ''}</span></div>
      <div class="r3-gate" style="left:${GX - 34}px;top:${Dc - 4}px"></div>
      ${r3box(GX + 40, Dc - 8, W - GX - 60, 10, 22, 'rail')}
      <div class="r3-wall back" style="width:${W}px">
        <div class="r3-screen"><div class="bar"><i></i><i></i><i></i><span>${R3_BOARD[th]}</span></div>
          <small>${esc(thaiDate(S.live && S.live.date))} · คาบ ${esc(S.live && S.live.period)}</small><b>${esc(T ? 'ให้คะแนน: ' + T.name : (topic || c.name))}</b>
          <div class="meter"><i style="width:${T ? Math.round(done / Math.max(1, studs.length) * 100) : pct}%"></i></div><span>${T ? `ให้คะแนนแล้ว ${done} จาก ${studs.length} คน` : `มาเรียน ${present} จาก ${studs.length} คน · ${pct}%`}</span></div>
        ${r3cork(c, se)}<i class="win" style="right:34px"></i></div>
      <div class="r3-wall left" style="width:${Dc}px;top:${Dc}px"><div class="r3-map" style="left:${Dc * .3}px"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><span>แผนที่โลก</span></div></div>
      <div class="r3-wall right" style="width:${Dc}px;left:${W}px"><div class="r3-tl"><span>เส้นเวลาประวัติศาสตร์ไทย</span><p>${tl.map((t, i) => `<i data-hue="${R3_ROWS[i]}"><b></b>${t}</i>`).join('')}</p></div><i class="win" style="left:${Dc * .66}px"></i></div>
      ${r3box(W - 212, 104, 108, 50, 32, 'tdesk')}
      ${r3bb(W - 128, 128, 32, '<span class="r3-globe"><i></i><b></b></span>', 'globe')}
      ${r3bb(W - 172, 172, 0, `<span class="r3-tok teacher"><i class="bd"></i><i class="hd">${ico('user')}</i></span><span class="r3-label">${esc(c.teacher || S.settings.teacher || 'ครูผู้สอน')}</span>`, 'teacher-wrap')}
      ${r3bb(54, 110, 0, '<span class="r3-plant"><i></i><b></b></span>', 'plant')}${r3bb(W - 54, Dc - 40, 0, '<span class="r3-plant"><i></i><b></b></span>', 'plant')}
      ${desks}${people}
    </div></div>
    <div class="r3-hud bottom">
      ${R.mode === 'score' ? `<div class="r3-taskbar">${tlist.length ? `<label>${ico('clipboard')}<select id="r3Task" aria-label="เลือกงานที่จะให้คะแนน">${tlist.map(t => `<option value="${t.id}"${T && T.id === t.id ? ' selected' : ''}>${esc(t.name)} (เต็ม ${Number(t.full)})</option>`).join('')}</select></label>` : '<span>ยังไม่มีงานที่มีคะแนนเต็ม เพิ่มงานในสมุดคะแนนก่อน</span>'}</div>` : ''}
      <div class="r3-tools">
        <div class="r3-grp">
          <span class="r3-mode">
            <button class="r3-btn wide${R.mode === 'att' ? ' on' : ''}" data-act="r3Mode" data-v="att">${ico('check')} เช็คชื่อ</button>
            <button class="r3-btn wide${R.mode === 'star' ? ' on' : ''}" data-act="r3Mode" data-v="star">${ico('star')} ให้ดาว</button>
            <button class="r3-btn wide${R.mode === 'score' ? ' on' : ''}" data-act="r3Mode" data-v="score">${ico('clipboard')} ให้คะแนน</button>
          </span>
          <button class="r3-btn wide" data-act="r3Rand">${ico('dice')} สุ่มชื่อ</button>
          ${qList.length ? '' : `<button class="r3-btn wide" data-act="r3Queue" title="ให้นักเรียนออกไปยืนรอหน้าห้อง แล้วเช็คชื่อใหม่ทีละคน (สถานะขาด/ลาที่บันทึกไว้ยังอยู่)">${ico('users')} เรียกแถวหน้าห้อง</button>`}
        </div>
        <div class="r3-grp r3-view">
          <button class="r3-btn" data-act="r3Rot" data-v="-1" title="หมุนซ้าย" aria-label="หมุนซ้าย">${ico('undo')}</button>
          <button class="r3-btn" data-act="r3Rot" data-v="1" title="หมุนขวา" aria-label="หมุนขวา">${ico('redo')}</button>
          <button class="r3-btn${R.spin ? ' on' : ''}" data-act="r3Spin" title="หมุนรอบห้อง 360 องศา">360°</button>
          <button class="r3-btn" data-act="r3Zoom" data-v="1" title="ซูมเข้า" aria-label="ซูมเข้า">+</button>
          <button class="r3-btn" data-act="r3Zoom" data-v="-1" title="ซูมออก" aria-label="ซูมออก">−</button>
          <button class="r3-btn" data-act="r3Reset" title="มุมเริ่มต้น" aria-label="มุมเริ่มต้น">${ico('target')}</button>
          <button class="r3-btn${R.names ? ' on' : ''}" data-act="r3Names" title="แสดงชื่อ">ชื่อ</button>
          <button class="r3-btn" data-act="r3Full" title="${R.full ? 'ออกเต็มจอ' : 'เต็มจอ'}" aria-label="${R.full ? 'ออกเต็มจอ' : 'เต็มจอ'}">${ico('grid')}</button>
        </div>
      </div>
      <span class="r3-hint">ลากซ้าย-ขวาเพื่อหมุนรอบห้อง · ลากขึ้น-ลงเพื่อก้มเงย · ล้อเมาส์หรือสองนิ้วเพื่อซูม · ${hint}</span>
    </div>
    ${loose.length ? `<div class="r3-loose"><span>ยังไม่มีที่นั่ง</span>${loose.map(s => `<button class="chip" data-hue="${ATT_HUES[st(s.id)]}" data-act="r3Tap" data-v="${s.id}">${s.no} ${esc(s.first || shortName(s))} · ${T ? (tsc(s.id) === null ? 'ยังไม่ให้' : tsc(s.id)) : st(s.id)}</button>`).join('')}</div>` : ''}
    ${plan.auto ? `<p class="note r3-note">ตอนนี้วางที่นั่งตามเลขที่ให้ชั่วคราว กด "จัดผังห้อง" เพื่อจัดเอง</p>` : ''}
  </div>
  ${r3work(c, se)}`;
}

/* ---------- มุมภาระงาน: งาน/การบ้านของคาบ + กระดานความจำ (c.memos) ---------- */
const R3_MEMO_HUES = ['amber', 'pink', 'teal', 'blue', 'violet'];
function r3workTasks(c, se) {
  const today = todayId(), ids = new Set(se ? se.tasks || [] : []);
  const list = (c.tasks || []).filter(t => ids.has(t.id) || (t.due && t.due >= today && !t.bonus));
  return list.sort((a, b) => (ids.has(b.id) - ids.has(a.id)) || String(a.due || '9').localeCompare(String(b.due || '9')));
}
function r3cork(c, se) {
  const tasks = r3workTasks(c, se).slice(0, 2), memos = (c.memos || []).slice(0, 4 - tasks.length);
  const notes = tasks.map(t => `<i class="nt task"><b>${esc(t.name)}</b>${t.due ? `<small>ส่ง ${esc(thaiDate(t.due).split(' ').slice(0, 2).join(' '))}</small>` : ''}</i>`)
    .concat(memos.map(m => `<i class="nt" data-hue="${m.hue || 'amber'}"><b>${esc(m.text)}</b></i>`)).join('');
  return `<button class="r3-cork" data-act="r3Board" title="เปิดมุมภาระงาน"><span>มุมภาระงาน</span><p>${notes || '<em>แตะเพื่อเพิ่มงานหรือโน้ต</em>'}</p></button>`;
}
function r3work(c, se) {
  const studs = Calc.activeStudents(c), n = studs.length, ids = new Set(se ? se.tasks || [] : []), today = todayId();
  const tasks = r3workTasks(c, se), memos = c.memos || [];
  const item = t => {
    const got = studs.filter(s => Calc.num((c.scores[t.id] || {})[s.id]) !== null).length, pct = n ? Math.round(got / n * 100) : 0;
    const late = t.due && t.due < today;
    return `<div class="r3w-task"><div class="tt"><span class="tag" data-hue="${ids.has(t.id) ? 'indigo' : late ? 'rose' : 'amber'}">${ids.has(t.id) ? 'คาบนี้' : 'การบ้าน'}</span><b>${esc(t.name)}</b>
      <small>เต็ม ${Number(t.full) || '-'}${t.due ? ' · ส่ง ' + esc(thaiDate(t.due)) : ''}</small></div>
      <div class="pg"><i style="width:${pct}%"></i></div><small class="pn">ให้คะแนนแล้ว ${got}/${n}</small>
      <div class="ac"><button class="btn sm pri" data-act="r3ScoreTask" data-v="${t.id}">${ico('clipboard')} บันทึกคะแนน</button><button class="btn sm ghost" data-act="task" data-v="${t.id}">แก้</button></div></div>`;
  };
  return `<section class="r3-work" id="r3work">
    <div class="r3w-col">
      <div class="r3w-h"><span class="ic" data-hue="indigo">${ico('clipboard')}</span><span><b>งานและการบ้าน</b><small>งานคาบนี้ และการบ้านที่ยังไม่ถึงวันส่ง</small></span><button class="btn sm pri" data-act="liveAssign">${ico('plus')} สั่งงาน/การบ้าน</button></div>
      <div class="r3w-list">${tasks.map(item).join('') || '<p class="note r3w-empty">ยังไม่มีงาน กด "สั่งงาน/การบ้าน" งานจะเพิ่มเข้าสมุดคะแนนให้อัตโนมัติ</p>'}</div>
    </div>
    <div class="r3w-col">
      <div class="r3w-h"><span class="ic" data-hue="pink">${ico('film')}</span><span><b>สื่อการสอนคาบนี้</b><small>แตะเพื่อเปิดสื่อ · เพิ่มจากคลังสื่อได้</small></span></div>
      ${mediaBlock(c, se)}
    </div>
    <div class="r3w-col">
      <div class="r3w-h"><span class="ic" data-hue="amber">${ico('pen')}</span><span><b>กระดานความจำ</b><small>โน้ตของวิชานี้ ขึ้นบนกระดานในห้องด้วย</small></span><button class="btn sm" data-act="r3Memo">${ico('plus')} เพิ่มโน้ต</button></div>
      <div class="r3w-memos">${memos.map(m => `<button class="r3-memo" data-hue="${m.hue || 'amber'}" data-act="r3Memo" data-v="${m.id}"><span>${esc(m.text).replace(/\n/g, '<br>')}</span><small>${esc(thaiDate(m.date || today))}</small></button>`).join('') || '<p class="note r3w-empty">ยังไม่มีโน้ต</p>'}</div>
    </div>
  </section>`;
}
function r3memoDlg(c, id) {
  const m = id ? (c.memos || []).find(x => x.id === id) : { text: '', hue: 'amber' };
  if (!m) return; let hue = m.hue || 'amber';
  const d = dialog(id ? 'แก้โน้ต' : 'เพิ่มโน้ตบนกระดานความจำ', `<label class="field"><span>ข้อความ</span><textarea class="inp" id="mmTxt" rows="4" placeholder="เช่น คาบหน้าสอบย่อยบทที่ 2 · ให้นักเรียนนำแผนที่มา">${esc(m.text)}</textarea></label>
    <div class="field"><span>สีโน้ต</span><div class="r3-hues">${R3_MEMO_HUES.map(h => `<button type="button" data-h="${h}" data-hue="${h}" class="${h === hue ? 'on' : ''}" aria-label="สี ${h}"></button>`).join('')}</div></div>`,
    [...(id ? [{ label: 'ลบโน้ต', cls: 'ghost danger left', fn: () => { snap(c); c.memos = c.memos.filter(x => x.id !== id); touch(c); render(); toast('ลบโน้ตแล้ว'); } }] : []),
     { label: 'ยกเลิก', cls: 'ghost' }, { label: 'บันทึก', cls: 'pri', fn: dd => {
      const text = $('#mmTxt', dd).value.trim(); if (!text) { toast('พิมพ์ข้อความก่อน'); return false; }
      snap(c); c.memos = c.memos || [];
      if (id) Object.assign(m, { text, hue }); else c.memos.unshift({ id: newId('m'), text, hue, date: todayId() });
      touch(c); render();
    } }]);
  d.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { hue = b.dataset.h; d.querySelectorAll('[data-h]').forEach(x => x.classList.toggle('on', x === b)); });
}

/* ย่อให้ทั้งห้องพอดีกรอบ (คงที่ไม่ขึ้นกับมุมหมุน ภาพจะไม่ยืดหดตอนหมุน) แล้วคูณด้วยการซูมของครู */
function r3apply() {
  const w = $('#r3world'), st = $('#r3stage'), R = r3s(); if (!w) return;
  const W = Number(w.dataset.w), D = Number(w.dataset.d), t = R.tilt * Math.PI / 180;
  const pw = (W * .9 + D * .42) * 1.1, ph = (W * .42 + D * .9) * Math.cos(t) + 150 * Math.sin(t);
  const crop = st && st.clientWidth < 640 ? .78 : 1; /* จอเล็ก ยอมให้ขอบห้องล้นนิดหน่อยเพื่อให้นักเรียนตัวใหญ่ขึ้น */
  const fit = st ? Math.min(1.25, (st.clientWidth - 24) / (pw * crop), (st.clientHeight - 120) / ph) : 1;
  w.style.setProperty('--rz', R.rz + 'deg'); w.style.setProperty('--zoom', Math.max(.2, fit) * R.zoom); w.style.setProperty('--tilt', R.tilt + 'deg');
}
function r3spinLoop() {
  const R = r3s(); if (!R.spin) return;
  const w = $('#r3world'); if (!w) { R.spin = false; return; }
  R.rz = (R.rz + .35) % 360; w.style.setProperty('--rz', R.rz + 'deg');
  requestAnimationFrame(r3spinLoop);
}
/* ลากหมุน · ซูม (ผูกครั้งเดียวทั้งเอกสาร) */
(function bindR3() {
  let drag = null; const pts = new Map(); let pinch = null;
  document.addEventListener('pointerdown', e => {
    const st = e.target.closest && e.target.closest('#r3stage'); if (!st) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: r3s().zoom }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, rz: r3s().rz, tilt: r3s().tilt, moved: false, w: st.clientWidth || 600 };
  });
  document.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const R = r3s();
    if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; R.zoom = Math.max(.45, Math.min(2.6, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); r3apply(); return; }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; R.spin = false; const w = $('#r3world'); if (w) w.classList.add('nt'); }
    if (!drag.moved) return;
    /* ลากสุดความกว้างกรอบ = หมุนเกือบรอบ (ประมาณ 330 องศา) ลากต่อได้ไม่จำกัด */
    R.rz = drag.rz + dx * 330 / drag.w; R.tilt = Math.max(15, Math.min(88, drag.tilt - dy * .25)); r3apply();
  });
  const up = e => {
    if (drag && drag.moved) { S.r3drag = Date.now(); const w = $('#r3world'); if (w) w.classList.remove('nt'); }
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) drag = null;
  };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
  document.addEventListener('wheel', e => { if (!(e.target.closest && e.target.closest('#r3stage'))) return; e.preventDefault(); const R = r3s(); R.zoom = Math.max(.45, Math.min(2.6, R.zoom * (e.deltaY < 0 ? 1.08 : .92))); r3apply(); }, { passive: false });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.r3 && S.r3.full && !document.querySelector('dialog[open]')) { S.r3.full = false; render(); } });
  document.addEventListener('change', e => { if (e.target.id === 'r3Task') { r3s().task = e.target.value; render(); } });
})();

/* กล่องกรอกคะแนนรายคน: แตะตัวเลขเพื่อบันทึกทันที */
function r3scoreDlg(c, t, s) {
  const full = Number(t.full), now = Calc.num((c.scores[t.id] || {})[s.id]);
  const quick = full <= 20 ? Array.from({ length: full + 1 }, (_, i) => i) : [...new Set([0, Math.round(full * .25), Math.round(full * .5), Math.round(full * .6), Math.round(full * .7), Math.round(full * .8), Math.round(full * .9), full])];
  const save = v => {
    snap(c); (c.scores[t.id] = c.scores[t.id] || {})[s.id] = v;
    const R = r3s(); R.pop = { sid: s.id, t: Date.now(), txt: v === '' ? 'ล้าง' : String(v) }; touch(c); render();
    setTimeout(() => { if (R.pop && R.pop.sid === s.id) R.pop = null; }, 1500);
    if (v !== '' && v > full && !t.bonus) toast('คะแนนเกินคะแนนเต็ม (' + full + ') ตรวจสอบอีกครั้ง');
  };
  const d = dialog(`${s.no} ${studentName(s)}`, `<p class="note" style="margin-top:0">${esc(t.name)} · เต็ม ${full}${now !== null ? ` · ตอนนี้ได้ <b>${now}</b>` : ''}</p>
    <div class="r3-pad">${quick.map(v => `<button type="button" class="${now === v ? 'on' : ''}" data-q="${v}">${v}</button>`).join('')}</div>
    <label class="field" style="margin-top:12px"><span>หรือพิมพ์คะแนน</span><input class="inp" id="r3In" type="number" inputmode="decimal" step="0.5" min="0" value="${now === null ? '' : now}"></label>`,
    [{ label: 'ล้างคะแนน', cls: 'ghost danger left', fn: () => save('') }, { label: 'ยกเลิก', cls: 'ghost' }, { label: 'บันทึก', cls: 'pri', fn: dd => { const v = numOrBlank($('#r3In', dd).value); if (v === null) { toast('กรอกเป็นตัวเลข'); return false; } save(v); } }]);
  d.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { d.close(); d.remove(); save(Number(b.dataset.q)); });
  $('#r3In', d).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); d.querySelector('.dlg-f .btn.pri').click(); } });
}

const R3_ACT = {
  r3Tap(v) {
    if (S.r3drag && Date.now() - S.r3drag < 250) return; /* เพิ่งลากหมุน ไม่นับเป็นการแตะ */
    const R = r3s(), c = liveCourse();
    if (R.mode === 'star') { R.pop = { sid: v, t: Date.now() }; LIVE_ACT.liveBonus(v); setTimeout(() => { if (R.pop && R.pop.sid === v) { R.pop = null; } }, 1500); return; }
    if (R.mode === 'score') {
      const t = r3task(c, findSession(c, S.live.date, S.live.period)), s = Calc.activeStudents(c).find(x => x.id === v);
      if (!t) { toast('ยังไม่มีงานให้คะแนน เพิ่มงานในสมุดคะแนนก่อน'); return; }
      if (s) r3scoreDlg(c, t, s); return;
    }
    const se0 = findSession(c, S.live.date, S.live.period);
    if (r3queued(se0, v)) { /* ยืนรอหน้าห้อง → แตะ = มาเรียน เดินเข้าไปนั่ง */
      snap(c); const se = ensureSession(c);
      r3walkIn(c, se, [v]); touch(c); render(); return;
    }
    SEAT_ACT.seatTap(v);
  },
  r3Queue() {
    const c = liveCourse(); snap(c); const se = ensureSession(c); se.inRoom = {}; r3s().walk = {}; touch(c); render();
    toast('นักเรียนออกไปยืนรอหน้าห้องแล้ว แตะทีละคนเพื่อเช็คชื่อ');
  },
  r3AllIn() {
    const c = liveCourse(); snap(c); const se = ensureSession(c);
    const ids = Calc.activeStudents(c).filter(s => r3queued(se, s.id)).map(s => s.id);
    r3walkIn(c, se, ids); touch(c); render(); toast('ทุกคนมาเรียน ' + ids.length + ' คน กำลังเดินเข้าห้อง');
    setTimeout(() => { if ($('#r3world')) render(); }, 2600 + ids.length * 260 + 100);
  },
  r3Mode(v) { const R = r3s(); R.mode = v; R.star = v === 'star'; render(); },
  r3Theme(v) { const c = liveCourse(); if (!c || !R3_THEMES[v]) return; snap(c); c.r3theme = v; touch(c); render(); toast('เปลี่ยนเป็น' + R3_THEMES[v] + ' สำหรับวิชานี้แล้ว'); },
  r3Rot(v) { const R = r3s(); R.spin = false; R.rz += Number(v) * 45; r3apply(); },
  r3Spin() { const R = r3s(); R.spin = !R.spin; render(); if (R.spin) requestAnimationFrame(r3spinLoop); },
  r3Zoom(v) { const R = r3s(); R.zoom = Math.max(.45, Math.min(2.6, R.zoom * (Number(v) > 0 ? 1.15 : .87))); r3apply(); },
  r3Reset() { Object.assign(r3s(), { rz: -24, zoom: 1, tilt: 58, spin: false }); render(); },
  r3Names() { const R = r3s(); R.names = !R.names; render(); },
  r3Full() { const R = r3s(); R.full = !R.full; render(); },
  r3Rand() {
    const c = liveCourse(), se = findSession(c, S.live.date, S.live.period);
    const pool = Calc.activeStudents(c).filter(s => !Calc.ABSENT_STATUS.includes(se ? ((se.att || {})[s.id] || 'มา') : 'มา'));
    if (!pool.length) { toast('ไม่มีนักเรียนที่มาเรียน'); return; }
    const R = r3s(); let i = 0; const spin = Math.min(12, pool.length * 2);
    const tick = () => { R.spot = pool[Math.floor(Math.random() * pool.length)].id; if (++i >= spin) { const s2 = ensureSession(c); logAct(s2, { k: 'pick', s: [R.spot] }); touch(c); } render(); if (i < spin) setTimeout(tick, 70 + i * 18); };
    tick();
  },
  r3Board() { const el = $('#r3work'); if (el) { if (S.r3 && S.r3.full) { S.r3.full = false; render(); } const w = $('#r3work'); w.scrollIntoView({ behavior: 'smooth', block: 'start' }); w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); } },
  r3Memo(v) { const c = liveCourse(); if (c) r3memoDlg(c, v); },
  r3ScoreTask(v) { const R = r3s(); R.mode = 'score'; R.task = v; render(); const el = $('#r3card'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); toast('แตะนักเรียนในห้องเพื่อกรอกคะแนน'); },
  r3Clear() { r3s().spot = null; render(); },
  seatView(v) { S.seatView = v; render(); }
};
