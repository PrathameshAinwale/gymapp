import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const defaultAccounts = [
  {
    id: "usr-owner-1",
    userId: 1,
    gymId: 1,
    gym_id: 1,
    name: "Vikramaditya Singhania",
    role: "superadmin",
    roleLabel: "Superadmin & General Director",
    email: "owner@archfit.in",
    username: "owner",
    password: "admin123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    gymName: "ARCHFIT Athletic Club",
    badge: "Superadmin Access"
  },
  {
    id: "usr-manager-1",
    userId: 6,
    gymId: 1,
    gym_id: 1,
    name: "Rajesh K. Mehta",
    role: "manager",
    roleLabel: "Operations Manager",
    email: "manager@archfit.in",
    username: "manager",
    password: "manager123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
    gymName: "ARCHFIT Athletic Club",
    badge: "Manager Access"
  },
  {
    id: "usr-accounts-1",
    userId: 7,
    gymId: 1,
    gym_id: 1,
    name: "Sunita Deshmukh",
    role: "accounts",
    roleLabel: "Senior Finance Officer",
    email: "accounts@archfit.in",
    username: "accounts",
    password: "accounts123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
    gymName: "ARCHFIT Athletic Club",
    badge: "Accounts Access"
  },
  {
    id: "usr-trainer-2",
    userId: 2,
    gymId: 1,
    gym_id: 1,
    name: "Coach Alex Rivers",
    role: "trainer",
    roleLabel: "Senior Coach & CPT",
    email: "trainer@archfit.in",
    username: "trainer",
    password: "trainer123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80",
    gymName: "ARCHFIT Athletic Club",
    badge: "Trainer Access",
    specialty: "Hypertrophy & Powerlifting"
  },
  {
    id: "usr-member-5",
    userId: 5,
    gymId: 1,
    gym_id: 1,
    name: "Aarav Sharma",
    role: "member",
    roleLabel: "Gold Club Member",
    email: "member@archfit.in",
    username: "member",
    password: "member123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    gymName: "ARCHFIT Athletic Club",
    badge: "Member Pass",
    planName: "Gold Quarterly Fitness",
    attendanceStreak: 14,
    qrPassCode: "AF-M-101-AARAV"
  }
];

