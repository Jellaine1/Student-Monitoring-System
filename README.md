# Student Monitoring System

A React dashboard with a PHP REST API and MySQL database for XAMPP. It includes a student directory, student profile management, daily attendance, and enrollment/attendance summaries.

## Requirements

- XAMPP with Apache, MySQL, PHP 8.1+ and PDO MySQL enabled
- Node.js 18+ and npm

## Start the database

1. Start **MySQL** in the XAMPP Control Panel. Apache is not needed for the development setup below.
2. Open `http://localhost/phpmyadmin`, import `database/student_monitoring.sql`, and confirm the `student_monitoring` database was created.
3. If your MySQL credentials differ from the XAMPP defaults, configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The default configuration uses `127.0.0.1:3306`, database `student_monitoring`, user `root`, and an empty password.

The API is implemented in `backend/api.php`. It validates student and attendance input, uses prepared statements, and saves each attendance batch in a database transaction.

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

Student deletion also removes that student's attendance history. The delete action asks for confirmation first.

## Deployment note

This starter is intended for local development on a trusted machine. It does not include user accounts or role-based access, so do not expose the API or student records to a school network or the public internet without adding authentication and access controls.
