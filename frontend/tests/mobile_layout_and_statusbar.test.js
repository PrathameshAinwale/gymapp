import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

test('1. index.html configures light status bar with black icons for mobile web/PWA', () => {
  const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');

  assert.match(indexHtml, /<meta name="theme-color" content="#ffffff" \/>/);
  assert.match(indexHtml, /<meta name="apple-mobile-web-app-status-bar-style" content="default" \/>/);
});

test('2. capacitor.config.json configures StatusBar plugin with LIGHT style and no overlay', () => {
  const configRaw = fs.readFileSync(path.join(frontendDir, 'capacitor.config.json'), 'utf8');
  const config = JSON.parse(configRaw);

  assert.equal(config.plugins?.StatusBar?.style, 'LIGHT');
  assert.equal(config.plugins?.StatusBar?.overlaysWebView, false);
  assert.equal(config.plugins?.StatusBar?.backgroundColor, '#ffffff');
  assert.equal(config.android?.backgroundColor, '#ffffff');
});

test('3. Android native styles.xml declares windowLightStatusBar and white statusBarColor', () => {
  const stylesXml = fs.readFileSync(
    path.join(frontendDir, 'android/app/src/main/res/values/styles.xml'),
    'utf8'
  );

  assert.match(stylesXml, /<item name="android:statusBarColor">#ffffff<\/item>/);
  assert.match(stylesXml, /<item name="android:windowLightStatusBar">true<\/item>/);
  assert.match(stylesXml, /<item name="android:navigationBarColor">#ffffff<\/item>/);
  assert.match(stylesXml, /<item name="android:windowLightNavigationBar">true<\/item>/);
  assert.match(stylesXml, /<item name="android:fitsSystemWindows">true<\/item>/);
});

test('4. MainActivity.java programmatically enforces black status bar icons via WindowCompat', () => {
  const mainActivity = fs.readFileSync(
    path.join(frontendDir, 'android/app/src/main/java/in/pulsefit/app/MainActivity.java'),
    'utf8'
  );

  assert.match(mainActivity, /setAppearanceLightStatusBars\(true\)/);
  assert.match(mainActivity, /setStatusBarColor\(Color\.WHITE\)/);
  assert.match(mainActivity, /setNavigationBarColor\(Color\.WHITE\)/);
  assert.match(mainActivity, /setAppearanceLightNavigationBars\(true\)/);
  assert.match(mainActivity, /setDecorFitsSystemWindows\(window,\s*true\)/);
});

test('5. Navbar.jsx header uses safe-top without hardcoded height, letting inner bar render at h-14/h-16', () => {
  const navbarSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/common/Navbar.jsx'),
    'utf8'
  );

  assert.match(navbarSrc, /<header className="sticky top-0 z-40 w-full glass-header safe-top shrink-0">/);
  assert.match(navbarSrc, /<div className="flex items-center justify-between gap-2 w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16">/);
});

test('6. index.css safe-top accommodates both notch insets and Capacitor status-bar-height', () => {
  const cssSrc = fs.readFileSync(path.join(frontendDir, 'src/index.css'), 'utf8');

  assert.match(cssSrc, /\.safe-top\s*\{[^}]*max\(env\(safe-area-inset-top,\s*0px\),\s*var\(--status-bar-height,\s*0px\)\)/);
});

test('7. App.jsx initializes StatusBar with light style and fallback CSS variable', () => {
  const appSrc = fs.readFileSync(path.join(frontendDir, 'src/App.jsx'), 'utf8');

  assert.match(appSrc, /StatusBar\.setStyle\(\{\s*style:\s*Style\.Light\s*\}\)/);
  assert.match(appSrc, /StatusBar\.setOverlaysWebView\(\{\s*overlay:\s*false\s*\}\)/);
  assert.match(appSrc, /--status-bar-height/);
});

test('8. OwnerDashboard.jsx has uppercase capital header titles across all sections', () => {
  const dashboardSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/owner/OwnerDashboard.jsx'),
    'utf8'
  );

  assert.match(dashboardSrc, /GYM OVERVIEW/);
  assert.match(dashboardSrc, /OPERATIONAL METRICS/);
  assert.match(dashboardSrc, /REVENUE GROWTH TREND/);
  assert.match(dashboardSrc, /ACTIVE VS ALL USERS/);
  assert.match(dashboardSrc, /OPERATIONS DIRECTORY/);
  assert.match(dashboardSrc, /TODAY'S PRIORITY ACTIONS/);
  assert.match(dashboardSrc, /STAFF LEAVE REQUESTS/);
  assert.match(dashboardSrc, /LIVE GYM FLOOR/);
  assert.match(dashboardSrc, /RECENT MEMBER CHECK-INS/);
  assert.match(dashboardSrc, /RECENT INVOICES & STAFF CREATION AUDIT/);
});

test('9. OwnerDashboard.jsx operational metrics button has compact small styling', () => {
  const dashboardSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/owner/OwnerDashboard.jsx'),
    'utf8'
  );

  assert.match(dashboardSrc, /className="h-7 px-2 sm:px-2\.5 rounded-lg[^"]*text-\[10px\]/);
  assert.match(dashboardSrc, /<SlidersHorizontal className="w-3 h-3 text-emerald-600"/);
  assert.match(dashboardSrc, /<span className="inline">Customise<\/span>/);
});

