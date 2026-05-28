# LogiCora — Tam İşlək Vəziyyətə Gətirmək Üçün İnkişaf Təlimatı

Bu sənəd Claude Code üçün hazırlanmışdır.
Hər fayl sıra ilə verilir. Sən yazırsan. O yoxlayır.

---

## 1. LAYIHƏ HAQQINDA

LogiCora — Azərbaycanın milli qamifikasiyalı təhsil platformasıdır.
3 yaşdan 23+ yaşa qədər bütün istifadəçiləri əhatə edir.

### Tech Stack
- Frontend: React 19 + TypeScript + Vite 8
- Stil: Tailwind CSS v4
- State: Redux Toolkit + React Query
- Animasiya: Framer Motion
- Backend: Node.js + Express 5
- DB: MongoDB + Mongoose
- Real-time: Socket.io
- Auth: JWT + Refresh Token

### Qovluq Strukturu
```
LogiCora/
├── server/
│   ├── modules/     (24 modul: auth, user, student, teacher...)
│   ├── middleware/  (auth.js, errorHandler, roleCheck)
│   ├── utils/       (token, hash, email, sms)
│   └── server.js
└── client/
    └── src/
        ├── pages/
        ├── features/
        ├── hooks/
        └── services/
```

---

## 2. HAZIRKI VƏZİYYƏT — ANALİZ

### KRİTİK PROBLEM 1 — req.user.id = undefined (ƏN VACİB)
- server/middleware/auth.js → req.user = { _id: decoded.id }
- 14 köhnə modul req.user.id oxuyur → undefined → hamısı sınır
- Düzəliş: req.user = { _id: decoded.id, id: decoded.id, role: decoded.role }
- BU BİR SƏTİR 14 MODULU SAĞALDACAQ

### KRİTİK PROBLEM 2 — Qeydiyyatda rol profili yaranmır
- auth.service.js yalnız User + Accessibility yaradır
- Student/Teacher/Parent/Gamification sənədi yaranmır
- Nəticə: bütün student flow ölüdür (quiz, XP, gamification — hamısı 404)

### KRİTİK PROBLEM 3 — Frontend mock dataya düşür
- Teacher + Parent dashboard: .catch(() => MOCK_DATA) ilə bitir
- Xəta gizlənir, saxta data göstərilir
- "İşləyir" zənn edilir — əslində mock-dur

