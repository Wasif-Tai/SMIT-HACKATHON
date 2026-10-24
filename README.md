# HCM Lite

A small, browser-only HR management demo built with React, Vite, JavaScript and React Router. The project starts with an empty company; create your company and admin account through the setup screen.

## Features

- Company setup, login, logout, persistent sessions and role-specific routes
- Admin employee CRUD, search, department filtering and active/inactive status
- Employee check-in/out, attendance history and admin attendance review
- Leave requests, working-day counts, overlap checks, approvals, comments and yearly balances
- Admin and employee dashboards based on saved records
- Monthly payslip calculations with browser printing
- Company announcements and a keyword-based data helper
- Responsive desktop sidebar and mobile bottom navigation

## Technology

- React 19 and Vite 8
- React Router
- Browser `localStorage` for all app data
- Web Crypto PBKDF2 hashes for saved demo passwords
- Plain CSS; no backend, database, external AI API or chart service

## Install and run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
npm run preview
```

The first page asks for the company name, admin details, office start time, grace period, annual leave quota and workdays. After saving, sign in with the admin email and password. Admins can create employee accounts from **Employees**. New employees sign in with their email and temporary password.

## Data and business rules

Data is saved in these local storage keys: `hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session` and `hcm_announcements`. If stored JSON is malformed, the app uses safe fallback values. Browser data is local to that browser profile and device.

Configured weekdays are the only modeled workdays; public holidays and special closures are not modeled. Leave periods count configured workdays and reject overlaps with pending or approved requests. Requests reduce the yearly balance only after approval. The yearly balance is based on the calendar year containing the request start date.

Attendance becomes **Late** when check-in is later than office start plus the grace period. A checked-out day under five hours is a **Half day**. A complete day over five hours keeps its late/present classification. Incomplete check-ins remain **In progress**. For payslips, configured workdays with no attendance count as absent; incomplete check-ins are excluded until checkout. Holidays are not treated specially. Pay is monthly salary divided by configured working days in the selected month, less absent and half-day deductions.

## Security limits

This is a hackathon demo only. Passwords are salted PBKDF2 hashes, but all code and data run in the user's browser. A local app cannot provide secure production authentication, reliable access control, audit protection, or confidentiality for HR and salary records. Do not use real employee data or production credentials.

## Checks performed

The workspace was empty before implementation. Source files and routes were added. Dependency installation, the Vite build, dev server, browser workflows and responsive checks could not be run because the required npm registry download was unavailable and the network access request was declined. No test results are claimed.

## Deployment

Build with `npm run build`, then deploy the generated `dist/` directory to a static host. BrowserRouter requires the host to serve `index.html` for unknown paths. Vercel can use the included `vercel.json`; on Netlify, add a redirect rule from `/*` to `/index.html` with status 200.

This workspace has not been published. A hosted app link and GitHub repository link still need to be created by deploying and pushing this project from an account with access to those services.
