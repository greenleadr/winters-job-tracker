import { getApplications } from './data.js';
import {
  getWeekKey, getMonthKey, formatMonthLabel, getDayOfWeek, DAY_NAMES,
  countBy, sortedEntries, groupBy, pct,
  CHART_COLORS, STATUS_COLORS
} from './utils.js';

let charts = [];

export function destroyAnalytics() {
  charts.forEach(c => c.destroy());
  charts = [];
}

export function renderAnalytics(container) {
  container.innerHTML = `
    <!-- Section A: Timeline -->
    <div class="analytics-section">
      <h3 class="section-title">Application Timeline</h3>
      <div class="analytics-grid cols-1">
        <div class="card">
          <div class="card-header"><span class="card-title">Weekly Application Volume</span></div>
          <div class="chart-container h-300"><canvas id="chart-weekly-volume"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Cumulative Applications Over Time</span></div>
          <div class="chart-container h-300"><canvas id="chart-cumulative"></canvas></div>
        </div>
      </div>
    </div>

    <!-- Section B: Breakdowns -->
    <div class="analytics-section">
      <h3 class="section-title">Breakdowns</h3>
      <div class="analytics-grid cols-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Applications by Industry</span></div>
          <div class="chart-container h-300"><canvas id="chart-by-industry"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Applications by Source</span></div>
          <div class="chart-container h-300"><canvas id="chart-by-source"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Rejection Rate by Industry</span></div>
          <div class="chart-container h-300"><canvas id="chart-rejection-rate"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Applications by Status</span></div>
          <div class="chart-container h-300"><canvas id="chart-by-status"></canvas></div>
        </div>
      </div>
    </div>

    <!-- Section C: Deeper Insights -->
    <div class="analytics-section">
      <h3 class="section-title">Deeper Insights</h3>
      <div class="analytics-grid cols-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Top Companies</span></div>
          <div class="chart-container h-300"><canvas id="chart-top-companies"></canvas></div>
        </div>
        <div class="card" id="panel-referral-impact">
          <div class="card-header"><span class="card-title">Referral Impact</span></div>
          <div id="referral-impact-content"></div>
        </div>
        <div class="card" id="panel-target-analysis">
          <div class="card-header"><span class="card-title">Target Company Analysis</span></div>
          <div id="target-analysis-content"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Application Velocity</span></div>
          <div class="chart-container h-250"><canvas id="chart-velocity"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Day-of-Week Distribution</span></div>
          <div id="heatmap-container"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Monthly Summary</span></div>
          <div id="monthly-summary-container" style="overflow-x:auto"></div>
        </div>
      </div>
    </div>
  `;

  const apps = getApplications();
  renderWeeklyVolume(apps);
  renderCumulative(apps);
  renderByIndustry(apps);
  renderBySource(apps);
  renderRejectionRate(apps);
  renderByStatus(apps);
  renderTopCompanies(apps);
  renderReferralImpact(apps);
  renderTargetAnalysis(apps);
  renderVelocity(apps);
  renderDayHeatmap(apps);
  renderMonthlySummary(apps);
}

function renderWeeklyVolume(apps) {
  const byWeek = groupBy(apps, a => getWeekKey(a.date));
  const weeks = Object.keys(byWeek).sort();

  const statuses = ['Submitted', 'Rejected', 'Pending Referral', 'Interview', 'Offer'];
  const datasets = statuses.filter(s => apps.some(a => a.status === s)).map(status => ({
    label: status,
    data: weeks.map(w => byWeek[w].filter(a => a.status === status).length),
    backgroundColor: STATUS_COLORS[status],
    borderRadius: 4
  }));

  const labels = weeks.map(w => {
    const d = new Date(w + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const ctx = document.getElementById('chart-weekly-volume');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 45, maxTicksLimit: 15 } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 5 } }
      }
    }
  }));
}

