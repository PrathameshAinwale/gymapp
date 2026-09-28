import React, { useState, useEffect } from 'react';
import { SuperadminLogin } from './SuperadminLogin';
import { SuperadminDashboard } from './SuperadminDashboard';

export const SuperadminApp = () => {
  // Always require authentication whenever /superadmin is hit
  const [superUser, setSuperUser] = useState(null);

  useEffect(() => {
    // Purge persistent user so that every visit to /superadmin strictly asks for ID and password
    localStorage.removeItem('pulsefit_superadmin_user');
  }, []);

  const handleLoginSuccess = (user, token) => {
    setSuperUser(user);
    if (token) {
      sessionStorage.setItem('pulsefit_superadmin_token', token);
      localStorage.setItem('pulsefit_token', token); // For API requests
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pulsefit_superadmin_token');
    localStorage.removeItem('pulsefit_superadmin_user');
    setSuperUser(null);
  };

  if (!superUser) {
    return <SuperadminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <SuperadminDashboard superUser={superUser} onLogout={handleLogout} />;
};
