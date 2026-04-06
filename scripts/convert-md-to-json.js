const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '..', 'job_application_index.md'), 'utf-8');
const lines = md.split('\n').filter(l => l.startsWith('|'));

// Skip header row and separator
const dataLines = lines.slice(2);

const applications = dataLines.map(line => {
  // Split by | but keep empty cells — slice off first/last empty entries from leading/trailing |
  const cols = line.split('|').slice(1, -1).map(c => c.trim());
  if (cols.length < 10) return null;

  const id = parseInt(cols[0], 10);
  if (isNaN(id)) return null;

  const targetRaw = (cols[9] || '').toLowerCase();
  let targetCompany = null;
  if (targetRaw === 'yes') targetCompany = true;
  else if (targetRaw === 'no') targetCompany = false;

  return {
    id,
    jobTitle: cols[1],
    company: cols[2],
    industry: cols[3],
    date: cols[4],
    status: cols[5],
    location: cols[6] || '',
    source: cols[7],
    referral: cols[8] || '',
    targetCompany
  };
}).filter(Boolean);

const output = JSON.stringify(applications, null, 2);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'applications.json'), output);
console.log(`Converted ${applications.length} applications to JSON.`);
