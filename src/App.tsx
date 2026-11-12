/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';

const AppRouter: React.FC = () => {
  const { currentUser, currentPath } = useAuth();
  const isAuthorizedForDashboard = Boolean(currentUser && currentPath === '/dashboard');

  return isAuthorizedForDashboard ? (
    <div key="route-dashboard" className="animate-studio-page">
      <DashboardScreen />
    </div>
  ) : (
    <div key="route-login" className="animate-studio-page">
      <LoginScreen />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
