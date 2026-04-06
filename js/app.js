import { loadApplications, subscribe, getStoredSettings, saveSettings, testConnection, persistToGitHub } from './data.js';
import { configureChartDefaults, showToast, html } from './utils.js';
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

// Settings Modal
function openSettings() {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  const settings = getStoredSettings();

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">Settings</h2>
      <button class="btn btn-ghost btn-icon-only modal-close" id="modal-close-btn">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="modal-body">
      <div class="settings-field">
        <label class="form-label">GitHub Personal Access Token</label>
        <div class="password-wrapper">
          <input type="password" class="form-input" id="settings-token" value="${settings.token}" placeholder="ghp_xxxxxxxxxxxx">
          <button class="btn btn-ghost password-toggle" id="toggle-password" type="button">
            <i data-lucide="eye" style="width:16px;height:16px"></i>
          </button>
        </div>
        <p class="settings-help">Generate a token at github.com/settings/tokens with 'repo' scope. Stored in your browser only.</p>
      </div>
      <div class="settings-field">
        <label class="form-label">Repository</label>
        <input type="text" class="form-input" id="settings-repo" value="${settings.repo}" placeholder="owner/repo">
      </div>
      <div class="settings-field">
        <label class="form-label">Data File Path</label>
        <input type="text" class="form-input" id="settings-path" value="${settings.path}" placeholder="data/applications.json">
      </div>
      <div class="settings-field">
        <label class="form-label">Branch</label>
        <input type="text" class="form-input" id="settings-branch" value="${settings.branch}" placeholder="main">
        <p class="settings-help">The branch to read from and commit to (e.g., main, master, or your feature branch).</p>
      </div>
      <div class="settings-field">
        <button class="btn btn-secondary" id="test-connection-btn">Test Connection</button>
        <span id="connection-result"></span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="settings-cancel">Cancel</button>
      <button class="btn btn-primary" id="settings-save">Save Settings</button>
    </div>
  `;

  overlay.classList.add('visible');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [modal] });

  // Event handlers
  document.getElementById('modal-close-btn').onclick = closeModal;
  document.getElementById('settings-cancel').onclick = closeModal;

  document.getElementById('toggle-password').onclick = () => {
    const input = document.getElementById('settings-token');
    input.type = input.type === 'password' ? 'text' : 'password';
  };

  document.getElementById('test-connection-btn').onclick = async () => {
    const resultEl = document.getElementById('connection-result');
    const token = document.getElementById('settings-token').value;
    const repo = document.getElementById('settings-repo').value;
    saveSettings(token, repo, document.getElementById('settings-path').value, document.getElementById('settings-branch').value);
    resultEl.innerHTML = '<span class="loading-spinner"></span>';
    try {
      await testConnection();
      resultEl.innerHTML = '<span class="connection-status success">Connected!</span>';
    } catch (e) {
      resultEl.innerHTML = `<span class="connection-status error">${e.message}</span>`;
    }
  };

  document.getElementById('settings-save').onclick = () => {
    saveSettings(
      document.getElementById('settings-token').value,
      document.getElementById('settings-repo').value,
      document.getElementById('settings-path').value,
      document.getElementById('settings-branch').value
    );
    showToast('Settings saved');
    closeModal();
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
