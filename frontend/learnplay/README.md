# LearnPlay - Interactive Learning Platform

LearnPlay is a comprehensive educational platform that provides interactive learning experiences for students with parent/guardian oversight and teacher management capabilities.

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/MauriceOmbewa/wazi.git
cd wazi/learnplay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Web Environment Variables

The build script (`npm run build`) auto-generates `src/environments/environment.ts` from system environment variables. You must set these before building.

#### On Linux/macOS — set them in your terminal session:

```bash
export API_URL=https://your-api.com
export GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
export ADMIN_LOGIN_PATH=admin-portal
export POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxx
export POSTHOG_HOST=https://us.i.posthog.com
```

#### On Windows (Command Prompt):

```cmd
set API_URL=https://your-api.com
set GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
set ADMIN_LOGIN_PATH=admin-portal
set POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxx
set POSTHOG_HOST=https://us.i.posthog.com
```

> **Tip:** To avoid setting these every time, add the `export` lines to your `~/.bashrc` or `~/.zshrc` file.

#### Web Environment Variables Explained

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `API_URL` | ✅ Yes | Backend API base URL | `https://your-api.com` |
| `GOOGLE_CLIENT_ID` | ✅ Yes | Google OAuth Web Client ID for sign-in | `123456789-abc.apps.googleusercontent.com` |
| `ADMIN_LOGIN_PATH` | No | Admin portal route path | `admin-portal` (default) |
| `POSTHOG_KEY` | No | PostHog analytics project key | `phc_xxxxxxxxxxxxxxxxx` |
| `POSTHOG_HOST` | No | PostHog instance URL | `https://us.i.posthog.com` (default) |

> **Note:** If `src/environments/environment.ts` already exists (e.g. you created it manually), the build script will skip generation and use the existing file. You can also create it manually:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://your-api.com',
  googleClientId: '123456789-abc.apps.googleusercontent.com',
  adminLoginPath: 'admin-portal',
  posthogKey: 'phc_xxxxxxxxxxxxxxxxx',
  posthogHost: 'https://us.i.posthog.com',
};
```

### 4. Run the Web Application

#### Development Mode
```bash
npm start
```

The application will be available at `http://localhost:4200`

#### Production Build
```bash
npm run build
```

---

## 📱 Android APK Build Guide

The Android project lives in the `apk-build` branch. It contains the pre-configured Android project so you do not need to generate it from scratch — you only need to provide your local environment keys.

### Prerequisites for APK Build

