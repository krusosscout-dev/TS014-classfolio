/* ClassFolio · คลังสื่อการสอน
   เก็บเป็นลิงก์ (YouTube, Google Drive/Slides, Canva, Wordwall, Quizizz, เว็บ ฯลฯ) ใน settings.media
   แนบให้คาบที่สอนได้ใน se.media = [id สื่อ] · ดูย้อนได้ว่าสื่อแต่ละชิ้นใช้สอนคาบไหน ชั้นไหน */
const MEDIA_KINDS = [
  ['youtube', 'วิดีโอ YouTube', 'rose', /youtu\.?be/i],
  ['slides', 'สไลด์', 'amber', /docs\.google\.com\/presentation|\.pptx?(\?|$)|slideshare|pitch\.com/i],
  ['canva', 'Canva', 'cyan', /canva\.(com|link)/i],
  ['game', 'เกม/แบบทดสอบ', 'violet', /wordwall|quizizz|kahoot|blooket|liveworksheets|forms\.gle|docs\.google\.com\/forms|quizlet|gimkit/i],
  ['doc', 'เอกสาร/ใบงาน', 'blue', /docs\.google\.com\/document|\.pdf(\?|$)|\.docx?(\?|$)/i],
  ['drive', 'Google Drive', 'green', /drive\.google\.com/i],
  ['image', 'รูปภาพ', 'pink', /\.(png|jpe?g|gif|webp)(\?|$)/i],
  ['web', 'เว็บไซต์', 'slate', /./]
];
function mediaKind(url) { return (MEDIA_KINDS.find(k => k[3].test(url || '')) || MEDIA_KINDS[MEDIA_KINDS.length - 1]); }
function mediaKindOf(m) { return MEDIA_KINDS.find(k => k[0] === m.kind) || mediaKind(m.url); }
function mediaList() { return S.settings.media || []; }
function mediaFind(id) { return mediaList().find(m => m.id === id) || null; }
function mediaUrl(u) { u = String(u || '').trim(); if (!u) return ''; return /^https?:\/\//i.test(u) ? u : 'https://' + u; }
/* แปลงลิงก์เป็นแบบฝังเพื่อเปิดดูในระบบ (ไม่รู้จัก = ลองฝังตรง ๆ ถ้าเว็บนั้นไม่ยอมให้ฝัง จะมีปุ่มเปิดแท็บใหม่) */
function mediaEmbed(url) {
  const u = String(url || ''); let m;
  if ((m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{6,})/i))) {
    const t = (u.match(/[?&]t=(\d+)/) || [])[1]; return { type: 'frame', src: 'https://www.youtube.com/embed/' + m[1] + '?rel=0&modestbranding=1' + (t ? '&start=' + t : ''), sure: true };
  }
  if ((m = u.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/i))) return { type: 'frame', src: 'https://docs.google.com/presentation/d/' + m[1] + '/embed?start=false&loop=false', sure: true };
  if ((m = u.match(/docs\.google\.com\/(document|spreadsheets)\/d\/([\w-]+)/i))) return { type: 'frame', src: 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/preview', sure: true };
  if ((m = u.match(/docs\.google\.com\/forms\/d\/(e\/)?([\w-]+)/i))) return { type: 'frame', src: 'https://docs.google.com/forms/d/' + (m[1] || '') + m[2] + '/viewform?embedded=true', sure: true };
  if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/i))) return { type: 'frame', src: 'https://drive.google.com/file/d/' + m[1] + '/preview', sure: true };
  if ((m = u.match(/canva\.com\/design\/([\w-]+)\/([\w-]+)/i))) return { type: 'frame', src: 'https://www.canva.com/design/' + m[1] + '/' + m[2] + '/view?embed', sure: true };
  if ((m = u.match(/canva\.com\/design\/([\w-]+)/i))) return { type: 'frame', src: 'https://www.canva.com/design/' + m[1] + '/view?embed', sure: false };
  if ((m = u.match(/wordwall\.net\/(?:[a-z]{2}\/)?(?:embed\/)([\w]+)/i))) return { type: 'frame', src: u, sure: true };
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u)) return { type: 'img', src: u, sure: true };
  if (/\.pdf(\?|$)/i.test(u)) return { type: 'frame', src: u, sure: false };
  return { type: 'frame', src: u, sure: false };
}
function mediaViewer(m) {
  const k = mediaKindOf(m), e = mediaEmbed(m.url);
  const old = $('#mdView'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'mdView'; box.className = 'md-view'; box.dataset.k = k[0]; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', m.title);
  box.innerHTML = `<div class="mv-bar" data-hue="${k[2]}"><span class="dot"></span><span class="mv-t"><b>${esc(m.title)}</b><small>${esc(k[1])}</small></span>
      <a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener">${ico('ext')} เปิดในแท็บใหม่</a><button class="btn sm pri" data-mv-x>ปิด ✕</button></div>
    <div class="mv-body">${e.type === 'img' ? `<img src="${esc(e.src)}" alt="${esc(m.title)}">` : `<iframe src="${esc(e.src)}" title="${esc(m.title)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`}</div>
    ${e.sure ? '' : `<p class="mv-tip">${ico('alert')} บางเว็บไม่อนุญาตให้เปิดซ้อนในระบบอื่น ถ้าหน้าจอว่างหรือขึ้นว่าปฏิเสธการเชื่อมต่อ ให้กด "เปิดในแท็บใหม่"</p>`}`;
  document.body.appendChild(box);
  const close = () => { box.remove(); document.removeEventListener('keydown', esc1); };
  const esc1 = ev => { if (ev.key === 'Escape') close(); };
  box.querySelector('[data-mv-x]').onclick = close; document.addEventListener('keydown', esc1);
}
/* คาบที่ใช้สื่อนี้ ทุกวิชา ทุกภาคเรียน */
function mediaUsage(id) {
  const out = [];
  S.courses.forEach(c => (c.sessions || []).forEach(se => { if ((se.media || []).includes(id)) out.push({ c, se }); }));
  return out.sort((a, b) => (b.se.date + String(b.se.period).padStart(2, '0')).localeCompare(a.se.date + String(a.se.period).padStart(2, '0')));
}
function mediaGradeOf(c) { return c ? String(c.grade || '').trim() : ''; }

/* ---------------- หน้าคลังสื่อ ---------------- */
function viewMedia() {
  const M = S.mediaUi = S.mediaUi || { q: '', g: '' };
  const all = mediaList(), q = (M.q || '').trim().toLowerCase();
  const list = all.filter(m => (!M.g || (m.grades || []).includes(M.g) || !(m.grades || []).length) && (!q || (m.title + ' ' + (m.note || '') + ' ' + m.url).toLowerCase().includes(q)));
  const grades = typeof CATALOG_GRADES !== 'undefined' ? CATALOG_GRADES : ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];
  const card = m => {
    const k = mediaKindOf(m), use = mediaUsage(m.id);
    return `<article class="md-card" data-hue="${k[2]}">
      <button class="md-open" data-act="mediaView" data-v="${m.id}" title="เปิดดูสื่อ"><span class="md-ic">${ico(k[0] === 'youtube' ? 'film' : k[0] === 'web' ? 'link' : k[0] === 'image' ? 'grid' : k[0] === 'game' ? 'dice' : k[0] === 'slides' ? 'layers' : 'book')}</span>
        <span class="md-t"><small>${esc(k[1])}</small><b>${esc(m.title)}</b></span><span class="md-play">${ico('film')} เปิดดู</span></button>
      ${m.note ? `<p class="md-note">${esc(m.note)}</p>` : ''}
      <div class="md-tags">${(m.grades || []).length ? m.grades.map(g => `<span class="chip">${esc(g)}</span>`).join('') : '<span class="chip ghost">ทุกชั้น</span>'}</div>
      <details class="md-use"><summary>${use.length ? `ใช้สอนแล้ว ${use.length} คาบ` : 'ยังไม่ได้แนบให้คาบไหน'}</summary>
        ${use.length ? `<ul>${use.slice(0, 30).map(x => `<li><button class="linkish" data-act="mediaGoSe" data-v="${x.c.id}|${x.se.date}|${x.se.period}"><b>${esc(x.c.code)} ${esc(classOf(x.c))}</b> · ${esc(thaiDate(x.se.date))} คาบ ${x.se.period}${x.se.topic ? ' · ' + esc(x.se.topic) : ''}</button></li>`).join('')}</ul>` : '<p class="note">แนบได้ที่ Live Class › บันทึกการสอนคาบนี้ › สื่อการสอนคาบนี้</p>'}
      </details>
      <div class="md-act">${S.live && S.live.cid ? `<button class="btn sm" data-act="mediaAttachOne" data-v="${m.id}">${ico('plus')} แนบให้คาบที่เปิดอยู่</button>` : ''}<button class="btn sm ghost" data-act="mediaEdit" data-v="${m.id}">${ico('pen')} แก้</button></div>
    </article>`;
  };
  return `<div class="card bar md-bar">
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <input class="inp" id="mdQ" type="search" placeholder="ค้นหาสื่อ ชื่อ หรือหมายเหตุ" value="${esc(M.q || '')}" style="flex:1 1 220px">
        <button class="btn pri" data-act="mediaAdd">${ico('plus')} เพิ่มสื่อ</button>
      </div>
      <div class="md-grades"><button class="${!M.g ? 'on' : ''}" data-act="mediaGrade" data-v="">ทุกชั้น</button>${grades.map(g => `<button class="${M.g === g ? 'on' : ''}" data-act="mediaGrade" data-v="${g}">${g}</button>`).join('')}</div>
      ${S.live && S.live.cid && liveCourse() ? `<p class="note" style="margin:8px 0 0">คาบที่เปิดอยู่: <b>${esc(liveCourse().code)} ${esc(classOf(liveCourse()))}</b> · ${esc(thaiDate(S.live.date))} คาบ ${S.live.period}</p>` : ''}
    </div>
    ${all.length ? (list.length ? `<div class="md-grid">${list.map(card).join('')}</div>` : '<div class="card empty"><h3>ไม่พบสื่อที่ตรงกับการค้นหา</h3></div>')
      : `<div class="card empty">${ico('film')}<h3>ยังไม่มีสื่อในคลัง</h3><p>เก็บลิงก์สื่อที่ใช้สอน เช่น คลิป YouTube สไลด์ Google Slides งาน Canva เกม Wordwall หรือไฟล์ใน Google Drive แล้วแนบให้แต่ละคาบได้</p><button class="btn pri" data-act="mediaAdd">${ico('plus')} เพิ่มสื่อชิ้นแรก</button></div>`}`;
}

/* ---------------- กล่องเพิ่ม/แก้สื่อ ---------------- */
function mediaDialog(id, after) {
  const old = id ? mediaFind(id) : null, lc = (S.view === 'live' || S.view === 'media') ? liveCourse() : cur();
  const m = old ? clone(old) : { title: '', url: '', note: '', grades: lc && mediaGradeOf(lc) ? [mediaGradeOf(lc)] : [] };
  const grades = typeof CATALOG_GRADES !== 'undefined' ? CATALOG_GRADES : [];
  const d = dialog(old ? 'แก้สื่อการสอน' : 'เพิ่มสื่อการสอน', `
    <label class="field"><span>ลิงก์สื่อ</span><input class="inp" id="mdUrl" type="url" inputmode="url" placeholder="วางลิงก์ เช่น https://youtu.be/... หรือ https://www.canva.com/..." value="${esc(m.url)}"></label>
    <p class="note" id="mdKind" style="margin:-4px 0 8px"></p>
    <label class="field"><span>ชื่อสื่อ</span><input class="inp" id="mdTitle" placeholder="เช่น คลิปการปกครองระบอบประชาธิปไตย" value="${esc(m.title)}"></label>
    <div class="field"><span>ใช้กับชั้น (เลือกได้หลายชั้น ไม่เลือก = ทุกชั้น)</span><div class="md-grades pick">${grades.map(g => `<button type="button" data-g="${g}" class="${(m.grades || []).includes(g) ? 'on' : ''}">${g}</button>`).join('')}</div></div>
    <label class="field"><span>หมายเหตุ (ไม่บังคับ)</span><textarea class="inp" id="mdNote" rows="2" placeholder="เช่น ใช้นำเข้าสู่บทเรียน 5 นาที">${esc(m.note || '')}</textarea></label>
    <p class="note">ระบบเก็บเป็นลิงก์ ถ้าเป็นไฟล์ในเครื่อง ให้อัปโหลดขึ้น Google Drive หรือ YouTube ก่อน แล้วคัดลอกลิงก์มาวาง</p>`,
    [...(old ? [{ label: 'ลบจากคลัง', cls: 'ghost danger left', fn: () => { confirmBox('ลบสื่อนี้', 'ลบ "' + esc(old.title) + '" ออกจากคลัง คาบที่เคยแนบไว้จะไม่แสดงสื่อนี้อีก', 'ลบ', () => { S.settings.media = mediaList().filter(x => x.id !== old.id); touchSettings(); render(); toast('ลบสื่อแล้ว'); }); } }] : []),
    { label: 'ยกเลิก', cls: 'ghost' }, { label: old ? 'บันทึก' : 'เพิ่มเข้าคลัง', cls: 'pri', fn: dd => {
      const url = mediaUrl($('#mdUrl', dd).value), title = $('#mdTitle', dd).value.trim();
      if (!url) { toast('วางลิงก์สื่อก่อน'); return false; }
      const item = Object.assign(old || { id: newId('md'), at: Date.now() }, { url, title: title || url.replace(/^https?:\/\//, '').slice(0, 60), note: $('#mdNote', dd).value.trim(), grades: [...dd.querySelectorAll('[data-g].on')].map(b => b.dataset.g), kind: mediaKind(url)[0] });
      if (!old) S.settings.media = [item].concat(mediaList());
      touchSettings(); if (after) after(item); render(); toast(old ? 'บันทึกสื่อแล้ว' : 'เพิ่มเข้าคลังสื่อแล้ว');
    } }]);
  const showKind = () => { const u = $('#mdUrl', d).value.trim(); $('#mdKind', d).textContent = u ? 'ชนิด: ' + mediaKind(u)[1] : ''; };
  $('#mdUrl', d).addEventListener('input', showKind); showKind();
  d.querySelectorAll('[data-g]').forEach(b => b.onclick = () => b.classList.toggle('on'));
}

/* ---------------- สื่อของคาบ (ใน Live Class และห้อง 3 มิติ) ---------------- */
function seMedia(se) { return ((se && se.media) || []).map(mediaFind).filter(Boolean); }
function mediaBlock(c, se) {
  const list = seMedia(se);
  return `<div class="md-se">${list.map(m => { const k = mediaKindOf(m); return `<div class="md-chip" data-hue="${k[2]}"><button class="md-chip-open" data-act="mediaView" data-v="${m.id}" title="เปิดดู ${esc(m.title)}"><span class="dot"></span><b>${esc(m.title)}</b><small>${esc(k[1])} · แตะเพื่อเปิดดู</small>${ico('film')}</button><a class="ext" href="${esc(m.url)}" target="_blank" rel="noopener" title="เปิดในแท็บใหม่" aria-label="เปิดในแท็บใหม่">${ico('ext')}</a><button class="x" data-act="mediaDetach" data-v="${m.id}" aria-label="เอาออกจากคาบนี้">✕</button></div>`; }).join('') || '<p class="note" style="margin:0">ยังไม่ได้แนบสื่อให้คาบนี้</p>'}
    <div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-act="mediaPick">${ico('film')} แนบสื่อจากคลัง</button><button class="btn sm ghost" data-act="mediaNewForSe">${ico('plus')} สื่อใหม่</button></div></div>`;
}
function mediaPicker(c) {
  const g = mediaGradeOf(c), se0 = findSession(c, S.live.date, S.live.period), have = new Set((se0 && se0.media) || []);
  let allG = !g;
  const d = dialog('แนบสื่อให้คาบนี้', `<p class="note" style="margin-top:0">${esc(c.code)} ${esc(classOf(c))} · ${esc(thaiDate(S.live.date))} คาบ ${S.live.period}</p>
    <div class="row" style="gap:8px;margin-bottom:8px"><input class="inp" id="mpQ" type="search" placeholder="ค้นหา" style="flex:1">${g ? `<label class="row small"><input type="checkbox" id="mpAll"> แสดงทุกชั้น</label>` : ''}</div>
    <div class="mp-list" id="mpList"></div>`,
    [{ label: '+ สื่อใหม่', cls: 'ghost left', fn: () => { mediaDialog(null, it => mediaAttach(c, [it.id])); } }, { label: 'ยกเลิก', cls: 'ghost' }, { label: 'แนบสื่อที่เลือก', cls: 'pri', fn: dd => {
      const ids = [...dd.querySelectorAll('[data-mp]:checked')].map(x => x.dataset.mp);
      mediaAttach(c, ids, true);
    } }], { wide: true });
  const draw = () => {
    const q = ($('#mpQ', d).value || '').trim().toLowerCase();
    const list = mediaList().filter(m => (allG || !(m.grades || []).length || (m.grades || []).includes(g)) && (!q || (m.title + ' ' + (m.note || '')).toLowerCase().includes(q)));
    $('#mpList', d).innerHTML = list.map(m => { const k = mediaKindOf(m), n = mediaUsage(m.id).length; return `<label class="mp-row" data-hue="${k[2]}"><input type="checkbox" data-mp="${m.id}" ${have.has(m.id) ? 'checked' : ''}><span class="dot"></span><span class="t"><b>${esc(m.title)}</b><small>${esc(k[1])} · ${(m.grades || []).join(', ') || 'ทุกชั้น'}${n ? ' · ใช้แล้ว ' + n + ' คาบ' : ''}</small></span></label>`; }).join('')
      || `<p class="note">${mediaList().length ? 'ไม่มีสื่อของชั้นนี้ ลองติ๊ก "แสดงทุกชั้น"' : 'คลังยังว่าง กด "+ สื่อใหม่" เพื่อเพิ่ม'}</p>`;
  };
  $('#mpQ', d).addEventListener('input', draw);
  const all = $('#mpAll', d); if (all) all.onchange = () => { allG = all.checked; draw(); };
  draw();
}
/* replace = true: ตั้งรายการสื่อของคาบตามที่เลือกในกล่อง (เอาที่ไม่ได้ติ๊กออก) */
function mediaAttach(c, ids, replace) {
  snap(c); const se = ensureSession(c);
  se.media = replace ? ids.slice() : [...new Set((se.media || []).concat(ids))];
  touch(c); render(); toast(se.media.length ? 'แนบสื่อให้คาบนี้แล้ว ' + se.media.length + ' รายการ' : 'ไม่มีสื่อในคาบนี้');
}

const MEDIA_ACT = {
  mediaView(v) { const m = mediaFind(v); if (m) mediaViewer(m); },
  media() { S.view = 'media'; render(); window.scrollTo(0, 0); },
  mediaAdd() { mediaDialog(null); },
  mediaEdit(v) { mediaDialog(v); },
  mediaGrade(v) { (S.mediaUi = S.mediaUi || {}).g = v; render(); },
  mediaPick() { const c = liveCourse(); if (c) mediaPicker(c); },
  mediaNewForSe() { const c = liveCourse(); if (c) mediaDialog(null, it => mediaAttach(c, [it.id])); },
  mediaDetach(v) { const c = liveCourse(), se = c && findSession(c, S.live.date, S.live.period); if (!se) return; snap(c); se.media = (se.media || []).filter(x => x !== v); touch(c); render(); toast('เอาสื่อออกจากคาบนี้แล้ว'); },
  mediaAttachOne(v) { const c = liveCourse(); if (!c) return; mediaAttach(c, [v]); },
  mediaGoSe(v) { const [cid, date, period] = v.split('|'); S.live = Object.assign(S.live || {}, { cid, date, period: Number(period) }); S.view = 'live'; render(); window.scrollTo(0, 0); }
};
document.addEventListener('input', e => { if (e.target.id === 'mdQ') { (S.mediaUi = S.mediaUi || {}).q = e.target.value; const pos = e.target.selectionStart; render(); const el = $('#mdQ'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (_) {} } } });
