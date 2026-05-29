# LogiCora — TAM YOLA SALAN TƏLİMAT
## Claude Code üçün Master Sənəd

> Bu sənəd LogiCora layihəsinin tam yol xəritəsidir.
> Claude Code Ask mode-da, claude-opus modeli ilə oxuyacaq.
> Hər addım sırayla — sən yazırsan, o yoxlayır.

---

## BÖLMƏ 0 — LAYİHƏNİN VİZYONU

### Nə qururuq?
LogiCora — Azərbaycanın milli qamifikasiyalı təhsil platformasıdır.
**Yaş aralığı:** 3 yaşdan 23+ yaşa qədər
**Hədəf:** Hər tələbənin 3 yaşından başlayan, ömürlük rəqəmsal təhsil bio-su

### Dünyada müqayisədə nə fərqlidir?
Tək bir platformada birləşmiş:
- Duolingo (streak, XP, lives, league)
- Kahoot (real-time yarış, PIN)
- Udemy (kurs marketplace)
- LinkedIn (peşəkar portfolio)
- Chess.com (Elo reytinq)
- Classtime (davamiyyət, sinif idarəetməsi)
- Ms. Rachel / CoComelon (kiçik uşaqlar üçün interaktiv öyrənmə)

### İki köməkçi karakter
- **Logi (oğlan)** — mavi #3B82F6, analitik, rəqabətçi
- **Cora (qız)** — bənövşəyi #9333EA, yaradıcı, empatik

İstifadəçi açılışda birini seçir. Seçilən karakter tur rehbəri kimi saytı gəzdirir. Sayt həmin xarakterin rənginə bürünür.

---

## BÖLMƏ 1 — TECH STACK

### Backend (server/)
- Node.js + Express 5
- MongoDB + Mongoose
- Socket.io (real-time)
- JWT + Refresh Token auth
- Joi validation

### Frontend (client/)
- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Redux Toolkit (qlobal state)
- React Query (server state)
- Framer Motion (animasiyalar)
- Socket.io-client
- Recharts (qrafiklər)
- Lottie-react (animasiyalar)
- React Hot Toast (bildirişlər)
- Lucide React (ikonlar)

### .env faylları

**server/.env:**
```
MONGODB_URI=mongodb://localhost:27017/logicora
JWT_SECRET=logicora_jwt_secret_2026
JWT_REFRESH_SECRET=logicora_refresh_secret_2026
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

**client/.env:**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_QUESTION_SOURCE=database
```

---

## BÖLMƏ 2 — HAZIRKI VƏZİYYƏT (DİAQNOZ)

### 3 Kritik Problem

**PROBLEM 1 — req.user.id = undefined**
- server/middleware/auth.js sətir 11: `req.user = { _id: decoded.id }`
- 14 köhnə modul `req.user.id` oxuyur → undefined → hamısı sınır
- Düzəliş: bir sətir 14 modulu sağaldacaq

**PROBLEM 2 — Qeydiyyatda rol profili yaranmır**
- auth.service.js yalnız User + Accessibility yaradır
- Student/Teacher/Parent/Gamification yaranmır
- Nəticə: student flow tam ölüdür (quiz, XP — hamısı 404)

**PROBLEM 3 — Frontend mock dataya düşür**
- Teacher + Parent dashboard `.catch(() => MOCK_DATA)` ilə bitir
- Xəta gizlənir, saxta data göstərilir

### Endpoint Statusu

```
✅ POST /auth/register        - amma rol profili yox
✅ POST /auth/login           - tam düzgün
✅ POST /auth/refresh         - tam düzgün
❌ GET  /users/profile        - req.user.id bug
❌ GET  /gamification/me      - req.user.id + Student yox
⚠️  GET  /daily               - format problem
❌ POST /daily/answer         - req.user.id + Student yox
❌ GET  /daily/status         - yoxdur
✅ GET  /courses              - işləyir
❌ GET  /competitions/active  - yoxdur
❌ /classroom/*               - modul yoxdur
❌ /weekly-mystery/*          - modul yoxdur
❌ /kids/*                    - YENİ modul lazımdır
❌ GET /teachers/me/stats     - yoxdur
❌ GET /parent/children       - URL uyğunsuzluğu
```

