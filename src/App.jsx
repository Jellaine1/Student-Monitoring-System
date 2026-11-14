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
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    megaphone: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /><path d="M21 10v4" /></>,
    pin: <><path d="M12 17v5" /><path d="M9 10.76V6h6v4.76a2 2 0 0 0 .59 1.42L18 15H6l2.41-2.82A2 2 0 0 0 9 10.76z" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    shield: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z" /><path d="m9.5 12 1.8 1.8 3.2-3.6" /></>,
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
  const [view, setView] = useState(() => (window.location.hash === '#/app' ? 'app' : 'landing'));
  const [announcements, setAnnouncements] = useState([]);

  const loadAnnouncements = useCallback(async () => {
    try {
      setAnnouncements(await api('announcements'));
    } catch {
      setAnnouncements([]);
    }
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  function enterApp() {
    window.location.hash = '#/app';
    setView('app');
  }

  function leaveApp() {
    window.location.hash = '';
    setView('landing');
    loadAnnouncements();
  }

  return view === 'landing'
    ? <Landing announcements={announcements} onEnter={enterApp} />
    : <Dashboard announcements={announcements} onAnnouncementsChange={loadAnnouncements} onExit={leaveApp} />;
}

function Landing({ announcements, onEnter }) {
  const year = new Date().getFullYear();
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="brand" href="#/" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span className="brand-mark"><span /></span>
          <span>classly<span className="brand-dot">.</span></span>
        </a>
        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#announcements">Announcements</a>
          <a href="#about">About</a>
        </nav>
        <button className="button button-primary" onClick={onEnter}>Get started <span aria-hidden="true">→</span></button>
      </header>

      <section className="landing-hero">
        <p className="hero-badge"><span className="live-dot" /> Built for modern schools</p>
        <h1>Attendance and student records,<br /><em>beautifully simple.</em></h1>
        <p className="hero-lead">Classly gives your school one calm place to manage students, take daily attendance, and share announcements — all in real time.</p>
        <div className="hero-cta">
          <button className="button button-primary button-hero" onClick={onEnter}>Get started <span aria-hidden="true">→</span></button>
          <a className="button button-hero-ghost" href="#features">Explore features</a>
        </div>
        <div className="hero-stats">
          <div><strong>Fast</strong><span>Mark a whole class in seconds</span></div>
          <div><strong>Real time</strong><span>Attendance summaries that update instantly</span></div>
          <div><strong>Simple</strong><span>No training required for your staff</span></div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-section-head">
          <p className="eyebrow">WHY CLASsLY</p>
          <h2>Everything your school needs, nothing it doesn’t</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><span className="quick-icon lavender"><Icon name="users" /></span><h3>Student directory</h3><p>Keep every student profile, guardian contact, and enrollment status organized in one place.</p></article>
          <article className="feature-card"><span className="quick-icon mint"><Icon name="calendar" /></span><h3>Daily attendance</h3><p>Mark present, late, or absent in a click, revisit any date, and watch the summaries add up.</p></article>
          <article className="feature-card"><span className="quick-icon peach"><Icon name="chart" /></span><h3>Instant reports</h3><p>See attendance rates and follow-ups at a glance, so no student slips through the cracks.</p></article>
          <article className="feature-card"><span className="quick-icon blue"><Icon name="megaphone" /></span><h3>Announcements</h3><p>Publish news, events, and urgent notices to your school community the moment they matter.</p></article>
          <article className="feature-card"><span className="quick-icon lavender"><Icon name="pin" /></span><h3>Pinned updates</h3><p>Keep the most important message front and center for everyone who visits.</p></article>
          <article className="feature-card"><span className="quick-icon mint"><Icon name="shield" /></span><h3>Safe by design</h3><p>Prepared statements and validated input keep your student records protected.</p></article>
        </div>
      </section>

      <section className="landing-section" id="announcements">
        <div className="landing-section-head">
          <p className="eyebrow">WHAT’S NEW</p>
          <h2>School announcements</h2>
          <p className="landing-section-sub">The latest news and updates from Northwood Academy.</p>
        </div>
        <AnnouncementFeed announcements={announcements} />
      </section>

      <section className="landing-cta" id="about">
        <h2>Ready to make your school day simpler?</h2>
        <p>Open the Classly workspace to manage students, take attendance, and post announcements.</p>
        <button className="button button-primary button-hero" onClick={onEnter}>Open the dashboard <span aria-hidden="true">→</span></button>
      </section>

      <footer className="landing-footer">
        <div><strong>classly<span className="brand-dot">.</span></strong><span>© {year} Classly Education. All rights reserved.</span></div>
        <div><a href="#features">Features</a><a href="#announcements">Announcements</a><a href="#about">About</a></div>
      </footer>
    </div>
  );
}

