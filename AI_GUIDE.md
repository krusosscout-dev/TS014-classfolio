# AI_GUIDE · สมุดวัดผล ปพ.5

คู่มือสำหรับ AI ที่แก้โค้ดต่อ เว็บแบบ static (ไม่มีขั้นตอน build) JavaScript ธรรมดา ไม่มีเฟรมเวิร์ก

## ลำดับการโหลด (index.html)
firebase-config.js → calc.js → sync.js → platform.js → util.js → demo.js → xlsx.js → print.js → views.js → timetable.js → live.js → export.js → term.js → catalog.js → roster.js → app.js
ทุกไฟล์ (ยกเว้น calc.js, sync.js, platform.js, xlsx.js) ประกาศฟังก์ชันระดับ global ใช้ร่วมกัน

## หน้าที่ของแต่ละไฟล์
- `Calc.attendance` คืน `{hours, absent, pct, pass, taught, came, sesPct, early}` — `pct` เทียบชั่วโมงเต็มของวิชา (ใช้ตัดสิน มส) · `sesPct` = มาเรียนกี่คาบจากคาบที่สอนแล้ว (เตือนล่วงหน้า) · `early` = สอนแล้ว ≥ 3 คาบ และ sesPct ต่ำกว่าเกณฑ์
- `calc.js` → `window.Calc` สูตรล้วน ไม่แตะ DOM: `unitResult`, `studentResult`, `slotPlan` (แจกงานลงช่องย่อย 1–10 ของหน้า 3.1), `neededFinal`, `summary`, `levelFromValues`
- `platform.js` → `window.Store` สองโหมด: `Local` (localStorage) และ `FB` (Firebase compat 10.12.2 + Firestore offline persistence) API: `init, signIn, signOut, listCourses, saveCourse, deleteCourse, getSettings, saveSettings`
- `sync.js` → `window.Sync.merge3(base, local, remote)` รวมข้อมูล 3 ทาง (array ที่มี id รวมตาม id) ใช้ตอนอีกเครื่องแก้พร้อมกัน · `replaceInPlace` แทนค่าโดยไม่เปลี่ยน reference
- `xlsx.js` → `window.XLSX.build/download(name, sheets)` เขียนไฟล์ .xlsx เอง (zip STORE + inlineStr) ไม่พึ่งไลบรารี sheet = `{name, title, rows, header, freeze:{r,c}, cols, center:[col], plainFrom}`
- `export.js` `excelSheets(c)` 4 ชีต: สรุปผลการเรียน · สมุดคะแนนดิบ · เวลาเรียนรายคาบ · บันทึกการสอน, `exportExcel(c)` (ปุ่ม `data-act="xlsx"` ในหน้าตัดเกรดและ ปพ.5)
- `term.js` เริ่มภาคเรียนใหม่ (`newTermDialog`, `startNextTerm`, `nextTerm`: 1→2 ปีเดิม, 2→1 ปีถัดไป, 'ปี'→'ปี' ปีถัดไป) และคลังภาคเรียนเก่า (`course.archived`) **รายการวิชาที่ใช้งานอยู่ต้องใช้ `activeCourses()` เสมอ** (แถบข้าง หน้าแรก Live Class Class Tools ตารางสอน งานใกล้กำหนด) ส่วน `S.courses` คือทั้งหมดรวมคลัง
- `catalog.js` `SUBJECT_CATALOG` รายวิชากลุ่มสังคมของโรงเรียนวัดบางปูน (ป.1–6 รายปี, ม.1–3 แยกภาค) ใช้ในกล่องสร้างรายวิชา (`catalogPicker`/`bindCatalogPicker`) และเสนอรหัสภาคถัดไปตอนเริ่มภาคเรียนใหม่ (`catalogNext`) · สัดส่วนเริ่มต้นแยก `ratioMidP/ratioFinalP` (ประถม) กับ `ratioMid/ratioFinal` (มัธยม) · `fitUnitWeights(c)` ปรับคะแนนหน่วยให้รวมเท่าสัดส่วนระหว่างเรียน
- `roster.js` ทะเบียนนักเรียนกลาง `settings.roster = {classes:[{id,grade,room,students:[...]}], graduated:[...], undo}` · นักเรียนในรายวิชาใช้ **id เดียวกับทะเบียน** (`courseStudentsFromRoster`, `syncCourseFromRoster` เพิ่ม/อัปเดต ไม่ลบ) · เลื่อนชั้น `rosterPromoteDialog` (ป.6→ม.1 เลือกได้, ม.3/ม.6 จบ) เก็บ `undo` ไว้ย้อนได้ 1 ครั้ง · `classOf(c)` แสดงชั้น/ห้อง (ไม่มีห้อง = แค่ชั้น) · `flushSettings()` บันทึกตั้งค่าที่ค้างตอนปิด/สลับแท็บ
- หน่วยสอบกลางภาค `unit.isMid` (นับรวมในระหว่างเรียน ไม่นับเลขหน่วย) · ใช้ `unitTag(c,u,'short'|'long'|'th'|'no')` และ `unitNo(c,u)` ทุกที่ที่แสดงชื่อหน่วย ห้ามใช้ index ตรง ๆ
- สำรองข้อมูล: meta `{id, at, n, kind:'day'|'pre'|'term', label?}` · `bkPlan(list)` เลือกฉบับที่เก็บ (รายวัน 14 · รายสัปดาห์ 8 · สิ้นเดือน 12 · term ถาวร; โหมด local 7 วัน + term 4) · `saveBackupNow('term', label)` เรียกก่อนเริ่มภาคเรียนใหม่
- `util.js` ตัวช่วย (`$`, `esc`, `newId`, `ico`) ค่าคงที่ (`TABS`, `ASSESS`, `GROUPS`, `PALETTES`) ค่าเริ่มต้น (`defaultSettings`, `defaultCourse`) และสถานะ `S`
- `views.js` สร้าง HTML ของแต่ละแท็บ (`viewOverview`, `viewBook`, ... ) + `checkPages` (ความพร้อม 11 หน้า) + `risksOf`
- `print.js` → `Print.render(course, settings, {pages, bw, wm})` คืน HTML ของแผ่น A4 (`.sheet`, แนวนอนใช้ `.sheet.land` + `@page land`)
- `app.js` โครงหน้า `render()`, การบันทึก (`touch` → debounce → `flush`), เลิกทำ (`snap/undo/redo` เก็บ JSON ทั้งวิชา สูงสุด 80 ขั้น), กล่องโต้ตอบ (`dialog`), คำสั่งปุ่มทั้งหมดใน `ACT` (ปุ่มใช้ `data-act`/`data-v`), Ctrl+K (`openPalette`), การวางจาก Excel, ตั้งค่า

