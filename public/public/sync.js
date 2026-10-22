/* ClassFolio · รวมข้อมูลจากหลายเครื่อง (3-way merge)
   base = ข้อมูลล่าสุดที่รู้ว่าอยู่บนเซิร์ฟเวอร์, local = ในเครื่องนี้, remote = ที่เครื่องอื่นเพิ่งบันทึก
   หลัก: ส่วนที่เครื่องนี้ไม่ได้แก้ ใช้ของเครื่องอื่น · ส่วนที่แก้ทั้งคู่ ใช้ของเครื่องนี้
   รายการที่มี id (นักเรียน งาน หน่วย คาบ) รวมทีละรายการ ไม่ทับทั้งก้อน */
(function (g) {
  'use strict';
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const J = x => JSON.stringify(x === undefined ? null : x);
  const eq = (a, b) => J(a) === J(b);
  const copy = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
  const idArr = a => Array.isArray(a) && a.every(e => isObj(e) && e.id !== undefined && e.id !== null);

  function mergeById(base, local, remote) {
    const bm = new Map((base || []).map(e => [e.id, e])), lm = new Map(local.map(e => [e.id, e])), rm = new Map(remote.map(e => [e.id, e]));
    const order = []; const seen = new Set();
    local.forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); order.push(e.id); } });
    remote.forEach((e, i) => { if (!seen.has(e.id)) { seen.add(e.id); const prev = i > 0 ? remote[i - 1].id : null; const at = prev === null ? 0 : order.indexOf(prev) + 1; order.splice(at < 0 ? order.length : at, 0, e.id); } });
    const out = [];
    order.forEach(id => {
      const b = bm.get(id), l = lm.get(id), r = rm.get(id);
      if (l && r) out.push(merge3(b, l, r));
      else if (l && !r) { if (b && eq(l, b)) return; out.push(l); }      // เครื่องอื่นลบ และเครื่องนี้ไม่ได้แก้ → ลบ
      else if (!l && r) { if (b && eq(r, b)) return; out.push(copy(r)); } // เครื่องนี้ลบ และเครื่องอื่นไม่ได้แก้ → ลบ
    });
    return out;
  }

  function merge3(base, local, remote) {
    if (remote === undefined) return local;
    if (local === undefined) return copy(remote);
    if (eq(local, base)) return copy(remote);
    if (eq(remote, base) || eq(local, remote)) return local;
    if (isObj(local) && isObj(remote)) {
      const b0 = isObj(base) ? base : {}, out = {};
      new Set([...Object.keys(b0), ...Object.keys(local), ...Object.keys(remote)]).forEach(k => {
        const b = b0[k], l = local[k], r = remote[k];
        if (l === undefined && r === undefined) return;
        if (l === undefined) { if (b !== undefined && eq(r, b)) return; out[k] = copy(r); return; }
        if (r === undefined) { if (b !== undefined && eq(l, b)) return; out[k] = l; return; }
        out[k] = merge3(b, l, r);
      });
      return out;
    }
    if (idArr(local) && idArr(remote)) return mergeById(idArr(base) ? base : [], local, remote);
    return local;
  }

  /* แทนที่เนื้อหาในวัตถุเดิม (คงตัวอ้างอิงที่หน้าจอถืออยู่) */
  function replaceInPlace(target, src) { Object.keys(target).forEach(k => { delete target[k]; }); Object.assign(target, src); return target; }

  g.Sync = { merge3, eq, replaceInPlace };
})(typeof window !== 'undefined' ? window : globalThis);
