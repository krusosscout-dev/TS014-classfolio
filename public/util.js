/* สมุดวัดผล ปพ.5 · ตัวช่วยกลาง สถานะ และค่าเริ่มต้น */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = (p = '') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const thColl = new Intl.Collator('th');
const TH_DIGITS = false;

const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6M9 11h6"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v4h16v-4"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
  live: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
  chev: '<path d="M7 10l5 5 5-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h0M8 18h2M12 18h2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

const TABS = [
  ['overview', 'ภาพรวมวิชา', 'grid', 'indigo'],
  ['book', 'สมุดคะแนน', 'book', 'blue'],
  ['teach', 'บันทึกการสอน', 'clipboard', 'teal'],
  ['structure', 'โครงสร้างรายวิชา', 'layers', 'violet'],
  ['desc', 'คำอธิบายรายวิชา', 'pen', 'pink'],
  ['students', 'นักเรียน', 'users', 'cyan'],
  ['att', 'เวลาเรียน', 'clock', 'cyan'],
  ['assess', 'คุณลักษณะ/สมรรถนะ', 'star', 'amber'],
  ['results', 'ตัดเกรด', 'check', 'green'],
  ['print', 'เล่ม ปพ.5', 'print', 'rose'],
  ['log', 'ประวัติ', 'history', 'slate']
];

const ASSESS = {
  attr: { title: 'คุณลักษณะอันพึงประสงค์', items: ['รักชาติ ศาสน์ กษัตริย์', 'ซื่อสัตย์สุจริต', 'มีวินัย', 'ใฝ่เรียนรู้', 'อยู่อย่างพอเพียง', 'มุ่งมั่นในการทำงาน', 'รักความเป็นไทย', 'มีจิตสาธารณะ'] },
  rtw: { title: 'การอ่าน คิดวิเคราะห์ และเขียน', items: ['การอ่าน', 'การคิดวิเคราะห์', 'การเขียน'] },
  comp: { title: 'สมรรถนะสำคัญของผู้เรียน', items: ['ความสามารถในการสื่อสาร', 'ความสามารถในการคิด', 'ความสามารถในการแก้ปัญหา', 'ความสามารถในการใช้ทักษะชีวิต', 'ความสามารถในการใช้เทคโนโลยี'] }
};

const GRADE_TABLE = [
  ['4', '80 – 100', 'ผลการเรียนดีเยี่ยม'], ['3.5', '75 – 79', 'ผลการเรียนดีมาก'], ['3', '70 – 74', 'ผลการเรียนดี'],
  ['2.5', '65 – 69', 'ผลการเรียนค่อนข้างดี'], ['2', '60 – 64', 'ผลการเรียนน่าพอใจ'], ['1.5', '55 – 59', 'ผลการเรียนพอใช้'],
  ['1', '50 – 54', 'ผลการเรียนผ่านเกณฑ์ขั้นต่ำ'], ['0', '0 – 49', 'ผลการเรียนต่ำกว่าเกณฑ์ขั้นต่ำ']
];
const GROUPS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์และเทคโนโลยี', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'สุขศึกษาและพลศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'ภาษาต่างประเทศ'];
const PREFIXES = ['เด็กชาย', 'เด็กหญิง', 'ด.ช.', 'ด.ญ.', 'นาย', 'นางสาว', 'น.ส.', 'นาง'];
const PALETTES = [['khram', 'คราม', '#2c4a9a'], ['chad', 'ชาด', '#a3322a'], ['baitoey', 'ใบเตย', '#17704f'], ['anchan', 'อัญชัน', '#5a3aa6'], ['thong', 'ทองเหลือง', '#8a5a07']];
const FONTS = [['THSarabunPSK', 'TH SarabunPSK'], ['Sarabun', 'สารบรรณ (เว็บ)'], ['Noto Serif Thai', 'มีหัว (Noto Serif)'], ['Bai Jamjuree', 'ใบจามจุรี'], ['Chakra Petch', 'จักรเพชร'], ['Mitr', 'มิตร']];

