import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Space } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import { KeyRound, User } from 'lucide-react';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/login', values);
      const { userId, username, fullName, role, buildingId, buildingName, accessToken } = response.data.data;
      const user = { userId, username, fullName, role, buildingId, buildingName };
      setAuth(user, accessToken);

      // Redirect based on user role
      if (role === 'Admin') {
        navigate('/admin/users');
      } else if (role === 'Manager') {
        navigate('/manager/dashboard');
      } else if (role === 'Staff') {
        navigate('/staff/grid');
      } else {
        navigate('/user/bookings');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--colors-surface-1)',
        padding: '24px',
        fontFamily: 'IBM Plex Sans'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: '440px',
          border: '1px solid var(--colors-hairline)',
          backgroundColor: '#ffffff',
          padding: '24px'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
            <span style={{ color: 'var(--colors-primary)', fontWeight: 600, fontSize: '14px' }}>
              IBM CARBON
            </span>
            <Title level={2} style={{ margin: '4px 0 0', fontWeight: 300 }}>
              Đăng nhập hệ thống
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Hệ thống quản lý đỗ xe thông minh Parking BMS
            </Text>
          </div>

          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              style={{ borderRadius: 0 }}
            />
          )}

          <Form
            name="login_form"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
            >
              <Input
                prefix={<User size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="Nhập tên đăng nhập"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password
                prefix={<KeyRound size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                style={{
                  height: '48px',
                  fontWeight: 600,
                  fontSize: '15px'
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--colors-surface-1)' }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Chưa có tài khoản lái xe?{' '}
              <Link to="/register" style={{ color: 'var(--colors-primary)', fontWeight: 600 }}>
                Đăng ký ngay
              </Link>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};
