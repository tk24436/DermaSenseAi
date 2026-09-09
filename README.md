# DermaSense AI — Intelligent Skin Health Analysis & Routine Recommendation Platform

> ⚠️ **Notice for Evaluators & Instructors**:
> **Active Development & Live Demo Branch**: Please ensure you are reviewing the **`develop` branch** (`git checkout develop`). All microservices, live AI models, model calibration pipelines, and frontend integrations are actively integrated and verified on `develop`.

---

## 📌 Executive Summary

**DermaSense AI** is an intelligent, full-stack dermatological assessment platform that delivers real-time computer vision skin analysis, personalized active-ingredient matching, and routine recommendations.

The platform integrates deep learning vision models (YOLOv8 & CNNs), cloud vision APIs with automatic edge fallback, secure Spring Boot JWT authentication, and a modern glassmorphic React dashboard.

---

## 🏗️ High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                                DERMASENSE AI PLATFORM                              |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +------------------+
|     FRONTEND     | <---------> |  BACKEND (AUTH)  |             |    AI SERVICE    |
| (React + Vite +  |             | (Spring Boot 3 + |             |  (FastAPI + ONNX |
|  TypeScript +    |             |  Spring Security |             |   + Face++ API + |
|  TailwindCSS)    |             |  + JWT + JPA)    |             |  Gemini LLM)     |
+------------------+             +------------------+             +------------------+
        |                                                                   |
        +------------------------ Direct / Proxy API -----------------------+
```

### Core Architecture Highlights

1. **Dual-Strategy AI Engine**:
   - **Cloud Vision Engine (Face++ Skin API)**: Primary high-resolution clinical skin diagnostic cloud service.
   - **Local Edge Pipeline (ONNX Runtime)**: Sits behind an abstract strategy interface. If cloud connectivity is unavailable or faces are angled/dim (`INVALID_IMAGE_FACE`), the system gracefully and transparently falls back to local neural networks with zero downtime.
2. **Deep Learning Vision Models**:
   - **Acne Detection**: YOLOv8s bounding box detector.
   - **Skin Structure & Pores**: Deep Convolutional Neural Network (CNN) measuring pore density and skin texture irregularity.
   - **Hydration & Elasticity**: Regression neural networks predicting moisture and elasticity indices.
3. **Stateless JWT Security**:
   - Spring Security 6 filter chain with BCrypt password hashing and tamper-proof bearer tokens.
4. **Resilient Cloud Object Storage**:
   - AWS S3 / MinIO image persistence with strict timeouts and non-blocking failure recovery.

---

## 📡 API Contracts & Data Specifications

### 1. AI Vision Service (`FastAPI` — Port `8000`)

#### `POST /api/ai/analyze`
* **Content-Type**: `multipart/form-data`
* **Request Body**:
  - `file`: Image file (`image/jpeg`, `image/png`, `image/webp`, max 10MB).
  - `user_id`: *(Optional)* User identifier string.

* **Response (`200 OK`) — `SkinAnalysisResponse`**:
```json
{
  "detectedIssues": [
    {
      "issue": "Acne",
      "present": true,
      "confidence": 0.87,
      "severity": "high"
    },
    {
      "issue": "Pigmentation",
      "present": true,
      "confidence": 0.65,
      "severity": "medium"
    },
    {
      "issue": "Dark Circles",
      "present": false,
      "confidence": 0.12,
      "severity": "none"
    },
    {
      "issue": "Wrinkles",
      "present": false,
      "confidence": 0.08,
      "severity": "none"
    }
  ],
  "poresDetected": [
    { "region": "Forehead", "present": true, "confidence": 0.75, "severity": "medium" },
    { "region": "Left Cheek", "present": true, "confidence": 0.88, "severity": "high" },
    { "region": "Right Cheek", "present": true, "confidence": 0.82, "severity": "high" },
    { "region": "Jaw", "present": false, "confidence": 0.15, "severity": "none" }
  ],
  "skinType": "combination",
  "skinScore": 82,
  "subscores": {
    "acne": 90,
    "pigmentation": 80,
    "darkCircles": 100,
    "wrinkles": 100,
    "texture": 82,
    "oilBalance": 75
  }
}
```

#### `GET /health`
* **Response**: `{"status": "healthy"}`

---

### 2. Recommendation Engine (`FastAPI / Python`)

#### `POST /api/recommendations/generate`
* **Input**: `SkinAnalysisResponse` + User Profile Preferences.
* **Output**:
```json
{
  "routine": {
    "morning": [
      { "step": "Cleanser", "product": "Foaming Gel Cleanser" },
      { "step": "Treatment", "product": "Vitamin C Brightening Serum" },
      { "step": "Moisturizer", "product": "Lightweight Oil-Free Gel" },
      { "step": "Sunscreen", "product": "Broad Spectrum SPF 50+" }
    ],
    "night": [
      { "step": "Cleanser", "product": "Foaming Gel Cleanser" },
      { "step": "Treatment", "product": "2% Salicylic Acid BHA Serum" },
      { "step": "Moisturizer", "product": "Barrier Support Night Cream" }
    ],
    "weekly": [
      { "step": "Exfoliation", "product": "BHA Liquid Exfoliant (2x/week)" }
    ]
  },
  "aiInsights": "High sebum activity and mild localized hyperpigmentation detected. Salicylic acid and morning antioxidant protection are prioritized."
}
```

---

### 3. Authentication & User Management (`Spring Boot` — Port `8080`)

#### `POST /api/auth/register`
* **Request**: `{"email": "user@example.com", "password": "SecurePassword123", "name": "Tarun"}`
* **Response**: `{"token": "<JWT_BEARER_TOKEN>", "user": { "id": "1", "email": "user@example.com", "name": "Tarun" }}`

#### `POST /api/auth/login`
* **Request**: `{"email": "user@example.com", "password": "SecurePassword123"}`
* **Response**: `{"token": "<JWT_BEARER_TOKEN>", "user": { ... }}`

#### `GET /api/users/me/profile` | `PUT /api/users/me/profile`
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Payload**:
```json
{
  "skinType": "combination",
  "sensitivity": "medium",
  "allergies": ["Salicylic Acid (High Conc.)"],
  "goals": ["Reduce Acne", "Improve Texture", "Hydration"]
}
```

---

## 🗄️ Database Schemas

### 1. AI Analysis Persistence (`skin_analysis` Table — SQLite / PostgreSQL)

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, Indexed | Unique Scan ID |
| `userId` | `VARCHAR(255)` | Indexed, Nullable | Associated user identifier |
| `imageUrl` | `VARCHAR(1024)` | Non-Nullable | S3 / MinIO storage object URL |
| `detectedIssues` | `JSON / JSONB` | Non-Nullable | Array of detected dermatological issues |
| `poresDetected` | `JSON / JSONB` | Non-Nullable | Regional pore breakdown and severity |
| `skinType` | `VARCHAR(50)` | Non-Nullable | Predicted skin type (`oily`, `dry`, etc.) |
| `skinScore` | `INTEGER` | Non-Nullable | Overall calibrated health score (0–100) |
| `subscores` | `JSON / JSONB` | Non-Nullable | Subscore breakdown (`acne`, `texture`, etc.) |
| `createdAt` | `TIMESTAMP` | Default UTC | Scan timestamp |

---

### 2. User & Profile Persistence (`users` & `user_profiles` — PostgreSQL / H2)

```sql
-- Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skin_type VARCHAR(50),
    sensitivity_level VARCHAR(50),
    allergies TEXT[],
    skin_goals TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
