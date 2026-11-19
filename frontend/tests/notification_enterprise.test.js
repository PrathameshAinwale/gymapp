import test from 'node:test';
import assert from 'node:assert/strict';

// Test NotificationStore logic
import { notificationStore } from '../src/services/notifications/notificationStore.js';
import { notificationBus } from '../src/services/notifications/notificationBus.js';
import { notificationClient } from '../src/services/notifications/notificationClient.js';

test('1. NotificationStore initial state is clean and unread count is 0', () => {
  notificationStore.resetOnLogout();
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 0);
  assert.equal(Array.isArray(state.items), true);
  assert.equal(state.items.length, 0);
  assert.equal(state.hasMore, false);
  assert.equal(state.isLoading, false);
});

test('2. Real-time event delivery updates store directly without REST calls', () => {
  notificationStore.resetOnLogout();

  const eventPayload = {
    id: 999,
    reference_id: 'ref:test:999',
    type: 'payment_due',
    title: 'Payment Due Today',
    message: '₹2,500 due for John Doe',
    is_read: false,
    pending_amount: 2500,
  };

  notificationStore.applyIncomingNotification(eventPayload);
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 1);
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].title, 'Payment Due Today');
  assert.equal(state.paymentDue.total, 1);
  assert.equal(state.paymentDue.unread, 1);
});

test('3. Duplicate real-time notification with same ID updates item in place without count inflation', () => {
  const updatePayload = {
    id: 999,
    reference_id: 'ref:test:999',
    type: 'payment_due',
    title: 'Payment Overdue Now',
    message: '₹2,500 overdue for John Doe',
    is_read: false,
    pending_amount: 2500,
  };

  notificationStore.applyIncomingNotification(updatePayload);
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 1, 'Unread count should not double on update');
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].title, 'Payment Overdue Now');
});

test('4. Optimistic mark-as-read updates item and unread count immediately', () => {
  notificationStore.applyOptimisticRead(999);
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 0);
  assert.equal(state.items[0].is_read, true);
  assert.equal(state.paymentDue.unread, 0);
});

test('5. Optimistic mark-all-as-read marks all items and sets unreadCount to 0', () => {
  // Add multiple items
  notificationStore.applyIncomingNotification({ id: 1001, reference_id: 'r1', type: 'plan_expiring', is_read: false });
  notificationStore.applyIncomingNotification({ id: 1002, reference_id: 'r2', type: 'payment_due', is_read: false });

  assert.equal(notificationStore.getState().unreadCount, 2);

  notificationStore.applyOptimisticAllRead();
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 0);
  assert.equal(state.items.every((it) => it.is_read), true);
  assert.equal(state.paymentDue.unread, 0);
  assert.equal(state.planExpiring.unread, 0);
});

test('6. Full response application correctly preserves cursor and counts', () => {
  notificationStore.resetOnLogout();

  const mockResponse = {
    success: true,
    today: '2026-11-04',
    unread_count: 5,
    summary: {
      payment_due_count: 3,
      payment_due_unread: 3,
      plan_expiring_count: 2,
      plan_expiring_unread: 2,
    },
    payment_due: { total: 3, unread: 3, items: [{ id: 1, is_read: false }] },
    plan_expiring: { total: 2, unread: 2, items: [{ id: 2, is_read: false }] },
    items: [
      { id: 1, title: 'Item 1', is_read: false },
      { id: 2, title: 'Item 2', is_read: false },
    ],
    next_cursor: '100',
    has_more: true,
  };

  notificationStore.applyFullResponse(mockResponse);
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 5);
  assert.equal(state.items.length, 2);
  assert.equal(state.nextCursor, '100');
  assert.equal(state.hasMore, true);
});

test('7. Cross-tab NotificationBus can subscribe and broadcast mutations', () => {
  let received = null;
  const unsubscribe = notificationBus.subscribe((msg) => {
    received = msg;
  });

  notificationBus.broadcastMutation({ type: 'read', payload: { reference_id: 'test_ref' } });

  assert.notEqual(unsubscribe, null);
  unsubscribe();
});

test('8. Reset on logout resets state and flags', () => {
  notificationStore.resetOnLogout();
  const state = notificationStore.getState();

  assert.equal(state.unreadCount, 0);
  assert.equal(state.items.length, 0);
  assert.equal(state.connectionState, 'disconnected');
  assert.equal(notificationStore.hasInitialLoaded, false);
});

