const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve) => {
    const postData = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 8000,
      path: `/api/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, msg: json.message || (json.success ? 'SUCCESS' : 'ERROR') });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data.slice(0, 100) });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== TESTING OWNER MODULE CRUD PERSISTENCE IN DATABASE ===\n');

  // 1. Members
  console.log('1. Members:');
  const addMem = await request('POST', '/members', {
    name: 'Test Persistent Member',
    email: `testmem_${Date.now()}@pulsefit.in`,
    phone: '+91 99999 11111',
    plan_id: 1,
    status: 'Active',
    gender: 'Male',
    age: 28
  });
  console.log(' - POST:', addMem.status, addMem.data?.success ? `OK (ID: ${addMem.data?.data?.id})` : addMem.msg || addMem.raw);
  const memId = addMem.data?.data?.id;
  if (memId) {
    const updMem = await request('PUT', `/members/${memId}`, { name: 'Test Member Updated' });
    console.log(' - PUT:', updMem.status, updMem.data?.success ? 'OK' : updMem.msg || updMem.raw);
    const delMem = await request('DELETE', `/members/${memId}`);
    console.log(' - DELETE:', delMem.status, delMem.data?.success ? 'OK' : delMem.msg || delMem.raw);
  }

  // 2. Trainers
  console.log('\n2. Trainers:');
  const addTrn = await request('POST', '/trainers', {
    name: 'Coach Test Persist',
    email: `testtrn_${Date.now()}@pulsefit.in`,
    phone: '+91 99999 33333',
    specialty: 'CrossFit & Conditioning',
    experience: '5 Years',
    monthlySalary: 50000
  });
  console.log(' - POST:', addTrn.status, addTrn.data?.success ? `OK (ID: ${addTrn.data?.data?.id})` : addTrn.msg || addTrn.raw);
  const trnId = addTrn.data?.data?.id;
  if (trnId) {
    const updTrn = await request('PUT', `/trainers/${trnId}`, { specialty: 'Olympic Weightlifting' });
    console.log(' - PUT:', updTrn.status, updTrn.data?.success ? 'OK' : updTrn.msg || updTrn.raw);
    const delTrn = await request('DELETE', `/trainers/${trnId}`);
    console.log(' - DELETE:', delTrn.status, delTrn.data?.success ? 'OK' : delTrn.msg || delTrn.raw);
  }

  // 3. Plans
  console.log('\n3. Membership Plans:');
  const addPlan = await request('POST', '/plans', {
    name: 'Platinum Test Plan',
    duration_months: 6,
    price: 7999,
    features: ['Unlimited Gym Floor', 'Locker Room', 'Steam Bath'],
    category: 'Premium Tier'
  });
  console.log(' - POST:', addPlan.status, addPlan.data?.success ? `OK (ID: ${addPlan.data?.data?.id})` : addPlan.msg || addPlan.raw);
  const planId = addPlan.data?.data?.id;
  if (planId) {
    const updPlan = await request('PUT', `/plans/${planId}`, { price: 8499 });
    console.log(' - PUT:', updPlan.status, updPlan.data?.success ? 'OK' : updPlan.msg || updPlan.raw);
    const delPlan = await request('DELETE', `/plans/${planId}`);
    console.log(' - DELETE:', delPlan.status, delPlan.data?.success ? 'OK' : delPlan.msg || delPlan.raw);
  }

  // 4. Classes & Schedules
  console.log('\n4. Classes:');
  const addCls = await request('POST', '/classes', {
    name: 'Power Zumba Bootcamp',
    time: '06:00 PM - 07:00 PM',
    capacity: 25,
    days: ['Mon', 'Wed', 'Fri'],
    category: 'Dance Fitness',
    room: 'Studio 2'
  });
  console.log(' - POST:', addCls.status, addCls.data?.success ? `OK (ID: ${addCls.data?.data?.id})` : addCls.msg || addCls.raw);

  // 5. Enquiries / Leads
  console.log('\n5. Leads & Enquiries:');
  const addEnq = await request('POST', '/enquiries', {
    name: 'Rajesh Lead Test',
    phone: '+91 98888 12345',
    email: 'rajesh.lead@example.com',
    source: 'Walk-in',
    interested_plan: 'Gold Quarterly Fitness',
    goal: 'Fat Loss',
    status: 'Hot',
    notes: 'Interested in evening batches'
  });
  console.log(' - POST:', addEnq.status, addEnq.data?.success ? `OK (ID: ${addEnq.data?.data?.id})` : addEnq.msg || addEnq.raw);
  const enqId = addEnq.data?.data?.id;
  if (enqId) {
    const updEnq = await request('PUT', `/enquiries/${enqId}`, { status: 'Converted', notes: 'Converted successfully' });
    console.log(' - PUT:', updEnq.status, updEnq.data?.success ? 'OK' : updEnq.msg || updEnq.raw);
    const delEnq = await request('DELETE', `/enquiries/${enqId}`);
    console.log(' - DELETE:', delEnq.status, delEnq.data?.success ? 'OK' : delEnq.msg || delEnq.raw);
  }

  // 6. Expenses & Financials
  console.log('\n6. Expenses:');
  const addExp = await request('POST', '/expenses', {
    title: 'Electricity Bill September',
    category: 'Utilities & Power',
    amount: 14500,
    date: '2026-09-10',
    payment_method: 'Net Banking',
    notes: 'Power backup generator included'
  });
  console.log(' - POST:', addExp.status, addExp.data?.success ? `OK (ID: ${addExp.data?.data?.id})` : addExp.msg || addExp.raw);
  const expId = addExp.data?.data?.id;
  if (expId) {
    const delExp = await request('DELETE', `/expenses/${expId}`);
    console.log(' - DELETE:', delExp.status, delExp.data?.success ? 'OK' : delExp.msg || delExp.raw);
  }

  // 7. Equipment
  console.log('\n7. Equipment:');
  const addEq = await request('POST', '/equipment', {
    name: 'Hack Squat Machine Pro',
    brand: 'Hammer Strength',
    category: 'Free Weights & Racks',
    location: 'Zone A - Heavy Iron',
    status: 'Operational',
    condition: 'Excellent',
    last_service_date: '2026-09-01',
    next_service_due: '2026-12-01'
  });
  console.log(' - POST:', addEq.status, addEq.data?.success ? `OK (ID: ${addEq.data?.data?.id})` : addEq.msg || addEq.raw);
  const eqId = addEq.data?.data?.id;
  if (eqId) {
    const delEq = await request('DELETE', `/equipment/${eqId}`);
    console.log(' - DELETE:', delEq.status, delEq.data?.success ? 'OK' : delEq.msg || delEq.raw);
  }

  // 8. Products & Store
  console.log('\n8. Products:');
  const addProd = await request('POST', '/products', {
    name: 'Whey Isolate Protein 1kg Chocolate',
    category: 'Supplements',
    price: 2899,
    stock: 15,
    minStockAlert: 3
  });
  console.log(' - POST:', addProd.status, addProd.data?.success ? `OK (ID: ${addProd.data?.data?.numericId})` : addProd.msg || addProd.raw);
  const prodId = addProd.data?.data?.numericId;
  if (prodId) {
    const updProd = await request('PUT', `/products/${prodId}`, { price: 2999, stock: 20 });
    console.log(' - PUT:', updProd.status, updProd.data?.success ? 'OK' : updProd.msg || updProd.raw);
    const delProd = await request('DELETE', `/products/${prodId}`);
    console.log(' - DELETE:', delProd.status, delProd.data?.success ? 'OK' : delProd.msg || delProd.raw);
  }

  // 9. Trainer Commissions
  console.log('\n9. Commissions:');
  const addCom = await request('POST', '/commissions', {
    trainer_name: 'Coach Alex Rivers',
    member_name: 'Aarav Sharma',
    plan_name: '1-on-1 PT Master Tier (12 Sessions)',
    session_type: 'Personal Training (PT)',
    amount: 12000,
    rate_percent: 20,
    date: '2026-09-11'
  });
  console.log(' - POST:', addCom.status, addCom.data?.success ? `OK (ID: ${addCom.data?.data?.numericId})` : addCom.msg || addCom.raw);
  const comId = addCom.data?.data?.numericId;
  if (comId) {
    const updCom = await request('PATCH', `/commissions/${comId}/status`, { status: 'Paid' });
    console.log(' - PATCH (Mark Paid):', updCom.status, updCom.data?.success ? 'OK' : updCom.msg || updCom.raw);
  }

  // 10. Membership Freezes
  console.log('\n10. Freezes:');
  const addFrz = await request('POST', '/freezes', {
    member_id: 1,
    member_name: 'Aarav Sharma',
    plan_name: 'Gold Quarterly Fitness',
    freeze_start_date: '2026-09-15',
    freeze_end_date: '2026-09-30',
    days_frozen: 15,
    reason: 'Medical recovery leave'
  });
  console.log(' - POST:', addFrz.status, addFrz.data?.success ? `OK (ID: ${addFrz.data?.data?.numericId})` : addFrz.msg || addFrz.raw);
  const frzId = addFrz.data?.data?.numericId;
  if (frzId) {
    const unfrz = await request('PATCH', `/freezes/${frzId}/unfreeze`);
    console.log(' - PATCH (Unfreeze):', unfrz.status, unfrz.data?.success ? 'OK' : unfrz.msg || unfrz.raw);
  }

  // 11. Digital Consent Forms
  console.log('\n11. Consent Forms:');
  const addCf = await request('POST', '/consent-forms', {
    member_name: 'Aarav Sharma',
    phone: '+91 98765 43210',
    plan_name: 'Gold Quarterly Fitness',
    emergency_contact: 'Neha Sharma',
    emergency_phone: '+91 98765 11223',
    medical_conditions: 'None reported'
  });
  console.log(' - POST:', addCf.status, addCf.data?.success ? `OK (ID: ${addCf.data?.data?.numericId})` : addCf.msg || addCf.raw);

  // 12. Payroll
  console.log('\n12. Payroll:');
  const payRes = await request('PATCH', '/payroll/1/pay');
  console.log(' - PATCH (Mark Paid):', payRes.status, payRes.data?.success ? 'OK' : payRes.msg || payRes.raw);

  // 13. Invoices / Payments
  console.log('\n13. Invoices:');
  const addInv = await request('POST', '/invoices', {
    user_id: 5,
    plan_id: 1,
    amount: 4999,
    payment_method: 'UPI',
    status: 'Paid',
    paid_at: '2026-09-11'
  });
  console.log(' - POST:', addInv.status, addInv.data?.success ? `OK (ID: ${addInv.data?.data?.id})` : addInv.msg || addInv.raw);

  // 14. Gym Settings
  console.log('\n14. Gym Settings:');
  const updGym = await request('PUT', '/gym-info', {
    name: 'PULSE FIT ATHLETIC CLUB',
    tagline: 'India\'s Premier Strength & Conditioning Hub',
    phone: '+91 98201 54321'
  });
  console.log(' - PUT:', updGym.status, updGym.data?.success ? 'OK' : updGym.msg || updGym.raw);

  console.log('\n=== TESTING COMPLETED ===');
}

runTests();
