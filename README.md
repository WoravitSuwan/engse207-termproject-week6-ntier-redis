# engse207-termproject-week6-ntier-redis

<img width="908" height="439" alt="Screenshot 2569-02-25 at 11 42 41" src="https://github.com/user-attachments/assets/df53bc42-ad23-4371-b3a5-6abc107127d9" />

<img width="1237" height="871" alt="Screenshot 2569-02-25 at 11 50 11" src="https://github.com/user-attachments/assets/360a7e8a-e03d-4cde-a64b-fbc54a300cda" />

<img width="796" height="70" alt="Screenshot 2569-02-25 at 11 49 28" src="https://github.com/user-attachments/assets/e92595e2-7874-43b1-a3f4-1d1f8cc7a729" />
<img width="722" height="189" alt="Screenshot 2569-02-25 at 11 47 00" src="https://github.com/user-attachments/assets/53357d8d-8dea-457a-89c9-1459b85cd92a" />
<img width="778" height="249" alt="Screenshot 2569-02-25 at 11 46 32" src="https://github.com/user-attachments/assets/9746782b-d62d-454d-81a9-48065fd7c8e7" />
<img width="704" height="735" alt="Screenshot 2569-02-25 at 11 45 45" src="https://github.com/user-attachments/assets/823c5ab7-8e13-46c9-8050-8b53d771d597" />
<img width="884" height="306" alt="Screenshot 2569-02-25 at 11 45 18" src="https://github.com/user-attachments/assets/87bef0d9-4923-41e2-a376-bdd344829fb5" />


Challenge

<img width="497" height="586" alt="Screenshot 2569-02-25 at 12 02 12" src="https://github.com/user-attachments/assets/309e58ee-0e3a-4521-b7a3-5dea975864f6" />

🎯 เป้าหมาย

เพิ่ม Cache สำหรับ GET /tasks/:id

จากเดิม cache แค่ /tasks
ตอนนี้เราทำให้ดึง Task รายตัวจาก Redis ได้ด้วย

🧠 แนวคิดที่ใช้

เราใช้ Cache-Aside Pattern

ขั้นตอนทำงานมี 3 ขั้น:

1️⃣ Client เรียก /api/tasks/5
2️⃣ Service ตรวจสอบ Cache ก่อน
Redis มี key: tasks:5 ไหม?

ถ้ามี → 🟢 CACHE HIT → ส่งกลับทันที

ถ้าไม่มี → 🔴 CACHE MISS → ไป Query DB

3️⃣ ถ้าไป DB แล้ว → เอาผลลัพธ์มาเก็บใน Redis
setCache("tasks:5", data, TTL 60s)
🔎 โค้ดสำคัญ (ที่ทำให้เป็น Level 1)

อยู่ในไฟล์:

src/services/taskService.js

ส่วนนี้คือหัวใจ:

async getTaskById(id) {
    const cached = await getCache(CACHE_KEYS.TASK_BY_ID(id));
    if (cached) return cached;   // 🟢 HIT

    const task = await taskRepository.findById(id);
    if (!task) throw new Error('Task not found');

    await setCache(CACHE_KEYS.TASK_BY_ID(id), task.toJSON(), 60);

    return task.toJSON();        // 🔴 MISS
}
🗝 Key ที่ใช้ใน Redis
tasks:all        → เก็บรายการทั้งหมด
tasks:5          → เก็บ task id=5
tasks:stats      → เก็บสถิติ

📊 ผลลัพธ์ที่ได้จาก Level 1
ก่อนมี Cache	หลังมี Cache
ทุกครั้งต้อง query DB	บางครั้งอ่านจาก Redis
ช้ากว่า	เร็วกว่า
DB load สูง	DB load ต่ำ



<img width="733" height="330" alt="Screenshot 2569-02-25 at 12 08 36" src="https://github.com/user-attachments/assets/4c29c8f6-b1c4-4840-8c85-61209464e32c" />

Level 2 คือการเพิ่ม X-Cache header ใน response
เพื่อแสดงว่า request นั้นเป็น Cache HIT หรือ MISS
ทำให้สามารถตรวจสอบการทำงานของ Redis ได้จาก HTTP header

<img width="852" height="801" alt="Screenshot 2569-02-25 at 12 11 52" src="https://github.com/user-attachments/assets/0f7b46fb-9b4d-406c-a89c-262322c0e140" />

<img width="1317" height="388" alt="Screenshot 2569-02-25 at 12 11 44" src="https://github.com/user-attachments/assets/a76530b3-4355-4b75-ad10-731bc75084c4" />

ใน nginx upstream เพิ่ม:

least_conn;

ทำให้ Nginx ส่ง request ไปยัง instance ที่มี connection น้อยที่สุด

💡 ต่างจากเดิมยังไง?

เดิม (Round-Robin) → แจกเท่า ๆ กันตามลำดับ

ใหม่ (Least Connections) → เลือกเครื่องที่โหลดน้อยที่สุด

เหมาะกับ production มากกว่า เพราะกระจายภาระงานได้ดีกว่า

💬 อธิบายสั้น ๆ

Level 3 คือการใช้ Least Connections Load Balancing
เพื่อให้ Nginx เลือกส่ง request ไปยัง instance ที่มีโหลดน้อยที่สุด
ช่วยเพิ่ม scalability และ performance ของระบบ