### Backend Endpoint Statusu
| Endpoint                    | Status      | Qeyd                          |
|-----------------------------|-------------|-------------------------------|
| POST /auth/register         | ✅ İşləyir  | Amma rol profili yaranmır     |
| POST /auth/login            | ✅ İşləyir  | Tam düzgün                    |
| POST /auth/refresh          | ✅ İşləyir  | Tam düzgün                    |
| GET  /users/profile         | ❌ Sınır    | req.user.id = undefined       |
| GET  /gamification/me       | ❌ Sınır    | req.user.id + Student yoxdur  |
| GET  /daily                 | ⚠️ Qismən  | Format uyğunsuzluğu           |
| POST /daily/answer          | ❌ Sınır    | req.user.id + Student yoxdur  |
| GET  /daily/status          | ❌ Yoxdur   | Backend-də yazılmayıb         |
| GET  /courses               | ✅ İşləyir  | req.user._id istifadə edir    |
| GET  /competitions/active   | ❌ Yoxdur   | Backend-də yazılmayıb         |
| /classroom/*                | ❌ Yoxdur   | Modul ümumiyyətlə yoxdur      |
| /weekly-mystery/*           | ❌ Yoxdur   | Modul ümumiyyətlə yoxdur      |
| GET /teachers/me/stats      | ❌ Yoxdur   | Endpoint yazılmayıb           |
| GET /parent/children        | ❌ Yoxdur   | URL: /parents vs /parent      |

---

## 3. .ENV FAYLLARI

### server/.env (yarat)
```
MONGODB_URI=mongodb://localhost:27017/logicora
JWT_SECRET=logicora_jwt_secret_2026
JWT_REFRESH_SECRET=logicora_refresh_secret_2026
CLIENT_URL=http://localhost:5174
PORT=5000
```

### client/.env (yarat)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_QUESTION_SOURCE=database
```

---

## 4. DÜZƏLİŞ PLANI — ADDIM ADDIM

### ═══ MƏRHƏLƏ 1 — Backend Özəyi (Addım 1-5) ═══

---

### ADDIM 1 — auth.js düzəlişi
**Fayl:** server/middleware/auth.js
**Problem:** req.user.id = undefined → 14 modul sınır
**Dəyişiklik:**
```js
// KÖHNƏ (11-ci sətir):
req.user = { _id: decoded.id, role: decoded.role };

// YENİ:
req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
```
Eyni dəyişikliyi optionalAuth funksiyasında da et (~25-ci sətir).

**Test:** npm run dev → GET /api/users/profile → 200 + user obyekti gəlməlidir

---

### ADDIM 2 — auth.service.js: qeydiyyatda rol profili yarat
**Fayl:** server/modules/auth/auth.service.js
**Problem:** Student/Teacher/Parent/Gamification yaranmır
**Dəyişiklik — User.create-dən sonra əlavə et:**
```js
const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');
const Parent = require('../parent/parent.model');
const Gamification = require('../gamification/gamification.model');

// User.create-dən sonra:
if (created.role === 'student') {
  await Student.create({ userId: created._id, grade: 1, school: '' });
  await Gamification.create({ studentId: created._id });
}
if (created.role === 'teacher') {
  await Teacher.create({ userId: created._id });
}
if (created.role === 'parent') {
  await Parent.create({ userId: created._id });
}
```

**Test:** Yeni student qeydiyyat → MongoDB-də Student + Gamification sənədləri olmalıdır

---

### ADDIM 3 — /daily/status endpoint-i əlavə et
**Fayl 1:** server/modules/dailyQuestion/daily.routes.js
```js
router.get('/status', authenticate, dailyController.getDailyStatus);
```

**Fayl 2:** server/modules/dailyQuestion/daily.controller.js
```js
exports.getDailyStatus = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const answered = await DailyQuestion.find({
    userId: req.user._id,
    date: today
  });
  res.json({
    success: true,
    data: {
      completed: answered.length,
      total: 5,
      isCompleted: answered.length >= 5
    }
  });
};
```

**Test:** GET /api/daily/status → { completed: 0, total: 5, isCompleted: false }

---

### ADDIM 4 — /competitions/active endpoint-i
**Fayl 1:** server/modules/competition/competition.routes.js
```js
router.get('/active', authenticate, competitionController.getActive);
```

**Fayl 2:** server/modules/competition/competition.controller.js
```js
exports.getActive = async (req, res) => {
  const active = await Competition.find({
    status: { $in: ['waiting', 'active'] }
  }).populate('createdBy', 'name surname');
  res.json({ success: true, data: active });
};
```

**Test:** GET /api/competitions/active → boş massiv [] (DB boşdur)

---

### ADDIM 5 — Seed script: test datası
**Fayl:** server/seed.js (yeni fayl yarat)
Aşağıdakıları yarat:
- 50 sual (riyaziyyat, fizika, tarix, dil, məntiq — müxtəlif yaş qrupları)
- 1 admin user (email: admin@logicora.az, şifrə: Admin123!)
- 3 demo student
- 2 demo teacher
- 3 demo course

**Çalışdır:** node server/seed.js

---

### ═══ MƏRHƏLƏ 2 — Frontend Bağlantısı (Addım 6-10) ═══

---

### ADDIM 6 — Mock datanı sil: Teacher + Parent Dashboard
**Fayllar:**
- client/src/pages/dashboard/Teacher.tsx
- client/src/pages/dashboard/Parent.tsx

**Dəyişiklik — hər .catch() blokunda:**
```ts
// KÖHNƏ:
.catch(() => setData(MOCK_STATS))

// YENİ:
.catch(err => {
  toast.error('Məlumat yüklənmədi');
  console.error(err);
})
```
Bütün MOCK_ dəyişənlərini fayldan sil.

---

### ADDIM 7 — Student Dashboard: real API
**Fayl:** client/src/pages/dashboard/Student.tsx
**Problem:** İki paralel auth sistemi (AuthContext + Redux authSlice)
**Həll:** Yalnız AuthContext istifadə et

```ts
// React Query ilə real endpointlər:
const { data: dailyStatus } = useQuery(
  ['daily-status'],
  () => api.get('/daily/status').then(r => r.data.data)
);

const { data: gamification } = useQuery(
  ['gamification'],
  () => api.get('/gamification/me').then(r => r.data.data)
);

const { data: activeCompetitions } = useQuery(
  ['active-competitions'],
  () => api.get('/competitions/active').then(r => r.data.data)
);
```

---

### ADDIM 8 — Daily Quiz: format düzəlişi
**Fayl:** client/src/pages/quiz/DailyQuiz.tsx
**Problem:** Backend {questions: [...]} qaytarır, frontend Question[] gözləyir

```ts
// KÖHNƏ:
const questions = data as Question[]

// YENİ:
const questions = ((data as any).questions || data) as Question[]
```

---

### ADDIM 9 — Parent URL uyğunsuzluğu
**Fayl:** server/server.js
**Problem:** Frontend /parent, backend /parents istifadə edir

```js
// KÖHNƏ:
app.use('/api/parents', parentRoutes);

// YENİ:
app.use('/api/parent', parentRoutes);
```

---

### ADDIM 10 — Socket.io: client bağlantısı
**Fayl:** client/src/hooks/useSocket.ts

```ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: localStorage.getItem('accessToken') },
  autoConnect: false
});

export const useSocket = () => {
  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);
  return socket;
};
```

---

### ═══ MƏRHƏLƏ 3 — Əksik Modullar (Addım 11-15) ═══

---

### ADDIM 11 — Classroom modulu (backend)
Yeni fayllar yarat:
- server/modules/classroom/classroom.model.js
- server/modules/classroom/classroom.service.js
- server/modules/classroom/classroom.controller.js
- server/modules/classroom/classroom.routes.js

Endpointlər:
```
POST   /api/classroom              → dərs yarat
GET    /api/classroom/:id          → dərs məlumatı
POST   /api/classroom/:id/join     → qoşul
POST   /api/classroom/:id/heartbeat→ distant aktivlik
POST   /api/attendance/scan        → QR skan
```
server.js-ə əlavə et: app.use('/api/classroom', classroomRoutes);

---

### ADDIM 12 — Weekly Mystery modulu (backend)
Yeni fayllar yarat:
- server/modules/weeklyMystery/weeklyMystery.model.js
- server/modules/weeklyMystery/weeklyMystery.controller.js
- server/modules/weeklyMystery/weeklyMystery.routes.js

Endpointlər:
```
GET  /api/weekly-mystery/current  → aktiv sual
GET  /api/weekly-mystery/winners  → keçmiş qaliblər
POST /api/weekly-mystery/answer   → cavab göndər
```
server.js-ə əlavə et: app.use('/api/weekly-mystery', weeklyMysteryRoutes);

---

### ADDIM 13 — Teacher stats endpointləri
**Fayl:** server/modules/teacher/teacher.controller.js

Əlavə et:
```js
// GET /teachers/me/stats
exports.getMyStats = async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user._id });
  res.json({ success: true, data: {
    totalStudents: teacher.totalStudents || 0,
    rating: teacher.rating || 0,
    impactScore: teacher.impactScore || 0
  }});
};

// GET /teachers/me/schedule
exports.getMySchedule = async (req, res) => {
  const groups = await Group.find({ teacherId: req.user._id });
  res.json({ success: true, data: groups });
};
```

Route-lara əlavə et:
```js
router.get('/me/stats', authenticate, teacherController.getMyStats);
router.get('/me/schedule', authenticate, teacherController.getMySchedule);
router.get('/me/students', authenticate, teacherController.getMyStudents);
```

---

### ADDIM 14 — Settings + Accessibility frontend
**Fayl:** client/src/pages/settings/Settings.tsx

```ts
// Cari ayarları yüklə:
const { data } = useQuery(
  ['accessibility'],
  () => api.get('/accessibility/me').then(r => r.data.data)
);

// Ayarları yenilə:
const mutation = useMutation(
  (settings) => api.put('/accessibility/me', settings)
);
```

---

### ADDIM 15 — Chat: Socket.io bağlantısı
**Fayl:** client/src/pages/chat/Chat.tsx

```ts
const socket = useSocket();

// Mesaj göndər:
socket.emit('message:send', { conversationId, content });

// Mesaj al:
socket.on('message:receive', (msg) => {
  setMessages(prev => [...prev, msg]);
});
```

**Fayl:** server/socket.js — bu eventləri əlavə et:
```js
socket.on('message:send', async (data) => {
  // DB-yə saxla
  const msg = await Message.create({...data, senderId: socket.userId});
  // Alıcıya göndər
  io.to(data.conversationId).emit('message:receive', msg);
});
```

---

## 5. TEST PROTOKOLU

Hər addımdan sonra test et:

| # | Test              | Necə                        | Nəticə                          |
|---|-------------------|-----------------------------|---------------------------------|
| 1 | Server qalxır     | npm run dev                 | Port 5000-də işləyir            |
| 2 | MongoDB qoşulur   | Log-da mesaj                | "MongoDB Connected" yazır       |
| 3 | Qeydiyyat         | POST /auth/register         | 201 + token + user              |
| 4 | Giriş             | POST /auth/login            | 200 + token                     |
| 5 | Profil            | GET /users/profile          | 200 + user obyekti              |
| 6 | Student profil    | MongoDB-yə bax              | Student + Gamification var      |
| 7 | Günlük quiz       | GET /daily                  | 5 sual gəlir                    |
| 8 | Yarış             | GET /competitions/active    | Massiv qaytarır                 |
| 9 | Socket.io         | Browser console             | Bağlantı xətası yoxdur          |
|10 | Mock yoxdur       | Network tab                 | MOCK_ datası görünmür           |

---

## 6. CLAUDE CODE İLƏ İŞ ÜSULU

### Başlanğıc əmri — bunu de:
"Bu sənədi oxudum. İndi Addım 1-dən başla.
server/middleware/auth.js faylının tam məzmununu mənə göstər.
Heç nə dəyişmə, yalnız göstər."

### Hər addım protokolu:
1. Claude fayl məzmununu sənə göstərir
2. Sən VS Code-da həmin faylı açırsan
3. Claude dəqiq dəyişikliyi göstərir (köhnə → yeni)
4. Sən dəyişikliyi özün edirsən
5. Test edirsən — nəticəni Claude-a bildirirsən
6. Claude təsdiqləyir → növbəti addım

### Qadağalar:
- Mock data istifadə etmə — heç vaxt
- Bir addımı atlama — sıra vacibdir
- Auto mode-da işlətmə — Ask mode-da qal
- UI dəyişikliyi etmə — əvvəlcə funksionallıq

---

## 7. API CAVAB FORMATI

Bütün endpointlər:
```json
// Uğurlu:
{ "success": true, "data": {}, "message": "string" }

// Xəta:
{ "success": false, "message": "string", "errors": [] }
```

---

## 8. MƏRHƏLƏ CƏDVƏLİ

| Mərhələ               | Addımlar | Nəticə                        |
|-----------------------|----------|-------------------------------|
| 1 — Backend özəyi     | 1-5      | Server + Auth + DB işləyir    |
| 2 — Frontend bağlantı | 6-10     | Real data göstərilir          |
| 3 — Əksik modullar    | 11-15    | Classroom, Mystery, Chat      |
| 4 — UI polishing      | Sonra    | Dizayn + animasiyalar         |

---

LogiCora — Bilik Silahındır.
