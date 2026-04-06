let applications = [];
let listeners = [];

// Load data from JSON file
export async function loadApplications() {
  const resp = await fetch('data/applications.json');
  applications = await resp.json();
  notify();
  return applications;
}

export function getApplications() {
  return applications;
}

export function getApplication(id) {
  return applications.find(a => a.id === id);
}

export function addApplication(app) {
  const maxId = applications.reduce((max, a) => Math.max(max, a.id), 0);
  app.id = maxId + 1;
  applications.push(app);
  notify();
  return app;
}

export function updateApplication(id, updates) {
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) return null;
  applications[idx] = { ...applications[idx], ...updates };
  notify();
  return applications[idx];
}

export function deleteApplication(id) {
  const idx = applications.findIndex(a => a.id === id);
  if (idx === -1) return false;
  applications.splice(idx, 1);
  notify();
  return true;
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

// GitHub API integration
const GITHUB_API = 'https://api.github.com';

function getSettings() {
  return {
    token: localStorage.getItem('gh_token') || '',
    repo: localStorage.getItem('gh_repo') || 'greenleadr/winters-job-tracker',
    path: localStorage.getItem('gh_path') || 'data/applications.json',
    branch: localStorage.getItem('gh_branch') || 'main'
  };
}

export function saveSettings(token, repo, path, branch) {
  localStorage.setItem('gh_token', token);
  localStorage.setItem('gh_repo', repo);
  localStorage.setItem('gh_path', path);
  localStorage.setItem('gh_branch', branch || 'main');
}

export function getStoredSettings() {
  return getSettings();
}

export async function testConnection() {
  const { token, repo } = getSettings();
  if (!token) throw new Error('No token configured');
  const resp = await fetch(`${GITHUB_API}/repos/${repo}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  return await resp.json();
}

export async function persistToGitHub() {
  const { token, repo, path, branch } = getSettings();
  if (!token) throw new Error('No GitHub token configured. Open Settings to add one.');

  // Get current file SHA on the target branch
  const getResp = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  let sha = null;
  if (getResp.ok) {
    const data = await getResp.json();
    sha = data.sha;
  }

  // Commit updated data
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(applications, null, 2))));
  const body = {
    message: `Update job applications (${applications.length} total)`,
    content,
    branch
  };
  if (sha) body.sha = sha;

  const putResp = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!putResp.ok) {
    const err = await putResp.json();
    throw new Error(err.message || `GitHub API error: ${putResp.status}`);
  }

  return await putResp.json();
}