### Mövcud Backend Modulları (24)
accessibility, analytics, assessment, attendance, auth, chat, clan, competition, course, dailyQuestion, elo, gamification, group, invite, notification, parent, payment, portfolio, question, ranking, streakFreeze, student, teacher, user

### Əksik Modullar (yaradılmalı)
- **classroom** (online dərs + QR davamiyyət)
- **weeklyMystery** (Həftənin Sirri)
- **kids** (3-8 yaş uşaq kanalı — YENİ)

---

## BÖLMƏ 3 — UŞAQ KANALI (YENİ FEATURE)

### Konsept
3-8 yaş uşaqlar üçün **Ms. Rachel / CoComelon / Blippi** stilində daxili məzmun.
Uşağa danışan video dərslər — söz öyrətmə, məfhum tanıtma, ailə dəyərləri.

### Mövzular (Azərbaycan dilində məzmun)
- 🥕 Tərəvəzlər (rəng, dad, faydası)
- 🍎 Meyvələr (haradan gəlir, vitamin, dad)
- 👨‍👩‍👧 Ailə üzvləri (ana, ata, baba, nənə)
- 🐱 Heyvanlar (ev və vəhşi, səslər)
- 🎨 Rənglər və formalar
- 🔢 Rəqəmlər 1-10, sonra 10-100
- 📝 Hərflər (azərbaycan əlifbası)
- 🌤️ Hava və mövsümlər
- 👃 Bədən üzvləri
- 😊 Emosiyalar (sevincli, qəmgin — necə danışmaq)
- 🧼 Gündəlik vərdişlər (diş, əl yumaq)
- ✅ Nə yaxşıdır, nə pis (əxlaq)
- ⚠️ Təhlükəsizlik (yad adam, yol)

### Video formatı (Ms. Rachel üsulu)
- 2-5 dəqiqəlik qısa videolar
- Logi və Cora aparıcılar
- Real obyektlər + animated overlay
- Söz təkrarı 3-5 dəfə
- Sonunda 1-2 sual: "Yadında qaldımı?"
- Düzgün cavab → konfetti + XP

### Backend Model (kids modulu)
```js
// server/modules/kids/kids.model.js
{
  title: String,
  titleAz: String,
  videoUrl: String,
  thumbnail: String,
  duration: Number,
  category: { type: String, enum: [
    'vegetables','fruits','family','animals','colors',
    'numbers','letters','emotions','habits','safety'
  ]},
  ageGroup: [String], // ['3-5','6-8']
  presenter: { type: String, enum: ['logi','cora','both'] },
  vocabulary: [String],
  questions: [{ q: String, options: [String], correct: Number }],
  views: Number,
  likes: Number,
  isPublished: Boolean
}
```

### Endpoints
```
GET  /api/kids/videos              → bütün videolar
GET  /api/kids/videos/categories   → kateqoriyalar
GET  /api/kids/videos/:id          → tək video
POST /api/kids/videos/:id/view     → baxış say
POST /api/kids/videos/:id/complete → tamamlandı + XP
POST /api/kids/videos/:id/answer   → sual cavabı
GET  /api/kids/progress/me         → irəliləyiş
```

### Frontend səhifələri
- `client/src/pages/kids/KidsHub.tsx` — ana səhifə
- `client/src/pages/kids/VideoPlayer.tsx` — video player
- Yalnız ageGroup ∈ ['3-5','6-8'] olan student görür
- Sidebar-da 🎬 "Uşaq Kanalı"

---

## BÖLMƏ 4 — DÜZƏLİŞ PLANI (ADDIM ADDIM)