export const AuthProvider = ({ children }) => {
  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('pulsefit_accounts_v2');
    return saved ? JSON.parse(saved) : defaultAccounts;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('pulsefit_isAuth') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('pulsefit_currentUser_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultAccounts[0];
  });

  const currentRole = currentUser?.role || 'superadmin';

  // Helper flags for access control
  const isSuperadmin = currentRole === 'superadmin' || currentRole === 'owner';
  const isAccounts = currentRole === 'accounts';
  const isManager = currentRole === 'manager';
  const isTrainer = currentRole === 'trainer';
  const isMember = currentRole === 'member';

  // Permissions: Managers CANNOT edit or delete existing records (Add-only)
  const canEditDelete = isSuperadmin || isAccounts;
  // Financials: Manager CANNOT access revenue, billing, or expense tracking
  const canAccessFinancials = isSuperadmin || isAccounts;

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pulsefit_accounts_v2', JSON.stringify(accounts));
  }, [accounts]);

  // Hydrate staff accounts from Laravel SQLite backend for the active gym
  useEffect(() => {
    const currentGymId = currentUser?.gymId || currentUser?.gym_id || (typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null);
    if (api.staff?.getAll && currentGymId) {
      api.staff.getAll({ gym_id: currentGymId }).then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          const backendStaff = res.data.map((u) => {
            const role = (u.role || 'manager').toLowerCase();
            return {
              id: `usr-${role}-${u.id}`,
              userId: u.id,
              gymId: u.gym_id || currentGymId,
              gym_id: u.gym_id || currentGymId,
              name: u.name,
              role: role,
              roleLabel:
                role === 'manager'
                  ? 'Operations Manager'
                  : role === 'accounts'
                  ? 'Senior Finance Officer'
                  : role === 'trainer'
                  ? 'Personal Trainer'
                  : role === 'superadmin' || role === 'owner'
                  ? 'Superadmin & General Director'
                  : 'Gym Staff',
              email: u.email,
              username: u.email?.split('@')[0] || u.name,
              password: 'password123',
              mustChangePassword: Boolean(u.must_change_password),
              avatar:
                u.avatar ||
                (role === 'manager'
                  ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'),
              gymName: 'PULSE FIT Athletic Club',
              badge:
                role === 'manager'
                  ? 'Manager Access'
                  : role === 'accounts'
                  ? 'Accounts Access'
                  : role === 'trainer'
                  ? 'Trainer Access'
                  : 'Superadmin Access',
              phone: u.phone || ''
            };
          });

          setAccounts((prev) => {
            const merged = [...prev];
            backendStaff.forEach((bs) => {
              const idx = merged.findIndex(
                (a) => a.email?.toLowerCase() === bs.email?.toLowerCase() || a.userId === bs.userId
              );
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...bs };
              } else {
                merged.push(bs);
              }
            });
            return merged;
          });
        }
      }).catch((err) => console.warn('Failed to load staff accounts:', err.message));
    }
  }, [currentUser?.gymId, currentUser?.gym_id]);

  useEffect(() => {
    localStorage.setItem('pulsefit_isAuth', isAuthenticated.toString());
    if (currentUser) {
      localStorage.setItem('pulsefit_currentUser_v2', JSON.stringify(currentUser));
      if (currentUser.gymId || currentUser.gym_id) {
        localStorage.setItem('pulsefit_gym_id', (currentUser.gymId || currentUser.gym_id).toString());
      }
    }
  }, [isAuthenticated, currentUser]);

  // LOGIN FUNCTION: Supports Superadmin, Accounts, Manager, Trainer, and Member
  const login = async (emailInput, passwordInput) => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    try {
      // 1. Attempt live Laravel Backend API Login
      const res = await api.auth.login(trimmedEmail, trimmedPass);
      if (res.success && res.user) {
        let userRole = res.user.role || 'superadmin';
        if (userRole === 'owner') userRole = 'superadmin';
        const gymId = res.user.gym_id || res.user.gymId || (res.user.gym ? res.user.gym.id : (res.user.id === 1 ? 1 : null));
        const gymName = res.user.gym?.name || (gymId === 1 ? 'PULSE FIT Athletic Club' : (res.user.name + "'s Gym"));

        const roleLabel =
          userRole === 'superadmin' || userRole === 'owner'
            ? 'Superadmin & General Director'
            : userRole === 'manager'
            ? 'Operations Manager'
            : userRole === 'accounts'
            ? 'Senior Finance Officer'
            : userRole === 'trainer'
            ? 'Personal Trainer'
            : 'Gym Member';

        const badge =
          userRole === 'superadmin' || userRole === 'owner'
            ? 'Superadmin Access'
            : userRole === 'manager'
            ? 'Manager Access'
            : userRole === 'accounts'
            ? 'Accounts Access'
            : userRole === 'trainer'
            ? 'Trainer Access'
            : 'Member Pass';

        const backendUser = {
          id: `usr-${userRole}-${res.user.id}`,
          userId: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: userRole,
          roleLabel: roleLabel,
          avatar: res.user.avatar || (userRole === 'trainer' ? defaultAccounts[1].avatar : defaultAccounts[0].avatar),
          phone: res.user.phone,
          gym_id: gymId,
          gymId: gymId,
          mustChangePassword: false,
          badge: badge,
          gymName: gymName
        };

        if (gymId) {
          localStorage.setItem('pulsefit_gym_id', gymId.toString());
        } else {
          localStorage.removeItem('pulsefit_gym_id');
        }

        if (res.token) {
          localStorage.setItem('pulsefit_token', res.token);
        }

        setCurrentUser(backendUser);
        setIsAuthenticated(true);
        return { success: true, user: backendUser };
      }

      return {
        success: false,
        error: res?.message || 'Invalid Credentials. Please check your email and password.'
      };
    } catch (apiErr) {
      console.warn('Backend API login error:', apiErr.message);
      return {
        success: false,
        error: apiErr.message || 'Invalid Credentials. Please check your email and password.'
      };
    }
  };

  // LOGOUT STATE & CONFIRMATION
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const requestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const cancelLogout = () => {
    if (isLoggingOut) return;
    setIsLogoutConfirmOpen(false);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api.auth.logout();
    } catch (e) {}
    // Give a smooth feedback transition
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsLoggingOut(false);
    setIsLogoutConfirmOpen(false);
    setIsAuthenticated(false);
    localStorage.setItem('pulsefit_isAuth', 'false');
    localStorage.removeItem('pulsefit_gym_id');
    localStorage.removeItem('pulsefit_currentUser_v2');
    localStorage.removeItem('pulsefit_token');
    localStorage.removeItem('pulsefit_invoices');
    localStorage.removeItem('pulsefit_expenses');
    localStorage.removeItem('pulsefit_enquiries');
    localStorage.removeItem('pulsefit_accounts_v2');
  };

  // LOGOUT FUNCTION (Triggers confirmation popup)
  const logout = (force = false) => {
    if (force === true) {
      confirmLogout();
    } else {
      requestLogout();
    }
  };

  // UPDATE PASSWORD FUNCTION
  const updateUserPassword = async (newPassword) => {
    if (!currentUser) return false;

    try {
      await api.auth.changePassword(currentUser.password || 'admin123', newPassword, newPassword);
    } catch (e) {}

    const updatedUser = {
      ...currentUser,
      password: newPassword,
      mustChangePassword: false
    };

    setCurrentUser(updatedUser);
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === currentUser.id ? updatedUser : acc))
    );

    return true;
  };

  // REGISTER ACCOUNT (When Owner creates Member or Trainer)
  const registerAccount = async (accountData) => {
    const newAccount = {
      id: accountData.id || `usr-${Date.now().toString().slice(-4)}`,
      name: accountData.name,
      email: accountData.email,
      username: accountData.email,
      password: accountData.password || 'pulse123',
      mustChangePassword: true,
      role: accountData.role,
      roleLabel:
        accountData.role === 'trainer'
          ? 'Personal Trainer'
          : accountData.role === 'owner'
          ? 'Gym Owner'
          : 'Gym Member',
      avatar:
        accountData.avatar ||
        `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
      planName: accountData.planName || 'Standard',
      specialty: accountData.specialty || '',
      qrPassCode: accountData.qrPassCode || `PF-${accountData.role.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      badge: accountData.role === 'trainer' ? 'Trainer Access' : accountData.role === 'owner' ? 'Owner Access' : 'Member Pass'
    };

    try {
      await api.auth.register({
        name: accountData.name,
        email: accountData.email,
        password: accountData.password || 'pulse123',
        role: accountData.role,
        phone: accountData.phone,
      });
    } catch (e) {}

    setAccounts((prev) => [newAccount, ...prev]);
    return newAccount;
  };

  // CREATE STAFF ACCOUNT (Owner creates manager, accounts, or trainer account for active gym)
  const createStaffAccount = async ({ name, email, password, role, phone, gym_id, gymId }) => {
    const activeGymId = gym_id || gymId || currentUser?.gymId || currentUser?.gym_id || (typeof window !== 'undefined' ? localStorage.getItem('pulsefit_gym_id') : null) || 1;
    const roleNormalized = role.toLowerCase();
    let backendUser = null;
    try {
      const res = await api.staff.create({
        name,
        email,
        password: password || 'staff123',
        role: roleNormalized,
        phone: phone || '',
        gym_id: Number(activeGymId)
      });
      if (res?.data) {
        backendUser = res.data;
      }
    } catch (e) {
      console.warn('Backend create staff note:', e.message);
      try {
        await api.auth.register({
          name,
          email,
          password: password || 'staff123',
          role: roleNormalized,
          phone: phone || '',
          gym_id: Number(activeGymId)
        });
      } catch (regErr) {}
    }

    const newStaff = {
      id: backendUser?.id ? `usr-${roleNormalized}-${backendUser.id}` : `usr-${roleNormalized}-${Date.now().toString().slice(-4)}`,
      userId: backendUser?.id || Date.now(),
      name,
      email,
      username: email.split('@')[0],
      password: password || 'staff123',
      mustChangePassword: false,
      role: roleNormalized,
      roleLabel:
        roleNormalized === 'manager'
          ? 'Operations Manager'
          : roleNormalized === 'accounts'
          ? 'Senior Finance Officer'
          : roleNormalized === 'trainer'
          ? 'Personal Trainer'
          : 'Staff Member',
      avatar:
        backendUser?.avatar ||
        (roleNormalized === 'manager'
          ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'),
      badge: roleNormalized === 'manager' ? 'Manager Access' : roleNormalized === 'accounts' ? 'Accounts Access' : 'Staff Access',
      phone: phone || '',
      gymName: currentUser?.gymName || 'PULSE FIT Athletic Club',
      gymId: Number(activeGymId),
      gym_id: Number(activeGymId)
    };

    setAccounts((prev) => [newStaff, ...prev.filter((a) => a.email?.toLowerCase() !== email.toLowerCase())]);
    return newStaff;
  };

  // QUICK SWITCH ROLE
  const switchRole = (newRole) => {
    const defaultUserForRole = accounts.find((acc) => acc.role === newRole) || defaultAccounts.find((a) => a.role === newRole) || defaultAccounts[0];
    if (defaultUserForRole) {
      setCurrentUser(defaultUserForRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        currentRole,
        isSuperadmin,
        isAccounts,
        isManager,
        isTrainer,
        isMember,
        canEditDelete,
        canAccessFinancials,
        accounts,
        login,
        logout,
        isLogoutConfirmOpen,
        isLoggingOut,
        requestLogout,
        confirmLogout,
        cancelLogout,
        updateUserPassword,
        registerAccount,
        createStaffAccount,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
