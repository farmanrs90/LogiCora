---
title: "LogiCora Master Roadmap — AI İcra Planı"
source: "LogiCora_Master_Roadmap_Guclendirilmis_Product_Vision.docx"
purpose: "Claude və Codex arasında addım-addım iş bölgüsü"
deadline: "22 İyun"
---

> Bu MD fayl gücləndirilmiş product vision sənədindən çıxarılıb və əlavə olaraq hər icra addımında hansı AI ilə işləmək lazım olduğunu göstərir. Məqsəd: Claude limiti bitəndə Codex-lə təhlükəsiz davam etmək, Codex böyük faylda çətinlik çəkəndə isə Claude-a qayıtmaqdır.

# LogiCora

MASTER ROADMAP

Vahid Birləşdirilmiş Sənəd — Vizyon · Audit · İcra Planı

Real-data Diplom Demo  →  Startup MVP  →  Nazirlik Platforması

3 sənədin birləşdirilməsindən: tam ideya kataloqu + kod-səviyyə audit + hazır prompt-lar

Tarix: 16 İyun 2026  ·  Deadline: 22 İyun

# Mündəricat

# 1. İcra Xülasəsi

Bu sənəd üç ayrı analizin (bir Claude + iki ChatGPT) ən güclü hissələrinin birləşməsidir: tam məhsul vizyonu və ideya kataloqu, kod-səviyyə baq auditi, hazır AI prompt-ları və 22 iyun diplom təqdimatına qədər addım-addım plan.

Əsas prinsip (üç sənəddə də ortaq): məqsəd yeni feature yazmaq DEYİL — mövcud zəngin sistemi real data ilə işlək, qırılmayan, təqdimata hazır vəziyyətə gətirmək. Heç bir fayl/route/feature silinmir. Nazirlik qatı kodda qalır, public UI-da gizli.

| Sahə | Vəziyyət | Qeyd |
| --- | --- | --- |
| Backend modullar (27) | Hazır | Real controller/service/model; node --check 140/140 PASS |
| Auth / rol profili | Hazır | req.user.id və register rol profili düzəlib |
| Seed / demo data | Hazır | Demo user, kurs, classroom, attendance |
| Mock fallback təmizliyi | ~90% | clans/Detail, portfolio/View qalıb |
| Backend P0/P1 baqlar | Bağlanmalı | Aşağıda audit cədvəli |
| Route bütövlüyü (404) | Yoxlanmalı | Klik-test lazımdır |
| UI cilalanması | Qismən | ui-polish-dən seçərək |
| AI sual mənbəyi / Logi-Cora AI | Post-demo | Diplom üçün deyil |
| Nazirlik qatı | Gizli qalır | Kodda var, UI-da yox |


# 2. Kritik Qərar: Hansı Zip Əsasdır?

Üç analiz bu nöqtədə razı deyil — bu, hər şeydən əvvəl həll olunmalıdır, çünki bütün iş onun üzərində aparılacaq.

| Mənbə | Tövsiyə | Əsas |
| --- | --- | --- |
| Claude analizi | main əsasdır | main HEAD = 2c6b456; log-da "merge: stabilization into main"; teacher analytics + rol profil düzəlişləri main-də commit olunub |
| ChatGPT Audit | stabilization əsasdır | main-i stabil checkpoint sayır (commit 2c6b456 — düzgün) |
| ChatGPT Status | stabilization (qeyri-dəqiq) | main-i köhnə 03917a5 commit-də göstərir — bu analiz olunan zip üçün SƏHVDİR |


Qəti həll yolu — öz kompüterində bu iki əmri işlət:

git log main..stabilization-next --oneline    # stab-da olub main-də olmayanlar

git log stabilization-next..main --oneline    # main-də olub stab-da olmayanlar

- Birinci nəticə BOŞdursa → main hər şeyə malikdir; main-də işlə.

- Birinci nəticə BOŞ deyilsə → stabilization irəlidədir; stabilization-da işlə və sonra main-ə fast-forward et.

Hər iki halda nəticə eynidir: bir əsas branch seç, ona sadiq qal, ui-polish-i bütöv merge etmə.

# 3. Üç Zip və Branch / Merge Qərarı

| Zip / Branch | Nədir | İstifadə |
| --- | --- | --- |
| LogiCora.zip (main) | .git var; stabilization merge olunub; üstündə commit olunmamış dəyişiklik. HEAD 2c6b456. | Əsas (2-ci bölmədəki yoxlamadan sonra) |
| LogiCora-stabilization.zip | Ən aktual backend fix-lər: teacher/me, analytics, course normalization, parent childEmail link, classroom seed. | Backend mənbəyi |
| LogiCora-ui-polish.zip | intro komponenti, avatar/assets, UI dəyişiklikləri. Backend isə stabilization-dan geridədir. | YALNIZ seçilmiş UI faylı |


Qəti qayda: ui-polish-i bütöv merge etmək olmaz — backend fix-ləri geri çevirə bilər (teacher/me yoxdur, classroom seed çıxarılıb, attendance scan path köhnədir). UI-dan yalnız konkret fayllar (məs. PageWrapper, intro komponenti) manual köçürülür; server qovluğu UI-dan götürülmür.

Paylaşım üçün təmiz zip: git archive --format=zip -o ../LogiCora-final.zip HEAD (node_modules/.git/.env düşməsin).

# 4. LogiCora Nədir (Vizyon)

LogiCora — 3 yaşdan iş həyatına qədər insanın bütün təhsil yolunu saxlayan, doğrulayan və analiz edən canlı Təhsil Pasportu və Learning Operating System platformasıdır; tələbə, valideyn, müəllim, kurs mərkəzi, işəgötürən və könüllü olaraq dövlət təhsil orqanlarını bir ekosistemdə birləşdirir.

İki yol birlikdə dəstəklənir:

- Startup / Public Mode — nazirlik təsdiqi olmadan işləyir. Birinci və əsas yol.

- Government / Ministry Mode — könüllü milli analitika qatı. İkinci yol.

Strateji prinsip: platforma nazirlik qəbul etməsə belə yaşamalı və böyüməlidir.

### Hədəf yaş qrupları

| Yaş | Fokus |
| --- | --- |
| 3–5 | Meyvə, rəng, heyvan, səs, sadə məntiq, nitq, valideyn dəstəkli; böyük kart, audio, sakit animasiya |
| 6–8 | Oxu, yazı, əsas riyaziyyat, məntiq, vərdişlər |
| 9–11 | Fənlər, yarışlar, hobbi, erkən bacarıq siqnalları |
| 12–14 | Güclü yarış, skill graph, kurs kəşfi, layihələr |
| 15–17 | Karyera siqnalları, portfolio, sertifikat, imtahan hazırlığı |
| 18–22 | Universitet, təcrübə, doğrulanmış sertifikat, işəgötürən görünürlüyü |
| 23+ | Lifelong learning, peşəkar profil, iş müraciəti |


# 5. Tam İdeya Kataloqu

Layihənin BÜTÜN ideyaları bir yerdə. Heç biri silinmir; bəziləri MVP-dən sonraya qalır (P3/P4 kimi işarələnir).

