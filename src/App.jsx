import { useCallback, useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

async function api(resource, options = {}, query = '') {
  const response = await fetch(`${API_URL}?resource=${resource}${query}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`The API at ${API_URL} did not return JSON. Check the API URL and confirm XAMPP Apache is running.`);
  }
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 10h18" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function initials(student) {
  return `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
}

function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function App() {
  const [page, setPage] = useState('Overview');
  const [role, setRole] = useState('teacher');
  const [students, setStudents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentDashboard, setStudentDashboard] = useState(null);
  const [studentDashboardLoading, setStudentDashboardLoading] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({});
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [projectModal, setProjectModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingProjectId, setSavingProjectId] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studentRows, attendanceRows, dashboard] = await Promise.all([
        api('students'),
        api('attendance', {}, `&date=${encodeURIComponent(date)}`),
        api('dashboard', {}, `&date=${encodeURIComponent(date)}`),
      ]);
      setStudents(studentRows);
      setAttendance(attendanceRows.map((row) => ({ ...row, attendance_status: row.attendance_status || '' })));
      setSummary(dashboard);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadProjects = useCallback(async () => {
    if (role === 'student' && !selectedStudentId) {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    try {
      const query = role === 'student' ? `&student_id=${encodeURIComponent(selectedStudentId)}` : '';
      const projectRows = await api('projects', {}, query);
      if (!Array.isArray(projectRows)) {
        throw new Error('The projects API returned an invalid response.');
      }
      setProjects(projectRows);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProjectsLoading(false);
    }
  }, [role, selectedStudentId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!students.some((student) => String(student.id) === selectedStudentId)) {
      setSelectedStudentId(students.length ? String(students[0].id) : '');
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (role !== 'student' || !selectedStudentId) {
      setStudentDashboard(null);
      setStudentDashboardLoading(false);
      return undefined;
    }

    let current = true;
    setStudentDashboardLoading(true);
    setError('');
    api('student-dashboard', {}, `&student_id=${encodeURIComponent(selectedStudentId)}`)
      .then((result) => {
        if (current) setStudentDashboard(result);
      })
      .catch((requestError) => {
        if (current) setError(requestError.message);
      })
      .finally(() => {
        if (current) setStudentDashboardLoading(false);
      });

    return () => { current = false; };
  }, [role, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((student) =>
      [student.first_name, student.last_name, student.email, student.grade_level, student.section]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    );
  }, [students, search]);

  const filteredAttendance = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attendance.filter((student) =>
      !term || [student.first_name, student.last_name, student.grade_level, student.section]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    );
  }, [attendance, search]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  }

  async function saveStudent(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    try {
      await api('students', {
        method: modal.student ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      }, modal.student ? `&id=${modal.student.id}` : '');
      setModal(null);
      showNotice(modal.student ? 'Student details updated.' : 'Student added to your records.');
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteStudent(student) {
    if (!window.confirm(`Remove ${student.first_name} ${student.last_name} and their attendance records?`)) return;
    try {
      await api('students', { method: 'DELETE' }, `&id=${student.id}`);
      showNotice('Student removed.');
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function updateAttendance(id, status) {
    setAttendance((rows) => rows.map((row) => row.student_id === id ? { ...row, attendance_status: status } : row));
  }

  async function saveAttendance() {
    const records = attendance
      .filter((student) => student.student_status === 'Active' && student.attendance_status)
      .map((student) => ({ student_id: Number(student.student_id), status: student.attendance_status, notes: student.notes || '' }));
    setSavingAttendance(true);
    try {
      await api('attendance', { method: 'POST', body: JSON.stringify({ date, records }) });
      showNotice(`Attendance saved for ${records.length} students.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingAttendance(false);
    }
  }

  async function saveProject(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const values = {
      title: formData.get('title'),
      subject: formData.get('subject'),
      description: formData.get('description'),
      due_date: formData.get('due_date'),
      student_ids: formData.getAll('student_ids').map(Number),
    };
    setSavingProject(true);
    try {
      await api('projects', { method: 'POST', body: JSON.stringify(values) });
      setProjectModal(false);
      showNotice('Project created and assigned to students.');
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingProject(false);
    }
  }

  async function updateProjectStatus(project, status) {
    setError('');
    try {
      await api('projects', {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }, `&id=${project.id}`);
      showNotice(`Project marked ${status.toLowerCase()}.`);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveProjectProgress(projectId, values) {
    setSavingProjectId(projectId);
    setError('');
    try {
      await api('project-progress', {
        method: 'PUT',
        body: JSON.stringify({
          project_id: projectId,
          student_id: Number(selectedStudentId),
          ...values,
        }),
      });
      showNotice('Project progress updated.');
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingProjectId(null);
    }
  }

  const activeCount = Number(summary.active_students || 0);
  const attendanceRecorded = Number(summary.present || 0) + Number(summary.absent || 0) + Number(summary.late || 0);
  const presentRate = attendanceRecorded ? Math.round((Number(summary.present || 0) / attendanceRecorded) * 100) : 0;
  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId);
  const initialsName = role === 'student' && selectedStudent ? initials(selectedStudent) : 'JD';
  const currentStudentAttendance = attendance.find((row) => String(row.student_id) === selectedStudentId);
  const activeProjects = projects.filter((project) => project.status === 'Active').length;
  const projectAssignmentCount = projects.reduce((total, project) => total + project.assignments.length, 0);
  const completedProjectAssignments = projects.reduce(
    (total, project) => total + project.assignments.filter((assignment) => assignment.progress === 100).length,
    0,
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('Overview'); }}>
          <span className="brand-mark"><span /></span>
          <span>classly<span className="brand-dot">.</span></span>
        </a>
        <div className="school-switcher">
          <div className="school-avatar">N</div>
          <div className="school-copy"><strong>Northwood Academy</strong><span>School workspace</span></div>
          <span className="switch-chevron">⌄</span>
        </div>
        <label className="role-switcher">DASHBOARD PREVIEW<select value={role} onChange={(event) => { setRole(event.target.value); setPage('Overview'); setSearch(''); }} aria-label="Dashboard preview role"><option value="teacher">Teacher</option><option value="student">Student</option></select></label>
        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-list" aria-label="Main navigation">
          {(role === 'teacher' ? [
            ['Overview', 'grid'],
            ['Students', 'users'],
            ['Attendance', 'calendar'],
            ['Projects', 'folder'],
            ['Reports', 'chart'],
          ] : [['Overview', 'grid']]).map(([label, icon]) => (
            <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => { setPage(label); setSearch(''); }}>
              <Icon name={icon} size={18} /><span>{label}</span>{label === 'Students' && <span className="nav-count">{students.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">?</div><strong>Need a hand?</strong><span>Visit our help center<br />for quick answers.</span><button onClick={() => showNotice(role === 'teacher' ? 'Help center: add, edit, or archive student records from the Students page.' : 'Ask your teacher if you need help with your student record.')}>Get help <Icon name="arrow" size={14} /></button></div>
          <div className="profile-row"><div className="profile-avatar">{initialsName}</div><div className="profile-copy"><strong>{role === 'student' && selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'Jordan Davis'}</strong><span>{role === 'student' ? 'Student preview' : 'Teacher preview'}</span></div><button className="icon-button profile-more" aria-label="Profile options" onClick={() => showNotice('Dashboard preview only. This project does not have user accounts yet.')}><Icon name="more" size={18} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{page}</strong></div>
          <div className="top-actions">
            {role === 'teacher' && <label className="top-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></label>}
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => showNotice('You’re all caught up!')}><Icon name="bell" size={19} /><i /></button>
            <div className="top-divider" />
            <div className="top-avatar">{initialsName}</div>
          </div>
        </header>

        <div className="content">
          {error && !modal && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}
          {notice && <div className="toast" role="status">{notice}</div>}
          {role === 'student' && page === 'Overview' && (
            <StudentDashboard
              students={students}
              selectedStudentId={selectedStudentId}
              onSelectStudent={setSelectedStudentId}
              dashboard={studentDashboard}
              loading={studentDashboardLoading || loading}
              date={date}
              onChangeDate={setDate}
              attendance={currentStudentAttendance}
              projects={projects}
              projectsLoading={projectsLoading}
              onSaveProjectProgress={saveProjectProgress}
              savingProjectId={savingProjectId}
            />
          )}
          {role === 'teacher' && page === 'Overview' && (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">{dateLabel(date)}</p><h1>Good morning, Jordan <span className="wave">✦</span></h1><p className="heading-subtitle">Here’s what’s happening at your school today.</p></div>
                <button className="button button-primary" onClick={() => setModal({ student: null })}><Icon name="plus" size={17} /> Add new student</button>
              </div>
              <div className="stats-grid">
                <StatCard label="Total students" value={summary.total_students || 0} note={`${activeCount} active students`} icon="users" tint="lavender" />
                <StatCard label="Present today" value={summary.present || 0} note={attendanceRecorded ? `${presentRate}% attendance rate` : 'Attendance not recorded yet'} icon="calendar" tint="mint" />
                <StatCard label="Absent today" value={summary.absent || 0} note="Requires follow-up" icon="chart" tint="peach" />
                <StatCard label="Arrived late" value={summary.late || 0} note={date === today ? 'Today so far' : 'For selected date'} icon="arrow" tint="blue" />
              </div>
              <div className="dashboard-grid">
                <section className="panel attendance-panel">
                  <div className="panel-heading"><div><h2>Attendance overview</h2><p>Daily attendance at a glance</p></div><input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Attendance date" /></div>
                  <div className="attendance-summary">
                    <div className="donut-wrap"><div className="donut" style={{ '--rate': `${presentRate}%` }}><div><strong>{presentRate}%</strong><span>present</span></div></div></div>
                    <div className="legend">
                      <Legend color="green" label="Present" value={summary.present || 0} total={activeCount} />
                      <Legend color="orange" label="Late" value={summary.late || 0} total={activeCount} />
                      <Legend color="red" label="Absent" value={summary.absent || 0} total={activeCount} />
                    </div>
                  </div>
                  <div className="panel-footer"><span><span className="live-dot" /> {attendanceRecorded ? `${attendanceRecorded} of ${activeCount} students recorded` : 'No attendance recorded yet'}</span><button className="text-button" onClick={() => setPage('Attendance')}>Take attendance <Icon name="arrow" size={14} /></button></div>
                </section>
                <section className="panel quick-panel">
                  <div className="panel-heading"><div><h2>Quick actions</h2><p>Common tasks, right at your fingertips</p></div></div>
                  <button className="quick-action" onClick={() => setModal({ student: null })}><span className="quick-icon lavender"><Icon name="users" /></span><span><strong>Add a student</strong><small>Create a new student profile</small></span><Icon name="chevron" size={17} /></button>
                  <button className="quick-action" onClick={() => setPage('Attendance')}><span className="quick-icon mint"><Icon name="calendar" /></span><span><strong>Take attendance</strong><small>Mark today’s attendance</small></span><Icon name="chevron" size={17} /></button>
                  <button className="quick-action" onClick={() => setPage('Projects')}><span className="quick-icon blue"><Icon name="folder" /></span><span><strong>Monitor projects</strong><small>Review assignments and progress</small></span><Icon name="chevron" size={17} /></button>
                  <button className="quick-action" onClick={() => setPage('Reports')}><span className="quick-icon peach"><Icon name="chart" /></span><span><strong>View reports</strong><small>Explore student insights</small></span><Icon name="chevron" size={17} /></button>
                </section>
              </div>
              <section className="panel students-panel">
                <div className="panel-heading"><div><h2>Recently added students</h2><p>Your latest student records</p></div><button className="text-button" onClick={() => setPage('Students')}>View all students <Icon name="arrow" size={14} /></button></div>
                <StudentTable students={[...students].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)} loading={loading} onEdit={(student) => setModal({ student })} onDelete={deleteStudent} compact />
              </section>
            </>
          )}
          {role === 'teacher' && page === 'Students' && (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">YOUR SCHOOL DIRECTORY</p><h1>Students</h1><p className="heading-subtitle">Manage student profiles and guardian information.</p></div>
                <button className="button button-primary" onClick={() => setModal({ student: null })}><Icon name="plus" size={17} /> Add new student</button>
              </div>
              <section className="panel students-panel full-panel">
                <div className="panel-heading"><div><h2>All students <span className="inline-count">{students.length}</span></h2><p>Student directory and enrollment details</p></div><div className="table-actions"><label className="table-search"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." /></label></div></div>
                <StudentTable students={filteredStudents} loading={loading} onEdit={(student) => setModal({ student })} onDelete={deleteStudent} />
              </section>
            </>
          )}
          {role === 'teacher' && page === 'Projects' && (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">PROJECT WORKSPACE</p><h1>Project monitoring</h1><p className="heading-subtitle">Create assignments, set due dates, and follow each student’s progress.</p></div>
                <button className="button button-primary" onClick={() => setProjectModal(true)} disabled={!students.some((student) => student.status === 'Active')}><Icon name="plus" size={17} /> New project</button>
              </div>
              <div className="stats-grid project-stats">
                <StatCard label="Active projects" value={activeProjects} note={`${projects.length} projects total`} icon="folder" tint="lavender" />
                <StatCard label="Student assignments" value={projectAssignmentCount} note="Across all projects" icon="users" tint="blue" />
                <StatCard label="Completed assignments" value={completedProjectAssignments} note={projectAssignmentCount ? `${Math.round((completedProjectAssignments / projectAssignmentCount) * 100)}% of assigned work` : 'No assignments yet'} icon="chart" tint="mint" />
              </div>
              <section className="project-list">
                {projectsLoading ? <div className="panel project-empty">Loading projects…</div> : projects.length === 0
                  ? <div className="panel project-empty"><strong>No projects yet</strong><span>Create your first project and assign it to active students.</span></div>
                  : projects.map((project) => <TeacherProjectCard key={project.id} project={project} onStatusChange={updateProjectStatus} />)}
              </section>
            </>
          )}
          {role === 'teacher' && page === 'Attendance' && (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">{dateLabel(date)}</p><h1>Daily attendance</h1><p className="heading-subtitle">Record who’s present, absent, or running late.</p></div>
                <div className="heading-actions"><input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Attendance date" /><button className="button button-primary" onClick={saveAttendance} disabled={savingAttendance || loading}><span>{savingAttendance ? 'Saving…' : 'Save attendance'}</span></button></div>
              </div>
              <section className="panel attendance-list-panel">
                <div className="attendance-toolbar"><div><h2>Class register</h2><p>{attendance.length} students <span className="toolbar-divider">·</span> {attendance.filter((s) => s.student_status === 'Active').length} active</p></div><label className="table-search"><Icon name="search" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a student..." /></label></div>
                <div className="attendance-table-wrap"><table className="data-table attendance-table"><thead><tr><th>STUDENT</th><th>GRADE & SECTION</th><th>STATUS</th><th>ATTENDANCE</th></tr></thead><tbody>
                  {loading ? <TableMessage message="Loading attendance…" /> : filteredAttendance.length === 0 ? <TableMessage message="No students found. Add students to start taking attendance." /> : filteredAttendance.map((student, index) => (
                    <tr key={student.student_id}><td><div className="student-cell"><div className={`student-avatar avatar-${index % 5}`}>{initials(student)}</div><div><strong>{student.first_name} {student.last_name}</strong><small>{student.student_status === 'Inactive' ? 'Inactive student' : student.grade_level}</small></div></div></td><td>{student.grade_level} <span className="muted">·</span> {student.section}</td><td><span className={`status-pill ${student.student_status === 'Active' ? 'status-active' : 'status-inactive'}`}>{student.student_status}</span></td><td><div className="attendance-options">{['Present', 'Late', 'Absent'].map((status) => <button key={status} disabled={student.student_status !== 'Active'} onClick={() => updateAttendance(student.student_id, status)} className={`attendance-choice ${student.attendance_status === status ? `selected ${status.toLowerCase()}` : ''}`}>{status}</button>)}</div></td></tr>
                  ))}
                </tbody></table></div>
                <div className="panel-footer"><span>{attendance.filter((student) => student.student_status === 'Active' && !student.attendance_status).length} active students still unmarked. Only marked students are saved.</span><button className="button button-primary button-small" onClick={saveAttendance} disabled={savingAttendance || loading || !attendance.some((student) => student.student_status === 'Active' && student.attendance_status)}>{savingAttendance ? 'Saving…' : 'Save attendance'}</button></div>
              </section>
            </>
          )}
          {role === 'teacher' && page === 'Reports' && (
            <>
              <div className="page-heading"><div><p className="eyebrow">SCHOOL INSIGHTS</p><h1>Reports</h1><p className="heading-subtitle">A snapshot of enrollment and attendance for the selected day.</p></div><input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Report date" /></div>
              <div className="stats-grid report-stats"><StatCard label="Enrolled students" value={summary.total_students || 0} note={`${activeCount} currently active`} icon="users" tint="lavender" /><StatCard label="Attendance recorded" value={attendanceRecorded} note={`${activeCount - attendanceRecorded > 0 ? activeCount - attendanceRecorded : 0} not yet marked`} icon="calendar" tint="mint" /><StatCard label="Present rate" value={`${presentRate}%`} note={dateLabel(date)} icon="chart" tint="blue" /><StatCard label="Needs follow-up" value={Number(summary.absent || 0) + Number(summary.late || 0)} note="Absent or late students" icon="arrow" tint="peach" /></div>
              <section className="panel report-panel"><div className="panel-heading"><div><h2>Daily attendance breakdown</h2><p>{dateLabel(date)}</p></div></div><div className="report-bars">{[['Present', Number(summary.present || 0), 'green'], ['Late', Number(summary.late || 0), 'orange'], ['Absent', Number(summary.absent || 0), 'red']].map(([label, value, color]) => <div className="report-bar-row" key={label}><div><span className={`legend-dot ${color}`} />{label}<strong>{value}</strong></div><div className="bar-track"><span className={`bar-fill ${color}`} style={{ width: `${activeCount ? Math.min((value / activeCount) * 100, 100) : 0}%` }} /></div></div>)}</div></section>
            </>
          )}
        </div>
        <footer className="app-footer"><span>© 2026 Classly Education</span><span>Made for better school days <span className="footer-heart">♥</span></span></footer>
      </main>

      {modal && <StudentModal student={modal.student} error={error} onDismissError={() => setError('')} onClose={() => { setModal(null); setError(''); }} onSubmit={saveStudent} />}
      {projectModal && <ProjectModal students={students.filter((student) => student.status === 'Active')} error={error} saving={savingProject} onDismissError={() => setError('')} onClose={() => { setProjectModal(false); setError(''); }} onSubmit={saveProject} />}
    </div>
  );
}

function StudentDashboard({ students, selectedStudentId, onSelectStudent, dashboard, loading, date, onChangeDate, attendance, projects, projectsLoading, onSaveProjectProgress, savingProjectId }) {
  const summary = dashboard?.summary || {};
  const recordedDays = Number(summary.recorded_days || 0);
  const attendanceRate = recordedDays
    ? Math.round(((Number(summary.present_days || 0) + Number(summary.late_days || 0)) / recordedDays) * 100)
    : 0;
  const student = dashboard?.student;

  return (
    <>
      <div className="page-heading student-page-heading">
        <div><p className="eyebrow">{dateLabel(date)}</p><h1>{student ? `Welcome, ${student.first_name}` : 'Student dashboard'} <span className="wave">✦</span></h1><p className="heading-subtitle">Your attendance and school details at a glance.</p></div>
        <div className="student-heading-actions">
          <label className="student-picker">Student profile<select value={selectedStudentId} onChange={(event) => onSelectStudent(event.target.value)} aria-label="Select student profile"><option value="">Select a student</option>{students.map((row) => <option key={row.id} value={row.id}>{row.first_name} {row.last_name}</option>)}</select></label>
          <input className="date-input" type="date" value={date} onChange={(event) => onChangeDate(event.target.value)} aria-label="Attendance date" />
        </div>
      </div>
      <div className="stats-grid student-stats">
        <StatCard label="Attendance rate" value={`${attendanceRate}%`} note={`${recordedDays} recorded school days`} icon="chart" tint="lavender" />
        <StatCard label="Days present" value={summary.present_days || 0} note="On-time attendance" icon="calendar" tint="mint" />
        <StatCard label="Days late" value={summary.late_days || 0} note="Keep working toward on-time arrivals" icon="arrow" tint="blue" />
        <StatCard label="Days absent" value={summary.absent_days || 0} note="Review absences with your teacher" icon="users" tint="peach" />
      </div>
      <div className="dashboard-grid student-dashboard-grid">
        <section className="panel student-profile-panel">
          <div className="panel-heading"><div><h2>My school profile</h2><p>Your current enrollment details</p></div></div>
          {loading ? <p className="student-empty">Loading your profile…</p> : student ? <div className="student-profile-content">
            <div className="student-profile-avatar">{initials(student)}</div>
            <div className="student-profile-details"><strong>{student.first_name} {student.last_name}</strong><span>{student.email || 'No email on file'}</span></div>
            <div className="student-profile-meta"><span>Grade</span><strong>{student.grade_level}</strong></div>
            <div className="student-profile-meta"><span>Section</span><strong>{student.section}</strong></div>
            <div className="student-profile-meta"><span>Enrollment</span><strong className={student.status === 'Active' ? 'profile-status-active' : ''}>{student.status}</strong></div>
          </div> : <p className="student-empty">No student profiles are available yet.</p>}
        </section>
        <section className="panel student-today-panel">
          <div className="panel-heading"><div><h2>Attendance for selected day</h2><p>{dateLabel(date)}</p></div></div>
          {attendance?.attendance_status
            ? <div className="student-today-status"><span className={`status-pill status-${attendance.attendance_status.toLowerCase()}`}><span />{attendance.attendance_status}</span><p>{attendance.attendance_status === 'Present' ? 'Great work showing up today!' : attendance.attendance_status === 'Late' ? 'Try to arrive on time next school day.' : 'Check in with your teacher if you need support.'}</p></div>
            : <div className="student-today-status"><span className="status-pill status-inactive"><span />Not recorded</span><p>Your teacher has not recorded attendance for this day yet.</p></div>}
        </section>
      </div>
      <section className="panel student-history-panel">
        <div className="panel-heading"><div><h2>Recent attendance</h2><p>Your latest recorded school days</p></div><span className="inline-count">Last 5 records</span></div>
        {loading ? <p className="student-empty">Loading attendance history…</p> : dashboard?.recent_attendance?.length ? <div className="student-history-list">
          {dashboard.recent_attendance.map((record) => <div className="student-history-row" key={record.attendance_date}><span className="student-history-date">{dateLabel(record.attendance_date)}</span><span className={`status-pill status-${record.status.toLowerCase()}`}><span />{record.status}</span></div>)}
        </div> : <p className="student-empty">No attendance records yet. Your attendance history will appear here.</p>}
      </section>
      <section className="assigned-projects">
        <div className="section-heading"><div><h2>My projects</h2><p>Assignments and your latest progress</p></div><span className="inline-count">{projects.length}</span></div>
        {projectsLoading ? <div className="panel project-empty">Loading your projects…</div> : projects.length === 0
          ? <div className="panel project-empty"><strong>No projects assigned</strong><span>Your teacher’s project assignments will appear here.</span></div>
          : projects.map((project) => <StudentProjectCard key={project.id} project={project} onSave={onSaveProjectProgress} saving={savingProjectId === project.id} />)}
      </section>
    </>
  );
}

function TeacherProjectCard({ project, onStatusChange }) {
  const dueDate = dateLabel(project.due_date);
  return (
    <article className="panel project-card">
      <div className="project-card-heading">
        <div><p className="eyebrow">{project.subject}</p><h2>{project.title}</h2><p className="project-due-date">Due {dueDate}</p></div>
        <label className="project-status">Status<select value={project.status} onChange={(event) => onStatusChange(project, event.target.value)} aria-label={`Status for ${project.title}`}><option>Active</option><option>Completed</option><option>Archived</option></select></label>
      </div>
      {project.description && <p className="project-description">{project.description}</p>}
      <div className="project-progress-summary">{project.completed_count} of {project.assigned_count} students complete</div>
      <div className="project-assignment-list">
        {project.assignments.map((assignment) => (
          <div className="project-assignment-row" key={assignment.student_id}>
            <div className="project-assignment-person"><strong>{assignment.first_name} {assignment.last_name}</strong><span>{assignment.grade_level} · {assignment.section}</span></div>
            <div className="project-assignment-progress"><div className="project-progress-track"><span style={{ width: `${assignment.progress}%` }} /></div><strong>{assignment.progress}%</strong></div>
            {assignment.progress_note && <p className="project-progress-note">{assignment.progress_note}</p>}
          </div>
        ))}
      </div>
    </article>
  );
}

function StudentProjectCard({ project, onSave, saving }) {
  const assignment = project.assignments[0];
  return (
    <article className="panel project-card student-project-card">
      <div className="project-card-heading">
        <div><p className="eyebrow">{project.subject}</p><h2>{project.title}</h2><p className="project-due-date">Due {dateLabel(project.due_date)}</p></div>
        <span className={`project-status-pill project-status-${project.status.toLowerCase()}`}>{project.status}</span>
      </div>
      {project.description && <p className="project-description">{project.description}</p>}
      <div className="project-progress-summary">Your progress <strong>{assignment.progress}%</strong></div>
      <div className="project-progress-track student-progress-track"><span style={{ width: `${assignment.progress}%` }} /></div>
      {project.status === 'Active'
        ? <ProjectProgressEditor project={project} assignment={assignment} onSave={onSave} saving={saving} />
        : assignment.progress_note && <p className="project-progress-note">{assignment.progress_note}</p>}
    </article>
  );
}

function ProjectProgressEditor({ project, assignment, onSave, saving }) {
  const [progress, setProgress] = useState(assignment.progress);
  const [note, setNote] = useState(assignment.progress_note || '');

  useEffect(() => {
    setProgress(assignment.progress);
    setNote(assignment.progress_note || '');
  }, [assignment.progress, assignment.progress_note]);

  function submitProgress(event) {
    event.preventDefault();
    onSave(project.id, { progress: Number(progress), progress_note: note });
  }

  return (
    <form className="project-progress-form" onSubmit={submitProgress}>
      <label>Update progress <span>{progress}%</span><input type="range" min="0" max="100" step="5" value={progress} onChange={(event) => setProgress(event.target.value)} /></label>
      <label>Progress note<textarea maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share a brief update with your teacher" /></label>
      <button className="button button-primary button-small" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save update'}</button>
    </form>
  );
}

function ProjectModal({ students, error, saving, onDismissError, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <div className="modal-heading"><div><p className="eyebrow">PROJECT WORKSPACE</p><h2 id="project-modal-title">Create a project</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        {error && <div className="alert modal-alert" role="alert"><span>{error}</span><button onClick={onDismissError} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}
        <form onSubmit={onSubmit}>
          <div className="form-grid project-form-grid">
            <label>Project title<input name="title" required maxLength="120" placeholder="e.g. Community garden plan" /></label>
            <label>Subject<input name="subject" required maxLength="80" placeholder="e.g. Science" /></label>
            <label>Due date<input name="due_date" type="date" required defaultValue={today} /></label>
            <label className="project-description-field">Description<textarea name="description" maxLength="5000" placeholder="Describe the project and expected outcome" /></label>
          </div>
          <fieldset className="project-student-fieldset">
            <legend>Assign to active students</legend>
            <div className="project-student-options">{students.map((student) => <label key={student.id}><input type="checkbox" name="student_ids" value={student.id} defaultChecked /> <span>{student.first_name} {student.last_name}<small>{student.grade_level} · {student.section}</small></span></label>)}</div>
          </fieldset>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary" disabled={saving || !students.length}>{saving ? 'Creating…' : 'Create project'}</button></div>
        </form>
      </section>
    </div>
  );
}

function StatCard({ label, value, note, icon, tint }) {
  return <article className="stat-card"><div className={`stat-icon ${tint}`}><Icon name={icon} size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div><span className="stat-decoration" /></article>;
}

function Legend({ color, label, value, total }) {
  return <div className="legend-item"><span className={`legend-dot ${color}`} /><span>{label}</span><strong>{value}</strong><small>/ {total}</small></div>;
}

function TableMessage({ message }) {
  return <tr><td className="table-message" colSpan="5">{message}</td></tr>;
}

function StudentTable({ students, loading, onEdit, onDelete, compact = false }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>STUDENT</th><th>GRADE & SECTION</th>{!compact && <th>GUARDIAN</th>}<th>STATUS</th><th /></tr></thead><tbody>
    {loading ? <TableMessage message="Loading student records…" /> : students.length === 0 ? <TableMessage message="No students yet. Add your first student to get started." /> : students.map((student, index) => (
      <tr key={student.id}><td><div className="student-cell"><div className={`student-avatar avatar-${index % 5}`}>{initials(student)}</div><div><strong>{student.first_name} {student.last_name}</strong><small>{student.email || 'No email provided'}</small></div></div></td><td>{student.grade_level} <span className="muted">·</span> {student.section}</td>{!compact && <td><div className="guardian-cell"><strong>{student.guardian_name || '—'}</strong><small>{student.guardian_phone || ''}</small></div></td>}<td><span className={`status-pill ${student.status === 'Active' ? 'status-active' : 'status-inactive'}`}><span />{student.status}</span></td><td><div className="row-actions"><button className="row-action" onClick={() => onEdit(student)}>Edit</button><button className="row-action delete-action" onClick={() => onDelete(student)}>Delete</button></div></td></tr>
    ))}
  </tbody></table></div>;
}

function StudentModal({ student, error, onDismissError, onClose, onSubmit }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className="modal-heading"><div><p className="eyebrow">{student ? 'STUDENT RECORD' : 'NEW ENROLLMENT'}</p><h2 id="modal-title">{student ? 'Edit student' : 'Add a student'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
    {error && <div className="alert modal-alert" role="alert"><span>{error}</span><button onClick={onDismissError} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}
    <form onSubmit={onSubmit}>
      <div className="form-grid"><label>First name<input name="first_name" required maxLength="80" defaultValue={student?.first_name || ''} /></label><label>Last name<input name="last_name" required maxLength="80" defaultValue={student?.last_name || ''} /></label>
        <label>Email address<input name="email" type="email" maxLength="160" placeholder="student@school.com" defaultValue={student?.email || ''} /></label><label>Grade level<input name="grade_level" required maxLength="40" placeholder="e.g. Grade 8" defaultValue={student?.grade_level || ''} /></label>
        <label>Section<input name="section" required maxLength="80" placeholder="e.g. Maple" defaultValue={student?.section || ''} /></label><label>Guardian name<input name="guardian_name" maxLength="160" defaultValue={student?.guardian_name || ''} /></label>
        <label>Guardian phone<input name="guardian_phone" type="tel" maxLength="40" defaultValue={student?.guardian_phone || ''} /></label><label>Status<select name="status" defaultValue={student?.status || 'Active'}><option>Active</option><option>Inactive</option></select></label>
      </div>
      <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">{student ? 'Save changes' : 'Add student'}</button></div>
    </form>
  </section></div>;
}

export default App;
