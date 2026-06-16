// dotenv-i dəqiq server/.env-dən yüklə (kök qovluqdan da işə düşsün deyə)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { hashPassword } = require('./utils/hashPassword');

const User = require('./modules/user/user.model');
const Student = require('./modules/student/student.model');
const Teacher = require('./modules/teacher/teacher.model');
const Parent = require('./modules/parent/parent.model');
const Gamification = require('./modules/gamification/gamification.model');
const Question = require('./modules/question/question.model');
const Course = require('./modules/course/course.model');
const DailyQuestion = require('./modules/dailyQuestion/dailyQuestion.model');
const KidsVideo = require('./modules/kids/kids.model');
const Group = require('./modules/group/group.model');
const Attendance = require('./modules/attendance/attendance.model');
const Enrollment = require('./modules/course/enrollment.model');
const Competition = require('./modules/competition/competition.model');
const Classroom = require('./modules/classroom/classroom.model');


// --- Sual qurma köməkçisi ---
const labels = ['A', 'B', 'C', 'D'];
const mcq = (text, choices, correctIndex, subject, grade, difficulty = 'medium', points = 10) => ({
  text,
  type: 'multiple_choice',
  options: choices.map((c, i) => ({ label: labels[i], text: String(c) })),
  correctAnswer: labels[correctIndex], // doğru variantın label-ı
  subject,
  grade,
  difficulty,
  points,
});

