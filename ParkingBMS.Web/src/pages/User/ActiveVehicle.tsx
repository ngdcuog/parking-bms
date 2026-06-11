import React, { useEffect, useState, useRef } from 'react';
import { Space, Card, Row, Col, Statistic, Spin, message, Typography, Tag, Table } from 'antd';
import { api } from '../../services/api';
import { Car, Clock, DollarSign, MapPin, Compass } from 'lucide-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ActiveSession {
  sessionId: string;
  licensePlate: string;
  vehicleType: number | string;
  slotCode: string;
  floorName: string;
  buildingName?: string;
  checkInTime: string;
}

interface FeeDetails {
  durationMinutes: number;
  estimatedFee: number;
  isOverstay: boolean;
}

export const ActiveVehicle: React.FC = () => {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [fees, setFees] = useState<FeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const timerRef = useRef<any>(null);

  const fetchActiveSession = async () => {
    try {
      // Fetch user's active session history
      const response = await api.get('/sessions/my-history', {
        params: { status: 0, pageSize: 1 } // status 0 is Active
      });
      const items = response.data.data.items;
      if (items.length > 0) {
        const active = items[0];
        setSession(active);
        // Load fee details
        fetchFee(active.sessionId);
        // Polling setup for fee updates every 30s
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          fetchFee(active.sessionId);
        }, 30000);
      } else {
        setSession(null);
        setFees(null);
      }
    } catch (e) {
      console.error(e);
      message.error('Không thể kiểm tra thông tin đỗ xe.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFee = async (sessionId: string) => {
    try {
      const response = await api.get(`/sessions/${sessionId}/current-fee`);
      setFees(response.data.data);
    } catch (e) {
      console.error('Error fetching current fee', e);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/sessions/my-history', {
        params: { status: 1, pageSize: 20 } // status 1 is Closed
      });
      setHistory(response.data.data.items || []);
    } catch (e) {
      console.error('Error fetching history sessions', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSession();
    fetchHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Đang kiểm tra kết nối đỗ xe..." />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', fontFamily: 'IBM Plex Sans' }}>
      <div style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Xe đang gửi trong bãi</Title>
        <span style={{ color: 'var(--colors-ink-muted)' }}>Theo dõi vị trí đỗ xe của bạn và xem ước tính chi phí đỗ xe theo thời gian thực (real-time).</span>
      </div>

      {session ? (
        <Row gutter={[24, 24]}>
          {/* Active vehicle visualization */}
          <Col xs={24} md={12}>
            <Card
              title={
                <Space>
                  <MapPin size={18} color="var(--colors-primary)" />
                  <span>Vị trí chỉ định đỗ xe</span>
                </Space>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
                {/* Visual car slot element */}
                <div
                  style={{
                    width: '180px',
                    height: '240px',
                    backgroundColor: '#ffebe9',
                    border: '3px solid var(--colors-semantic-error)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    animation: 'pulse 2s infinite ease-in-out'
                  }}
                >
                  <Car size={64} color="var(--colors-semantic-error)" />
                  <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--colors-semantic-error)', marginTop: 12 }}>
                    {session.slotCode}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--colors-ink-muted)', marginTop: 4, textAlign: 'center' }}>
                    {session.buildingName || 'Bãi đỗ xe'} <br /> {session.floorName}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'var(--colors-semantic-error)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%'
                    }}
                  ></div>
                </div>

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    Xe của bạn đỗ tại <strong>{session.buildingName || 'Bãi đỗ xe'} — {session.floorName}</strong> ô đỗ số <strong>{session.slotCode}</strong>.
                  </Text>
                </div>
              </div>
            </Card>
          </Col>

          {/* Real-time stats */}
          <Col xs={24} md={12}>
            <Card title="Thống kê đỗ xe thời gian thực">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '13px' }}>Biển số đăng ký đỗ:</Text>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--colors-ink)', marginTop: 4 }}>
                    {session.licensePlate}
                  </div>
                  <Tag color="blue" style={{ marginTop: 4 }}>{getVehicleTypeName(session.vehicleType)}</Tag>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="Thời gian đã đỗ"
                      value={fees ? fees.durationMinutes : 0}
                      suffix=" phút"
                      valueStyle={{ fontWeight: 600 }}
                      prefix={<Clock size={16} style={{ marginRight: 8, color: 'var(--colors-ink-muted)' }} />}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Phí đỗ ước tính"
                      value={fees ? fees.estimatedFee : 0}
                      formatter={(val) => <span style={{ fontWeight: 600, color: 'var(--colors-primary)' }}>{formatCurrency(Number(val))}</span>}
                      prefix={<DollarSign size={16} style={{ marginRight: 8, color: 'var(--colors-primary)' }} />}
                    />
                  </Col>
                </Row>

                <div style={{ borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px', fontSize: '13px', color: 'var(--colors-ink-muted)' }}>
                  <div>Giờ Check-In vào cổng: <strong>{dayjs(session.checkInTime).format('DD/MM/YYYY HH:mm:ss')}</strong></div>
                  <div style={{ marginTop: 8 }}>
                    * Ước tính chi phí sẽ tự động cập nhật mỗi 30 giây dựa trên cấu hình giá vé hiện tại.
                  </div>
                  {fees?.isOverstay && (
                    <div style={{ display: 'flex', gap: '8px', color: 'var(--colors-semantic-error)', marginTop: 12, alignItems: 'center' }}>
                      <Compass size={16} />
                      <strong>Cảnh báo: Xe đỗ quá hạn thời gian quy định!</strong>
                    </div>
                  )}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--colors-hairline)' }}>
          <Space direction="vertical" align="center" size="middle">
            <div style={{ width: 64, height: 64, backgroundColor: 'var(--colors-surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Car size={32} color="var(--colors-ink-subtle)" />
            </div>
            <Title level={4} style={{ margin: 0, fontWeight: 400 }}>Không tìm thấy xe đang đỗ</Title>
            <Text type="secondary" style={{ maxWidth: '400px', display: 'block' }}>
              Hiện tại tài khoản của bạn không ghi nhận bất kỳ phương tiện nào đang đỗ trong bãi. Nếu bạn vừa check-in, vui lòng kiểm tra lại thông tin.
            </Text>
          </Space>
        </Card>
      )}

      {/* History Table */}
      <Card title="Lịch sử gửi xe (Parking History)" style={{ marginTop: '16px' }}>
        <Table
          dataSource={history}
          loading={historyLoading}
          rowKey="sessionId"
          columns={[
            {
              title: 'Biển số xe',
              dataIndex: 'licensePlate',
              key: 'licensePlate',
              render: (plate: string) => <code>{plate}</code>
            },
            {
              title: 'Tòa nhà',
              dataIndex: 'buildingName',
              key: 'buildingName',
              render: (name: string) => <Tag color="geekblue">{name || 'Bãi đỗ xe'}</Tag>
            },
            {
              title: 'Vị trí đỗ',
              key: 'location',
              render: (_, rec: any) => `${rec.floorName} - ${rec.slotCode}`
            },
            {
              title: 'Loại xe',
              dataIndex: 'vehicleType',
              key: 'vehicleType',
              render: (type: any) => getVehicleTypeName(type)
            },
            {
              title: 'Giờ vào',
              dataIndex: 'checkInTime',
              key: 'checkInTime',
              render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss')
            },
            {
              title: 'Giờ ra',
              dataIndex: 'checkOutTime',
              key: 'checkOutTime',
              render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm:ss') : '-'
            },
            {
              title: 'Tổng phí đỗ',
              dataIndex: 'fee',
              key: 'fee',
              render: (fee: number) => <span style={{ fontWeight: 600, color: 'var(--colors-primary)' }}>{formatCurrency(fee)}</span>
            }
          ]}
        />
      </Card>
    </Space>
  );
};
