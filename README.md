# HCM Lite

HCM Lite is a small human capital management app built for the Saylani hackathon. It gives a small organization one place to manage employee accounts, attendance, leave requests, salary summaries, and company announcements.

The app runs in the browser and stores its records on the current device. It is a learning and demonstration project, not a shared HR system for real employee data.

## Features

### People and access

- Set up a company, its administrator, office start time, grace period, leave quota, and working days.
- Create, edit, search, filter, deactivate, and delete employee accounts.
- Give administrators and employees different pages and permissions.
- Change account passwords.

### Attendance and leave

- Check in and check out on configured workdays.
- Review attendance history and see scheduled absences in the administrator view.
- Submit leave requests, check working-day duration, and prevent overlapping pending or approved requests.
- Approve or reject requests with an optional administrator comment.

### Payroll and communication

- Review monthly salary summaries based on the saved employee salary, configured workdays, and attendance records.
- Print the displayed payslip.
- Create, edit, and delete company announcements.
- Ask the Records Helper questions about saved attendance, leave, and employee data.

## User roles

| Role | Permissions |
| --- | --- |
| Administrator | View the dashboard and company records; manage employee accounts and company settings; review attendance; approve or reject leave; view and print employee payslips; manage announcements; change the administrator password. |
| Employee | View their dashboard and attendance; check in and out; submit and review their own leave requests; view and print their own payslip; read announcements; change their password. |

These are application-level route and interface rules. Since the app has no server, they do not provide secure access control against someone who can inspect or change browser data.

## Technology

- React 19 and JavaScript
- Vite 8
- React Router 7
- Plain CSS
- Browser `localStorage`
- Web Crypto API for PBKDF2 password hashing

## Project structure

```text
.
├── index.html                 # Vite HTML entry point and Inter font link
├── .gitignore                 # Excludes dependencies, build output, and env files
├── package.json               # Dependencies and npm scripts
├── package-lock.json          # Locked npm dependency versions
├── vite.config.js             # Vite React plugin configuration
├── vercel.json                # SPA route rewrite for Vercel
└── src/
    ├── App.jsx                # Data loading, routes, and access checks
    ├── main.jsx               # React and browser router entry point
    ├── styles.css             # Design system, responsive layout, and print styles
    ├── components/
    │   ├── AppShell.jsx        # Shared authenticated page layout
    │   ├── Header.jsx          # Page header
    │   ├── RecordsHelper.jsx   # Answers questions from saved browser data
    │   ├── Sidebar.jsx         # Role-based navigation
    │   └── shared.jsx          # Reusable icons, fields, tables, badges, and cards
    ├── pages/
    │   ├── Announcements.jsx  # Company notices
    │   ├── Attendance.jsx     # Check-in/out and attendance history
    │   ├── AuthPages.jsx      # Company setup and sign-in
    │   ├── CompanySettings.jsx # Company policies and admin password
    │   ├── Dashboard.jsx      # Admin and employee dashboards
    │   ├── Employees.jsx      # Employee account management
    │   ├── LeaveRequests.jsx  # Leave applications and decisions
    │   ├── MyAccount.jsx      # Employee password change
    │   └── Payslips.jsx       # Monthly salary summary and printing
    └── utils/
        ├── auth.js            # Password hashing and email check
        ├── constants.js       # Weekday labels
        ├── date.js            # Date helpers
        └── store.js           # Storage keys and attendance/pay calculations
```

## Requirements

- Node.js compatible with the installed Vite version (Node.js 20.19+ or 22.12+)
- npm
- A modern browser with JavaScript and Web Crypto support

## Install and run

From the project folder:

```sh
npm install
npm run dev
```

Vite prints a local development URL in the terminal. Open it in a browser. The app begins with company setup; it does not include demo accounts or preloaded employee records.

## Available commands and checks

The `package.json` scripts are:

```sh
npm run dev      # Start the development server
npm run build    # Create a production build in dist/
npm run preview  # Preview the production build locally
```