function Dashboard({ announcements, onAnnouncementsChange, onExit }) {
  const [page, setPage] = useState('Overview');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({});
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
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

  async function saveAnnouncement(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    values.is_pinned = formData.get('is_pinned') ? 1 : 0;
    try {
      await api('announcements', {
        method: modal.announcement ? 'PUT' : 'POST',
        body: JSON.stringify(values),
      }, modal.announcement ? `&id=${modal.announcement.id}` : '');
      setModal(null);
      showNotice(modal.announcement ? 'Announcement updated.' : 'Announcement published.');
      await onAnnouncementsChange();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteAnnouncement(announcement) {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    try {
      await api('announcements', { method: 'DELETE' }, `&id=${announcement.id}`);
      showNotice('Announcement deleted.');
      await onAnnouncementsChange();
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

  const activeCount = Number(summary.active_students || 0);
  const attendanceRecorded = Number(summary.present || 0) + Number(summary.absent || 0) + Number(summary.late || 0);
  const presentRate = attendanceRecorded ? Math.round((Number(summary.present || 0) / attendanceRecorded) * 100) : 0;
  const initialsName = 'JD';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); onExit(); }}>
          <span className="brand-mark"><span /></span>
          <span>classly<span className="brand-dot">.</span></span>
        </a>
        <button className="back-to-site" onClick={onExit}>← Back to website</button>
        <div className="school-switcher">
          <div className="school-avatar">N</div>
          <div className="school-copy"><strong>Northwood Academy</strong><span>School workspace</span></div>
          <span className="switch-chevron">⌄</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="nav-list" aria-label="Main navigation">
          {[
            ['Overview', 'grid'],
            ['Students', 'users'],
            ['Attendance', 'calendar'],
            ['Announcements', 'megaphone'],
            ['Reports', 'chart'],
          ].map(([label, icon]) => (
            <button key={label} className={`nav-item ${page === label ? 'active' : ''}`} onClick={() => { setPage(label); setSearch(''); }}>
              <Icon name={icon} size={18} /><span>{label}</span>{label === 'Students' && <span className="nav-count">{students.length}</span>}{label === 'Announcements' && announcements.length > 0 && <span className="nav-count">{announcements.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">?</div><strong>Need a hand?</strong><span>Visit our help center<br />for quick answers.</span><button onClick={() => showNotice('Tip: post news from the Announcements page, and it appears on the public website automatically.')}>Get help <Icon name="arrow" size={14} /></button></div>
          <div className="profile-row"><div className="profile-avatar">{initialsName}</div><div className="profile-copy"><strong>Jordan Davis</strong><span>School administrator</span></div><button className="icon-button profile-more" aria-label="Profile options" onClick={() => showNotice('Signed in as school administrator.')}><Icon name="more" size={18} /></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><Icon name="chevron" size={14} /><strong>{page}</strong></div>
          <div className="top-actions">
            <label className="top-search"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search anything..." aria-label="Search" /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => { setPage('Announcements'); showNotice('Showing all school announcements.'); }}><Icon name="bell" size={19} /><i /></button>
            <div className="top-divider" />
            <div className="top-avatar">{initialsName}</div>
          </div>
        </header>

        <div className="content">
          {error && !modal && <div className="alert" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}
          {notice && <div className="toast" role="status">{notice}</div>}
          {page === 'Overview' && (
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
                  <button className="quick-action" onClick={() => setModal({ announcement: null })}><span className="quick-icon peach"><Icon name="megaphone" /></span><span><strong>New announcement</strong><small>Share news with the school</small></span><Icon name="chevron" size={17} /></button>
                </section>
              </div>
              <section className="panel students-panel">
                <div className="panel-heading"><div><h2>Recently added students</h2><p>Your latest student records</p></div><button className="text-button" onClick={() => setPage('Students')}>View all students <Icon name="arrow" size={14} /></button></div>
                <StudentTable students={[...students].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)} loading={loading} onEdit={(student) => setModal({ student })} onDelete={deleteStudent} compact />
              </section>
            </>
          )}
          {page === 'Students' && (
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
          {page === 'Attendance' && (
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
          {page === 'Announcements' && (
            <>
              <div className="page-heading">
                <div><p className="eyebrow">SCHOOL UPDATES</p><h1>Announcements</h1><p className="heading-subtitle">Publish news and notices. They appear instantly on the public website.</p></div>
                <button className="button button-primary" onClick={() => setModal({ announcement: null })}><Icon name="plus" size={17} /> New announcement</button>
              </div>
              <section className="panel students-panel full-panel">
                <div className="panel-heading"><div><h2>Published announcements <span className="inline-count">{announcements.length}</span></h2><p>Pinned updates are shown first on the website</p></div></div>
                <AnnouncementAdmin announcements={announcements} onEdit={(announcement) => setModal({ announcement })} onDelete={deleteAnnouncement} />
              </section>
            </>
          )}
          {page === 'Reports' && (
            <>
              <div className="page-heading"><div><p className="eyebrow">SCHOOL INSIGHTS</p><h1>Reports</h1><p className="heading-subtitle">A snapshot of enrollment and attendance for the selected day.</p></div><input className="date-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Report date" /></div>
              <div className="stats-grid report-stats"><StatCard label="Enrolled students" value={summary.total_students || 0} note={`${activeCount} currently active`} icon="users" tint="lavender" /><StatCard label="Attendance recorded" value={attendanceRecorded} note={`${activeCount - attendanceRecorded > 0 ? activeCount - attendanceRecorded : 0} not yet marked`} icon="calendar" tint="mint" /><StatCard label="Present rate" value={`${presentRate}%`} note={dateLabel(date)} icon="chart" tint="blue" /><StatCard label="Needs follow-up" value={Number(summary.absent || 0) + Number(summary.late || 0)} note="Absent or late students" icon="arrow" tint="peach" /></div>
              <section className="panel report-panel"><div className="panel-heading"><div><h2>Daily attendance breakdown</h2><p>{dateLabel(date)}</p></div></div><div className="report-bars">{[['Present', Number(summary.present || 0), 'green'], ['Late', Number(summary.late || 0), 'orange'], ['Absent', Number(summary.absent || 0), 'red']].map(([label, value, color]) => <div className="report-bar-row" key={label}><div><span className={`legend-dot ${color}`} />{label}<strong>{value}</strong></div><div className="bar-track"><span className={`bar-fill ${color}`} style={{ width: `${activeCount ? Math.min((value / activeCount) * 100, 100) : 0}%` }} /></div></div>)}</div></section>
            </>
          )}
        </div>
        <footer className="app-footer"><span>© 2026 Classly Education</span><span>Made for better school days <span className="footer-heart">♥</span></span></footer>
      </main>

      {modal && modal.student !== undefined && <StudentModal student={modal.student} error={error} onDismissError={() => setError('')} onClose={() => { setModal(null); setError(''); }} onSubmit={saveStudent} />}
      {modal && modal.announcement !== undefined && <AnnouncementModal announcement={modal.announcement} error={error} onDismissError={() => setError('')} onClose={() => { setModal(null); setError(''); }} onSubmit={saveAnnouncement} />}
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

function announcementDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function categoryClass(category) {
  return String(category || 'General').toLowerCase();
}

function AnnouncementFeed({ announcements }) {
  if (!announcements.length) {
    return <div className="announcement-empty"><span className="quick-icon lavender"><Icon name="megaphone" /></span><p>No announcements yet. Check back soon for school updates.</p></div>;
  }
  return (
    <div className="announcement-feed">
      {announcements.map((announcement) => (
        <article key={announcement.id} className={`announcement-card ${announcement.is_pinned ? 'is-pinned' : ''}`}>
          <div className="announcement-card-head">
            <span className={`announcement-badge badge-${categoryClass(announcement.category)}`}>{announcement.category}</span>
            {announcement.is_pinned ? <span className="pinned-flag"><Icon name="pin" size={13} /> Pinned</span> : <span className="announcement-date"><Icon name="clock" size={13} /> {announcementDate(announcement.created_at)}</span>}
          </div>
          <h3>{announcement.title}</h3>
          <p>{announcement.body}</p>
          <span className="announcement-date mobile-date">{announcementDate(announcement.created_at)}</span>
        </article>
      ))}
    </div>
  );
}

function AnnouncementAdmin({ announcements, onEdit, onDelete }) {
  if (!announcements.length) {
    return <div className="table-message-block">No announcements yet. Publish your first update to show it on the website.</div>;
  }
  return (
    <div className="announcement-admin-list">
      {announcements.map((announcement) => (
        <article key={announcement.id} className="announcement-admin-row">
          <div className="announcement-admin-main">
            <div className="announcement-card-head">
              <span className={`announcement-badge badge-${categoryClass(announcement.category)}`}>{announcement.category}</span>
              {announcement.is_pinned && <span className="pinned-flag"><Icon name="pin" size={13} /> Pinned</span>}
            </div>
            <h3>{announcement.title}</h3>
            <p>{announcement.body}</p>
            <span className="announcement-date">Posted {announcementDate(announcement.created_at)}</span>
          </div>
          <div className="row-actions announcement-admin-actions">
            <button className="row-action" onClick={() => onEdit(announcement)}>Edit</button>
            <button className="row-action delete-action" onClick={() => onDelete(announcement)}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AnnouncementModal({ announcement, error, onDismissError, onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title">
        <div className="modal-heading"><div><p className="eyebrow">{announcement ? 'EDIT ANNOUNCEMENT' : 'NEW ANNOUNCEMENT'}</p><h2 id="announcement-modal-title">{announcement ? 'Edit announcement' : 'Create an announcement'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        {error && <div className="alert modal-alert" role="alert"><span>{error}</span><button onClick={onDismissError} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}
        <form onSubmit={onSubmit}>
          <div className="form-grid announcement-form">
            <label className="span-2">Title<input name="title" required maxLength="160" placeholder="e.g. Parent-teacher conference next week" defaultValue={announcement?.title || ''} /></label>
            <label className="span-2">Message<textarea name="body" required rows="5" maxLength="2000" placeholder="Write the announcement your school will see…">{announcement?.body || ''}</textarea></label>
            <label>Category<select name="category" defaultValue={announcement?.category || 'General'}><option>General</option><option>Urgent</option><option>Event</option></select></label>
            <label className="pin-toggle"><span>Pin to top</span><input type="checkbox" name="is_pinned" defaultChecked={announcement?.is_pinned ? true : false} /><i className="switch" aria-hidden="true" /></label>
          </div>
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary">{announcement ? 'Save changes' : 'Publish announcement'}</button></div>
        </form>
      </section>
    </div>
  );
}

export default App;
