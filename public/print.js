/* สมุดวัดผล ปพ.5 · สร้างหน้าเอกสาร A4 สำหรับพิมพ์ */
const PAGES = [
  ['1', 'ปก'], ['2', 'คำอธิบายรายวิชา'], ['3', 'โครงสร้างรายวิชา'], ['3.1', 'คะแนนย่อย (แนวนอน)'],
  ['4', 'เวลาเรียน'], ['5', 'ผลการเรียน'], ['6', 'คุณลักษณะ'], ['7', 'อ่าน คิด เขียน'],
  ['8', 'สมรรถนะ'], ['9', 'สรุปผล'], ['10', 'แก้ผลการเรียน'], ['B', 'ปกหลัง']
];

const Print = (function () {
  const f = (v, m) => Calc.fmt(v, m);
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o.length ? o : [[]]; };

  function levelText(c) {
    if (levelOfCourse(c) === 'ป') return 'ระดับประถมศึกษา';
    const g = String(c.grade).match(/(\d)/);
    return g && Number(g[1]) >= 4 ? 'ระดับมัธยมศึกษาตอนปลาย' : 'ระดับมัธยมศึกษาตอนต้น';
  }
  function wm(st, o) {
    if (!o.wm || o.wm === 'none') return '';
    if (o.wm === 'logo') return st.logo ? `<div class="wm"><img src="${st.logo}" alt=""></div>` : '';
    const t = { draft: 'ฉบับร่าง', original: 'ต้นฉบับ', school: st.school, copy: 'สำเนา' }[o.wm] || '';
    return `<div class="wm"><span>${esc(t)}</span></div>`;
  }
  function sheet(c, st, o, key, body, land, part) {
    const run = `<div class="run"><span>ปพ.5 · ${esc(c.code)} ${esc(c.name)} · ชั้น ${esc(classOf(c))} · ${esc(termLabel(c))}</span><span>หน้า ${key}${part ? ' (' + part + ')' : ''}</span></div>`;
    return `<section class="sheet${land ? ' land' : ''}${o.bw ? ' bw' : ''}">${wm(st, o)}${key === '1' ? '' : run}${body}</section>`;
  }
  function studentRows(c) { return Calc.activeStudents(c); }

  /* หน้า 1 ปก */
  function p1(c, st, o) {
    const sm = Calc.summary(c, st);
    const G = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'];
    const pct = k => sm.n ? (sm.counts[k] / sm.n * 100).toFixed(1) : '0.0';
    const lvRow = (name, d) => `<tr><td>${name}</td>${[3, 2, 1, 0].map(i => `<td class="n">${d.counts[i]}</td>`).join('')}<td class="n">${d.done}</td></tr>`;
    const signers = (st.signers || []).filter(x => x.role);
    const signHtml = signers.map((x, i) => {
      const name = x.name || (x.role === 'ครูผู้สอน' ? c.teacher : '');
      const last = i === signers.length - 1;
      return `<div class="sign"${last ? ' style="grid-column:1/-1"' : ''}>${last ? '<div>☐ อนุมัติ &emsp; ☐ ไม่อนุมัติ</div>' : ''}<div class="ln">ลงชื่อ ......................................................</div><div>( ${esc(name) || '......................................................'} )</div><div>${esc(x.role)}</div></div>`;
    }).join('');
    const logo = st.logo ? `<img class="logo" src="${st.logo}" alt="">` : `<div class="logo-ph">ตราโรงเรียน</div>`;
    const lv = levelOfCourse(c);
    const body = `${logo}
      <h1 class="doc">แบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)</h1>
      <div class="cen" style="font-size:18pt">${levelText(c)}</div>
      <div class="cen" style="font-size:18pt"><b>${esc(st.school)}</b> · ${esc(st.area)}</div>
      <table class="info-t">
        <tr><th>${lv === 'ป' ? 'ปีการศึกษา' : 'ภาคเรียนที่'}</th><td>${lv === 'ป' ? esc(c.year) : esc(c.term) + '/' + esc(c.year)}</td><th>ชั้น</th><td>${esc(classOf(c))}</td></tr>
        <tr><th>กลุ่มสาระการเรียนรู้</th><td colspan="3">${esc(c.group)}</td></tr>
        <tr><th>รหัสวิชา</th><td>${esc(c.code)}</td><th>รายวิชา</th><td>${esc(c.name)} (${esc(c.type)})</td></tr>
        <tr><th>เวลาเรียน</th><td>${esc(c.hours)} ชั่วโมง${lv === 'ป' ? '/ปี' : ''}</td><th>${lv === 'ป' ? 'ประเภท' : 'หน่วยกิต'}</th><td>${lv === 'ป' ? 'รายวิชา' + esc(c.type) : esc(c.credits) + ' หน่วยกิต'}</td></tr>
        <tr><th>ครูผู้สอน</th><td colspan="3">${esc(c.teacher)}</td></tr>
      </table>
      <table class="pt tight"><thead><tr><th rowspan="2">ผลการเรียน</th><th colspan="10">จำนวนนักเรียนที่ได้ระดับผลการเรียน</th><th rowspan="2">รวม</th></tr>
      <tr>${G.map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody><tr><td>จำนวน (คน)</td>${G.map(k => `<td class="n">${sm.counts[k]}</td>`).join('')}<td class="n">${sm.n}</td></tr>
      <tr><td>ร้อยละ</td>${G.map(k => `<td class="n">${pct(k)}</td>`).join('')}<td class="n">100</td></tr></tbody></table>
      <table class="pt tight" style="margin-top:3mm"><thead><tr><th>การประเมิน</th><th>ดีเยี่ยม</th><th>ดี</th><th>ผ่าน</th><th>ไม่ผ่าน</th><th>ประเมินแล้ว</th></tr></thead>
      <tbody>${lvRow('คุณลักษณะอันพึงประสงค์', sm.attr)}${lvRow('การอ่าน คิดวิเคราะห์ และเขียน', sm.rtw)}${lvRow('สมรรถนะสำคัญของผู้เรียน', sm.comp)}</tbody></table>
      <div class="signs">${signHtml}</div>
      <div class="cen" style="margin-top:4mm">วันที่ ${c.signDate ? esc(thaiDate(c.signDate)) : '............ เดือน .............................. พ.ศ. ..............'}</div>`;
    return sheet(c, st, o, '1', body);
  }

  function p2(c, st, o) {
    const ind = String(c.indicators || '').split('\n').filter(x => x.trim());
    const sty = `font-family:'${esc(c.descFont || 'THSarabunPSK')}','THSarabunPSK',Sarabun,sans-serif;line-height:${Number(c.descLine) || 1.35};font-size:${Number(c.descSize) || 16}pt`;
    const body = `<div class="desc" style="${sty}">${c.descHtml || '<p class="cen">(ยังไม่ได้พิมพ์คำอธิบายรายวิชา)</p>'}
      ${ind.length && c.showInd !== false ? `<div class="desc-ind"><p><b>ตัวชี้วัด</b></p>${ind.map(x => `<p>${esc(x)}</p>`).join('')}</div>` : ''}</div>`;
    return sheet(c, st, o, '2', body);
  }

  function p3(c, st, o) {
    const units = c.units || [];
    const tw = units.reduce((a, u) => a + (Number(u.weight) || 0), 0);
    const th = units.reduce((a, u) => a + (Number(u.hours) || 0), 0);
    const body = `<h2 class="doc">โครงสร้างรายวิชา ${esc(c.name)} รหัสวิชา ${esc(c.code)}</h2>
      <table class="pt"><thead><tr><th style="width:12mm">หน่วยที่</th><th>ชื่อหน่วยการเรียนรู้</th><th>มาตรฐาน/ตัวชี้วัด</th><th style="width:16mm">เวลา (ชม.)</th><th style="width:18mm">น้ำหนักคะแนน</th></tr></thead>
      <tbody>${units.map((u, i) => `<tr><td class="n">${u.isFinal ? '' : i + 1}</td><td>${esc(u.name)}</td><td>${esc(u.indicators).replace(/\n/g, '<br>')}</td><td class="n">${esc(u.hours || '')}</td><td class="n">${esc(u.weight)}</td></tr>`).join('')}
      <tr><td colspan="3" class="c"><b>รวมตลอด${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาคเรียน'}</b></td><td class="n"><b>${th}</b></td><td class="n"><b>${tw}</b></td></tr></tbody></table>
      <p style="margin-top:3mm">อัตราส่วนคะแนนระหว่างเรียน : ปลาย${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} = ${esc(c.ratio.mid)} : ${esc(c.ratio.final)}</p>`;
    return sheet(c, st, o, '3', body);
  }

  function p31(c, st, o) {
    const units = (c.units || []).filter(u => !u.isFinal);
    const studs = studentRows(c);
    const res = {}; studs.forEach(s => res[s.id] = Calc.studentResult(c, s.id, st));
    const plans = units.map(u => ({ u, plan: Calc.slotPlan(c, u) }));
    // แบ่งหน่วยเป็นกลุ่มให้แต่ละแผ่นไม่เกิน 30 คอลัมน์
    const groups = []; let g = [], cols = 0;
    plans.forEach(p => { const n = p.plan.slots.length + 1; if (cols + n > 30 && g.length) { groups.push(g); g = []; cols = 0; } g.push(p); cols += n; });
    if (g.length) groups.push(g);
    if (!groups.length) groups.push([]);
    const out = [];
    const rmode = st.rounding;
    groups.forEach((grp, gi) => {
      const last = gi === groups.length - 1;
      chunk(studs, 24).forEach((part, pi, all) => {
        const head1 = grp.map(p => `<th colspan="${p.plan.slots.length + 1}">${esc(p.u.name)}</th>`).join('') + (last ? '<th rowspan="3">รวม<br>ระหว่าง<br>เรียน</th>' : '');
        const head2 = grp.map(p => p.plan.slots.map((s, i) => `<th>${i + 1}</th>`).join('') + '<th>รวม</th>').join('');
        const head3 = grp.map(p => Calc.slotMaxes(c, p.u, rmode).map(m => `<th>${f(m, rmode)}</th>`).join('') + `<th>${esc(p.u.weight)}</th>`).join('');
        const rows = part.map(s => {
          const r = res[s.id];
          const cells = grp.map(p => {
            const ur = r.units.find(x => x.unit.id === p.u.id);
            return ur.slotScores.map(v => `<td class="n">${f(v, rmode)}</td>`).join('') + `<td class="n"><b>${f(ur.score, rmode)}</b></td>`;
          }).join('');
          return `<tr><td class="n">${s.no}</td><td>${esc(studentName(s))}</td>${cells}${last ? `<td class="n"><b>${f(r.mid, rmode)}</b></td>` : ''}</tr>`;
        }).join('');
        const body = `<h2 class="doc" style="font-size:18pt">บันทึกคะแนนย่อยระหว่างเรียน</h2>
          <table class="pt tight"><thead><tr><th rowspan="3" style="width:9mm">เลขที่</th><th rowspan="3" style="width:52mm">ชื่อ - สกุล</th>${head1}</tr><tr>${head2}</tr><tr>${head3}</tr></thead><tbody>${rows}</tbody></table>`;
        const lbl = (groups.length > 1 ? 'ชุด ' + (gi + 1) : '') + (all.length > 1 ? (groups.length > 1 ? ' · ' : '') + 'แผ่น ' + (pi + 1) + '/' + all.length : '');
        out.push(sheet(c, st, o, '3.1', body, true, lbl));
      });
    });
    return out.join('');
  }

  function studentTable(c, st, o, key, title, headHtml, rowFn, per) {
    const studs = studentRows(c);
    const parts = chunk(studs, per || 36);
    return parts.map((part, i) => sheet(c, st, o, key,
      `<h2 class="doc">${title}</h2><table class="pt"><thead>${headHtml}</thead><tbody>${part.map(rowFn).join('')}</tbody></table>`,
      false, parts.length > 1 ? 'แผ่น ' + (i + 1) + '/' + parts.length : '')).join('');
  }

  /* หน้า 4: บันทึกเวลาเรียนรายคาบ ✓ จาก Live Class (ไม่มีบันทึกรายคาบ → ตารางสรุปแบบเดิม) */
  const CHECK = '<svg class="ck" viewBox="0 0 12 12" aria-label="มา"><path d="M2.2 6.4l2.5 2.5 5.1-5.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ATT_MARK = { 'ขาด': ['ข', '#c9283e'], 'ลา': ['ล', '#a15c00'], 'ป่วย': ['ป', '#0b7f9e'], 'สาย': ['ส', '#3b46b8'], 'หนี': ['น', '#7a3fd0'] };
  const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function p4summary(c, st, o) {
    const head = `<tr><th style="width:11mm">เลขที่</th><th style="width:22mm">เลขประจำตัว</th><th>ชื่อ - สกุล</th><th>เวลาเรียน<br>(ชม.)</th><th>ขาดเรียน<br>(ชม.)</th><th>มาเรียน<br>(ชม.)</th><th>ร้อยละ</th><th>ผล</th></tr>`;
    return studentTable(c, st, o, '4', 'บันทึกเวลาเรียน', head, s => {
      const a = Calc.attendance(c, s.id, st);
      return `<tr><td class="n">${s.no}</td><td class="n">${esc(s.code)}</td><td>${esc(studentName(s))}</td><td class="n">${a.hours}</td><td class="n">${a.absent}</td><td class="n">${a.present}</td><td class="n">${a.pct.toFixed(2)}</td><td class="c">${a.pass ? 'มีสิทธิ์สอบ' : 'มส'}</td></tr>`;
    });
  }
  function p4(c, st, o) {
    const ses = (c.sessions || []).slice().sort((x, y) => (x.date + String(x.period).padStart(2, '0')).localeCompare(y.date + String(y.period).padStart(2, '0')));
    if (!ses.length) return p4summary(c, st, o);
    const studs = studentRows(c), hp = Number(st.tt && st.tt.hrsPerPeriod) || 1;
    const PER_COL = 26, MAX_ROW = 28, nSheets = Math.max(1, Math.ceil(studs.length / MAX_ROW)), PER_ROW = Math.ceil(studs.length / nSheets) || MAX_ROW;
    const colParts = chunk(ses, PER_COL);
    const ST = ['มา', 'ขาด', 'ลา', 'ป่วย', 'สาย', 'หนี'];
    const out = [];
    colParts.forEach((cols, ci) => {
      const last = ci === colParts.length - 1;
      // หัวเดือน
      const months = []; cols.forEach(x => { const m = Number(x.date.slice(5, 7)) - 1, y = Number(x.date.slice(0, 4)) + 543, k = m + '-' + y; const l = months[months.length - 1]; if (l && l.k === k) l.n++; else months.push({ k, n: 1, t: TH_MON[m] + ' ' + String(y).slice(2) }); });
      const pad = PER_COL - cols.length;
      const sumHead = last ? `<th rowspan="3" class="sumh">มา</th><th rowspan="3" class="sumh">ขาด</th><th rowspan="3" class="sumh">ลา</th><th rowspan="3" class="sumh">ป่วย</th><th rowspan="3" class="sumh">สาย</th><th rowspan="3" class="sumh">หนี</th><th rowspan="3" class="sumh">ขาด<br>รวม<br>ชม.</th><th rowspan="3" class="sumh">ร้อย<br>ละ</th><th rowspan="3" class="sumh">ผล</th>` : '';
      const h1 = months.map(m => `<th colspan="${m.n}">${m.t}</th>`).join('') + (pad ? `<th colspan="${pad}" class="blank-h">เดือน</th>` : '');
      const h2 = cols.map(x => `<th class="dc">${Number(x.date.slice(8, 10))}</th>`).join('') + '<th class="dc"></th>'.repeat(pad);
      const h3 = cols.map(x => `<th class="dc pc">${x.period}</th>`).join('') + '<th class="dc pc"></th>'.repeat(pad);
      chunk(studs, PER_ROW).forEach((rows, ri, rAll) => {
        const body = rows.map(s => {
          const cnt = {}; ST.forEach(k => cnt[k] = 0);
          (c.sessions || []).forEach(x => { cnt[(x.att || {})[s.id] || 'มา']++; });
          const cells = cols.map(x => {
            const v = (x.att || {})[s.id] || 'มา';
            if (v === 'มา') return `<td class="mk ok">${CHECK}</td>`;
            const [ch, col] = ATT_MARK[v] || ['?', '#000'];
            return `<td class="mk" style="color:${o.bw ? '#000' : col}">${ch}</td>`;
          }).join('') + '<td class="mk"></td>'.repeat(pad);
          let sum = '';
          if (last) { const a = Calc.attendance(c, s.id, st); sum = ST.map(k => `<td class="n">${cnt[k] || ''}</td>`).join('') + `<td class="n">${a.absent || ''}</td><td class="n">${Math.floor(a.pct)}</td><td class="c">${a.pass ? '' : '<b>มส</b>'}</td>`; }
          return `<tr><td class="n">${s.no}</td><td class="nm">${esc(studentName(s))}</td>${cells}${sum}</tr>`;
        }).join('');
        const totalRow = `<tr class="tot"><td colspan="2" class="c">มาเรียน (คน)</td>${cols.map(x => `<td class="n">${studs.filter(s => !Calc.ABSENT_STATUS.includes((x.att || {})[s.id])).length}</td>`).join('')}${'<td></td>'.repeat(pad)}${last ? '<td colspan="9"></td>' : ''}</tr>`;
        const legend = `<div class="att-legend"><span>${CHECK} มาเรียน</span>${Object.entries(ATT_MARK).map(([k, [ch, col]]) => `<span><b style="color:${o.bw ? '#000' : col}">${ch}</b> ${k}</span>`).join('')}<span>· ขาด ลา ป่วย หนี นับเป็นไม่ได้เข้าเรียน คาบละ ${hp} ชม. · สายนับว่ามาเรียน${last && studs.some(s => Number((c.attendance || {})[s.id])) ? ' · ขาดรวมนับชั่วโมงที่ปรับเพิ่มก่อนใช้ระบบด้วย' : ''}</span></div>`;
        const html = `<h2 class="doc" style="font-size:17pt;margin-bottom:1.5mm">บันทึกเวลาเรียน</h2>
          <table class="pt attg"><thead><tr><th rowspan="3" style="width:8mm">เลขที่</th><th rowspan="3" class="nmh">ชื่อ - สกุล</th>${h1}${sumHead}</tr><tr>${h2}</tr><tr>${h3}</tr></thead>
          <tbody>${body}${ri === rAll.length - 1 ? totalRow : ''}</tbody></table>
          <div class="att-foot">${legend}${last && ri === rAll.length - 1 ? `<div class="att-sign">ลงชื่อ .............................................. ครูผู้สอน<br>( ${esc(c.teacher || '..............................................')} )</div>` : ''}</div>`;
        const lbl = (colParts.length > 1 ? 'ชุดที่ ' + (ci + 1) + '/' + colParts.length : '') + (rAll.length > 1 ? (colParts.length > 1 ? ' · ' : '') + 'แผ่น ' + (ri + 1) + '/' + rAll.length : '');
        out.push(sheet(c, st, o, '4', html, true, lbl).replace('class="sheet land', 'class="sheet land attsheet'));
      });
    });
    return out.join('');
  }

  function p5(c, st, o) {
    const units = c.units || [];
    const rm = st.rounding;
    const head = `<tr><th rowspan="2" style="width:10mm">เลขที่</th><th rowspan="2">ชื่อ - สกุล</th>${units.map((u, i) => `<th><div class="vt">${u.isFinal ? esc(u.name) : 'หน่วยที่ ' + (i + 1)}</div></th>`).join('')}<th><div class="vt">ระหว่างเรียน</div></th><th><div class="vt">รวม</div></th><th rowspan="2" style="width:13mm">ระดับ<br>ผลการ<br>เรียน</th></tr>
      <tr>${units.map(u => `<th>${esc(u.weight)}</th>`).join('')}<th>${esc(c.ratio.mid)}</th><th>100</th></tr>`;
    return studentTable(c, st, o, '5', 'บันทึกผลการเรียน', head, s => {
      const r = Calc.studentResult(c, s.id, st);
      return `<tr><td class="n">${s.no}</td><td>${esc(studentName(s))}</td>${r.units.map(x => `<td class="n">${f(x.score, rm)}</td>`).join('')}<td class="n">${f(r.mid, rm)}</td><td class="n"><b>${f(r.total, rm)}</b></td><td class="c"><b>${r.grade}</b></td></tr>`;
    });
  }

  function pAssess(c, st, o, key, kind) {
    const A = ASSESS[kind];
    const head = `<tr><th style="width:10mm">เลขที่</th><th>ชื่อ - สกุล</th>${A.items.map((x, i) => `<th><div class="vt">${i + 1}. ${esc(x.replace('ความสามารถใน', ''))}</div></th>`).join('')}<th style="width:18mm">สรุปผล</th></tr>`;
    const legend = `<p class="legend-p">เกณฑ์: 3 = ดีเยี่ยม · 2 = ดี · 1 = ผ่าน · 0 = ไม่ผ่าน</p>`;
    return studentTable(c, st, o, key, 'ผลการประเมิน' + A.title, head, s => {
      const v = (c[kind] || {})[s.id] || [];
      const l = Calc.levelFromValues(v);
      return `<tr><td class="n">${s.no}</td><td>${esc(studentName(s))}</td>${A.items.map((x, i) => `<td class="n">${v[i] ?? ''}</td>`).join('')}<td class="c">${l === null ? '' : Calc.LEVEL_NAMES[l]}</td></tr>`;
    }).replace(/<\/table>/g, '</table>' + legend);
  }

  function p9(c, st, o) {
    const sm = Calc.summary(c, st), n = sm.n || 0;
    const G = ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0', 'ร', 'มส'];
    const MEAN = { '4': 'ดีเยี่ยม', '3.5': 'ดีมาก', '3': 'ดี', '2.5': 'ค่อนข้างดี', '2': 'น่าพอใจ', '1.5': 'พอใช้', '1': 'ผ่านเกณฑ์ขั้นต่ำ', '0': 'ต่ำกว่าเกณฑ์', 'ร': 'รอการตัดสิน', 'มส': 'ไม่มีสิทธิ์สอบ' };
    const pc = k => n ? (sm.counts[k] / n * 100) : 0;
    const fail = sm.counts['0'] + sm.counts['ร'] + sm.counts['มส'];
    const passN = n - fail, good = ['4', '3.5', '3'].reduce((a, k) => a + sm.counts[k], 0);
    const pct = x => n ? (x / n * 100).toFixed(2) : '0.00';
    // แผนภูมิแท่งแนวตั้ง (SVG มาตราส่วนจริง)
    const W = 180, H = 74, L = 14, B = 14, T = 7, R = 2;
    const maxC = Math.max(1, ...G.map(k => sm.counts[k]));
    const step = maxC <= 5 ? 1 : maxC <= 10 ? 2 : maxC <= 25 ? 5 : 10;
    const top = Math.ceil(maxC / step) * step;
    const pw = W - L - R, ph = H - T - B, bw = pw / G.length;
    const y = v => T + ph - v / top * ph;
    const dark = o.bw ? '#333' : '#1f2a5a', soft = o.bw ? '#9a9a9a' : '#b4b9cc';
    let grid = '';
    for (let v = 0; v <= top; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${v ? '#d6d6d6' : '#000'}" stroke-width="${v ? .15 : .3}"/><text x="${L - 1.5}" y="${y(v) + 1.2}" text-anchor="end" font-size="3.2">${v}</text>`;
    const bars = G.map((k, i) => {
      const v = sm.counts[k], x = L + i * bw + bw * .18, w = bw * .64, isF = ['0', 'ร', 'มส'].includes(k);
      return `${v ? `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(0) - y(v)}" fill="${isF ? soft : dark}" ${isF ? 'fill-opacity="1"' : ''}/>${isF ? `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(0) - y(v)}" fill="url(#hatch)"/>` : ''}` : ''}
        ${v ? `<text x="${x + w / 2}" y="${y(v) - 1.4}" text-anchor="middle" font-size="3.4" font-weight="700">${v}</text>` : ''}
        <text x="${x + w / 2}" y="${H - B + 4.6}" text-anchor="middle" font-size="3.6" font-weight="700">${k}</text>
        <text x="${x + w / 2}" y="${H - B + 8.6}" text-anchor="middle" font-size="2.9" fill="#444">${pc(k).toFixed(1)}%</text>`;
    }).join('');
    const chart = `<svg class="p9-chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#fff" stroke-width=".5"/></pattern></defs>${grid}${bars}<text x="3" y="${T + ph / 2}" font-size="3" transform="rotate(-90 3 ${T + ph / 2})" text-anchor="middle">จำนวนนักเรียน (คน)</text></svg>`;
    const lv = d => [3, 2, 1, 0].map(i => d.counts[i]);
    const kpi = (label, val, sub) => `<div class="kpi"><span>${label}</span><b>${val}</b><small>${sub}</small></div>`;
    const body = `<h2 class="doc">สรุปผลการเรียน</h2>
      <div class="kpis">${kpi('นักเรียนทั้งหมด', n, 'คน')}${kpi('ผ่านเกณฑ์', pct(passN) + '%', passN + ' คน')}${kpi('ระดับ 3 ขึ้นไป', pct(good) + '%', good + ' คน')}${kpi('ผลการเรียนเฉลี่ย', sm.gpa === null ? '–' : sm.gpa.toFixed(2), 'คะแนนเฉลี่ย ' + (sm.meanTotal === null ? '–' : sm.meanTotal.toFixed(2)))}</div>
      <div class="p9-sec">1. จำนวนและร้อยละของนักเรียนจำแนกตามระดับผลการเรียน</div>
      <table class="pt p9-t"><thead><tr><th>ระดับ</th>${G.map(k => `<th>${k}</th>`).join('')}<th>รวม</th></tr></thead><tbody>
        <tr><td class="c">จำนวน (คน)</td>${G.map(k => `<td class="n">${sm.counts[k]}</td>`).join('')}<td class="n"><b>${n}</b></td></tr>
        <tr><td class="c">ร้อยละ</td>${G.map(k => `<td class="n">${pc(k).toFixed(2)}</td>`).join('')}<td class="n"><b>100.00</b></td></tr></tbody></table>
      <div class="p9-sec">2. แผนภูมิแสดงการกระจายระดับผลการเรียน</div>
      <div class="p9-chart-box">${chart}<div class="p9-key"><span><i style="background:${dark}"></i> ผ่านเกณฑ์ (ระดับ 1 – 4)</span><span><i class="h" style="background:${soft}"></i> ต้องแก้ไขผลการเรียน (0 ร มส)</span></div></div>
      <div class="p9-sec">3. ผลการประเมินคุณลักษณะอันพึงประสงค์ การอ่าน คิดวิเคราะห์ และเขียน และสมรรถนะสำคัญ</div>
      <table class="pt p9-t"><thead><tr><th rowspan="2">การประเมิน</th><th colspan="2">ดีเยี่ยม</th><th colspan="2">ดี</th><th colspan="2">ผ่าน</th><th colspan="2">ไม่ผ่าน</th></tr><tr>${'<th>คน</th><th>ร้อยละ</th>'.repeat(4)}</tr></thead><tbody>
        ${[['คุณลักษณะอันพึงประสงค์', sm.attr], ['การอ่าน คิดวิเคราะห์ และเขียน', sm.rtw], ['สมรรถนะสำคัญของผู้เรียน', sm.comp]].map(([t, d]) => `<tr><td>${t}</td>${lv(d).map(v => `<td class="n">${v}</td><td class="n">${n ? (v / n * 100).toFixed(2) : '0.00'}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <div class="signs" style="grid-template-columns:1fr 1fr;margin-top:8mm"><div></div><div class="sign"><div>ลงชื่อ ......................................................</div><div>( ${esc(c.teacher || '......................................................')} )</div><div>ครูผู้สอน</div></div></div>`;
    return sheet(c, st, o, '9', body);
  }

  /* ปกหลัง: คำชี้แจงเกณฑ์การประเมิน */
  function pBack(c, st, o) {
    const logo = st.logo ? `<img class="logo" src="${st.logo}" alt="" style="width:20mm;height:20mm">` : '';
    const body = `<h2 class="doc" style="margin-top:2mm">คำชี้แจงเกณฑ์การวัดและประเมินผล</h2>
      <div class="p9-sec">1. เกณฑ์การตัดสินระดับผลการเรียน</div>
      <table class="pt back-t"><thead><tr><th style="width:24mm">ระดับผลการเรียน</th><th style="width:34mm">ช่วงคะแนน (ร้อยละ)</th><th>ความหมาย</th></tr></thead><tbody>
        ${GRADE_TABLE.map(([g, r, m]) => `<tr><td class="c"><b>${g}</b></td><td class="c">${r}</td><td>${m}</td></tr>`).join('')}</tbody></table>
      <div class="p9-sec">2. ผลการเรียนที่ต้องแก้ไข</div>
      <table class="pt back-t"><tbody>
        <tr><td class="c" style="width:24mm"><b>ร</b></td><td>รอการตัดสิน เนื่องจากนักเรียนยังส่งงานหรือรับการประเมินไม่ครบ ต้องดำเนินการให้เสร็จภายในภาคเรียนถัดไป</td></tr>
        <tr><td class="c"><b>มส</b></td><td>ไม่มีสิทธิ์เข้ารับการวัดผลปลาย${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'} เนื่องจากมีเวลาเรียนไม่ถึงร้อยละ ${esc(st.minAtt || 80)} ของเวลาเรียนทั้งหมด</td></tr>
        <tr><td class="c"><b>0</b></td><td>ผลการเรียนต่ำกว่าเกณฑ์ขั้นต่ำ ต้องสอนซ่อมเสริมและสอบแก้ตัว ผลการแก้ไขบันทึกในหน้า 10</td></tr></tbody></table>
      <div class="p9-sec">3. เกณฑ์การประเมินคุณลักษณะอันพึงประสงค์ การอ่าน คิดวิเคราะห์ และเขียน และสมรรถนะสำคัญ</div>
      <table class="pt back-t"><thead><tr><th>ระดับ</th><th>3 ดีเยี่ยม</th><th>2 ดี</th><th>1 ผ่าน</th><th>0 ไม่ผ่าน</th></tr></thead><tbody>
        <tr><td class="c">ความหมาย</td><td class="c">ปฏิบัติเป็นนิสัย<br>และเป็นแบบอย่างได้</td><td class="c">ปฏิบัติได้ดี<br>สม่ำเสมอ</td><td class="c">ปฏิบัติได้<br>ตามเกณฑ์ขั้นต่ำ</td><td class="c">ยังไม่ผ่าน<br>เกณฑ์ขั้นต่ำ</td></tr></tbody></table>
      <div class="p9-sec">4. เกณฑ์อื่น และสัญลักษณ์ที่ใช้ในแบบบันทึก</div>
      <table class="pt back-t"><tbody>
        <tr><td style="width:62mm">เกณฑ์ผ่านแต่ละหน่วยการเรียนรู้</td><td>ไม่ต่ำกว่าร้อยละ ${esc(st.minPct || 60)} ของคะแนนเต็มหน่วย</td></tr>
        <tr><td>เวลาเรียนขั้นต่ำ</td><td>ไม่ต่ำกว่าร้อยละ ${esc(st.minAtt || 80)} ของเวลาเรียนทั้งหมด</td></tr>
        <tr><td>อัตราส่วนคะแนน ระหว่างเรียน : ปลาย${levelOfCourse(c) === 'ป' ? 'ปี' : 'ภาค'}</td><td>${esc(c.ratio.mid)} : ${esc(c.ratio.final)}</td></tr>
        <tr><td>สัญลักษณ์บันทึกเวลาเรียน (หน้า 4)</td><td>${CHECK.replace('class="ck"', 'class="ck" style="display:inline-block;vertical-align:-.5mm"')} มาเรียน &nbsp; ข ขาด &nbsp; ล ลา &nbsp; ป ป่วย &nbsp; ส สาย &nbsp; น หนี</td></tr></tbody></table>
      <div class="back-foot">${logo}<b>${esc(st.school)}</b><span>${esc(st.area)}</span><small>${esc(c.code)} ${esc(c.name)} · ชั้น ${esc(classOf(c))} · ${esc(termLabel(c))}</small></div>`;
    return sheet(c, st, o, 'B', body).replace('<span>หน้า B</span>', '<span>ปกหลัง</span>');
  }

  function p10(c, st, o) {
    const rows = Calc.activeStudents(c).map(s => ({ s, r: Calc.studentResult(c, s.id, st) })).filter(x => ['0', 'ร', 'มส'].includes(x.r.grade));
    const body = `<h2 class="doc">บันทึกการแก้ไขผลการเรียน (0, ร, มส)</h2>
      <table class="pt"><thead><tr><th style="width:10mm">เลขที่</th><th>ชื่อ - สกุล</th><th style="width:14mm">ผลเดิม</th><th>สาเหตุ / วิธีการแก้ไข</th><th style="width:16mm">ผลหลังแก้</th><th style="width:26mm">วันที่</th><th style="width:30mm">ลงชื่อครูผู้สอน</th></tr></thead>
      <tbody>${rows.length ? rows.map(({ s, r }) => {
        const rem = (c.remedial || {})[s.id] || {};
        const why = rem.note || (r.grade === 'มส' ? 'เวลาเรียน ' + r.att.pct.toFixed(1) + '%' : r.grade === 'ร' ? 'งานค้าง ' + r.missing.length + ' ชิ้น' : '');
        return `<tr><td class="n">${s.no}</td><td>${esc(studentName(s))}</td><td class="c">${r.grade}</td><td>${esc(why)}</td><td class="c">${esc(rem.grade || '')}</td><td class="c">${esc(rem.date ? thaiDate(rem.date) : '')}</td><td></td></tr>`;
      }).join('') : '<tr><td colspan="7" class="c">ไม่มีนักเรียนที่ต้องแก้ไขผลการเรียน</td></tr>'}</tbody></table>`;
    return sheet(c, st, o, '10', body);
  }

  function render(c, st, o) {
    o = o || {};
    const want = o.pages || PAGES.map(p => p[0]);
    const map = {
      '1': p1, '2': p2, '3': p3, '3.1': p31, '4': p4, '5': p5,
      '6': (c, s, o) => pAssess(c, s, o, '6', 'attr'), '7': (c, s, o) => pAssess(c, s, o, '7', 'rtw'),
      '8': (c, s, o) => pAssess(c, s, o, '8', 'comp'), '9': p9, '10': p10, 'B': pBack
    };
    return PAGES.filter(p => want.includes(p[0])).map(p => map[p[0]](c, st, o)).join('');
  }
  return { render };
})();
