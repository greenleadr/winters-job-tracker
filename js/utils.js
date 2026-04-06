// Date formatting
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function toISODate(date) {
  return date.toISOString().split('T')[0];
}

export function getWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return toISODate(start);
}

export function getMonthKey(dateStr) {
  return dateStr.substring(0, 7); // "2026-03"
}

export function formatMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function getDayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay();
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Status helpers
export const STATUS_COLORS = {
  'Submitted': '#60a5fa',
  'Rejected': '#f87171',
  'Pending Referral': '#fbbf24',
  'Interview': '#34d399',
  'Offer': '#2dd4bf'
};

export const STATUS_CLASSES = {
  'Submitted': 'submitted',
  'Rejected': 'rejected',
  'Pending Referral': 'pending-referral',
  'Interview': 'interview',
  'Offer': 'offer'
};

export const ALL_STATUSES = ['Submitted', 'Rejected', 'Pending Referral', 'Interview', 'Offer'];

export function statusBadge(status) {
  const cls = STATUS_CLASSES[status] || 'submitted';
  return `<span class="status-badge ${cls}">${status}</span>`;
}

// Chart.js defaults for dark theme
export const CHART_COLORS = {
  teal: '#5eead4',
  tealFaded: 'rgba(94, 234, 212, 0.2)',
  blue: '#60a5fa',
  rose: '#f87171',
  amber: '#fbbf24',
  green: '#34d399',
  lavender: '#a78bfa',
  grid: 'rgba(35, 42, 62, 0.6)',
  text: '#8892a8',
  white: '#e2e8f0'
};

export function configureChartDefaults() {
  Chart.defaults.color = CHART_COLORS.text;
  Chart.defaults.borderColor = CHART_COLORS.grid;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
  Chart.defaults.plugins.tooltip.backgroundColor = '#131828';
  Chart.defaults.plugins.tooltip.borderColor = '#232a3e';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
}

// DOM helpers
export function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'className') elem.className = val;
    else if (key === 'innerHTML') elem.innerHTML = val;
    else if (key === 'textContent') elem.textContent = val;
    else if (key.startsWith('on')) elem.addEventListener(key.slice(2).toLowerCase(), val);
    else elem.setAttribute(key, val);
  }
  for (const child of children) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child) elem.appendChild(child);
  }
  return elem;
}

export function html(template) {
  const div = document.createElement('div');
  div.innerHTML = template.trim();
  return div.children.length === 1 ? div.firstElementChild : div;
}

// Toast notifications
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
  const toast = html(`
    <div class="toast ${type}">
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <span>${message}</span>
    </div>
  `);
  container.appendChild(toast);
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [toast] });

  setTimeout(() => {
    toast.style.animation = 'slideOut 250ms ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// Debounce
export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Group by helper
export function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

// Count occurrences
export function countBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

// Sort entries by value descending
export function sortedEntries(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

// Unique values
export function unique(arr) {
  return [...new Set(arr)].filter(Boolean).sort();
}

// Percentage
export function pct(num, denom) {
  if (!denom) return '0%';
  return (num / denom * 100).toFixed(1) + '%';
}