const buildQuestions = (createdBy) => {
  const q = [];

  // === Riyaziyyat — grade 1..10 (avtomatik toplama) ===
  for (let grade = 1; grade <= 10; grade++) {
    const a = grade * 5 + 4;
    const b = grade * 2 + 3;
    const sum = a + b;
    const diff = grade <= 4 ? 'easy' : grade <= 8 ? 'medium' : 'hard';
    // doğru cavab indeks 1 (B)
    q.push(mcq(`${a} + ${b} = ?`, [sum + 1, sum, sum - 2, sum + 3], 1, 'Riyaziyyat', grade, diff));
  }

  // === Fizika ===
  q.push(mcq('Su neçə dərəcədə qaynayır?', ['90°C', '100°C', '120°C', '50°C'], 1, 'Fizika', 5, 'easy'));
  q.push(mcq('Aşağıdakılardan hansı daha sürətlidir?', ['Səs', 'İşıq', 'Külək', 'Su'], 1, 'Fizika', 6, 'easy'));
  q.push(mcq('Yerin cazibə qüvvəsi cisimləri hara çəkir?', ['Yuxarı', 'Aşağı (mərkəzə)', 'Sağa', 'Sola'], 1, 'Fizika', 7));
  q.push(mcq('Elektrik cərəyanının vahidi nədir?', ['Volt', 'Amper', 'Vatt', 'Om'], 1, 'Fizika', 8));
  q.push(mcq('Gərginliyin vahidi nədir?', ['Amper', 'Volt', 'Coul', 'Nyuton'], 1, 'Fizika', 9, 'hard'));
  q.push(mcq('Sürətin vahidi (SI) nədir?', ['km/saat', 'm/san', 'm/san²', 'san'], 1, 'Fizika', 10, 'hard'));
  q.push(mcq('Maqnitin neçə qütbü var?', ['1', '2', '3', '4'], 1, 'Fizika', 7));
  q.push(mcq('Səs hansı mühitdə yayılmır?', ['Hava', 'Su', 'Metal', 'Vakuum'], 3, 'Fizika', 8));
  q.push(mcq('Buz əriyəndə nəyə çevrilir?', ['Buxar', 'Su', 'Qar', 'Daş'], 1, 'Fizika', 6, 'easy'));
  q.push(mcq('Qüvvənin vahidi nədir?', ['Coul', 'Nyuton', 'Vatt', 'Paskal'], 1, 'Fizika', 9, 'hard'));

  // === Tarix ===
  q.push(mcq('Azərbaycanın paytaxtı haradır?', ['Gəncə', 'Bakı', 'Sumqayıt', 'Şəki'], 1, 'Tarix', 3, 'easy'));
  q.push(mcq('Azərbaycan müstəqilliyini hansı ildə bərpa etdi?', ['1918', '1991', '1920', '2000'], 1, 'Tarix', 4));
  q.push(mcq('Azərbaycan Xalq Cümhuriyyəti neçənci ildə yaranıb?', ['1918', '1920', '1991', '1905'], 0, 'Tarix', 5));
  q.push(mcq('Qız Qalası hansı şəhərdədir?', ['Gəncə', 'Bakı', 'Quba', 'Şuşa'], 1, 'Tarix', 6, 'easy'));
  q.push(mcq('Nizami Gəncəvi kim olub?', ['Sərkərdə', 'Şair', 'Kral', 'Rəssam'], 1, 'Tarix', 7));
  q.push(mcq('Səfəvilər dövlətinin banisi kimdir?', ['Şah İsmayıl Xətai', 'Nadir şah', 'Cavanşir', 'Babək'], 0, 'Tarix', 8));
  q.push(mcq('Babək hansı hərəkata başçılıq edib?', ['Xürrəmilər', 'Hürufilər', 'Bolşeviklər', 'Sufilər'], 0, 'Tarix', 9, 'hard'));
  q.push(mcq('İkinci Qarabağ müharibəsi neçənci ildə oldu?', ['2016', '2020', '2018', '2008'], 1, 'Tarix', 10));
  q.push(mcq('Atəşgah məbədi hansı şəhərdədir?', ['Bakı', 'Gəncə', 'Naxçıvan', 'Lənkəran'], 0, 'Tarix', 5, 'easy'));
  q.push(mcq('SSRİ neçənci ildə dağıldı?', ['1989', '1991', '1993', '1985'], 1, 'Tarix', 11, 'hard'));

  // === Azərbaycan dili ===
  q.push(mcq('Hansı saitdir?', ['B', 'A', 'K', 'M'], 1, 'Azərbaycan dili', 1, 'easy'));
  q.push(mcq("'Kitab' sözündə neçə hərf var?", ['4', '5', '6', '3'], 1, 'Azərbaycan dili', 2, 'easy'));
  q.push(mcq("'Gözəl' sözünün əksi (antonimi) nədir?", ['Yaraşıqlı', 'Çirkin', 'Böyük', 'Ağ'], 1, 'Azərbaycan dili', 3));
  q.push(mcq("'At' sözünün cəmi necədir?", ['Atlar', 'Atı', 'Ata', 'Atda'], 0, 'Azərbaycan dili', 4, 'easy'));
  q.push(mcq('Nəqli cümlənin sonunda hansı işarə qoyulur?', ['Vergül', 'Nöqtə', 'Tire', 'Mötərizə'], 1, 'Azərbaycan dili', 5));
  q.push(mcq("'Sürətli' sözü hansı nitq hissəsidir?", ['İsim', 'Sifət', 'Fel', 'Say'], 1, 'Azərbaycan dili', 6));
  q.push(mcq("'Qaçmaq' sözü hansı nitq hissəsidir?", ['İsim', 'Fel', 'Sifət', 'Zərf'], 1, 'Azərbaycan dili', 7));
  q.push(mcq('Sinonim nə deməkdir?', ['Əks mənalı sözlər', 'Yaxın mənalı sözlər', 'Çoxmənalı sözlər', 'Omonim'], 1, 'Azərbaycan dili', 8));
  q.push(mcq("'Mən kitab oxuyuram' cümləsində mübtəda hansıdır?", ['kitab', 'mən', 'oxuyuram', 'yoxdur'], 1, 'Azərbaycan dili', 9, 'hard'));
  q.push(mcq('Azərbaycan əlifbasında neçə hərf var?', ['30', '32', '33', '29'], 1, 'Azərbaycan dili', 10));

  // === Məntiq ===
  q.push(mcq('2, 4, 6, ... — növbəti rəqəm?', ['7', '8', '9', '10'], 1, 'Məntiq', 1, 'easy'));
  q.push(mcq('1, 3, 5, 7, ... — növbəti?', ['8', '9', '10', '11'], 1, 'Məntiq', 2, 'easy'));
  q.push(mcq('Hansı artıqdır: alma, armud, kərpic, banan?', ['alma', 'armud', 'kərpic', 'banan'], 2, 'Məntiq', 3, 'easy'));
  q.push(mcq('5, 10, 15, ... — növbəti?', ['18', '20', '25', '16'], 1, 'Məntiq', 4));
  q.push(mcq('2, 4, 8, 16, ... — növbəti?', ['24', '32', '20', '18'], 1, 'Məntiq', 5));
  q.push(mcq('Bütün pişiklər heyvandır. Pamuk pişikdir. Onda Pamuk ...?', ['Bitkidir', 'Heyvandır', 'Quşdur', 'Balıqdır'], 1, 'Məntiq', 6));
  q.push(mcq('1, 1, 2, 3, 5, 8, ... — növbəti (Fibonaççi)?', ['11', '13', '12', '10'], 1, 'Məntiq', 7));
  q.push(mcq('100, 50, 25, ... — növbəti?', ['10', '12.5', '15', '20'], 1, 'Məntiq', 8, 'hard'));
  q.push(mcq('Hansı fərqlidir: 3, 5, 7, 9, 11?', ['3', '9', '5', '7'], 1, 'Məntiq', 9, 'hard'));
  q.push(mcq('Əgər A > B və B > C, onda?', ['A < C', 'A > C', 'A = C', 'Məlum deyil'], 1, 'Məntiq', 10, 'hard'));

  // Hamısına createdBy əlavə et
  return q.map((item) => ({ ...item, createdBy }));
};

