# DermaSense AI — Authentication & Skin Profile API Specification

**Author / Maintainer:** Shreya (Auth & Profile Service Lane)  
**Base URL:** `http://localhost:8080`  
**Security Scheme:** HTTP Bearer Authentication (JWT Token)  

This document serves as the official API contract for the **Authentication & User / Skin Profile Service**. Teammates developing the Frontend (`/frontend`) and AI Analysis / Recommendation Services (`/ai-service`) should integrate against the endpoints, schemas, and status codes documented below.

---

## Table of Contents
1. [Authentication Overview & Headers](#1-authentication-overview--headers)
2. [Endpoints Reference](#2-endpoints-reference)
   - [POST /api/auth/register](#1-register-new-user)
   - [POST /api/auth/login](#2-user-login)
   - [GET /api/users/me](#3-get-current-user)
   - [GET /api/users/me/profile](#4-get-current-user-skin-profile)
   - [PUT /api/users/me/profile](#5-update-current-user-skin-profile)
3. [Standard Error Responses](#3-standard-error-responses)
4. [Downstream Inter-Service Integration (AI / Recommendation)](#4-downstream-inter-service-integration)

---

## 1. Authentication Overview & Headers

All protected endpoints require the client to supply a valid JSON Web Token (JWT) in the HTTP `Authorization` header:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

- Public endpoints: `/api/auth/register`, `/api/auth/login`
- Protected endpoints: `/api/users/**`

---

## 2. Endpoints Reference

### 1. Register New User
Creates a new user record, hashes the password using BCrypt, automatically provisions an initial empty `SkinProfile`, and returns a JWT token along with basic user details.

- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Access:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `name` | string | Yes | Not blank | User's full name |
| `email` | string | Yes | Valid email format | User's unique email address |
| `password` | string | Yes | Min length 6 | Raw password (will be BCrypt hashed) |

**Sample Request Body:**
```json
{
  "name": "Shreya Sharma",
  "email": "shreya@dermasense.ai",
  "password": "securePassword123"
}
```

#### Success Response (`201 Created`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaHJleWFAZGVybWFzZW5zZS5haSIsImlkIjoiMThmNGVkMzMtOGRiMi00OWI3LWI4N2EtMTgzNDM5NDk3NWMwIiwibmFtZSI6IlNocmV5YSBTaGFybWEiLCJlbWFpbCI6InNocmV5YUBkZXJtYXNlbnNlLmFpIiwiaWF0IjoxNzI3MjU1OTY1LCJleHAiOjE3MjczNDIzNjV9...",
  "user": {
    "id": "18f4ed33-8db2-49b7-b87a-1834394975c0",
    "name": "Shreya Sharma",
    "email": "shreya@dermasense.ai"
  }
}
```

#### Sample cURL
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Shreya Sharma",
    "email": "shreya@dermasense.ai",
    "password": "securePassword123"
  }'
```

---

### 2. User Login
Verifies user credentials (email and password). Returns a JWT token with user summary upon successful verification.

- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Access:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `email` | string | Yes | Valid email format | User's registered email |
| `password` | string | Yes | Not blank | User's password |

**Sample Request Body:**
```json
{
  "email": "shreya@dermasense.ai",
  "password": "securePassword123"
}
```

#### Success Response (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "18f4ed33-8db2-49b7-b87a-1834394975c0",
    "name": "Shreya Sharma",
    "email": "shreya@dermasense.ai"
  }
}
```

#### Sample cURL
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shreya@dermasense.ai",
    "password": "securePassword123"
  }'
```

---

### 3. Get Current User
Retrieves account information of the currently authenticated user identified by the Bearer JWT token.

- **Method:** `GET`
- **Path:** `/api/users/me`
- **Access:** Protected (Requires JWT)
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Success Response (`200 OK`)
```json
{
  "id": "18f4ed33-8db2-49b7-b87a-1834394975c0",
  "name": "Shreya Sharma",
  "email": "shreya@dermasense.ai",
  "createdAt": "2026-09-25T14:30:00Z"
}
```

#### Sample cURL
```bash
curl -X GET http://localhost:8080/api/users/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 4. Get Current User Skin Profile
Retrieves the skin health profile for the authenticated user (skin type, sensitivity, allergies, and skincare goals).

- **Method:** `GET`
- **Path:** `/api/users/me/profile`
- **Access:** Protected (Requires JWT)
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Success Response (`200 OK`)
```json
{
  "id": "a98b76c5-4321-4def-9876-fedcba098765",
  "userId": "18f4ed33-8db2-49b7-b87a-1834394975c0",
  "skinType": "Combination",
  "sensitivity": "Medium",
  "allergies": [
    "Fragrance",
    "Parabens"
  ],
  "goals": [
    "Acne Prevention",
    "Hydration"
  ],
  "updatedAt": "2026-09-25T14:35:10Z"
}
```

#### Sample cURL
```bash
curl -X GET http://localhost:8080/api/users/me/profile \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

### 5. Update Current User Skin Profile
Updates skin type, sensitivity level, allergies, and skincare goals for the authenticated user.

- **Method:** `PUT`
- **Path:** `/api/users/me/profile`
- **Access:** Protected (Requires JWT)
- **Headers:** 
  - `Authorization: Bearer <TOKEN>`
  - `Content-Type: application/json`

#### Request Body
| Field | Type | Description |
|---|---|---|
| `skinType` | string | E.g., `Oily`, `Dry`, `Combination`, `Normal`, `Sensitive` |
| `sensitivity` | string | E.g., `Low`, `Medium`, `High` |
| `allergies` | array[string] | List of known ingredient allergies or irritants |
| `goals` | array[string] | List of skincare goals (e.g., `Anti-aging`, `Hydration`, `Acne control`) |

**Sample Request Body:**
```json
{
  "skinType": "Combination",
  "sensitivity": "Medium",
  "allergies": [
    "Fragrance",
    "Parabens",
    "Salicylic Acid (High Conc.)"
  ],
  "goals": [
    "Reduce Acne",
    "Improve Texture",
    "Hydration"
  ]
}
```

#### Success Response (`200 OK`)
```json
{
  "id": "a98b76c5-4321-4def-9876-fedcba098765",
  "userId": "18f4ed33-8db2-49b7-b87a-1834394975c0",
  "skinType": "Combination",
  "sensitivity": "Medium",
  "allergies": [
    "Fragrance",
    "Parabens",
    "Salicylic Acid (High Conc.)"
  ],
  "goals": [
    "Reduce Acne",
    "Improve Texture",
    "Hydration"
  ],
  "updatedAt": "2026-09-25T14:40:00Z"
}
```

#### Sample cURL
```bash
curl -X PUT http://localhost:8080/api/users/me/profile \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "skinType": "Combination",
    "sensitivity": "Medium",
    "allergies": ["Fragrance", "Parabens"],
    "goals": ["Reduce Acne", "Hydration"]
  }'
```

---

## 3. Standard Error Responses

All error responses across all endpoints follow a uniform JSON structure:

```json
{
  "timestamp": "2026-09-25T14:30:00Z",
  "status": 400,
  "error": "Validation Error",
  "message": "Request validation failed",
  "path": "/api/auth/register",
  "validationErrors": {
    "email": "Email must be a valid email address",
    "password": "Password must be at least 6 characters long"
  }
}
```

### Common HTTP Status Codes
| Status Code | Reason | Typical Cause |
|---|---|---|
| `400 Bad Request` | Validation Failure | Invalid email format, missing required fields, or password < 6 chars |
| `401 Unauthorized` | Authentication Failed | Missing or invalid Bearer token, token expired, or incorrect login credentials |
| `404 Not Found` | Resource Not Found | Requested user or profile record does not exist |
| `409 Conflict` | Duplicate Resource | Registration attempt with an email that is already registered |
| `500 Internal Server Error` | Server Exception | Uncaught runtime error on the backend |

---

## 4. Downstream Inter-Service Integration

Downstream microservices (such as the Python FastAPI AI Analysis service or Recommendation Engine) can verify the authenticity of incoming requests by validating the JWT token.

### JWT Payload Structure
```json
{
  "sub": "shreya@dermasense.ai",
  "id": "18f4ed33-8db2-49b7-b87a-1834394975c0",
  "name": "Shreya Sharma",
  "email": "shreya@dermasense.ai",
  "iat": 1727255965,
  "exp": 1727342365
}
```

### Python (FastAPI / PyJWT) Token Decoding Example:
```python
import jwt

JWT_SECRET = "DermaSenseAiSuperSecretKeyThatIsAtLeast256BitsLongForSecureJwtAuth2026!"

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```
