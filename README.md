# ระบบบันทึกรายรับ-รายจ่าย (Expense Tracking System)

Web App แบบ **Static** สำหรับครอบครัว — ไม่ต้องมีเซิร์ฟเวอร์ ใช้ **GitHub Pages** โฮสต์ฟรี ส่งลิงก์ให้คนในบ้านเปิดใช้ได้ทันที

## ฟีเจอร์

- บันทึก **รายรับ** และ **รายจ่าย** พร้อมหมวดหมู่และวันที่
- แสดง **ยอดเงินคงเหลือ** (ยอดเริ่มต้น + รายรับ − รายจ่ายทั้งหมด)
- สรุปรายรับ/รายจ่ายตามช่วงที่เลือก
- **กรองข้อมูล**: รายวัน · รายเดือน · รายปี
- **กราฟ**: รายจ่ายตามหมวดหมู่ (วงกลม) และเปรียบเทียบรายรับ vs รายจ่าย
- ตั้ง **ยอดเริ่มต้น** และ **งบรายเดือน** (เตือนเมื่อใกล้/เกินงบ)
- ส่งออก/นำเข้า JSON สำรองข้อมูล
- ข้อมูลเก็บใน **LocalStorage** ของเบราว์เซอร์แต่ละเครื่อง (ไม่ sync ข้ามเครื่องอัตโนมัติ)

## วิธีใช้งานบนเครื่องตัวเอง

เปิดไฟล์ `index.html` ในเบราว์เซอร์ หรือรันด้วย Live Server ก็ได้

## วิธีอัปโหลดไป GitHub และเปิด GitHub Pages

### 1) อัปโหลดโค้ดไป repo

```bash
cd "Cost Calculating Program"
git init
git add .
git commit -m "Add family expense tracking web app"
git branch -M main
git remote add origin https://github.com/Varaluk-M/Expense-Tracking-System.git
git push -u origin main
```

### 2) เปิด GitHub Pages

1. ไปที่ [Expense-Tracking-System](https://github.com/Varaluk-M/Expense-Tracking-System)
2. **Settings** → **Pages**
3. **Source**: Deploy from a branch
4. **Branch**: `main` / folder **`/ (root)`**
5. กด **Save** — รอ 1–2 นาที

ลิงก์จะประมาณ:

`https://varaluk-m.github.io/Expense-Tracking-System/`

ส่งลิงก์นี้ให้คนในบ้านเปิดบนมือถือหรือคอมได้เลย

## หมายเหตุสำหรับครอบครัว

| หัวข้อ | คำอธิบาย |
|--------|----------|
| ข้อมูลแยกตามเครื่อง | แต่ละคน/มือถือเก็บข้อมูลคนละชุด — ถ้าอยากให้ข้อมูลเดียวกัน ใช้ **ส่งออก JSON** แล้ว **นำเข้า** บนเครื่องอื่น |
| ไม่ต้องมี server | โฮสต์แค่ HTML/CSS/JS บน GitHub Pages |
| ความปลอดภัย | อย่าใส่รหัสผ่านธนาคารในแอป — เป็นเครื่องมือบันทึกรายการเท่านั้น |

## โครงสร้างโปรเจกต์

```
├── index.html
├── css/style.css
├── js/app.js
└── README.md
```

## เทคโนโลยี

- HTML5, CSS3, JavaScript (Vanilla)
- [Chart.js](https://www.chartjs.org/) (CDN)
- LocalStorage

---

สร้างสำหรับใช้ในครอบครัว · โปรเจกต์: [Varaluk-M/Expense-Tracking-System](https://github.com/Varaluk-M/Expense-Tracking-System)
