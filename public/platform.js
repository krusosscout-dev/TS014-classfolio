/* สมุดวัดผล ปพ.5 · ตัวเก็บข้อมูล
   - ถ้า firebase-config.js ยังไม่ได้ใส่ค่า → โหมดทดลอง เก็บในเบราว์เซอร์เครื่องนี้
   - ถ้าใส่ค่าแล้ว → ใช้ Firebase (ล็อกอิน Google + Firestore + ทำงานออฟไลน์ได้) */
(function () {
  'use strict';
  const cfg = window.FIREBASE_CONFIG || {};
  const useFB = !!(cfg.apiKey && cfg.projectId && !/ใส่|YOUR/i.test(String(cfg.apiKey)));

  const KEY = 'samutwadphon:';
  const mem = {};
  const lsGet = k => { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : (mem[k] ?? null); } catch (e) { return mem[k] ?? null; } };
  const lsSet = (k, v) => { mem[k] = v; try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { } };
  const lsDel = k => { delete mem[k]; try { localStorage.removeItem(KEY + k); } catch (e) { } };
  const clone = o => JSON.parse(JSON.stringify(o));

  const Local = {
    mode: 'local',
    async init() { return { uid: 'local', email: '', name: 'ครูผู้สอน' }; },
    async signIn() { return this.init(); },
    async signOut() { },
    async listCourses() { return (lsGet('index') || []).map(id => lsGet('c:' + id)).filter(Boolean); },
    async saveCourse(c) {
      lsSet('c:' + c.id, clone(c));
      const idx = lsGet('index') || [];
      if (!idx.includes(c.id)) { idx.push(c.id); lsSet('index', idx); }
    },
    async deleteCourse(id) { lsDel('c:' + id); lsSet('index', (lsGet('index') || []).filter(x => x !== id)); },
    async getSettings() { return lsGet('settings'); },
    async saveSettings(s) { lsSet('settings', clone(s)); },
    async listBackups() { return (lsGet('bkidx') || []).slice().sort((a, b) => b.at - a.at); },
    async saveBackup(meta, json) {
      lsSet('bk:' + meta.id, json);
      lsSet('bkidx', (lsGet('bkidx') || []).filter(b => b.id !== meta.id).concat(meta));
    },
    async getBackup(id) { return lsGet('bk:' + id); },
    async deleteBackup(id) { lsDel('bk:' + id); lsSet('bkidx', (lsGet('bkidx') || []).filter(b => b.id !== id)); }
  };

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = () => rej(new Error('โหลดไฟล์ Firebase ไม่ได้ ตรวจการเชื่อมต่ออินเทอร์เน็ต'));
      document.head.appendChild(s);
    });
  }
  const BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';

  const FB = {
    mode: 'firebase', user: null,
    async init() {
      await loadScript(BASE + 'firebase-app-compat.js');
      await loadScript(BASE + 'firebase-auth-compat.js');
      await loadScript(BASE + 'firebase-firestore-compat.js');
      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      try { await this.db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* เปิดหลายแท็บหรือเบราว์เซอร์ไม่รองรับ */ }
      const u = await new Promise(r => { const off = this.auth.onAuthStateChanged(x => { off(); r(x); }); });
      return u ? this._check(u) : null;
    },
    _check(u) {
      const allow = (window.TEACHER_EMAILS || []).map(s => String(s).toLowerCase().trim()).filter(Boolean);
      if (allow.length && !allow.includes(String(u.email || '').toLowerCase())) {
        this.auth.signOut();
        throw new Error('บัญชี ' + u.email + ' ยังไม่ได้รับสิทธิ์ใช้ระบบนี้ ให้เพิ่มอีเมลใน firebase-config.js และ firestore.rules');
      }
      this.user = u;
      return { uid: u.uid, email: u.email, name: u.displayName || u.email };
    },
    async signIn() {
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      try {
        const r = await this.auth.signInWithPopup(p);
        return this._check(r.user);
      } catch (e) {
        const msg = {
          'auth/popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ อนุญาตป๊อปอัปสำหรับเว็บนี้ แล้วกดอีกครั้ง',
          'auth/popup-closed-by-user': 'ปิดหน้าต่างเข้าสู่ระบบก่อนเสร็จ กดเข้าสู่ระบบอีกครั้ง',
          'auth/cancelled-popup-request': 'กดเข้าสู่ระบบอีกครั้ง',
          'auth/unauthorized-domain': 'โดเมนนี้ยังไม่ได้รับอนุญาต เพิ่มโดเมน Vercel ใน Firebase › Authentication › Settings › Authorized domains',
          'auth/operation-not-allowed': 'ยังไม่ได้เปิดการเข้าสู่ระบบด้วย Google ใน Firebase › Authentication › Sign-in method',
          'auth/network-request-failed': 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง'
        }[e && e.code];
        throw new Error(msg || (e && e.message) || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    },
    async signOut() { await this.auth.signOut(); },
    root() { return this.db.collection('teachers').doc(this.user.uid); },
    /* รายวิชา 1 เอกสาร + บันทึกรายคาบแยกเป็นเอกสารย่อย courses/{id}/sessions/{sid} (ไม่มีวันเต็ม 1 MB) */
    _ses: {}, _wrote: {}, _docs: {}, _subs: {},
    _cref(id) { return this.root().collection('courses').doc(id); },
    _assemble(id) {
      const d = this._docs[id]; if (!d) return null;
      const c = clone(d); const legacy = Array.isArray(c.sessions) ? c.sessions : [];
      const sub = Object.values(this._ses[id] || {});
      const ids = new Set(sub.map(x => x.id));
      c.sessions = legacy.filter(x => !ids.has(x.id)).concat(sub).sort((x, y) => (x.date + String(x.period).padStart(2, '0')).localeCompare(y.date + String(y.period).padStart(2, '0')));
      return c;
    },
    _remember(c) {
      const w = this._wrote[c.id] = { course: null, ses: {} };
      const d = clone(c); (d.sessions || []).forEach(x => { w.ses[x.id] = JSON.stringify(x); }); delete d.sessions; w.course = JSON.stringify(d);
    },
    async listCourses() {
      const s = await this.root().collection('courses').get();
      const out = [];
      for (const d of s.docs) {
        this._docs[d.id] = d.data();
        const ss = await this._cref(d.id).collection('sessions').get();
        this._ses[d.id] = {}; ss.docs.forEach(x => { this._ses[d.id][x.id] = x.data(); });
        const c = this._assemble(d.id); out.push(c); this._remember(c);
        const legacy = Array.isArray(d.data().sessions) ? d.data().sessions : [];
        if (legacy.length) { // รูปแบบเดิม: ย้าย sessions ออกเป็นเอกสารย่อยในการบันทึกครั้งถัดไป (ห้ามถือว่าเขียนแล้ว)
          this._wrote[d.id].course = '__legacy__';
          legacy.forEach(x => { if (!this._ses[d.id][x.id]) delete this._wrote[d.id].ses[x.id]; });
        }
      }
      return out;
    },
    async saveCourse(c) {
      const data = clone(c), ses = data.sessions || []; delete data.sessions;
      const cj = JSON.stringify(data);
      if (cj.length > 900000) throw new Error('ข้อมูลรายวิชา ' + c.code + ' ใหญ่เกินที่ Firestore เก็บได้ในเอกสารเดียว ให้คัดลอกเป็นรายวิชาใหม่สำหรับภาคเรียนถัดไป');
      const w = this._wrote[c.id] || (this._wrote[c.id] = { course: null, ses: {} });
      const ref = this._cref(c.id), batch = this.db.batch(); let n = 0;
      const now = {};
      if (w.course !== cj) { batch.set(ref, data); n++; }
      ses.forEach(x => { const j = JSON.stringify(x); now[x.id] = j; if (w.ses[x.id] !== j) { batch.set(ref.collection('sessions').doc(x.id), x); n++; } });
      Object.keys(w.ses).forEach(id => { if (!now[id]) { batch.delete(ref.collection('sessions').doc(id)); n++; } });
      if (!n) return;
      w.course = cj; w.ses = now;
      this._docs[c.id] = data; this._ses[c.id] = {}; ses.forEach(x => { this._ses[c.id][x.id] = x; });
      await batch.commit();
      if (this._watchSes) this._watchSes(c.id);
    },
    async deleteCourse(id) {
      const ref = this._cref(id), ss = await ref.collection('sessions').get();
      const batch = this.db.batch(); ss.docs.forEach(x => batch.delete(ref.collection('sessions').doc(x.id))); batch.delete(ref); await batch.commit();
      delete this._docs[id]; delete this._ses[id]; delete this._wrote[id];
      if (this._subs[id]) { this._subs[id](); delete this._subs[id]; }
    },
    /* ฟังการเปลี่ยนแปลงจากเครื่องอื่นแบบเรียลไทม์ (ข้ามการบันทึกของเครื่องนี้เอง) */
    watch(onCourse, onSettings) {
      const emit = id => { const c = this._assemble(id); if (c) { this._remember(c); onCourse(id, c); } };
      const watchSes = id => {
        if (this._subs[id]) return;
        this._subs[id] = this._cref(id).collection('sessions').onSnapshot(snap => {
          if (snap.metadata && snap.metadata.hasPendingWrites) return;
          const m = {}; snap.docs.forEach(x => { m[x.id] = x.data(); });
          if (JSON.stringify(m) === JSON.stringify(this._ses[id] || {})) return;
          this._ses[id] = m; emit(id);
        }, e => console.warn('sessions', e));
      };
      this._watchSes = watchSes;
      Object.keys(this._docs).forEach(watchSes);
      const offC = this.root().collection('courses').onSnapshot(snap => {
        if (snap.metadata && snap.metadata.hasPendingWrites) return;
        const seen = new Set();
        snap.docs.forEach(d => {
          seen.add(d.id); const data = d.data();
          const known = this._docs[d.id];
          if (!known) { this._docs[d.id] = data; this._ses[d.id] = this._ses[d.id] || {}; watchSes(d.id); emit(d.id); return; }
          if (JSON.stringify(known) === JSON.stringify(data)) return;
          this._docs[d.id] = data; emit(d.id);
        });
        Object.keys(this._docs).forEach(id => { if (!seen.has(id)) { delete this._docs[id]; delete this._ses[id]; if (this._subs[id]) { this._subs[id](); delete this._subs[id]; } onCourse(id, null); } });
      }, e => console.warn('courses', e));
      const offS = this.root().collection('meta').doc('settings').onSnapshot(d => {
        if (d.metadata && d.metadata.hasPendingWrites) return;
        if (d.exists) onSettings(d.data());
      }, e => console.warn('settings', e));
      return () => { offC(); offS(); Object.values(this._subs).forEach(f => f()); this._subs = {}; this._watchSes = null; };
    },
    async getSettings() { const d = await this.root().collection('meta').doc('settings').get(); return d.exists ? d.data() : null; },
    saveSettings(s) { return this.root().collection('meta').doc('settings').set(clone(s)); },
    /* สำรองอัตโนมัติ: แบ่งเนื้อหาเป็นชิ้นละไม่เกิน 700,000 ตัวอักษร (เอกสาร Firestore จำกัด 1 MB) */
    async listBackups() { const d = await this.root().collection('meta').doc('backups').get(); return ((d.exists && d.data().items) || []).slice().sort((a, b) => b.at - a.at); },
    async saveBackup(meta, json) {
      const CH = 700000, parts = Math.max(1, Math.ceil(json.length / CH));
      for (let i = 0; i < parts; i++) await this.root().collection('backups').doc(meta.id + '_' + i).set({ json: json.slice(i * CH, (i + 1) * CH) });
      const list = (await this.listBackups()).filter(b => b.id !== meta.id).concat(Object.assign({}, meta, { parts }));
      await this.root().collection('meta').doc('backups').set({ items: list });
    },
    async getBackup(id) {
      const meta = (await this.listBackups()).find(b => b.id === id); const n = (meta && meta.parts) || 1; let out = '';
      for (let i = 0; i < n; i++) { const d = await this.root().collection('backups').doc(id + '_' + i).get(); if (!d.exists) return null; out += d.data().json; }
      return out;
    },
    async deleteBackup(id) {
      const meta = (await this.listBackups()).find(b => b.id === id); const n = (meta && meta.parts) || 1;
      for (let i = 0; i < n; i++) await this.root().collection('backups').doc(id + '_' + i).delete();
      await this.root().collection('meta').doc('backups').set({ items: (await this.listBackups()).filter(b => b.id !== id) });
    }
  };

  window.Store = useFB ? FB : Local;
})();
