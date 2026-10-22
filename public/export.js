/* ClassFolio · ส่งออก Excel: สรุปผลการเรียน · สมุดคะแนนดิบ · เวลาเรียนรายคาบ · บันทึกการสอน */
function excelSheets(c, st) {
  st = st || S.settings;
  const studs = Calc.activeStudents(c), units = c.units || [];
  const sum = Calc.summary(c, st);
  const head = `${c.code || ''} ${c.name || ''} · ชั้น ${c.grade || ''}/${c.room || ''} · ${termLabel(c)}`;
  const lvName = vals => { const l = Calc.levelFromValues(vals); return l === null ? '' : Calc.LEVEL_NAMES[l]; };
  const id = s => [s.no, s.code || s.sid || '', s.prefix || '', s.first || '', s.last || ''];

  /* 1) สรุปผลการเรียน */
  const r1 = [['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'สกุล'].concat(
    units.map((u, i) => (u.isFinal ? 'ปลายภาค' : 'หน่วย ' + (i + 1)) + ` (${u.weight})`),
    [`ระหว่างภาค (${c.ratio ? c.ratio.mid : ''})`, 'รวม (100)', 'ระดับผลการเรียน', 'เวลาเรียน %', 'ขาด/ลา (ชม.)', 'คุณลักษณะฯ', 'อ่าน คิด เขียน', 'สมรรถนะ', 'แก้ตัวได้', 'หมายเหตุ'])];
  sum.rows.forEach(({ s, r }) => {
    const rem = (c.remedial || {})[s.id] || {};
    r1.push(id(s).concat(r.units.map(x => x.score === null ? '' : x.score), [r.mid, r.total, isNaN(Number(r.grade)) ? r.grade : Number(r.grade), Math.round(r.att.pct * 10) / 10, r.att.absent, lvName((c.attr || {})[s.id]), lvName((c.rtw || {})[s.id]), lvName((c.comp || {})[s.id]), rem.grade ? Number(rem.grade) : '', rem.note || (r.missing.length ? 'ค้าง ' + r.missing.length + ' งาน' : '')]));
  });
  r1.push([]);
  r1.push(['', '', '', 'จำนวนนักเรียน', '', sum.n]);
  ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'].forEach(k => r1.push(['', '', '', 'ระดับ ' + k, '', sum.counts[k] || 0]));
  r1.push(['', '', '', 'เกรดเฉลี่ย', '', sum.gpa === null ? '' : Math.round(sum.gpa * 100) / 100]);

  /* 2) สมุดคะแนนดิบ */
  const cols = bookColumns(c);
  const r2 = [['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'สกุล'].concat(cols.map(({ t, u }) => `${u.isFinal ? 'ปลายภาค' : 'น.' + (units.indexOf(u) + 1)} · ${t.name}${t.bonus ? ' (พิเศษ)' : ''}`))];
  r2.push(['', '', '', 'คะแนนเต็ม', ''].concat(cols.map(({ t }) => Number(t.full) || 0)));
  studs.forEach(s => r2.push(id(s).concat(cols.map(({ t }) => { const v = Calc.num((c.scores[t.id] || {})[s.id]); return v === null ? '' : v; }))));

  /* 3) เวลาเรียนรายคาบ */
  const ses = (c.sessions || []).slice().sort((a, b) => (a.date + String(a.period).padStart(2, '0')).localeCompare(b.date + String(b.period).padStart(2, '0')));
  const K = ATT_STATES.map(x => x[0]);
  const r3 = [['เลขที่', 'เลขประจำตัว', 'คำนำหน้า', 'ชื่อ', 'สกุล'].concat(ses.map(x => `${thaiDate(x.date).split(' ').slice(0, 2).join(' ')} คาบ ${x.period}`), K.map(k => 'รวม' + k), ['มาแล้ว (คาบ)', 'คาบที่สอน', 'มาแล้ว %', 'เวลาเรียนทั้งภาค %'])];
  studs.forEach(s => {
    const a = Calc.attendance(c, s.id, st);
    r3.push(id(s).concat(ses.map(x => (x.att || {})[s.id] || 'มา'), K.map(k => (a.counts || {})[k] || 0), [a.came, a.taught, a.sesPct === null ? '' : Math.round(a.sesPct * 10) / 10, Math.round(a.pct * 10) / 10]));
  });

  /* 4) บันทึกการสอน */
  const n = studs.length;
  const r4 = [['วันที่', 'คาบ', 'หน่วย', 'เรื่องที่สอน', 'มาเรียน', 'ไม่มา', 'งานที่มอบ', 'บันทึกหลังสอน']];
  ses.forEach(x => {
    const u = units.find(z => z.id === x.unit), ab = studs.filter(s => Calc.ABSENT_STATUS.includes((x.att || {})[s.id])).length;
    r4.push([thaiDate(x.date), Number(x.period), u ? u.name : '', x.topic || '', n - ab, ab, (x.tasks || []).map(t => (c.tasks.find(z => z.id === t) || {}).name).filter(Boolean).join(', '), x.note || '']);
  });

  const W = [7, 13, 9, 14, 16];
  return [
    { name: 'สรุปผลการเรียน', title: 'สรุปผลการเรียน · ' + head, rows: r1, header: 1, plainFrom: studs.length + 1, center: [1, 2].concat([2, 5, 6, 7, 8].map(k => 5 + units.length + k)), freeze: { r: 1, c: 5 }, cols: W.concat(units.map(() => 10), [12, 10, 10, 10, 10, 11, 11, 11, 9, 24]) },
    { name: 'สมุดคะแนนดิบ', title: 'สมุดคะแนนดิบ · ' + head, rows: r2, header: 2, center: [1, 2], freeze: { r: 2, c: 5 }, cols: W.concat(cols.map(() => 12)) },
    { name: 'เวลาเรียนรายคาบ', title: 'เวลาเรียนรายคาบ · ' + head, rows: r3, header: 1, center: [1, 2].concat(ses.map((_, i) => 5 + i)), freeze: { r: 1, c: 5 }, cols: W.concat(ses.map(() => 9), K.map(() => 7), [10, 9, 9, 12]) },
    { name: 'บันทึกการสอน', title: 'บันทึกการสอน · ' + head, rows: r4, header: 1, freeze: { r: 1 }, cols: [22, 6, 24, 30, 8, 8, 26, 36] }
  ];
}

function excelName(c) {
  return safeFile('คะแนน ' + courseFileTag(c)) + '.xlsx';
}

function exportExcel(c) {
  if (!c) return;
  if (window.self !== window.top) { toast('หน้าตัวอย่างนี้ดาวน์โหลดไฟล์ไม่ได้ เปิดจากเว็บของครูบน Vercel เพื่อดาวน์โหลด Excel'); return; }
  try { XLSX.download(excelName(c), excelSheets(c)); toast('ดาวน์โหลดไฟล์ Excel แล้ว'); }
  catch (e) { console.error(e); toast('สร้างไฟล์ Excel ไม่สำเร็จ: ' + e.message); }
}
