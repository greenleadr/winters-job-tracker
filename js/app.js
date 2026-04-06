import { loadApplications, isDBSeeded, seedFromJSON } from './data.js';
import { configureChartDefaults, showToast } from './utils.js';
import { renderDashboard, destroyDashboard } from './dashboard.js';
import { renderTable, destroyTable } from './table.js';
import { renderAnalytics, destroyAnalytics } from './analytics.js';
import { openFormModal } from './form.js';

let currentView = 'dashboard';

// SPA Router
function getViewFromHash() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  return ['dashboard', 'applications', 'analytics'].includes(hash) ? hash : 'dashboard';
}

function navigateTo(view) {
  location.hash = view;
}

function renderView(view) {
  const main = document.getElementById('main-content');

  // Destroy previous view's charts
  destroyDashboard();
  destroyTable();
  destroyAnalytics();

  main.innerHTML = '';
  currentView = view;

  // Update nav
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.view === view);
  });

  switch (view) {
    case 'dashboard':
      renderDashboard(main);
      break;
    case 'applications':
      renderTable(main);
      break;
    case 'analytics':
      renderAnalytics(main);
      break;
  }

  // Re-render lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Settings Modal — Database Management
function openSettings() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Settings</h2>
      <button class="btn btn-ghost btn-icon-only modal-close" id="modal-close-btn">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="modal-body">
      <div class="settings-field">
        <label class="form-label">Database</label>
        <p class="settings-help" style="margin-bottom: var(--space-sm)">
          Connected to Supabase. All changes are saved instantly to the database.
        </p>
        <span id="db-status"></span>
      </div>
      <div class="settings-field" style="border-top: 1px solid var(--bg-border); padding-top: var(--space-md);">
        <label class="form-label">Data Management</label>
        <p class="settings-help" style="margin-bottom: var(--space-sm)">
          If the database is empty, you can seed it with the original 184 applications from the JSON file.
        </p>
        <button class="btn btn-secondary" id="seed-db-btn">
          <i data-lucide="database" style="width:14px;height:14px"></i>
          Seed Database from JSON
        </button>
        <span id="seed-result" style="margin-left: var(--space-sm)"></span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="settings-cancel">Done</button>
    </div>
  `;

  overlay.classList.add('visible');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [modal] });

  // Check DB status
  (async () => {
    const statusEl = document.getElementById('db-status');
    try {
      const seeded = await isDBSeeded();
      statusEl.innerHTML = seeded
        ? '<span class="connection-status success">Connected &mdash; database has data</span>'
        : '<span class="connection-status error">Connected &mdash; database is empty</span>';
    } catch (e) {
      statusEl.innerHTML = `<span class="connection-status error">Error: ${e.message}</span>`;
    }
  })();

  // Event handlers
  document.getElementById('modal-close-btn').onclick = closeModal;
  document.getElementById('settings-cancel').onclick = closeModal;

  document.getElementById('seed-db-btn').onclick = async () => {
    const resultEl = document.getElementById('seed-result');
    const btn = document.getElementById('seed-db-btn');
    btn.disabled = true;
    resultEl.innerHTML = '<span class="loading-spinner"></span> Seeding...';
    try {
      const count = await seedFromJSON();
      resultEl.innerHTML = `<span class="connection-status success">Seeded ${count} applications!</span>`;
      showToast(`Database seeded with ${count} applications`);
      // Refresh view
      renderView(currentView);
    } catch (e) {
      resultEl.innerHTML = `<span class="connection-status error">${e.message}</span>`;
      showToast('Seed failed: ' + e.message, 'error');
    }
    btn.disabled = false;
  };
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('visible');
}

// Initialize
async function init() {
  configureChartDefaults();

  await loadApplications();

  // Nav clicks
  document.querySelectorAll('.nav-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(pill.dataset.view);
    });
  });

  // Hash change
  window.addEventListener('hashchange', () => {
    renderView(getViewFromHash());
  });

  // Add application button
  document.getElementById('btn-add-app').addEventListener('click', () => openFormModal());

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', openSettings);

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Render initial view
  renderView(getViewFromHash());

  // Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

init();
