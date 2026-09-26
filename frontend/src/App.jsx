import React, { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GymDataProvider, useGymData } from './context/GymDataContext';
import { LoginPage } from './components/auth/LoginPage';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { OwnerPageLoader } from './components/common/OwnerPageLoader';

// Member Views
import { MemberDashboard } from './components/member/MemberDashboard';
import { WorkoutTracker } from './components/member/WorkoutTracker';
import { DietTracker } from './components/member/DietTracker';
import { ClassBooking } from './components/member/ClassBooking';
import { MemberProfile } from './components/member/MemberProfile';
import { MemberInvoices } from './components/member/MemberInvoices';
import { MemberTransformation } from './components/member/MemberTransformation';

// Trainer Views
import { TrainerDashboard } from './components/trainer/TrainerDashboard';
import { TrainerClientList } from './components/trainer/TrainerClientList';
import { WorkoutBuilder } from './components/trainer/WorkoutBuilder';
import { DietBuilder } from './components/trainer/DietBuilder';
import { TrainerProfile } from './components/trainer/TrainerProfile';
import { TrainerCommissionsView } from './components/trainer/TrainerCommissionsView';
import { TrainerSessionsView } from './components/trainer/TrainerSessionsView';
import { TrainerAdvancePayView } from './components/trainer/TrainerAdvancePayView';

// Owner Views
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { MemberList } from './components/owner/MemberList';
import { PlanManager } from './components/owner/PlanManager';
import { Financials } from './components/owner/Financials';
import { EquipmentManager } from './components/owner/EquipmentManager';
import { SettingsManager } from './components/owner/SettingsManager';
import { EnquiriesManager } from './components/owner/EnquiriesManager';
import { ProductsManager } from './components/owner/ProductsManager';
import { TrainerCommissions } from './components/owner/TrainerCommissions';
import { ConsentFormsManager } from './components/owner/ConsentFormsManager';
import { MembershipFreezeManager } from './components/owner/MembershipFreezeManager';
import { PayrollManager } from './components/owner/PayrollManager';
import { AttendanceTracker } from './components/owner/AttendanceTracker';
import { InvoicesPage } from './components/owner/InvoicesPage';
import { SuperadminApp } from './components/superadmin/SuperadminApp';

// New Systems: Staff Accounts, Reports, Advance Pay, Classes, PT Sessions, Member Coaches
import { StaffAccountManager } from './components/owner/StaffAccountManager';
import { ReportsManager } from './components/owner/ReportsManager';
import { AdvancePayManager } from './components/owner/AdvancePayManager';
import { ClassAdminManager } from './components/owner/ClassAdminManager';
import { PTSessionsManager } from './components/owner/PTSessionsManager';
import { CoachesDirectory } from './components/member/CoachesDirectory';
import { AnalyticsPage } from './components/owner/AnalyticsPage';
import { LeaveManagement } from './components/owner/LeaveManagement';
import { TrainerLeaveView } from './components/trainer/TrainerLeaveView';
import { WhatsAppAutomation } from './components/owner/WhatsAppAutomation';


function MainApp() {
  const { isAuthenticated, currentRole, canAccessFinancials } = useAuth();
  const { isOwnerTabLoading } = useGymData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOpenAddMemberModal, setIsOpenAddMemberModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      // 2. Close Add Member modal if open
      if (isOpenAddMemberModal) {
        setIsOpenAddMemberModal(false);
        return;
      }

      // 3. Tab history step back
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileMenuOpen, isOpenAddMemberModal]);

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

            // 2. Close Add Member modal if open
            if (isOpenAddMemberModal) {
              setIsOpenAddMemberModal(false);
              return;
            }

            // 3. If on Dashboard, exit/close the mobile app
            if (activeTab === 'dashboard') {
              CapApp.exitApp();
              return;
            }

            // 4. Otherwise step back one screen in history
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
  }, [activeTab, isMobileMenuOpen, isOpenAddMemberModal]);

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
    // Security Guard: Manager has no access to financial, revenue, payroll, or staff provisioning pages
    if (currentRole === 'manager' && !canAccessFinancials) {
      const restrictedTabs = ['financials', 'invoices', 'advance-pay', 'payroll', 'reports', 'staff-accounts'];
      if (restrictedTabs.includes(activeTab)) {
        return <OwnerDashboard setActiveTab={handleNavigateTab} />;
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
          />
        );
      case 'whatsapp-automation':
        return <WhatsAppAutomation />;
      case 'members':
        return (
          <MemberList
            isOpenAddModal={isOpenAddMemberModal}
            setIsOpenAddModal={setIsOpenAddMemberModal}
          />
        );
      case 'classes':
        return <ClassAdminManager />;
      case 'pt-sessions':
        return <PTSessionsManager />;
      case 'enquiries':
        return (
          <EnquiriesManager
            onConvertLeadToMember={() => {
              handleNavigateTab('members');
              setIsOpenAddMemberModal(true);
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
        return <StaffAccountManager />;
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
        return <OwnerDashboard setActiveTab={handleNavigateTab} />;
    }
  };

  const renderContent = () => {
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
        <main className="flex-1 min-w-0 h-full overflow-y-auto px-2.5 sm:px-5 lg:px-8 py-3 sm:py-5 pb-6 safe-bottom">
          {renderContent()}
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
    return <SuperadminApp />;
  }

  return (
    <AuthProvider>
      <GymDataProvider>
        <MainApp />
      </GymDataProvider>
    </AuthProvider>
  );
}
