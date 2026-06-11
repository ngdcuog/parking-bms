import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { api } from './services/api';
import { carbonTheme } from './styles/theme';

// Layout
import { MainLayout } from './components/Layout/MainLayout';

// Common pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Unauthorized } from './pages/Unauthorized';

// Admin pages
import { UserManagement } from './pages/Admin/UserManagement';
import { AdminDashboard } from './pages/Admin/Dashboard';

// Manager pages
import { Dashboard } from './pages/Manager/Dashboard';
import { BuildingManagement } from './pages/Manager/BuildingManagement';
import { TariffManagement } from './pages/Manager/TariffManagement';
import { ExceptionLogs } from './pages/Manager/ExceptionLogs';

// Staff pages
import { ParkingGrid } from './pages/Staff/ParkingGrid';
import { ExceptionHandling } from './pages/Staff/ExceptionHandling';

// Driver pages
import { Bookings } from './pages/User/Bookings';
import { ActiveVehicle } from './pages/User/ActiveVehicle';

// Route Guard
import { ProtectedRoute } from './components/Common/ProtectedRoute';

const queryClient = new QueryClient();

// Redirect helper component based on user roles
const HomeRedirect: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'Admin': return <Navigate to="/admin/dashboard" replace />;
    case 'Manager': return <Navigate to="/manager/dashboard" replace />;
    case 'Staff': return <Navigate to="/staff/grid" replace />;
    case 'ParkingUser': return <Navigate to="/user/bookings" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

// Initial Auto-Login listener
const AuthInitListener: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Try refreshing token from cookie
        const refreshResponse = await api.post('/auth/refresh');
        const { accessToken } = refreshResponse.data.data;

        // Fetch user detail
        const meResponse = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        setAuth(meResponse.data.data, accessToken);
      } catch (e) {
        clearAuth(); // Set loading to false and clear auth
      }
    };
    checkSession();
  }, [setAuth, clearAuth]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={carbonTheme}>
        <BrowserRouter>
          <AuthInitListener>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Workspace Layout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomeRedirect />} />

                {/* System Admin Routes */}
                <Route
                  path="admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Parking Manager Routes */}
                <Route
                  path="manager/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['Manager']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="manager/buildings"
                  element={
                    <ProtectedRoute allowedRoles={['Manager']}>
                      <BuildingManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="manager/tariffs"
                  element={
                    <ProtectedRoute allowedRoles={['Manager']}>
                      <TariffManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="manager/exceptions"
                  element={
                    <ProtectedRoute allowedRoles={['Manager']}>
                      <ExceptionLogs />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Routes */}
                <Route
                  path="staff/grid"
                  element={
                    <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                      <ParkingGrid />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="staff/exceptions"
                  element={
                    <ProtectedRoute allowedRoles={['Staff', 'Admin']}>
                      <ExceptionHandling />
                    </ProtectedRoute>
                  }
                />

                {/* Parking User / Driver Routes */}
                <Route
                  path="user/bookings"
                  element={
                    <ProtectedRoute allowedRoles={['ParkingUser']}>
                      <Bookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="user/active"
                  element={
                    <ProtectedRoute allowedRoles={['ParkingUser']}>
                      <ActiveVehicle />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all unmatched route inside shell */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </AuthInitListener>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