### ═══ MƏRHƏLƏ 1: BACKEND ÖZƏYI (1-5) ═══

#### ADDIM 1 — auth.js düzəlişi (ƏN VACİB)
**Fayl:** `server/middleware/auth.js`

**Köhnə (sətir 11):**
```js
req.user = { _id: decoded.id, role: decoded.role };
```

**Yeni:**
```js
req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
```

Eyni dəyişiklik `optionalAuth` funksiyasında (~sətir 25).

**Test:** GET /api/users/profile → 200 + user

---

#### ADDIM 2 — auth.service.js: rol profili yarat
**Fayl:** `server/modules/auth/auth.service.js`

`User.create`-dən sonra əlavə et:
```js
const Student = require('../student/student.model');
const Teacher = require('../teacher/teacher.model');
const Parent = require('../parent/parent.model');
const Gamification = require('../gamification/gamification.model');

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

**Test:** Yeni qeydiyyat → MongoDB-də Student + Gamification var

---

#### ADDIM 3 — /daily/status endpoint
**Fayl 1:** `server/modules/dailyQuestion/daily.routes.js`
```js
router.get('/status', authenticate, dailyController.getDailyStatus);
```

**Fayl 2:** `server/modules/dailyQuestion/daily.controller.js`
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

---

#### ADDIM 4 — /competitions/active endpoint
**Fayl 1:** `server/modules/competition/competition.routes.js`
```js
router.get('/active', authenticate, competitionController.getActive);
```

**Fayl 2:** `server/modules/competition/competition.controller.js`
```js
exports.getActive = async (req, res) => {
  const active = await Competition.find({
    status: { $in: ['waiting', 'active'] }
  }).populate('createdBy', 'name surname');
  res.json({ success: true, data: active });
};
```

---

#### ADDIM 5 — Seed scripti
**Fayl:** `server/seed.js` (yeni)

İçərisində:
- 50 sual (5 fənn × 10 sual): riyaziyyat, fizika, tarix, dil, məntiq
- Hər yaş qrupu üçün uyğun çətinlik
- 1 admin (admin@logicora.az / Admin123!)
- 3 demo student (müxtəlif yaş)
- 2 demo teacher (verified)
- 3 demo course
- 5 daily question

**Çalışdır:** `node server/seed.js`

---

### ═══ MƏRHƏLƏ 2: FRONTEND BAĞLANTISI (6-10) ═══

#### ADDIM 6 — Mock data tamamilə sil
**Fayllar:**
- `client/src/pages/dashboard/Teacher.tsx`
- `client/src/pages/dashboard/Parent.tsx`

Bütün MOCK_ dəyişənlərini sil.
`.catch()` bloklarında:
```ts
.catch(err => {
  toast.error('Məlumat yüklənmədi');
  console.error(err);
})
```

---

#### ADDIM 7 — Student Dashboard real API
**Fayl:** `client/src/pages/dashboard/Student.tsx`

Redux authSlice oxuma — yalnız AuthContext.
React Query ilə:
```ts
const { data: dailyStatus } = useQuery(['daily-status'],
  () => api.get('/daily/status').then(r => r.data.data));

const { data: gamification } = useQuery(['gamification'],
  () => api.get('/gamification/me').then(r => r.data.data));

const { data: activeCompetitions } = useQuery(['active-competitions'],
  () => api.get('/competitions/active').then(r => r.data.data));
```

---

#### ADDIM 8 — Daily Quiz format
**Fayl:** `client/src/pages/quiz/DailyQuiz.tsx`
```ts
const questions = ((data as any).questions || data) as Question[];
```

---

#### ADDIM 9 — Parent URL düzəlişi
**Fayl:** `server/server.js`
```js
app.use('/api/parent', parentRoutes); // /parents deyil
```

---

#### ADDIM 10 — Socket.io client
**Fayl:** `client/src/hooks/useSocket.ts`
```ts
import { io } from 'socket.io-client';
import { useEffect } from 'react';

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: localStorage.getItem('accessToken') },
  autoConnect: false,
});

