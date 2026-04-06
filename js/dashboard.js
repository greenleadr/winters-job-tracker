import { getApplications } from './data.js';
import {
  formatDateShort, getWeekKey, statusBadge, countBy, sortedEntries, pct,
  CHART_COLORS, STATUS_COLORS
} from './utils.js';

let charts = [];

export function destroyDashboard() {
  charts.forEach(c => c.destroy());
  charts = [];
}

export function renderDashboard(container) {
  const apps = getApplications();
  const total = apps.length;
  const submitted = apps.filter(a => a.status === 'Submitted').length;
  const rejected = apps.filter(a => a.status === 'Rejected').length;
  const interview = apps.filter(a => a.status === 'Interview').length;
  const responseRate = pct(rejected + interview, total);
  const withReferral = apps.filter(a => a.referral && a.referral.trim()).length;
  const referralRate = pct(withReferral, total);

  const industryCounts = sortedEntries(countBy(apps, a => a.industry));
  const sourceCounts = sortedEntries(countBy(apps, a => a.source));

  const recent = [...apps].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  container.innerHTML = `
    <!-- Metric Cards -->
    <div class="metrics-grid">
      <div class="card metric-card">
        <div class="metric-icon teal"><i data-lucide="briefcase"></i></div>
        <div>
          <div class="metric-value glow">${total}</div>
          <div class="metric-label">Total Applications</div>
        </div>
      </div>
      <div class="card metric-card">
        <div class="metric-icon blue"><i data-lucide="send"></i></div>
        <div>
          <div class="metric-value">${submitted}</div>
          <div class="metric-label">Active (Submitted)</div>
        </div>
      </div>
      <div class="card metric-card">
        <div class="metric-icon rose"><i data-lucide="x-circle"></i></div>
        <div>
          <div class="metric-value">${rejected}</div>
          <div class="metric-label">Rejected</div>
        </div>
      </div>
      <div class="card metric-card">
        <div class="metric-icon lavender"><i data-lucide="bar-chart-3"></i></div>
        <div>
          <div class="metric-value">${responseRate}</div>
          <div class="metric-label">Response Rate</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="dashboard-row two-col">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Application Activity</span>
        </div>
        <div class="chart-container h-300">
          <canvas id="chart-activity"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Status Breakdown</span>
        </div>
        <div class="chart-container h-300">
          <canvas id="chart-status"></canvas>
        </div>
      </div>
    </div>

    <!-- Recent Applications -->
    <div class="card" style="margin-bottom: var(--space-xl);">
      <div class="card-header">
        <span class="card-title">Recent Applications</span>
      </div>
      <ul class="recent-list">
        ${recent.map(a => `
          <li class="recent-item" data-id="${a.id}">
            <span class="recent-date">${formatDateShort(a.date)}</span>
            <span class="recent-title">${a.jobTitle}</span>
            <span class="recent-company">${a.company}</span>
            ${statusBadge(a.status)}
          </li>
        `).join('')}
      </ul>
      <a href="#applications" class="view-all-link">View all applications &rarr;</a>
    </div>

    <!-- Quick Insights -->
    <div class="dashboard-row three-col">
      <div class="card">
        <div class="card-title" style="margin-bottom: var(--space-sm);">Top Industry</div>
        <div class="insight-value">${industryCounts[0]?.[0] || '—'}</div>
        <div class="insight-detail">${industryCounts[0]?.[1] || 0} applications</div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom: var(--space-sm);">Top Source</div>
        <div class="insight-value">${sourceCounts[0]?.[0] || '—'}</div>
        <div class="insight-detail">${sourceCounts[0]?.[1] || 0} applications</div>
      </div>
      <div class="card">
        <div class="card-title" style="margin-bottom: var(--space-sm);">Referral Rate</div>
        <div class="insight-value">${referralRate}</div>
        <div class="insight-detail">${withReferral} applications with referrals</div>
      </div>
    </div>
  `;

  // Render charts
  renderActivityChart(apps);
  renderStatusChart(apps);
}

function renderActivityChart(apps) {
  const weekCounts = countBy(apps, a => getWeekKey(a.date));
  const weeks = Object.keys(weekCounts).sort();
  const counts = weeks.map(w => weekCounts[w]);

  const labels = weeks.map(w => {
    const d = new Date(w + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const ctx = document.getElementById('chart-activity');
  if (!ctx) return;

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(94, 234, 212, 0.3)');
  gradient.addColorStop(1, 'rgba(94, 234, 212, 0)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Applications',
        data: counts,
        borderColor: CHART_COLORS.teal,
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: CHART_COLORS.teal,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, maxTicksLimit: 12 }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 5 }
        }
      }
    }
  });
  charts.push(chart);
}

function renderStatusChart(apps) {
  const statusCounts = countBy(apps, a => a.status);
  const statuses = Object.keys(statusCounts);
  const counts = statuses.map(s => statusCounts[s]);
  const colors = statuses.map(s => STATUS_COLORS[s] || CHART_COLORS.text);

  const ctx = document.getElementById('chart-status');
  if (!ctx) return;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: '#131828',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 16 }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "600 28px 'JetBrains Mono', monospace";
        ctx.fillStyle = CHART_COLORS.white;
        ctx.fillText(apps.length, centerX, centerY - 8);
        ctx.font = "400 12px 'Inter', sans-serif";
        ctx.fillStyle = CHART_COLORS.text;
        ctx.fillText('Total', centerX, centerY + 16);
        ctx.restore();
      }
    }]
  });
  charts.push(chart);
}
