import React, { useState } from 'react';
import { Space, Card, Input, Button, Table, Modal, Form, Radio, message, Typography, Tag } from 'antd';
import { api } from '../../services/api';
import { Search, ArrowRight, Printer } from 'lucide-react';
import dayjs from 'dayjs';

const { Title } = Typography;

interface ActiveSession {
  sessionId: string;
  licensePlate: string;
  vehicleType: number;
  slotCode: string;
  floorName: string;
  buildingName?: string;
  checkInTime: string;
  durationMinutes: number;
  estimatedFee: number;
}

export const ExceptionHandling: React.FC = () => {
  const [plateSearch, setPlateSearch] = useState('');
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  const [form] = Form.useForm();

  const handleSearch = async () => {
    if (!plateSearch.trim()) {
      message.warning('Vui lòng nhập biển số xe để tìm kiếm!');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/sessions/checkout-by-plate', {
        licensePlate: plateSearch.trim()
      });
      setSessions(response.data.data);
      if (response.data.data.length === 0) {
        message.info('Không tìm thấy lượt gửi xe đang hoạt động nào khớp với biển số.');
      }
    } catch (e) {
      message.error('Không thể tìm kiếm lượt gửi xe.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = (session: ActiveSession) => {
    setSelectedSession(session);
    setCheckoutResult(null);
    setCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async (values: any) => {
    if (!selectedSession) return;
    try {
      const response = await api.post(`/sessions/${selectedSession.sessionId}/checkout-confirm`, {
        paymentMethod: values.paymentMethod,
        isLostTicket: values.isLostTicket
      });
      message.success('Thanh toán ngoại lệ thành công. Đã giải phóng slot đỗ.');
      setCheckoutResult(response.data.data);
      // Remove checkout session from list
      setSessions(sessions.filter((s) => s.sessionId !== selectedSession.sessionId));
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const columns = [
    {
      title: 'Biển số xe',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      render: (plate: string) => <code style={{ fontSize: '14px', fontWeight: 'bold' }}>{plate}</code>
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
      render: (_: any, record: ActiveSession) => `${record.floorName} - ${record.slotCode}`
    },
    {
      title: 'Loại phương tiện',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type: number) => getVehicleTypeName(type)
    },
    {
      title: 'Thời gian vào',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss')
    },
    {
      title: 'Thời gian đỗ',
      dataIndex: 'durationMinutes',
      key: 'durationMinutes',
      render: (mins: number) => `${mins} phút`
    },
    {
      title: 'Phí tạm tính',
      dataIndex: 'estimatedFee',
      key: 'estimatedFee',
      render: (fee: number) => <span style={{ fontWeight: 600, color: 'var(--colors-primary)' }}>{formatCurrency(fee)}</span>
    },
    {
      title: 'Hành động',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: ActiveSession) => (
        <Button
          type="primary"
          danger
          icon={<ArrowRight size={14} />}
          onClick={() => handleOpenCheckout(record)}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          Check-Out
        </Button>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Trung tâm xử lý ngoại lệ</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Tra cứu xe mất vé, mất thẻ, hoặc xe ra vào gặp sự cố bằng cách tìm kiếm biển số đỗ xe hiện hoạt.</span>
        </div>
      </div>

      {/* Plate Search Bar */}
      <Card style={{ backgroundColor: 'var(--colors-surface-1)', border: 'none' }}>
        <Space.Compact style={{ width: '100%', maxWidth: '500px' }}>
          <Input
            placeholder="Nhập biển số cần tìm kiếm (VD: 59A-12345)..."
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<Search size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
            size="large"
          />
          <Button type="primary" size="large" onClick={handleSearch} loading={loading}>Tìm kiếm</Button>
        </Space.Compact>
      </Card>

      {/* Results Table */}
      <Table
        dataSource={sessions}
        columns={columns}
        rowKey="sessionId"
        loading={loading}
        pagination={false}
      />

      {/* Exception Check-Out Dialog */}
      <Modal
        title="Check-Out Ngoại lệ & Thu phí"
        open={checkoutModalOpen}
        onCancel={() => setCheckoutModalOpen(false)}
        footer={null}
        destroyOnClose
        width={460}
      >
        {selectedSession && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {!checkoutResult ? (
              <Form form={form} layout="vertical" onFinish={handleConfirmCheckout} requiredMark={false} initialValues={{ paymentMethod: 0, isLostTicket: true }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 16 }}>
                  <div><strong>Biển số xe:</strong> <code style={{ fontSize: '15px', fontWeight: 'bold' }}>{selectedSession.licensePlate}</code></div>
                  <div><strong>Vị trí đỗ:</strong> {selectedSession.buildingName || 'Bãi đỗ xe'} — {selectedSession.floorName} - {selectedSession.slotCode}</div>
                  <div><strong>Thời điểm vào:</strong> {dayjs(selectedSession.checkInTime).format('DD/MM/YYYY HH:mm:ss')}</div>
                  <div><strong>Thời gian gửi:</strong> {selectedSession.durationMinutes} phút</div>
                  <div><strong>Phí gửi ước tính:</strong> <strong style={{ color: 'var(--colors-primary)' }}>{formatCurrency(selectedSession.estimatedFee)}</strong></div>
                </div>

                <Form.Item label="Trường hợp ngoại lệ" name="isLostTicket" valuePropName="checked">
                  <Radio.Group style={{ width: '100%' }}>
                    <Radio value={true} style={{ display: 'block', marginBottom: 12 }}>
                      <Tag color="error">Mất vé đỗ xe (Lost Ticket)</Tag>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: 4, marginLeft: 24 }}>Cộng thêm phí mất vé 50.000 VNĐ vào hóa đơn.</div>
                    </Radio>
                    <Radio value={false} style={{ display: 'block' }}>
                      <Tag color="warning">Sự cố đọc thẻ / Khác</Tag>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: 4, marginLeft: 24 }}>Không cộng thêm phí phạt. Chỉ thu phí thời gian thực.</div>
                    </Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item label="Phương thức thanh toán" name="paymentMethod" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio.Button value={0}>Tiền mặt</Radio.Button>
                    <Radio.Button value={1}>QR Pay</Radio.Button>
                    <Radio.Button value={2}>Thẻ</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
                  <Space>
                    <Button onClick={() => setCheckoutModalOpen(false)}>Hủy</Button>
                    <Button type="primary" htmlType="submit" size="large">Xác nhận đóng lượt gửi</Button>
                  </Space>
                </Form.Item>
              </Form>
            ) : (
              // Final receipt display
              <div style={{ fontFamily: 'monospace', padding: '8px', fontSize: '13px' }}>
                <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '16px' }}>HÓA ĐƠN GỬI XE NGOẠI LỆ</h3>
                <div style={{ textAlign: 'center', margin: '0 0 16px' }}>Mã lượt gửi: {checkoutResult.sessionId.substring(0, 8)}...</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Biển số xe:</span><strong>{checkoutResult.licensePlate}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Vị trí đỗ:</span><span>{checkoutResult.buildingName || 'Bãi đỗ xe'} — {checkoutResult.floorName} - {checkoutResult.slotCode}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Giờ vào:</span><span>{dayjs(checkoutResult.checkInTime).format('DD/MM HH:mm')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Giờ ra:</span><span>{dayjs(checkoutResult.checkOutTime).format('DD/MM HH:mm')}</span></div>
                <div style={{ borderTop: '1px dashed var(--colors-hairline)', margin: '12px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Phí cơ bản:</span><span>{formatCurrency(checkoutResult.baseFee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Phí phạt ngoại lệ:</span><span>{formatCurrency(checkoutResult.penaltyFee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 6px', fontSize: '15px', fontWeight: 'bold' }}>
                  <span>TỔNG THU:</span>
                  <span style={{ color: 'var(--colors-primary)' }}>{formatCurrency(checkoutResult.totalFee)}</span>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  <Button type="dashed" icon={<Printer size={14} />} onClick={() => window.print()}>In hóa đơn</Button>
                </div>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </Space>
  );
};