## การผูกข้อมูลกับช่องกรอก (event delegation ใน app.js)
| attribute | เขียนลงที่ |
|---|---|
| `data-sc="taskId|studentId"` | `course.scores[taskId][studentId]` |
| `data-f="field"` | `course[field]` |
| `data-u="unitId|field"` | `course.units[].field` |
| `data-st="studentId|field"` | `course.students[].field` |
| `data-att="studentId"` | `course.attendance[studentId]` (ชั่วโมงที่ขาด) |
| `data-as="attr|rtw|comp|studentId|index"` | `course[kind][studentId][index]` (0–3) |
| `data-rem="studentId|grade/note"` | `course.remedial` |
| `data-set`, `data-sg`, `data-scale` | `S.settings` |
ช่องตารางที่เลื่อนด้วยลูกศรต้องมี `data-r` `data-c`

## โครงสร้างข้อมูล
Firestore: `teachers/{uid}/courses/{courseId}` (ข้อมูลวิชา ไม่รวมบันทึกรายคาบ) · `teachers/{uid}/courses/{courseId}/sessions/{sessionId}` (1 เอกสารต่อ 1 คาบ ป้องกันชนเพดาน 1 MB) · `teachers/{uid}/meta/settings` · `meta/backups` + `backups/{id}_{part}` (แบ่งชิ้นละ ≤700,000 ตัวอักษร)
`Store.FB.saveCourse` เขียนเฉพาะส่วนที่เปลี่ยนแบบ batch · `Store.watch(onCourse, onSettings)` ฟัง onSnapshot (ข้าม hasPendingWrites) แล้ว app.js รวมด้วย `Sync.merge3` เทียบกับ `S.base` · ถ้าครูกำลังพิมพ์หรือเปิดกล่องโต้ตอบ ระบบเลื่อนการวาดหน้าใหม่ (`scheduleRender`)
```
course = { id, code, name, group, type, grade, room, year, term('1'|'2'|'ปี'), hours, credits, teacher,
  level('auto'|'ป'|'ต'), convert('ratio'|'weighted'), ratio:{mid, final},
  units:[{id, name, indicators, hours, weight, slots, minPct, isFinal?}],   // หน่วยสอบปลายภาค id='final'
  tasks:[{id, name, full, unit, weight, bonus}], scores:{taskId:{studentId: number|''}},
  students:[{id, no, code, prefix, first, last, status:'active'|'out'}],
  attendance:{sid: absentHours}, attr/rtw/comp:{sid:[0..3]}, remedial:{sid:{grade, note, date}},
  sessions:[{id, date, period, unit, topic, note, att:{sid:'มา'|'ขาด'|'ลา'|'ป่วย'|'สาย'|'หนี'}, bonus:{sid:n}, tasks:[taskId]}],  // เก็บแยกเป็นเอกสารย่อย
  descHtml, descFont, descLine, descSize, showInd, indicators, signDate, log:[{t,text}], demo?, archived?, archivedAt?, prevId? }
```
ห้ามใช้ array ซ้อน array (Firestore ไม่รองรับ)

