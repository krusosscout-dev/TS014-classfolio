/* ClassFolio · สร้างไฟล์ Excel (.xlsx) เองโดยไม่ใช้ไลบรารีภายนอก
   ใช้: XLSX.download('ชื่อ.xlsx', [{ name: 'ชีต', rows: [[...], ...], cols: [ความกว้าง...], header: 1, freeze: {r:1,c:2}, merges: ['A1:C1'] }]) */
(function (g) {
  'use strict';
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  /* zip แบบไม่บีบอัด (STORE) */
  function zip(files) {
    const parts = [], central = []; let off = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    files.forEach(f => {
      const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    const csize = central.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(off), u16(0)));
    return new Blob(parts.concat(central, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  const x = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const colName = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  /* สไตล์: 0 ปกติ · 1 หัวตาราง (หนา พื้นเทา เส้นขอบ) · 2 ข้อมูลมีเส้นขอบ · 3 ตัวเลขมีเส้นขอบ กึ่งกลาง · 4 หัวเรื่องตัวใหญ่ */
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="14"/><name val="TH SarabunPSK"/></font><font><b/><sz val="14"/><name val="TH SarabunPSK"/></font><font><b/><sz val="18"/><name val="TH SarabunPSK"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EAF3"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9AA0B5"/></left><right style="thin"><color rgb="FF9AA0B5"/></right><top style="thin"><color rgb="FF9AA0B5"/></top><bottom style="thin"><color rgb="FF9AA0B5"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  function sheetXml(sh) {
    const hdr = sh.header || 0, title = sh.title ? 1 : 0;
    const rows = (sh.title ? [[sh.title]] : []).concat(sh.rows);
    const body = rows.map((row, r) => {
      const isTitle = title && r === 0, isHead = !isTitle && r < title + hdr;
      const cells = row.map((v, c) => {
        const plain = sh.plainFrom != null && r - title >= sh.plainFrom;
        if (v === null || v === undefined || v === '') return !plain && (isHead || (!isTitle && r >= title)) ? `<c r="${colName(c)}${r + 1}" s="${isHead ? 1 : 2}"/>` : '';
        const ref = colName(c) + (r + 1);
        if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${isHead ? 1 : 3}"><v>${v}</v></c>`;
        return `<c r="${ref}" s="${isTitle ? 4 : isHead ? 1 : (sh.center || []).includes(c) ? 3 : 2}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}"${isHead ? ' ht="24" customHeight="1"' : ''}>${cells}</row>`;
    }).join('');
    const cols = sh.cols && sh.cols.length ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const fr = sh.freeze ? (() => { const r = (sh.freeze.r || 0) + title, c = sh.freeze.c || 0, cell = colName(c) + (r + 1); return `<sheetViews><sheetView workbookViewId="0"><pane${c ? ` xSplit="${c}"` : ''}${r ? ` ySplit="${r}"` : ''} topLeftCell="${cell}" activePane="${c && r ? 'bottomRight' : r ? 'bottomLeft' : 'topRight'}" state="frozen"/></sheetView></sheetViews>`; })() : '';
    const shift = m => m.replace(/(\d+)/g, n => String(Number(n) + title));
    const merges = (sh.merges || []).map(shift).concat(sh.title ? [`A1:${colName(Math.max(0, (sh.rows[0] || []).length - 1))}1`] : []);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>${fr}<sheetFormatPr defaultRowHeight="20"/>${cols}<sheetData>${body}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${sh.portrait ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }

  function build(sheets) {
    const used = new Set();
    const names = sheets.map((s, i) => { let n = String(s.name || 'Sheet' + (i + 1)).replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31).trim() || 'Sheet' + (i + 1); let k = n, j = 2; while (used.has(k)) k = n.slice(0, 28) + ' ' + j++; used.add(k); return k; });
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
      { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: 'xl/styles.xml', data: STYLES }
    ].concat(sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })));
    return zip(files);
  }

  function download(filename, sheets) {
    const blob = build(sheets);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return blob;
  }

  g.XLSX = { build, download, colName };
})(typeof window !== 'undefined' ? window : globalThis);
