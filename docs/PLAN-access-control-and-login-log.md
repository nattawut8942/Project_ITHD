# แผน: เก็บประวัติการ login และระบบจัดการสิทธิ์จากหน้าเว็บ

สถานะ: **รอการอนุมัติก่อนเริ่มทำ** (มีการเปลี่ยนแปลงฐานข้อมูล จึงต้องยืนยันก่อน)

## 1. สิ่งที่ตัดสินใจแล้ว (จากคำตอบของเจ้าของระบบ)

| หัวข้อ | การตัดสินใจ |
|---|---|
| ใครจัดการ master ได้ | เฉพาะผู้ที่มีสิทธิ์ Admin เท่านั้น |
| ผู้ที่มีสิทธิ์ Admin คนแรก | รหัสพนักงาน **41329** (ผู้ขอ) |
| บันทึกการ login ที่ล้มเหลว | บันทึก |
| ผู้ที่ถูกบันทึก | ทุกคน ทั้ง IT Staff และ User |
| เก็บ log นานแค่ไหน | เก็บตลอดไป (ไม่ลบอัตโนมัติ) |
| วิธีจัดการสิทธิ์ | จัดการจากหน้าเว็บ ไม่แก้ใน database โดยตรง |

**ข้อสมมติที่ยังไม่ได้ยืนยัน:** ผู้ที่ดู log ได้คือ Admin เท่านั้น (ไม่ได้ระบุในคำตอบ ผมจึงใช้ค่านี้เป็นค่าเริ่มต้น)

## 2. ข้อเท็จจริงจากโค้ดที่ต้องรู้

- **การ login:** [AuthController.cs](../backend/HelpDeskApi/Controllers/AuthController.cs) ส่งรหัสผ่านไปยัง API ของ Daikin ใน query string (`GET ...?username=..&password=..`) ฝั่งเราไม่สามารถเปลี่ยนรูปแบบนี้ได้เอง เพราะเป็น contract ของระบบ AD ภายนอก
  - สิ่งที่ทำได้ฝั่งเรา: ไม่บันทึก URL เต็มลงใน log ของ backend หรือ log ที่ proxy/IIS บันทึก และตรวจว่า log ไม่มีรหัสผ่านอยู่
  - ควรแจ้งเจ้าของ API ของ Daikin เรื่องการส่งรหัสผ่านใน URL
- **สิทธิ์มีสองระบบซ้อนกัน:**
  - `Admin` มาจากตาราง `dbo.Stock_UserRole` แต่ไม่มี endpoint ไหนตรวจค่านี้จริง
  - IT Staff คือ `cost_center = '7510'` ซึ่งถูกเช็คกระจายอยู่ที่ backend (`RequireCc7510`, `ClaimsPrincipalExtensions`, `TicketController`, `MasterDataController`, `UserService`) และ frontend 8 จุด (ไฟล์ที่มี `7510` ใน `src`)
- **Master data:** ตอนนี้แก้ไขได้เฉพาะ IT Staff (`[RequireCc7510]` บน POST/PUT/DELETE/move/reorder) ต้องเปลี่ยนเป็นสิทธิ์ `master.edit`

## 3. ออกแบบข้อมูล (ฐานข้อมูล)

ตารางใหม่ (ต้องให้ DBA หรือผู้ดูแลฐานข้อมูลรันสคริปต์ และต้องยืนยันก่อน):

