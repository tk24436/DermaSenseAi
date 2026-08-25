# DermaSense AI - Frontend Features & System Flow Documentation

Welcome to the technical feature and system flow documentation for **DermaSense AI** (Frontend + Progress Dashboard module).

---

## 1. Executive Summary & Tech Stack

DermaSense AI is an AI-powered skin health tracking platform. The frontend acts as the user interface for authenticating, capturing face photos, receiving AI skin analysis results, executing daily skincare routines, and analyzing historical progress over time.

### Technology Stack:
- **Framework**: React 18 / Vite + TypeScript
- **Styling**: TailwindCSS v4 + Glassmorphism UI (custom dark medical theme, vibrant HSL gradients, backdrop blur effects)
- **Data Visualization**: Chart.js (`chart.js` + `react-chartjs-2`)
- **State Management & Data Fetching**: TanStack React Query v5 + React Context API
- **Icons & UI Utilities**: Lucide Icons + React Router v7

---

## 2. Complete Frontend Feature Breakdown

### 🔐 1. Authentication & Session Management
- **Login Screen (`/login`)**:
  - `POST /api/auth/login` endpoint binding.
  - Client-side email and password validation.
  - Password visibility toggle (`Eye` / `EyeOff` icons).
  - One-click **Demo Credentials Autofill** button for instant evaluator access.
- **Registration Screen (`/register`)**:
  - `POST /api/auth/register` endpoint binding.
  - Full name, email, and minimum length password validation.
  - Automatic redirection to the Skin Profile setup page upon registration.
- **Auth Context & Route Protection (`AuthContext.tsx`)**:
  - Persistent auth state using `localStorage`.
  - `ProtectedRoute` wrapper guarding private routes (`/`, `/upload`, `/progress`, `/profile`).

---

### 👤 2. Skin Profile Setup (`/profile`)
- **API Endpoints**: `GET /api/users/me/profile` & `PUT /api/users/me/profile`
- **Features**:
  1. **Skin Type Selection**: Interactive choice between **Oily**, **Dry**, **Neutral**, and **Combination** skin types with visual indicators.
  2. **Sensitivity Level**: Rating from **Low**, **Medium**, to **High** sensitivity to tailor ingredient aggressiveness.
  3. **Allergy & Ingredient Exclusions**: Dynamic tag manager allowing users to add/remove specific ingredients (e.g., *Salicylic Acid*, *Benzoyl Peroxide*, *Fragrance*).
  4. **Skincare Goals**: Multi-select goal badges (e.g., *Reduce Acne*, *Improve Texture*, *Minimize Pores*, *Anti-Aging*).

---

### 📷 3. AI Image Upload & Scanning Screen (`/upload`)
- **API Endpoint**: `POST /api/ai/analyze`
- **Features**:
  1. **Drag & Drop Uploader**: Drag & drop zone supporting JPG, PNG, and WEBP face photos up to 10MB.
  2. **Demo Sample Photo Preset**: One-click demo sample face photo generator for instant testing without uploading personal files.
  3. **Multi-Stage Animated Scanner**:
     - Live progress percentage counter (0% to 100%).
     - Real-time step status messages (*"Initializing Vision Model..."* ➔ *"Scanning facial topology..."* ➔ *"Detecting acne & pores..."* ➔ *"Calculating subscores..."*).
     - Laser scan overlay animation over the uploaded image preview.
  4. **Error Handling**: Non-happy path error banner with one-click **Try Again** retry triggers.

---

### 📊 4. Skin Health Overview Dashboard (`/`)
- **Features**:
  1. **Overall AI Skin Score Gauge**:
     - Prominent radial gauge displaying `skinScore` (e.g., **82/100**).
     - Color-coded status badge (*Healthy & Vibrant* vs *Requires Attention*).
  2. **AI Recommendation Engine Insights**:
     - Diagnostic explanation text explaining morning, night, and weekly focus areas.
     - Key insight bullet points derived from computer vision analysis.
  3. **Subscore Breakdown**:
     - Grid of metric cards with animated progress bars for 6 subscores:
       - **Acne Control** (90/100)
       - **Pigmentation** (80/100)
       - **Dark Circles** (100/100)
       - **Wrinkles & Fine Lines** (100/100)
       - **Skin Texture** (82/100)
       - **Oil Balance** (100/100)
  4. **Detailed Issue Detection & Regional Pores**:
     - Issue list with confidence percentage and severity badges (**high**, **medium**, **low**, **none**).
     - Regional pore map breakdown covering **Left Cheek**, **Forehead**, **Right Cheek**, and **Jaw**.
  5. **Today's Skincare Routine Checklists**:
     - Interactive checklists for **Morning Steps**, **Night Steps**, and **Weekly Treatments**.
     - Checkbox toggle state updating completion progress dynamically.

