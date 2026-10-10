import React, { useState, useEffect, Suspense, lazy } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { GymDataProvider, useGymData } from './context/GymDataContext';
import { LoginPage } from './components/auth/LoginPage';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { OwnerPageLoader } from './components/common/OwnerPageLoader';
import { AboutPages } from './components/common/AboutPages';
import { isTabAllowedForGym } from './components/superadmin/packagePlans';

// Eager landing view for Owner Dashboard
import { OwnerDashboard } from './components/owner/OwnerDashboard';

// Lazy-loaded Superadmin Portal
const SuperadminApp = lazy(() => import('./components/superadmin/SuperadminApp').then(m => ({ default: m.SuperadminApp })));

// Lazy-loaded Member Views
const MemberDashboard = lazy(() => import('./components/member/MemberDashboard').then(m => ({ default: m.MemberDashboard })));
const WorkoutTracker = lazy(() => import('./components/member/WorkoutTracker').then(m => ({ default: m.WorkoutTracker })));
const DietTracker = lazy(() => import('./components/member/DietTracker').then(m => ({ default: m.DietTracker })));
const ClassBooking = lazy(() => import('./components/member/ClassBooking').then(m => ({ default: m.ClassBooking })));
const MemberProfile = lazy(() => import('./components/member/MemberProfile').then(m => ({ default: m.MemberProfile })));
const MemberInvoices = lazy(() => import('./components/member/MemberInvoices').then(m => ({ default: m.MemberInvoices })));
const MemberTransformation = lazy(() => import('./components/member/MemberTransformation').then(m => ({ default: m.MemberTransformation })));
const CoachesDirectory = lazy(() => import('./components/member/CoachesDirectory').then(m => ({ default: m.CoachesDirectory })));

// Lazy-loaded Trainer Views
const TrainerDashboard = lazy(() => import('./components/trainer/TrainerDashboard').then(m => ({ default: m.TrainerDashboard })));
const TrainerClientList = lazy(() => import('./components/trainer/TrainerClientList').then(m => ({ default: m.TrainerClientList })));
const WorkoutBuilder = lazy(() => import('./components/trainer/WorkoutBuilder').then(m => ({ default: m.WorkoutBuilder })));
const DietBuilder = lazy(() => import('./components/trainer/DietBuilder').then(m => ({ default: m.DietBuilder })));
const TrainerProfile = lazy(() => import('./components/trainer/TrainerProfile').then(m => ({ default: m.TrainerProfile })));
const TrainerCommissionsView = lazy(() => import('./components/trainer/TrainerCommissionsView').then(m => ({ default: m.TrainerCommissionsView })));
const TrainerSessionsView = lazy(() => import('./components/trainer/TrainerSessionsView').then(m => ({ default: m.TrainerSessionsView })));
const TrainerAdvancePayView = lazy(() => import('./components/trainer/TrainerAdvancePayView').then(m => ({ default: m.TrainerAdvancePayView })));
const TrainerLeaveView = lazy(() => import('./components/trainer/TrainerLeaveView').then(m => ({ default: m.TrainerLeaveView })));