test('10. OwnerDashboard.jsx search bar is compact with constrained width and height', () => {
  const dashboardSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/owner/OwnerDashboard.jsx'),
    'utf8'
  );

  assert.match(dashboardSrc, /className="relative w-full max-w-md sm:max-w-lg"/);
  assert.match(dashboardSrc, /className="[^"]*h-9 sm:h-9\.5[^"]*"/);
  assert.doesNotMatch(dashboardSrc, /min-h-\[48px\]/);
});

test('11. OwnerDashboard.jsx places Today\'s Priority Actions before Key Analytics', () => {
  const dashboardSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/owner/OwnerDashboard.jsx'),
    'utf8'
  );

  const idxPriority = dashboardSrc.indexOf("TODAY'S PRIORITY ACTIONS");
  const idxAnalytics = dashboardSrc.indexOf('KEY ANALYTICS');

  assert.ok(idxPriority !== -1, "TODAY'S PRIORITY ACTIONS must exist");
  assert.ok(idxAnalytics !== -1, 'KEY ANALYTICS must exist');
  assert.ok(
    idxPriority < idxAnalytics,
    `Today's Priority Actions (${idxPriority}) must appear before Key Analytics (${idxAnalytics})`
  );
});

test('12. App.jsx implements mobile back button navigation hierarchy with stable listener', () => {
  const appSrc = fs.readFileSync(path.join(frontendDir, 'src/App.jsx'), 'utf8');

  // Verify modal imports
  assert.match(appSrc, /import\s*\{[^}]*hasActiveModal,\s*closeTopmostModal[^}]*\}\s*from\s*['"]\.\/components\/common\/Modal['"]/);

  // Verify navStackRef and activeTabRef usage
  assert.match(appSrc, /const navStackRef\s*=\s*useRef\(\['dashboard'\]\)/);
  assert.match(appSrc, /const activeTabRef\s*=\s*useRef\(activeTab\)/);

  // Verify handleBackNavigation logic
  assert.match(appSrc, /if\s*\(hasActiveModal\(\)\)\s*\{/);
  assert.match(appSrc, /closeTopmostModal\(\)/);
  assert.match(appSrc, /if\s*\(isMobileMenuOpenRef\.current\)\s*\{/);
  assert.match(appSrc, /if\s*\(navStackRef\.current\.length\s*>\s*1\)\s*\{/);
  assert.match(appSrc, /navStackRef\.current\.pop\(\)/);
  assert.match(appSrc, /if\s*\(activeTabRef\.current\s*!==\s*'dashboard'\)\s*\{/);

  // Verify Capacitor backButton listener invokes exitApp only when handleBackNavigation returns false
  assert.match(appSrc, /CapApp\.addListener\('backButton',\s*\(\)\s*=>\s*\{/);
  assert.match(appSrc, /const handled\s*=\s*handleBackNavigation\(\)/);
  assert.match(appSrc, /if\s*\(!handled\)\s*\{\s*CapApp\.exitApp\(\);\s*\}/);

  // Listener must NOT have activeTab in its dependency array (which caused listener teardown and race conditions)
  assert.doesNotMatch(appSrc, /setupCapacitorBack[^}]*\}\s*,\s*\[[^\]]*activeTab[^\]]*\]/);
});

test('13. Modal.jsx exports hasActiveModal, closeTopmostModal, and registerActiveOverlay', () => {
  const modalSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/common/Modal.jsx'),
    'utf8'
  );

  assert.match(modalSrc, /export const hasActiveModal\s*=\s*\(\)\s*=>/);
  assert.match(modalSrc, /export const closeTopmostModal\s*=\s*\(\)\s*=>/);
  assert.match(modalSrc, /export const registerActiveOverlay\s*=\s*\(id,\s*onClose\)\s*=>/);
});

test('14. Overlays register with active overlay stack for back-button dismissal', () => {
  const logoutSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/common/LogoutConfirmModal.jsx'),
    'utf8'
  );
  const bellSrc = fs.readFileSync(
    path.join(frontendDir, 'src/components/common/NotificationBell.jsx'),
    'utf8'
  );

  assert.match(logoutSrc, /registerActiveOverlay\('logout-confirm-modal',\s*cancelLogout\)/);
  assert.match(bellSrc, /registerActiveOverlay\('notification-bell-dropdown'/);
});

test('15. Simulation of navigation stack and back navigation behaves like standard Android app', () => {
  // Pure logic simulation of the App.jsx back stack
  const navStack = ['dashboard'];
  let activeTab = 'dashboard';
  let isMobileMenuOpen = false;
  let activeModal = null;
  let didExit = false;

  const navigate = (tab) => {
    if (tab === 'dashboard') {
      navStack.length = 0;
      navStack.push('dashboard');
    } else {
      if (navStack[navStack.length - 1] !== tab) {
        navStack.push(tab);
      }
    }
    activeTab = tab;
  };

  const handleBack = () => {
    if (activeModal) {
      activeModal = null;
      return true;
    }
    if (isMobileMenuOpen) {
      isMobileMenuOpen = false;
      return true;
    }
    if (navStack.length > 1) {
      navStack.pop();
      activeTab = navStack[navStack.length - 1] || 'dashboard';
      return true;
    }
    if (activeTab !== 'dashboard') {
      navStack.length = 0;
      navStack.push('dashboard');
      activeTab = 'dashboard';
      return true;
    }
    return false;
  };

  const onNativeBack = () => {
    const handled = handleBack();
    if (!handled) {
      didExit = true;
    }
  };

  // Step 1: Navigate Dashboard -> Members -> MemberProfile -> CreateInvoice
  navigate('members');
  assert.equal(activeTab, 'members');
  assert.deepEqual(navStack, ['dashboard', 'members']);

  navigate('member-profile');
  assert.equal(activeTab, 'member-profile');
  assert.deepEqual(navStack, ['dashboard', 'members', 'member-profile']);

  navigate('create-invoice');
  assert.equal(activeTab, 'create-invoice');
  assert.deepEqual(navStack, ['dashboard', 'members', 'member-profile', 'create-invoice']);

  // Step 2: Open modal while on create-invoice
  activeModal = 'confirm-discount';
  onNativeBack(); // Back press 1: closes modal
  assert.equal(activeModal, null, 'Modal must be closed on first back press');
  assert.equal(activeTab, 'create-invoice', 'Screen must remain on create-invoice');
  assert.equal(didExit, false, 'App must NOT exit');

  // Step 3: Back from create-invoice -> member-profile
  onNativeBack(); // Back press 2
  assert.equal(activeTab, 'member-profile');
  assert.equal(didExit, false);

  // Step 4: Back from member-profile -> members
  onNativeBack(); // Back press 3
  assert.equal(activeTab, 'members');
  assert.equal(didExit, false);

  // Step 5: Open drawer on members
  isMobileMenuOpen = true;
  onNativeBack(); // Back press 4: closes drawer
  assert.equal(isMobileMenuOpen, false);
  assert.equal(activeTab, 'members');
  assert.equal(didExit, false);

  // Step 6: Back from members -> dashboard
  onNativeBack(); // Back press 5
  assert.equal(activeTab, 'dashboard');
  assert.equal(didExit, false);

  // Step 7: Back on root dashboard (no overlays, empty backstack) -> closes app!
  onNativeBack(); // Back press 6
  assert.equal(didExit, true, 'App must exit when back is pressed on root dashboard');
});

test('16. Android navigation bar insets are handled so contents start above mobile device bottom buttons', () => {
  const mainActivity = fs.readFileSync(
    path.join(frontendDir, 'android/app/src/main/java/in/pulsefit/app/MainActivity.java'),
    'utf8'
  );
  const cssSrc = fs.readFileSync(path.join(frontendDir, 'src/index.css'), 'utf8');

  // Verify native insets listener calculates bottom navigationBar insets and pads content view
  assert.match(mainActivity, /insets\.getInsets\(WindowInsetsCompat\.Type\.navigationBars\(\)\)/);
  assert.match(mainActivity, /v\.setPadding\([\s\S]*?navBarInsets\.bottom/);

  // Verify CSS safe-bottom accounts for safe-area-inset-bottom and navigation-bar-height
  assert.match(cssSrc, /\.safe-bottom\s*\{[^}]*max\(env\(safe-area-inset-bottom,\s*0px\),\s*var\(--navigation-bar-height,\s*0px\)\)/);
});

