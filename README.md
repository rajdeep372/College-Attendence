# 🎓 AcademiaSync — Advanced College Management & Smart Attendance Web App

> **Next-Gen Progressive Web App (PWA)** built with Next.js 16 (App Router), Tailwind CSS, Clerk Auth, MongoDB (Mongoose), Google Gemini AI, and Framer Motion. Engineered with a signature **Blue & White 3D Glassmorphism** design language.

---

## 🌟 Key Highlights & Architecture

- **📱 Progressive Web App (PWA)**:
  - Installable directly from the browser on iOS, Android, and Desktop without app store friction.
  - Offline-first caching strategy with dynamic service worker (`public/sw.js`) and custom 3D Glassmorphic offline fallback page (`public/offline.html`).
- **🔐 Multi-Role Authentication & Access Control**:
  - Powered by Clerk Auth with granular MongoDB role synchronization.
  - 4 Dedicated Role Portals:
    - **Principal Dashboard** (`/dashboard/principal`): Institutional metrics, accreditation audits, at-risk defaulter alerts.
    - **HOD Dashboard** (`/dashboard/hod`): Gemini AI schedule extraction, faculty workload distribution, syllabus trackers.
    - **Teacher Dashboard** (`/dashboard/teacher`): Absent-First roll-call tally grid & live Dynamic QR station.
    - **Student Dashboard** (`/dashboard/student`): Digital ID badge, 4-digit TOTP geofenced check-in, and safe bunk margin ledger.
- **✨ Gemini AI Schedule Extraction**:
  - Upload college routine timetable images or PDFs to extract weekly schedules into structured MongoDB collections.
- **📍 Anti-Proxy Geofencing & Rolling TOTP**:
  - Distance calculation using the **Haversine formula** (50m campus radius from coordinate `[22.5726, 88.3639]`).
  - Rolling 4-digit TOTP with HMAC-SHA256 hash and drift tolerance to eliminate proxy attendance.
- **⚡ Absent-First Roll-Call Paradigm**:
  - Teachers mark attendance by exception: all students start as **Present**; tap cards to mark **Absent (Red)**, drastically speeding up lecture hall tallies.
- **🔔 Automated Defaulter Alerts**:
  - Automatic detection of attendance `< 75%` or `3+ consecutive absences` with email notifications via Nodemailer.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ (Tested on Node.js 24)
- MongoDB Database cluster (MongoDB Atlas or local)
- Clerk Auth project credentials
- Google Gemini API key

### 2. Environment Setup
Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Fill in your API credentials:
```env
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the web app.

---

## 📦 Production Build & Testing

```bash
# Verify TypeScript and linting
npx tsc --noEmit

# Compile production bundle
npm run build

# Start production server
npm run start
```

---

## 🚢 Deploying to Vercel (Recommended)

1. Push your repository to **GitHub** / **GitLab** / **Bitbucket**.
2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Add New Project"**.
3. Import your repository.
4. Under **Environment Variables**, add the variables from `.env.example`:
   - `MONGODB_URI`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`)
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`)
5. Click **Deploy**. Vercel will build the project and provide your live SSL URL.

---

## 🛡️ Security Features
- Strict Role-Based Middleware protection.
- Geofence coordinate tamper resistance with server-side validation.
- Sanitized database queries via Mongoose ODM.
- CSRF protection and secure HTTP headers.
