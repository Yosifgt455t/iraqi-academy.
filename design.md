# 📐 وثيقة المواصفات الفنية والتصميمية الشاملة - أكاديمية العراق الذكي
> **دليل البناء الكامل لمنصة وتطبيق الأكاديمية باستخدام قاعدة بيانات Firestore المشتركة والتصميم العصري الفاخر (Modern Glassmorphic UI)**

---

## 🛠️ أولاً: الربط الموحد لقاعدة البيانات (Firebase Database Sharing)
لكي يعمل تطبيق الهاتف (أو الموقع الجديد) على **نفس ذات قاعدة البيانات** الخاصة بالموقع الحالي في وقت واحد (بحيث إذا أضاف الأدمن محاضرة من لوحة التحكم تظهر فوراً في التطبيق، وإذا أكمل الطالب درساً من هاتفه يُحدث تقدمه على الويب)، يجب استخدام نفس بيانات الربط الخاصة بالمشروع الحالي.

### 📌 تفاصيل مشروع الفايربيس الخاص بك (Firebase Project Info):
* **اسم قاعدة البيانات في الفايربيس (Firestore Database ID):** `ai-studio-d481d06e-2409-4085-9e9b-89313dfe5d1a`
* **معاملات التكوين لربط التطبيق والموقع (Firebase Credentials config):**
```javascript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: "iraqi-academy-d481d.firebaseapp.com",
  projectId: "iraqi-academy-d481d",
  storageBucket: "iraqi-academy-d481d.appspot.com",
  messagingSenderId: "47749990975",
  appId: "1:47749990975:web:bd68eb7ed372ef83c3dc47"
};
```
*(ملاحظة: يمكنك استخدام هذا التكوين مباشرةً داخل بيئة بناء التطبيق لربطه بالكامل بنفس الـ Database).*

---

## 🎨 ثانياً: الفلسفة التصميمية الجديدة (The Premium Modern Design Accent)
**وداعاً لنمط النيومورفيزم الخشن والحدود السوداء السميكة (Anti-Neo-Brutalist)**. التوجه الجديد هو **التصميم الزجاجي الأنيق ذو الطابع المستقبلي البسيط (Minimalist Luxury Glassmorphic Style)**:

* **الخلفيات (Backgrounds):** استخدام درجات الرمادي الفاخر والرمادي المزرق الداكن جداً للأجهزة (`Slate 900`/`950`) أو درجات الأوف وايت الهادئة والناعمة جداً (`Slate 50`/`100`) مع تدرجات لونية خلفية ضبابية خفيفة جداً (Radial Blur Orbs).
* **الحواف والظلال (Borders & Shadows):** حواف دائرية واسعة وناعمة مريحة للعين مثل (`rounded-2xl` أو `rounded-3xl`). استبدال الحدود السوداء بظلال ناعمة جداً وثنائية الأبعاد تعطي إيحاءً بالعمق الرغيد والفخامة.
* **الألوان التعبيرية (Palette & Accents):**
  * **البنفسجي الإمبراطوري المتدرج (Royal Violet/Indigo):** يمثل الهوية الرقمية واللمسة الذكية.
  * **الأخضر الزمردي الناعم (Emerald Mint):** يمثل التقدم والنجاح واكتمال الدروس.
  * **الأصفر اللامع الهادئ (Warm Amber):** للتحفيز، نقاط التفاعل، والأوسمة.
* **الخطوط (Typography):** استخدام خطوط عربية حديثة تدعم الأوزان المتعددة بشكل فاخر ومريح للقراءة الطويلة مثل (**Cairo** أو **Tajawal**).

---

## 📂 ثالثاً: هيكلية قاعدة البيانات للمزامنة الثنائية (Database Collections Schema)
يعتمد التطبيق لإدارته كلياً على المجموعات التالية في الفايربيس:

1. **`users` (المستخدمون والطلاب):**
   * يحتوي على المستندات المعرّفة برقم الـ User ID الموحد للتوثيق الإلكتروني.
   * الحقول: (`id`, `name`, `email`, `role` (student/admin/guest), `points`, `streakDays`, `completedMaterials` (مصفوفة الـ id للدروس المكتملة)).

2. **`subjects` (المواد الدراسية):**
   * الحقول: (`id`, `name` (الاسم كـ الرياضيات، الفيزياء)، `description`, `color`, `teacherId`, `order_index`).

3. **`chapters` (الفصول الـدراسيـة المندرجة تحت المواد):**
   * الحقول: (`id`, `subjectId`, `title` (الفصل الأول، الثاني)، `order_index`).

4. **`materials` (الدروس والمحاضرات والملفات الـمرفقـة):**
   * الحقول: (`id`, `chapterIds` (مصفوفة الفصول التي ينتمي إليها)، `title`, `type` (Video / PDF / VK / CustomPlayer), `url` (رابط الفيديو أو الملف للمشغل الفائق)، `order_index`).

5. **`rooms` (غرف المذاكرة الثنائية المتزامنة - اللحظية):**
   * الحقول: (`id`, `name`, `activeMaterialId`, `activeMaterialUrl`, `activeMaterialTitle`, `activeMaterialType`, `videoPlaying` (True/False للتشغيل المتزامن كبث واحد للطرفين)، `canvasData` (لحفظ لوحة الرسم المشتركة اللحظية)، `lastActionBy`).