In addition to Node.js and npm, you need:
- **Android Studio** — [Download here](https://developer.android.com/studio)
- **Android SDK** — installed via Android Studio (API level 34 recommended)
- **Java JDK 17+** — bundled with Android Studio or install separately
- **GOOGLE_WEB_CLIENT_ID** — from [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials

---

### 🔁 Recompile APK (using the `apk-build` branch)

Use this if you have cloned the repo and the `android/` folder already exists in the `apk-build` branch.

**Step 1 — Switch to the apk-build branch:**
```bash
git checkout apk-build
```

**Step 2 — Install dependencies:**
```bash
npm install
```

**Step 3 — Set up `android/local.properties` (one-time setup per machine):**
```bash
cp android/local.properties.example android/local.properties
```

Then open `android/local.properties` and fill in your values:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

> How to find your `sdk.dir`:
> - **Linux/macOS:** Usually `~/Android/Sdk` — run `echo $ANDROID_HOME` to confirm
> - **Windows:** Usually `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk`
> - Or open Android Studio → Settings → Android SDK → copy the SDK path shown there

> How to get `GOOGLE_WEB_CLIENT_ID`:
> - Go to [Google Cloud Console](https://console.cloud.google.com/)
> - Select your project → APIs & Services → Credentials
> - Copy the **Web application** OAuth 2.0 Client ID (ends in `.apps.googleusercontent.com`)

**Step 4 — Set web environment variables** (see [Web Environment Variables](#3-set-up-web-environment-variables) section above)

**Step 5 — Build, sync, and compile:**
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

Your APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 🆕 Fresh APK Compilation (no existing `android/` folder)

Use this if you are on the `main` branch or the `android/` folder does not exist.

**Step 1 — Install dependencies:**
```bash
npm install
```

**Step 2 — Set web environment variables** (see [Web Environment Variables](#3-set-up-web-environment-variables) section above)

**Step 3 — Build the web app:**
```bash
npm run build
```

**Step 4 — Add the Android platform:**
```bash
npx cap add android
```

**Step 5 — Sync web assets into Android:**
```bash
npx cap sync android
```

**Step 6 — Set up `android/local.properties`:**
```bash
cp android/local.properties.example android/local.properties
```

Edit `android/local.properties`:
```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

**Step 7 — Compile the APK:**
```bash
cd android && ./gradlew assembleDebug
```

Your APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 🔑 Updating Environment Variables / Keys

#### Web side — updating API URL, Google Client ID, PostHog, admin path

These are controlled by system environment variables read at build time.

1. Update the values in your terminal (or `~/.bashrc` / `~/.zshrc`):
   ```bash
   export API_URL=https://new-api.com
   export GOOGLE_CLIENT_ID=new-client-id.apps.googleusercontent.com
   export POSTHOG_KEY=phc_newkey
   ```
2. Delete the existing generated file so the build script regenerates it:
   ```bash
   rm src/environments/environment.ts
   ```
3. Rebuild:
   ```bash
   npm run build
   ```

> If you manually created `environment.ts`, just edit it directly — the build script skips generation when the file already exists.

#### APK side — updating Google Client ID or SDK path

These are in `android/local.properties` which is never committed (it's gitignored). Just open the file and edit it directly:

```properties
sdk.dir=/home/YOUR_USERNAME/Android/Sdk
GOOGLE_WEB_CLIENT_ID=YOUR_NEW_CLIENT_ID.apps.googleusercontent.com
```

Then rerun the full build-sync-compile sequence:
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

#### Capacitor config — updating app ID, app name, or web dir

Edit `capacitor.config.ts` in the root of `learnplay/`:

```typescript
const config: CapacitorConfig = {
  appId: 'net.softkit.wazi',       // Android package name
  appName: 'WaziLearn',            // App display name
  webDir: 'dist/learnplay/browser' // Output of npm run build
};
```

After editing, run `npx cap sync android` to apply changes.

---

## 🏗️ Project Structure

```
learnplay/
├── src/
│   ├── app/
│   │   ├── kid/                 # Student learning interface
│   │   ├── parent/              # Parent/guardian dashboard
│   │   ├── teacher/             # Teacher management portal
│   │   ├── services/            # Shared services
│   │   └── shared/              # Shared components
│   ├── environments/            # Environment configurations
│   └── assets/                  # Static assets
├── scripts/                     # Build and utility scripts
└── public/                      # Public assets
```

## 👥 User Roles

### 🎓 Learner (Student)
- Access interactive lessons and quizzes
- Track learning progress
- Complete assignments and activities
- View achievements and points

### 👨‍👩‍👧‍👦 Guardian (Parent)
- Monitor child's learning progress
- Manage multiple children profiles
- View detailed analytics and reports
- Manage subscriptions and payments

### 👨‍🏫 Teacher
- Create and manage lesson content
- Track student progress across classes
- Generate reports and analytics
- Manage curriculum and assignments

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm run watch` | Build in watch mode |
| `npm test` | Run unit tests |
| `npm run scan-avatars` | Scan and organize avatar assets |

## 🌐 Deployment

### Vercel Deployment

1. **Fork/Clone** this repository
2. **Connect** your repository to Vercel
3. **Set Environment Variables** in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all the variables from your environment files
4. **Deploy** - Vercel will automatically build and deploy

### Environment Variables for Vercel

In your Vercel project settings (Project → Settings → Environment Variables), add:

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | ✅ Yes | Your production backend API URL |
| `GOOGLE_CLIENT_ID` | ✅ Yes | Google OAuth Web Client ID for sign-in |
| `ADMIN_LOGIN_PATH` | No | Admin portal route (default: `admin-portal`) |
| `POSTHOG_KEY` | No | PostHog analytics project key |
| `POSTHOG_HOST` | No | PostHog instance URL (default: `https://us.i.posthog.com`) |

> `GOOGLE_CLIENT_ID` (web OAuth) and `GOOGLE_WEB_CLIENT_ID` (in `android/local.properties`) can be the same Web Client ID from Google Cloud Console — both are used for Google sign-in, just in different contexts (browser vs native Android).

## 🔐 Security Notes

- **Never commit** environment files with real credentials to git
- Use **environment variables** in production deployments
- **Rotate API keys** regularly for security
- Keep **sensitive data** in deployment platform only

## 📱 Features

### Learning Management
- ✅ Interactive video lessons
- ✅ Progress tracking and analytics
- ✅ Gamified learning experience
- ✅ Multi-subject curriculum support

### User Management
- ✅ Role-based access control
- ✅ Google OAuth integration
- ✅ Multi-child family accounts
- ✅ Subscription management

### Analytics & Monitoring
- ✅ PostHog analytics integration
- ✅ Real-time progress tracking
- ✅ Comprehensive error monitoring
- ✅ User behavior insights

### Payment Integration
- ✅ M-Pesa payment gateway
- ✅ Subscription tiers
- ✅ Payment history tracking
- ✅ Automated billing

## 🛠️ Technology Stack

- **Frontend**: Angular 20+ with TypeScript
- **Styling**: Tailwind CSS
- **Analytics**: PostHog
- **Authentication**: Google OAuth + Custom JWT
- **Payment**: M-Pesa Integration
- **Deployment**: Vercel
- **Build Tool**: Angular CLI

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you encounter any issues:

1. Check the **environment variables** are correctly set
2. Ensure all **dependencies** are installed
3. Verify **Node.js version** compatibility
4. Check the **browser console** for errors

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Getting Started Checklist

- [ ] Clone the repository
- [ ] Install Node.js and npm
- [ ] Run `npm install`
- [ ] Create environment files with your credentials
- [ ] Run `npm start`
- [ ] Open `http://localhost:4200`
- [ ] Create your first user account
- [ ] Explore the different user roles

## Compress the project
```
powershell Compress-Archive -Path browser/ -DestinationPath wazilearn.zip
```

## Copy the files to html folder
```
cp -rf browser/. /var/www/wazi.softkit.net/html/
```

---

**Happy Learning! 🎉**