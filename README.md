# PulseFit Pro - Gym & Fitness Management Ecosystem

A complete, production-ready gym operations platform featuring a **Laravel REST API Backend connected to MySQL**, a **Web App for Gym Owners**, and a **Native Android & React Native Mobile App for Trainers and Gym Members**.

---

## 🏛️ Ecosystem Overview

```
gym_app/
├── backend/                # 🐘 Laravel 12 + MySQL REST API Backend
│   ├── app/
│   │   ├── Http/Controllers/Api/ # Auth, Members, Trainers, Plans, Classes, Attendance, Workouts, Diets, Invoices
│   │   └── Models/               # Eloquent Models with Sanctum token auth & relational schema
│   ├── database/
│   │   ├── migrations/           # 14 Full Database Tables & Foreign Key Constraints
│   │   └── seeders/              # Comprehensive initial dataset (Owners, Coaches, Members, Workouts, Diets)
│   └── routes/api.php            # 43 Versioned REST API endpoints under /api/v1/...
│
├── frontend/               # 👑 React 19 + Vite Owner Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── owner/      # Owner Dashboard, CRM, Trainers, Plans, Financials, QR Scanner, Equipment, Schedule
│   │   │   ├── trainer/    # Trainer Dashboard, Client Roster, Workout/Diet Builders
│   │   │   ├── member/     # Member Dashboard, Workouts, Nutrition, Bookings, Profile
│   │   │   ├── auth/       # Authentication, First-time Password Reset
│   │   │   └── common/     # Glassmorphism Navbar, Sidebar, StatCards, Toast Alerts
│   │   ├── context/        # AuthContext & GymDataContext (State Management)
│   │   └── services/       # RESTful API client configured for Laravel backend
│   └── package.json
│
├── mobile/                 # 📱 React Native & Expo Mobile App (Trainers & Members)
│   ├── android/            # 🤖 Native Android Studio Project (Gradle, Kotlin/Java, Manifest)
│   │   ├── app/src/main/
│   │   ├── build.gradle
│   │   └── gradlew / gradlew.bat
│   ├── src/
│   │   ├── screens/
│   │   │   ├── trainer/    # Coach Dashboard, Athlete Roster, Workout Split Builder, Diet Meal Planner
│   │   │   └── member/     # Daily Plan, Interactive Workout Execution with Rest Timer, Diet Tracker, Digital ID Pass
│   │   ├── navigation/     # Bottom Tab Navigators & Dynamic Role Switching (Trainer / Member)
│   │   ├── context/        # Auth & GymData state providers
│   │   └── theme/          # Fitness Dark-Mode Colors & Design Tokens
│   ├── App.js
│   └── package.json
│
└── README.md
```

---

## 🚀 How to Run the Ecosystem

### 1. Laravel Backend (`backend/`)
```bash
cd backend
# Run migrations and seed data
php artisan migrate:fresh --seed

# Start the API server
php artisan serve --port=8000
```
API is live at `http://127.0.0.1:8000/api/v1/health`.

---

### 2. Owner Web App (React 19 + Vite)
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

**Demo Credentials**:
- **Owner**: `owner@pulsefit.in` / `admin123`
- **Trainer**: `trainer@pulsefit.in` / `trainer123`
- **Member**: `member@pulsefit.in` / `member123`

---

### 3. Native Android Project in Android Studio (`mobile/android/`)
1. Open **Android Studio**.
2. Click **Open** and select the folder:
   ```
   gym_app/mobile/android
   ```
3. Let Gradle sync dependencies.
4. In terminal, start the bundler:
   ```bash
   cd mobile
   npm start
   ```
5. Click **Run ▶** in Android Studio to launch the app directly on your physical Android phone (via USB) or Android Emulator!

---

### 4. Expo Go Mobile Preview
```bash
cd mobile
npm start
```
- Scan the QR code using the **Expo Go** app on your phone.
- Or press `w` to preview in the web browser.
