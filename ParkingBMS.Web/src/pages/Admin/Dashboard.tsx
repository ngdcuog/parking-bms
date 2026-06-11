import React, { useEffect, useState } from 'react';
import { Card, Space, Typography, Progress, Button, Row, Col } from 'antd';
import { api } from '../../services/api';
import { Users, ShieldAlert, Activity, UserPlus, ArrowRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description }) => (
  <Card
    style={{
      backgroundColor: 'var(--colors-surface-1)',
      border: 'none',
      height: '100%',
    }}
    bodyStyle={{ padding: '24px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <Text style={{ color: 'var(--colors-ink-muted)', fontSize: '14px', fontFamily: 'IBM Plex Sans' }}>{title}</Text>
      <div style={{ color: 'var(--colors-primary)' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: 300, color: 'var(--colors-ink)', marginBottom: '8px', lineHeight: 1 }}>
      {value}
    </div>
    <Text style={{ color: 'var(--colors-ink-subtle)', fontSize: '12px' }}>{description}</Text>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    managers: 0,
    staffs: 0,
    drivers: 0,
  });
  const [loading, setLoading] = useState(true);
  
  // Ping status state
  const [ping, setPing] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await api.get('/users', {
        params: { page: 1, pageSize: 1 }
      });
      const { totalCount } = response.data.data;
      
      // Let's query by roles to compute counts
      const [adminRes, managerRes, staffRes, driverRes] = await Promise.all([
        api.get('/users', { params: { role: 0, page: 1, pageSize: 1 } }), // Admin
        api.get('/users', { params: { role: 1, page: 1, pageSize: 1 } }), // Manager
        api.get('/users', { params: { role: 2, page: 1, pageSize: 1 } }), // Staff
        api.get('/users', { params: { role: 3, page: 1, pageSize: 1 } }), // ParkingUser
      ]);

      setStats({
        total: totalCount,
        admins: adminRes.data.data.totalCount || 0,
        managers: managerRes.data.data.totalCount || 0,
        staffs: staffRes.data.data.totalCount || 0,
        drivers: driverRes.data.data.totalCount || 0,
      });
    } catch (error) {
      console.error('Failed to fetch admin stats', error);
    } finally {
      setLoading(false);
    }
  };

  // Perform a live ping check to measure latency
  const performPing = async () => {
    const startTime = performance.now();
    try {
      // Fast light call
      await api.get('/users', { params: { page: 1, pageSize: 1 } });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      setPing(latency);
      setIsOnline(true);
    } catch (error) {
      setIsOnline(false);
      setPing(null);
    }
  };

  useEffect(() => {
    fetchStats();
    performPing();

    const interval = setInterval(() => {
      performPing();
    }, 5000); // Check latency every 5s

    return () => clearInterval(interval);
  }, []);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Tổng quan hệ thống</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Giám sát trạng thái hoạt động toàn hệ thống và các tham số vận hành.</span>
        </div>

        {/* Live System Health Indicator */}
        <Card 
          style={{ 
            borderRadius: 0, 
            border: '1px solid var(--colors-hairline)', 
            padding: '2px 16px',
            backgroundColor: '#ffffff'
          }}
          bodyStyle={{ padding: '8px 0' }}
        >
          <Space size="middle">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div 
                style={{ 
                  width: 8, 
                  height: 8, 
                  backgroundColor: isOnline ? 'var(--colors-success)' : 'var(--colors-error)',
                  borderRadius: '50%',
                  boxShadow: isOnline ? '0 0 8px var(--colors-success)' : '0 0 8px var(--colors-error)',
                }} 
              />
              <Text style={{ fontWeight: 600, fontSize: '13px' }}>
                {isOnline ? 'Máy chủ: Hoạt động' : 'Máy chủ: Mất kết nối'}
              </Text>
            </div>
            {isOnline && ping !== null && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Ping: <strong style={{ color: 'var(--colors-success)' }}>{ping} ms</strong>
              </Text>
            )}
          </Space>
        </Card>
      </div>

      {/* Stats Cards Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="TỔNG TÀI KHOẢN"
            value={loading ? '...' : stats.total}
            icon={<Users size={20} />}
            description="Tài khoản đăng ký trên hệ thống"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="TÀI KHOẢN ADMIN"
            value={loading ? '...' : stats.admins}
            icon={<ShieldAlert size={20} />}
            description="Quản trị viên quản lý hệ thống"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="NHÂN VIÊN ĐANG CHẠY"
            value={loading ? '...' : stats.staffs}
            icon={<Activity size={20} />}
            description="Nhân viên bãi đỗ (Staff)"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="TÀI XẾ / KHÁCH HÀNG"
            value={loading ? '...' : stats.drivers}
            icon={<UserPlus size={20} />}
            description="Người dùng gửi xe (Driver)"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '8px' }}>
        {/* Left Side: System info */}
        <Col xs={24} lg={14}>
          <Card 
            title="Phân bố vai trò tài khoản" 
            style={{ border: '1px solid var(--colors-hairline)', borderRadius: 0 }}
            headStyle={{ borderBottom: '1px solid var(--colors-hairline)', fontWeight: 600 }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>Quản trị viên (Admin)</Text>
                  <Text style={{ fontWeight: 600 }}>{stats.admins} tài khoản</Text>
                </div>
                <Progress percent={stats.total ? Math.round((stats.admins / stats.total) * 100) : 0} strokeColor="var(--colors-error)" showInfo={false} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>Quản lý bãi đỗ (Manager)</Text>
                  <Text style={{ fontWeight: 600 }}>{stats.managers} tài khoản</Text>
                </div>
                <Progress percent={stats.total ? Math.round((stats.managers / stats.total) * 100) : 0} strokeColor="var(--colors-primary)" showInfo={false} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>Nhân viên kiểm soát (Staff)</Text>
                  <Text style={{ fontWeight: 600 }}>{stats.staffs} tài khoản</Text>
                </div>
                <Progress percent={stats.total ? Math.round((stats.staffs / stats.total) * 100) : 0} strokeColor="var(--colors-success)" showInfo={false} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <Text>Khách hàng gửi xe (ParkingUser)</Text>
                  <Text style={{ fontWeight: 600 }}>{stats.drivers} tài khoản</Text>
                </div>
                <Progress percent={stats.total ? Math.round((stats.drivers / stats.total) * 100) : 0} strokeColor="var(--colors-warning)" showInfo={false} />
              </div>
            </Space>
          </Card>
        </Col>

        {/* Right Side: System parameters & quick actions */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* System settings widget */}
            <Card
              title={
                <Space>
                  <Settings size={16} />
                  <span>Tham số thuật toán & Hệ thống</span>
                </Space>
              }
              style={{ border: '1px solid var(--colors-hairline)', borderRadius: 0 }}
              headStyle={{ borderBottom: '1px solid var(--colors-hairline)', fontWeight: 600 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-surface-2)', paddingBottom: '8px' }}>
                  <Text style={{ color: 'var(--colors-ink-muted)' }}>Thời gian ân hạn đặt chỗ:</Text>
                  <Text style={{ fontWeight: 600 }}>15 phút</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--colors-surface-2)', paddingBottom: '8px' }}>
                  <Text style={{ color: 'var(--colors-ink-muted)' }}>Mức giới hạn Booking chờ:</Text>
                  <Text style={{ fontWeight: 600 }}>Tối đa 3 lượt</Text>
                </div>
                <div>
                  <Text style={{ color: 'var(--colors-ink-muted)', display: 'block', marginBottom: '8px' }}>
                    Phân bổ bãi đỗ xe thông minh (AI Weights):
                  </Text>
                  <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--colors-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <Text>- Trọng số Khoảng cách (Distance):</Text>
                      <Text style={{ fontWeight: 600 }}>30%</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <Text>- Cân bằng mặt sàn (Floor Balance):</Text>
                      <Text style={{ fontWeight: 600 }}>60%</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <Text>- Khớp chuẩn loại xe (Vehicle Match):</Text>
                      <Text style={{ fontWeight: 600 }}>10%</Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quick Actions Card */}
            <Card
              style={{ border: '1px solid var(--colors-hairline)', borderRadius: 0 }}
              bodyStyle={{ padding: '20px' }}
            >
              <Title level={4} style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Thao tác nhanh</Title>
              <Text style={{ color: 'var(--colors-ink-muted)', fontSize: '13px', display: 'block', marginBottom: '16px' }}>
                Quản lý các tài khoản nhân viên hoặc cấu hình hệ thống nhanh chóng.
              </Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  type="primary" 
                  icon={<UserPlus size={16} />}
                  onClick={() => navigate('/admin/users')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Quản lý tài khoản
                </Button>
                <Button 
                  type="default" 
                  icon={<ArrowRight size={16} />}
                  onClick={() => navigate('/admin/users')}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Xem danh sách nhân viên bãi đỗ
                </Button>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  );
};