const seed = async () => {
  await connectDB();

  // ⚠️ Mövcud datanı təmizlə (təkrar işə düşsün deyə)
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Teacher.deleteMany({}),
    Parent.deleteMany({}),
    Gamification.deleteMany({}),
    Question.deleteMany({}),
    Course.deleteMany({}),
    DailyQuestion.deleteMany({}),
    KidsVideo.deleteMany({}),
    Group.deleteMany({}),
    Attendance.deleteMany({}),
    Enrollment.deleteMany({}),
    Competition.deleteMany({}),
    Classroom.deleteMany({}),
  ]);

  const adminPass = await hashPassword('Admin123!');
  const demoPass = await hashPassword('Test123!');

  // --- Admin ---
  const admin = await User.create({
    name: 'Admin', surname: 'LogiCora', email: 'admin@logicora.az',
    phone: '0500000000', password: adminPass, role: 'admin', ageGroup: '23+',
    isPhoneVerified: true, profileCompleted: true,
  });

  // --- Müəllimlər (verified) ---
  const tUser1 = await User.create({
    name: 'Murad', surname: 'Əliyev', email: 'muellim1@logicora.az',
    phone: '0501111111', password: demoPass, role: 'teacher', ageGroup: '23+',
    isPhoneVerified: true, profileCompleted: true,
  });
  const tUser2 = await User.create({
    name: 'Leyla', surname: 'Həsənova', email: 'muellim2@logicora.az',
    phone: '0502222222', password: demoPass, role: 'teacher', ageGroup: '23+',
    isPhoneVerified: true, profileCompleted: true,
  });

  const teacher1 = await Teacher.create({
    userId: tUser1._id, specialization: 'mathematics', isVerified: true, canPublish: true,
    displayName: 'Murad müəllim', slug: 'murad-eliyev', experience: 8,
    rating: 4.8, totalStudents: 120, impactScore: 350, bio: 'Riyaziyyat müəllimi, 8 illik təcrübə.',
  });
  const teacher2 = await Teacher.create({
    userId: tUser2._id, specialization: 'science', isVerified: true, canPublish: true,
    displayName: 'Leyla müəllim', slug: 'leyla-hesenova', experience: 6,
    rating: 4.6, totalStudents: 90, impactScore: 280, bio: 'Fizika və elm müəllimi.',
  });

  // --- Tələbələr (müxtəlif yaş) + Gamification (real demo dəyərləri) ---
  const studentsData = [
    {
      name: 'Ayan', surname: 'Quliyeva', email: 'student1@logicora.az', phone: '0503333333', ageGroup: '9-11', grade: 4,
      daysSinceLogin: 0,
      gamif: { totalXP: 4200, level: 12, streak: 8, leagueTier: 'silver', weeklyXP: 640, gems: 120, badges: ['first_quiz', 'streak_7'] },
    },
    {
      name: 'Kənan', surname: 'Məmmədov', email: 'student2@logicora.az', phone: '0504444444', ageGroup: '12-14', grade: 7,
      daysSinceLogin: 0,
      gamif: { totalXP: 14840, level: 28, streak: 22, leagueTier: 'gold', weeklyXP: 1850, gems: 540, badges: ['first_quiz', 'streak_7', 'streak_30', 'competition_win'] },
    },
    {
      name: 'Nilay', surname: 'Rəhimova', email: 'student3@logicora.az', phone: '0505555555', ageGroup: '6-8', grade: 2,
      daysSinceLogin: 6,
      gamif: { totalXP: 1100, level: 5, streak: 3, leagueTier: 'bronze', weeklyXP: 210, gems: 40, badges: ['first_quiz'] },
    },
  ];
  const studentUsers = [];
  const studentDocs = [];
  for (const s of studentsData) {
    const lastLoginDate = new Date(Date.now() - s.daysSinceLogin * 24 * 60 * 60 * 1000);
    const u = await User.create({
      name: s.name, surname: s.surname, email: s.email, phone: s.phone,
      password: demoPass, role: 'student', ageGroup: s.ageGroup,
      isPhoneVerified: true, profileCompleted: true, lastLoginDate,
    });
    studentUsers.push(u);
    const student = await Student.create({ userId: u._id, grade: s.grade, school: 'Demo məktəb' });
    studentDocs.push(student);
    await Gamification.create({ studentId: student._id, lastActivityDate: new Date(), ...s.gamif });
  }

  // --- Valideyn (parent) + uşaq bağlantısı ---
  const pUser = await User.create({
    name: 'Elçin', surname: 'Quliyev', email: 'parent1@logicora.az',
    phone: '0506666666', password: demoPass, role: 'parent', ageGroup: '23+',
    isPhoneVerified: true, profileCompleted: true,
  });
  const childUserIds = studentUsers.map((u) => u._id);
  const parentProfile = await Parent.findOneAndUpdate(
    { userId: pUser._id },
    {
      $setOnInsert: { userId: pUser._id },
      $addToSet: { children: { $each: childUserIds } },
    },
    { new: true, upsert: true }
  );
  await Student.updateMany(
    { userId: { $in: childUserIds } },
    { $set: { parentId: parentProfile._id } }
  );

  // --- Kurslar --- (totalEnrolled aşağıdakı Enrollment seed-i ilə uyğundur)
  const courses = await Course.create([
    {
      title: 'Əyləncəli Riyaziyyat', description: 'Başlanğıc səviyyə riyaziyyat kursu.',
      teacherId: teacher1._id, category: 'Riyaziyyat', level: 'beginner', price: 0,
      ageGroup: ['9-11', '12-14'], isPublished: true, whatYouLearn: ['Toplama', 'Çıxma', 'Vurma'],
      totalEnrolled: 2,
    },
    {
      title: 'Fizikaya Giriş', description: 'Gündəlik həyatda fizika.',
      teacherId: teacher2._id, category: 'Fizika', level: 'intermediate', price: 29,
      ageGroup: ['12-14', '15-17'], isPublished: true, whatYouLearn: ['Qüvvə', 'Enerji', 'Hərəkət'],
      totalEnrolled: 1,
    },
    {
      title: 'Məntiq Oyunları', description: 'Düşünmə bacarığını inkişaf etdir.',
      teacherId: teacher1._id, category: 'Məntiq', level: 'beginner', price: 0,
      ageGroup: ['6-8', '9-11'], isPublished: true, whatYouLearn: ['Ardıcıllıq', 'Naxış tapma'],
      totalEnrolled: 2,
    },
  ]);
  const [courseMath, coursePhysics, courseLogic] = courses;

  // --- Suallar (50) ---
  const insertedQuestions = await Question.insertMany(buildQuestions(admin._id));
    // --- Uşaq videoları (Kids Hub) ---
  await KidsVideo.insertMany([
    {
      title: 'Vegetables for Kids', titleAz: 'Uşaqlar üçün tərəvəzlər',
      videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
      thumbnail: 'https://picsum.photos/seed/vegetables/400/225',
      duration: 180, category: 'vegetables', ageGroup: ['3-5', '6-8'],
      presenter: 'cora', vocabulary: ['Pomidor', 'Kartof', 'Kələm', 'Yerkökü'],
      questions: [
        { q: 'Hansı tərəvəz narıncı rəngdədir?', options: ['Kələm', 'Yerkökü', 'Pomidor'], correct: 1 },
      ],
    },
    {
      title: 'Learn Fruits', titleAz: 'Meyvələri öyrənək',
      videoUrl: 'https://media.w3.org/2010/05/bunny/trailer.mp4',
      thumbnail: 'https://picsum.photos/seed/fruits/400/225',
      duration: 200, category: 'fruits', ageGroup: ['3-5', '6-8'],
      presenter: 'logi', vocabulary: ['Alma', 'Banan', 'Üzüm', 'Portağal'],
      questions: [
        { q: 'Hansı meyvə sarıdır?', options: ['Alma', 'Banan', 'Üzüm'], correct: 1 },
        { q: '"Alma" hansı rəngdə ola bilər?', options: ['Qırmızı', 'Mavi', 'Qara'], correct: 0 },
      ],
    },
    {
      title: 'Animal Sounds', titleAz: 'Heyvan səsləri',
      videoUrl: 'https://media.w3.org/2010/05/bunny/movie.mp4',
      thumbnail: 'https://picsum.photos/seed/animals/400/225',
      duration: 150, category: 'animals', ageGroup: ['3-5'],
      presenter: 'both', vocabulary: ['Pişik', 'İt', 'İnək', 'Quş'],
      questions: [
        { q: 'İt necə səs çıxarır?', options: ['Miyav', 'Hav-hav', 'Mö'], correct: 1 },
      ],
    },
    {
      title: 'Colors Song', titleAz: 'Rənglər mahnısı',
      videoUrl: 'https://media.w3.org/2010/05/video/movie_300.mp4',
      thumbnail: 'https://picsum.photos/seed/colors/400/225',
      duration: 165, category: 'colors', ageGroup: ['3-5', '6-8'],
      presenter: 'cora', vocabulary: ['Qırmızı', 'Mavi', 'Yaşıl', 'Sarı'],
      questions: [
        { q: 'Göy üzü hansı rəngdədir?', options: ['Yaşıl', 'Mavi', 'Qırmızı'], correct: 1 },
      ],
    },
    {
      title: 'Count to 10', titleAz: '10-a qədər sayaq',
      videoUrl: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
      thumbnail: 'https://picsum.photos/seed/numbers/400/225',
      duration: 190, category: 'numbers', ageGroup: ['6-8'],
      presenter: 'logi', vocabulary: ['Bir', 'İki', 'Üç', 'Dörd', 'Beş'],
      questions: [
        { q: '2-dən sonra hansı rəqəm gəlir?', options: ['1', '3', '5'], correct: 1 },
      ],
    },
    {
      title: 'Wash Your Hands', titleAz: 'Əllərini yu',
      videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
      thumbnail: 'https://picsum.photos/seed/habits/400/225',
      duration: 120, category: 'habits', ageGroup: ['3-5', '6-8'],
      presenter: 'both', vocabulary: ['Sabun', 'Su', 'Təmizlik'],
      questions: [
        { q: 'Yeməkdən əvvəl nə etməliyik?', options: ['Yatmaq', 'Əlləri yumaq', 'Qaçmaq'], correct: 1 },
      ],
    },
  ]);


  // ─────────────────────────────────────────────────────────────────
  // REAL DEMO DATA — Group / Attendance / Enrollment / Competition
  // Məqsəd: parent progress, teacher dashboard, student dashboard real dolsun.
  // ─────────────────────────────────────────────────────────────────
  const [stuAyan, stuKenan, stuNilay] = studentDocs;
  const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // ── Qruplar (Group) — müəllim ↔ tələbə əlaqəsi (attendance/teacher dashboard üçün) ──
  const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = WEEKDAY_KEYS[new Date().getDay()]; // bugünkü dərs cədvəldə görünsün

  const [grpMath, grpPhysics, grpLogic] = await Group.create([
    {
      name: 'Riyaziyyat 7-ci sinif', description: 'Həftəlik riyaziyyat dərsləri',
      teacherId: teacher1._id, studentIds: [stuAyan._id, stuKenan._id],
      schedule: { day: todayKey, startTime: '16:00', endTime: '17:30' }, status: 'active',
    },
    {
      name: 'Fizika 12-14', description: 'Fizika qrupu',
      teacherId: teacher2._id, studentIds: [stuKenan._id],
      schedule: { day: 'wednesday', startTime: '18:00', endTime: '19:30' }, status: 'active',
    },
    {
      name: 'Məntiq Klubu', description: 'Məntiq və düşünmə bacarıqları',
      teacherId: teacher1._id, studentIds: [stuAyan._id, stuNilay._id],
      schedule: { day: 'saturday', startTime: '15:00', endTime: '16:00' }, status: 'active',
    },
  ]);

  // ── Sinif sessiyaları (Classroom) — TeacherClassroomIndex /classroom/mine üçün real demo ──
  // teacherId real müəllim USER-idir (model User-ə ref edir; listMine req.user._id ilə filtrləyir),
  // groupId real qrupdur, participants real tələbə sənədləridir. Mock/fake deyil.
  const qrToken = require('crypto').randomBytes(16).toString('hex');
  const minsAgo = (n) => new Date(Date.now() - n * 60 * 1000);
  const hoursLater = (n) => new Date(Date.now() + n * 60 * 60 * 1000);

  await Classroom.create([
    {
      // CANLI — müəllim "Sinif" klikləyəndə dərhal aktiv dərs görsün
      title: 'Riyaziyyat 7 — Canlı dərs', teacherId: tUser1._id, groupId: grpMath._id,
      scheduledAt: minsAgo(15), duration: 60, status: 'live', startedAt: minsAgo(15),
      qrToken, qrExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      participants: [
        { studentId: stuAyan._id,  isPresent: true, joinedAt: minsAgo(14) },
        { studentId: stuKenan._id, isPresent: true, joinedAt: minsAgo(12) },
      ],
    },
    {
      // PLANLAŞDIRILIB — növbəti dərs
      title: 'Məntiq Klubu — növbəti dərs', teacherId: tUser1._id, groupId: grpLogic._id,
      scheduledAt: hoursLater(24), duration: 60, status: 'scheduled', participants: [],
    },
    {
      // BİTİB — keçmiş dərs (real iştirakçı tarixçəsi)
      title: 'Riyaziyyat 7 — keçən dərs', teacherId: tUser1._id, groupId: grpMath._id,
      scheduledAt: daysAgo(2), duration: 60, status: 'ended',
      startedAt: daysAgo(2), endedAt: daysAgo(2),
      participants: [
        { studentId: stuAyan._id,  isPresent: true, joinedAt: daysAgo(2) },
        { studentId: stuKenan._id, isPresent: true, joinedAt: daysAgo(2) },
      ],
    },
    {
      // muellim2 üçün də ən azı 1 sessiya
      title: 'Fizika 12-14 — növbəti dərs', teacherId: tUser2._id, groupId: grpPhysics._id,
      scheduledAt: hoursLater(48), duration: 90, status: 'scheduled', participants: [],
    },
  ]);

  // ── Davamiyyət (Attendance) — son ~25 gün, qarışıq status ──
  // Schema enum: present / absent / late / excused.
  // Parent UI map-i: present→present, late→distant, excused→none, absent→absent.
  const statusPool = ['present', 'present', 'present', 'present', 'late', 'present', 'absent', 'present', 'excused', 'present'];
  const buildSessions = (group, count) => {
    const sessions = [];
    for (let i = 0; i < count; i++) {
      const d = daysAgo(i * 2 + 1);   // hər 2 gündən bir → qrup daxilində unikal tarixlər
      d.setHours(12, 0, 0, 0);
      const records = group.studentIds.map((sid, idx) => ({
        studentId: sid,
        status: statusPool[(i + idx) % statusPool.length],
      }));
      sessions.push({ groupId: group._id, teacherId: group.teacherId, date: d, records });
    }
    return Attendance.insertMany(sessions);
  };
  await buildSessions(grpMath, 16);
  await buildSessions(grpPhysics, 14);
  await buildSessions(grpLogic, 12);

  // ── Enrollment — kurs progressi (35-100%) real görünsün ──
  await Enrollment.insertMany([
    { studentId: stuKenan._id, courseId: courseMath._id,    progress: 72, enrolledAt: daysAgo(40) },
    { studentId: stuKenan._id, courseId: coursePhysics._id, progress: 45, enrolledAt: daysAgo(20) },
    { studentId: stuAyan._id,  courseId: courseMath._id,    progress: 60, enrolledAt: daysAgo(35) },
    { studentId: stuAyan._id,  courseId: courseLogic._id,   progress: 100, completedAt: daysAgo(5), enrolledAt: daysAgo(50) },
    { studentId: stuNilay._id, courseId: courseLogic._id,   progress: 35, enrolledAt: daysAgo(15) },
  ]);

  // ── Yarış tarixçəsi (Competition) — tamamlanmış, real participant/nəticə ──
  const compQuestions = insertedQuestions.slice(0, 6).map((q) => ({ questionId: q._id, timeLimit: 30, points: 100 }));
  await Competition.create([
    {
      title: 'Riyaziyyat Sprinti #1', createdBy: tUser1._id, groupId: grpMath._id,
      questions: compQuestions, status: 'finished',
      startedAt: daysAgo(10), finishedAt: daysAgo(10), pin: '100100',
      participants: [
        { studentId: stuKenan._id, score: 950, correctAnswers: 9, totalAnswers: 10, rank: 1 },
        { studentId: stuAyan._id,  score: 720, correctAnswers: 7, totalAnswers: 10, rank: 2 },
        { studentId: stuNilay._id, score: 540, correctAnswers: 5, totalAnswers: 10, rank: 3 },
      ],
    },
    {
      title: 'Fizika Yarışı', createdBy: tUser2._id, groupId: grpPhysics._id,
      questions: compQuestions, status: 'finished',
      startedAt: daysAgo(3), finishedAt: daysAgo(3), pin: '200200',
      participants: [
        { studentId: stuAyan._id,  score: 880, correctAnswers: 8, totalAnswers: 10, rank: 1 },
        { studentId: stuKenan._id, score: 680, correctAnswers: 7, totalAnswers: 10, rank: 2 },
      ],
    },
    {
      // Canlı host demo üçün gözləyən yarış — müəllim PIN ilə başlada bilər
      title: 'Canlı Demo Yarışı', createdBy: tUser1._id, groupId: grpMath._id,
      questions: compQuestions, status: 'waiting', pin: '123456', participants: [],
    },
  ]);

  console.log('\n✅ Seed tamamlandı!');
  console.log('   ── Hesablar ───────────────────────────────');
  console.log('   Admin:    admin@logicora.az / Admin123!');
  console.log('   Müəllim:  muellim1@logicora.az / Test123!  (Murad — Riyaziyyat, Məntiq qrupları)');
  console.log('   Müəllim:  muellim2@logicora.az / Test123!  (Leyla — Fizika qrupu)');
  console.log('   Tələbə:   student1@logicora.az / Test123!  (Ayan, 9-11 yaş, Lv.12 gümüş)');
  console.log('   Tələbə:   student2@logicora.az / Test123!  (Kənan, 12-14 yaş, Lv.28 qızıl ⭐)');
  console.log('   Tələbə:   student3@logicora.az / Test123!  (Nilay, 6-8 yaş, Lv.5 bürünc)');
  console.log('   Valideyn: parent1@logicora.az / Test123!  (3 uşaq: Ayan, Kənan, Nilay)');
  console.log('   ── Demo məlumat ───────────────────────────');
  console.log('   Suallar:      50 ədəd (5 fənn)');
  console.log('   Qruplar:      3 (Riyaziyyat 7, Fizika 12-14, Məntiq Klubu)');
  console.log('   Davamiyyət:   42 sessiya (qarışıq present/late/absent/excused)');
  console.log('   Enrollment:   5 (Kənan 2 kurs, Ayan 2 kurs, Nilay 1 kurs)');
  console.log('   Yarışlar:     2 tamamlanmış + 1 canlı demo');
  console.log('   Yarış PIN:    100100, 200200 (tamamlanmış) · 123456 (CANLI demo host üçün)');
  console.log('   Siniflər:     4 sessiya (muellim1: 1 canlı + 1 planlı + 1 bitmiş · muellim2: 1 planlı)');
  console.log('');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error('❌ Seed xətası:', err);
  await mongoose.connection.close();
  process.exit(1);
});
