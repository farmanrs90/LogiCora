# LOGICORA_MASTER_EXECUTION_PLAN_V2

## 0. Əsas qərar

LogiCora artıq sadə diplom demosu kimi idarə olunmur.

Məqsəd:

**22 iyuna qədər mövcud zəngin sistemi işlək, stabil, təqdimata hazır diplom versiyasına çevirmək.**

Bu o deməkdir:

- Heç nə silinmir.
- Heç bir route silinmir.
- Heç bir feature silinmir.
- Mövcud backend varsa frontend ona bağlanır.
- İşləməyən klik qalmamalıdır.
- İşləməyən funksiya ya düzəldilir, ya da istifadəçini çaşdırmayacaq axına salınır.
- Nazirlik hissəsi kod və roadmap-da qalır, amma public UI-da aktiv görünmür.
- Yeni böyük feature yazılmır; mövcud sistem stabil edilir.

---

## 1. LogiCora nədir?

**LogiCora — 3 yaşdan iş həyatına qədər insanın bütün təhsil yolunu saxlayan, analiz edən və yönləndirən canlı Təhsil Pasportu və Learning Operating System platformasıdır.**

Bu platforma:

- Məktəbəqədər uşaqlar üçün öyrənmə sistemi
- Məktəblilər üçün gamified learning platform
- Valideynlər üçün uşaq inkişaf paneli
- Müəllimlər üçün kurs/dərs/quiz/CRM sistemi
- Kurs mərkəzləri üçün idarəetmə və marketplace sistemi
- Tələbələr və böyüklər üçün verified portfolio/CV
- Gələcəkdə nazirlik üçün milli analitika qatıdır

---

## 2. Məhsulun əsas sütunları

### 2.1 Education Passport

İnsanın bütün təhsil tarixi bir profildə saxlanmalıdır:

- Məktəbəqədər inkişaf
- Meyvə/rəng/heyvan/sadə məntiq öyrənməsi
- Məktəb nəticələri
- Davamiyyət
- Kurslar
- Online dərslər
- Meet/group lesson iştirakları
- Quiz nəticələri
- Yarış nəticələri
- Sertifikatlar
- Portfolio layihələri
- Olimpiadalar
- Hackathonlar
- Tövsiyələr
- Skill graph
- Interest timeline
- Career direction

### 2.2 Learning Timeline

İstifadəçi 3 yaşda da başlaya bilər, 16 yaşda da, 30 yaşda da.

Timeline nümunəsi:

- 5 yaş: meyvələr və rənglər
- 8 yaş: məntiq oyunları
- 13 yaş: robototexnika
- 16 yaş: Python
- 22 yaş: Frontend
- 30 yaş: AI/DevOps

### 2.3 Attendance Timeline

Məktəb, kurs və online dərslərdə davamiyyət passport-a yazılmalıdır.

Nümunə:

- Code Academy — Davamiyyət 94%
- Məktəb — Davamiyyət 91%
- Online Frontend Group — 72 dərsdən 68 iştirak

### 2.4 Verified Certificates

Sertifikatlar verən qurum tərəfindən əlavə olunmalıdır.

Səviyyələr:

- Institution verified
- School verified
- Ministry verified
- User uploaded / unverified

### 2.5 Skill Graph və Interest Timeline

Maraq profili dərhal formalaşmır. İllər ərzində yığılır.

AI bunu analiz edir, amma insanın yerinə qərar vermir.

### 2.6 Career Mentor AI

AI heç vaxt deməməlidir: “Sən bunu olmalısan.”

Düz yanaşma:

“Toplanmış nəticələrə əsasən bu sahələr sənə uyğun görünür.”

### 2.7 Logi və Cora

Logi və Cora sadəcə chatbot deyil.

- Logi: analiz, məntiq, planlama, performans
- Cora: motivasiya, ünsiyyət, yaradıcılıq, yumşaq yönləndirmə

