import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import {
  apiFetch,
  clearSession,
  getBrowserLocation,
  readSession,
  saveSession,
} from './api';

const roleLabels = {
  student: 'Student',
  warden: 'Warden',
  admin: 'Admin',
};

const statusClassMap = {
  pending: 'status-badge warning',
  approved: 'status-badge success',
  rejected: 'status-badge danger',
  ongoing: 'status-badge info',
  completed: 'status-badge neutral',
  overdue: 'status-badge danger',
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function App() {
  const [session, setSession] = useState(() => readSession());
  const [studentOutings, setStudentOutings] = useState([]);

  async function loadOutings() {
    if (!session || session.role !== 'student') {
      setStudentOutings([]);
      return;
    }

    try {
      // MongoDB/backend is the single source of truth for outing status.
      const data = await apiFetch('/api/outings/mine', { method: 'GET' });
      setStudentOutings(data || []);
    } catch (err) {
      console.error('Failed to load outings from backend:', err.message);
    }
  }

  useEffect(() => {
    let intervalId;

    const refreshOnFocus = () => loadOutings();

    loadOutings();

    if (session?.role === 'student') {
      // Keep the student dashboard synchronized when a warden approves/rejects.
      intervalId = window.setInterval(loadOutings, 5000);
      window.addEventListener('focus', refreshOnFocus);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [session]);

  return (
    <BrowserRouter>
      <AppLayout
        session={session}
        setSession={setSession}
        studentOutings={studentOutings}
        setStudentOutings={setStudentOutings}
        refreshOutings={loadOutings}
      />
    </BrowserRouter>
  );
}

function AppLayout({ session, setSession, studentOutings, setStudentOutings, refreshOutings }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    setSession(null);
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">SH</div>
          <div>
            <div className="brand-name">Smart Hostel</div>
            <div className="brand-subtitle">Outing Management</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          {session?.role === 'student' && (
            <>
              <Link to="/student-dashboard">Dashboard</Link>
              <Link to="/student-request">Request Outing</Link>
              <Link to="/student-outings">My Outings</Link>
            </>
          )}
          {session?.role === 'warden' || session?.role === 'admin' ? (
            <Link to="/warden-dashboard">Warden Dashboard</Link>
          ) : null}
        </nav>

        {session ? (
          <div className="nav-user-card">
            <div>
              <strong>{session.user?.name || 'User'}</strong>
              <small>{roleLabels[session.role] || 'Account'}</small>
            </div>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="nav-actions">
            <Link to="/student-login" className="primary-button small-button">
              Student Login
            </Link>
            <Link to="/warden-login" className="secondary-button small-button">
              Warden Login
            </Link>
          </div>
        )}
      </header>

      <main className="page-body">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/student-login"
            element={
              <StudentAuthPage
                role="student"
                mode="login"
                session={session}
                setSession={setSession}
              />
            }
          />
          <Route
            path="/student-signup"
            element={
              <StudentAuthPage
                role="student"
                mode="signup"
                session={session}
                setSession={setSession}
              />
            }
          />

          <Route
            path="/warden-login"
            element={
              <WardenAuthPage
                role="warden"
                mode="login"
                session={session}
                setSession={setSession}
              />
            }
          />
          <Route
            path="/warden-signup"
            element={
              <WardenAuthPage
                role="warden"
                mode="signup"
                session={session}
                setSession={setSession}
              />
            }
          />

          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute session={session} requiredRole="student">
                <StudentDashboard session={session} studentOutings={studentOutings} refreshOutings={refreshOutings} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-request"
            element={
              <ProtectedRoute session={session} requiredRole="student">
                <StudentRequestPage
                  session={session}
                  studentOutings={studentOutings}
                  setStudentOutings={setStudentOutings}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student-outings"
            element={
              <ProtectedRoute session={session} requiredRole="student">
                <StudentOutingsPage studentOutings={studentOutings} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/warden-dashboard"
            element={
              <ProtectedRoute session={session} requiredRole="warden">
                <WardenDashboard session={session} />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute({ session, requiredRole, children }) {
  if (!session || (session.role !== requiredRole && session.role !== 'admin')) {
    return <Navigate to={requiredRole === 'student' ? '/student-login' : '/warden-login'} replace />;
  }

  return children;
}

function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Smart Hostel Outing Management</span>
          <h1>Real-time location monitoring for safer hostel outings.</h1>
          <p>
            A modern system built for students and wardens to approve movement requests,
            track active outings, and respond quickly to emergencies.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/student-login">
              Student Login
            </Link>
            <Link className="secondary-button" to="/warden-login">
              Warden Login
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="mini-card">
            <span>Live status</span>
            <strong>18 active checks</strong>
          </div>
          <div className="mini-card accent">
            <span>Alerts</span>
            <strong>02 pending</strong>
          </div>
          <div className="mini-card">
            <span>Today</span>
            <strong>12 approved outings</strong>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <h3>Smart outing requests</h3>
          <p>Students can request permission with destination, purpose, and expected return time.</p>
        </div>
        <div className="feature-card">
          <h3>Approval workflow</h3>
          <p>Wardens review and approve or reject requests using a clear decision workflow.</p>
        </div>
        <div className="feature-card">
          <h3>Live monitoring</h3>
          <p>Active outings can be tracked with GPS updates and real-time location visibility.</p>
        </div>
        <div className="feature-card">
          <h3>Emergency response</h3>
          <p>Emergency alerts and late-return checks keep staff informed when response is needed.</p>
        </div>
      </section>

      <section className="info-panel">
        <h2>Designed for secure hostel operations</h2>
        <div className="info-row">
          <div>
            <strong>Student-facing</strong>
            <p>Request outings, track approval status, and view personal outing history.</p>
          </div>
          <div>
            <strong>Warden-facing</strong>
            <p>Review pending requests, monitor active students, and handle SOS or late alerts.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 Smart Hostel Outing Management System</span>
      </footer>
    </div>
  );
}

function StudentAuthPage({ role, mode, session, setSession }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    rollNumber: '',
    email: '',
    password: '',
    phone: '',
    hostelBlock: '',
    roomNumber: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (session && session.role === 'student') {
      navigate('/student-dashboard');
    }
  }, [navigate, session]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignup
        ? '/api/auth/student/signup'
        : '/api/auth/student/login';

      const payload = isSignup
        ? {
            ...form,
            emergencyContact: {
              name: form.emergencyContact || 'Guardian',
              phone: form.emergencyPhone || form.phone,
              relation: 'Guardian',
            },
          }
        : {
            email: form.email,
            password: form.password,
          };

      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const account = data.student || data.warden;
      const nextSession = {
        token: data.token,
        role,
        user: account,
      };

      saveSession(nextSession);
      setSession(nextSession);
      navigate(role === 'student' ? '/student-dashboard' : '/warden-dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-panel large">
        <div className="panel-header">
          <span className="eyebrow">Student access</span>
          <h2>{isSignup ? 'Create student account' : 'Student login'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && (
            <>
              <div className="form-row split">
                <label>
                  Full name
                  <input name="name" value={form.name} onChange={handleChange} required />
                </label>
                <label>
                  Roll number
                  <input name="rollNumber" value={form.rollNumber} onChange={handleChange} required />
                </label>
              </div>

              <div className="form-row split">
                <label>
                  Phone
                  <input name="phone" value={form.phone} onChange={handleChange} required />
                </label>
                <label>
                  Hostel block
                  <input name="hostelBlock" value={form.hostelBlock} onChange={handleChange} required />
                </label>
              </div>

              <div className="form-row split">
                <label>
                  Room number
                  <input name="roomNumber" value={form.roomNumber} onChange={handleChange} required />
                </label>
                <label>
                  Emergency contact name
                  <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} required />
                </label>
              </div>

              <div className="form-row split">
                <label>
                  Emergency contact phone
                  <input name="emergencyPhone" value={form.emergencyPhone} onChange={handleChange} required />
                </label>
              </div>
            </>
          )}

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button type="button" className="link-button" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          {isSignup ? (
            <span>
              Already have an account? <Link to="/student-login">Login here</Link>
            </span>
          ) : (
            <span>
              New student? <Link to="/student-signup">Register here</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function WardenAuthPage({ role, mode, session, setSession }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    hostelBlock: '',
    role: 'warden',
  });

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (session && (session.role === 'warden' || session.role === 'admin')) {
      navigate('/warden-dashboard');
    }
  }, [navigate, session]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignup ? '/api/auth/warden/signup' : '/api/auth/warden/login';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(form),
      });

      const account = data.warden;
      const nextSession = {
        token: data.token,
        role: account.role || role,
        user: account,
      };

      saveSession(nextSession);
      setSession(nextSession);
      navigate('/warden-dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="form-panel large">
        <div className="panel-header">
          <span className="eyebrow">Warden access</span>
          <h2>{isSignup ? 'Create warden account' : 'Warden login'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && (
            <div className="form-row split">
              <label>
                Full name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
              <label>
                Phone
                <input name="phone" value={form.phone} onChange={handleChange} required />
              </label>
            </div>
          )}

          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button type="button" className="link-button" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label>
            Hostel block
            <input name="hostelBlock" value={form.hostelBlock} onChange={handleChange} required />
          </label>

          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Login'}
          </button>
        </form>

        <div className="auth-footer">
          {isSignup ? (
            <span>
              Already a warden? <Link to="/warden-login">Login here</Link>
            </span>
          ) : (
            <span>
              Need access? <Link to="/warden-signup">Register here</Link>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentDashboard({ session, studentOutings, refreshOutings }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const recentRequests = studentOutings.slice(0, 5);
  const totalOutings = studentOutings.length;
  const pendingCount = studentOutings.filter((outing) => outing.status === 'pending').length;
  const approvedCount = studentOutings.filter((outing) => outing.status === 'approved' || outing.status === 'ongoing').length;
  const activeOuting = studentOutings.find((outing) => outing.status === 'ongoing' || outing.status === 'approved');

  useEffect(() => {
    let pingInterval;
    const ongoingOuting = studentOutings.find((o) => o.status === 'ongoing');
    if (ongoingOuting) {
      const sendLocationPing = async () => {
        try {
          const { latitude, longitude } = await getBrowserLocation();
          await apiFetch(`/api/location/${ongoingOuting.id || ongoingOuting._id}`, {
            method: 'PATCH',
            body: JSON.stringify({ latitude, longitude }),
          });
        } catch {
          // ignore background ping error
        }
      };
      sendLocationPing();
      pingInterval = setInterval(sendLocationPing, 30000);
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [studentOutings]);

  const handleDepart = async (outingId) => {
    try {
      setActionLoading(true);
      setActionMsg('');
      const { latitude, longitude } = await getBrowserLocation();
      await apiFetch(`/api/outings/${outingId}/depart`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude }),
      });
      setActionMsg('Check-out successful. Location tracking is now ACTIVE.');
      if (refreshOutings) await refreshOutings();
    } catch (err) {
      alert(err.message || 'Check-out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (outingId) => {
    try {
      setActionLoading(true);
      setActionMsg('');
      await apiFetch(`/api/outings/${outingId}/return`, {
        method: 'PATCH',
      });
      setActionMsg('Check-in successful. Welcome back!');
      if (refreshOutings) await refreshOutings();
    } catch (err) {
      alert(err.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendSOS = async (outingId) => {
    if (!window.confirm('Are you sure you want to send an emergency SOS alert to the warden?')) return;
    try {
      setActionLoading(true);
      const { latitude, longitude } = await getBrowserLocation();
      await apiFetch('/api/alerts/sos', {
        method: 'POST',
        body: JSON.stringify({ outingRequestId: outingId, latitude, longitude }),
      });
      alert('Emergency SOS alert sent to warden!');
    } catch (err) {
      alert(err.message || 'SOS dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <span className="eyebrow">Student dashboard</span>
          <h2>Welcome back, {session.user?.name || 'Student'}</h2>
        </div>
        <Link className="primary-button small-button" to="/student-request">
          Request Outing
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Outings</span>
          <strong>{totalOutings}</strong>
        </div>
        <div className="stat-card">
          <span>Pending Requests</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="stat-card">
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>
        <div className="stat-card">
          <span>Active Outing</span>
          <strong>{activeOuting ? 'Live' : 'None'}</strong>
        </div>
      </div>

      <div className="content-grid dashboard-grid">
        <section className="panel">
          <div className="panel-header compact">
            <h3>Current outing status</h3>
          </div>

          <div className="status-box">
            <div className={classNames('status-pill', activeOuting ? 'active' : '')}>
              {activeOuting
                ? activeOuting.status === 'ongoing'
                  ? 'Location sharing ACTIVE (Out of Hostel)'
                  : 'Outing Approved (Ready to Check Out)'
                : 'No active outing'}
            </div>
            <p>
              {activeOuting
                ? activeOuting.status === 'ongoing'
                  ? `Your outing to ${activeOuting.destination} is currently in progress.`
                  : `Your outing request to ${activeOuting.destination} has been approved!`
                : 'You are currently in the hostel with location sharing off.'}
            </p>

            {actionMsg && <div className="alert success">{actionMsg}</div>}

            {activeOuting && (
              <div className="action-row" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {activeOuting.status === 'approved' && (
                  <button
                    type="button"
                    className="primary-button small-button"
                    onClick={() => handleDepart(activeOuting.id || activeOuting._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Depart / Check Out'}
                  </button>
                )}
                {(activeOuting.status === 'ongoing' || activeOuting.status === 'overdue') && (
                  <button
                    type="button"
                    className="primary-button small-button"
                    onClick={() => handleReturn(activeOuting.id || activeOuting._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Return / Check In'}
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-button small-button"
                  style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
                  onClick={() => handleSendSOS(activeOuting.id || activeOuting._id)}
                  disabled={actionLoading}
                >
                  Emergency SOS
                </button>
              </div>
            )}
          </div>

          <ul className="info-list">
            <li>
              <span>Student</span>
              <strong>{session.user?.name}</strong>
            </li>
            <li>
              <span>Location sharing</span>
              <strong>{activeOuting && activeOuting.status === 'ongoing' ? 'Enabled' : 'Disabled'}</strong>
            </li>
            <li>
              <span>Latest request</span>
              <strong>{recentRequests[0] ? recentRequests[0].destination : 'No requests yet'}</strong>
            </li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header compact">
            <h3>Recent outing activity</h3>
          </div>

          {recentRequests.length > 0 ? (
            <div className="list-stack">
              {recentRequests.map((outing) => (
                <div key={outing.id || outing._id || outing.destination} className="list-item-row">
                  <div>
                    <strong>{outing.destination}</strong>
                    <small>{outing.purpose}</small>
                  </div>
                  <span className={statusClassMap[outing.status] || 'status-badge neutral'}>{outing.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">No outing history yet. Submit your first request.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StudentRequestPage({ setStudentOutings }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    destination: '',
    purpose: '',
    expectedDepartureTime: '',
    expectedReturnTime: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        expectedDepartureTime: new Date(form.expectedDepartureTime).toISOString(),
        expectedReturnTime: new Date(form.expectedReturnTime).toISOString(),
      };

      const data = await apiFetch('/api/outings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const newEntry = {
        id: data._id,
        destination: data.destination,
        purpose: data.purpose,
        expectedDepartureTime: data.expectedDepartureTime,
        expectedReturnTime: data.expectedReturnTime,
        status: data.status || 'pending',
        createdAt: data.createdAt,
      };

      // Refresh outings from backend to stay authoritative
      try {
        const fresh = await apiFetch('/api/outings/mine', { method: 'GET' });
        setStudentOutings(fresh || []);
      } catch (refreshErr) {
        console.warn('Refreshing outings from server failed, using local fallback', refreshErr);
        setStudentOutings((current) => [newEntry, ...current]);
      }
      setSuccess('Outing request submitted successfully.');
      setForm({
        destination: '',
        purpose: '',
        expectedDepartureTime: '',
        expectedReturnTime: '',
      });
      setTimeout(() => navigate('/student-outings'), 1200);
    } catch (err) {
      setError(err.message || 'Unable to submit outing request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <span className="eyebrow">Request outing</span>
          <h2>Submit a new outing request</h2>
        </div>
      </div>

      <div className="form-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Destination
            <input name="destination" value={form.destination} onChange={handleChange} required />
          </label>

          <label>
            Purpose
            <textarea
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              rows="4"
              required
            />
          </label>

          <div className="form-row split">
            <label>
              Expected departure time
              <input
                type="datetime-local"
                name="expectedDepartureTime"
                value={form.expectedDepartureTime}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Expected return time
              <input
                type="datetime-local"
                name="expectedReturnTime"
                value={form.expectedReturnTime}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          {success && <div className="alert success">{success}</div>}
          {error && <div className="alert error">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Outing Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

function StudentOutingsPage({ studentOutings }) {
  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <span className="eyebrow">My outings</span>
          <h2>Outing history</h2>
        </div>
      </div>

      <div className="table-wrap">
        {studentOutings.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Destination</th>
                <th>Purpose</th>
                <th>Departure</th>
                <th>Return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {studentOutings.map((outing) => (
                <tr key={outing.id || outing._id || outing.destination + outing.createdAt}>
                  <td>{outing.destination}</td>
                  <td>{outing.purpose}</td>
                  <td>{formatDate(outing.expectedDepartureTime)}</td>
                  <td>{formatDate(outing.expectedReturnTime)}</td>
                  <td>
                    <span className={statusClassMap[outing.status] || 'status-badge neutral'}>
                      {outing.status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">No outing records yet.</div>
        )}
      </div>
    </div>
  );
}

function WardenDashboard({ session }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshDashboard = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [pendingResponse, liveResponse, alertResponse] = await Promise.all([
        apiFetch('/api/outings/pending'),
        apiFetch('/api/location/live'),
        apiFetch('/api/alerts/open'),
      ]);

      setPendingRequests(pendingResponse || []);
      setLiveLocations(liveResponse || []);
      setAlerts(alertResponse || []);
    } catch (error) {
      console.error('Dashboard load failed', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard(true);
    const interval = setInterval(() => refreshDashboard(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (outingId) => {
    try {
      await apiFetch(`/api/outings/${outingId}/approve`, { method: 'PATCH' });
      await refreshDashboard();
    } catch (error) {
      alert(error.message || 'Unable to approve outing');
    }
  };

  const handleReject = async (outingId) => {
    const reason = window.prompt('Reason for rejection:', 'Request not approved for this outing window.');
    if (reason === null) return;
    try {
      await apiFetch(`/api/outings/${outingId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      });
      await refreshDashboard();
    } catch (error) {
      alert(error.message || 'Unable to reject outing');
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await apiFetch(`/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
      await refreshDashboard();
    } catch (error) {
      alert(error.message || 'Unable to acknowledge alert');
    }
  };

  const handleResolve = async (alertId) => {
    const notes = window.prompt('Resolution notes:', 'Emergency resolved by hostel staff.');
    if (notes === null) return;
    try {
      await apiFetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      await refreshDashboard();
    } catch (error) {
      alert(error.message || 'Unable to resolve alert');
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <span className="eyebrow">Warden dashboard</span>
          <h2>Operations overview</h2>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading dashboard data...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Pending requests</span>
              <strong>{pendingRequests.length}</strong>
            </div>
            <div className="stat-card">
              <span>Live tracking</span>
              <strong>{liveLocations.length}</strong>
            </div>
            <div className="stat-card">
              <span>Open alerts</span>
              <strong>{alerts.length}</strong>
            </div>
            <div className="stat-card">
              <span>Supervisor</span>
              <strong>{session.user?.name || 'Staff'}</strong>
            </div>
          </div>

          <div className="content-grid dashboard-grid">
            <section className="panel">
              <div className="panel-header compact">
                <h3>Pending outing requests</h3>
              </div>

              {pendingRequests.length > 0 ? (
                <div className="list-stack">
                  {pendingRequests.map((outing) => (
                    <div key={outing._id} className="request-card">
                      <div>
                        <strong>{outing.student?.name}</strong>
                        <small>
                          {outing.student?.rollNumber} · {outing.destination}
                        </small>
                      </div>
                      <div className="request-meta">
                        <span>{outing.purpose}</span>
                        <small>Return: {formatDate(outing.expectedReturnTime)}</small>
                      </div>
                      <div className="action-row">
                        <button type="button" className="primary-button small-button" onClick={() => handleApprove(outing._id)}>
                          Approve
                        </button>
                        <button type="button" className="warning-button small-button" onClick={() => handleReject(outing._id)}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No pending itinerary requests right now.</p>
              )}
            </section>

            <section className="panel">
              <div className="panel-header compact">
                <h3>Live student tracking</h3>
              </div>

              {liveLocations.length > 0 ? (
                <div className="list-stack">
                  {liveLocations.map((location) => (
                    <div key={location._id} className="request-card">
                      <div>
                        <strong>{location.student?.name}</strong>
                        <small>
                          {location.student?.hostelBlock} · {location.student?.rollNumber}
                        </small>
                      </div>
                      <div className="request-meta">
                        <span>{location.outingRequest?.destination}</span>
                        <small>
                          {location.latitude}, {location.longitude}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-text">No active students are currently sharing a live location.</p>
              )}
            </section>
          </div>

          <section className="panel full-panel">
            <div className="panel-header compact">
              <h3>Emergency and alert queue</h3>
            </div>

            {alerts.length > 0 ? (
              <div className="list-stack">
                {alerts.map((alert) => (
                  <div key={alert._id} className="request-card alerts-card">
                    <div>
                      <strong>{alert.student?.name}</strong>
                      <small>
                        {alert.type.toUpperCase()} · {alert.student?.phone}
                      </small>
                    </div>
                    <div className="request-meta">
                      <span>{alert.outingRequest?.destination}</span>
                      <small>
                        Location: {alert.location?.latitude}, {alert.location?.longitude}
                      </small>
                    </div>
                    <div className="action-row">
                      <button type="button" className="primary-button small-button" onClick={() => handleAcknowledge(alert._id)}>
                        Acknowledge
                      </button>
                      <button type="button" className="secondary-button small-button" onClick={() => handleResolve(alert._id)}>
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">No open emergency alerts in the system.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default App;