## 5.1 Əsas Məhsul Sütunları

- Education Passport — ömürlük profil: təhsil tarixi, sertifikat, nailiyyət, yarış, kurs, layihə, bacarıq, tövsiyə.

- Learning Timeline — 3 yaşdan böyüklüyə xronoloji öyrənmə xətti.

- Interest Timeline — maraqların illər ərzində dəyişməsi.

- Skill Graph — vizual bacarıq xəritəsi (riyaziyyat, məntiq, proqramlaşdırma, yaradıcılıq, liderlik...).

- Attendance Timeline — məktəb/kurs/online davamiyyət passport-a yazılır.

- Verified Certificates — 4 səviyyə: Institution / School / Ministry verified, User uploaded (unverified).

- Recommendation Letters — müəllim/mentor/qurum/işəgötürən tövsiyələri.

## 5.2 AI Mentor: Logi və Cora

Logi (#3B82F6) — analitik, məntiqi; riyaziyyat, planlama, performans. Sual verir.

Cora (#9333EA) — yaradıcı, motivasiyalı; yaradıcılıq, özünəinam, ünsiyyət. Hərf ipucu açır.

- Eyni AI intellektinin iki şəxsiyyəti — premium personalar, sadə chatbot deyil.

- Memory System (uzunmüddətli təhsil yaddaşı), Growth Story, Memory Moments.

- Career Mentor AI — qərar vermir, yalnız uyğun sahələri təklif edir.

Diplom üçün: avatar/Spline/AI companion DEFERRED. Post-demo premium differentiator kimi roadmap-da qalır.

## 5.3 Öyrənmə Mühərriki və Gamification

- Daily Quiz, Courses Marketplace, Classroom, Assignments.

- Knowledge Arena — 1v1 döyüş (Win +15 / Lose −3 Elo).

- XP, Level, Gems, Hearts, Streak, Leagues, Elo, Clans (məktəblərarası battle).

- "Polucudes" tipli söz tapmacası (Logi sual verir, Cora hərf açır).

## 5.4 Orijinal Yaradıcı İdeyalar

- "Həftənin Sirri" — həftəlik milli sirr sualı, 6 aylıq canlı yayım finalı (TikTok/YouTube).

- "Voice from the Future" — yaşa uyğunlaşan bildiriş sistemi.

- "Zaman Kapsulu" — valideynin uşağa yazdığı, gələcəkdə açılan mesajlar.

- Avatar hədiyyə-açılış onboarding; Split-screen hero (Logi/Cora seçimi temayı dəyişir).

- Spectator mode — canlı yarışda emoji reaksiyaları.

- Uşaq Azərbaycanca təhsil video kanalı (Ms. Rachel üslubu: meyvə, ailə, heyvan, əlifba, emosiya, təhlükəsizlik).

## 5.5 Ekosistem və Rollar

- Rollar: Student (mərkəz), Parent, Teacher, School Admin, Institution, Employer, Ministry.

- Institution CRM — kurs mərkəzləri üçün tam idarəetmə (qrup, davamiyyət, sertifikat, ödəniş, hesabat).

- Employer Network — doğrulanmış portfolio ilə ənənəvi CV-ni əvəz etmək.

- Parent Intelligence Panel — inkişaf, risk siqnalları, həftəlik hesabat.

## 5.6 Inclusive Education System

"Disabled mode" deyil — "Inclusive Education System". Xüsusi ehtiyaclar yalnız könüllü valideyn (və könüllü tələbə) parametrlərində; heç vaxt məcburi/sərt etiketlənmir. 7 günlük passiv uyğunlaşma etiketsizdir.

- Autism: sakit interfeys, az animasiya, proqnozlaşdırılan rutin.

- Down sindromu / inkişaf gecikməsi: böyük kart, sadə tapşırıq, təkrar, səsli izah.

- ADHD: qısa tapşırıq, fokus sessiyası, minimal yayındırma.

- Nitq: tələffüz məşqi, AI səs çalışması. Görmə/eşitmə: yüksək kontrast, screen reader, subtitr.

## 5.7 Monetizasiya

- Parent Premium, Institution CRM SaaS, Course Marketplace komissiyası, Teacher Pro, Employer Tools, dövlət müqavilələri.

# 6. Nə Görülüb

## 6.1 Backend — 27 real modul

Sətir sayına görə ən böyükləri (boş stub deyil, real məntiq):

| Modul | ~LOC | Modul | ~LOC |
| --- | --- | --- | --- |
| course | 888 | gamification | 371 |
| parent | 872 | attendance | 326 |
| competition | 756 | payment | 325 |
| teacher | 731 | chat | 320 |
| clan | 707 | invite / auth | 289 |
| assessment | 581 | question | 249 |
| group | 489 | user | 238 |
| portfolio | 458 | classroom | 226 |
| dailyQuestion | 375 | student | 220 |


Yeganə boş stub: ranking (2 LOC). Digərləri: analytics, streakFreeze, weeklyMystery, elo, kids, notification, accessibility.

## 6.2 Düzəlmiş kritik baqlar

| Baq | Vəziyyət | Necə |
| --- | --- | --- |
| req.user.id undefined | DÜZƏLİB | middleware req.user = { _id, id, role } |
| Register rol profili | DÜZƏLİB | auth.service register-də Student/Teacher/Parent yaradır |
| Mock fallback | ~90% TƏMİZ | Onlarla "remove mock" commit-i girib |


## 6.3 Frontend və Seed

- 48 səhifə (~20,800 sətir TSX); 38 faylda React Query.

- ErrorBoundary, ProtectedRoute, RoleRoute mövcuddur; Quiz formatları A–E.

- server/seed.js geniş: admin, 2 müəllim, tələbələr (gamification), valideyn + uşaq linki, 50 sual, kurslar, KidsVideo, qruplar, 4 classroom sessiyası, attendance.

### Seed demo girişləri (təqdimat üçün)

| Rol | Login | Şifrə |
| --- | --- | --- |
| Student | student2@logicora.az | Test123! |
| Teacher | muellim1@logicora.az | Test123! |
| Parent | parent1@logicora.az | Test123! |


# 7. Kod-Səviyyə Audit (Nə Qalıb)

Hər tapıntı yoxlanma statusu ilə işarələnib: REAL = kodda təsdiqlənib, YOXLA = ehtimal var, lokda test et, YANLIŞ = test edildi, problem deyil.

| Pri | Problem | Fayl / sübut | Status |
| --- | --- | --- | --- |
| P0 | Certificate endpoint yoxdur — frontend /courses/:id/certificate çağırır, route yoxdur (yalnız model sahəsi var). | course.routes.js; constants CERTIFICATE | REAL |
| P1 | Classroom /mine student scope leak — student üçün filter boş {}, bütün classroom-ları qaytarır (kodda TODO comment var). | classroom.controller.js listMine | REAL |
| P1 | Parent seed Student.parentId set etmir — yalnız Parent.children doldurulur; legacy link riski. | seed.js Parent.create; parent.service addChild | YOXLA |
| P1 | Clan battle lifecycle — challenge pending yaradır, finish active gözləyir; dead-end ola bilər. | clan.service.js challenge/finish | YOXLA |
| P1 | Competition finish side-effect loop — bir participant XP/notification error-u qalanları abort edə bilər. | competition.service.js finish | YOXLA |
| P1 | Course enroll duplicate 400 — artıq enrolled kursa təkrar POST 400 spam. | course.service.js enrollStudent | YOXLA |
| P2 | PUT /users/profile mass assignment — req.body birbaşa $set; allowlist lazım (security). | user.service.js updateUserProfile | YOXLA |
| P2 | Parent dashboard childId yox, childEmail input olmalı (UX). | Parent.tsx LinkChildModal | YOXLA |
| P2 | Qalıq mock fayllar — routed deyilsə sil, deyilsə real error state. | clans/Detail.tsx; portfolio/View.tsx | REAL |
| P3 | ranking modulu boş stub (2 LOC) — doldur və ya UI-ı mövcud leaderboard-a yönləndir. | modules/ranking | REAL |
| — | Course route order (/:id vs /my/enrollments) — ChatGPT P0 idi. | course.routes.js | YANLIŞ |


Qeyd: "YANLIŞ" işarəli tapıntı — Express-də /:id yalnız bir seqment tutur, /my/enrollments iki seqmentdir, ona görə toqquşma yoxdur. Yenə də lokda təsdiqlə.

# 8. Git: İşi İtirmədən Qaydaya Salmaq

Backup branch-ların artıq var (backup-stabilization-local, safety-local-main-before-reset). Heç nəyi reset/silmə.

- Vəziyyəti gör: git status, git branch -vv, git log --oneline --graph --all -30.

- 2-ci bölmədəki iki əmrlə əsas branch-ı təyin et.

- Commit olunmamış işi qoru: git switch -c wip-2026-06-16 && git add -A && git commit -m "wip: snapshot".

- ui-polish-dən yalnız lazım faylları gətir: git checkout ui-polish -- <fayl yolu> (server faylı götürmə).

- Hər kiçik fixdən sonra: node --check <fayl> + client-də npx tsc --noEmit, sonra commit.

- Təqdimatdan 1 gün əvvəl: git tag diplom-demo-v1 + təmiz archive zip + backup demo videosu.

Qızıl qayda: böyük dəyişiklikdən əvvəl həmişə commit. Git status clean olmadan növbəti taska keçmə.

# 9. 22 İyuna Qədər İcra Planı

Bu gün 16 iyun, ~6 iş günü. Fazalar:

| Gün | Fokus | Bitmə kriteriyası |
| --- | --- | --- |
| Gün 1 | Git snapshot + stabilizasiya bazası. Backend P0/P1: certificate honest state, classroom scope, parent seed safety. | node --check PASS; əsas endpointlər 200/real error; commit/push |
| Gün 2 | Backend davamı: competition finish hardening, course enroll idempotency, user profile allowlist, clan battle finishable. | P0/P1 endpoint mismatch qalmır; Postman/browser test |
| Gün 3 | Navigation + route: sidebar/navbar linkləri, 404 verən klik qalmasın, CourseList adapter. | Heç bir əsas CTA 404 vermir |
| Gün 4 | Frontend axınlar: Student → Teacher → Parent core flow real data ilə; childEmail link modal. | 3 rolda ağ ekran/fake yoxdur; quizdən çıxış var |
| Gün 5 | UI cilalama: ui-polish-dən seçərək; empty/loading/error tutarlılığı; AZ copy; responsive. | Premium, sadə, ciddi görünüş; console təmiz |
| Gün 6 | Final: tsc tam PASS, klik-test, təqdimat ssenarisi, tag + backup video. | Təqdimat 3 rolda rahat; final zip hazır |


# 10. Hazır AI Prompt Şablonları

Hər prompt kiçik, izolə tapşırıqdır (Codex auto-fix). Hər biri "mock/fake yox, role guard qalsın, dəyişən faylları və request/response shape-i hesabatda yaz, node --check" qaydası ilə.

### 10.1 Certificate honest endpoint

Task: course modulunda /courses/:id/certificate üçün honest endpoint əlavə et: kurs tamamlanmayıbsa not-ready/unavailable qaytar; tamamlanıbsa enrollment.certificateUrl varsa onu, yoxdursa honest "hazır deyil" mesajı. Fake sertifikat yaratma. Frontend button real state göstərsin. Route-u /:id-dən sonra deyil, ayrıca segment kimi əlavə et.

### 10.2 Classroom /mine student scope

Task: classroom.controller.js listMine içində student üçün boş filter {} əvəzinə yalnız iştirak etdiyi və ya group-a aid classroom-ları qaytar. Teacher filteri toxunma. participants.studentId və ya group üzvlüyünə görə filtrlə.

### 10.3 Competition finish hardening

Task: competition.service.js finishCompetition içində participant side-effect loop-u hardened et: status/rank save olunduqdan sonra hər participant üçün awardXP, sendToStudent, updateSkillTree, addTimelineEntry ayrı try/catch olsun. Bir error digərlərini abort etməsin; logla; finish response real competition qaytarsın.

### 10.4 Course enroll idempotency

Task: course.service.js enrollStudent duplicate halında 400 throw etməsin; existing enrollment varsa idempotent/friendly response qaytar, totalEnrolled artırma. Yeni enrollment real modelə yazılsın; role/published guard qalsın.

### 10.5 User profile allowlist

Task: user.service.js updateUserProfile mass-assignment riskini allowlist ilə bağla. Yalnız: name, surname, phone, avatar, characterType, profileCompleted update olunsun. role, email, password, isAdmin, status toxunulmasın.

### 10.6 Parent seed + link safety

Task: seed.js-də Parent.children doldurulanda hər Student üçün Student.parentId də set olunsun. parent.service addChild-də başqa Parent.children-də konflikt yoxla. Backward compatible qalsın.

# 11. Demo Smoke-Test Checklist

| Rol | Test | Gözlənti |
| --- | --- | --- |
| Student | student2@logicora.az login; dashboard; daily quiz (çıxış var); course detail; enrollment list; portfolio; clan; competition | Real data / honest empty/error; fake yoxdur; quizdən çıxış işləyir |
| Teacher | muellim1@logicora.az login; dashboard; analytics; groups; attendance; classroom; storefront | Real analytics; unsupported sahələr readOnly; classroom sessiyaları görünür |
| Parent | parent1@logicora.az login; children; progress; attendance; payments; prefs; time capsule | Seed uşaqlar görünür; childEmail link 200/409/404 düzgün |
| Competition | Teacher create/start, student PIN join/answer, results | Finish crash etmir; ikinci finish safe |
| Clan | create/join/challenge/finish | Dead-end yox; unauthorized finish bağlı |
| Public | Landing, Login/Register, Public Portfolio, Course list | Dead CTA yox; "mock/fake/tezliklə" sözləri görünmür |


# 12. Diplom Təqdimat Axını

- Landing/Login: LogiCora-nı "lifelong education passport" kimi təqdim et.

- Student login: dashboard, XP/level/streak, daily quiz, courses, portfolio, clan/competition.

- Teacher login: dashboard, groups, classroom (live/scheduled/ended), analytics, storefront.

- Parent login: linked children, child progress, attendance, special needs, time capsule.

Yekun cümlə: "Bu sistem uşaqdan böyüyə qədər təhsil izini real data ilə saxlayır; startup mərhələsində kurs mərkəzləri və valideynlər üçün real məhsula çevrilir."

## AI alətlərinin iş bölgüsü

| Alət | Nə üçün |
| --- | --- |
| Claude | Analiz, memarlıq, böyük komponent/refactor, UX planı, Codex prompt-larının yazılması, layihə kontekstinin saxlanması |
| Codex / Claude Code | Kiçik izolə fix: route, type, response adapter, loading/empty/error state, kiçik UI bug (1-2 fayl, <100 sətir) |
| ChatGPT | İkinci rəy, alternativ yanaşma müzakirəsi |
| v0.dev | Yalnız vizual ilham |


Token qaydası: kiçik iş = Codex auto-fix; böyük iş (3+ fayl, dashboard/backend/auth dəyişikliyi) = əvvəl Ask Mode-da izah + icazə.

# 13. Startup → Nazirlik Roadmap

| Mərhələ | Scope | Əsas işlər |
| --- | --- | --- |
| Diplom Demo | Student/Teacher/Parent real-data MVP | Əsas axınlar, real seed, qırılmayan demo, sadə premium UI |
| Startup MVP | Course centers + parents + students | Subscription, teacher CRM, public portfolio link, certificates, payment ledger, analytics, mobil polish |
| Startup v2 | AI companion + advanced gamification | Logi/Cora avatar, Spline/Rive optional, personalized learning, smart recommendation |
| Nazirlik pilotu | School/institution verified passport | Verified certificate, ministry/school dashboard, consent, audit log, standartlar |
| National scale | Multi-institution record | Interoperability, digital signature, official integration, governance |


## Post-demo saxlanan işlər

- Avatar/Spline/Logi-Cora robot və companion widget; real LLM AI mentor/report.

- AI sual mənbəyi keçidi (questions DB ↔ AI provider); hələ .env-də AI key yoxdur.

- Real payment gateway; indi yalnız honest ledger/deferred.

- Official verified certificate authority + QR verification.

- Advanced accessibility (audio, dyslexia/large-text mode); national analytics, ministry dashboard.

- Email verification, Google OAuth, Institution CRM full, Employer Portal.

# 14. İndi Atılacaq İlk 3 Addım

- 2-ci bölmədəki iki git əmrini işlət → əsas branch-ı təyin et və mənə nəticəni yaz.

- Git snapshot/backup et (8-ci bölmə).

- Backend P0-dan başla: certificate honest endpoint (Prompt 10.1) + classroom scope (Prompt 10.2).

Daimi AI qaydası: HEÇ BİR fayl/route/feature/backend logic SİLMƏ. Mövcud backend varsa frontend ona bağlansın. İşləməyən funksiya qalmasın. Nazirlik kodda qalsın, public UI-da gizli. Böyük dəyişiklikdən əvvəl AZ dilində izah + icazə. TypeScript check mütləq PASS.

15. Gücləndirilmiş Product Vision Prinsipləri

Bu əlavə bölmə Master Roadmap-in vizyon hissəsini gücləndirir. Buradakı ideyalar diplomda hamısı kodlanmır; məqsəd LogiCora-nın real startup və gələcək nazirlik səviyyəli platforma vizyonunu aydın saxlamaqdır.

15.1 LogiCora kurs saytı deyil

LogiCora kurs marketplace deyil. Kurslar platformanın yalnız bir moduludur. Əsas məhsul Lifelong Education Passport-dur: uşağın və ya adult learner-in bütün təhsil izini, bacarıqlarını, davamiyyətini, yarışlarını, sertifikatlarını, portfolio-sunu və gələcək karyera siqnallarını bir yerdə saxlayan canlı təhsil profilidir.

Kurs satışı platformanın mərkəzi deyil; Student Passport platformanın mərkəzidir. Course Marketplace yalnız bu passport-u zənginləşdirən data mənbələrindən biridir.

15.2 Student-first architecture

Student platformanın əsas mərkəzidir. Teacher, Parent, Course Center, Employer və Ministry rolları student-in education passport-unun ətrafında qurulur.

Product principle: Student-first architecture — bütün modullar student-in ömürlük təhsil profilini zənginləşdirməlidir.

• Daily Quiz student-in knowledge history-sini yaradır.

• Courses student-in learning progress və certificate data-sını yaradır.

• Classroom və attendance student-in discipline və participation record-unu yaradır.

• Competition və clan student-in performance və teamwork signals-larını yaradır.

• Portfolio bütün bu dataları education passport-a çevirir.

15.3 Parent payment visibility

Parent yalnız progress görmür. Parent həm də ödəniş vəziyyətini şəffaf görməlidir. Real payment gateway post-demo ola bilər, amma parent payment visibility Startup MVP üçün əsas tələbdir.

• Hansı kursa ödəniş edilib və hansı ödəniş qalıb.

• Installment/payment history və ödəniş statusu.

• Course center invoice/read ledger.

• Gecikmə varsa honest status: overdue/pending/paid/partial.

• Parent dashboard-da payment görünürlüyü, backend-də isə manual ledger/deferred gateway prinsipi.

15.4 Teacher CRM — kurs mərkəzləri üçün hazır SaaS sistem

LogiCora kurs mərkəzləri üçün ayrıca CRM rolunu oynayır. Hər kurs mərkəzi öz CRM-ni sıfırdan yazmasın; LogiCora onlara hazır idarəetmə sistemi verir.

• Groups, students, lessons və classroom idarəetməsi.

• Attendance və QR/scan attendance.

• Homework/assignments və course performance.

• Payments ledger və parent visibility.

• Certificates və teacher storefront.

• Analytics: tələbə performansı, davamiyyət, kurs nəticələri və mərkəz hesabatları.

Bu istiqamət Startup monetization üçün əsas SaaS modelidir: Institution CRM + Course Marketplace + Parent visibility birlikdə satıla bilən məhsul yaradır.

15.5 Online classroom transparency

Classroom yalnız “dərs otağı” deyil, şəffaflıq moduludur. LogiCora “Meet link var idi, amma kim iştirak etdi?” problemini həll etməlidir.

• Online dərs linki/session və dərs statusu: scheduled/live/ended.

• Kim qoşuldu, kim gec qoşuldu, kim dərsdən çıxdı.

• Real-time attendance və session participation log.

• QR / scan attendance və manual attendance düzəlişləri.

• Teacher və parent üçün şəffaf hesabat.

• Kurs mərkəzləri üçün dərs davamiyyəti və valideyn etimadı.

15.6 Parent-child link real startup flow

Parent-child link sadəcə seed data deyil, real məhsul flow-u olmalıdır. Parent childEmail ilə uşağı link edir və sistem ownership/conflict qaydalarını qoruyur.

• Parent childEmail ilə child link edir; child role mütləq student olmalıdır.

• Child başqa parent-ə bağlıdırsa 409 conflict qaytarılır.

• Duplicate link idempotent success qaytarır, duplicate data yaratmır.

• Parent heç vaxt başqa parent/teacher/admin/manager user-i child kimi link edə bilməz.

• Gələcəkdə invite/consent sistemi əlavə ediləcək; diplomda minimal, təhlükəsiz email-based link kifayətdir.

15.7 Privacy və visibility qaydaları

Education Passport şəxsi və həssas data saxladığı üçün privacy ayrıca məhsul sütunudur.

• Student bəzi portfolio item-ləri public/private edə bilir.

• Public portfolio link yalnız seçilmiş məlumatları göstərir.

• Teacher, parent, school admin və gələcək employer/ministry access səviyyələri fərqli olmalıdır.

• Official certificate-lər institution tərəfindən verified olmalıdır; user uploaded proof unverified kimi görünməlidir.

• Sensitive child data public görünməməlidir.

• Gələcək ministry/admin access consent və audit log ilə idarə olunmalıdır.

15.8 Certificate verification modeli

Verified Certificates workflow-u Education Passport-un əsas dəyəridir. Diplom demo-da fake certificate yaratmaq olmaz; Startup mərhələsində real verification qurulmalıdır.

| Səviyyə | Status | Kim təsdiqləyir? | Qeyd |
| --- | --- | --- | --- |
| 1 | User uploaded unverified | İstifadəçi özü yükləyir | Proof kimi görünür, official sayılmır |
| 2 | Teacher / Course Center verified | Müəllim və ya kurs mərkəzi | Course completion və attendance ilə bağlı ola bilər |
| 3 | Institution / School verified | Məktəb və ya qurum | Rəsmi institution record kimi saxlanır |
| 4 | Ministry / Official verified | Dövlət/rəsmi orqan | National-scale verified passport üçün |


Hər certificate üçün minimum data: issuer, issuedAt, verifyUrl/QR, status, source, related course/competition və public verification page.

15.9 Adult / lifelong user first-class olmalıdır

LogiCora yalnız uşaqlar üçün deyil. İnsan 16 yaşında, 25 yaşında və ya daha sonra qeydiyyatdan keçə bilər və yenə də education passport ala bilər.

• Universitet tələbəsi üçün təhsil və təcrübə profili.

• İş axtaran gənc üçün portfolio və verified skills.

• Karyerasını dəyişən adult learner üçün kurslar və yeni bacarıq xəritəsi.

• Professional üçün lifelong learning, sertifikat və career growth record.

15.10 Career guidance real data-dan gəlməlidir

Career Mentor AI yalnız test nəticəsinə əsaslanmamalıdır. Platforma uzunmüddətli real data-dan istifadə etməlidir. AI qərar vermir; sadəcə uyğun sahələri təklif edir, son qərar student/parent/mentor tərəfindəndir.

• Daily quiz nəticələri və knowledge trend.

• Course performance və completion history.

• Competition nəticələri və leaderboard davranışı.

• Portfolio projects və interests timeline.

• Skill graph, teacher feedback, attendance discipline və certificates.

15.11 Age-based content engine

Daily quiz, courses, videos, tasks və competition sualları ageRange / grade / knowledgeLevel əsasında filter olunmalıdır.

| Yaş / mərhələ | Content istiqaməti |
| --- | --- |
| 3-5 | Meyvə, rəng, heyvan, səs, sadə məntiq, böyük kartlar və audio instruction |
| 6-8 | Oxu-yazı, əsas riyaziyyat, vərdişlər və sadə quizlər |
| 9-11 | Fənn və məntiq, maraq siqnalları, erkən yarışlar |
| 12-14 | Daha çətin yarışlar, skill graph, course discovery və projects |
| 15-17 | Exam/career prep, portfolio, sertifikat və internship hazırlığı |
| Adult | Professional learning, career change, upskilling və verified certificates |


15.12 Inclusive learning adaptation

Bu “disabled mode” deyil, inclusive learning adaptation-dır. Məqsəd low ability learner və xüsusi ehtiyaclı istifadəçilər üçün daha rahat, az yükləyən, daha başa düşülən təcrübə yaratmaqdır.

• Sadə UI, böyük düymələr, az animasiya, reduced cognitive load.

• Audio instruction, high contrast, keyboard/screen reader dəstəyi.

• Parent/teacher tərəfindən aktiv edilən accessibility preferences.

• 7 günlük passiv müşahidə ilə sistemin UI-ni yumşaq adaptasiya etməsi.

• Label-ləmədən, utandırmadan və məcbur etmədən adaptiv öyrənmə.

15.13 Competition və classroom demo value

Competition yalnız oyun deyil. O, portfolio, skill graph və career signals üçün real data mənbəyidir.

• Teacher competition yaradır; student PIN ilə qoşulur.

• Live answer scoring və final leaderboard real olur.

• Nəticə XP, portfolio timeline və skill graph-a yazılır.

• Competition nəticələri student-in verified learning history-sinin bir hissəsinə çevrilir.

• Classroom + competition birlikdə müəllim idarəetməsi və student progress data-sı yaradır.

15.14 Clan duel — 10 suallıq komanda qarşılaşması

Clan ideyası school/course center rəqabəti üçün xüsusi value yaradır. MVP-də duel sadə və təhlükəsiz olmalıdır.

• İki clan qarşılaşır və 10 sual cavablayır.

• Suallar yaş/level uyğun gəlir.

• Hər düzgün cavab clan XP-yə təsir edir.

• Uduzan çox cəzalanmır; motivasiya qorunur.

• Weekly clan leaderboard school/course center rəqabəti üçün istifadə olunur.

15.15 “No fake success” product trust prinsipi

LogiCora-da fake success yoxdur. Bu yalnız texniki qayda deyil, product trust prinsipidir. Platforma valideyn, müəllim və uşaq etimadı üzərində qurulduğu üçün saxta uğur mesajı olmaz.

• Backend action real işləmirsə düymə disabled olur.

• Ya honest unavailable message göstərilir.

• Ya da real error state göstərilir.

• Endpoint error-u success kimi göstərilmir.

• Mock/fake data demo etimadını zədələyir və MVP prinsiplərinə ziddir.

15.16 Modul-scope ayrımı: Demo → Startup → Post-demo → Nazirlik

Hər modul üçün scope ayrımı aydın olmalıdır: diplomda nə göstərilir, startup-da nə satıla bilər, post-demo nə gəlir və nazirlik səviyyəsində nə əlavə olunur.

| Modul | Diplom demo | Startup MVP | Post-demo | Nazirlik / national scale |
| --- | --- | --- | --- | --- |
| Auth | Student/Teacher/Parent login/register | Security hardening, email verify | Google/OAuth | Institution SSO, audit log |
| Student | Dashboard, XP, quiz, courses, portfolio | Education passport monetizable | AI mentor | National student record |
| Teacher/CRM | Groups, attendance, classroom, analytics | Course center SaaS | Advanced assignments | School/institution reporting |
| Parent | Progress, attendance, payments read ledger | Premium reports, payment visibility | AI parent insights | Consent & guardianship policies |
| Courses | List/detail/enroll/progress | Marketplace + storefront | Recommendations | Accredited course catalog |
| Portfolio | Public link, timeline | Verified skills/profile | Employer visibility | Official education passport |
| Classroom | Sessions, attendance, QR/scan | Transparency & reports | Realtime analytics | School attendance integration |
| Competition/Clan | PIN join, scoring, leaderboard | Engagement & center contests | Arena seasons | National competitions |
| Certificates | Honest unavailable/limited proof | QR verify, issuer workflow | Digital signing | Official verified certificates |
| Payments | Manual/read ledger | Subscriptions, invoices | Gateway | Public funding/reporting |
| AI Companion | Deferred | Basic guidance optional | Logi/Cora memory | Policy-safe advisory layer |
| Ministry | Hidden/deferred | Not required for product value | Pilot dashboards | National analytics |


15.17 Startup-first, Ministry-later

LogiCora nazirlik qəbul etməsə də yaşamalıdır. Birinci yol public/startup product-dur; nazirlik ikinci, optional və daha böyük mərhələdir.

• Startup first: student, parent, teacher və course center üçün real value.

• Ministry later: verified data, school/institution dashboards, audit logs, official analytics.

• Public product independently valuable: kurs mərkəzi və valideynlər üçün nazirliksiz də satıla bilən sistem.

15.18 Course marketplace + CRM birlikdə düşünülməlidir

Course marketplace sadəcə kurs siyahısı deyil. O, teacher CRM və education passport ilə bağlıdır.

• Course detail, lessons, enrolled students və ratings.

• Attendance və classroom participation data.

• Parent progress və payment visibility.

• Certificates və course completion record.

• Teacher storefront və center analytics.

• Kurs nəticələri student passport-a real learning record kimi yazılır.

15.19 Demo script məhsul hekayəsi kimi danışılmalıdır

Demo sadəcə səhifə sırası deyil; LogiCora-nın məhsul hekayəsidir.

• Student öyrənir və XP qazanır.

• Teacher onu group/classroom/competition ilə idarə edir.

• Parent onun progress, attendance və ödənişlərini görür.

• Portfolio bütün bunları education passport-a çevirir.

• Gələcəkdə employer/ministry bu verified education record-dan istifadə edə bilir.

15.20 Post-demo YouTube/kids content strategy

Uşaqlar üçün Azərbaycan dilində təhsil video kanalı LogiCora-nın startup growth strategy-sində ayrıca yer tuta bilər. Bu diplomda kodlanmır, amma brand awareness və acquisition üçün roadmap-da saxlanılır.

• Preschool content: fruits, colors, animals, family, emotions, safety.

• LogiCora brand awareness və uşaqlar/valideynlər üçün tanışlıq kanalı.

• YouTube/TikTok discovery funnel.

• Platforma ilə bağlı learning content və age-based tasks.

• Valideynləri məhsula gətirən marketing kanalı.

15.21 Qısa yekun prinsip

Bu ideyalar diplom üçün hamısı kodlanmayacaq. Diplomda yalnız real-data Student/Teacher/Parent MVP göstərilir. Amma roadmap-da bu prinsiplər saxlanılır ki, LogiCora-nın sadəcə diplom işi yox, real startup və daha sonra nazirlik səviyyəli platforma vizyonu olduğu aydın görünsün.

# 16. AI İcra Sistemi: Claude + Codex İş Bölgüsü

Bu bölmə sənədin praktik icra hissəsidir. Hər addımda hansı AI istifadə olunmalıdır, nə vaxt dayanmaq lazımdır və hansı yoxlama komandaları işlədilməlidir.

## 16.1 AI seçmə qaydası

| Etiket | Harada istifadə olunur | Qayda |
|---|---|---|
| **HUMAN** | Git status, branch seçimi, manual smoke test, server/client start | AI kod yazmır. Sən komandanı işlədirsən və nəticəni chat-a atırsan. |
| **CLAUDE_PLAN** | Böyük qərar, branch/merge, 3+ fayl, schema riski, kompleks flow | Claude əvvəl analiz edir, faylları və riskləri yazır, sonra Codex üçün kiçik prompt verir. |
| **CLAUDE_EDIT** | Böyük TSX faylı, 800+ sətir component, UI flow refactor, auth/role flow | Codex böyük faylda çaşa bilər. Claude ilə yazdır və sonra tsc/node check et. |
| **CODEX_OK** | 1-2 fayl, <150 sətir dəyişiklik, route order, allowlist, try/catch, response adapter | Codex üçün uyğundur. Prompt dar olmalıdır. |
| **CODEX_ONLY_SMALL** | Çox kiçik fix: import, path, disabled button, typo, single endpoint validation | Birbaşa Codex. Böyük refactor istəmə. |
| **STOP_AND_ASK** | Schema change, data migration, deleting file/route, package dependency, auth/security change | Dayan. Claude və ya ChatGPT-ə nəticəni göndər. |

Qızıl qayda: **Codex-ə heç vaxt “bütün layihəni düzəlt” demə.** Codex-ə yalnız konkret fayl + konkret bug + konkret gözlənilən nəticə ver.

## 16.2 Claude limiti bitəndə necə davam etməli

Claude limiti bitsə, yalnız bu tip task-ları Codex-lə davam etdir:

- `node --check` error fix
- TypeScript import/type fix
- 1 endpoint validation fix
- 1 service method-də idempotency fix
- 1 component-də button disabled/honest message
- 1 React Query error/loading state cleanup
- 1 route path mismatch fix

Claude limiti bitəndə Codex-ə bunu yaz:

```text
Read the MD roadmap. Continue ONLY the next step marked CODEX_OK or CODEX_ONLY_SMALL.
Do not touch other modules. Do not redesign UI. Do not add mock data. Do not delete files.
Before editing, list exact files. After editing, give validation commands.
```

Codex növbəti addımın `CLAUDE_PLAN`, `CLAUDE_EDIT` və ya `STOP_AND_ASK` olduğunu görsə, sənə belə deməlidir:

```text
This step is not safe for Codex-only execution. Go back to Claude/ChatGPT for planning.
```

## 16.3 Hər task üçün məcburi yoxlama

Backend JS dəyişibsə:

```powershell
node --check <changed-backend-file.js>
```

Client/TSX dəyişibsə:

```powershell
cd client
npx tsc -p tsconfig.app.json --noEmit --incremental false
cd ..
```

Git:

```powershell
git status --short
git add <only changed relevant files>
git commit -m "fix(scope): short message"
git push
```

Əgər `package-lock.json` dependency dəyişmədən dəyişibsə:

```powershell
git restore package-lock.json
```

## 16.4 Əsas icra ardıcıllığı və AI sahibi

| Sıra | Addım | AI sahibi | Niyə belə? | Fayl riski | Keçid qaydası |
|---:|---|---|---|---|---|
| 0 | Branch Truth Check | **HUMAN + CLAUDE_PLAN** | Hansı branch source of truth-dur, onu kod yazmadan bilməliyik. | Git qərarı | Nəticəni Claude/ChatGPT-ə at. Codex istifadə etmə. |
| 1 | Git snapshot / backup branch | **HUMAN** | İşi itirməmək üçün. | Git | AI kod yazmır. |
| 2 | Backend syntax baseline | **HUMAN + CODEX_ONLY_SMALL** | `node --check` error varsa tək fayl fix edilə bilər. | Kiçik | Error tək fayldadırsa Codex. Çox fayldadırsa Claude. |
| 3 | Certificate honest endpoint həqiqətən lazımdırmı yoxla | **CLAUDE_PLAN** | Frontend çağırırmı, backend route lazımdırmı qərar verilməlidir. | 2-4 fayl | Claude audit; sonra backend route kiçikdirsə Codex. |
| 4 | Classroom `/mine` student scope | **CODEX_OK** | Adətən bir controller/service filter fix-dir. | 1-2 fayl | Codex yaza bilər, amma schema dəyişməsin. |
| 5 | Parent legacy/seed safety | **CLAUDE_PLAN → CODEX_OK** | Ownership, Student.parentId, Parent.children conflict var. | Multi-model | Claude fayl planı versin; Codex yalnız dəqiq service/seed patch etsin. |
| 6 | Competition finish side-effect hardening | **CODEX_OK** | Bir service metodunda try/catch isolation. | 1 fayl | Codex üçün uyğundur. Scoring dəyişməsin. |
| 7 | Clan battle lifecycle | **CLAUDE_PLAN → CODEX_OK** | Flow qərarı lazımdır: pending→active yoxsa accept/start. | 1-3 fayl | Əvvəl Claude qərar versin; sonra Codex minimal patch. |
| 8 | Course enrollment idempotency | **CODEX_OK** | Bir service method-də duplicate behavior. | 1 fayl | Codex üçün uyğundur. `totalEnrolled` artmasın. |
| 9 | Daily Quiz answer contract | **CLAUDE_PLAN → CODEX_OK** | Payload/frontend/backend contract bilinməlidir. | 1-3 fayl | Claude audit; Codex yalnız konkret mismatch fix. |
| 10 | User profile allowlist | **CODEX_OK** | `req.body` allowlist fix adətən bir service faylıdır. | 1 fayl | Codex üçün uyğundur. role/email/password toxunma. |
| 11 | Student frontend smoke errors | **HUMAN → CLAUDE_PLAN → CODEX_ONLY_SMALL** | Əvvəl klik-test. Error-a görə kiçik component fix. | TSX böyük ola bilər | Böyük səhifədə yalnız konkret blok patch. |
| 12 | Teacher frontend UX/errors | **HUMAN → CLAUDE_PLAN → CODEX_ONLY_SMALL** | Teacher flow bir neçə səhifədir. | 3+ fayl ola bilər | Claude bug list; Codex fayl-fayl. |
| 13 | Parent frontend UX/errors | **HUMAN → CLAUDE_PLAN → CODEX_ONLY_SMALL** | Parent child link/payment/progress flow real data tələb edir. | TSX böyük | Claude plan; Codex tək modal/button patch. |
| 14 | UI polish seçmə köçürmə | **CLAUDE_EDIT** | UI branch-dan full merge olmaz; seçmə fayl lazımdır. | High | Codex-ə full UI polish vermə. |
| 15 | Final demo script + zip | **HUMAN + CLAUDE_PLAN** | Kod yox, təqdimat və paketləmə. | Git/zip | Claude/ChatGPT review. |

## 16.5 Claude-a veriləcək universal prompt

```text
You are the planner/reviewer for LogiCora.
Read the MD roadmap. I will give you the current step number.
Your job:
1. Decide whether this step is CLAUDE_PLAN, CLAUDE_EDIT, CODEX_OK, CODEX_ONLY_SMALL, HUMAN, or STOP_AND_ASK.
2. If Codex can do it, write a tiny Codex prompt with exact files and no extra scope.
3. If Claude should do it, list exact files, risks, validation commands, and wait for approval.
Rules: no mock data, no fake success, no deletion, no UI redesign, no avatar/Spline/AI companion in demo sprint, no schema change unless approved.
```

## 16.6 Codex-ə veriləcək universal prompt

```text
You are executing ONE SMALL LogiCora task from the MD roadmap.
Do not solve anything outside this step.
Before editing, list exact files you will change.
Rules:
- no mock/fake data
- no fake success
- no deletion
- no schema change unless the step explicitly says approved
- do not change package-lock.json
- preserve response shapes
- backend real errors must not be shown as success
After editing:
- run node --check for changed backend JS files
- run client tsc only if client files changed
- provide files changed, before/after behavior, validation commands, smoke test commands, commit message.
```

# 17. Addım-addım Prompt Kitabı

Bu hissəni birbaşa Claude və ya Codex-ə kopyalaya bilərsən. Hər promptun başında hansı AI olduğu yazılıb.

## Step 0 — Branch Truth Check

**AI sahibi:** HUMAN + CLAUDE_PLAN  
**Codex:** istifadə etmə.

```powershell
cd C:\Users\Lenovo\Desktop\LogiCora
git branch --show-current
git status --short
git log main..stabilization-next --oneline
git log stabilization-next..main --oneline
git diff --name-status main..stabilization-next
git diff --name-status stabilization-next..main
```

Nəticəni Claude/ChatGPT-ə at və soruş:

```text
Bu nəticəyə görə source of truth hansıdır: main yoxsa stabilization-next? Heç nə merge etmədən qərar ver və növbəti təhlükəsiz addımı yaz.
```

## Step 1 — Snapshot

**AI sahibi:** HUMAN  
**Codex:** istifadə etmə.

```powershell
cd C:\Users\Lenovo\Desktop\LogiCora
git status
git switch -c safety-before-demo-stabilization
git add -A
git commit -m "wip: snapshot before final demo stabilization"
```

Əgər branch artıq varsa, yeni ad istifadə et:

```powershell
git switch -c safety-before-demo-stabilization-2
```

## Step 2 — Classroom `/mine` student scope

**AI sahibi:** CODEX_OK  
**Fayl ehtimalı:** `server/modules/classroom/classroom.controller.js`, lazım olsa classroom model.

Codex prompt:

```text
Task: Fix Classroom /mine student scope leak.
Files to inspect first: server/modules/classroom/classroom.controller.js and related classroom model.
Problem: listMine for student must not use empty filter {} that returns all classrooms.
Required behavior: teacher sees own classrooms as before; student sees only classrooms where they are participant or belong to a relevant group if existing data model supports that. No schema change. No mock data. No fake success.
Before editing, list exact files. After editing run node --check on changed JS files. Provide smoke test commands and commit message.
```

## Step 3 — Parent legacy/seed safety

**AI sahibi:** CLAUDE_PLAN → CODEX_OK  
**Codex birbaşa başlamasın. Əvvəl Claude faylları təsdiqləsin.**

Claude prompt:

```text
Plan only. For Parent legacy/seed safety, inspect Parent.children, Student.parentId, seed.js parent-child creation, and parent.service addChild. Decide minimal files to change. Requirements: Parent.children remains User _ids; seed parent links must also sync Student.parentId where safe; addChild must not overwrite another parent; duplicate idempotent; childEmail normalized; no sensitive response. Output exact Codex prompt.
```

Claude Codex prompt verdikdən sonra Codex-ə onu at.

## Step 4 — Competition finish hardening

**AI sahibi:** CODEX_OK  
**Fayl ehtimalı:** `server/modules/competition/competition.service.js`

Codex prompt:

```text
Task: Harden competition finish side effects.
Inspect competition.service.js finishCompetition.
Requirement: competition result save/scoring must remain unchanged. For each participant, side effects like XP, skill tree, portfolio timeline, notification must be isolated with try/catch so one participant failure does not abort others. Log competition id, participant id, side effect name, error message. Do not double-award on already finished. No schema change, no fake success.
Run node --check on changed files. Provide before/after and smoke tests.
```

## Step 5 — Clan battle lifecycle

**AI sahibi:** CLAUDE_PLAN → CODEX_OK  
**Niyə:** flow qərarı lazımdır.

Claude prompt:

```text
Plan only. Inspect clan challenge and finish lifecycle. Current issue: challenge may create pending battle while finish expects active. Choose minimal demo-safe fix: create challenge as active OR add/repair start/accept endpoint if already partially exists. Keep auth/membership checks. No schema change unless already supported. Output exact Codex prompt with files.
```

## Step 6 — Course enrollment idempotency

**AI sahibi:** CODEX_OK  
**Fayl ehtimalı:** `server/modules/course/course.service.js`

Codex prompt:

```text
Task: Make course enrollment idempotent.
Inspect course.service.js enrollStudent.
If student is already enrolled, do not throw noisy 400 for demo UX. Return existing enrollment with honest message and do not increment totalEnrolled again. New enrollment behavior remains unchanged. Keep role guard and published course guard. No schema change, no fake data.
Run node --check on changed JS files. Provide smoke tests and commit message.
```

## Step 7 — User profile allowlist

**AI sahibi:** CODEX_OK  
**Fayl ehtimalı:** `server/modules/user/user.service.js`

Codex prompt:

```text
Task: Harden updateUserProfile mass assignment.
Inspect user.service.js updateUserProfile.
Replace direct $set:req.body with an allowlist of safe existing User fields only: name, surname, phone, avatar, characterType, profileCompleted if these fields exist in the schema. Never allow role, email, password, refresh tokens, status, isAdmin, or security fields. Preserve response shape. No schema change.
Run node --check on changed JS files. Provide before/after and commit message.
```

## Step 8 — Daily Quiz answer contract

**AI sahibi:** CLAUDE_PLAN → CODEX_OK  
**Niyə:** frontend/backend payload mismatch ola bilər.

Claude prompt:

```text
Audit only. Inspect daily quiz frontend submit payload and backend POST /api/daily/answer contract. Identify exact mismatch, if any. Do not edit. If one small file fix is enough, write Codex prompt. If multiple files or schema involved, keep it for Claude.
```

## Step 9 — Certificate honest state

**AI sahibi:** CLAUDE_PLAN → CODEX_OK və ya DEFER  
**Niyə:** certificate yeni feature-ə çevrilə bilər.

Claude prompt:

```text
Audit only. Check whether frontend actually calls /courses/:id/certificate or shows a certificate button. If no active route/button calls it, defer after demo. If active button breaks demo, implement only honest unavailable/not-ready state. No fake certificate generation. Output exact files and Codex prompt only if safe.
```

## Step 10 — Frontend Student UX cleanup

**AI sahibi:** HUMAN smoke test → CLAUDE_PLAN → CODEX_ONLY_SMALL

Manual test:

```text
student2@logicora.az / Test123!
Dashboard → Daily Quiz → Courses → Course Detail → Portfolio → Clan → Competition
```

Əgər error varsa, Claude-a göndər:

```text
Student flow-da bu error çıxdı: <screenshot/error/log>. Hansı tək faylı Codex ilə düzəltmək olar? Böyük refactor etmədən prompt yaz.
```

Codex yalnız Claude-un verdiyi tək-fayl promptu icra etsin.

## Step 11 — Frontend Teacher UX cleanup

**AI sahibi:** HUMAN smoke test → CLAUDE_PLAN → CODEX_ONLY_SMALL

Manual test:

```text
muellim1@logicora.az / Test123!
Dashboard → Groups → Attendance → Classroom → Analytics → Storefront
```

Qayda: böyük dashboard rewrite yox. Yalnız konkret broken endpoint, disabled field, error state və route fix.

## Step 12 — Frontend Parent UX cleanup

**AI sahibi:** HUMAN smoke test → CLAUDE_PLAN → CODEX_ONLY_SMALL

Manual test:

```text
parent1@logicora.az / Test123!
Children → Child Progress → Attendance → Payments → Special Needs → Notification Prefs → Time Capsule
```

Əsas yoxlama: parent payment visibility honest ledger kimi görünsün, fake payment success olmasın.

## Step 13 — UI polish seçmə köçürmə

**AI sahibi:** CLAUDE_EDIT  
**Codex:** yalnız tək CSS/class fix üçün.

Qayda:

```text
UI branch full merge YOX.
server/ qovluğu UI branch-dan götürülmür.
Yalnız seçilmiş frontend kosmetik fayllar.
Avatar/Spline/3D/AI companion diplom sprintində yoxdur.
```

Claude prompt:

```text
Plan UI polish only. Compare current main/stabilization UI with ui-polish reference. Recommend only 3-5 safe frontend files to cherry-pick or manually port. Do not touch backend. Do not add avatar/Spline/AI companion. Focus: PageWrapper, Sidebar/Navbar, dashboard cards, empty/error states.
```

## Step 14 — Final zip və demo backup

**AI sahibi:** HUMAN + CLAUDE_PLAN

Təmiz zip:

```powershell
cd C:\Users\Lenovo\Desktop\LogiCora
git status
git archive --format=zip -o ..\LogiCora-final-demo.zip HEAD
```

Backup video: 5-7 dəqiqəlik ekran yazısı çək:

```text
Landing → Student → Teacher → Parent → yekun vision cümləsi
```

# 18. Sürətli qərar ağacı

```text
Task 1 fayl və kiçikdir? → CODEX_OK
Task 3+ fayldır? → CLAUDE_PLAN
Böyük TSX component 800+ sətirdir? → CLAUDE_EDIT
Schema dəyişir? → STOP_AND_ASK
Route/controller/service silinir? → STOP_AND_ASK
package-lock dəyişir? → STOP_AND_ASK
Mock data əlavə etmək istəyir? → STOP_AND_ASK
Fake success toast əlavə etmək istəyir? → STOP_AND_ASK
UI branch full merge istəyir? → STOP_AND_ASK
Avatar/Spline/AI companion istəyir? → DEFER POST-DEMO
```

# 19. Product trust qaydası

LogiCora valideyn, müəllim və tələbə etimadı üzərində qurulur. Ona görə hər AI taskında bu qayda qüvvədədir:

- Backend action işləmirsə, success göstərmə.
- Real endpoint yoxdursa, disabled/honest unavailable göstər.
- Mock data ilə demo gizlətmə.
- Uşağın məlumatını public göstərmə.
- Payment və certificate kimi həssas yerlərdə fake generator yazma.

Bu qayda texniki deyil, məhsul prinsipi kimi qəbul edilir.