Onlar istifadəçiyə sistemdə yol göstərməlidir:

- Haradayam?
- Nə etməliyəm?
- Nəyə baxmalıyam?
- Hansı dərsi keçməliyəm?
- Portfolio-da nə güclüdür?
- Valideyn/müəllim nə görməlidir?

---

## 3. 22 iyuna qədər mütləq işləməli hissələr

### Auth

- Register
- Login
- Logout
- Onboarding
- Role-based redirect
- Protected routes
- Student/Teacher/Parent guards

### Student

- Dashboard
- Daily Quiz
- Competition
- Courses
- Portfolio / Education Passport
- Gamification
- Notifications
- Chat minimum axın

### Teacher

- Dashboard
- Groups
- Course management görünüşü
- Competition create
- Analytics
- Attendance/Classroom varsa route işlək olmalıdır
- Chat

### Parent

- Dashboard
- Child progress
- Attendance/progress/kurs/quiz nəticələri
- Child link seed və ya real data ilə işləməlidir

### Core Learning

- Courses list/detail
- Daily Quiz
- Live Competition
- Portfolio
- Kids Hub
- Weekly Mystery əgər route-dadırsa işləməlidir

### System Stability

- ErrorBoundary
- CourseList response adapter
- Broken route fix
- Sidebar route fix
- Seed data
- Empty/loading/error states
- TypeScript pass

---

## 4. 22 iyuna qədər yazılmayacaq, amma roadmap-da qalacaq hissələr

Bu hissələr silinmir, sadəcə əsas public flow kimi aktiv edilməyə tələsmirik:

- Ministry Dashboard
- Employer Portal
- Institution CRM full version
- Advanced AI Memory
- National Talent Map
- Full email verification
- Google OAuth
- Payment production flow
- Advanced recommendation letters

Bunlar təqdimatda “gələcək mərhələ” kimi danışılır.

---

## 5. Nazirlik qatının qaydası

Nazirlik hissəsi:

- kodda qala bilər
- roadmap-da mütləq qalır
- təqdimatda danışılır
- normal istifadəçiyə public UI-da görünmür

Gələcəkdə aktivləşmə modeli:

- MINISTRY_MODE=true
- admin/superadmin rol
- school/region analytics
- national talent map
- attendance transparency
- education health score

---

## 6. Texniki reallıq

Layihədə artıq çox geniş backend var:

- Auth
- User
- Student
- Teacher
- Parent
- Gamification
- Daily Question
- Competition
- Course
- Portfolio
- Clan
- Chat
- Kids
- Classroom
- Attendance
- Analytics
- Assessment
- Payment
- Weekly Mystery
- Accessibility
- Notifications
- Groups
- Invites
- ELO
- Streak Freeze

Ona görə yanaşma:

**Yeni sistem yaratma → mövcud sistemi bağla və stabil et.**

---

## 7. Kritik risklər

### Risk 1 — CourseList response shape

Backend `data: Course[]` qaytara bilər, frontend `{ courses, nextPage, total }` gözləyə bilər.

Bu ağ ekran riski yaradır.

### Risk 2 — ErrorBoundary yoxdur

Bir runtime error bütün app-i ağ ekran edə bilər.

### Risk 3 — Sidebar broken routes

Route varsa işlət, yoxdursa mövcud uyğun route-a yönləndir. Silmə.

### Risk 4 — Teacher/Parent data boşluğu

Backend endpoint varsa bağla.
Yoxdursa seed/fallback ilə real görünüş ver.

### Risk 5 — Git dirty state

Repo-da çoxlu dəyişiklik var. Hər addımdan əvvəl backup/commit vacibdir.

---

## 8. İcra ardıcıllığı

### Faza 0 — Stabilizasiya

1. Backup branch yarat
2. ErrorBoundary əlavə et
3. CourseList response adapter düzəlt
4. TypeScript check

### Faza 1 — Navigation və route