function defaultSettings() {
  return {
    school: 'โรงเรียนวัดบางปูน',
    area: 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี',
    teacher: 'นรากรณ์ จูงาม',
    logo: '',
    signers: [
      { role: 'ครูผู้สอน', name: '' },
      { role: 'หัวหน้ากลุ่มสาระการเรียนรู้', name: '' },
      { role: 'หัวหน้างานวัดและประเมินผล', name: '' },
      { role: 'รองผู้อำนวยการฝ่ายวิชาการ', name: '' },
      { role: 'ผู้อำนวยการโรงเรียน', name: '' }
    ],
    scale: clone(Calc.DEFAULT_SCALE),
    minPct: 60, minAtt: 80, rounding: 'int', printFont: 'THSarabunPSK', v: 3,
    convert: 'ratio', ratioMid: 70, ratioFinal: 30,
    palette: 'khram', theme: 'system',
    templates: []
  };
}

function newUnit(name, weight) {
  return { id: newId('u'), name: name || 'หน่วยการเรียนรู้ใหม่', indicators: '', hours: 0, weight: weight || 0, slots: 0, minPct: null };
}

function defaultCourse(st, over) {
  st = st || S.settings || defaultSettings();
  const mid = Number(st.ratioMid) || 70, fin = Number(st.ratioFinal) || 30;
  const c = Object.assign({
    id: newId('c'), code: '', name: '', group: 'สังคมศึกษา ศาสนา และวัฒนธรรม', type: 'พื้นฐาน',
    grade: 'ม.1', room: '1', year: 2569, term: '1', hours: 60, credits: 1.5, teacher: st.teacher || '',
    level: 'auto', convert: st.convert || 'ratio', ratio: { mid, final: fin },
    descHtml: '', descFont: 'THSarabunPSK', descLine: 1.35, indicators: '',
    units: [newUnit('หน่วยการเรียนรู้ที่ 1', Math.round(mid / 2)), newUnit('หน่วยการเรียนรู้ที่ 2', mid - Math.round(mid / 2)),
      { id: 'final', name: 'สอบปลายภาค', isFinal: true, indicators: '', hours: 0, weight: fin, slots: 1 }],
    students: [], tasks: [], scores: {}, attendance: {}, attr: {}, rtw: {}, comp: {}, remedial: {},
    signDate: '', log: [], createdAt: Date.now(), updatedAt: Date.now()
  }, over || {});
  return c;
}

function levelOfCourse(c) { return c.level && c.level !== 'auto' ? c.level : Calc.levelOf(c.code); }
function termLabel(c) { return levelOfCourse(c) === 'ป' || c.term === 'ปี' ? 'ปีการศึกษา ' + c.year : 'ภาคเรียนที่ ' + c.term + '/' + c.year; }
function studentName(s) { return [s.prefix, s.first].filter(Boolean).join('') + (s.last ? ' ' + s.last : ''); }
function thaiDate(d) {
  if (!d) return '';
  const m = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.getDate() + ' ' + m[x.getMonth()] + ' ' + (x.getFullYear() + 543);
}
function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'เมื่อสักครู่';
  if (s < 3600) return Math.floor(s / 60) + ' นาทีที่แล้ว';
  if (s < 86400) return Math.floor(s / 3600) + ' ชั่วโมงที่แล้ว';
  const d = new Date(t);
  return thaiDate(d) + ' ' + d.toTimeString().slice(0, 5) + ' น.';
}

/* สถานะของแอปทั้งหมด */
const S = {
  user: null, backups: [], base: {}, baseSettings: null, unwatch: null, renderPending: false, settings: null, courses: [], cur: null, tab: 'overview', view: 'home', switcher: false,
  assessKind: 'attr', target: '2', printPages: null, printBW: false, watermark: 'none',
  undo: {}, redo: {}, pending: null, dirty: new Set(), saveState: 'saved', timer: null, setTimer: null
};
const cur = () => S.courses.find(c => c.id === S.cur) || null;