---

### 📈 5. Historical Progress Dashboard (`/progress`)
- **API Endpoint**: `GET /api/analytics/progress`
- **Features**:
  1. **Chart.js Interactive Visualization**:
     - High-performance smooth line chart plotting `skinScore` trends over time.
     - Optional **Bar Chart** toggle mode.
     - Superimposed secondary trendlines for **Acne Control** and **Skin Texture**.
  2. **Date Range Filtering**:
     - Quick filter buttons for **7 Days**, **30 Days**, **90 Days**, and **All Time**.
  3. **Progress Highlights**:
     - Total score improvement delta (e.g., **+14 pts Upward Trend**).
     - Current score badge and total AI scan check-in counter.

---

### ⚡ 6. Unified API Architecture (`src/api/client.ts`)
- **Design Pattern**: All mock backend endpoints are contained within `src/api/client.ts`.
- **Backend Swapping Readiness**: Swapping from mock data to real AI & microservice endpoints later touches **only this single file**. No UI components need modification.

---

## 3. End-to-End User Navigation & Flow Diagram

The diagram below visualizes the complete user journey through the DermaSense AI application:

```mermaid
flowchart TD
    Start(["User Opens Application"]) --> CheckAuth{"Is User Logged In?"}

    %% Auth Flow
    CheckAuth -- No --> LoginPage["Login Page (/login)"]
    LoginPage -->|New User?| RegisterPage["Register Page (/register)"]
    RegisterPage -->|Create Account| ProfileSetup["Skin Profile Setup (/profile)"]
    LoginPage -->|Authenticate| Dashboard

    %% Main Application Flow
    CheckAuth -- Yes --> Dashboard["Skin Health Dashboard (/)"]

    Dashboard --> ProfileSetup
    ProfileSetup -->|Save Profile (PUT /api/users/me/profile)| ProfileSaved["Saved to User Session"]

    Dashboard --> ScanPage["AI Image Upload Page (/upload)"]
    ScanPage -->|Select / Drag Photo| PhotoPreview["Photo Preview & Validation"]
    PhotoPreview -->|Click 'Analyze Skin Health'| Processing["Multi-Stage AI Computer Vision Scan"]
    Processing -->|POST /api/ai/analyze| AnalysisComplete["New Scan Recorded"]
    AnalysisComplete --> Dashboard

    Dashboard --> ProgressPage["Historical Progress Dashboard (/progress)"]
    ProgressPage -->|Select Date Range 7d/30d/90d/All| UpdateChart["Chart.js Rerenders Trajectory"]

    %% Dashboard Actions
    Dashboard --> RoutineChecklist["Check Off Daily Routine Items (Morning / Night / Weekly)"]
    Dashboard --> DetailedSubscores["Inspect Regional Pores & Severity Badges"]
```

---

## 4. Summary Table of Endpoints & Data Contracts

| Method | Endpoint | Description | Data Contract / Return Type |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | User Registration | `{ token: string, user: User }` |
| `POST` | `/api/auth/login` | User Login | `{ token: string, user: User }` |
| `GET` | `/api/users/me/profile` | Fetch User Profile | `UserProfile` (skinType, sensitivity, allergies, goals) |
| `PUT` | `/api/users/me/profile` | Update Profile | `UserProfile` |
| `POST` | `/api/ai/analyze` | Upload & Analyze Face Image | `{ analysis: SkinAnalysis, recommendation: Recommendation }` |
| `GET` | `/api/analytics/progress` | Fetch Historical Trajectory | `HistoricalProgressEntry[]` (date, skinScore, subscores) |