1. Sidebar linklərini yoxla
2. Müəllim linkləri işləsin
3. Valideyn linkləri işləsin
4. 404 verən əsas klik qalmasın

### Faza 2 — Teacher

1. Teacher dashboard real endpointlərə bağlansın
2. Groups/Analytics/Courses/Competition/Create/Classroom route-ları işləsin
3. Boş ekran olmasın

### Faza 3 — Parent

1. Parent login
2. Parent-child link
3. Child progress
4. Attendance/progress/course/quiz məlumatları

### Faza 4 — Student core flow

1. Dashboard
2. Daily Quiz
3. Competition
4. Courses
5. Portfolio
6. XP/gamification

### Faza 5 — Seed data

1. Student demo user
2. Teacher demo user
3. Parent demo user
4. Child link
5. Courses
6. Questions
7. Competition PIN
8. Portfolio timeline
9. Gamification data

### Faza 6 — Final polish

1. Azərbaycan dili copy
2. Empty/loading/error states
3. Responsive
4. Presentation flow
5. Backup video

---

## 9. Claude və Codex iş bölgüsü

### Claude

Claude kod yazmır, əvvəl analiz edir.

Claude üçün:

- full project understanding
- endpoint/page mapping
- file-level plan
- risk analysis
- large component review
- UX consistency review

### Codex

Codex yalnız kiçik konkret task icra edir.

Codex üçün:

- import fix
- type fix
- response adapter
- route path fix
- small UI bug
- ErrorBoundary kimi kiçik isolated component
- loading/empty state polish

Codex-ə böyük task verilmir.

---

## 10. Hər AI taskının əvvəlində yazılacaq daimi qayda

HEÇ BİR FAYL SİLMƏ.
HEÇ BİR ROUTE SİLMƏ.
HEÇ BİR FEATURE SİLMƏ.
HEÇ BİR BACKEND LOGIC SİLMƏ.
Mövcud UI richness qorunsun.
Mövcud backend varsa frontend ona bağlansın.
İşləməyən funksiya qalmamalıdır.
Nazirlik hissəsi kodda və roadmap-da qalsın, public UI-da gizli olsun.
Böyük dəyişiklikdən əvvəl Azərbaycan dilində izah və icazə istə.
TypeScript check mütləq keçməlidir.


## AI Execution Mode (Token Saving Mode)

### Claude

Claude böyük işlər üçün istifadə olunur:

* layihə analizi
* memarlıq qərarları
* frontend/backend inteqrasiyası
* böyük componentlər
* böyük refactor
* UX planlama
* roadmap
* təhlükəsizlik analizi

### Codex

Codex yalnız kiçik və təhlükəsiz işlər üçün istifadə olunur:

* import fix
* type fix
* route fix
* endpoint adı düzəlişi
* loading state
* error state
* empty state
* copy düzəlişi
* response adapter
* kiçik UI bug

### Token qənaət qaydası

Əgər dəyişiklik:

* 1–2 fayldadır
* 100 sətirdən azdır
* struktur dəyişmir

→ Codex özü etsin.

Əgər dəyişiklik:

* yeni böyük component yaradırsa
* 3+ fayla toxunursa
* dashboard dəyişirsə
* backend model dəyişirsə
* auth dəyişirsə
* böyük UX qərarıdırsa

→ əvvəl ASK MODE.

Azərbaycan dilində izah versin:

1. Nə dəyişəcək?
2. Hansı fayllar dəyişəcək?
3. Risk nədir?
4. Mən copy-paste edə bilərəmmi?

Sonra icazə alınsın.

### Qəti qadağalar

Codex:

* fayl silə bilməz
* route silə bilməz
* feature silə bilməz
* sidebar gizlədə bilməz
* dashboard sadələşdirə bilməz

İcazəsiz.

### Əsas prinsip

Böyük iş = ASK

Kiçik iş = AUTO FIX

