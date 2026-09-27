# DermaSense AI - API Documentation

> **Accuracy Note:** Every endpoint, field name, status code, and error shape in this document
> was sourced directly from the actual source code in this repository.
> Nothing has been invented or inferred from the project report.

---

## 1. Overview

DermaSense AI exposes two independent HTTP back-end services:

| Service | Technology | Default Port | Purpose |
|---|---|---|---|
| Auth and Profile Service | Spring Boot 3 + Spring Security 6 + JWT | 8080 | User registration, login, and skin-profile management |
| AI Analysis Service | Python + FastAPI | 8000 | Skin image analysis using Face++ / ONNX models |

There is no API gateway in the current implementation.
The React frontend communicates with each service directly.

---

## 2. Services

### 2.1 Auth and Profile Service (Spring Boot)

- **Artifact ID:** dermasense-auth-service
- **Package:** com.dermasense.auth
- **Port:** 8080 (configurable via PORT env var)
- **Database:** PostgreSQL (jdbc:postgresql://localhost:5432/dermasense); H2 supported for local testing
- **JWT Library:** io.jsonwebtoken:jjwt 0.12.6
- **Token lifetime:** 24 hours (86400000 ms, configurable via JWT_EXPIRATION_MS)

Controllers implemented:
- AuthController - /api/auth/**
- UserController - /api/users/**

### 2.2 AI Analysis Service (FastAPI)

- **Module:** app.main
- **Port:** 8000
- **Framework:** FastAPI 0.115.x + Uvicorn
- **Max upload size:** 10 MB enforced in application code
- **Persistence:** SQLite (dermasense.db) via SQLAlchemy
- **Object Storage:** AWS S3 / MinIO (non-blocking; analysis still returned if storage fails)

Endpoints implemented:
- GET /health
- POST /api/ai/analyze

OpenAPI/Swagger confirmed live at http://127.0.0.1:8000/docs and http://127.0.0.1:8000/openapi.json

---

## 3. Authentication APIs

**Base URL:** http://localhost:8080
**No JWT required** - these endpoints are explicitly permitAll() in SecurityConfig.java.

---

### POST /api/auth/register

**Purpose:** Create a new user account. Returns a signed JWT on success.
**Authentication required:** No

#### Request

| Header | Value |
|---|---|
| Content-Type | application/json |

**Request body (RegisterRequest):**

```json
{
  "name": "Tarun Kumar",
  "email": "tarun@example.com",
  "password": "secret123"
}
```

| Field | Type | Constraints | Required |
|---|---|---|---|
| name | string | @NotBlank | Yes |
| email | string | @NotBlank, @Email (valid format) | Yes |
| password | string | @NotBlank, minimum 6 characters (@Size(min=6)) | Yes |

#### Response

**201 Created** - AuthResponse

```json
{
  "token": "<signed-JWT-bearer-token>",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tarun Kumar",
    "email": "tarun@example.com"
  }
}
```

| Field | Type | Description |
|---|---|---|
| token | string | Signed JWT; send as Authorization: Bearer token |
| user.id | UUID | System-assigned unique user identifier |
| user.name | string | Registered name |
| user.email | string | Registered email |

#### Error Responses

| Status | error field | Trigger |
|---|---|---|
| 400 Bad Request | Validation Error | Any @NotBlank / @Email / @Size constraint violated |
| 409 Conflict | Conflict | Email already registered (EmailAlreadyExistsException) |
| 500 Internal Server Error | Internal Server Error | Unexpected server error |

**Error body shape (ErrorResponse):**

```json
{
  "timestamp": "2026-09-10T17:25:00.000Z",
  "status": 400,
  "error": "Validation Error",
  "message": "Request validation failed",
  "path": "/api/auth/register",
  "validationErrors": {
    "password": "Password must be at least 6 characters",
    "email": "Invalid email format"
  }
}
```

Note: validationErrors is only present on 400 validation failures. It is omitted (@JsonInclude(NON_NULL)) in all other error responses.

---

### POST /api/auth/login

**Purpose:** Authenticate an existing user. Returns a signed JWT on success.
**Authentication required:** No

#### Request

| Header | Value |
|---|---|
| Content-Type | application/json |

**Request body (LoginRequest):**

```json
{
  "email": "tarun@example.com",
  "password": "secret123"
}
```

| Field | Type | Constraints | Required |
|---|---|---|---|
| email | string | @NotBlank, @Email | Yes |
| password | string | @NotBlank | Yes |

#### Response

**200 OK** - AuthResponse (identical shape to /register response)

```json
{
  "token": "<signed-JWT-bearer-token>",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Tarun Kumar",
    "email": "tarun@example.com"
  }
}
```

#### Error Responses

| Status | error field | Trigger |
|---|---|---|
| 400 Bad Request | Validation Error | Blank email or password |
| 401 Unauthorized | Unauthorized | Wrong credentials (BadCredentialsException) |
| 500 Internal Server Error | Internal Server Error | Unexpected server error |

---

## 4. User and Profile APIs

**Base URL:** http://localhost:8080
**Authentication required:** Yes - all endpoints below require a valid JWT.
**Authorization header format:** Authorization: Bearer token

Spring Security rejects unauthenticated requests with 401 Unauthorized before they reach the controller.

---

### GET /api/users/me

**Purpose:** Retrieve the currently authenticated user account details.
**Authentication required:** Yes (Bearer JWT)

#### Request

| Header | Value |
|---|---|
| Authorization | Bearer jwt-token |

No request body.

#### Response

**200 OK** - UserResponse

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tarun Kumar",
  "email": "tarun@example.com",
  "createdAt": "2026-08-01T10:30:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| id | UUID | Unique user identifier |
| name | string | User full name |
| email | string | User email address |
| createdAt | Instant (ISO-8601 UTC) | Account creation timestamp |

#### Error Responses

| Status | Trigger |
|---|---|
| 401 Unauthorized | Missing or invalid JWT |
| 404 Not Found | User record not found in database |

---

### GET /api/users/me/profile

**Purpose:** Retrieve the authenticated user skin profile (preferences and goals).
**Authentication required:** Yes (Bearer JWT)

#### Request

| Header | Value |
|---|---|
| Authorization | Bearer jwt-token |

No request body.

#### Response

**200 OK** - SkinProfileResponse

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "skinType": "combination",
  "sensitivity": "medium",
  "allergies": ["Salicylic Acid (High Conc.)"],
  "goals": ["Reduce Acne", "Improve Texture"],
  "updatedAt": "2026-09-01T08:00:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| id | UUID | Profile record identifier |
| userId | UUID | References the owning User.id |
| skinType | string | e.g. oily, dry, combination, neutral |
| sensitivity | string | e.g. low, medium, high |
| allergies | string[] | List of ingredient allergies |
| goals | string[] | List of skincare goals |
| updatedAt | Instant (ISO-8601 UTC) | Last profile update timestamp |

#### Error Responses

| Status | Trigger |
|---|---|
| 401 Unauthorized | Missing or invalid JWT |
| 404 Not Found | No skin profile found for the user |

---

### PUT /api/users/me/profile

**Purpose:** Create or update the authenticated user skin profile.
**Authentication required:** Yes (Bearer JWT)

#### Request

| Header | Value |
|---|---|
| Authorization | Bearer jwt-token |
| Content-Type | application/json |

**Request body (SkinProfileRequest):**

```json
{
  "skinType": "combination",
  "sensitivity": "medium",
  "allergies": ["Salicylic Acid (High Conc.)"],
  "goals": ["Reduce Acne", "Improve Texture", "Hydration"]
}
```

| Field | Type | Notes | Required |
|---|---|---|---|
| skinType | string | No server-side enum validation in current code | No |
| sensitivity | string | No server-side enum validation in current code | No |
| allergies | string[] | Defaults to empty list if null | No |
| goals | string[] | Defaults to empty list if null | No |

Note: @Valid is NOT applied to SkinProfileRequest in the controller; all fields are technically optional at the HTTP layer.

#### Response

**200 OK** - SkinProfileResponse (same shape as GET response above)

#### Error Responses

| Status | Trigger |
|---|---|
| 401 Unauthorized | Missing or invalid JWT |
| 404 Not Found | User record not found |
| 500 Internal Server Error | Unexpected server-side failure |

---

## 5. AI Analysis API

**Base URL:** http://127.0.0.1:8000
**Authentication required:** No - the FastAPI service has no authentication middleware in the current implementation.

---

### GET /health

**Purpose:** Liveness probe - confirms the FastAPI service is running.
**Authentication required:** No

#### Response

**200 OK**

```json
{ "status": "ok" }
```

---

### POST /api/ai/analyze

**Purpose:** Accept a face image, run skin analysis via Face++ or local ONNX models, persist the result to the database, and return a structured skin analysis response.

**Authentication required:** No
**Content-Type:** multipart/form-data
**Maximum file size:** 10 MB (enforced in application code)

#### Request

| Header | Value |
|---|---|
| Content-Type | multipart/form-data |

**Form fields:**

| Field name | Type | Required | Description |
|---|---|---|---|
| file | Binary file upload | Yes | Face image. Accepted MIME types: image/jpeg, image/png, image/webp. Maximum 10 MB. |

Note: There is NO user_id field in the current FastAPI endpoint. The main.py code uses a hardcoded "mock-user-id" for the database record until JWT integration is completed.

#### Response

**200 OK** - SkinAnalysisResponse

```json
{
  "detectedIssues": [
    { "issue": "Acne",         "present": true,  "confidence": 0.87, "severity": "high"   },
    { "issue": "Pigmentation", "present": true,  "confidence": 0.65, "severity": "medium" },
    { "issue": "Dark Circles", "present": false, "confidence": 0.12, "severity": "none"   },
    { "issue": "Wrinkles",     "present": false, "confidence": 0.08, "severity": "none"   },
    { "issue": "Blackheads",   "present": false, "confidence": 0.21, "severity": "none"   }
  ],
  "poresDetected": [
    { "region": "Forehead",    "present": true,  "confidence": 0.75, "severity": "medium" },
    { "region": "Left Cheek",  "present": true,  "confidence": 0.88, "severity": "high"   },
    { "region": "Right Cheek", "present": true,  "confidence": 0.82, "severity": "high"   },
    { "region": "Jaw",         "present": false, "confidence": 0.15, "severity": "none"   }
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

**Response field reference (sourced from schemas.py):**

| Field | Type | Constraints | Description |
|---|---|---|---|
| detectedIssues | DetectedIssue[] | - | List of detected skin conditions |
| detectedIssues[].issue | string | - | Condition name (e.g. Acne) |
| detectedIssues[].present | boolean | - | Whether condition is detected |
| detectedIssues[].confidence | float | 0.0 to 1.0 | Model confidence score |
| detectedIssues[].severity | string | none, low, medium, high | Severity level |
| poresDetected | PoreDetected[] | - | Regional facial pore breakdown |
| poresDetected[].region | string | - | Face region (e.g. Forehead) |
| poresDetected[].present | boolean | - | Whether pores are significantly visible |
| poresDetected[].confidence | float | 0.0 to 1.0 | Model confidence score |
| poresDetected[].severity | string | none, low, medium, high | Severity level |
| skinType | string | oily, dry, neutral, combination | Predicted skin type |
| skinScore | integer | 0 to 100 | Calibrated overall skin health score |
| subscores | object | - | Map of subscore names to integer scores (0-100) |
| subscores.acne | integer | 0 to 100 | Acne subscore |
| subscores.pigmentation | integer | 0 to 100 | Pigmentation subscore |
| subscores.darkCircles | integer | 0 to 100 | Dark circles subscore |
| subscores.wrinkles | integer | 0 to 100 | Wrinkles subscore |
| subscores.texture | integer | 0 to 100 | Texture regularity subscore |
| subscores.oilBalance | integer | 0 to 100 | Oil and moisture balance subscore |

#### Error Responses

| Status | Trigger (sourced from main.py) |
|---|---|
| 400 Bad Request | Uploaded file is not an image (content_type does not start with image/) |
| 400 Bad Request | Uploaded file is empty (0 bytes) |
| 413 Request Entity Too Large | Image exceeds 10 MB |
| 422 Unprocessable Entity | FastAPI form validation error (e.g. file field missing) |
| 502 Bad Gateway | Face++ API request failed at runtime (RuntimeError from upstream) |
| 503 Service Unavailable | Analyzer configuration error (e.g. Face++ API keys not set, ValueError) |

---

## 6. Recommendation API

**Not implemented as a separate HTTP endpoint.**

The recommendation engine exists as internal Python modules under ai-service/recommendation/:
- routine_builder.py - deterministic rule-based engine mapping skin type and detected issues to Morning / Night / Weekly product steps
- llm_service.py - Google Gemini LLM call for natural language explanations

These are NOT exposed as HTTP routes. On the frontend, recommendations are computed client-side in client.ts (analyzeSkinImageApi()) based on the SkinAnalysisResponse returned by POST /api/ai/analyze.

There is NO POST /api/recommendations/generate endpoint in the codebase.

---

## 7. Other Implemented APIs

No additional HTTP endpoints were found in the current codebase beyond those documented above.

The following features are NOT implemented as HTTP APIs:

| Feature | Status |
|---|---|
| Analytics / historical progress tracking | Client-side only - stored in browser localStorage |
| Habit tracking (sleep, hydration, stress) | Not built |
| Notification / reminder service | Not built |
| Lifestyle-to-skin correlation engine | Not built |

---

## 8. Error Handling

### Spring Boot - Auth and Profile Service

All errors are handled by GlobalExceptionHandler.java (@RestControllerAdvice) and return an ErrorResponse JSON body.

**ErrorResponse shape:**

```json
{
  "timestamp": "2026-09-10T17:25:00.000Z",
  "status": 409,
  "error": "Conflict",
  "message": "Email already registered",
  "path": "/api/auth/register"
}
```

Note: validationErrors field is omitted from JSON output when null (@JsonInclude(NON_NULL)).

| Exception class | HTTP Status | error value |
|---|---|---|
| MethodArgumentNotValidException | 400 | Validation Error |
| IllegalArgumentException | 400 | Bad Request |
| BadCredentialsException | 401 | Unauthorized |
| InvalidTokenException | 401 | Unauthorized |
| AuthenticationException | 401 | Unauthorized |
| EmailAlreadyExistsException | 409 | Conflict |
| ResourceNotFoundException | 404 | Not Found |
| UsernameNotFoundException | 404 | Not Found |
| Any other Exception | 500 | Internal Server Error |

Unauthenticated requests to protected endpoints (missing or invalid JWT) return 401 via JwtAuthenticationEntryPoint before reaching any controller.

---

### FastAPI - AI Analysis Service

FastAPI returns standard HTTP error responses with a detail string field:

```json
{ "detail": "Uploaded file must be an image (JPEG or PNG)" }
```

For form validation errors (missing required file field), FastAPI returns 422 Unprocessable Entity:

```json
{
  "detail": [
    {
      "loc": ["body", "file"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 9. API Documentation Interfaces

### FastAPI - AI Analysis Service (Port 8000)

| Interface | URL | Status |
|---|---|---|
| Swagger UI | http://127.0.0.1:8000/docs | Live - confirmed |
| ReDoc | http://127.0.0.1:8000/redoc | Live - auto-generated by FastAPI |
| OpenAPI JSON | http://127.0.0.1:8000/openapi.json | Live - confirmed (OpenAPI 3.1.0) |

Paths confirmed in the live OpenAPI spec:
- GET /health
- POST /api/ai/analyze

---

### Spring Boot - Auth and Profile Service (Port 8080)

| Interface | URL | Status |
|---|---|---|
| Swagger UI | http://localhost:8080/swagger-ui/index.html | Available when service is running |
| OpenAPI JSON | http://localhost:8080/v3/api-docs | Available when service is running |

**Dependency added in this session:** org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0 added to pom.xml

**Security config updated in this session:** /swagger-ui/**, /swagger-ui.html, /v3/api-docs, and /v3/api-docs/** added to the permitAll() list in SecurityConfig.java

Note: JDK 17 is required but was not detected on this machine. The Spring Boot service cannot be started or tested without it.

---

## 10. Integration Status and Notes

| Endpoint / Component | Backend Code Status | Frontend Integration |
|---|---|---|
| POST /api/auth/register | Fully implemented in Spring Boot | Frontend uses localStorage mock - does NOT call this endpoint |
| POST /api/auth/login | Fully implemented in Spring Boot | Frontend uses localStorage mock - does NOT call this endpoint |
| GET /api/users/me | Fully implemented in Spring Boot | Not called by the current frontend |
| GET /api/users/me/profile | Fully implemented in Spring Boot | Frontend uses localStorage mock |
| PUT /api/users/me/profile | Fully implemented in Spring Boot | Frontend saves to localStorage only |
| POST /api/ai/analyze | Fully implemented and live on port 8000 | Frontend calls real endpoint directly |
| GET /health | Live | Verified |
| Recommendation Engine | Internal Python - not an HTTP API | Frontend computes recommendations client-side |
| Habit Tracking | Not built | Not built |
| Notification Service | Not built | Not built |
| Lifestyle Correlation Engine | Not built | Not built |
