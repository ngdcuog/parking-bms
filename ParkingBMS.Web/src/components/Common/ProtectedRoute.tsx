import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spin } from 'antd';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('Admin' | 'Manager' | 'Staff' | 'ParkingUser')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, accessToken, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, fontFamily: 'IBM Plex Sans', fontWeight: 300, color: '#525252' }}>
          Loading Parking BMS...
        </div>
      </div>
    );
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
