const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const SESSION_KEY = 'hostel-outing-session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function apiFetch(path, options = {}) {
  const session = readSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.text();
  const data = payload ? JSON.parse(payload) : null;

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new Error(message);
  }

  return data;
}


export async function fetchStudentOutings() {
  return apiFetch('/api/outings/mine');
}
