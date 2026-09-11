const http = require('http');

const endpoints = [
  { name: 'gym-info', url: '/api/v1/gym-info' },
  { name: 'members', url: '/api/v1/members' },
  { name: 'trainers', url: '/api/v1/trainers' },
  { name: 'plans', url: '/api/v1/plans' },
  { name: 'classes', url: '/api/v1/classes' },
  { name: 'expenses', url: '/api/v1/expenses' },
  { name: 'enquiries', url: '/api/v1/enquiries' },
  { name: 'equipment', url: '/api/v1/equipment' },
  { name: 'products', url: '/api/v1/products' },
  { name: 'commissions', url: '/api/v1/commissions' },
  { name: 'freezes', url: '/api/v1/freezes' },
  { name: 'consent-forms', url: '/api/v1/consent-forms' },
  { name: 'payroll', url: '/api/v1/payroll' },
  { name: 'attendance', url: '/api/v1/attendance' },
  { name: 'invoices', url: '/api/v1/invoices' }
];

async function testEndpoint(ep) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:8000${ep.url}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ name: ep.name, status: res.statusCode, ok: json.success !== false, count: Array.isArray(json.data) ? json.data.length : (json.data ? 1 : 0) });
        } catch (e) {
          resolve({ name: ep.name, status: res.statusCode, ok: false, error: data.substring(0, 100) });
        }
      });
    });
    req.on('error', (err) => resolve({ name: ep.name, ok: false, error: err.message }));
  });
}

async function run() {
  console.log('--- Testing API GET Endpoints ---');
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    console.log(`${res.name.padEnd(16)}: [${res.status}] ok=${res.ok} count=${res.count ?? 'N/A'} ${res.error || ''}`);
  }
}

run();
