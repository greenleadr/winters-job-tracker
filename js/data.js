const SUPABASE_URL = 'https://gbahfjseclpajowqgsaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiYWhmanNlY2xwYWpvd3Fnc2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0ODg1MzgsImV4cCI6MjA5MTA2NDUzOH0.OBBGnJV__xlB3gEKh2ikULBYS36uedPRNfEWIdET_G4';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let applications = [];
let listeners = [];

// Map DB row (snake_case) to app object (camelCase)
function fromRow(row) {
  return {
    id: row.id,
    jobTitle: row.job_title,
    company: row.company,
    industry: row.industry || '',
    date: row.date,
    status: row.status,
    location: row.location || '',
    source: row.source || '',
    referral: row.referral || '',
    targetCompany: row.target_company
  };
}

// Map app object (camelCase) to DB row (snake_case)
function toRow(app) {
  return {
    job_title: app.jobTitle,
    company: app.company,
    industry: app.industry || '',
    date: app.date,
    status: app.status,
    location: app.location || '',
    source: app.source || '',
    referral: app.referral || '',
    target_company: app.targetCompany
  };
}

// Load all applications from Supabase
export async function loadApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Supabase load error:', error);
    // Fallback to local JSON if Supabase is empty or errors
    try {
      const resp = await fetch('data/applications.json');
      applications = await resp.json();
    } catch (e) {
      applications = [];
    }
  } else if (data.length === 0) {
    // DB is empty — load from JSON fallback
    try {
      const resp = await fetch('data/applications.json');
      applications = await resp.json();
    } catch (e) {
      applications = [];
    }
  } else {
    applications = data.map(fromRow);
  }

  notify();
  return applications;
}

export function getApplications() {
  return applications;
}

export function getApplication(id) {
  return applications.find(a => a.id === id);
}

export async function addApplication(app) {
  const row = toRow(app);
  const { data, error } = await supabase
    .from('applications')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const newApp = fromRow(data);
  applications.push(newApp);
  notify();
  return newApp;
}

export async function updateApplication(id, updates) {
  const row = toRow({ ...getApplication(id), ...updates });
  const { data, error } = await supabase
    .from('applications')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const idx = applications.findIndex(a => a.id === id);
  if (idx !== -1) {
    applications[idx] = fromRow(data);
  }
  notify();
  return applications[idx];
}

export async function deleteApplication(id) {
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  const idx = applications.findIndex(a => a.id === id);
  if (idx !== -1) applications.splice(idx, 1);
  notify();
  return true;
}

// Seed data from local JSON into Supabase (one-time import)
export async function seedFromJSON() {
  const resp = await fetch('data/applications.json');
  const jsonApps = await resp.json();

  const rows = jsonApps.map(toRow);

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from('applications')
      .insert(batch);
    if (error) throw new Error(`Seed error at batch ${i}: ${error.message}`);
  }

  // Reload from DB
  await loadApplications();
  return applications.length;
}

// Check if DB has data
export async function isDBSeeded() {
  const { count, error } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true });
  if (error) return false;
  return count > 0;
}

// Simple pub/sub for data changes
export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() {
  for (const fn of listeners) fn(applications);
}

// Filter & sort
export function filterApplications(apps, filters) {
  let result = [...apps];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(a =>
      a.jobTitle.toLowerCase().includes(q) ||
      a.company.toLowerCase().includes(q) ||
      a.industry.toLowerCase().includes(q)
    );
  }

  if (filters.status && filters.status !== 'All') {
    result = result.filter(a => a.status === filters.status);
  }

  if (filters.industry && filters.industry !== 'All') {
    result = result.filter(a => a.industry === filters.industry);
  }

  if (filters.source && filters.source !== 'All') {
    result = result.filter(a => a.source === filters.source);
  }

  if (filters.target !== undefined && filters.target !== 'All') {
    const val = filters.target === 'Yes';
    result = result.filter(a => a.targetCompany === val);
  }

  if (filters.dateFrom) {
    result = result.filter(a => a.date >= filters.dateFrom);
  }

  if (filters.dateTo) {
    result = result.filter(a => a.date <= filters.dateTo);
  }

  return result;
}

export function sortApplications(apps, sortKey, sortDir) {
  if (!sortKey) return apps;
  return [...apps].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (va == null) va = '';
    if (vb == null) vb = '';
    if (sortKey === 'id') {
      va = Number(va); vb = Number(vb);
    }
    if (typeof va === 'string') {
      va = va.toLowerCase();
      vb = vb.toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}