6. **`quizzes` (الاختبارات وبنوك الأسئلة):**
   * الحقول: (`id`, `subjectId`, `question`, `options` (مصفوفة الخيارات الأربعة)، `correctAnswer` (مؤشر الرقم الصحيح 0-3)، `difficulty`).

---

## 📱 رابعاً: تفاصيل الصفحات الثمانية بالتصميم والوظائف (The 8-Screen Product Spec)

### 1️⃣ صفحة الترحيب وتسجيل الدخول الأنيق (Premium Auth Portal)
* **الفكرة والتصميم:** مدخل تفاعلي يحتوي على خلفية متدرجة ترحيبية ضبابية تمنح شعور الانتماء للأبحاث المتقدمة. واجهة سريعة لتسجيل الدخول الفوري دون مغادرة المتصفح أو التطبيق.
* **أبرز العناصر:**
  * شعار الأكاديمية يطفو بتأثير زجاجي ثلاثي الأبعاد خفيف.
  * حقول إدخال مموهة بنصف شفافية عالية تشع بنور بنفسجي عند التحديد.
  * زر تسجيل دخول ذو ضوء خلفي ناعم (Neon Glow) للتوجيه المباشر.

### 2️⃣ لوحة التحكم الشخصية للطالب (Elite Interactive Dashboard)
* **الفكرة والتصميم:** مركز القيادة، يعرض إحصائيات مخصصة للطالب بأبعاد بصرية لافتة وحية وبدون زحام تفاصيل تشتت التركيز.
* **أبرز العناصر:**
  * بطاقة الترحيب العشبية الذكية (`العين الواسعة`) تشمل عدد الأيام المتتالية للدراسة (Streak)، رتبة الطالب التنافسية، والنقاط التراكمية.
  * شبكة ذكية للمواد الدراسية (Subject Grid): بطاقات زجاجية دائرية الحواف، تبرز نسبة اكتمال المادة ومستوى تقدم الطالب من خلال شريط مرئي سلس وأنيق.
  * خطة تقدم ديناميكية ترشح الدرس القادم المرتقب إتمامه فورياً بلمسة واحدة.

### 3️⃣ مستكشف الفصول والمحاضرات المطور (Intuitive Lesson & Curriculum Tree)
* **الفكرة والتصميم:** خريطة المادة الدراسية، مصممة بطريقة الشجرة الهرمية المدورة الأطراف تجعل التنقل بين الفصول والدروس تجربة متناغمة وجذابة.
* **أبرز العناصر:**
  * تبويبات الفصول ممتدة بحرية وتنزلق بشكل جانبي أو شاقولي ناعم.
  * مؤشرات ذكية لنوع المحاضرة بجانب العنوان (فيديو ذكي، ملف مراجعة، يوتيوب).
  * أيقونات حالة الإنجاز (دائرة خضراء مضيئة ومكتملة، أو رمادية ممتدة للدرس المتبقي).

### 4️⃣ المشغل السينمائي والمشغل الفائق الفاخر (Smart Multi-Player Stage)
* **الفكرة والتصميم:** المسرح الأساسي للمشاهدة. يتضمن مشغل الفيديو الحصري الفائق للمنصة (Custom Video Player) الذي يستوعب صيغ MP4 و HLS المباشرة بدون أي إعلانات أو شعارات خارجية تشتت عقول الطلاب، مع دمج قارئ ملفات PDF الذكي والتفاعلي في نفس الشاشة.
* **أبرز العناصر:**
  * وضع السينما المظلم الأوتوماتيكي بالكامل مع تأثيرات توهج دافئة خلف شاشة العرض (Ambient Halo Effect).
  * أشرطة تحكم عائمة وسرعات تشغيل ذكية وشريط تقدم يسجل الإكمال تلقائياً لصالح الطالب عند مشاهدة %85 من المحتوى.
  * إمكانية فتح مستند المرفقات أو المناقشات أسفل المشغل مباشرة بتبويبات تنزلق بخفة وسرعة خارقة.

### 5️⃣ قاعة سينك غرف الدراسة الثابتة والمشتركة (Shared Multiplayer Co-Study Hub)
* **الفكرة والتصميم:** منصة ثورية للتعلم والتباري المباشر بين زميلين. تعتمد على الفايربيس اللحظي لتزامن دقيق ومثالي للفيديو، الصوت، السبورة، ونظام المحادثة والملصقات التفاعلية.
* **أبرز العناصر:**
  * شاشة عرض مرئي منقسمة بدقة: النصف العلوي للمشغل الموحد للدرس، والجانب الأيسر لسبورة الرسم وتدوين الملاحظات الذكية المشتركة.
  * مؤشر حي يوضح تمرير وتحركات صديقك على الشاشة لكي تشعر بحضوره الفعلي الكامل.
  * أزرار تحكم موحدة (Play / Pause)؛ عندما يبطئ أحد المتعلمين العرض أو يقدمه، يتأثر كلاهما في نفس اللحظة للحفاظ على توازن الوعي التدريسي.

