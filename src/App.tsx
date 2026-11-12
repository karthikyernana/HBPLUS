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

  return isAuthorizedForDashboard ? <DashboardScreen /> : <LoginScreen />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
