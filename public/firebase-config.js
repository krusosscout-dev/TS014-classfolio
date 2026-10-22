/* ===== ครูแก้ไฟล์นี้ไฟล์เดียว =====
   1) วางค่าจาก Firebase Console › Project settings › Your apps › Web app (firebaseConfig)
   2) ใส่อีเมล Google ของครูที่อนุญาตให้ใช้ระบบ (ต้องตรงกับใน firestore.rules)
   ถ้ายังไม่ใส่ค่า ระบบจะทำงานแบบ "โหมดทดลอง" เก็บข้อมูลในเบราว์เซอร์เครื่องนี้ */
window.FIREBASE_CONFIG = {
   apiKey: "AIzaSyDLRYFrcaC4plTYmBQwdq94nHkXw806KCk",
  authDomain: "classfolio-6dbf0.firebaseapp.com",
  projectId: "classfolio-6dbf0",
  storageBucket: "classfolio-6dbf0.firebasestorage.app",
  messagingSenderId: "679187746403",
  appId: "1:679187746403:web:33a505b875a9d65db2f256"
};

window.TEACHER_EMAILS = ["krusosscout@gmail.com"];