* **Node.js**: v18+ & `npm`
* **Python**: v3.10+
* **Java**: JDK 17+ & Maven *(for Spring Boot backend)*

---

### 2. Running the AI Vision Service

```powershell
# Navigate to ai-service directory
cd ai-service

# Install dependencies
pip install -r requirements.txt

# (Optional) Download offline ONNX models from HuggingFace
python download_models.py

# Start the FastAPI Microservice
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation will be live at `http://127.0.0.1:8000/docs`.*

---

### 3. Running the React Frontend

```powershell
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite Dev Server
npm run dev
```
*Frontend will be running at `http://localhost:5173`.*

---

### 4. Running the Spring Boot Backend

```powershell
# Navigate to backend directory
cd backend

# Build and execute Spring Boot application
mvn spring-boot:run
```
*Backend will be running at `http://localhost:8080`.*

---

## 👥 Engineering Team & Module Ownership

| Name | Role | Primary Responsibility |
| :--- | :--- | :--- |
| **Tarun Kumar** | **Lead AI Engineer & System Integrator** | Core Vision Microservice (`ai-service`), Dual-Strategy Pipeline (Face++ API + ONNX Runtime), YOLOv8 inference, Image Preprocessing, S3/MinIO Storage layer, and Full Monorepo Integration. |
| **Tasmiya Khan** | **Frontend Engineering Lead** | React 18 TypeScript SPA (`frontend/`), Glassmorphic UI/UX, Laser Scan Animation, Dashboard, Profile Wizard, and Chart.js historical progress visualizer. |
| **Shreya** | **Backend & Security Lead** | Java Spring Boot 3 microservice (`backend/`), JWT Stateless Authentication filters, BCrypt hashing, User & Skin Profile JPA entities, and REST API controllers. |
| **Tanya Wadhera** | **AI Recommendation Lead** | Skincare Routine Generation Engine (`ai-service/recommendation`), Active ingredient mapping algorithms, and Google Gemini LLM diagnostic integration. |