// Lazy-loaded Owner Views
const MemberList = lazy(() => import('./components/owner/MemberList').then(m => ({ default: m.MemberList })));
const PlanManager = lazy(() => import('./components/owner/PlanManager').then(m => ({ default: m.PlanManager })));
const Financials = lazy(() => import('./components/owner/Financials').then(m => ({ default: m.Financials })));
const EquipmentManager = lazy(() => import('./components/owner/EquipmentManager').then(m => ({ default: m.EquipmentManager })));
const SettingsManager = lazy(() => import('./components/owner/SettingsManager').then(m => ({ default: m.SettingsManager })));
const EnquiriesManager = lazy(() => import('./components/owner/EnquiriesManager').then(m => ({ default: m.EnquiriesManager })));
const ProductsManager = lazy(() => import('./components/owner/ProductsManager').then(m => ({ default: m.ProductsManager })));
const TrainerCommissions = lazy(() => import('./components/owner/TrainerCommissions').then(m => ({ default: m.TrainerCommissions })));
const ConsentFormsManager = lazy(() => import('./components/owner/ConsentFormsManager').then(m => ({ default: m.ConsentFormsManager })));
const MembershipFreezeManager = lazy(() => import('./components/owner/MembershipFreezeManager').then(m => ({ default: m.MembershipFreezeManager })));
const PayrollManager = lazy(() => import('./components/owner/PayrollManager').then(m => ({ default: m.PayrollManager })));
const AttendanceTracker = lazy(() => import('./components/owner/AttendanceTracker').then(m => ({ default: m.AttendanceTracker })));
const InvoicesPage = lazy(() => import('./components/owner/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const StaffAccountManager = lazy(() => import('./components/owner/StaffAccountManager').then(m => ({ default: m.StaffAccountManager })));
const ReportsManager = lazy(() => import('./components/owner/ReportsManager').then(m => ({ default: m.ReportsManager })));
const AdvancePayManager = lazy(() => import('./components/owner/AdvancePayManager').then(m => ({ default: m.AdvancePayManager })));
const ClassAdminManager = lazy(() => import('./components/owner/ClassAdminManager').then(m => ({ default: m.ClassAdminManager })));
const PTSessionsManager = lazy(() => import('./components/owner/PTSessionsManager').then(m => ({ default: m.PTSessionsManager })));
const AnalyticsPage = lazy(() => import('./components/owner/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const LeaveManagement = lazy(() => import('./components/owner/LeaveManagement').then(m => ({ default: m.LeaveManagement })));
const WhatsAppAutomation = lazy(() => import('./components/owner/WhatsAppAutomation').then(m => ({ default: m.WhatsAppAutomation })));
const ShiftManager = lazy(() => import('./components/owner/ShiftManager').then(m => ({ default: m.ShiftManager })));
const MemberProfilePage = lazy(() => import('./components/owner/MemberProfilePage').then(m => ({ default: m.MemberProfilePage })));
const AddMemberPage = lazy(() => import('./components/owner/AddMemberPage').then(m => ({ default: m.AddMemberPage })));
const MemberUpgradeRenewPage = lazy(() => import('./components/owner/MemberUpgradeRenewPage').then(m => ({ default: m.MemberUpgradeRenewPage })));

function MainApp() {
  const { isAuthenticated, currentRole, canAccessFinancials, currentUser } = useAuth();
  const { isOwnerTabLoading, gymInfo } = useGymData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMemberProfileId, setSelectedMemberProfileId] = useState(null);
  const [selectedUpgradeRenewMember, setSelectedUpgradeRenewMember] = useState(null);
  const [addMemberInitialData, setAddMemberInitialData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentTier = gymInfo?.packageTier || gymInfo?.package || currentUser?.packageTier || currentUser?.package || 'Bronze';

  // Strict Plan Protection: Redirect to dashboard if trying to view a tab not included in current plan
  useEffect(() => {
    if (activeTab && currentRole !== 'superadmin' && !isTabAllowedForGym(activeTab, currentTier, gymInfo?.features)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentTier, gymInfo, currentRole]);

  // Initialize and synchronize history state
  useEffect(() => {
    if (isAuthenticated) {
      if (!window.history.state || window.history.state.tab !== activeTab) {
        window.history.replaceState(
          { tab: activeTab, role: currentRole, app: 'gym' },
          '',
          window.location.pathname
        );
      }
    }
  }, [isAuthenticated, currentRole]);

  // Navigate to new tab and push history entry so Back goes back one screen at a time
  const handleNavigateTab = (newTab) => {
    if (typeof newTab === 'function') {
      setActiveTab((prev) => {
        const resolved = newTab(prev);
        if (resolved !== prev) {
          window.history.pushState(
            { tab: resolved, role: currentRole, app: 'gym' },
            '',
            window.location.pathname
          );
        }
        return resolved;
      });
    } else {
      if (newTab !== activeTab) {
        window.history.pushState(
          { tab: newTab, role: currentRole, app: 'gym' },
          '',
          window.location.pathname
        );
        setActiveTab(newTab);
      }
    }
    setIsMobileMenuOpen(false);
  };

  // Listen to browser & webview popstate (Back button)
  useEffect(() => {
    const handlePopState = (event) => {
      // 1. Close mobile drawer if open
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        return;
      }

      // 2. Tab history step back
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileMenuOpen]);

  // Capacitor Native Back Button handling for Mobile View (Hardware / Gesture Back)
  useEffect(() => {
    let backListener = null;

    const setupCapacitorBack = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          backListener = await CapApp.addListener('backButton', () => {
            // 1. Close drawer if open
            if (isMobileMenuOpen) {
              setIsMobileMenuOpen(false);
              return;
            }

            // 2. If on Dashboard, exit/close the mobile app
            if (activeTab === 'dashboard') {
              CapApp.exitApp();
              return;
            }

            // 3. Otherwise step back one screen in history
            window.history.back();
          });
        }
      } catch (err) {
        console.warn('Capacitor backButton setup error:', err);
      }
    };

    setupCapacitorBack();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [activeTab, isMobileMenuOpen]);

  // Reset to dashboard when role switches
  useEffect(() => {
    setActiveTab('dashboard');
    setIsMobileMenuOpen(false);
  }, [currentRole]);

  // If not signed in, show the Login Page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  // 1. Athlete Member Content Routing
  const renderMemberContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MemberDashboard setActiveTab={handleNavigateTab} />;
      case 'workout':
        return <WorkoutTracker setActiveTab={handleNavigateTab} />;
      case 'diet':
        return <DietTracker setActiveTab={handleNavigateTab} />;
      case 'classes':
        return <ClassBooking setActiveTab={handleNavigateTab} />;
      case 'coaches':
        return <CoachesDirectory setActiveTab={handleNavigateTab} />;
      case 'profile':
        return <MemberProfile setActiveTab={handleNavigateTab} />;
      case 'invoices':
        return <MemberInvoices setActiveTab={handleNavigateTab} />;
      case 'transformation':
        return <MemberTransformation setActiveTab={handleNavigateTab} />;
      default:
        return <MemberDashboard setActiveTab={handleNavigateTab} />;
    }
  };

  // 2. Personal Trainer / Coach Content Routing
  const renderTrainerContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <TrainerDashboard setActiveTab={handleNavigateTab} />;
      case 'advance-request':
        return <TrainerAdvancePayView setActiveTab={handleNavigateTab} />;
      case 'trainer-leaves':
        return <TrainerLeaveView setActiveTab={handleNavigateTab} />;
      case 'sessions':
        return <TrainerSessionsView setActiveTab={handleNavigateTab} />;
      case 'clients':
        return <TrainerClientList setActiveTab={handleNavigateTab} />;
      case 'workout-builder':
        return <WorkoutBuilder setActiveTab={handleNavigateTab} />;
      case 'diet-builder':
        return <DietBuilder setActiveTab={handleNavigateTab} />;
      case 'profile':
        return <TrainerProfile setActiveTab={handleNavigateTab} />;
      case 'commissions':
        return <TrainerCommissionsView />;
      default:
        return <TrainerDashboard setActiveTab={handleNavigateTab} />;
    }
  };

  // 3. Gym Superadmin / Accounts / Manager Operations Content Routing
  const renderOwnerContent = () => {
    // Strict Plan Guard: If tab is not permitted in gym's plan, render dashboard
    if (activeTab !== 'dashboard' && !isTabAllowedForGym(activeTab, currentTier, gymInfo?.features)) {
      return (
        <OwnerDashboard
          setActiveTab={handleNavigateTab}
          onOpenMemberProfile={(memberId) => {
            setSelectedMemberProfileId(memberId);
            handleNavigateTab('member-profile');
          }}
        />
      );
    }

    // Security Guard: Manager has no access to financial, revenue, payroll, or staff provisioning pages
    if (currentRole === 'manager' && !canAccessFinancials) {
      const restrictedTabs = ['financials', 'invoices', 'advance-pay', 'payroll', 'reports', 'staff-accounts'];
      if (restrictedTabs.includes(activeTab)) {
        return (
          <OwnerDashboard
            setActiveTab={handleNavigateTab}
            onOpenMemberProfile={(memberId) => {
              setSelectedMemberProfileId(memberId);
              handleNavigateTab('member-profile');
            }}
          />
        );
      }
    }

    // Dynamic Owner Module Loader: Prevent blank screen while page records are hydrating
    if (isOwnerTabLoading?.(activeTab)) {
      return <OwnerPageLoader activeTab={activeTab} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <OwnerDashboard
            setActiveTab={handleNavigateTab}
            onOpenAddMember={() => {
              setAddMemberInitialData(null);
              handleNavigateTab('add-member');
            }}
            onOpenMemberProfile={(memberId) => {
              setSelectedMemberProfileId(memberId);
              handleNavigateTab('member-profile');
            }}
          />
        );
      case 'member-profile':
        return (
          <MemberProfilePage
            initialMemberId={selectedMemberProfileId}
            onBackToDashboard={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                handleNavigateTab('members');
              }
            }}
            onNavigateTab={handleNavigateTab}
            onNavigateToUpgradeRenew={(member) => {
              setSelectedUpgradeRenewMember(member);
              handleNavigateTab('upgrade-renew');
            }}
          />
        );
      case 'upgrade-renew':
        return (
          <MemberUpgradeRenewPage
            member={selectedUpgradeRenewMember}
            onBack={() => {
              setSelectedUpgradeRenewMember(null);
              if (window.history.length > 1) {
                window.history.back();
              } else {
                handleNavigateTab('members');
              }
            }}
            onSuccess={() => {
              setSelectedUpgradeRenewMember(null);
              handleNavigateTab('members');
            }}
            onNavigateTab={handleNavigateTab}
          />
        );
      case 'add-member':
        if (addMemberInitialData?.isUpgrade) {
          return (
            <MemberUpgradeRenewPage
              member={addMemberInitialData}
              onBack={() => {
                setAddMemberInitialData(null);
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  handleNavigateTab('members');
                }
              }}
              onSuccess={() => {
                setAddMemberInitialData(null);
                handleNavigateTab('members');
              }}
              onNavigateTab={handleNavigateTab}
            />
          );
        }
        return (
          <AddMemberPage
            initialData={addMemberInitialData}
            isEdit={Boolean(addMemberInitialData?.isEdit || addMemberInitialData?.isEditMode)}
            editMember={addMemberInitialData?.isEdit ? addMemberInitialData : null}
            onBack={() => {
              setAddMemberInitialData(null);
              handleNavigateTab('members');
            }}
            onNavigateTab={handleNavigateTab}
            onMemberAdded={() => {
              setAddMemberInitialData(null);
              handleNavigateTab('members');
            }}
          />
        );
      case 'whatsapp-automation':
        return <WhatsAppAutomation />;
      case 'members':
        return (
          <MemberList
            setActiveTab={handleNavigateTab}
            onOpenAddMember={() => {
              setAddMemberInitialData(null);
              handleNavigateTab('add-member');
            }}
            onNavigateToAddMember={(data) => {
              if (data?.isUpgrade) {
                setSelectedUpgradeRenewMember(data);
                handleNavigateTab('upgrade-renew');
                return;
              }
              setAddMemberInitialData(data || null);
              handleNavigateTab('add-member');
            }}
            onNavigateToUpgradeRenew={(member) => {
              setSelectedUpgradeRenewMember(member);
              handleNavigateTab('upgrade-renew');
            }}
            onOpenMemberProfile={(memberId) => {
              setSelectedMemberProfileId(memberId);
              handleNavigateTab('member-profile');
            }}
          />
        );
      case 'classes':
        return <ClassAdminManager />;
      case 'pt-sessions':
        return <PTSessionsManager />;
      case 'enquiries':
        return (
          <EnquiriesManager
            onConvertLeadToMember={(enquiry) => {
              setAddMemberInitialData(enquiry || null);
              handleNavigateTab('add-member');
            }}
          />
        );
      case 'attendance':
        return <AttendanceTracker />;
      case 'plans':
        return <PlanManager />;
      case 'membership-freeze':
        return <MembershipFreezeManager />;
      case 'consent-forms':
        return <ConsentFormsManager />;
      case 'staff-accounts':
      case 'trainers':
        return <StaffAccountManager onNavigateTab={handleNavigateTab} />;
      case 'shifts':
        return <ShiftManager onNavigateTab={handleNavigateTab} />;
      case 'leaves':
        return <LeaveManagement />;
      case 'advance-pay':
        return <AdvancePayManager />;
      case 'payroll':
        return <PayrollManager />;
      case 'commissions':
        return <TrainerCommissions />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'reports':
        return <ReportsManager setActiveTab={handleNavigateTab} />;
      case 'financials':
        return <Financials />;
      case 'invoices':
        return <InvoicesPage />;
      case 'products':
        return <ProductsManager />;
      case 'equipment':
        return <EquipmentManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return (
          <OwnerDashboard
            setActiveTab={handleNavigateTab}
            onOpenMemberProfile={(memberId) => {
              setSelectedMemberProfileId(memberId);
              handleNavigateTab('member-profile');
            }}
          />
        );
    }
  };

  const renderContent = () => {
    if (activeTab === 'privacy-policy' || activeTab === 'terms-conditions' || activeTab === 'help-support') {
      return <AboutPages activeTab={activeTab} setActiveTab={handleNavigateTab} />;
    }
    if (currentRole === 'member') return renderMemberContent();
    if (currentRole === 'trainer') return renderTrainerContent();
    return renderOwnerContent();
  };

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden">
      {/* Mandatory First-Time Password Change Modal */}
      <ForceChangePasswordModal />

      {/* Top Navigation with Mobile Hamburger Trigger */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigateTab}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
        {/* Universal Responsive Sidebar (Desktop Left Bar + Mobile Slide-Out Drawer for all roles) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleNavigateTab}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Main Content Viewport: Full width responsive dashboard */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-4 pb-6 safe-bottom">
          <Suspense fallback={<OwnerPageLoader activeTab={activeTab} />}>
            {renderContent()}
          </Suspense>
        </main>
      </div>

      {/* Floating Alerts Container & Logout Confirm Dialog */}
      <ToastContainer />
      <LogoutConfirmModal />
    </div>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isSuperadmin = currentPath.startsWith('/superadmin');

  if (isSuperadmin) {
    return (
      <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-900 text-white"><div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>}>
        <SuperadminApp />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <GymDataProvider>
          <MainApp />
        </GymDataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