export const useSocket = () => {
  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => { socket.disconnect(); };
  }, []);
  return socket;
};
```

---

### ═══ MƏRHƏLƏ 3: ƏKSİK MODULLAR (11-15) ═══

#### ADDIM 11 — Classroom modulu (backend)
Yeni fayllar:
- `server/modules/classroom/classroom.model.js`
- `server/modules/classroom/classroom.service.js`
- `server/modules/classroom/classroom.controller.js`
- `server/modules/classroom/classroom.routes.js`

Model:
```js
{
  title: String,
  teacherId: ObjectId,
  groupId: ObjectId,
  scheduledAt: Date,
  duration: Number,
  qrToken: String,
  qrExpiresAt: Date,
  status: { enum: ['scheduled','live','ended'] },
  participants: [{ studentId, joinedAt, leftAt, isPresent }],
  recordingUrl: String,
  liveQuizzes: [{ question, options, correct, askedAt, responses: [] }]
}
```

Endpointlər:
```
POST   /api/classroom                → dərs yarat
GET    /api/classroom/:id            → məlumat
POST   /api/classroom/:id/start      → başlat + QR
POST   /api/classroom/:id/join       → qoşul
POST   /api/classroom/:id/heartbeat  → distant aktivlik
POST   /api/classroom/:id/end        → bitir
POST   /api/attendance/scan          → QR skan
POST   /api/classroom/:id/quiz       → canlı quiz
POST   /api/classroom/:id/poll       → sorğu
```

server.js-ə: `app.use('/api/classroom', classroomRoutes);`

---

#### ADDIM 12 — Weekly Mystery modulu
Yeni fayllar:
- `server/modules/weeklyMystery/weeklyMystery.model.js`
- `server/modules/weeklyMystery/weeklyMystery.controller.js`
- `server/modules/weeklyMystery/weeklyMystery.routes.js`

Model:
```js
{
  question: String,
  type: { enum: ['text','word-puzzle','sequence'] },
  correctAnswer: String,
  letterHints: [Number], // word-puzzle üçün
  releaseAt: Date,
  endsAt: Date,
  isActive: Boolean,
  attempts: [{ userId, answer, explanation, responseTime, isCorrect, submittedAt }],
  winner: { userId, foundAt },
  isFinalsRound: Boolean
}
```

Endpointlər:
```
GET  /api/weekly-mystery/current  → aktiv sual
GET  /api/weekly-mystery/winners  → keçmiş qaliblər
POST /api/weekly-mystery/answer   → cavab + izah
GET  /api/weekly-mystery/stats    → statistika
```

---

#### ADDIM 13 — Kids modulu (YENİ — uşaq kanalı)
Yeni fayllar:
- `server/modules/kids/kids.model.js`
- `server/modules/kids/kids.controller.js`
- `server/modules/kids/kids.routes.js`
- `server/modules/kids/progress.model.js`

Yuxarıda BÖLMƏ 3-də tam göstərildi.

Default kateqoriyalar (Azərbaycan dilində):
- 🥕 Tərəvəzlər
- 🍎 Meyvələr
- 👨‍👩‍👧 Ailə üzvləri
- 🐱 Heyvanlar
- 🎨 Rənglər
- 🔢 Rəqəmlər
- 📝 Hərflər
- 😊 Emosiyalar
- 🧼 Gündəlik vərdişlər
- ⚠️ Təhlükəsizlik

server.js-ə: `app.use('/api/kids', kidsRoutes);`

---

#### ADDIM 14 — Teacher stats endpointləri
**Fayl:** `server/modules/teacher/teacher.controller.js`

```js
exports.getMyStats = async (req, res) => {
  const teacher = await Teacher.findOne({ userId: req.user._id });
  const groupCount = await Group.countDocuments({ teacherId: req.user._id });
  res.json({ success: true, data: {
    totalStudents: teacher?.totalStudents || 0,
    rating: teacher?.rating || 0,
    impactScore: teacher?.impactScore || 0,
    groupCount
  }});
};