```sql
-- 1) ประวัติการ login (เก็บทุกครั้ง ทั้งสำเร็จและล้มเหลว)
CREATE TABLE dbo.ithd_login_logs (
  id            BIGINT IDENTITY PRIMARY KEY,
  empCode       NVARCHAR(20)  NULL,          -- ว่างได้ถ้า login ล้มเหลวและไม่รู้รหัสพนักงาน
  username      NVARCHAR(100) NOT NULL,      -- ชื่อที่พิมพ์ (ไม่เก็บรหัสผ่าน)
  success       BIT           NOT NULL,
  reason        NVARCHAR(200) NULL,          -- เช่น 'invalid_credentials', 'ad_unavailable'
  ip_address    NVARCHAR(64)  NULL,
  user_agent    NVARCHAR(400) NULL,
  logged_at     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_ithd_login_logs_emp ON dbo.ithd_login_logs (empCode, logged_at DESC);

-- 2) บทบาท (role) และสิทธิ์ (permission)
CREATE TABLE dbo.ithd_roles (
  id    INT IDENTITY PRIMARY KEY,
  code  NVARCHAR(50)  NOT NULL UNIQUE,   -- 'admin', 'it_staff', 'user'
  name  NVARCHAR(100) NOT NULL
);
CREATE TABLE dbo.ithd_permissions (
  code  NVARCHAR(100) PRIMARY KEY,       -- เช่น 'master.edit', 'users.manage', 'logs.view'
  description NVARCHAR(200) NULL
);
CREATE TABLE dbo.ithd_role_permissions (
  role_id INT NOT NULL REFERENCES dbo.ithd_roles(id),
  perm_code NVARCHAR(100) NOT NULL REFERENCES dbo.ithd_permissions(code),
  PRIMARY KEY (role_id, perm_code)
);
CREATE TABLE dbo.ithd_user_roles (
  empCode NVARCHAR(20) NOT NULL,
  role_id INT NOT NULL REFERENCES dbo.ithd_roles(id),
  granted_by NVARCHAR(20) NULL,
  granted_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  PRIMARY KEY (empCode, role_id)
);
```

**ค่าเริ่มต้น (seed):**
- บทบาท: `admin`, `it_staff`, `user`
- สิทธิ์: `master.edit`, `users.manage`, `logs.view`, `tickets.manage` (ตั้งชื่อตามที่ใช้จริง)
- `admin` ได้ทุกสิทธิ์ และ `it_staff` ได้สิทธิ์ของงานเทคนิค
- ผู้ใช้ **41329 ให้บทบาท `admin`** เป็นคนแรก
- ทุกคนที่ `cost_center = '7510'` ให้บทบาท `it_staff` เพื่อให้พฤติกรรมเดิมไม่เปลี่ยน
- คนใน `dbo.Stock_UserRole` ให้บทบาท `admin` ด้วย (เพื่อไม่ให้สิทธิ์ที่มีอยู่หายไป)

## 4. การเปลี่ยน backend

1. **บันทึก log ตอน login:** เพิ่มการ insert ใน `AuthController.Login` ทั้งกรณีสำเร็จและล้มเหลว (ล้มเหลวเมื่อรหัสผิด, AD ไม่พร้อม, หรือไม่พบผู้ใช้)
2. **คำนวณสิทธิ์:** เมื่อ login สำเร็จให้อ่านสิทธิ์ของผู้ใช้จาก `ithd_user_roles` → `ithd_role_permissions` แล้วใส่ไว้ใน JWT (claim `perm`) เพื่อไม่ต้อง query ทุกคำขอ
3. **Policy ใหม่:** สร้าง attribute `[RequirePermission("master.edit")]` แทน `[RequireCc7510]` แล้วค่อย ๆ เปลี่ยนทีละ controller
4. **API จัดการสิทธิ์ (Admin เท่านั้น):**
   - `GET /api/admin/roles`, `GET /api/admin/users?search=`
   - `PUT /api/admin/users/{empCode}/roles` (ให้/เอาบทบาท)
   - `GET /api/admin/login-logs?empCode=&from=&to=&success=` (มีแบ่งหน้า)
5. **ไม่ลบ log:** ไม่มีงานลบอัตโนมัติ และ API ไม่มี endpoint ลบ
6. **ความปลอดภัย:** endpoint ทั้งหมดของ Admin ต้องผ่าน `[RequirePermission("users.manage")]` หรือ `logs.view` และมีการบันทึกว่าใครให้สิทธิ์ใคร (`granted_by`)

