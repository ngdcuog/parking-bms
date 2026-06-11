import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Space, message } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { KeyRound, User, Mail, Phone, UserCheck } from 'lucide-react';

const { Title, Text } = Typography;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/auth/register', values);
      message.success('Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Đăng ký thất bại. Tên đăng nhập hoặc Email có thể đã tồn tại.';
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
          maxWidth: '480px',
          border: '1px solid var(--colors-hairline)',
          backgroundColor: '#ffffff',
          padding: '24px'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
            <span style={{ color: 'var(--colors-primary)', fontWeight: 600, fontSize: '14px' }}>
              ĐĂNG KÝ LÁI XE
            </span>
            <Title level={2} style={{ margin: '4px 0 0', fontWeight: 300 }}>
              Đăng ký tài khoản mới
            </Title>
            <Text type="secondary" style={{ fontSize: '14px' }}>
              Tài khoản đặt chỗ trước và theo dõi phí gửi xe
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
            name="register_form"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              label="Họ và tên"
              name="fullName"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên của bạn!' }]}
            >
              <Input
                prefix={<UserCheck size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="Nhập họ và tên đầy đủ"
                size="large"
              />
            </Form.Item>

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
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu!' },
                { min: 6, message: 'Mật khẩu phải dài tối thiểu 6 ký tự!' }
              ]}
            >
              <Input.Password
                prefix={<KeyRound size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Địa chỉ Email"
              name="email"
              rules={[
                { type: 'email', message: 'Email không hợp lệ!' },
                { required: true, message: 'Vui lòng nhập địa chỉ email!' }
              ]}
            >
              <Input
                prefix={<Mail size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="example@domain.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Số điện thoại"
              name="phone"
            >
              <Input
                prefix={<Phone size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
                placeholder="Nhập số điện thoại (tùy chọn)"
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
                Tạo tài khoản
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--colors-surface-1)' }}>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: 'var(--colors-primary)', fontWeight: 600 }}>
                Đăng nhập tại đây
              </Link>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};
