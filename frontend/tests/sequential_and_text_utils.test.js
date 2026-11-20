import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toTitleCase, handleTitleCaseChange } from '../src/utils/textUtils.js';
import { getFinancialYearCode, isSequentialId } from '../src/utils/sequentialId.js';

describe('Part 1: Indian Financial Year (FY) Code & Sequential ID Validation', () => {
  test('Financial Year boundary: 31 Mar 23:59:59 IST is FY25', () => {
    // 31 March 2026 23:59:59 IST
    const dateStr = '2026-03-31T23:59:59+05:30';
    const fy = getFinancialYearCode(dateStr);
    assert.equal(fy, '25');
  });

  test('Financial Year boundary: 1 Apr 00:00:00 IST is FY26', () => {
    // 1 April 2026 00:00:00 IST
    const dateStr = '2026-04-01T00:00:00+05:30';
    const fy = getFinancialYearCode(dateStr);
    assert.equal(fy, '26');
  });

  test('Financial Year boundary: 1 Apr 00:30:00 IST when timestamp is UTC (31 Mar 19:00:00 UTC) is FY26', () => {
    const dateUtc = '2026-03-31T19:00:00.000Z';
    const fy = getFinancialYearCode(dateUtc);
    assert.equal(fy, '26');
  });

  test('Financial Year boundary: 31 Mar 2027 23:59:59 IST is FY26', () => {
    const dateStr = '2027-03-31T23:59:59+05:30';
    const fy = getFinancialYearCode(dateStr);
    assert.equal(fy, '26');
  });

  test('Financial Year boundary: 1 Apr 2027 00:00:00 IST is FY27', () => {
    const dateStr = '2027-04-01T00:00:00+05:30';
    const fy = getFinancialYearCode(dateStr);
    assert.equal(fy, '27');
  });

  test('Financial Year 4-digit span for Invoices (e.g. 2627 for FY26-27, 2728 for FY27-28)', () => {
    // Current FY (2026-2027) -> '2627'
    const fy2627 = getFinancialYearCode('2026-11-20T10:00:00+05:30', true);
    assert.equal(fy2627, '2627');

    // Next FY boundary (1 Apr 2027) -> '2728'
    const fy2728 = getFinancialYearCode('2027-04-01T00:00:00+05:30', true);
    assert.equal(fy2728, '2728');
  });

  test('Sequential ID format verification', () => {
    assert.equal(isSequentialId('INV26270001'), true);
    assert.equal(isSequentialId('INV27280001'), true);
    assert.equal(isSequentialId('INV260001'), true);
    assert.equal(isSequentialId('MEM260005'), true);
    assert.equal(isSequentialId('ENQ260012'), true);
    assert.equal(isSequentialId('INV2710000'), true); // 5 digits > 9999
    assert.equal(isSequentialId('RANDOM-1234'), false);
    assert.equal(isSequentialId('mem-15'), false);
  });
});

describe('Part 2: Auto-capitalization Title-Case Utilities', () => {
  test('toTitleCase capitalizes first letter of every word', () => {
    assert.equal(toTitleCase('rahul sharma'), 'Rahul Sharma');
    assert.equal(toTitleCase('123 main street, apt 4b'), '123 Main Street, Apt 4b');
    assert.equal(toTitleCase('pt session with vip coach'), 'Pt Session With Vip Coach');
    assert.equal(toTitleCase('john-doe'), 'John-Doe');
    assert.equal(toTitleCase('cardio / strength / yoga'), 'Cardio / Strength / Yoga');
    assert.equal(toTitleCase('athlete (quarterly plan)'), 'Athlete (Quarterly Plan)');
  });

  test('toTitleCase preserves existing uppercase acronyms and letters', () => {
    assert.equal(toTitleCase('VIP Platinum Pass'), 'VIP Platinum Pass');
    assert.equal(toTitleCase('PT Trainer Alex'), 'PT Trainer Alex');
    assert.equal(toTitleCase('100KG Bench Press'), '100KG Bench Press');
  });

  test('toTitleCase handles empty and non-string values gracefully', () => {
    assert.equal(toTitleCase(''), '');
    assert.equal(toTitleCase(null), null);
    assert.equal(toTitleCase(undefined), undefined);
  });

  test('handleTitleCaseChange updates value and invokes callback', () => {
    let capturedValue = '';
    const fakeEvent = {
      target: {
        value: 'vikramaditya sharma',
        selectionStart: 19,
        setSelectionRange: (start, end) => {
          assert.equal(start, 19);
          assert.equal(end, 19);
        }
      }
    };

    handleTitleCaseChange(fakeEvent, (e) => {
      capturedValue = e.target.value;
    });

    assert.equal(fakeEvent.target.value, 'Vikramaditya Sharma');
    assert.equal(capturedValue, 'Vikramaditya Sharma');
  });
});
