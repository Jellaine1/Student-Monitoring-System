<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestBody(): array
{
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        respond(['error' => 'Request body must be valid JSON.'], 400);
    }
    return $body;
}

function requiredString(array $data, string $field, int $maxLength): string
{
    $value = trim((string)($data[$field] ?? ''));
    if ($value === '' || mb_strlen($value) > $maxLength) {
        respond(['error' => ucfirst(str_replace('_', ' ', $field)) . " is required and must be at most {$maxLength} characters."], 422);
    }
    return $value;
}

$config = require __DIR__ . '/config.php';
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    $config['host'],
    $config['port'],
    $config['database']
);

try {
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $resource = $_GET['resource'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    if ($resource === 'dashboard' && $method === 'GET') {
        $date = $_GET['date'] ?? date('Y-m-d');
        $stmt = $pdo->prepare(
            "SELECT
                COUNT(DISTINCT s.id) AS total_students,
                COUNT(DISTINCT CASE WHEN s.status = 'Active' THEN s.id END) AS active_students,
                COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN s.id END) AS present,
                COUNT(DISTINCT CASE WHEN a.status = 'Absent' THEN s.id END) AS absent,
                COUNT(DISTINCT CASE WHEN a.status = 'Late' THEN s.id END) AS late
             FROM students s
             LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = :attendance_date"
        );
        $stmt->execute(['attendance_date' => $date]);
        respond($stmt->fetch());
    }

    if ($resource === 'student-dashboard' && $method === 'GET') {
        $studentId = filter_var($_GET['student_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$studentId || $studentId < 1) {
            respond(['error' => 'A valid student id is required.'], 400);
        }

        $studentStmt = $pdo->prepare(
            'SELECT id, first_name, last_name, email, grade_level, section, status
             FROM students WHERE id = :id'
        );
        $studentStmt->execute(['id' => $studentId]);
        $student = $studentStmt->fetch();
        if (!$student) {
            respond(['error' => 'Student not found.'], 404);
        }

        $summaryStmt = $pdo->prepare(
            "SELECT COUNT(*) AS recorded_days,
                    COALESCE(SUM(status = 'Present'), 0) AS present_days,
                    COALESCE(SUM(status = 'Late'), 0) AS late_days,
                    COALESCE(SUM(status = 'Absent'), 0) AS absent_days
             FROM attendance WHERE student_id = :student_id"
        );
        $summaryStmt->execute(['student_id' => $studentId]);

        $recentStmt = $pdo->prepare(
            'SELECT attendance_date, status
             FROM attendance WHERE student_id = :student_id
             ORDER BY attendance_date DESC LIMIT 5'
        );
        $recentStmt->execute(['student_id' => $studentId]);

        respond([
            'student' => $student,
            'summary' => $summaryStmt->fetch(),
            'recent_attendance' => $recentStmt->fetchAll(),
        ]);
    }

    if ($resource === 'projects') {
        if ($method === 'GET') {
            $studentId = null;
            if (isset($_GET['student_id'])) {
                $studentId = filter_var($_GET['student_id'], FILTER_VALIDATE_INT);
                if (!$studentId || $studentId < 1) {
                    respond(['error' => 'A valid student id is required.'], 400);
                }
                if (!studentExists($pdo, $studentId)) {
                    respond(['error' => 'Student not found.'], 404);
                }
            }

            $sql = 'SELECT p.id, p.title, p.subject, p.description, p.due_date, p.status, p.created_at,
                           pa.student_id, pa.progress, pa.progress_note, pa.updated_at AS assignment_updated_at,
                           s.first_name, s.last_name, s.grade_level, s.section
                    FROM projects p
                    LEFT JOIN project_assignments pa ON pa.project_id = p.id
                    LEFT JOIN students s ON s.id = pa.student_id';
            $parameters = [];
            if ($studentId !== null) {
                $sql .= ' WHERE pa.student_id = :student_id';
                $parameters['student_id'] = $studentId;
            }
            $sql .= ' ORDER BY p.due_date ASC, p.created_at DESC, s.last_name ASC, s.first_name ASC';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($parameters);

            $projects = [];
            while ($row = $stmt->fetch()) {
                $id = (int)$row['id'];
                if (!isset($projects[$id])) {
                    $projects[$id] = [
                        'id' => $id,
                        'title' => $row['title'],
                        'subject' => $row['subject'],
                        'description' => $row['description'],
                        'due_date' => $row['due_date'],
                        'status' => $row['status'],
                        'created_at' => $row['created_at'],
                        'assignments' => [],
                    ];
                }
                if ($row['student_id'] !== null) {
                    $projects[$id]['assignments'][] = [
                        'student_id' => (int)$row['student_id'],
                        'first_name' => $row['first_name'],
                        'last_name' => $row['last_name'],
                        'grade_level' => $row['grade_level'],
                        'section' => $row['section'],
                        'progress' => (int)$row['progress'],
                        'progress_note' => $row['progress_note'],
                        'updated_at' => $row['assignment_updated_at'],
                    ];
                }
            }
            foreach ($projects as &$project) {
                $project['assigned_count'] = count($project['assignments']);
                $project['completed_count'] = count(array_filter(
                    $project['assignments'],
                    static fn(array $assignment): bool => $assignment['progress'] === 100
                ));
            }
            unset($project);

            respond(array_values($projects));
        }

        if ($method === 'POST') {
            $data = requestBody();
            $title = requiredString($data, 'title', 120);
            $subject = requiredString($data, 'subject', 80);
            $description = trim((string)($data['description'] ?? ''));
            $dueDate = (string)($data['due_date'] ?? '');
            $studentIds = $data['student_ids'] ?? null;
            $dueDateObject = DateTime::createFromFormat('!Y-m-d', $dueDate);
            if (!$dueDateObject || $dueDateObject->format('Y-m-d') !== $dueDate) {
                respond(['error' => 'A valid project due date is required.'], 422);
            }
            if (mb_strlen($description) > 5000) {
                respond(['error' => 'Project description must be at most 5000 characters.'], 422);
            }
            if (!is_array($studentIds) || count($studentIds) === 0 || count($studentIds) > 1000) {
                respond(['error' => 'Assign the project to at least one active student.'], 422);
            }

            $studentIds = array_values(array_unique(array_map(
                static function ($value): int {
                    $id = filter_var($value, FILTER_VALIDATE_INT);
                    if (!$id || $id < 1) {
                        respond(['error' => 'Each assigned student must have a valid id.'], 422);
                    }
                    return $id;
                },
                $studentIds
            )));
            $placeholders = implode(',', array_fill(0, count($studentIds), '?'));
            $activeStudentsStmt = $pdo->prepare(
                "SELECT id FROM students WHERE status = 'Active' AND id IN ({$placeholders})"
            );
            $activeStudentsStmt->execute($studentIds);
            if (count($activeStudentsStmt->fetchAll()) !== count($studentIds)) {
                respond(['error' => 'Projects can only be assigned to active students.'], 422);
            }

            $pdo->beginTransaction();
            $projectStmt = $pdo->prepare(
                'INSERT INTO projects (title, subject, description, due_date)
                 VALUES (:title, :subject, :description, :due_date)'
            );
            $projectStmt->execute([
                'title' => $title,
                'subject' => $subject,
                'description' => $description !== '' ? $description : null,
                'due_date' => $dueDate,
            ]);
            $projectId = (int)$pdo->lastInsertId();
            $assignmentStmt = $pdo->prepare(
                'INSERT INTO project_assignments (project_id, student_id) VALUES (:project_id, :student_id)'
            );
            foreach ($studentIds as $studentId) {
                $assignmentStmt->execute(['project_id' => $projectId, 'student_id' => $studentId]);
            }
            $pdo->commit();
            respond(['id' => $projectId, 'message' => 'Project created.'], 201);
        }

        if ($method === 'PUT') {
            $projectId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            $status = requestBody()['status'] ?? '';
            if (!$projectId || $projectId < 1) {
                respond(['error' => 'A valid project id is required.'], 400);
            }
            if (!in_array($status, ['Active', 'Completed', 'Archived'], true)) {
                respond(['error' => 'Project status must be Active, Completed, or Archived.'], 422);
            }
            $stmt = $pdo->prepare('UPDATE projects SET status = :status WHERE id = :id');
            $stmt->execute(['status' => $status, 'id' => $projectId]);
            if ($stmt->rowCount() === 0) {
                $exists = $pdo->prepare('SELECT 1 FROM projects WHERE id = :id');
                $exists->execute(['id' => $projectId]);
                if (!$exists->fetchColumn()) {
                    respond(['error' => 'Project not found.'], 404);
                }
            }
            respond(['message' => 'Project status updated.']);
        }
    }

    if ($resource === 'project-progress' && $method === 'PUT') {
        $data = requestBody();
        $projectId = filter_var($data['project_id'] ?? null, FILTER_VALIDATE_INT);
        $studentId = filter_var($data['student_id'] ?? null, FILTER_VALIDATE_INT);
        $progress = filter_var($data['progress'] ?? null, FILTER_VALIDATE_INT);
        $progressNote = trim((string)($data['progress_note'] ?? ''));
        if (!$projectId || $projectId < 1 || !$studentId || $studentId < 1) {
            respond(['error' => 'A valid project and student id are required.'], 422);
        }
        if ($progress === false || $progress < 0 || $progress > 100) {
            respond(['error' => 'Project progress must be between 0 and 100.'], 422);
        }
        if (mb_strlen($progressNote) > 500) {
            respond(['error' => 'Progress notes must be at most 500 characters.'], 422);
        }
        $stmt = $pdo->prepare(
            "UPDATE project_assignments pa
             INNER JOIN projects p ON p.id = pa.project_id AND p.status = 'Active'
             SET pa.progress = :progress, pa.progress_note = :progress_note
             WHERE pa.project_id = :project_id AND pa.student_id = :student_id"
        );
        $stmt->execute([
            'progress' => $progress,
            'progress_note' => $progressNote !== '' ? $progressNote : null,
            'project_id' => $projectId,
            'student_id' => $studentId,
        ]);
        if ($stmt->rowCount() === 0) {
            $assignmentStmt = $pdo->prepare(
                'SELECT p.status FROM project_assignments pa
                 INNER JOIN projects p ON p.id = pa.project_id
                 WHERE pa.project_id = :project_id AND pa.student_id = :student_id'
            );
            $assignmentStmt->execute(['project_id' => $projectId, 'student_id' => $studentId]);
            $projectStatus = $assignmentStmt->fetchColumn();
            if ($projectStatus === false) {
                respond(['error' => 'Project assignment not found.'], 404);
            }
            if ($projectStatus !== 'Active') {
                respond(['error' => 'Progress can only be updated on active projects.'], 409);
            }
        }
        respond(['message' => 'Project progress updated.']);
    }

    if ($resource === 'students') {
        if ($method === 'GET') {
            $stmt = $pdo->query(
                'SELECT id, first_name, last_name, email, grade_level, section, guardian_name, guardian_phone, status, created_at
                 FROM students ORDER BY last_name, first_name'
            );
            respond($stmt->fetchAll());
        }

        if ($method === 'POST' || $method === 'PUT') {
            $data = requestBody();
            $firstName = requiredString($data, 'first_name', 80);
            $lastName = requiredString($data, 'last_name', 80);
            $gradeLevel = requiredString($data, 'grade_level', 40);
            $section = requiredString($data, 'section', 80);
            $email = trim((string)($data['email'] ?? ''));
            $guardianName = trim((string)($data['guardian_name'] ?? ''));
            $guardianPhone = trim((string)($data['guardian_phone'] ?? ''));
            $status = (string)($data['status'] ?? 'Active');

            if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160)) {
                respond(['error' => 'Enter a valid email address (maximum 160 characters).'], 422);
            }
            if (strlen($guardianName) > 160 || strlen($guardianPhone) > 40) {
                respond(['error' => 'Guardian details exceed the allowed length.'], 422);
            }
            if (!in_array($status, ['Active', 'Inactive'], true)) {
                respond(['error' => 'Status must be Active or Inactive.'], 422);
            }

            $values = [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email !== '' ? $email : null,
                'grade_level' => $gradeLevel,
                'section' => $section,
                'guardian_name' => $guardianName !== '' ? $guardianName : null,
                'guardian_phone' => $guardianPhone !== '' ? $guardianPhone : null,
                'status' => $status,
            ];

            if ($method === 'POST') {
                $stmt = $pdo->prepare(
                    'INSERT INTO students (first_name, last_name, email, grade_level, section, guardian_name, guardian_phone, status)
                     VALUES (:first_name, :last_name, :email, :grade_level, :section, :guardian_name, :guardian_phone, :status)'
                );
                $stmt->execute($values);
                respond(['id' => (int)$pdo->lastInsertId(), 'message' => 'Student created.'], 201);
            }

            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) {
                respond(['error' => 'A valid student id is required.'], 400);
            }
            $values['id'] = $id;
            $stmt = $pdo->prepare(
                'UPDATE students SET first_name = :first_name, last_name = :last_name, email = :email,
                 grade_level = :grade_level, section = :section, guardian_name = :guardian_name,
                 guardian_phone = :guardian_phone, status = :status WHERE id = :id'
            );
            $stmt->execute($values);
            if ($stmt->rowCount() === 0 && !studentExists($pdo, $id)) {
                respond(['error' => 'Student not found.'], 404);
            }
            respond(['message' => 'Student updated.']);
        }

        if ($method === 'DELETE') {
            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) {
                respond(['error' => 'A valid student id is required.'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM students WHERE id = :id');
            $stmt->execute(['id' => $id]);
            if ($stmt->rowCount() === 0) {
                respond(['error' => 'Student not found.'], 404);
            }
            respond(['message' => 'Student deleted.']);
        }
    }

    if ($resource === 'attendance') {
        if ($method === 'GET') {
            $date = $_GET['date'] ?? date('Y-m-d');
            $stmt = $pdo->prepare(
                'SELECT s.id AS student_id, s.first_name, s.last_name, s.grade_level, s.section, s.status AS student_status,
                        a.status AS attendance_status, a.notes
                 FROM students s
                 LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = :attendance_date
                 ORDER BY s.last_name, s.first_name'
            );
            $stmt->execute(['attendance_date' => $date]);
            respond($stmt->fetchAll());
        }

        if ($method === 'POST') {
            $data = requestBody();
            $date = (string)($data['date'] ?? '');
            $records = $data['records'] ?? null;
            $dateObject = DateTime::createFromFormat('!Y-m-d', $date);
            if (!$dateObject || $dateObject->format('Y-m-d') !== $date) {
                respond(['error' => 'A valid attendance date is required.'], 422);
            }
            if (!is_array($records) || count($records) > 1000) {
                respond(['error' => 'Attendance records must be a list of at most 1000 entries.'], 422);
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare(
                'INSERT INTO attendance (student_id, attendance_date, status, notes)
                 VALUES (:student_id, :attendance_date, :status, :notes)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes)'
            );
            foreach ($records as $record) {
                $studentId = filter_var($record['student_id'] ?? null, FILTER_VALIDATE_INT);
                $attendanceStatus = $record['status'] ?? '';
                $notes = trim((string)($record['notes'] ?? ''));
                if (!$studentId || $studentId < 1 || !in_array($attendanceStatus, ['Present', 'Absent', 'Late'], true) || strlen($notes) > 255) {
                    $pdo->rollBack();
                    respond(['error' => 'Each attendance record needs a valid student, status, and note (maximum 255 characters).'], 422);
                }
                $stmt->execute([
                    'student_id' => $studentId,
                    'attendance_date' => $date,
                    'status' => $attendanceStatus,
                    'notes' => $notes !== '' ? $notes : null,
                ]);
            }
            $pdo->commit();
            respond(['message' => 'Attendance saved.', 'saved' => count($records)]);
        }
    }

    if ($resource === 'announcements') {
        if ($method === 'GET') {
            $stmt = $pdo->query(
                'SELECT id, title, body, category, is_pinned, created_at, updated_at
                 FROM announcements
                 ORDER BY is_pinned DESC, created_at DESC'
            );
            respond($stmt->fetchAll());
        }

        if ($method === 'POST' || $method === 'PUT') {
            $data = requestBody();
            $title = requiredString($data, 'title', 160);
            $body = trim((string)($data['body'] ?? ''));
            $category = (string)($data['category'] ?? 'General');
            $isPinned = !empty($data['is_pinned']) ? 1 : 0;

            if ($body === '') {
                respond(['error' => 'Announcement body is required.'], 422);
            }
            if (!in_array($category, ['General', 'Urgent', 'Event'], true)) {
                respond(['error' => 'Category must be General, Urgent, or Event.'], 422);
            }

            $values = [
                'title' => $title,
                'body' => $body,
                'category' => $category,
                'is_pinned' => $isPinned,
            ];

            if ($method === 'POST') {
                $stmt = $pdo->prepare(
                    'INSERT INTO announcements (title, body, category, is_pinned)
                     VALUES (:title, :body, :category, :is_pinned)'
                );
                $stmt->execute($values);
                respond(['id' => (int)$pdo->lastInsertId(), 'message' => 'Announcement published.'], 201);
            }

            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) {
                respond(['error' => 'A valid announcement id is required.'], 400);
            }
            $values['id'] = $id;
            $stmt = $pdo->prepare(
                'UPDATE announcements SET title = :title, body = :body, category = :category,
                 is_pinned = :is_pinned WHERE id = :id'
            );
            $stmt->execute($values);
            if ($stmt->rowCount() === 0 && !announcementExists($pdo, $id)) {
                respond(['error' => 'Announcement not found.'], 404);
            }
            respond(['message' => 'Announcement updated.']);
        }

        if ($method === 'DELETE') {
            $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id || $id < 1) {
                respond(['error' => 'A valid announcement id is required.'], 400);
            }
            $stmt = $pdo->prepare('DELETE FROM announcements WHERE id = :id');
            $stmt->execute(['id' => $id]);
            if ($stmt->rowCount() === 0) {
                respond(['error' => 'Announcement not found.'], 404);
            }
            respond(['message' => 'Announcement deleted.']);
        }
    }

    respond(['error' => 'Endpoint not found.'], 404);
} catch (PDOException $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($error->getMessage());
    respond(['error' => 'The database request failed. Check the XAMPP MySQL service and database setup.'], 500);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($error->getMessage());
    respond(['error' => 'An unexpected server error occurred.'], 500);
}

function studentExists(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM students WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return (bool)$stmt->fetchColumn();
}

function announcementExists(PDO $pdo, int $id): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM announcements WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return (bool)$stmt->fetchColumn();
}
