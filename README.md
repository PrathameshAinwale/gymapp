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

---

## 🚢 CI/CD & Hostinger Production Deployment

PulseFit Pro uses **GitHub Actions** (`.github/workflows/deploy.yml`) to automatically build and deploy the React frontend and Laravel backend to **Hostinger** over **SSH** on every push to `main`.

### 🌿 Branch Strategy
- **`dev`**: Used for all local development, new features, and testing. **No automated deployment** runs on pushes to `dev`.
- **`main`**: Production release branch. Pushing or merging a PR into `main` automatically triggers the build and live deployment pipeline.

---

### 🏛️ How React & Laravel Are Served Together on Hostinger
Both the frontend and backend are served under a **Single Unified Domain** (e.g. `https://yourdomain.com`):
1. **React Build Injection**: During the GitHub Actions workflow, `npm run build` compiles the React 19 app into `frontend/dist/`. These static assets (`index.html`, `assets/`, favicon, etc.) are copied directly into Laravel's `backend/public/` directory before deployment.
2. **Single Server Routing**: 
   - Any API request starting with `/api/v1/...` or `/sanctum/...` is handled directly by Laravel controllers.
   - Any non-API request (e.g. `/`, `/members`, `/analytics`) is caught by Laravel's SPA fallback in `backend/routes/web.php` and serves `public/index.html`, letting React Router manage client-side navigation.
3. **API Resolution**: In production, the React frontend automatically detects its host and communicates with `${window.location.origin}/api/v1` without CORS hurdles or hardcoded ports.

---

### 🔑 Step 1: Generate an SSH Key Pair

On your local machine (or any terminal), run:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./hostinger_deploy_key
```
This creates two files:
- `hostinger_deploy_key` (Private key — keep secret!)
- `hostinger_deploy_key.pub` (Public key)

#### Add Public Key to Hostinger:
1. Log into your **Hostinger hPanel**.
2. Navigate to **Advanced** > **SSH Access**.
3. Ensure SSH Access is enabled. Note your **SSH IP/Host**, **Port** (typically `65002` on Hostinger shared/cloud hosting, or `22` on VPS), and **Username**.
4. In the **SSH Keys** section, click **Add SSH Key**.
5. Name it `github-actions` and paste the contents of `hostinger_deploy_key.pub`.

---

### 🔐 Step 2: Configure GitHub Repository Secrets

In your GitHub repository:
1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** and add the following:

| Secret Name | Value | Example |
| :--- | :--- | :--- |
| `SSH_HOST` | Your Hostinger server IP address or hostname | `195.35.x.x` or `connect.hostinger.com` |
| `SSH_USERNAME` | Your Hostinger SSH username | `u123456789` |
| `SSH_PORT` | SSH Port from Hostinger hPanel | `65002` (default for Hostinger shared) |
| `SSH_PRIVATE_KEY` | Entire content of `hostinger_deploy_key` (private key) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `SSH_TARGET_DIR` | Absolute or relative path on server where the app resides | `domains/yourdomain.com/public_html` or `public_html` |
| `VITE_API_URL` *(optional)* | Production API URL if different from origin | `https://yourdomain.com/api/v1` |

---

### ⚙️ Step 3: One-Time Hostinger Initial Setup

Before the first automatic push:
1. **Create MySQL Database**:
   - In Hostinger hPanel, go to **Databases** > **Management** and create a database (e.g. `u123456789_pulsefit`) and database user with full privileges.
2. **Create Production `.env` File**:
   - Connect to your server via SSH or use the Hostinger File Manager.
   - In your project root (e.g., `public_html/`), create a `.env` file with your production configuration:
     ```env
     APP_NAME=PulseFitPro
     APP_ENV=production
     APP_KEY=base64:... # Generate via `php artisan key:generate`
     APP_DEBUG=false
     APP_URL=https://yourdomain.com

     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=u123456789_pulsefit
     DB_USERNAME=u123456789_dbuser
     DB_PASSWORD=YourStrongPasswordHere
     ```
   > **Security Guarantee**: The deployment workflow explicitly excludes `.env` from being overwritten by `rsync`. Your production database credentials and application keys remain permanently secure on Hostinger.

3. **Configure Document Root**:
   - In Hostinger, point your domain's Document Root to the `public/` directory of the application, OR ensure the root directory has a `.htaccess` redirecting to `public/`:
     ```apache
     <IfModule mod_rewrite.c>
         RewriteEngine On
         RewriteRule ^(.*)$ public/$1 [L]
     </IfModule>
     ```

---

### 🔄 Step 4: What Happens on Every Push to `main`

1. **Build Step**:
   - GitHub Actions runner boots Ubuntu.
   - Installs Node.js dependencies and executes `npm run build` in `frontend/`.
   - Copies static bundle into `backend/public/`.
   - Installs production Composer dependencies (`--no-dev --optimize-autoloader`) in `backend/`.
2. **Deploy Step (Rsync over SSH)**:
   - Syncs all application and vendor files to Hostinger target directory.
   - Preserves existing production `.env`, `storage/app/public/` uploads, logs, and sessions.
3. **Post-Deploy Remote Commands**:
   - Runs `php artisan migrate --force` to apply pending database schema migrations safely without touching existing records.
   - Creates storage symlinks (`php artisan storage:link`).
   - Optimizes and caches configurations, routes, and views (`config:cache`, `route:cache`, `view:cache`).
   - Restarts queues (`php artisan queue:restart || true`).
   - Live site updates seamlessly with zero manual intervention!