exports.getMySchedule = async (req, res) => {
  const groups = await Group.find({ teacherId: req.user._id });
  res.json({ success: true, data: groups });
};
```

Route:
```js
router.get('/me/stats', authenticate, teacherController.getMyStats);
router.get('/me/schedule', authenticate, teacherController.getMySchedule);
router.get('/me/students', authenticate, teacherController.getMyStudents);
```

---

#### ADDIM 15 — Frontend: Kids Hub
**Fayl 1:** `client/src/pages/kids/KidsHub.tsx`

Layout:
- Yuxarıda: Logi və Cora birlikdə + "Salam balaca dost!"
- 10 kategoriya kartı — böyük emoji + ad
- Hər kart Framer Motion bounce animation
- Son izlədikləri videolar — "Davam et"
- "Yeni" videolar bölməsi

**Fayl 2:** `client/src/pages/kids/VideoPlayer.tsx`

Layout:
- Böyük video player (mərkəzdə)
- Yanında Logi və ya Cora animasiyalı
- Altda: video boyu öyrənilən sözlər
- Video bitəndə: 1-2 sadə sual
- Düzgün cavab → XP + konfetti
- "Növbəti video" düyməsi

Router-ə:
```ts
<Route path="/kids" element={<ProtectedRoute><KidsHub /></ProtectedRoute>} />
<Route path="/kids/video/:id" element={<ProtectedRoute><VideoPlayer /></ProtectedRoute>} />
```

Sidebar-a (yalnız 3-5 və 6-8 üçün):
```ts
if (['3-5','6-8'].includes(user.ageGroup)) {
  links.push({ icon: '🎬', label: 'Uşaq Kanalı', path: '/kids' });
}
```

---

### ═══ MƏRHƏLƏ 4: TƏKMİL FEATURE-LƏR (16-19) ═══

#### ADDIM 16 — Settings + Accessibility
**Fayl:** `client/src/pages/settings/Settings.tsx`

```ts
const { data: settings } = useQuery(['accessibility'],
  () => api.get('/accessibility/me').then(r => r.data.data));

const mutation = useMutation((newSettings) =>
  api.put('/accessibility/me', newSettings), {
    onSuccess: () => {
      queryClient.invalidateQueries(['accessibility']);
      toast.success('Ayarlar saxlanıldı');
    }
  });
```

Toggle-lar:
- Font ölçüsü (sm/md/lg/xl)
- Yüksək kontrast
- Audio sual oxuma (Web Speech API)
- Sadə UI rejimi
- Animasiyasız rejim (prefers-reduced-motion)

---

#### ADDIM 17 — Chat: Socket.io
**Fayl:** `client/src/pages/chat/Chat.tsx`
```ts
const socket = useSocket();

useEffect(() => {
  socket.emit('join:conversation', conversationId);
  socket.on('message:receive', (msg) => {
    queryClient.invalidateQueries(['messages', conversationId]);
  });
  return () => { socket.off('message:receive'); };
}, [conversationId]);

const sendMessage = () => {
  socket.emit('message:send', { conversationId, content });
};
```

**Fayl:** `server/socket.js`
```js
socket.on('join:conversation', (conversationId) => {
  socket.join(conversationId);
});

