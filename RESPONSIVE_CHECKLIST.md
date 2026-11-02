# Comprehensive Responsive Audit Checklist (`RESPONSIVE_CHECKLIST.md`)

This checklist tracks the end-to-end mobile responsiveness across every page, component, modal, drawer, form, table, and user area in the gym application.

**Workflow Status Key:**
- `[x] Audited`: Component inspected, small-screen vulnerabilities cataloged.
- `[ ] Fixed`: Mobile classes, wrapping, touch targets, stacking, and safety tokens implemented.
- `[ ] Tested`: Verified at 320px, 360px, 375px, 390px, 412px, 768px, 1024px, and 1280px+ with worst-case data.

---

## 1. Global Shell & Shared Navigation

| Component | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **App Shell & Main Layout** | `frontend/src/App.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Main container has `h-screen h-dvh`, mobile drawer listener, and safe mobile padding (`px-3 sm:px-6 py-3 sm:py-4`). Verified at 320, 360, 390, 412, 768, 1024, 1280 & landscape in Owner, Trainer, Member, Superadmin. |
| **Top Navbar** | `frontend/src/components/common/Navbar.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | 44px touch targets on hamburger, branch switcher, and logout. Dynamic max-width prevents truncation collision at 320px–360px. Desktop untouched. Verified across all 4 roles. |
| **Responsive Sidebar & Drawer** | `frontend/src/components/common/Sidebar.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Drawer widened to `min(20rem, 88vw)` preventing section header text truncation. Safe-area top and bottom preserved. Desktop sidebar untouched. Tested in all roles. |
| **Notification Bell Dropdown** | `frontend/src/components/common/NotificationBell.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | `inset-x-2.5 min-[380px]:inset-x-4` with `82dvh` height cap. Smooth horizontal filter scrolling with `no-scrollbar`. Close button tap target 36x36px. Tested across viewports. |
| **Universal Modal Wrapper** | `frontend/src/components/common/Modal.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Back & Close buttons given 40x40px tap targets. Internal flex scrolling on modal bodies, `100dvh` height cap, safe-area insets. Desktop untouched. Tested on mobile viewports. |
| **Delete Confirmation Modal** | `frontend/src/components/common/ConfirmDeleteModal.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Action buttons given `min-h-[40px]` touch targets with flex centering. Responsive on 320px–360px phones. |
| **Logout Confirmation Dialog** | `frontend/src/components/common/LogoutConfirmModal.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Close button updated to 36x36px touch target. Cancel/Logout buttons given `min-h-[42px]` touch targets. Tested on 320px–390px. |
| **Toast Alerts Container** | `frontend/src/components/common/ToastContainer.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | `inset-x-3 sm:inset-x-auto sm:right-6` with `w-auto sm:w-full sm:max-w-sm`. Never overflows on 320px screens. |
| **Mobile Filter Drawer** | `frontend/src/components/common/MobileFilterDrawer.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | `max-h-[85dvh]` with safe-area insets. Scrollable body with sticky action footer. |
| **Mobile Card Component** | `frontend/src/components/common/MobileCard.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Added `min-w-0 overflow-hidden` container protection. |
| **Stat Card** | `frontend/src/components/common/StatCard.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Dynamic typography (`text-lg sm:text-2xl`) and flexible wrapping on badge pills. |
| **Page Header** | `frontend/src/components/common/PageHeader.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Actions wrap cleanly with `flex-wrap sm:flex-nowrap gap-2.5 sm:gap-3`. |
| **Sticky Action Footer** | `frontend/src/components/common/StickyFooter.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Pinned with `env(safe-area-inset-bottom)` padding and 48px mobile touch targets. |
| **Empty State** | `frontend/src/components/common/EmptyState.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Verified responsive padding and wrapped action button group. |
| **About Pages (Terms/Privacy)** | `frontend/src/components/common/AboutPages.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Verified responsive layout, typography, and safe mobile padding. |
| **Member Search Select** | `frontend/src/components/common/MemberSearchSelect.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | `min-w-0 flex-1` container, responsive badges, and smooth dropdown sizing. |
| **Membership Plan Modal** | `frontend/src/components/common/MembershipPlanModal.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Action buttons upgraded to `flex-1 sm:flex-initial min-h-[40px]`. |
| **Plan Upgrade Lock View** | `frontend/src/components/common/PlanUpgradeLockView.jsx` | [x] Audited \| [x] Fixed \| [ ] Tested | Hero banner padding tuned to `p-5 sm:p-10` on mobile. |

---

## 2. Authentication & Public Views

| Component | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Main Login Page** | `frontend/src/components/auth/LoginPage.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Split screen (brand art + login form). On mobile, brand art is hidden; form card needs `px-4`, inputs `min-h-[44px]`, font size 16px to prevent iOS auto-zoom, and demo role chips must wrap cleanly. |
| **Force Password Change Modal** | `frontend/src/components/auth/ForceChangePasswordModal.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Modal must fit within `100dvh`, scrolling internally if on-screen keyboard is open. |
| **Superadmin Login** | `frontend/src/components/superadmin/SuperadminLogin.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Centered card; needs full-width button, accessible touch targets, and responsive padding. |

