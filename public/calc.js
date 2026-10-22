/* สมุดวัดผล ปพ.5 · สูตรคำนวณทั้งหมด (ไม่มีส่วนหน้าจอ) */
(function (g) {
  'use strict';

  const DEFAULT_SCALE = [
    { min: 80, grade: '4' }, { min: 75, grade: '3.5' }, { min: 70, grade: '3' },
    { min: 65, grade: '2.5' }, { min: 60, grade: '2' }, { min: 55, grade: '1.5' },
    { min: 50, grade: '1' }, { min: 0, grade: '0' }
  ];
  const LEVEL_NAMES = ['ไม่ผ่าน', 'ผ่าน', 'ดี', 'ดีเยี่ยม'];

  function num(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  function round(v, mode) {
    if (v === null || v === undefined || isNaN(v)) return v;
    if (mode === 'int') return Math.round(v);
    if (mode === '1') return Math.round(v * 10) / 10;
    return Math.round(v * 100) / 100;
  }
  function fmt(v, mode) {
    if (v === null || v === undefined || isNaN(v)) return '';
    const r = round(v, mode);
    return Number.isInteger(r) ? String(r) : String(r);
  }

  /* ระดับชั้นจากรหัสวิชา: ตัวเลขตัวแรก 1 = ประถม (ปพ.5 ป) อื่น ๆ = มัธยม (ปพ.5 ต) */
  function levelOf(code) {
    const m = String(code || '').match(/^[^\d]*(\d)/);
    return m && m[1] === '1' ? 'ป' : 'ต';
  }

  function gradeOf(pct, scale) {
    const s = (scale && scale.length ? scale : DEFAULT_SCALE).slice().sort((a, b) => b.min - a.min);
    for (const step of s) if (pct >= step.min) return step.grade;
    return '0';
  }

  function activeStudents(c) {
    return (c.students || []).filter(s => s.status !== 'out').sort((a, b) => (a.no || 0) - (b.no || 0));
  }

  function unitTasks(c, unitId) {
    return (c.tasks || []).filter(t => t.unit === unitId);
  }

  /* แจกงานลงช่องคะแนนย่อย (1–10 ช่อง) ตามลำดับงาน */
  function slotPlan(c, u) {
    const ts = unitTasks(c, u.id).filter(t => !t.bonus);
    const n = Math.max(1, Math.min(10, Number(u.slots) || Math.min(ts.length, 10) || 1));
    const mode = (c.convert || 'ratio');
    const fullSum = ts.reduce((a, t) => a + (Number(t.full) || 0), 0);
    const wSum = ts.reduce((a, t) => a + (Number(t.weight) || 1), 0);
    const slots = Array.from({ length: n }, () => ({ tasks: [], max: 0 }));
    ts.forEach((t, i) => {
      const k = ts.length <= n ? i : Math.floor(i * n / ts.length);
      const share = mode === 'weighted'
        ? (wSum ? (Number(t.weight) || 1) / wSum : 0)
        : (fullSum ? (Number(t.full) || 0) / fullSum : 0);
      slots[k].tasks.push(t);
      slots[k].max += share * (Number(u.weight) || 0);
    });
    return { slots, fullSum, wSum, mode };
  }

  /* คะแนนหน่วยหลังแปลง + คะแนนรายช่อง */
  function unitResult(c, u, sid) {
    const plan = slotPlan(c, u);
    const W = Number(u.weight) || 0;
    const missing = [];
    let hasAny = false;
    const slotScores = plan.slots.map(sl => {
      let s = 0;
      sl.tasks.forEach(t => {
        const v = num((c.scores[t.id] || {})[sid]);
        if (v === null) { missing.push(t.id); return; }
        hasAny = true;
        const full = Number(t.full) || 0;
        if (!full) return;
        const share = plan.mode === 'weighted'
          ? (plan.wSum ? (Number(t.weight) || 1) / plan.wSum : 0)
          : (plan.fullSum ? full / plan.fullSum : 0);
        s += Math.min(v, full) / full * share * W;
      });
      return s;
    });
    // คะแนนพิเศษ: เติมช่องที่ยังไม่เต็ม แต่ไม่เกินคะแนนหน่วย
    let bonus = 0;
    unitTasks(c, u.id).filter(t => t.bonus).forEach(t => {
      const v = num((c.scores[t.id] || {})[sid]);
      if (v === null) return;
      hasAny = true;
      if (plan.mode === 'weighted') {
        const f = Number(t.full) || 0;
        bonus += f && plan.wSum ? v / f * W * (Number(t.weight) || 1) / plan.wSum : 0;
      } else if (plan.fullSum) {
        bonus += v / plan.fullSum * W;
      }
    });
    for (let i = 0; i < slotScores.length && bonus > 0; i++) {
      const room = plan.slots[i].max - slotScores[i];
      const add = Math.max(0, Math.min(room, bonus));
      slotScores[i] += add; bonus -= add;
    }
    const score = slotScores.reduce((a, b) => a + b, 0);
    const noTasks = plan.slots.every(s => !s.tasks.length);
    return { score: noTasks ? null : score, max: W, slotScores, slots: plan.slots, missing, hasAny, noTasks };
  }

  const ABSENT_STATUS = ['ขาด', 'ลา', 'ป่วย', 'หนี'];
  function attendance(c, sid, settings) {
    const hours = Number(c.hours) || 0;
    const manual = Number((c.attendance || {})[sid]) || 0;
    const hp = Number(settings && settings.tt && settings.tt.hrsPerPeriod) || 1;
    let live = 0, counts = {}, taught = 0, came = 0;
    (c.sessions || []).forEach(se => { const st = (se.att || {})[sid] || 'มา'; counts[st] = (counts[st] || 0) + 1; taught++; if (ABSENT_STATUS.includes(st)) live += hp; else came++; });
    const absent = manual + live;
    const present = Math.max(0, hours - absent);
    const pct = hours ? present / hours * 100 : 100;
    const min = Number(settings && settings.minAtt) || 80;
    /* มาเรียนกี่คาบจากคาบที่สอนไปแล้ว (เตือนล่วงหน้า ไม่ใช้ตัดสิน มส) */
    const sesPct = taught ? came / taught * 100 : null;
    const early = sesPct !== null && taught >= 3 && sesPct < min;
    return { hours, absent, manual, live, counts, present, pct, pass: pct >= min, taught, came, sesPct, early };
  }

  /* ปัดเป็นจำนวนเต็มโดยให้ผลรวมเท่ากับ total (วิธีเศษเหลือมากสุด) */
  function distributeInt(arr, total) {
    const floor = arr.map(v => Math.floor(v + 1e-9));
    let left = Math.round(total) - floor.reduce((a, b) => a + b, 0);
    const order = arr.map((v, i) => [v - floor[i], i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < order.length && left > 0; k++, left--) floor[order[k][1]]++;
    for (let k = order.length - 1; k >= 0 && left < 0; k--, left++) if (floor[order[k][1]] > 0) floor[order[k][1]]--;
    return floor;
  }
  function slotMaxes(c, u, rmode) {
    const m = slotPlan(c, u).slots.map(s => s.max);
    return rmode === 'int' ? distributeInt(m, Number(u.weight) || 0) : m;
  }

  function studentResult(c, sid, settings) {
    settings = settings || {};
    const rmode = settings.rounding || 'int';
    const units = (c.units || []).map(u => {
      const r = unitResult(c, u, sid);
      if (r.score !== null) {
        r.score = round(r.score, rmode);
        r.slotScores = rmode === 'int' ? distributeInt(r.slotScores, r.score) : r.slotScores.map(v => round(v, rmode));
      }
      const minPct = Number(u.minPct ?? settings.minPct ?? 60);
      r.pass = r.score === null ? null : round(r.score, rmode) >= r.max * minPct / 100;
      r.unit = u;
      return r;
    });
    const midUnits = units.filter(r => !r.unit.isFinal);
    const finUnits = units.filter(r => r.unit.isFinal);
    const mid = midUnits.reduce((a, r) => a + (r.score || 0), 0);
    const fin = finUnits.reduce((a, r) => a + (r.score || 0), 0);
    const total = round(mid + fin, rmode);
    const missing = units.reduce((a, r) => a.concat(r.missing), []);
    const att = attendance(c, sid, settings);
    const projected = gradeOf(total, settings.scale);
    let grade;
    if (!att.pass) grade = 'มส';
    else if (missing.length) grade = 'ร';
    else grade = projected;
    const failedUnits = units.filter(r => r.pass === false).map(r => r.unit);
    return { units, mid: round(mid, rmode), fin: round(fin, rmode), total, missing, att, grade, projected, failedUnits };
  }

  /* ต้องได้คะแนนปลายภาค (คะแนนดิบ) เท่าไรจึงถึงเกรดเป้าหมาย */
  function neededFinal(c, sid, targetGrade, settings) {
    const scale = (settings && settings.scale && settings.scale.length ? settings.scale : DEFAULT_SCALE);
    const step = scale.find(s => s.grade === String(targetGrade));
    if (!step) return null;
    const r = studentResult(c, sid, settings);
    const finU = (c.units || []).find(u => u.isFinal);
    if (!finU) return null;
    const finW = Number(finU.weight) || 0;
    const need = step.min - r.mid;
    if (need <= 0) return { raw: 0, scaled: 0, possible: true };
    const fts = unitTasks(c, finU.id).filter(t => !t.bonus);
    const rawFull = fts.reduce((a, t) => a + (Number(t.full) || 0), 0) || finW;
    const scaled = need;
    const raw = Math.ceil(scaled / finW * rawFull * 100) / 100;
    return { raw, scaled, rawFull, possible: scaled <= finW };
  }

  function levelFromValues(vals) {
    const v = (vals || []).map(num).filter(x => x !== null);
    if (!v.length) return null;
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    if (v.some(x => x === 0) && avg < 1) return 0;
    if (avg >= 2.5) return 3;
    if (avg >= 1.5) return 2;
    if (avg >= 1) return 1;
    return 0;
  }

  function summary(c, settings) {
    const studs = activeStudents(c);
    const counts = {};
    ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].forEach(k => counts[k] = 0);
    let sum = 0, n = 0, totalSum = 0;
    const rows = studs.map(s => {
      const r = studentResult(c, s.id, settings);
      counts[r.grade] = (counts[r.grade] || 0) + 1;
      if (!isNaN(Number(r.grade))) { sum += Number(r.grade); n++; }
      totalSum += r.total || 0;
      return { s, r };
    });
    const lv = kind => {
      const out = [0, 0, 0, 0]; let done = 0;
      studs.forEach(s => { const l = levelFromValues((c[kind] || {})[s.id]); if (l !== null) { out[l]++; done++; } });
      return { counts: out, done };
    };
    return {
      rows, counts, n: studs.length,
      gpa: n ? sum / n : null,
      meanTotal: studs.length ? totalSum / studs.length : null,
      attr: lv('attr'), rtw: lv('rtw'), comp: lv('comp')
    };
  }

  g.Calc = {
    DEFAULT_SCALE, LEVEL_NAMES, num, round, fmt, levelOf, gradeOf, activeStudents, unitTasks,
    ABSENT_STATUS, slotPlan, slotMaxes, distributeInt, unitResult, attendance, studentResult, neededFinal, levelFromValues, summary
  };
})(typeof window !== 'undefined' ? window : globalThis);
