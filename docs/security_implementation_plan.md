# Security & Rate Limiting Implementation Plan

## Goal
Harden the application against common web vulnerabilities and denial-of-service (DoS) attacks by implementing robust security middleware and rate limiting strategies.

## 1. Rate Limiting Strategy
Protect the API from abuse, brute-force attacks, and spamming.

### Global Rate Limiter
- **Scope**: All API routes (`/api/`).
- **Limit**: 100 requests per 15 minutes per IP.
- **Implementation**: Use `express-rate-limit`.
- **Response**: 429 Too Many Requests.

### Specific Route Limiters
1.  **Authentication (`/api/auth/`)**:
    -   **Strict**: 5 failed attempts per 15 minutes.
    -   **Reason**: Prevent brute-force login/registration attacks.
2.  **Game Updates (`/api/squadGame/updateKills`, `/api/squadGame/updatePlayerStats`)**:
    -   **Moderate**: 60 requests per minute.
    -   **Reason**: Prevent "spam-clicking" updates or script abuse during matches, while allowing legitimate high-paced gameplay updates.
3.  **Public Scoreboard (`/api/squadGame/roomMatchState`)**:
    -   **Open**: 300 requests per minute.
    -   **Reason**: Allow frequent polling by many users, but prevent scraping abuse.

## 2. Security Middleware Upgrades
Implement standard security headers and sanitization.

### Headers (Helmet)
-   **Package**: `helmet`
-   **Features**:
    -   `Content-Security-Policy` (CSP): Restrict sources of scripts, images, etc.
    -   `X-Frame-Options`: Prevent clickjacking.
    -   `Strict-Transport-Security` (HSTS): Enforce HTTPS.
    -   `X-Content-Type-Options`: Prevent MIME sniffing.

### Cross-Origin Resource Sharing (CORS)
-   **Package**: `cors`
-   **Configuration**:
    -   `origin`: Whitelist trusted frontend domains (e.g., `process.env.FRONTEND_URL`).
    -   `methods`: GET, POST, PUT, DELETE.
    -   `credentials`: true (if using cookies/sessions).

### Data Sanitization
1.  **NoSQL Injection**:
    -   **Package**: `express-mongo-sanitize`
    -   **Action**: Remove `$` and `.` from user input to prevent operator injection.
2.  **Cross-Site Scripting (XSS)**:
    -   **Package**: `xss-clean`
    -   **Action**: Sanitize user input (req.body, req.query, req.params) to prevent malicious HTML/scripts.
3.  **Parameter Pollution**:
    -   **Package**: `hpp`
    -   **Action**: Prevent HTTP Parameter Pollution attacks (e.g., passing array for single value fields).

## 3. Implementation Steps

### Phase 1: Dependencies
```bash
npm install express-rate-limit helmet xss-clean express-mongo-sanitize hpp cors
```

### Phase 2: Server Configuration (`server.js`)
```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// 1. Set Security Headers
app.use(helmet());

// 2. Data Sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);
```

### Phase 3: Route-Specific Tuning
-   Create separate limiter instances for Auth and Game routes.
-   Apply them as middleware to specific router paths.

## 4. Verification
-   **Security Headers**: Inspect response headers (Server, X-Powered-By removed; Security headers present).
-   **Intrusion Tests**: Attempt Basic NoSQL injection (`{"email": {"$gt": ""}}`).
-   **Stress Test**: Run a script to exceed rate limits and verify 429 response.
