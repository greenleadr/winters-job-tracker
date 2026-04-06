import { getApplications, filterApplications, sortApplications, deleteApplication, persistToGitHub } from './data.js';
import {
  formatDate, statusBadge, debounce, unique, showToast, ALL_STATUSES
} from './utils.js';
import { openFormModal } from './form.js';

const PAGE_SIZE = 25;
let currentFilters = {};
let currentSort = { key: 'date', dir: 'desc' };
let currentPage = 1;

export function destroyTable() {
  currentFilters = {};
  currentSort = { key: 'date', dir: 'desc' };
  currentPage = 1;
}

export function renderTable(container) {
  const apps = getApplications();
  const industries = unique(apps.map(a => a.industry));
  const sources = unique(apps.map(a => a.source));

  container.innerHTML = `
    <div class="table-controls">
      <div class="search-box">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" id="table-search" placeholder="Search by title, company, or industry...">
      </div>
      <span class="results-count" id="results-count"></span>
    </div>
    <div class="filter-row">
      <select class="filter-select" id="filter-status">
        <option value="All">All Statuses</option>
        ${ALL_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select class="filter-select" id="filter-industry">
        <option value="All">All Industries</option>
        ${industries.map(i => `<option value="${i}">${i}</option>`).join('')}
      </select>
      <select class="filter-select" id="filter-source">
        <option value="All">All Sources</option>
        ${sources.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <select class="filter-select" id="filter-target">
        <option value="All">Target: All</option>
        <option value="Yes">Target: Yes</option>
        <option value="No">Target: No</option>
      </select>
      <input type="date" class="filter-date" id="filter-date-from" title="From date">
      <input type="date" class="filter-date" id="filter-date-to" title="To date">
      <button class="clear-filters" id="clear-filters" style="display:none">Clear all filters</button>
    </div>
    <div class="table-wrapper">
      <table class="app-table">
        <thead>
          <tr>
            <th data-sort="id"># <span class="sort-icon"></span></th>
            <th data-sort="date">Date <span class="sort-icon"></span></th>
            <th data-sort="jobTitle">Job Title <span class="sort-icon"></span></th>
            <th data-sort="company">Company <span class="sort-icon"></span></th>
            <th data-sort="industry">Industry <span class="sort-icon"></span></th>
            <th data-sort="status">Status <span class="sort-icon"></span></th>
            <th data-sort="location">Location <span class="sort-icon"></span></th>
            <th data-sort="source">Source <span class="sort-icon"></span></th>
            <th data-sort="referral">Referral <span class="sort-icon"></span></th>
            <th>Target</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </div>
    <div class="pagination" id="pagination"></div>
  `;

  // Events
  const searchInput = document.getElementById('table-search');
  searchInput.addEventListener('input', debounce(() => {
    currentFilters.search = searchInput.value;
    currentPage = 1;
    refreshTable();
  }, 200));

  ['filter-status', 'filter-industry', 'filter-source', 'filter-target'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('filter-', '');
      currentFilters[key] = e.target.value;
      currentPage = 1;
      refreshTable();
    });
  });

  document.getElementById('filter-date-from').addEventListener('change', (e) => {
    currentFilters.dateFrom = e.target.value;
    currentPage = 1;
    refreshTable();
  });

  document.getElementById('filter-date-to').addEventListener('change', (e) => {
    currentFilters.dateTo = e.target.value;
    currentPage = 1;
    refreshTable();
  });

  document.getElementById('clear-filters').addEventListener('click', () => {
    currentFilters = {};
    currentPage = 1;
    searchInput.value = '';
    ['filter-status', 'filter-industry', 'filter-source', 'filter-target'].forEach(id => {
      document.getElementById(id).value = 'All';
    });
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    refreshTable();
  });

  // Sort headers
  container.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key, dir: 'asc' };
      }
      refreshTable();
    });
  });

  refreshTable();
}

function refreshTable() {
  const apps = getApplications();
  let filtered = filterApplications(apps, currentFilters);
  let sorted = sortApplications(filtered, currentSort.key, currentSort.dir);

  const total = apps.length;
  const showing = filtered.length;
  document.getElementById('results-count').textContent = `Showing ${showing} of ${total} applications`;

  // Show/hide clear button
  const hasFilters = Object.values(currentFilters).some(v => v && v !== 'All');
  document.getElementById('clear-filters').style.display = hasFilters ? 'inline-block' : 'none';

  // Update sort indicators
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.sort === currentSort.key);
    const icon = th.querySelector('.sort-icon');
    if (th.dataset.sort === currentSort.key) {
      icon.textContent = currentSort.dir === 'asc' ? '▲' : '▼';
    } else {
      icon.textContent = '';
    }
  });

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = sorted.slice(start, start + PAGE_SIZE);

  // Render rows
  const tbody = document.getElementById('table-body');
  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state">
          <i data-lucide="search-x"></i>
          <p>No applications match your filters</p>
          <button class="btn btn-secondary" onclick="document.getElementById('clear-filters').click()">Clear filters</button>
        </div>
      </td></tr>
    `;
  } else {
    tbody.innerHTML = pageData.map(a => `
      <tr data-id="${a.id}">
        <td class="col-muted" style="font-family:var(--font-mono);font-size:0.75rem">${a.id}</td>
        <td style="font-family:var(--font-mono);font-size:0.75rem">${formatDate(a.date)}</td>
        <td class="col-title">${a.jobTitle}</td>
        <td class="col-company">${a.company}</td>
        <td>${a.industry}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="col-muted">${a.location || '—'}</td>
        <td>${a.source}</td>
        <td class="${a.referral ? 'col-referral' : 'col-muted'}">${a.referral || '—'}</td>
        <td>${a.targetCompany === true ? '<span class="target-check">&#10003;</span>' : a.targetCompany === false ? '' : '—'}</td>
        <td>
          <div class="col-actions">
            <button class="btn btn-ghost btn-sm btn-edit" data-id="${a.id}" title="Edit">
              <i data-lucide="pencil" style="width:14px;height:14px"></i>
            </button>
            <button class="btn btn-ghost btn-sm btn-danger btn-delete" data-id="${a.id}" title="Delete">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // Pagination
  renderPagination(totalPages);

  // Re-render icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Edit/Delete handlers
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openFormModal(parseInt(btn.dataset.id, 10));
    });
  });

  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      if (!confirm('Are you sure you want to delete this application?')) return;
      deleteApplication(id);
      try {
        await persistToGitHub();
        showToast('Application deleted');
      } catch (err) {
        showToast('Deleted locally (GitHub sync failed: ' + err.message + ')', 'error');
      }
      refreshTable();
    });
  });
}

function renderPagination(totalPages) {
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span style="color:var(--text-muted);padding:0 4px">&hellip;</span>`;
      }
    } else {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
  }

  html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>`;

  pag.innerHTML = html;

  pag.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page, 10);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        refreshTable();
        document.querySelector('.table-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