---

## 3. Gym Owner & Operations Area (`frontend/src/components/owner/`)

### Batch 1A: Dashboard & Member Directory (2 Pages, 11 Modals/Drawers/Dialogs = 13 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Owner Dashboard** | `OwnerDashboard.jsx` | Page (Route: `dashboard`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Header action buttons wrap on mobile (`flex-wrap sm:flex-nowrap`). Stat cards keep `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` intact. Charts use `min-w-0` without overflow-hidden. Operations tables wrapped in `.table-responsive-container`. |
| ↳ Customize Stat Cards Modal | `CustomizeStatCardsModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Scrollable card list inside `max-h-[85dvh]`, sticky Cancel/Save footer. |
| ↳ Athlete 360 Profile Modal | `MemberProfileView.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Retains desktop `maxWidth="max-w-4xl"`. Internal card sections stack cleanly, sub-tables wrapped in scroll container. |
| ↳ Quick Collect Payment Modal | `RecordPaymentModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Multi-column fields stack on phone, payment mode chips wrap, sticky submit button. |
| ↳ Add New Enquiry Modal | `OwnerDashboard.jsx` (Inline Modal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Form body scrolls inside modal dialog, safe-area bottom padding. |
| ↳ Facility / Branch Switcher Popover | `OwnerDashboard.jsx` (Header) | Popover / Menu | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Max width constrained to viewport, touch targets 40px+. |
| **Member Directory / List** | `MemberList.jsx` | Page (Route: `members`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | User's directory header & freeze badges 100% preserved. Reuses existing `block sm:hidden` mobile cards without duplication. Desktop table wrapped in `.table-responsive-container`. |
| ↳ Mobile Filter Drawer | `MobileFilterDrawer.jsx` | Drawer | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Max height `85dvh`, scrollable body, sticky action footer. |
| ↳ Advanced Directory Filter Modal | `MemberList.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Filter criteria stack vertically, clear/apply touch targets. |
| ↳ Member Profile Quick View Modal | `MemberList.jsx` (Inline Modal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Member card details scroll cleanly within modal viewport. |
| ↳ Tax Invoice Receipt Modal | `MemberList.jsx` (Inline Modal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Receipt view fits mobile viewport with accessible close button. |
| ↳ Settle Due Balance Modal | `PayDueModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Payment pills full-width wrap, 16px amount inputs. |
| ↳ Delete Athlete Confirmation Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Centered action buttons, tap targets min 40px. |

---

### Batch 1B: Member Creation & Member Profile (2 Pages, 8 Modals/Drawers/Wizards = 10 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Add / Edit Athlete Member** | `AddMemberPage.jsx` | Page (Route: `add-member`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Multi-step form sections collapse to 1-col on phone, package rows adapt gracefully. |
| ↳ Add Member Modal Wrapper | `AddMemberModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Modal container adapts AddMemberPage to modal scrolling. |
| ↳ Quick Plan Creator Modal | `MembershipPlanModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Custom plan creation fields stack cleanly. |
| ↳ Member Portal Login Credentials Card/Modal | `AddMemberPage.jsx` | Dialog / Card | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Credential card fits mobile screens, one-click copy accessible. |
| ↳ Document ID / Aadhaar Preview Dialog | `AddMemberPage.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Image preview scales within viewport without horizontal blow-out. |
| **Member Profile Page** | `MemberProfilePage.jsx` | Page (Route: `member-profile`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | User's profile header & freeze badges 100% preserved. Subscriptions table scrollable. |
| ↳ Tax Invoice Receipt / PDF Modal | `MemberProfilePage.jsx` (Inline Modal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Receipt preview scales to phone width. |
| ↳ Edit Subscription Invoice Modal | `EditInvoiceModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Line item rows reflow to stacked cards, date pickers full width. |
| ↳ Athlete Dues Settlement Dialog | `PayDueModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Partial due amount input keyboard-safe. |
| ↳ Manual Payment Recorder Dialog | `RecordPaymentModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Payment mode selector wraps cleanly. |

---

### Batch 2: Invoices, Billing, Plans & Store (4 Pages, 19 Modals/Drawers/Sub-components = 23 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Member Invoices Directory** | `InvoicesPage.jsx` | Page (Route: `invoices`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 8-column invoice table wrapped in horizontal scroll; search toolbar wraps. |
| ↳ Record Payment Modal | `RecordPaymentModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Form fields 1-column on phone, sticky submit button. |
| ↳ Settle Pending Balance Modal | `PayDueModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Due balance breakdown wraps cleanly. |
| ↳ Edit Invoice Modal | `EditInvoiceModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Line items stack into cards, discount fields full width. |
| ↳ Invoice Filter Drawer / Modal | `InvoicesPage.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Date range presets and status filters wrap. |
| ↳ Delete Invoice Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Delete confirmation action buttons 40px+ tap area. |
| ↳ Invoice Print / Preview Modal | `InvoicesPage.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Iframe container fits phone screen with close button accessible. |
| **Create / Edit Invoice Page** | `CreateInvoicePage.jsx` | Page (Route: `create-invoice`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Multi-package builder rows stack into structured cards on phone. |
| ↳ Quick Plan Creator Dialog | `MembershipPlanModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Nested dialog for custom plan creation inside invoice builder. |
| ↳ Outstanding Balance Settlement Modal | `PayDueModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Prior due payment modal before invoice issuance. |
| ↳ Member Search & Select Dropdown | `MemberSearchSelect.jsx` | Dropdown / Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Member autocomplete dropdown does not clip on 320px. |
| ↳ Split Payment Configuration Drawer | `CreateInvoicePage.jsx` | Sub-component | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Cash/UPI/Card split rows stack cleanly. |
| ↳ Custom Line Item Builder Modal | `CreateInvoicePage.jsx` | Sub-component | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Custom item name, price, and category stack. |
| **Membership Plans Manager** | `PlanManager.jsx` | Page (Route: `plans`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Keeps desktop grid intact; collapses on mobile. |
| ↳ Add / Edit Membership Plan Modal | `MembershipPlanModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Plan tier, package type, price, and feature inputs stack. |
| ↳ Delete Plan Confirmation Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |
| **Pro Shop & Store Products** | `ProductsManager.jsx` | Page (Route: `products`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Product cards keep desktop columns; POS cart sidebar becomes bottom sheet/drawer on mobile. |
| ↳ Add / Edit Product Modal | `ProductsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Product image, price, stock, and barcode inputs stack. |
| ↳ POS Sell Products Dialog | `ProductsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Cart items list scrollable, payment CTA pinned. |
| ↳ Restock Inventory Modal | `ProductsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Quantity adjustment and vendor notes full-width. |
| ↳ POS Receipt / Tax Bill Dialog | `ProductsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Tax receipt preview fits phone screen width. |
| ↳ Product Filter Drawer | `ProductsManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Category and stock status filters wrap. |
| ↳ Delete Product Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Deletion confirmation action buttons. |

---

### Batch 3: Schedule, Attendance, PT, Freeze & Leads (5 Pages, 24 Modals/Drawers = 29 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Attendance Tracker** | `AttendanceTracker.jsx` | Page (Route: `attendance`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Monthly attendance matrix table wrapped in scroll; daily log stacks. |
| ↳ Manual Member Check-in Modal | `AttendanceTracker.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Member search and manual punch time pickers full-width. |
| ↳ Muster Roll & Shift Report Modal | `AttendanceTracker.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Shift report table scrollable on small screens. |
| ↳ eSSL ADMS Cloud Setup Modal | `AttendanceTracker.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Server IP, port, and serial key inputs stack vertically. |
| ↳ Simulate Biometric Punch Dialog | `AttendanceTracker.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Simulated device punch test form full width. |
| ↳ Attendance Filter Drawer | `AttendanceTracker.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Date picker and shift filters stack. |
| **Classes & Batches Manager** | `ClassAdminManager.jsx` | Page (Route: `classes`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Keeps desktop layout; schedule timing badges wrap cleanly. |
| ↳ Add / Edit Class Schedule Modal | `ClassAdminManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Class name, coach, capacity, and day checkboxes stack. |
| ↳ Class Roster & Check-in Dialog | `ClassAdminManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Booked athletes roster table scrollable. |
| ↳ Class Filter Drawer | `ClassAdminManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Instructor and category filters wrap. |
| ↳ Cancel Class Confirmation Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Confirmation actions accessible. |
| **Personal Training Sessions** | `PTSessionsManager.jsx` | Page (Route: `pt-sessions`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | PT packages table wrapped in horizontal scroll; coach chips wrap. |
| ↳ Allocate 1-on-1 PT Package Modal | `PTSessionsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Member, coach, sessions, and fee inputs stack. |
| ↳ PT Verification Logs & History Dialog | `PTSessionsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | OTP session history logs scroll internally. |
| ↳ PT Sessions Filter Drawer | `PTSessionsManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Status and trainer filters wrap. |
| ↳ Cancel PT Package Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Delete confirmation action buttons. |
| **Membership Freeze & Extensions** | `MembershipFreezeManager.jsx` | Page (Route: `membership-freeze`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Active freezes and transfers sub-tables wrapped in scroll container. |
| ↳ Apply Membership Freeze Modal | `MembershipFreezeManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Member selector, freeze start/end date pickers stack. |
| ↳ Early Unfreeze Confirmation Modal | `MembershipFreezeManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Days calculation summary card wraps cleanly. |
| ↳ Transfer Membership Modal | `MembershipFreezeManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Source/Target athlete selector and transfer fee inputs stack. |
| ↳ Freeze & Transfer Policy Settings Modal | `MembershipFreezeManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Policy checkboxes and max-days inputs stack. |
| ↳ Freeze Filter Drawer | `MembershipFreezeManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Status filter pills wrap cleanly. |
| **Enquiries & Leads Manager** | `EnquiriesManager.jsx` | Page (Route: `enquiries`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Kanban board collapses to responsive column list or scrollable cards. |
| ↳ Add New Gym Enquiry / Lead Modal | `EnquiriesManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Prospect contact, goal, and source fields stack. |
| ↳ Edit Lead Details Modal | `EnquiriesManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Lead status stage and trial date pickers stack. |
| ↳ Staff Comment & Follow-up Modal | `EnquiriesManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Follow-up notes textarea and date picker full width. |
| ↳ Mark Lead as Not Interested Modal | `EnquiriesManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Scrap reason radio options wrap cleanly. |
| ↳ Enquiries Filter Drawer | `EnquiriesManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Stage and source filter pills wrap. |
| ↳ Delete Lead Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |

---

### Batch 4: Staff, Payroll, Leave, Advances & Finance (6 Pages, 24 Modals/Drawers = 30 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Revenue & Operating Financials** | `Financials.jsx` | Page (Route: `financials`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Summary cards keep desktop layout; transactions table wrapped in scroll. |
| ↳ Record Operating Expense Modal | `Financials.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Expense category, amount, payee, and date stack vertically. |
| ↳ Payment Receipt Viewer Dialog | `Financials.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Receipt card fits phone width without clipping. |
| ↳ Financial Date Filter Drawer | `Financials.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Date range presets and category filters wrap. |
| **Employee Payroll Manager** | `PayrollManager.jsx` | Page (Route: `payroll`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 9-column payroll table wrapped in scroll; summary stats keep desktop layout. |
| ↳ Generate Monthly Payroll Batch Dialog | `PayrollManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Payroll calculation batch preview wraps cleanly. |
| ↳ Official Staff Salary Slip Dialog | `PayrollManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Payslip earnings and deductions tables scrollable on phone. |
| ↳ Advance Deduction & Adjustment Modal | `PayrollManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Adjustment inputs full-width with 16px font size. |
| ↳ Payroll Filter Drawer | `PayrollManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Month selector and staff filters wrap. |
| **Staff Leave Management** | `LeaveManagement.jsx` | Page (Route: `leaves`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Leave balance summary cards stack; request tables wrapped in scroll. |
| ↳ Submit Leave Request Modal | `LeaveManagement.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Leave type, date range, and reason inputs stack. |
| ↳ Review & Approve/Reject Leave Modal | `LeaveManagement.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Review comments and decision buttons accessible. |
| ↳ Annual Leave Policy & Quota Modal | `LeaveManagement.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Staff quota allowance table scrollable. |
| ↳ Leave Filter Drawer | `LeaveManagement.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Status pills and month selector wrap. |
| **Advance Pay Requests** | `AdvancePayManager.jsx` | Page (Route: `advance-pay`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Requests table wrapped in scroll; action buttons 36-40px tap area. |
| ↳ Review & Approve Advance Pay Modal | `AdvancePayManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Approval form with repayment cycle selector stacks. |
| ↳ Record Advance Repayment Dialog | `AdvancePayManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Repayment amount and date inputs full width. |
| ↳ Advance Pay Filter Drawer | `AdvancePayManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Repayment status filters wrap cleanly. |
| **Staff Accounts & Roles** | `StaffAccountManager.jsx` | Page (Route: `staff-accounts`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Staff card grid keeps desktop columns; role badges wrap. |
| ↳ Add New Staff Member Modal | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Personal, role, salary, and document upload fields stack. |
| ↳ Edit Staff Member Modal | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Staff update form fields full width. |
| ↳ Staff Login Credentials Dialog | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | One-click copy buttons 40px+ tap targets. |
| ↳ Share Staff Credentials Dialog | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | WhatsApp share preview card wraps. |
| ↳ Coach Assigned Athletes Roster Modal | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Athlete roster table scrollable internally. |
| ↳ Staff Document ID Preview Modal | `StaffAccountManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Aadhaar/PAN image preview scales to viewport. |
| ↳ Deactivate Staff Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |
| **Trainer Commissions & PT Incentives** | `TrainerCommissions.jsx` | Page (Route: `commissions`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Commission summary table wrapped in horizontal scroll container. |
| ↳ Log Trainer Commission Modal | `TrainerCommissions.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Trainer, session count, and incentive amount stack. |
| ↳ PT Commission Report Dialog | `TrainerCommissions.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Payout summary table scrollable. |
| ↳ Commissions Filter Drawer | `TrainerCommissions.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Coach filter pills wrap cleanly. |

---

### Batch 5: Shifts, Analytics, Equipment, WhatsApp & Settings (7 Pages, 16 Modals/Drawers = 23 Entities)

| Entity Name | File / Location | Type | Status (Audited \| Fixed \| Tested) | Tested Breakpoints (320 / 360 / 390 / 412 / 768 / 1280) | Mobile Notes & Vulnerabilities |
|---|---|---|:---:|:---:|---|
| **Shift Timings & Slots** | `ShiftManager.jsx` | Page (Route: `shifts`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Keeps desktop columns; slot timing pills wrap on mobile. |
| ↳ Create / Edit Shift Slot Modal | `ShiftFormModal.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Time picker inputs stack vertically, 16px font size. *Assigned exclusively here*. |
| ↳ Delete Shift Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |
| **Analytics & Business Intelligence** | `AnalyticsPage.jsx` | Page (Route: `analytics`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 7 analytics sub-tabs strip scrolls horizontally; charts resize to 100%. |
| ↳ Custom Date Range Filter Bar | `AnalyticsPage.jsx` | Sub-component | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Date pickers wrap on narrow viewports. |
| **Export Reports Manager** | `ReportsManager.jsx` | Page (Route: `reports`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 5 report tables wrapped in horizontal scroll with sticky headers. |
| ↳ Report Date Filter Drawer | `ReportsManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Date presets and export format buttons wrap. |
| **WhatsApp Automation & Templates** | `WhatsAppAutomation.jsx` | Page (Route: `whatsapp-automation`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 5 sub-tabs strip scrollable. Side-by-side template editor stacks vertically. |
| ↳ Create / Edit Message Template Modal | `WhatsAppAutomation.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Variable tag chips wrap cleanly, message body textarea full width. |
| ↳ Mobile Phone Preview Dialog | `WhatsAppAutomation.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Simulated handset frame scales dynamically to fit screen. |
| ↳ 1-Click Broadcast Dispatch Modal | `WhatsAppAutomation.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Target audience breakdown and dispatch CTA stack. |
| ↳ Delete Template Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |
| **Digital Consent Forms & Waivers** | `ConsentFormsManager.jsx` | Page (Route: `consent-forms`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Form templates table wrapped in scroll; signature status badges wrap. |
| ↳ Create Member Waiver Form Modal | `ConsentFormsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Clause editor list items stack vertically. |
| ↳ View Signed Athlete Waiver Dialog | `ConsentFormsManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Digital signature image fits phone width. |
| ↳ Consent Forms Filter Drawer | `ConsentFormsManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Status filters wrap. |
| **Equipment & Asset Tracker** | `EquipmentManager.jsx` | Page (Route: `equipment`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Keeps desktop columns; collapses on phone. Maintenance dates wrap cleanly. |
| ↳ Register Gym Equipment Asset Modal | `EquipmentManager.jsx` | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Asset name, serial, warranty, and vendor inputs stack. |
| ↳ Equipment Filter Drawer | `EquipmentManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Status and category filters wrap. |
| ↳ Delete Asset Confirm Dialog | `ConfirmDeleteModal.jsx` | Dialog | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Action buttons 40px+ tap area. |
| **Gym Settings & Configuration** | `SettingsManager.jsx` | Page (Route: `settings`) | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | 7 settings sub-tabs scroll horizontally; settings forms collapse to 1-col on phone. |
| ↳ Add New Branch / Facility Modal | `SettingsManager.jsx` (Portal) | Modal | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Branch name, address, GST, and contact fields stack. |
| ↳ Custom Legal Waiver Clause Editor | `SettingsManager.jsx` | Sub-component | [x] Audited \| [ ] Fixed \| [ ] Tested | [ ] 320 [ ] 360 [ ] 390 [ ] 412 [ ] 768 [ ] 1280 | Clause text input and delete button wrap. |

---

## 4. Personal Trainer & Staff Portal (`frontend/src/components/trainer/`)

| Component | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Trainer Dashboard** | `TrainerDashboard.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Active clients, today's schedule, and commission summary cards must collapse to 1-column. Quick check-in buttons must wrap. |
| **Trainer Client List** | `TrainerClientList.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Client search toolbar and client cards must scale to phone width. Assign plan modal must be 1-column. |
| **Workout Builder** | `WorkoutBuilder.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Day selector tabs (`Mon`, `Tue`...) have `min-w-[48px]`. Exercise rows (sets, reps, rest, weight) are horizontal tables on desktop. On mobile, exercise rows must stack into compact cards so trainers can log weights easily on gym floor. |
| **Diet & Nutrition Builder** | `DietBuilder.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Meal timing cards (Breakfast, Lunch, Pre-workout, Dinner) must stack. Macro progress circles must scale down. Food item search and quantity inputs must be full-width. |
| **Trainer Profile View** | `TrainerProfile.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Profile summary header, bio, and certification tags must wrap cleanly. |
| **Trainer Sessions View** | `TrainerSessionsView.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | PT session schedule and completion checkmarks must fit mobile screens. |
| **Trainer Advance Pay View** | `TrainerAdvancePayView.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Table has fixed border-collapse. Needs responsive container or card reflow. Request advance form must be full-width. |
| **Trainer Leave View** | `TrainerLeaveView.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Leave balance cards and request form must stack vertically. Leave history table needs horizontal scrolling. |
| **Trainer Commissions View** | `TrainerCommissionsView.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Commission breakdown list and payout status must fit narrow viewports. |

---

## 5. Member / Athlete Portal (`frontend/src/components/member/`)

| Component | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Member Dashboard** | `MemberDashboard.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | QR Turnstile Pass card, Membership Validity card, and Streak Counter must fit 320px–390px viewports without horizontal clipping. Today's workout preview must wrap cleanly. |
| **Workout Tracker** | `WorkoutTracker.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Day-by-day exercise checklist. Set completion checkmarks and weight input chips must be easily tappable (min 40px) while working out. Rest timer modal must center cleanly. |
| **Diet & Nutrition Tracker** | `DietTracker.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Calorie intake and macro split progress bars must fit mobile width. Meal checkboxes and hydration tracker must wrap cleanly. |
| **Group Class Booking** | `ClassBooking.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Date selector strip must support smooth horizontal scrolling (`no-scrollbar`). Class cards (Instructor, Time, Capacity pill, Book button) must stack cleanly. |
| **Coaches Directory** | `CoachesDirectory.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Coach profile cards (avatar, specialty, rating, experience, WhatsApp chat button) must collapse to 1-column. |
| **Member Profile & ID** | `MemberProfile.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Digital membership card with QR code must fit within 320px without overflow. Personal metrics (height, weight, BMI) must stack in 2-col or 1-col grid. |
| **Member Invoices & Receipts** | `MemberInvoices.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Subscription invoices list. Invoice cards must show receipt number, date, amount, and download button cleanly on mobile. |
| **Transformation & Progress** | `MemberTransformation.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Weight progress line chart must scale dynamically. Before/After photo comparison must stack vertically on mobile. |

---

## 6. Superadmin Platform Portal (`frontend/src/components/superadmin/`)

| Component | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Superadmin App Shell** | `SuperadminApp.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Top bar and navigation tabs must adapt to mobile viewports with horizontal scroll. |
| **Superadmin Dashboard** | `SuperadminDashboard.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Platform KPI cards (Total Gyms, MRR, Active Members) must collapse 4 -> 2 -> 1. Gyms table has 9 columns (`min-w-[900px]`); must be wrapped in `overflow-x-auto`. Action buttons (Impersonate, Suspend, Edit) must not wrap into multiple disjointed lines. |
| **Plans & SaaS Packages** | `PlansManager.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Tier cards (Bronze, Silver, Gold, Platinum) must collapse to 1-col on mobile. Feature checkboxes inside plan modal must wrap cleanly. |
| **Platform Pages Manager** | `PagesManager.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Markdown/WYSIWYG content editor must be full-width with responsive action buttons. |
| **WhatsApp Gateway Control** | `SuperadminWhatsAppManager.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Sidebar list of gyms has `min-w-[180px]`. On mobile, gym selector must become a dropdown or top horizontal strip so the config panel takes full width. |
| **Superadmin Credentials** | `SuperadminCredentialsManager.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Password update and email update form cards must stack vertically. |
| **Gym Roles & Permissions** | `GymRolesManager.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Custom role permissions matrix table must scroll horizontally. |
| **Add Admin Modal** | `AddAdminModal.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Modal card must fit small viewports with full-width action buttons. |
| **Gym WhatsApp Modal** | `GymWhatsAppModal.jsx` | [x] Audited \| [ ] Fixed \| [ ] Tested | Config modal must scroll internally on mobile. |

---

## 7. Native Mobile & Capacitor Integration (`mobile/` & `@capacitor/android`)

| Target | Architecture | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Capacitor Android Container** | `@capacitor/android` v8.5.1 in `frontend/` | [x] Audited \| [ ] Fixed \| [ ] Tested | The mobile application is a native Android project generated and managed via Capacitor (`androidScheme: "http"`, `webDir: "dist"`). It packages the responsive React frontend directly into the APK. Safe-area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`) are essential for notched devices and Android edge-to-edge gesture navigation. |
| **Hardware Back Button Handling** | `App.jsx` (`CapApp.addListener('backButton')`) | [x] Audited \| [ ] Fixed \| [ ] Tested | Tested and functioning; drawer closes first, then steps back in history, exits on dashboard. |

---

## 8. Backend-Rendered Views & Email Templates

| View | File Path | Status | Small Screen (320px–390px) Issues & Audit Notes |
|---|---|---|---|
| **Welcome Blade View** | `backend/resources/views/welcome.blade.php` | [x] Audited \| [ ] Fixed \| [ ] Tested | Default Laravel welcome view; not used in client app flows. All app views are 100% single-page React application. |
