# Customer Inquiry Automation — Frontend

A small Vue interface for demonstrating an AI-assisted customer inquiry workflow. Visitors can submit a mock inquiry, while an authenticated admin can review the resulting AI classification, priority, summary, and suggested reply.

This repository contains only the frontend. It expects the companion backend API and PostgreSQL database to be running locally.

## What the application demonstrates

- A public customer inquiry form with validation and explicit storage consent
- A clear warning not to enter real or confidential data into the demo
- AI-assisted inquiry categorisation and prioritisation
- A searchable and filterable admin inbox
- Inquiry details, AI summaries, confidence scores, and reply drafts
- An editable company-context prompt for future AI analyses
- Cookie-based admin authentication without storing credentials or tokens in browser storage

The application does **not** send the drafted reply automatically. A human remains responsible for reviewing the result and deciding what happens next.

## Application flow

```text
Customer submits a demo inquiry
            |
            v
Frontend validates and sends it to the backend API
            |
            v
Backend stores the inquiry and starts AI analysis
            |
            v
Admin signs in and opens the inquiry inbox
            |
            v
Admin reviews the category, priority, summary, and reply draft
```

## Technology

- Vue 3
- Vite
- Native Fetch API
- Plain CSS

Keeping the frontend deliberately small makes the business flow easy to inspect. API communication is isolated in `src/api.js`, while the current MVP interface lives in `src/App.vue`.

## Prerequisites

- Node.js 24.x and npm
- The companion backend running at `http://localhost:3000`
- Docker Desktop for the backend's PostgreSQL container
- A Gemini API key if live AI analysis is required

## Start locally

### 1. Start the backend

From the backend repository:

```powershell
cd D:\clientAutomation
Copy-Item .env.example .env
npm install
npm run db:start
npm run db:deploy
npm run dev
```

Add `GEMINI_API_KEY` to the backend `.env` file to enable live AI analysis. Without it, inquiries can still be stored, but they will not receive a completed AI result.

The backend configuration already allows the default Vite origin:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### 2. Start the frontend

Open a second terminal:

```powershell
cd D:\ClientAutomationClient
Copy-Item .env.example .env
npm install
npm run dev
```

Open the URL printed by Vite, normally [http://localhost:5173](http://localhost:5173).

## Environment configuration

The frontend has one environment variable:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Do not put API keys or other secrets in a `VITE_` variable. Vite embeds these values in the browser bundle. The Gemini key belongs only in the backend `.env` file.

Restart the Vite development server after changing `.env`.

## Demo walkthrough

1. Open the public form and submit a synthetic inquiry. Use an email address such as `alex@example.com`, not real customer data.
2. Select **Admin Access**.
3. Sign in with the demo account:
   - Username: `admin`
   - Password: `demo-admin-password`
4. Open **Inbox**, refresh if analysis is still processing, and select **View** on an inquiry.
5. Review the original message and the AI-generated result.
6. Open **Settings** to change the company-context prompt used for future analyses.
7. Submit the same inquiry again to demonstrate duplicate handling.

When no admin session exists, the initial `GET /api/v1/auth/session` request returns `401 Unauthorized`. This is expected: the frontend interprets it as a signed-out state and continues to show the public page.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally for inspection |

## Project structure

```text
ClientAutomationClient/
├── src/
│   ├── App.vue       # Screens, state, validation, and user interactions
│   ├── api.js        # Backend API client and CSRF-token handling
│   ├── main.js       # Vue application bootstrap
│   └── styles.css    # Application styles
├── .env.example      # Safe local frontend configuration
├── index.html
├── package.json
└── vite.config.js
```

## Authentication notes

- The backend creates a revocable, signed, HttpOnly session cookie.
- Requests include cookies through `credentials: 'include'`.
- State-changing admin requests also send the backend-issued CSRF token.
- The CSRF token is held only in memory and is cleared on logout.
- A page refresh restores the session from the backend when the cookie remains valid.

## Build verification

```powershell
npm run build
npm run preview
```

The generated `dist/` directory is a static site. In a deployment, configure the hosting environment with the public backend URL before building and configure that same frontend origin in the backend's CORS allowlist.
