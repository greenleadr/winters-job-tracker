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

    <!-- Section D: Advanced Insights -->
    <div class="analytics-section">
      <h3 class="section-title">Advanced Insights</h3>
      <div class="analytics-grid cols-2">
        <div class="card">
          <div class="card-header"><span class="card-title">Seniority Level Breakdown</span></div>
          <div class="chart-container h-300"><canvas id="chart-seniority"></canvas></div>
          <div id="seniority-insight" style="margin-top:var(--space-sm)"></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Source Effectiveness Matrix</span></div>
          <div class="chart-container h-300"><canvas id="chart-source-scatter"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Rejection Streak Tracker</span></div>
          <div id="streak-metrics-container"></div>
          <div class="chart-container h-200" style="margin-top:var(--space-md)"><canvas id="chart-streaks"></canvas></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Weekly Goal Tracker</span><span class="card-subtitle" style="font-size:0.75rem;color:var(--text-muted)">Goal: 10 / week</span></div>
          <div class="chart-container h-250"><canvas id="chart-weekly-goal"></canvas></div>
          <div id="goal-summary" style="margin-top:var(--space-sm)"></div>
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
  renderSeniorityBreakdown(apps);
  renderSourceEffectiveness(apps);
  renderRejectionStreaks(apps);
  renderWeeklyGoalTracker(apps);
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

// ============================================
// Advanced Insights
// ============================================

function classifySeniority(title) {
  const t = title.toLowerCase();
  if (/\b(director|vp|vice president|head of)\b/.test(t)) return 'Director / VP / Head';
  if (/\b(principal|staff|group)\b/.test(t)) return 'Principal / Staff / Group';
  if (/\b(senior|sr\.?|lead)\b/.test(t)) return 'Senior / Lead';
  return 'Mid-Level / Other';
}

function renderSeniorityBreakdown(apps) {
  const levels = ['Director / VP / Head', 'Principal / Staff / Group', 'Senior / Lead', 'Mid-Level / Other'];
  const byLevel = {};
  for (const level of levels) byLevel[level] = [];
  for (const app of apps) {
    const level = classifySeniority(app.jobTitle);
    byLevel[level].push(app);
  }

  const labels = levels;
  const totals = levels.map(l => byLevel[l].length);
  const rejections = levels.map(l => byLevel[l].filter(a => a.status === 'Rejected').length);

  const ctx = document.getElementById('chart-seniority');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total Applications',
          data: totals,
          backgroundColor: CHART_COLORS.teal,
          borderRadius: 4
        },
        {
          label: 'Rejections',
          data: rejections,
          backgroundColor: 'rgba(248, 113, 113, 0.6)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { beginAtZero: true, ticks: { stepSize: 10 } },
        y: { grid: { display: false } }
      }
    }
  }));

  // Insight text
  const rates = levels.map(l => ({
    level: l,
    rate: byLevel[l].length ? byLevel[l].filter(a => a.status === 'Rejected').length / byLevel[l].length * 100 : 0,
    count: byLevel[l].length
  })).filter(r => r.count >= 2);

  const best = rates.reduce((a, b) => a.rate < b.rate ? a : b);
  const worst = rates.reduce((a, b) => a.rate > b.rate ? a : b);

  const insightEl = document.getElementById('seniority-insight');
  insightEl.innerHTML = `
    <p style="font-size:0.8125rem;color:var(--text-secondary)">
      Lowest rejection: <strong style="color:var(--accent-teal)">${best.level}</strong> (${best.rate.toFixed(1)}%)
      &nbsp;&bull;&nbsp;
      Highest rejection: <strong style="color:var(--status-rejected)">${worst.level}</strong> (${worst.rate.toFixed(1)}%)
    </p>
  `;
}

function renderSourceEffectiveness(apps) {
  const bySource = groupBy(apps, a => a.source);
  const sources = Object.entries(bySource)
    .filter(([, items]) => items.length >= 3)
    .map(([source, items]) => {
      const rejected = items.filter(a => a.status === 'Rejected').length;
      const rate = rejected / items.length * 100;
      return { source, count: items.length, rate };
    });

  if (sources.length === 0) return;

  const medianCount = sources.map(s => s.count).sort((a, b) => a - b)[Math.floor(sources.length / 2)];
  const medianRate = sources.map(s => s.rate).sort((a, b) => a - b)[Math.floor(sources.length / 2)];

  const colorForRate = (rate) => {
    if (rate < 30) return CHART_COLORS.green;
    if (rate < 50) return CHART_COLORS.amber;
    return CHART_COLORS.rose;
  };

  const data = sources.map(s => ({
    x: s.count,
    y: s.rate,
    label: s.source
  }));

  const pointColors = sources.map(s => colorForRate(s.rate));
  const pointSizes = sources.map(s => Math.max(6, Math.min(20, s.count * 1.5)));

  const ctx = document.getElementById('chart-source-scatter');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Sources',
        data,
        backgroundColor: pointColors,
        pointRadius: pointSizes,
        pointHoverRadius: pointSizes.map(s => s + 3)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pt = ctx.raw;
              return `${pt.label}: ${pt.x} apps, ${pt.y.toFixed(1)}% rejection`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Applications (volume)' },
          beginAtZero: true,
          grid: { color: (ctx) => ctx.tick.value === medianCount ? 'rgba(255,255,255,0.15)' : CHART_COLORS.grid }
        },
        y: {
          title: { display: true, text: 'Rejection Rate %' },
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + '%' },
          grid: { color: (ctx) => ctx.tick.value === Math.round(medianRate) ? 'rgba(255,255,255,0.15)' : CHART_COLORS.grid }
        }
      }
    },
    plugins: [{
      id: 'scatterLabels',
      afterDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.font = "11px 'Inter', sans-serif";
        ctx.fillStyle = CHART_COLORS.text;
        ctx.textAlign = 'center';
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((point, i) => {
          const label = sources[i].source;
          // Truncate long labels
          const short = label.length > 14 ? label.substring(0, 12) + '..' : label;
          ctx.fillText(short, point.x, point.y - pointSizes[i] - 4);
        });
        ctx.restore();
      }
    }]
  }));
}