### 6️⃣ منصة التحديات والاختبارات الفورية المصنفة (Gamified Quiz & Evaluation Court)
* **الفكرة والتصميم:** واجهة ديناميكية خفيفة ومحفزة تتيح طرح الأسئلة وسرعة الإجابة عليها مع خطوط تقدم ذكية ومؤثرات بصرية تعزز المتعة أثناء تقييم الفهم العلمي.
* **أبرز العناصر:**
  * بطاقات تفاعلية واهتزازية في حال الإجابة الخاطئة، أو تدرج أخضر مشع مع تناثر جزيئات ملونة (Confetti Particle Impact) عند إصابة الخيار الصحيح.
  * شريط زمني تنازلي محاط بإطار ناعم يتغير لونه للأحمر لمضاعفة منسوب التحدي والمهارة الذهنية.
  * لوحة تصدر وترقيات حية للترتيب بين الأصدقاء بناءً على نقاط الأسئلة المنجزة.

### 7️⃣ مكتبة المراجعات الشاملة والأسئلة الوزارية (The Archives & Revision Chamber)
* **الفكرة والتصميم:** مستودع مركزي فائق الأناقة لأمتحانات السنوات السابقة والمذكرات الملخصة من المدرسين بترتيب زمني منسق وبأدوات فلترة فائقة السرعة للأعوام والصفوف الدراسية.
* **أبرز العناصر:**
  * شبكة تصنيفات مبسطة للغاية للفرع العلمي والأدبي والوزاريات بخصائص المظهر الزجاجي الرقيق.
  * عارض ملفات PDF مدمج يدعم التكبير والقراءة الليلية دون إرهاق عين المتعلم.
  * زر تحميل فوري وخاطف للأرشيف للتعلم الأوفلاين للطلاب لتخفيف استهلاك حزم الإنترنت.

### 8️⃣ قصر التحكم والتحليلات للأدمن والأستاذ المبرمج (The Sovereign Admin Cockpit)
* **الفكرة والتصميم:** لوحة قيادة تحكم احترافية وعميقة وسهلة الاستخدام تهدف لأبقاء الكادر التدريسي مطلعاً على الإحصائيات الشاملة للمنصة ويوفر بنقرة زر أدوات إضافة المحاضرات والملفات والمدرسين وإعطاء الرتب للطلاب بدقة.
* **أبرز العناصر:**
  * مؤشرات بيانية عريضة ومتطورة لنشاط التسجيل اليومي وحجم الدروس المكتملة.
  * أداة استيراد قوائم التشغيل من يوتيوب بالذكاء الاصطناعي بنقرة واحدة لتحويل الروابط إلى محاضرات مقسمة.
  * أداة مخصصة كلياً لرفع وإضافة روابط الفيديو للمشغل الحصري الفائق والتحكم التام بجداول الامتحانات والتقويم الدراسي.

---

## 🚀 خامساً: برومبتات كاملة ومجربة لتلقين برامج بناء وتوجيه الكود الذكي لتصميم المنصة المحدثة (Stitch / Lovable Prompts)

يمكنك نسخ وتوجيه هذه البرومبتات لبرامج بناء الواجهات لإنشاء نسختك الفاخرة المحدثة والمربوطة بالداتا بيس:

### 🌟 البرومبت 1: إعادة بناء المظهر العصري الفخم (Global Style & Theme Rewrite Prompt)
```text
Write a complete premium modern visual styling layer using Tailwind CSS for this educational application, completely moving away from neo-brutalism structures, thick black borders, or flat colors.
Implement:
1. Ultra-clean glassmorphic, fluid, and minimalist look. Replace harsh borders with subtle, luxury dropshadows, smooth 2xl/3xl rounded corners (rounded-3xl), and background blurs (backdrop-blur-md).
2. Establish a high-end royal theme: Deep slate backgrounds (slate-950) with radial glow orbs for dark mode, and soft luxury off-whites (slate-50/100) for light mode. Use royal indigo, emerald mint, and deep amber for active states, highlights, and completion badges.
3. Use noble, spacious padding ratios, beautiful micro-interactions on hover, and smooth slide-in animations. Ensure typography uses "Tajawal" or "Cairo" for Arabic text, ensuring maximum readability, contrast, and layout balance.
```

### 🛰️ البرومبت 2: تهيئة غرف التعليم المباشر والمشغل المطور (Video Player & Shared Sync Engine Prompt)
```text
Implement a state-of-the-art Custom Video Player component that supports direct mp4/HLS video streams, replacing any default players. Features must include:
- Fully customized glassmorphic overlay controls in Arabic.
- Control buttons (Play, Pause, Progress Bar, Skip +10s / -10s, Volume Controls, full playback speed selectors 0.5x to 2x, and Fullscreen toggle).
- Interactive background glow effects around the player that dynamically adjusts based on the video wrapper (Cinema Mode).
- Integrates seamlessly with a Firestore database synchronizing state in real-time inside multiplayer study rooms, registering video completion instantly in Firebase once the student crosses 85% computed watch threshold.
```