## ตารางสอน (timetable.js)
- เก็บใน `settings.tt = { days:[1..7], plan:{start,len,count,brk,lunchLen}, hrsPerPeriod, weeksTerm, weeksYear, periods:[{s,e}], lunchAfter, cells:{'วัน-คาบ': {course, place} | {text, place}}, classes:{'ม.1/1': {'วัน-คาบ': {subj, teacher}}}, extraRooms }` วัน 1–5 = จันทร์–ศุกร์
- ตารางเรียนรายห้อง ดึงวิชาที่ครูสอนจาก `cells` อัตโนมัติ วิชาอื่นครูพิมพ์เอง · หน้าแรกมีการ์ด "ตารางสอนวันนี้" (`todayCard`)

## Live Class / บันทึกการสอน / Class Tools (live.js)
- `course.sessions = [{id, date:'YYYY-MM-DD', period, unit, topic, note, att:{sid:'ขาด'|'ลา'|'ป่วย'|'สาย'|'หนี'} (ไม่มี = มา), bonus:{sid:n}, bonusLog:[{sid,n,reason,t}], tasks:[taskId]}]`
- ปพ.5 มีหน้า B = ปกหลัง (คำชี้แจงเกณฑ์) · หน้า 9 = KPI + ตาราง + แผนภูมิแท่ง SVG + สรุปการประเมิน · คำอธิบายรายวิชามี `descSize` (ขนาดทั้งหน้า) และ `showInd`
- ปพ.5 หน้า 4: ถ้ามี sessions พิมพ์เป็นตารางรายคาบแนวนอน (✓ มา, ข ล ป ส น) แผ่นละ ≤ 26 คาบ × ≤ 28 คน แบ่งเท่ากัน + สรุปรายคน · ไม่มี sessions ใช้ตารางสรุปแบบเดิม · พิมพ์ทุกครั้งผ่าน `printNow()` (กันหน้าว่างแผ่นแรก)
- เวลาเรียน: `Calc.attendance` = ชั่วโมงขาดจาก sessions (ขาด ลา ป่วย หนี × `tt.hrsPerPeriod`) + `course.attendance[sid]` (ปรับเพิ่มเอง)
- คะแนนพิเศษรายคาบ: `syncBonus(c)` รวมเป็นงาน `auto:'bonus'` ต่อหน่วยในสมุดคะแนน (ช่องอ่านอย่างเดียว) · เหตุผลอยู่ใน `settings.bonusReasons`, `settings.bonusPts`
- มอบงานใน Live Class → เพิ่ม task (`due`, `assigned`, `session`) · หน้าแรกมีการ์ดงานใกล้ถึงกำหนด (`dueCard`)
- จับกลุ่ม: `course.groupSets` (เก็บ 10 ชุดล่าสุด) ชุดล่าสุดใช้ให้คะแนนพิเศษทั้งกลุ่มใน Live Class
- คำสั่งอยู่ใน `LIVE_ACT` (รวมเข้า `ACT`)

## หน้าตา
- เดสก์ท็อป: แถบเมนูซ้าย (`.side`) ปุ่มเมนูมีกรอบชัดทุกปุ่ม · จอ ≤ 920px: แถบล่าง 5 ช่อง (หน้าแรก คะแนน ตัดเกรด ปพ.5 เพิ่มเติม) ปุ่มเพิ่มเติมเปิดแผ่นเมนูทั้งหมด (`moreSheet`)
- หน้าแรก `S.view='home'` (`viewHome`), ตั้งค่า `'settings'`, เมนูวิชา `'course'` + `S.tab`
- ตัวเลขสีส้ม (`.badge`) = จำนวนหน้า ปพ.5 ที่ยังไม่ครบ ของเมนูนั้น (จาก `checkPages`)
- เล่มพิมพ์ใช้ `--font-print` = TH SarabunPSK (public/fonts)
- เปิดเว็บ → `renderLanding()` หน้าแรกสุดหน้าเดียว → ปุ่มเข้าใช้งาน → `loadAll()` → หน้าแรก
- สำรองอัตโนมัติ: `autoBackup()` วันละครั้ง `Store.saveBackup/listBackups/getBackup/deleteBackup` (Firestore `backups/{id}` + `meta/backups`) กู้คืนที่ตั้งค่า
- เกณฑ์ระดับผลการเรียนคงที่ตามหลักสูตรแกนกลางฯ 2551 (`GRADE_TABLE`, `Calc.DEFAULT_SCALE`) · คะแนนปัดจำนวนเต็มเสมอ