function renderCumulative(apps) {
  const sorted = [...apps].sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set(sorted.map(a => a.date))].sort();

  let cumTotal = 0, cumRejected = 0;
  const totals = [], rejections = [];
  const labels = [];

  for (const date of dates) {
    const dayApps = sorted.filter(a => a.date === date);
    cumTotal += dayApps.length;
    cumRejected += dayApps.filter(a => a.status === 'Rejected').length;
    totals.push(cumTotal);
    rejections.push(cumRejected);
    const d = new Date(date + 'T00:00:00');
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  const ctx = document.getElementById('chart-cumulative');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Applications',
          data: totals,
          borderColor: CHART_COLORS.teal,
          backgroundColor: 'rgba(94, 234, 212, 0.1)',
          fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
        },
        {
          label: 'Cumulative Rejections',
          data: rejections,
          borderColor: 'rgba(248, 113, 113, 0.7)',
          backgroundColor: 'rgba(248, 113, 113, 0.05)',
          fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
        y: { beginAtZero: true }
      }
    }
  }));
}

function renderByIndustry(apps) {
  const counts = sortedEntries(countBy(apps, a => a.industry)).slice(0, 12);
  const labels = counts.map(c => c[0]);
  const data = counts.map(c => c[1]);

  const ctx = document.getElementById('chart-by-industry');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => {
          const opacity = 1 - (i / labels.length) * 0.6;
          return `rgba(94, 234, 212, ${opacity})`;
        }),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 10 } },
        y: { grid: { display: false } }
      }
    }
  }));
}

function renderBySource(apps) {
  const all = countBy(apps, a => a.source);
  const counts = sortedEntries(all).filter(([, v]) => v >= 2);
  const labels = counts.map(c => c[0]);
  const data = counts.map(c => c[1]);

  const ctx = document.getElementById('chart-by-source');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS.lavender,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  }));
}

function renderRejectionRate(apps) {
  const byIndustry = groupBy(apps, a => a.industry);
  const rates = Object.entries(byIndustry)
    .filter(([, v]) => v.length >= 3)
    .map(([industry, items]) => {
      const rejected = items.filter(a => a.status === 'Rejected').length;
      return { industry, rate: rejected / items.length * 100, total: items.length };
    })
    .sort((a, b) => b.rate - a.rate);

  const labels = rates.map(r => r.industry);
  const data = rates.map(r => r.rate);

  const ctx = document.getElementById('chart-rejection-rate');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Rejection Rate %',
        data,
        backgroundColor: 'rgba(248, 113, 113, 0.6)',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ctx.raw.toFixed(1) + '%' }
      }},
      scales: {
        x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false } }
      }
    }
  }));
}

function renderByStatus(apps) {
  const counts = countBy(apps, a => a.status);
  const statuses = Object.keys(counts);

  const ctx = document.getElementById('chart-by-status');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: statuses,
      datasets: [{
        data: statuses.map(s => counts[s]),
        backgroundColor: statuses.map(s => STATUS_COLORS[s]),
        borderColor: '#131828',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: { legend: { position: 'bottom', labels: { padding: 12 } } }
    }
  }));
}

function renderTopCompanies(apps) {
  const byCo = groupBy(apps, a => a.company);
  const multi = Object.entries(byCo).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 12);
  const labels = multi.map(([name]) => name);

  const statuses = ['Submitted', 'Rejected'];
  const datasets = statuses.map(status => ({
    label: status,
    data: multi.map(([, items]) => items.filter(a => a.status === status).length),
    backgroundColor: STATUS_COLORS[status],
    borderRadius: 4
  }));

  // Add "Other" status for anything not Submitted/Rejected
  const otherData = multi.map(([, items]) => items.filter(a => !['Submitted', 'Rejected'].includes(a.status)).length);
  if (otherData.some(v => v > 0)) {
    datasets.push({ label: 'Other', data: otherData, backgroundColor: CHART_COLORS.amber, borderRadius: 4 });
  }

  const ctx = document.getElementById('chart-top-companies');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
        y: { stacked: true, grid: { display: false } }
      }
    }
  }));
}

function renderReferralImpact(apps) {
  const withRef = apps.filter(a => a.referral && a.referral.trim());
  const withoutRef = apps.filter(a => !a.referral || !a.referral.trim());
  const refRejected = withRef.filter(a => a.status === 'Rejected').length;
  const noRefRejected = withoutRef.filter(a => a.status === 'Rejected').length;

  const el = document.getElementById('referral-impact-content');
  el.innerHTML = `
    <div class="comparison-grid">
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--accent-teal)">${withRef.length}</div>
        <div class="comparison-label">With Referral</div>
        <div class="comparison-sub">Rejection rate: ${pct(refRejected, withRef.length)}</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--text-secondary)">${withoutRef.length}</div>
        <div class="comparison-label">Without Referral</div>
        <div class="comparison-sub">Rejection rate: ${pct(noRefRejected, withoutRef.length)}</div>
      </div>
    </div>
  `;
}

