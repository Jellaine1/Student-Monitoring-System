# Student Monitoring System

A React dashboard with a PHP REST API and MySQL database for XAMPP. It includes teacher tools for the student directory, daily attendance, and project monitoring, plus a student dashboard preview with personal attendance summaries and assigned projects.

## Requirements

- XAMPP with Apache, MySQL, PHP 8.1+ and PDO MySQL enabled
- Node.js 18+ and npm

## Start the database

1. Start **MySQL** in the XAMPP Control Panel. Apache is not needed for the development setup below.
2. Open `http://localhost/phpmyadmin`, import `database/student_monitoring.sql`, and confirm the `student_monitoring` database was created.
3. If your MySQL credentials differ from the XAMPP defaults, configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The default configuration uses `127.0.0.1:3306`, database `student_monitoring`, user `root`, and an empty password.

If the database already exists, import `database/student_monitoring.sql` again to create the project tables. Existing tables are preserved because the schema uses `CREATE TABLE IF NOT EXISTS`.

The API is implemented in `backend/api.php`. It validates student, attendance, and project input, uses prepared statements, and saves attendance batches and new projects with assignments in database transactions.

## Run the React app during development

From the project directory:

```sh
npm install
npm run dev
```

This starts both the Vite frontend and the PHP API using XAMPP's PHP executable at `C:\xampp\php\php.exe`. Open the local URL printed by Vite. Because the PHP API serves directly from this project, it does not need to be copied into `htdocs`. If XAMPP is installed elsewhere, update the PHP executable path in the `dev` script in `package.json`.

## Build for XAMPP

1. To serve the built frontend through XAMPP Apache, copy this project into `C:\xampp\htdocs\student-monitoring`. Set `VITE_API_URL` to the URL path of the PHP API before building. For this setup, create a `.env` file containing:

   ```env
   VITE_API_URL=/student-monitoring/backend/api.php
   ```

2. Run `npm run build`.
3. Copy the generated `dist` contents into `C:\xampp\htdocs\student-monitoring`, alongside the existing `backend` and `database` folders. Keep `backend` in place so the API URL resolves.
4. Open `http://localhost/student-monitoring/`.

## Features

- Add, edit, search, and remove student records.
- Store grade, section, contact email, guardian details, and enrollment status.
- Mark active students present, late, or absent by date; update or revisit saved attendance.
- Review attendance and enrollment summaries in the dashboard and reports.
- Create projects, assign them to active students, set due dates, and monitor per-student progress.
- In the student dashboard preview, update project progress and share notes with the teacher.
- Preview the teacher and student dashboard views with the sidebar role selector. In student preview, choose a student record to view their attendance and assigned projects.

Student deletion also removes that student's attendance history and project assignments. The delete action asks for confirmation first.

## Deployment note

The role selector is for dashboard preview only; it does not authenticate users or enforce role-based access. This starter is intended for local development on a trusted machine. Do not expose the API or student records to a school network or the public internet without adding authentication and access controls.
