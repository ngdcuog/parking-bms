import React, { useState } from 'react';
import { Layout, Menu, Button, Space, Typography, Drawer, Modal, Form, Input, message, Progress } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Grid3X3,
  FileWarning,
  Users,
  Calendar,
  Car,
  LogOut,
  User,
  Clock
} from 'lucide-react';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Own Change Password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordForm] = Form.useForm();

  const handleLogout = () => {
    Modal.confirm({
      title: 'Đăng xuất khỏi hệ thống',
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý gửi xe?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy bỏ',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          console.error('Logout error', e);
        } finally {
          clearAuth();
          navigate('/login');
        }
      }
    });
  };

  const handleChangePassword = async (values: any) => {
    setChangePasswordLoading(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Thay đổi mật khẩu cá nhân thành công!');
      setShowChangePassword(false);
      changePasswordForm.resetFields();
      setProfileOpen(false); // Close drawer on success
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Mật khẩu hiện tại không đúng hoặc lỗi hệ thống.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const getMenuItems = () => {
    if (!user) return [];

    const items = [];

    // System Administrator Menu
    if (user.role === 'Admin') {
      items.push(
        {
          key: '/admin/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'Tổng quan hệ thống',
        },
        {
          key: '/admin/users',
          icon: <Users size={18} />,
          label: 'Tài khoản người dùng',
        }
      );
    }

    // Parking Manager Menu
    if (user.role === 'Manager') {
      items.push(
        {
          key: '/manager/dashboard',
          icon: <LayoutDashboard size={18} />,
          label: 'Dashboard Báo cáo',
        },
        {
          key: '/manager/buildings',
          icon: <Building2 size={18} />,
          label: 'Cấu trúc Tòa nhà',
        },
        {
          key: '/manager/tariffs',
          icon: <DollarSign size={18} />,
          label: 'Cấu hình Giá vé',
        },
        {
          key: '/manager/exceptions',
          icon: <FileWarning size={18} />,
          label: 'Log Ngoại lệ',
        }
      );
    }

    // Parking Staff Menu
    if (user.role === 'Staff') {
      items.push(
        {
          key: '/staff/grid',
          icon: <Grid3X3 size={18} />,
          label: 'Sơ đồ bãi xe',
        },
        {
          key: '/staff/exceptions',
          icon: <FileWarning size={18} />,
          label: 'Xử lý Ngoại lệ',
        }
      );
    }

    // Parking User / Driver Menu
    if (user.role === 'ParkingUser') {
      items.push(
        {
          key: '/user/bookings',
          icon: <Calendar size={18} />,
          label: 'Đặt chỗ trước',
        },
        {
          key: '/user/active',
          icon: <Car size={18} />,
          label: 'Xe đang gửi',
        }
      );
    }

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Utility Bar */}
      <div
        style={{
          height: '32px',
          backgroundColor: 'var(--colors-surface-1)',
          borderBottom: '1px solid var(--colors-surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 24px',
          fontSize: '12px',
          color: 'var(--colors-ink-muted)',
          fontFamily: 'IBM Plex Sans'
        }}
      >
        <Space>
          <Clock size={12} />
          <span>Thời gian hệ thống: {new Date().toLocaleDateString('vi-VN')} (UTC+7)</span>
        </Space>
        <Space>
          <span>Địa điểm: <strong>Parking Tower A</strong></span>
          {user && (
            <span style={{ marginLeft: 16 }}>
              Vai trò: <strong style={{ color: 'var(--colors-primary)' }}>{user.role}</strong>
            </span>
          )}
        </Space>
      </div>

      {/* Main Layout Shell */}
      <Layout style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        {/* Sidebar Navigation */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={240}
          style={{
            background: 'var(--colors-surface-1)',
            borderRight: '1px solid var(--colors-hairline)',
          }}
          trigger={null}
        >
          <div
            style={{
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '0 20px',
              borderBottom: '1px solid var(--colors-hairline)',
              backgroundColor: '#ffffff'
            }}
          >
            <span
              style={{
                fontFamily: 'IBM Plex Sans',
                fontWeight: 600,
                fontSize: collapsed ? '18px' : '16px',
                color: 'var(--colors-primary)'
              }}
            >
              {collapsed ? 'IBM' : 'IBM. ParkingBMS'}
            </span>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ borderRight: 0, backgroundColor: 'transparent', marginTop: 16 }}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>

        <Layout style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Top Sticky Header */}
          <Header
            style={{
              background: '#ffffff',
              padding: '0 24px',
              height: '48px',
              lineHeight: '48px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--colors-hairline)',
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'IBM Plex Sans', fontSize: '14px', color: 'var(--colors-ink-muted)' }}>
                Hệ thống quản lý tòa nhà gửi xe thông minh
              </Text>
            </div>

            <Space size="middle">
              {user && (
                <Button
                  type="text"
                  icon={<User size={16} />}
                  onClick={() => setProfileOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span style={{ fontWeight: 600 }}>{user.fullName}</span>
                </Button>
              )}
              <Button
                type="text"
                danger
                icon={<LogOut size={16} />}
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {!collapsed && <span>Đăng xuất</span>}
              </Button>
            </Space>
          </Header>

          {/* Main Router Content */}
          <Content
            style={{
              padding: '24px',
              margin: 0,
              background: 'var(--colors-canvas)',
              overflowY: 'auto',
              height: 'calc(100vh - 80px)'
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>

      {/* User Profile Side Drawer */}
      <Drawer
        title="Thông tin tài khoản"
        placement="right"
        onClose={() => setProfileOpen(false)}
        open={profileOpen}
        width={360}
      >
        {user && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'center', padding: '24px 0', borderBottom: '1px solid var(--colors-hairline)' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '0px',
                  backgroundColor: 'var(--colors-surface-1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '1px solid var(--colors-hairline-strong)'
                }}
              >
                <User size={32} color="var(--colors-primary)" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--colors-ink)', marginBottom: '4px' }}>
                {user.fullName}
              </h3>
              <span style={{ fontSize: '14px', color: 'var(--colors-primary)', fontWeight: 600 }}>
                {user.role}
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--colors-surface-1)' }}>
                <span style={{ color: 'var(--colors-ink-muted)' }}>Tên đăng nhập:</span>
                <span style={{ fontWeight: 600 }}>{user.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--colors-surface-1)' }}>
                <span style={{ color: 'var(--colors-ink-muted)' }}>Mã số User ID:</span>
                <span style={{ fontWeight: 600 }}>#{user.userId}</span>
              </div>
            </div>

            {/* Expandable change own password form */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
              {!showChangePassword ? (
                <Button 
                  type="default" 
                  onClick={() => setShowChangePassword(true)}
                  style={{ width: '100%', borderRadius: 0 }}
                >
                  Đổi mật khẩu cá nhân
                </Button>
              ) : (
                <Form
                  form={changePasswordForm}
                  layout="vertical"
                  onFinish={handleChangePassword}
                  requiredMark={false}
                >
                  <Text style={{ fontWeight: 600, display: 'block', marginBottom: '16px' }}>Đổi mật khẩu</Text>
                  
                  <Form.Item
                    label="Mật khẩu hiện tại"
                    name="currentPassword"
                    rules={[{ required: true, message: 'Nhập mật khẩu hiện tại!' }]}
                  >
                    <Input.Password placeholder="Mật khẩu hiện tại" />
                  </Form.Item>

                  <Form.Item
                    label="Mật khẩu mới"
                    name="newPassword"
                    rules={[
                      { required: true, message: 'Nhập mật khẩu mới!' },
                      { min: 6, message: 'Tối thiểu 6 ký tự!' }
                    ]}
                  >
                    <Input.Password placeholder="Mật khẩu mới" />
                  </Form.Item>

                  {/* Password strength assessment */}
                  <Form.Item noStyle shouldUpdate={(prev, curr) => prev.newPassword !== curr.newPassword}>
                    {({ getFieldValue }) => {
                      const pass = getFieldValue('newPassword') || '';
                      if (!pass) return null;
                      
                      const getStrength = (p: string) => {
                        let score = 0;
                        if (p.length >= 6) score++;
                        if (p.length >= 8) score++;
                        if (/[A-Z]/.test(p)) score++;
                        if (/[0-9]/.test(p)) score++;
                        if (/[^A-Za-z0-9]/.test(p)) score++;
                        
                        if (score <= 2) return { label: 'Yếu', color: 'var(--colors-error)', percent: (score/5)*100 };
                        if (score <= 4) return { label: 'Trung bình', color: 'var(--colors-warning)', percent: (score/5)*100 };
                        return { label: 'Mạnh', color: 'var(--colors-success)', percent: (score/5)*100 };
                      };
                      
                      const strength = getStrength(pass);
                      return (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Độ mạnh:</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: strength.color }}>{strength.label}</span>
                          </div>
                          <Progress percent={strength.percent} strokeColor={strength.color} showInfo={false} size="small" style={{ margin: 0 }} />
                        </div>
                      );
                    }}
                  </Form.Item>

                  <Form.Item
                    label="Xác nhận mật khẩu mới"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Xác nhận mật khẩu mới!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="Xác nhận mật khẩu mới" />
                  </Form.Item>

                  <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <Button onClick={() => {
                      setShowChangePassword(false);
                      changePasswordForm.resetFields();
                    }}>
                      Hủy
                    </Button>
                    <Button type="primary" htmlType="submit" loading={changePasswordLoading}>
                      Cập nhật
                    </Button>
                  </Space>
                </Form>
              )}
            </div>
          </Space>
        )}
      </Drawer>
    </Layout>
  );
};
