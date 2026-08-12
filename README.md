# InsurFlow — Monorepo

Full-stack insurance management system migrated from **Node.js + React (Vite)** to **Spring Boot (Java) + Next.js (TypeScript)**.

```
InsurFlow/
├── backend/        ← Spring Boot 3.3 REST API (port 8080)
└── frontend/       ← Next.js 15 App Router UI (port 3000)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.3, Spring Security, Spring Data MongoDB |
| Auth | JWT (stateless, RS256 via `JwtUtil`) |
| Database | MongoDB (same database as the original app) |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| HTTP Client | Axios (with JWT interceptor) |
| File Uploads | Spring Multipart → `FileStorageService` |

---

## Prerequisites

- Java 21+
- Maven 3.9+
- Node.js 20+ & npm
- MongoDB running locally on port 27017 (or set `MONGO_URI`)

---

## Quick Start

### 1. Backend

```bash
cd backend

# (Optional) Copy and configure environment
copy .env.example .env

# Run with default settings (MongoDB on localhost:27017/assurance)
mvn spring-boot:run
```

The backend starts on **http://localhost:8080**.

On first startup it auto-creates the default admin user:
- Email: `admin@insurflow.com`
- Password: `admin123`

> ⚠️ Change `ADMIN_PASSWORD` in production!

### 2. Frontend

```bash
cd frontend

# Install dependencies (already done during migration)
npm install

# Start dev server
npm run dev
```

The frontend starts on **http://localhost:3000**.

---

## Environment Variables

### Backend (`backend/.env` or system env)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/assurance` | MongoDB connection string |
| `JWT_SECRET` | `changeme_super_secret_key_at_least_32_chars_long` | JWT signing key |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `UPLOADS_DIR` | `./uploads` | File upload directory |
| `ADMIN_EMAIL` | `admin@insurflow.com` | Initial admin email |
| `ADMIN_PASSWORD` | `admin123` | Initial admin password |
| `ADMIN_USERNAME` | `admin` | Initial admin username |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api` | Spring Boot API base URL |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | Public | Login |
| `POST` | `/api/auth/register` | Public | Register |
| `GET/PUT/DELETE` | `/api/users/**` | ADMIN | User management |
| `GET/POST/PUT/DELETE` | `/api/clients/**` | Any | Client CRUD (multipart) |
| `GET/POST/PUT/DELETE` | `/api/productions/**` | Any | Production/policy CRUD |
| `GET/POST` | `/api/regelements/**` | Any | Payment records |
| `GET/POST/PUT/DELETE` | `/api/compagnes/**` | Any | Insurance companies |
| `GET/POST/PUT/DELETE` | `/api/natures/**` | Any | Nature lookup |
| `GET/POST/PUT/DELETE` | `/api/categories/**` | Any | Category lookup |
| `GET/POST/PUT/DELETE` | `/api/parametres/**` | Any | Parameter lookup |
| `GET/POST/PUT/DELETE` | `/api/tva/**` | Any | TVA lookup |
| `GET` | `/api/uploads/**` | Any | Static file serving |

---

## Architecture

```
Spring Boot Backend
├── controller/      ← REST controllers (thin, delegate to services)
├── service/         ← Business logic (auth, CRUD, file upload, payment status)
├── repository/      ← Spring Data MongoDB interfaces
├── model/           ← @Document classes (MongoDB collections)
├── dto/             ← Request/response DTOs
├── security/        ← JWT filter, SecurityConfig, UserDetailsService
├── config/          ← CORS, static file serving, DataInitializer (admin seed)
└── exception/       ← GlobalExceptionHandler, ResourceNotFoundException

Next.js Frontend
├── app/
│   ├── (dashboard)/  ← Protected pages (NavBar + auth guard layout)
│   │   ├── clients/  ← List, New, Edit
│   │   ├── operations/  ← List, New
│   │   ├── regelements/[id]/  ← Payment detail
│   │   ├── compagnes/   ← List, New
│   │   ├── credit-history/
│   │   ├── users/
│   │   ├── categories/, natures/, parametres/, tva/
│   ├── login/
│   └── unauthorized/
├── components/
│   ├── NavBar.tsx    ← Sidebar with active route, admin-filtered items
│   └── SimpleList.tsx ← Reusable inline-edit list for lookups
├── context/
│   └── AuthContext.tsx ← JWT login/logout state
├── lib/
│   ├── api.ts        ← Axios instance with Bearer token interceptor
│   └── auth.ts       ← JWT helpers (decode, expiry, role check)
└── types/
    └── index.ts      ← All TypeScript interfaces
```

---

## Key Migration Notes

| Node.js (Old) | Spring Boot (New) |
|--------------|-------------------|
| `bcrypt` password hashing | `BCryptPasswordEncoder` |
| Express JWT middleware | `JwtAuthFilter` (OncePerRequestFilter) |
| Multer `diskStorage` | `FileStorageService` |
| Mongoose `pre('save')` hook | Called in `ReglementService.updateStatus()` |
| Mongoose virtual fields | `@Transient` computed methods on model |
| `clients.if` (reserved keyword) | `@Field("if")` → `identifiantFiscal` |
| `seedAdmin.js` | `DataInitializer` (CommandLineRunner) |
| `res.status(X).json(...)` | `ResponseEntity<>` + `GlobalExceptionHandler` |
