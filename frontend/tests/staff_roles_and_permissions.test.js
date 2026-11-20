import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Helper functions mirroring App.jsx and AuthContext.jsx logic
function resolveRoleFlags(role, assignedPages = []) {
  const normRole = (role || '').toLowerCase().trim();
  const isSuperadmin = normRole === 'superadmin' || normRole === 'owner';
  const isAccounts =
    normRole === 'accounts' ||
    normRole === 'accountant' ||
    normRole.includes('account') ||
    normRole.includes('finance') ||
    normRole.includes('billing');
  const isManager =
    normRole === 'manager' ||
    normRole.includes('operation') ||
    normRole.includes('manager');
  const isTrainer = normRole === 'trainer' || normRole === 'coach';
  const isMember = normRole === 'member';

  const hasFinancialPermission =
    Array.isArray(assignedPages) &&
    (assignedPages.includes('financials') ||
      assignedPages.includes('invoices') ||
      assignedPages.includes('advance-pay') ||
      assignedPages.includes('payroll') ||
      assignedPages.includes('commissions') ||
      assignedPages.includes('reports'));

  const canEditDelete = isSuperadmin || isAccounts || (!isMember && !isTrainer);
  const canAccessFinancials = isSuperadmin || isAccounts || hasFinancialPermission;

  return {
    isSuperadmin,
    isAccounts,
    isManager,
    isTrainer,
    isMember,
    canEditDelete,
    canAccessFinancials
  };
}

function isTabPermittedForUser(tab, role, assignedPages, canAccessFinancials) {
  const normRole = (role || '').toLowerCase().trim();
  if (normRole === 'superadmin' || normRole === 'owner') return true;
  if (!tab || tab === 'dashboard') return true;

  if (normRole === 'manager' && !canAccessFinancials) {
    const restrictedTabs = ['financials', 'invoices', 'advance-pay', 'payroll', 'reports', 'staff-accounts'];
    if (restrictedTabs.includes(tab)) return false;
  }

  if (!Array.isArray(assignedPages) || assignedPages.length === 0) {
    return true;
  }

  if (assignedPages.includes(tab)) return true;

  if (tab === 'add-member' && (assignedPages.includes('members') || assignedPages.includes('enquiries'))) return true;
  if (tab === 'member-profile' && assignedPages.includes('members')) return true;
  if (tab === 'create-invoice' && (assignedPages.includes('invoices') || assignedPages.includes('financials') || assignedPages.includes('members'))) return true;
  if (tab === 'trainers' && assignedPages.includes('staff-accounts')) return true;
  if (tab === 'consent-forms' && (assignedPages.includes('membership-freeze') || assignedPages.includes('plans') || assignedPages.includes('members'))) return true;
  if (tab === 'privacy-policy' || tab === 'terms-conditions' || tab === 'help-support') return true;

  return false;
}

test('1. Role aliasing: accountant role has isAccounts = true and canAccessFinancials = true', () => {
  const flags = resolveRoleFlags('accountant');
  assert.equal(flags.isAccounts, true);
  assert.equal(flags.canAccessFinancials, true);
  assert.equal(flags.canEditDelete, true);
});

test('2. Role aliasing: accounts role has isAccounts = true and canAccessFinancials = true', () => {
  const flags = resolveRoleFlags('accounts');
  assert.equal(flags.isAccounts, true);
  assert.equal(flags.canAccessFinancials, true);
  assert.equal(flags.canEditDelete, true);
});

test('3. General staff with financial pages has canAccessFinancials = true', () => {
  const flags = resolveRoleFlags('receptionist', ['dashboard', 'members', 'invoices']);
  assert.equal(flags.canAccessFinancials, true);
  assert.equal(flags.canEditDelete, true);
});

test('4. Manager without financial pages cannot access financials, but can edit members', () => {
  const flags = resolveRoleFlags('manager', ['dashboard', 'members', 'attendance']);
  assert.equal(flags.canAccessFinancials, false);
  assert.equal(flags.canEditDelete, true);
});

test('5. Sub-pages: add-member, member-profile, and create-invoice are permitted when parent page is assigned', () => {
  const assigned = ['dashboard', 'members', 'invoices'];
  assert.equal(isTabPermittedForUser('add-member', 'accountant', assigned, true), true);
  assert.equal(isTabPermittedForUser('member-profile', 'accountant', assigned, true), true);
  assert.equal(isTabPermittedForUser('create-invoice', 'accountant', assigned, true), true);
  assert.equal(isTabPermittedForUser('members', 'accountant', assigned, true), true);
  assert.equal(isTabPermittedForUser('invoices', 'accountant', assigned, true), true);
});

test('6. Unassigned tab is safely blocked without breaking permitted flows', () => {
  const assigned = ['dashboard', 'members'];
  // settings is not in assigned
  assert.equal(isTabPermittedForUser('settings', 'staff', assigned, false), false);
  // but members, add-member, member-profile are allowed
  assert.equal(isTabPermittedForUser('members', 'staff', assigned, false), true);
  assert.equal(isTabPermittedForUser('add-member', 'staff', assigned, false), true);
  assert.equal(isTabPermittedForUser('member-profile', 'staff', assigned, false), true);
});

test('7. Owner and Superadmin always have unrestricted tab access', () => {
  const assigned = ['dashboard'];
  assert.equal(isTabPermittedForUser('invoices', 'owner', assigned, true), true);
  assert.equal(isTabPermittedForUser('settings', 'superadmin', assigned, true), true);
  assert.equal(isTabPermittedForUser('add-member', 'owner', assigned, true), true);
});