function renderRejectionStreaks(apps) {
  const sorted = [...apps].sort((a, b) => a.date.localeCompare(b.date));

  const streaks = [];
  let current = 0;
  let inStreak = false;

  for (const app of sorted) {
    if (app.status === 'Rejected') {
      current++;
      inStreak = true;
    } else {
      if (inStreak && current > 0) {
        streaks.push(current);
      }
      current = 0;
      inStreak = false;
    }
  }
  // If the last apps were rejections, that's the current active streak
  const currentStreak = inStreak ? current : 0;
  if (inStreak && current > 0) streaks.push(current);

  const longest = streaks.length ? Math.max(...streaks) : 0;
  const avg = streaks.length ? (streaks.reduce((a, b) => a + b, 0) / streaks.length).toFixed(1) : '0';

  const metricsEl = document.getElementById('streak-metrics-container');
  metricsEl.innerHTML = `
    <div class="streak-metrics">
      <div class="comparison-card">
        <div class="comparison-value" style="color:${currentStreak > 0 ? 'var(--status-rejected)' : 'var(--accent-teal)'}">${currentStreak}</div>
        <div class="comparison-label">Current Streak</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--status-rejected)">${longest}</div>
        <div class="comparison-label">Longest Streak</div>
      </div>
      <div class="comparison-card">
        <div class="comparison-value" style="color:var(--text-secondary)">${avg}</div>
        <div class="comparison-label">Avg Streak</div>
      </div>
    </div>
  `;

  // Streak bar chart
  if (streaks.length === 0) return;
  const ctx = document.getElementById('chart-streaks');
  if (!ctx) return;

  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: streaks.map((_, i) => `#${i + 1}`),
      datasets: [{
        label: 'Streak Length',
        data: streaks,
        backgroundColor: streaks.map(s => s >= longest ? 'rgba(248, 113, 113, 0.8)' : 'rgba(248, 113, 113, 0.4)'),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Streak #' } },
        y: { beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Consecutive Rejections' } }
      }
    }
  }));
}

function renderWeeklyGoalTracker(apps) {
  const WEEKLY_GOAL = 10;
  const byWeek = groupBy(apps, a => getWeekKey(a.date));
  const weeks = Object.keys(byWeek).sort();
  const counts = weeks.map(w => byWeek[w].length);

  const labels = weeks.map(w => {
    const d = new Date(w + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const hitWeeks = counts.filter(c => c >= WEEKLY_GOAL).length;

  const ctx = document.getElementById('chart-weekly-goal');
  if (!ctx) return;
  charts.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Applications',
        data: counts,
        backgroundColor: counts.map(c => c >= WEEKLY_GOAL ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.5)'),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        annotation: undefined
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 45, maxTicksLimit: 15 } },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 5 },
          grid: {
            color: (ctx) => {
              if (ctx.tick.value === WEEKLY_GOAL) return 'rgba(94, 234, 212, 0.5)';
              return CHART_COLORS.grid;
            },
            lineWidth: (ctx) => ctx.tick.value === WEEKLY_GOAL ? 2 : 1
          }
        }
      }
    },
    plugins: [{
      id: 'goalLine',
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const goalY = yScale.getPixelForValue(WEEKLY_GOAL);
        const { ctx, chartArea } = chart;
        ctx.save();
        ctx.strokeStyle = 'rgba(94, 234, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, goalY);
        ctx.lineTo(chartArea.right, goalY);
        ctx.stroke();
        // Label
        ctx.fillStyle = CHART_COLORS.teal;
        ctx.font = "500 11px 'Inter', sans-serif";
        ctx.textAlign = 'right';
        ctx.fillText('Goal: 10', chartArea.right - 4, goalY - 6);
        ctx.restore();
      }
    }]
  }));

  // Summary
  const summaryEl = document.getElementById('goal-summary');
  summaryEl.innerHTML = `
    <p class="goal-summary-text">
      Hit goal <strong class="goal-hit">${hitWeeks}</strong> of <strong>${weeks.length}</strong> weeks
      (<strong>${weeks.length ? (hitWeeks / weeks.length * 100).toFixed(0) : 0}%</strong>)
    </p>
  `;
}
