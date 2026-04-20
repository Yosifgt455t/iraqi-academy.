# عراقي أكاديمي - Iraqi Academy 🎓

Iraqi Academy is a comprehensive educational platform designed specifically for students in Iraq (5th and 6th Preparatory grades). It provides an organized and interactive environment to access video lessons, study materials (PDFs), ministerial exams, and a smart flashcard system.

## 🚀 Features

- **Organized Curriculum:** Full support for various subjects categorized by grade and section (Scientific/Literary).
- **Video & PDF Integration:** Access high-quality YouTube lessons and downloadable study guides.
- **Smart Flashcards:** Integrated learning tool for quick revision of complex topics.
- **Professional Exam Builder:** A dedicated tool for teachers to generate high-quality exam papers in PDF format with smart branching logic.
- **Content Management System (CMS):** Advanced Admin Dashboard featuring visual builders for bulk adding subjects, chapters, materials, and flashcards.
- **Modern Authentication:** Secure Google Login via Firebase.
- **Responsive Design:** Fully optimized for mobile, tablet, and desktop devices.

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, TypeScript.
- **Styling:** Tailwind CSS, Framer Motion (for animations).
- **Backend/Database:** Firebase Firestore.
- **Authentication:** Firebase Auth (Google Provider).
- **Icons:** Lucide React.
- **PDF Generation:** jsPDF, html2canvas.

## 📦 Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/iraqi-academy.git
   cd iraqi-academy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup Firebase:**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/).
   - Enable Firestore and Authentication (Google Provider).
   - Create a file named `firebase-applet-config.json` in the root directory with your config:
   ```json
   {
     "projectId": "YOUR_PROJECT_ID",
     "appId": "YOUR_APP_ID",
     "apiKey": "YOUR_API_KEY",
     "authDomain": "YOUR_AUTH_DOMAIN",
     "firestoreDatabaseId": "(default)",
     "storageBucket": "YOUR_STORAGE_BUCKET",
     "messagingSenderId": "YOUR_MESSAGING_SENDER_ID"
   }
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

## 🌐 Deployment

### Vercel
This project is optimized for deployment on **Vercel**. Simply connect your GitHub repository to Vercel and it will handle the build automatically.

**Important:** Make sure to add your Vercel domain to the **Authorized Domains** in your Firebase Authentication settings to allow login.

## 📄 License
This project is licensed under the MIT License.

---

### منصة عراقي أكاديمي
مشروع تعليمي يهدف إلى تسهيل وتنظيم المحتوى الدراسي لطلاب المرحلة الإعدادية في العراق، مع أدوات متطورة للمدرسين والطلاب.
