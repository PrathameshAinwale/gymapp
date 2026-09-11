import React, { useState, useEffect } from 'react';
import { SuperadminLogin } from './SuperadminLogin';
import { SuperadminDashboard } from './SuperadminDashboard';

export const SuperadminApp = () => {
  const [superUser, setSuperUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pulsefit_superadmin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    setSuperUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('pulsefit_superadmin_user');
    localStorage.removeItem('pulsefit_superadmin_token');
    setSuperUser(null);
  };

  if (!superUser) {
    return <SuperadminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <SuperadminDashboard superUser={superUser} onLogout={handleLogout} />;
};
