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
    role: "owner",
    roleLabel: "Gym Owner & GM",
    email: "owner@pulsefit.in",
    username: "owner",
    password: "admin123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    gymName: "PULSE FIT Athletic Club",
    badge: "Owner Access"
  },
  {
    id: "usr-trainer-2",
    userId: 2,
    gymId: 1,
    gym_id: 1,
    name: "Coach Alex Rivers",
    role: "trainer",
    roleLabel: "Senior Coach & CPT",
    email: "trainer@pulsefit.in",
    username: "trainer",
    password: "trainer123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200&auto=format&fit=crop&q=80",
    gymName: "PULSE FIT Athletic Club",
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
    email: "member@pulsefit.in",
    username: "member",
    password: "member123",
    mustChangePassword: false,
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80",
    gymName: "PULSE FIT Athletic Club",
    badge: "Member Pass",
    planName: "Gold Quarterly Fitness",
    attendanceStreak: 14,
    qrPassCode: "PF-M-101-AARAV"
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

  const currentRole = currentUser?.role || 'owner';

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pulsefit_accounts_v2', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('pulsefit_isAuth', isAuthenticated.toString());
    if (currentUser) {
      localStorage.setItem('pulsefit_currentUser_v2', JSON.stringify(currentUser));
      if (currentUser.gymId || currentUser.gym_id) {
        localStorage.setItem('pulsefit_gym_id', (currentUser.gymId || currentUser.gym_id).toString());
      } else if (!localStorage.getItem('pulsefit_gym_id')) {
        localStorage.setItem('pulsefit_gym_id', '1');
      }
    }
  }, [isAuthenticated, currentUser]);

  // LOGIN FUNCTION: Supports Owner, Trainer, and Member on unified Web & Mobile app
  const login = async (emailInput, passwordInput) => {
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    try {
      // 1. Attempt live Laravel Backend API Login
      const res = await api.auth.login(trimmedEmail, trimmedPass);
      if (res.success && res.user) {
        const userRole = res.user.role || 'owner';
        const gymId = res.user.gym_id || res.user.gymId || (res.user.gym ? res.user.gym.id : (res.user.id === 1 ? 1 : null));
        const gymName = res.user.gym?.name || (gymId === 1 ? 'PULSE FIT Athletic Club' : (res.user.name + "'s Gym"));

        const roleLabel =
          userRole === 'owner'
            ? 'Gym Owner & GM'
            : userRole === 'trainer'
            ? 'Personal Trainer'
            : 'Gym Member';

        const badge =
          userRole === 'owner'
            ? 'Owner Access'
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

        setCurrentUser(backendUser);
        setIsAuthenticated(true);
        return { success: true, user: backendUser };
      }
    } catch (apiErr) {
      console.warn('Backend API login error, testing local fallback:', apiErr.message);
    }

    // 2. Fallback to matching known accounts
    const matchedUser = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === trimmedEmail &&
        acc.password === trimmedPass
    );

    if (matchedUser) {
      localStorage.setItem('pulsefit_gym_id', '1');
      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      return { success: true, user: matchedUser };
    }

    return {
      success: false,
      error: 'Invalid Credentials. Please check your email and password.'
    };
  };

  // LOGOUT FUNCTION
  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (e) {}
    setIsAuthenticated(false);
    localStorage.setItem('pulsefit_isAuth', 'false');
    localStorage.removeItem('pulsefit_gym_id');
    localStorage.removeItem('pulsefit_currentUser_v2');
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
        accounts,
        login,
        logout,
        updateUserPassword,
        registerAccount,
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
