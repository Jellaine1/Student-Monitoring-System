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