## 5. การเปลี่ยน frontend

1. ตอน login เก็บ `permissions` จาก response (หรือจาก JWT) ใน context
2. แทนที่ `isITStaff = cost_center === '7510'` ด้วย helper เช่น `can('master.edit')` และ `isITStaff` ที่อ่านจากบทบาท `it_staff`
3. เพิ่มเมนู **"จัดการสิทธิ์"** และ **"ประวัติการเข้าสู่ระบบ"** ใน Sidebar เฉพาะผู้ที่มีสิทธิ์
4. หน้าจัดการสิทธิ์: ค้นหาพนักงาน เลือกบทบาท บันทึก และแสดงว่าใครเป็นคนให้ (รวมถึงข้อความยืนยันก่อนเปลี่ยนสิทธิ์ของตัวเอง)
5. หน้า log: ตาราง ค้นหาตามรหัสพนักงาน/ช่วงวันที่/สถานะ (สำเร็จ, ล้มเหลว) แบ่งหน้า

## 6. ลำดับการทำ (แบ่งเป็นขั้น ตรวจได้ทุกขั้น)

| ขั้น | งาน | ผลลัพธ์ที่ตรวจได้ |
|---|---|---|
| 1 | สร้างตาราง log และบันทึกตอน login (ยังไม่มีหน้าดู) | login แล้วมีแถวใหม่ในตาราง ทั้งสำเร็จและล้มเหลว |
| 2 | สร้างตาราง role/permission และ seed ข้อมูล | ผู้ใช้ 41329 เป็น admin, คน 7510 เป็น it_staff |
| 3 | JWT มี `perm` และ frontend อ่านได้ (ยังคง 7510 เป็น fallback) | พฤติกรรมเดิมไม่เปลี่ยน |
| 4 | เปลี่ยน master CRUD ให้ใช้ `master.edit` | IT Staff ที่ไม่ใช่ admin แก้ master ไม่ได้ (ถ้าไม่มีสิทธิ์) |
| 5 | หน้าจัดการสิทธิ์ และหน้าดู log (เฉพาะ Admin) | Admin ให้/เอาสิทธิ์ได้จากหน้าเว็บ และดู log ได้ |
| 6 | ลบ fallback `cost_center = 7510` ออก | ใช้สิทธิ์อย่างเดียว (ทำหลังทดสอบแล้วเท่านั้น) |

## 7. ความเสี่ยงและวิธีลด

- **สิทธิ์หลุดระหว่างย้าย:** ขั้น 2 ต้องสร้างบทบาทให้ครบก่อนเปลี่ยนการเช็คในขั้น 3–4 และคง fallback ไว้จนขั้น 6
- **ผู้ดูแลล็อกตัวเอง:** ห้ามเอาบทบาท admin ของคนสุดท้ายออก (ตรวจในฝั่ง backend)
- **ข้อมูลส่วนบุคคล:** log มีชื่อผู้ใช้และ IP ควรตรวจกับนโยบาย PDPA ของบริษัท และให้สิทธิ์ดูเฉพาะ Admin
- **log โตเรื่อย ๆ:** เก็บตลอดไปตามคำตอบ ควรประเมินขนาดตารางหลังใช้ไปสักระยะ และทำดัชนีตามการค้นหา

## 8. สิ่งที่ต้องยืนยันก่อนเริ่ม

1. ยืนยันว่าผู้ดู log ได้เฉพาะ Admin (ตามข้อสมมติ)
2. อนุมัติสคริปต์ฐานข้อมูลในข้อ 3 และให้ใครรัน
3. ยืนยันว่าจะคง `Stock_UserRole` ไว้ (ใช้เป็นข้อมูลตั้งต้นของ admin) หรือย้ายไปตารางใหม่และเลิกใช้
4. รับทราบเรื่องการส่งรหัสผ่านใน URL และว่าจะแจ้งเจ้าของ API ของ Daikin หรือไม่
