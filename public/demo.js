/* สมุดวัดผล ปพ.5 · ข้อมูลตัวอย่าง (ชื่อสมมุติทั้งหมด) */
function makeDemoCourses(settings) {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const boys = ['ธนกฤต', 'ภูมิพัฒน์', 'กิตติพัฒน์', 'ณัฐวุฒิ', 'ปัณณวิชญ์', 'วรเมธ', 'ศุภกร', 'อนุชา', 'ชยพล', 'ธีรภัทร', 'พีรพัฒน์', 'รัชชานนท์', 'สิรวิชญ์', 'ภาคิน', 'กฤตเมธ'];
  const girls = ['กนกพร', 'ชนิดาภา', 'ณัฐธิดา', 'ปิยธิดา', 'พิมพ์ชนก', 'วรรณพร', 'สุชานันท์', 'อรปรียา', 'ธัญชนก', 'กัญญาณัฐ', 'ปุณยวีร์', 'ศิริกานดา', 'เบญญาภา', 'มนัสนันท์', 'อินทิรา'];
  const lasts = ['ทองดี', 'ศรีสุข', 'แก้วประเสริฐ', 'บุญมา', 'จันทร์หอม', 'สายทอง', 'พึ่งบุญ', 'เพชรรัตน์', 'มีสุข', 'ใจงาม', 'วงศ์สวัสดิ์', 'ชื่นชม', 'รุ่งเรือง', 'ปานทอง', 'สุขเจริญ', 'อินทร์แก้ว', 'บางปูน'];

  function students(n, startCode) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const boy = rnd() < .5;
      out.push({ id: newId('s'), no: i + 1, code: String(startCode + i), prefix: boy ? 'ด.ช.' : 'ด.ญ.', first: pick(boy ? boys : girls), last: pick(lasts), status: 'active' });
    }
    out.sort((a, b) => thColl.compare(a.first, b.first)).forEach((s, i) => s.no = i + 1);
    return out;
  }
  function fillScores(c, blanks) {
    const studs = c.students;
    const ability = {}; studs.forEach(s => ability[s.id] = .56 + rnd() * .4);
    c.tasks.forEach(t => {
      c.scores[t.id] = {};
      studs.forEach(s => {
        let v = Math.round(Math.max(0, Math.min(1, ability[s.id] + (rnd() - .5) * .25)) * t.full);
        if (t.bonus) v = rnd() < .4 ? Math.round(rnd() * t.full) : '';
        c.scores[t.id][s.id] = v;
      });
    });
    (blanks || []).forEach(([si, ti]) => { const s = studs[si], t = c.tasks[ti]; if (s && t) c.scores[t.id][s.id] = ''; });
  }
  function fillAssess(c, skip) {
    c.students.forEach((s, i) => {
      ['attr', 'rtw', 'comp'].forEach(k => {
        if (skip && skip.includes(k) && i > 12) return;
        c[k][s.id] = ASSESS[k].items.map(() => rnd() < .55 ? 3 : (rnd() < .7 ? 2 : 1));
      });
    });
  }

  /* วิชาที่ 1 · มัธยม */
  const m1 = defaultCourse(settings, {
    demo: true, descFont: 'THSarabunPSK', descLine: 1.35, code: 'ส21101', name: 'สังคมศึกษา 1', grade: 'ม.1', room: '1', year: 2569, term: '1', hours: 60, credits: 1.5,
    descHtml: '<p style="text-align:center"><b>คำอธิบายรายวิชา</b></p><p style="text-align:center">รายวิชาสังคมศึกษา 1 รหัสวิชา ส21101 กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม<br>ชั้นมัธยมศึกษาปีที่ 1 เวลา 60 ชั่วโมง จำนวน 1.5 หน่วยกิต</p><p style="text-align:left">&emsp;&emsp;ศึกษา วิเคราะห์ และอธิบายหลักการของการเป็นพลเมืองดีในวิถีประชาธิปไตย สิทธิ เสรีภาพ และหน้าที่ของตนเอง พุทธประวัติและหลักธรรมที่นำไปใช้ในชีวิตประจำวัน ความหมายและความสำคัญของเศรษฐศาสตร์ การตัดสินใจเลือกบริโภคอย่างมีเหตุผล และการใช้เครื่องมือทางภูมิศาสตร์ในการค้นหาข้อมูลของทวีปเอเชีย</p><p style="text-align:left">&emsp;&emsp;โดยใช้กระบวนการสืบค้น กระบวนการกลุ่ม การอภิปราย และการเรียนรู้จากสถานการณ์จริงในชุมชน เพื่อให้เกิดความรู้ความเข้าใจ มีทักษะการคิดวิเคราะห์ และนำไปใช้ในการดำเนินชีวิตได้อย่างมีคุณธรรม</p>',
    indicators: 'ส 1.1 ม.1/1, ม.1/2, ม.1/5\nส 2.1 ม.1/1, ม.1/2, ม.1/3\nส 3.1 ม.1/1, ม.1/2\nส 5.1 ม.1/1, ม.1/2\nรวม 10 ตัวชี้วัด'
  });
  m1.units = [
    { id: newId('u'), name: 'พลเมืองดีวิถีประชาธิปไตย', indicators: 'ส 2.1 ม.1/1, ม.1/2, ม.1/3', hours: 12, weight: 15, slots: 0, minPct: null },
    { id: newId('u'), name: 'พุทธประวัติและหลักธรรม', indicators: 'ส 1.1 ม.1/1, ม.1/2, ม.1/5', hours: 16, weight: 20, slots: 0, minPct: null },
    { id: newId('u'), name: 'เศรษฐศาสตร์ในชีวิตประจำวัน', indicators: 'ส 3.1 ม.1/1, ม.1/2', hours: 14, weight: 20, slots: 0, minPct: null },
    { id: newId('u'), name: 'เครื่องมือทางภูมิศาสตร์', indicators: 'ส 5.1 ม.1/1, ม.1/2', hours: 16, weight: 15, slots: 0, minPct: null },
    { id: 'final', name: 'สอบปลายภาค', isFinal: true, indicators: '', hours: 2, weight: 30, slots: 1 }
  ];
  const u = m1.units;
  m1.tasks = [
    { id: newId('t'), name: 'ใบงานสิทธิหน้าที่', full: 10, unit: u[0].id, weight: 1 },
    { id: newId('t'), name: 'บทบาทสมมติสภานักเรียน', full: 20, unit: u[0].id, weight: 2 },
    { id: newId('t'), name: 'แบบทดสอบย่อย 1', full: 15, unit: u[0].id, weight: 1 },
    { id: newId('t'), name: 'สมุดภาพพุทธประวัติ', full: 20, unit: u[1].id, weight: 1 },
    { id: newId('t'), name: 'ใบงานหลักธรรม', full: 10, unit: u[1].id, weight: 1 },
    { id: newId('t'), name: 'สอบกลางภาค', full: 30, unit: u[1].id, weight: 2 },
    { id: newId('t'), name: 'บัญชีรายรับรายจ่าย', full: 20, unit: u[2].id, weight: 1 },
    { id: newId('t'), name: 'โครงงานตลาดชุมชน', full: 30, unit: u[2].id, weight: 2 },
    { id: newId('t'), name: 'จิตอาสาช่วยงานวัด', full: 5, unit: u[2].id, weight: 1, bonus: true },
    { id: newId('t'), name: 'แผนที่ทวีปเอเชีย', full: 20, unit: u[3].id, weight: 1 },
    { id: newId('t'), name: 'แบบทดสอบย่อย 2', full: 15, unit: u[3].id, weight: 1 },
    { id: newId('t'), name: 'ข้อสอบปลายภาค', full: 40, unit: 'final', weight: 1 }
  ];
  m1.students = students(28, 12401);
  fillScores(m1, [[3, 7], [3, 9], [11, 10], [19, 6]]);
  m1.students.forEach((s, i) => m1.attendance[s.id] = i === 16 ? 14 : Math.floor(rnd() * 5));
  fillAssess(m1);
  m1.log = [{ t: Date.now() - 86400000, text: 'สร้างข้อมูลตัวอย่าง' }];
  const dAgo = n => { const d = new Date(Date.now() - n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const S1 = m1.students;
  m1.sessions = [
    { d: 15, p: 2, u: 0, topic: 'สิทธิ เสรีภาพ และหน้าที่', note: 'นักเรียนยกตัวอย่างจากชีวิตจริงได้ดี' },
    { d: 13, p: 5, u: 0, topic: 'บทบาทสมมติ สภานักเรียน', note: 'กลุ่ม 3 ยังไม่กล้าพูด ครั้งหน้าให้เตรียมบทก่อน' },
    { d: 8, p: 2, u: 1, topic: 'พุทธประวัติ ตอนประสูติ', note: '' },
    { d: 6, p: 5, u: 1, topic: 'หลักธรรม อริยสัจ 4', note: 'ใช้เกมจับคู่ช่วยให้เข้าใจเร็วขึ้น' },
    { d: 1, p: 2, u: 2, topic: 'รายรับรายจ่ายในครอบครัว', note: '' }
  ].map((x, k) => {
    const att = {}; S1.forEach((s, i) => { if ((i * 7 + k * 3) % 23 === 0) att[s.id] = 'ขาด'; else if ((i + k) % 19 === 0) att[s.id] = 'ลา'; else if ((i * 5 + k) % 17 === 0) att[s.id] = 'สาย'; });
    const bonus = {}; S1.forEach((s, i) => { if ((i * 3 + k) % 5 === 0) bonus[s.id] = 1 + ((i + k) % 2); });
    return { id: newId('se'), date: dAgo(x.d), period: x.p, unit: m1.units[x.u].id, topic: x.topic, note: x.note, att, bonus, bonusLog: [], tasks: [], createdAt: Date.now() };
  });
  const pj = m1.tasks.find(t => t.name === 'โครงงานตลาดชุมชน'); if (pj) { pj.due = dAgo(-3); m1.sessions[4].tasks.push(pj.id); }
  const tb = m1.tasks.find(t => t.name === 'บัญชีรายรับรายจ่าย'); if (tb) { tb.due = dAgo(1); m1.sessions[4].tasks.push(tb.id); }
  if (typeof syncBonus === 'function') syncBonus(m1);

  /* วิชาที่ 2 · ประถม */
  const p6 = defaultCourse(settings, {
    demo: true, descFont: 'THSarabunPSK', descLine: 1.35, code: 'ส16101', name: 'สังคมศึกษา 6', grade: 'ป.6', room: '1', year: 2569, term: 'ปี', hours: 80, credits: 0,
    descHtml: '<p style="text-align:center"><b>คำอธิบายรายวิชา</b></p><p style="text-align:center">รายวิชาสังคมศึกษา 6 รหัสวิชา ส16101 ชั้นประถมศึกษาปีที่ 6 เวลา 80 ชั่วโมง/ปี</p><p style="text-align:left">&emsp;&emsp;ศึกษาหลักธรรมทางพระพุทธศาสนา บทบาทหน้าที่ของพลเมืองในระบอบประชาธิปไตย การใช้ทรัพยากรอย่างพอเพียง และความสัมพันธ์ระหว่างไทยกับประเทศเพื่อนบ้าน โดยใช้กระบวนการเรียนรู้จากชุมชนและการทำงานกลุ่ม</p>',
    indicators: 'ส 1.1 ป.6/1, ป.6/2\nส 2.1 ป.6/1, ป.6/3\nส 3.1 ป.6/2\nส 4.3 ป.6/1'
  });
  p6.units = [
    { id: newId('u'), name: 'ชาวพุทธที่ดี', indicators: 'ส 1.1 ป.6/1, ป.6/2', hours: 18, weight: 15, slots: 0, minPct: null },
    { id: newId('u'), name: 'พลเมืองดีของชาติ', indicators: 'ส 2.1 ป.6/1, ป.6/3', hours: 20, weight: 20, slots: 0, minPct: null },
    { id: newId('u'), name: 'เศรษฐกิจพอเพียง', indicators: 'ส 3.1 ป.6/2', hours: 18, weight: 15, slots: 0, minPct: null },
    { id: newId('u'), name: 'ไทยกับเพื่อนบ้าน', indicators: 'ส 4.3 ป.6/1', hours: 22, weight: 20, slots: 0, minPct: null },
    { id: 'final', name: 'สอบปลายปี', isFinal: true, indicators: '', hours: 2, weight: 30, slots: 1 }
  ];
  const v = p6.units;
  p6.tasks = [
    { id: newId('t'), name: 'ใบงานวันสำคัญ', full: 10, unit: v[0].id, weight: 1 },
    { id: newId('t'), name: 'สวดมนต์และสมาธิ', full: 10, unit: v[0].id, weight: 1 },
    { id: newId('t'), name: 'เลือกตั้งประธานนักเรียน', full: 20, unit: v[1].id, weight: 1 },
    { id: newId('t'), name: 'แบบทดสอบหน่วย 2', full: 20, unit: v[1].id, weight: 1 },
    { id: newId('t'), name: 'แปลงผักพอเพียง', full: 30, unit: v[2].id, weight: 1 },
    { id: newId('t'), name: 'ป้ายนิเทศอาเซียน', full: 20, unit: v[3].id, weight: 1 },
    { id: newId('t'), name: 'สอบปลายปี', full: 50, unit: 'final', weight: 1 }
  ];
  p6.students = students(22, 11850);
  fillScores(p6, [[5, 5], [5, 6], [9, 6], [14, 6], [20, 6]]);
  p6.students.forEach(s => p6.attendance[s.id] = Math.floor(rnd() * 6));
  fillAssess(p6, ['rtw', 'comp']);
  p6.log = [{ t: Date.now() - 86400000, text: 'สร้างข้อมูลตัวอย่าง' }];

  p6.updatedAt = m1.updatedAt - 1000;
  return [m1, p6];
}

function makeDemoTimetable(list) {
  const T = ttDefault();
  const [m1, p6] = list;
  const put = (k, c, place) => T.cells[k] = { course: c.id, place: place || '' };
  put('1-2', m1, 'ห้องสังคม'); put('1-3', m1, 'ห้องสังคม'); put('3-5', m1, 'ห้องสังคม');
  put('2-1', p6); put('2-6', p6); put('4-3', p6); put('5-2', p6);
  T.cells['3-7'] = { text: 'ประชุมกลุ่มสาระ', place: 'ห้องประชุม' };
  T.cells['5-7'] = { text: 'ลูกเสือ', place: 'สนาม' };
  T.classes['ม.1/1'] = { '1-1': { subj: 'คณิตศาสตร์ 1' }, '1-4': { subj: 'ภาษาไทย 1' }, '2-1': { subj: 'วิทยาศาสตร์ 1' }, '2-2': { subj: 'ภาษาอังกฤษ 1' } };
  return T;
}
