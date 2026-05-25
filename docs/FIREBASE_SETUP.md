# ตั้งค่า Firebase (ข้อมูลซิงก์ข้ามมือถือ/คอม)

ใช้เมื่อต้องการให้ **คนในบ้าน login บัญชีเดียวกันแล้วเห็นข้อมูลเดียวกันทุกเครื่อง**

## ขั้นตอน

### 1. สร้างโปรเจกต์ Firebase (ฟรี)

1. ไปที่ https://console.firebase.google.com/
2. **Add project** → ตั้งชื่อ เช่น `expense-family`
3. ปิด Google Analytics ก็ได้ (ไม่บังคับ)

### 2. เปิด Authentication

1. เมนู **Build** → **Authentication** → **Get started**
2. เลือก **Email/Password** → เปิด **Enable** → Save

### 3. สร้าง Firestore Database

1. **Build** → **Firestore Database** → **Create database**
2. เลือก **Start in test mode** (สำหรับทดลอง) หรือ production ตามด้านล่าง
3. เลือก region ใกล้ไทย เช่น `asia-southeast1`

### 4. คัดลอก Config มาใส่ในแอป

1. **Project settings** (ไอคอนเฟือง) → **Your apps** → **Web** `</>`
2. ตั้งชื่อแอป → Register
3. คัดลอก `firebaseConfig` ไปใส่ใน `js/firebase-config.js`:

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

4. Commit และ push ขึ้น GitHub

### 5. ตั้งกฎความปลอดภัย Firestore (สำคัญ)

ใน Firestore → **Rules** แทนที่ด้วย:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

กด **Publish** — ผู้ใช้แต่ละคนอ่าน/เขียนได้เฉพาะข้อมูลของตัวเอง

### 6. อนุญาตโดเมน GitHub Pages (ถ้า login ไม่ได้)

1. Authentication → **Settings** → **Authorized domains**
2. เพิ่ม `varaluk-m.github.io` (หรือโดเมนที่ใช้)

---

หลังตั้งค่า แอปจะใช้ **Firebase อัตโนมัติ** แทน LocalStorage  
ผู้ใช้สมัคร/เข้าสู่ระบบด้วยอีเมลเหมือนเดิม แต่ข้อมูลอยู่บนคลาวด์