There is currently no automated test script in `package.json`. Use `npm run` to list the configured scripts. See [Testing and verification](#testing-and-verification) for the checks completed for this version.

## Data storage and privacy

The app stores JSON values in the browser's `localStorage` under these keys:

| Key | Data |
| --- | --- |
| `hcm_company` | Company name and attendance/leave settings |
| `hcm_users` | Administrator and employee account records |
| `hcm_attendance` | Check-in/out records |
| `hcm_leaves` | Leave applications and decisions |
| `hcm_session` | Current signed-in account reference |
| `hcm_announcements` | Company announcements |

Changes are saved to the current browser profile and device. They are not synced across browsers or shared with other users. Clearing browser storage can remove the records. Passwords are stored as salted PBKDF2 hashes using the Web Crypto API, but the app has no backend, server-side authentication, or protection for the other HR data in browser storage. Do not enter real employee, payroll, or password data.

## Attendance, leave, and payslip rules

### Attendance

- A user can check in once per configured working day. The app blocks check-in on other days.
- Check-out requires a check-in and cannot be earlier than the saved check-in time.
- A check-in later than the configured office start plus the grace period is marked **Late**.
- A checked-out work period under five hours is marked **Half day**. The displayed duration is elapsed time between check-in and check-out.
- On a selected configured workday, the administrator attendance view shows active employees without an attendance record as absent, except employees with approved leave covering that date. Non-working days are not listed as absences.

### Leave

- The start date cannot be after the end date. Both boundary dates must be configured workdays.
- Leave duration counts configured workdays inclusively; non-working dates between the boundaries are excluded.
- Requests cannot overlap another pending or approved request for the same employee. Rejected requests do not block a new request.
- Approval is blocked if the employee's remaining yearly quota is below the request duration. All leave categories use the same quota. The quota year is based on the request start year.
- An optional administrator comment is saved with the decision.

### Payslips

- Daily salary is monthly salary divided by the number of configured workdays in the selected month.
- Each absent day deducts one daily salary; each half day deducts half a daily salary. Net pay is not allowed to fall below zero.
- Present and late records count as full days. In-progress records are excluded from the absent count.
- The current implementation treats configured workdays without attendance in the selected month as absent. It does not model public holidays, payroll cut-off dates, or partial-month employment. Review a payslip against company policy before using it for any real payment.
- Printing uses the browser's print dialog and the included print CSS. Browser and printer settings can affect the final paper or PDF layout.

## First-run demo

1. Start the app with `npm run dev` and open the local URL.
2. On **Create company workspace**, enter a company name, administrator details, office start time, grace period, yearly leave quota, and at least one working day.
3. Sign in using the administrator email and password you just created.
4. From **Employees**, add an employee with a unique email and employee ID, monthly salary, and temporary password.
5. Sign out and sign in with that employee account to try attendance, leave requests, account settings, and the employee dashboard.
6. Sign back in as administrator to review attendance and leave, manage announcements, and open the employee's payslip.

Use fictional demo details only. The app does not provide seeded credentials or a reset-data button.

## Deployment

Create the static production files with:

```sh
npm run build
```

Deploy the generated `dist/` folder to a static hosting service. Because the app uses browser routes, the host must serve `index.html` for application paths. The included `vercel.json` configures a Vercel rewrite. For another host, configure its single-page-app fallback according to that host's instructions. No deployment URL is configured in this repository.

## Known limitations

- Browser storage is device- and profile-specific, can be edited by the browser user, and is not backed up or synchronized.
- The app has no shared backend, server-side access controls, audit trail, or account recovery.
- Public holidays, special closures, time zones per company, and payroll cut-off rules are not modeled.
- Leave quota usage is assigned to the year in which the request starts, including a request that crosses into another year.
- Payslips count unrecorded configured workdays in the selected month as absences, including days that may not have happened yet in the current or a future month.
- The Records Helper uses simple keyword matching and saved local records; it is not an AI service or a substitute for checking source records.

## Testing and verification

- `npm run build` completes successfully with Vite 8.3.5.
- `package.json` defines no automated test or lint script.
- The browser walkthrough was not completed because an isolated browser session was unavailable and the existing Chrome window could not be inspected safely. Build success and utility checks do not prove every user workflow is correct.

## Purpose and learning outcomes

HCM Lite was built as a Saylani hackathon project and a practical React learning exercise. It demonstrates component-based pages, routing, simple role-based views, browser storage, form validation, date and salary calculations, responsive CSS, and a print stylesheet. Its local-only design keeps setup simple while making the limits of browser-based HR data clear.