## ใช้ดีทุกอุปกรณ์ (ต้องรักษาไว้ทุกครั้งที่แก้)
- ทดสอบ 3 ขนาด: มือถือ 375px, แท็บเล็ต 820px, คอม 1366px · ห้ามหน้าเว็บเลื่อนแนวนอน ยกเว้นในกล่องตาราง (`.tbl-wrap`)
- ≤ 920px: ซ่อนเมนูซ้าย ใช้แถบล่าง `.dock` 6 ปุ่ม (หน้าแรก · Live Class · คะแนน · ตัดเกรด · ปพ.5 · เพิ่มเติม) + แผ่นเมนูทั้งหมด
- ≤ 640px: ตารางที่มีช่องกรอก (`.tbl.stack` + `data-label` ทุก td) กลายเป็นการ์ดทีละแถว · ตารางสอนเป็นแบบเลือกวัน (`.ttm`) · หน้ากระดาษคำอธิบายรายวิชาเต็มจอ · แผ่น ปพ.5 ย่อพอดีจอด้วย `fitSheets()`
- ชื่อนักเรียนในตารางใช้ `nameCell()` (มือถือแสดง 2 บรรทัด)

## กฎการคำนวณ
- `settings.rounding = 'int'` (ค่าเริ่มต้น): คะแนนหน่วยปัดเป็นจำนวนเต็ม ช่องย่อยหน้า 3.1 ใช้ `distributeInt` ให้ผลรวมเท่าคะแนนหน่วยเสมอ
- ช่องว่าง = ยังไม่ส่ง → ระดับ "ร" · กรอก 0 = ได้ 0
- เวลาเรียน < `minAtt` (80%) → "มส" (มาก่อน ร)
- คะแนนหน่วย: ratio = Σคะแนนได้/Σคะแนนเต็ม × น้ำหนักหน่วย · weighted = Σ(ได้/เต็ม × น้ำหนักงาน)/Σน้ำหนักงาน × น้ำหนักหน่วย
- คะแนนพิเศษ (`bonus`) เติมช่องที่ยังไม่เต็ม ไม่เกินน้ำหนักหน่วย ไม่นับเป็นงานค้าง
- คะแนนดิบที่เกินคะแนนเต็มถูกตัดเท่าคะแนนเต็ม (แสดงสีแดงเตือน)

## แผนระยะถัดไป
2) เช็คชื่อรายคาบ (ตารางสอน → มา/ขาด/ลา/หนี → รวมเข้า `attendance`), ตัดคะแนนความประพฤติ, หน้านักเรียนดูงานค้าง (เก็บเลขบัตรแบบ hash SHA-256 + เกลือ, เอกสารสาธารณะ `pending/{hash}` เฉพาะรายการงานค้าง ไม่มีคะแนน)
3) สายอนุมัติออนไลน์ ลงนาม ล็อกเอกสาร, ใบแสดงผลการเรียนลายน้ำ
4) ผู้ใช้หลายระดับ (SuperAdmin/Admin/Teacher), นำเข้า Google Sheet, กราฟรายงาน A4

## ทดสอบ
สคริปต์ Playwright ใน scratchpad: audit.py/audit2.py (3 ขนาดจอ), fb/test.py (Firebase จำลอง), fb/two.py (2 เครื่องพร้อมกัน), fb/legacy.py (ย้ายข้อมูลเก่า), p4test.py (ความสูงหน้าพิมพ์), xl.py (Excel), nt.py (ภาคเรียนใหม่)
เปิด `public/index.html` ตรงจากไฟล์ได้ (โหมดทดลอง + ข้อมูลตัวอย่าง) · ตรวจสูตรด้วย node: `node -e "global.window=globalThis;eval(require('fs').readFileSync('public/calc.js','utf8'));..."`
