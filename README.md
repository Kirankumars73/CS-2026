# CS 2026 Digital Yearbook 🎓

A modern, responsive, and highly interactive digital yearbook built specifically for the Computer Science Class of 2026. This application uses React, Firebase, and Vite to provide a seamless full-stack experience.

## ✨ Features

- **Exclusive Access**: Protected login via Google Authentication gated by a secret class code.
- **Student Profiles**: Dedicated student profiles mapped to Class Roll Numbers (1–67). Students can update their name, roll number, bio, quote, and upload custom profile pictures.
- **Private Direct Messaging (DMs)**: Secure, real-time 1-on-1 private messaging with classmates.
- **Global Class wall**: A shared "Wall" for public shoutouts and memories, and a general Global Chat for group conversations.
- **Photo Gallery**: Masonry grid gallery categorized by events (Classroom, Trips, Festivals, Sports) with full-screen lightbox viewing.
- **Smart Image Compression**: All photos uploaded (profiles and gallery) are automatically compressed client-side before touching the database to drastically save storage space and bandwidth.
- **Premium UI/UX**: Designed with a sleek OLED-dark theme, glassmorphism aesthetics, fluid transition animations, and modern typography.
- **Admin Panel**: Only accessible to designated admin accounts. The panel provides overarching control to moderate user accounts, wall notes, gallery uploads, and class events.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, React Router DOM, React Icons
- **Backend & Database**: Firebase (Authentication, Firestore, Storage)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Animations)
- **Hosting**: Vercel (or preferred static site host)

## 🚀 Getting Started

### Prerequisites

You will need the following installed:
- Node.js (v18 or higher recommended)
- A [Firebase](https://firebase.google.com/) Project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kirankumars73/CS-2026.git
   cd CS-2026
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configurations along with your custom secret code to gate logins. *Note: Never commit your `.env` file to version control.*
   ```env
   # Firebase Config
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # Security
   VITE_CLASS_SECRET_CODE=your_secret_class_code
   VITE_CLASS_ID=cs2026
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` to view the app in your browser.

## 🔒 Security Notice

Firebase API keys are typically allowed to be public since Firebase is a client-side database. Your real security comes from your [Firebase Security Rules](https://firebase.google.com/docs/rules). However, you should still keep your `VITE_CLASS_SECRET_CODE` strictly private. If this code is compromised, outsiders will be able to create unauthorized accounts. 

## 📦 Build for Production

To create a production-optimized build:
```bash
npm run build
```
This command generates static assets inside the `dist` folder, which can be deployed directly to your hosting platform.

---
*Developed for the CS Class of 2026.*
