import { getApplications, getApplication, addApplication, updateApplication, deleteApplication } from './data.js';
import { unique, showToast, ALL_STATUSES, STATUS_CLASSES } from './utils.js';
import { closeModal } from './app.js';

export function openFormModal(editId = null) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  const apps = getApplications();
  const existing = editId ? getApplication(editId) : null;
  const isEdit = !!existing;

  const companies = unique(apps.map(a => a.company));
  const industries = unique(apps.map(a => a.industry));
  const sources = unique(apps.map(a => a.source));

  const today = new Date().toISOString().split('T')[0];

  modal.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${isEdit ? 'Edit Application' : 'Add Application'}</h2>
      <button class="btn btn-ghost btn-icon-only modal-close" id="form-close-btn">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Job Title *</label>
        <input type="text" class="form-input" id="form-title" value="${isEdit ? existing.jobTitle : ''}" placeholder="e.g., Senior Product Manager">
      </div>
      <div class="form-group">
        <label class="form-label">Company *</label>
        <div class="autocomplete-wrapper">
          <input type="text" class="form-input" id="form-company" value="${isEdit ? existing.company : ''}" placeholder="e.g., Google" autocomplete="off">
          <div class="autocomplete-list" id="ac-company"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Industry</label>
        <div class="autocomplete-wrapper">
          <input type="text" class="form-input" id="form-industry" value="${isEdit ? existing.industry : ''}" placeholder="e.g., Technology" autocomplete="off">
          <div class="autocomplete-list" id="ac-industry"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Date Applied</label>
        <input type="date" class="form-input" id="form-date" value="${isEdit ? existing.date : today}">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <div class="status-toggle" id="status-toggle">
          ${ALL_STATUSES.map(s => {
            const cls = STATUS_CLASSES[s];
            const active = isEdit ? existing.status === s : s === 'Submitted';
            return `<button type="button" class="status-toggle-btn ${cls} ${active ? 'active' : ''}" data-status="${s}">${s}</button>`;
          }).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input type="text" class="form-input" id="form-location" value="${isEdit ? existing.location : ''}" placeholder="e.g., Remote, Seattle, WA">
      </div>
      <div class="form-group">
        <label class="form-label">Source</label>
        <div class="autocomplete-wrapper">
          <input type="text" class="form-input" id="form-source" value="${isEdit ? existing.source : ''}" placeholder="e.g., LinkedIn, Greenhouse" autocomplete="off">
          <div class="autocomplete-list" id="ac-source"></div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Referral</label>
        <input type="text" class="form-input" id="form-referral" value="${isEdit ? existing.referral : ''}" placeholder="Contact name">
      </div>
      <div class="form-group">
        <label class="form-label">Target Company</label>
        <div class="toggle-wrapper">
          <label class="toggle">
            <input type="checkbox" id="form-target" ${isEdit && existing.targetCompany ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label-text" id="target-label">${isEdit && existing.targetCompany ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
    <div class="modal-footer ${isEdit ? 'space-between' : ''}">
      ${isEdit ? '<button class="btn btn-danger" id="form-delete"><i data-lucide="trash-2" style="width:14px;height:14px"></i> Delete</button>' : '<span></span>'}
      <div style="display:flex;gap:var(--space-sm)">
        <button class="btn btn-ghost" id="form-cancel">Cancel</button>
        <button class="btn btn-primary" id="form-save">
          <span id="save-text">${isEdit ? 'Save Changes' : 'Save Application'}</span>
          <span id="save-spinner" class="loading-spinner" style="display:none"></span>
        </button>
      </div>
    </div>
  `;

  overlay.classList.add('visible');
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [modal] });

  // Focus first input
  setTimeout(() => document.getElementById('form-title').focus(), 100);

  // Status toggle
  document.getElementById('status-toggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.status-toggle-btn');
    if (!btn) return;
    document.querySelectorAll('.status-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });

  // Target toggle label
  document.getElementById('form-target').addEventListener('change', (e) => {
    document.getElementById('target-label').textContent = e.target.checked ? 'Yes' : 'No';
  });

  // Autocomplete
  setupAutocomplete('form-company', 'ac-company', companies);
  setupAutocomplete('form-industry', 'ac-industry', industries);
  setupAutocomplete('form-source', 'ac-source', sources);

  // Close / Cancel
  document.getElementById('form-close-btn').onclick = closeModal;
  document.getElementById('form-cancel').onclick = closeModal;

  // Delete
  if (isEdit) {
    document.getElementById('form-delete').onclick = async () => {
      if (!confirm('Delete this application?')) return;
      try {
        await deleteApplication(editId);
        showToast('Application deleted');
      } catch (e) {
        showToast('Delete failed: ' + e.message, 'error');
      }
      closeModal();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
  }

  // Save
  document.getElementById('form-save').onclick = async () => {
    const title = document.getElementById('form-title').value.trim();
    const company = document.getElementById('form-company').value.trim();
    if (!title || !company) {
      showToast('Job Title and Company are required', 'error');
      return;
    }

    const activeStatus = document.querySelector('.status-toggle-btn.active');
    const data = {
      jobTitle: title,
      company,
      industry: document.getElementById('form-industry').value.trim(),
      date: document.getElementById('form-date').value,
      status: activeStatus ? activeStatus.dataset.status : 'Submitted',
      location: document.getElementById('form-location').value.trim(),
      source: document.getElementById('form-source').value.trim(),
      referral: document.getElementById('form-referral').value.trim(),
      targetCompany: document.getElementById('form-target').checked
    };

    // Show spinner
    document.getElementById('save-text').style.display = 'none';
    document.getElementById('save-spinner').style.display = 'inline-block';

    try {
      if (isEdit) {
        await updateApplication(editId, data);
      } else {
        await addApplication(data);
      }
      showToast(isEdit ? 'Application updated' : 'Application added');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }

    closeModal();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
}

function setupAutocomplete(inputId, listId, items) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase();
    if (!val) { list.classList.remove('show'); return; }

    const matches = items.filter(item => item.toLowerCase().includes(val)).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('show'); return; }

    list.innerHTML = matches.map(m => `<div class="autocomplete-item">${m}</div>`).join('');
    list.classList.add('show');

    list.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = item.textContent;
        list.classList.remove('show');
      });
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => list.classList.remove('show'), 150);
  });
}
