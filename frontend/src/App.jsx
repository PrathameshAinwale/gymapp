import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GymDataProvider, useGymData } from './context/GymDataContext';
import { LoginPage } from './components/auth/LoginPage';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import { Modal } from './components/common/Modal';

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
import { ProgressLogger } from './components/trainer/ProgressLogger';

// Owner Views
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { MemberList } from './components/owner/MemberList';
import { PlanManager } from './components/owner/PlanManager';
import { TrainerList } from './components/owner/TrainerList';
import { ScheduleManager } from './components/owner/ScheduleManager';
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
import { SuperadminApp } from './components/superadmin/SuperadminApp';


function MainApp() {
  const { isAuthenticated, currentRole, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOpenAddMemberModal, setIsOpenAddMemberModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        return <MemberDashboard setActiveTab={setActiveTab} />;
      case 'workout':
        return <WorkoutTracker setActiveTab={setActiveTab} />;
      case 'diet':
        return <DietTracker setActiveTab={setActiveTab} />;
      case 'classes':
        return <ClassBooking setActiveTab={setActiveTab} />;
      case 'profile':
        return <MemberProfile setActiveTab={setActiveTab} />;
      case 'invoices':
        return <MemberInvoices setActiveTab={setActiveTab} />;
      case 'transformation':
        return <MemberTransformation setActiveTab={setActiveTab} />;
      default:
        return <MemberDashboard setActiveTab={setActiveTab} />;
    }
  };

  // 2. Personal Trainer / Coach Content Routing
  const renderTrainerContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <TrainerDashboard setActiveTab={setActiveTab} />;
      case 'clients':
        return <TrainerClientList setActiveTab={setActiveTab} />;
      case 'workout-builder':
        return <WorkoutBuilder setActiveTab={setActiveTab} />;
      case 'diet-builder':
        return <DietBuilder setActiveTab={setActiveTab} />;
      case 'profile':
        return <TrainerProfile setActiveTab={setActiveTab} />;
      case 'progress-logger':
        return <ProgressLogger setActiveTab={setActiveTab} />;
      default:
        return <TrainerDashboard setActiveTab={setActiveTab} />;
    }
  };

  // 3. Gym Owner Operations Content Routing
  const renderOwnerContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OwnerDashboard
            setActiveTab={setActiveTab}
            onOpenAddMember={() => {
              setActiveTab('members');
              setIsOpenAddMemberModal(true);
            }}
          />
        );
      case 'members':
        return (
          <MemberList
            isOpenAddModal={isOpenAddMemberModal}
            setIsOpenAddModal={setIsOpenAddMemberModal}
          />
        );
      case 'enquiries':
        return (
          <EnquiriesManager
            onConvertLeadToMember={() => {
              setActiveTab('members');
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
      case 'trainers':
        return <TrainerList />;
      case 'commissions':
        return <TrainerCommissions />;
      case 'payroll':
        return <PayrollManager />;
      case 'products':
        return <ProductsManager />;
      case 'financials':
        return <Financials />;
      case 'equipment':
        return <EquipmentManager />;
      case 'settings':
        return <SettingsManager />;
      default:
        return <OwnerDashboard setActiveTab={setActiveTab} />;
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
        setActiveTab={setActiveTab}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
      />

      <div className="flex-1 flex w-full min-h-0 overflow-hidden relative">
        {/* Universal Responsive Sidebar (Desktop Left Bar + Mobile Slide-Out Drawer for all roles) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Main Content Viewport: Full width responsive dashboard */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto px-2.5 sm:px-5 lg:px-8 py-3 sm:py-5 pb-6 safe-bottom">
          {renderContent()}
        </main>
      </div>

      {/* Floating Alerts Container */}
      <ToastContainer />
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