function renderTargetAnalysis(apps) {
  const target = apps.filter(a => a.targetCompany === true);
  const nonTarget = apps.filter(a => a.targetCompany === false);
  const targetRejected = target.filter(a => a.status === 'Rejected').length;
  const nonTargetRejected = nonTarget.filter(a => a.status === 'Rejected').length;

  const el = document.getElementById('target-analysis-content');
  el.innerHTML = `
    <div class="comparison-grid">
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--accent-teal)">${target.length}</div>
        <div class="comparison-label">Target Companies</div>
        <div class="comparison-sub">Rejection rate: ${pct(targetRejected, target.length)}</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--text-secondary)">${nonTarget.length}</div>
        <div class="comparison-label">Non-Target</div>
        <div class="comparison-sub">Rejection rate: ${pct(nonTargetRejected, nonTarget.length)}</div>
      </div>
    </div>
  `;
}

function renderVelocity(apps) {
  const sorted = [...apps].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return;

  const dailyCounts = countBy(sorted, a => a.date);
  const allDates = Object.keys(dailyCounts).sort();

  // Fill gaps
  const start = new Date(allDates[0] + 'T00:00:00');
  const end = new Date(allDates[allDates.length - 1] + 'T00:00:00');
  const dates = [];
  const counts = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split('T')[0];
    dates.push(key);
    counts.push(dailyCounts[key] || 0);
  }

  // 7-day rolling average
  const rolling = counts.map((_, i) => {
    const window = counts.slice(Math.max(0, i - 6), i + 1);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  // Sample to avoid too many points
  const step = Math.max(1, Math.floor(dates.length / 60));
  const labels = dates.filter((_, i) => i % step === 0).map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const data = rolling.filter((_, i) => i % step === 0);

  const ctx = document.getElementById('chart-velocity');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '7-Day Rolling Avg',
        data,
        borderColor: CHART_COLORS.teal,
        backgroundColor: CHART_COLORS.tealFaded,
        fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
        y: { beginAtZero: true, title: { display: true, text: 'Apps/day' } }
      }
    }
  }));
}

function renderDayHeatmap(apps) {
  const dayCounts = countBy(apps, a => getDayOfWeek(a.date));
  const max = Math.max(...Object.values(dayCounts), 1);

  const el = document.getElementById('heatmap-container');
  el.innerHTML = `<div class="heatmap-grid">${
    DAY_NAMES.map((name, i) => {
      const count = dayCounts[i] || 0;
      const intensity = count / max;
      const bg = `rgba(94, 234, 212, ${0.1 + intensity * 0.6})`;
      return `
        <div class="heatmap-cell" style="background:${bg}">
          <span class="heatmap-day">${name}</span>
          <span class="heatmap-count">${count}</span>
        </div>
      `;
    }).join('')
  }</div>`;
}

function renderMonthlySummary(apps) {
  const byMonth = groupBy(apps, a => getMonthKey(a.date));
  const months = Object.keys(byMonth).sort();

  const rows = months.map(m => {
    const items = byMonth[m];
    const total = items.length;
    const submitted = items.filter(a => a.status === 'Submitted').length;
    const rejected = items.filter(a => a.status === 'Rejected').length;
    return `
      <tr>
        <td>${formatMonthLabel(m)}</td>
        <td class="mono">${total}</td>
        <td class="mono">${submitted}</td>
        <td class="mono">${rejected}</td>
        <td class="mono">${pct(rejected, total)}</td>
      </tr>
    `;
  });

  const el = document.getElementById('monthly-summary-container');
  el.innerHTML = `
    <table class="summary-table">
      <thead>
        <tr>
          <th>Month</th>
          <th>Total</th>
          <th>Submitted</th>
          <th>Rejected</th>
          <th>Rejection Rate</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}