socket.on('message:send', async (data) => {
  const Message = require('./modules/chat/message.model');
  const msg = await Message.create({
    conversationId: data.conversationId,
    senderId: socket.userId,
    content: data.content
  });
  io.to(data.conversationId).emit('message:receive', msg);
});
```

---

#### ADDIM 18 — Onboarding tam işlək
**Fayl:** `client/src/pages/Onboarding.tsx`

5 addım — Framer Motion AnimatePresence:
1. Salamlama + ad input (Logi gəlib salam verir)
2. Yaş qrupu (7 dünya kartı stagger)
3. Hobbi testi (5 fərqli formatda sual)
4. Bilik səviyyəsi (3 sual, sistem təyin edir)
5. Avatar qutusu (animasiyalı hədiyyə açılışı)

Sonda:
```ts
api.post('/auth/complete-onboarding', {
  ageGroup, characterType, hobbies, knowledgeLevel
});
navigate('/dashboard/student');
```

---

#### ADDIM 19 — Landing: Logi+Cora seçim
**Fayl:** `client/src/pages/Landing.tsx`

Hero — ortadan bölünmüş:
- Sol: Logi 🤖 (mavi)
- Sağ: Cora 🪄 (bənövşəyi)
- Mərkəzdə: animasiyalı şimşək
- Hover: yarı genişlənir
- Klik: sayt həmin rəngə bürünür, tur başlayır

Tur (scroll bölmələri):
- Hər bölmədə seçilən karakter "danışır"
- Quiz bölməsi: "Bax, hər gün sual gəlir..."
- Yarış bölməsi: "Bu PIN-i göndər..."
- Portfolio bölməsi: "Hər nailiyyət burda..."
- Sonda: "Qeydiyyatdan keç!" CTA

---

## BÖLMƏ 5 — TEST PROTOKOLU

| # | Test | Necə | Gözlənilən |
|---|------|------|------------|
| 1 | Server qalxır | `cd server && npm run dev` | Port 5000 |
| 2 | DB qoşulur | Log yoxla | "MongoDB Connected" |
| 3 | Qeydiyyat | POST /auth/register (Postman) | 201 + token |
| 4 | Giriş | POST /auth/login | 200 + token |
| 5 | Profil | GET /users/profile + Bearer | 200 + user |
| 6 | Student profili | MongoDB Compass | Student + Gamification var |
| 7 | Daily | GET /daily | 5 sual |
| 8 | Yarış | GET /competitions/active | massiv |
| 9 | Socket | Browser console | bağlantı OK |
| 10 | Mock yox | Network tab | MOCK_ görünmür |
| 11 | Frontend dev | `cd client && npm run dev` | Port 5173 |
| 12 | Login flow | Browser-də qeydiyyat→giriş→dashboard | Real data |
| 13 | Kids hub | /kids səhifəsi | 10 kateqoriya |
| 14 | Quiz | Daily Quiz tam keç | XP qazanır |
| 15 | Settings | Accessibility dəyiş | DB-də saxlanır |

---

## BÖLMƏ 6 — CLAUDE CODE İLƏ İŞ ÜSULU

### Tələblər
- Mode: **Ask mode** (Auto deyil!)
- Model: **claude-opus** (ən güclü)
- Heç vaxt özbaşına fayl yazma — yalnız göstər

### Hər addım protokolu
1. Sən: "Addım X-ə keç"
2. Claude faylın **tam məzmununu** göstərir
3. Claude **dəqiq dəyişikliyi** göstərir (köhnə → yeni)
4. Sən VS Code-da özün yazırsan
5. Test edirsən
6. Sən: "İşlədi" və ya xəta mesajı kopyala
7. Növbəti addıma keçirsiniz

### Qadağalar
- Mock/saxta data — heç vaxt
- Addımı atlamaq — sıra vacibdir
- UI dəyişikliyi — funksionallıq bitənə qədər yox
- Birdən çox dəyişiklik — bir addımda yalnız bir iş

### Xəta olduqda
1. Terminal xətasını kopyala
2. Claude-a bütün xəta mesajını yapışdır
3. Claude analiz edər, dəqiq həll deyər
4. Sən yazırsan, yenidən test edirsən

---

## BÖLMƏ 7 — API CAVAB FORMATI

Bütün endpointlər:
```json
{ "success": true, "data": {}, "message": "string" }
```

Xəta:
```json
{ "success": false, "message": "string", "errors": [] }
```

Auth header: `Authorization: Bearer <accessToken>`

---

## BÖLMƏ 8 — XÜSUSI FEATURE-LƏR

### 8.1 Logi + Cora karakter sistemi
- 2 köməkçi karakter bütün platformada
- Açılışda istifadəçi birini seçir
- Seçilən karakter tur rehbəri kimi
- Sayt həmin rəngə bürünür
- Hər səhifədə kömək edir

### 8.2 Həftənin Sirri (3 format)
- Hər bazar ertəsi 09:00-da
- Bütün Azərbaycanda eyni sual
- Format A: Çətin sual + izah
- Format B: **Söz tapmaca (polucudes)** — Logi sual verir, Cora hərf verir
- Format C: Rəqəm ardıcıllığı
- AI qorunma: vaxt + izah + canlı final

### 8.3 Gələcəkdən səs bildirişi
Yaşa görə fərqli ton:
- 3-8: "Qəhrəmanın bu gün tapşırığını gözləyir!"
- 9-14: "Anar səni keçdi, sən 4-cüsən"
- 15+: "Mən 10 il sonrakı sənsən. Bugün o tapşırığı keç."

### 8.4 Avatar hədiyyə sistemi
- Onboardingdə qutu açılışı animasiyası
- 3 kilidli forma görünür — XP ilə açılır
- Pullu avatarlar yarış qələbəsində pulsuz qazanılır

### 8.5 Klan sistemi
- Tələbələr klan yaradır (məktəb əsaslı)
- Klan döyüşləri (vaxt yarışı / qarışıq / fənn)
- Sıralama: sinif → məktəb → şəhər → ölkə

### 8.6 Canlı yayım dəstəyi
- Dostlar tələbənin canlı yarışını izləyir
- Reaksiya göndərmə (🔥 ⚡ 💪)
- TikTok/YouTube inteqrasiyası (gələcək)

### 8.7 Uşaq kanalı (YENİ — 3-8 yaş)
- 2-5 dəqiqəlik öyrədici videolar
- Logi və Cora aparıcı
- 10 kateqoriya
- Video sonunda kiçik suallar
- XP qazanma

### 8.8 Tələbənin gələcəyi (AI)
- 8 ildən AI portret çəkir
- "Sənin profilinə görə bu peşələr uyğun..."
- Real Azərbaycan bazar tələbatı

---

## BÖLMƏ 9 — MƏRHƏLƏ XƏRİTƏSİ

| Mərhələ | Addımlar | Nəticə |
|---------|----------|--------|
| 1 — Backend özəyi | 1-5 | Auth + DB tam işləyir |
| 2 — Frontend bağlantı | 6-10 | Real data, mock yox |
| 3 — Əksik modullar | 11-15 | Classroom, Mystery, Kids |
| 4 — Təkmil feature-lər | 16-19 | Settings, Chat, Onboarding, Landing |
| 5 — UI polishing | sonra | Dizayn təkmilləşməsi |

---

## BÖLMƏ 10 — BAŞLANĞIC ƏMRİ

Claude Code-a bunu yapışdır:

```
@LOGICORA_DEV_GUIDE.md sənədini tam oxu.

Ask mode-dasan. Hər addım üçün:
1. Mənə faylı göstər
2. Dəyişikliyi izah et
3. Mən yazacağam, sən gözlə
4. Test nəticəsini deyəcəm
5. Sonra növbəti addıma keçəcəyik

Heç vaxt özbaşına fayl yazma.
Heç vaxt mock data təklif etmə.
Hər izah Azərbaycan dilində olsun.

İndi Addım 1-dən başla:
server/middleware/auth.js faylını tam göstər.
```

---

**LogiCora — Bilik Silahındır. 🚀**
