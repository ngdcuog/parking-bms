import React, { useEffect, useState } from 'react';
import { Space, Card, Button, Table, Modal, Form, Input, DatePicker, Select, Tag, message, Typography, QRCode, Row, Col, Spin } from 'antd';
import { api } from '../../services/api';
import { Plus, Trash2, QrCode, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface Booking {
  bookingId: number;
  userId: number;
  userFullName: string;
  slotId: number;
  slotCode: string;
  floorName: string;
  vehicleType: number | string;
  licensePlate?: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  qrCode: string;
  status: number | string; // 0=Pending, 1=Active, 2=Completed, 3=Cancelled, 4=Expired
  createdAt: string;
  expiredAt: string;
}

export const Bookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  const [publicInfo, setPublicInfo] = useState<any>(null);
  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [selectedSidebarBuildingId, setSelectedSidebarBuildingId] = useState<number | null>(null);
  const [activeTariffs, setActiveTariffs] = useState<any[]>([]);
  const [infoLoading, setInfoLoading] = useState(false);

  const [form] = Form.useForm();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bookings/my');
      setBookings(response.data.data.items);
    } catch (e) {
      message.error('Không thể lấy danh sách đặt chỗ của bạn.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicAndTariffInfo = async () => {
    setInfoLoading(true);
    try {
      const infoRes = await api.get('/buildings/public-info');
      const list = infoRes.data.data || [];
      setBuildingsList(list);
      if (list.length > 0) {
        const currentSelectedId = selectedSidebarBuildingId || list[0].buildingId;
        setSelectedSidebarBuildingId(currentSelectedId);
        const b = list.find((x: any) => x.buildingId === currentSelectedId) || list[0];
        setPublicInfo(b);
      }
    } catch (e) {
      console.error('Error fetching public building info', e);
    }

    try {
      const tariffRes = await api.get('/tariffs/active');
      setActiveTariffs(tariffRes.data.data || []);
    } catch (e) {
      console.error('Error fetching active tariffs', e);
    }
    setInfoLoading(false);
  };

  useEffect(() => {
    fetchBookings();
    fetchPublicAndTariffInfo();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      const payload = {
        vehicleType: values.vehicleType,
        plannedCheckIn: values.plannedCheckIn.toISOString(),
        plannedCheckOut: values.plannedCheckOut.toISOString(),
        licensePlate: values.licensePlate ? values.licensePlate.toUpperCase().trim() : null,
        buildingId: values.buildingId
      };

      await api.post('/bookings', payload);
      message.success('Đặt chỗ thành công! Hãy đến bãi đỗ trước giờ hẹn tối đa 15 phút.');
      setCreateModalOpen(false);
      form.resetFields();
      fetchBookings();
      fetchPublicAndTariffInfo();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi đặt lịch.');
    }
  };

  const handleCancel = async (bookingId: number) => {
    try {
      await api.delete(`/bookings/${bookingId}`);
      message.success('Đã hủy lịch đặt chỗ.');
      fetchBookings();
      fetchPublicAndTariffInfo();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể hủy đặt lịch.');
    }
  };

  const handleOpenQR = (booking: Booking) => {
    setSelectedBooking(booking);
    setQrModalOpen(true);
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  const getBookingStatusTag = (status: number | string) => {
    if (status === 0 || status === 'Pending') return <Tag color="warning">Chờ nhận xe (Pending)</Tag>;
    if (status === 1 || status === 'Active') return <Tag color="processing">Đang gửi (Active)</Tag>;
    if (status === 2 || status === 'Completed') return <Tag color="success">Đã hoàn thành (Completed)</Tag>;
    if (status === 3 || status === 'Cancelled') return <Tag color="default">Đã hủy (Cancelled)</Tag>;
    if (status === 4 || status === 'Expired') return <Tag color="error">Quá hạn (Expired)</Tag>;
    return <Tag>Không rõ</Tag>;
  };

  const columns = [
    {
      title: 'Mã đặt chỗ',
      dataIndex: 'bookingId',
      key: 'bookingId',
      render: (id: number) => <code>#{id}</code>
    },
    {
      title: 'Tòa nhà',
      dataIndex: 'buildingName',
      key: 'buildingName',
      render: (name: string) => <Tag color="geekblue">{name || 'Bãi đỗ xe'}</Tag>
    },
    {
      title: 'Vị trí được giữ',
      key: 'location',
      render: (_: any, record: Booking) => `${record.floorName} - ${record.slotCode}`
    },
    {
      title: 'Loại phương tiện',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type: number) => getVehicleTypeName(type)
    },
    {
      title: 'Biển số dự kiến',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      render: (plate?: string) => plate ? <code>{plate}</code> : <span style={{ color: '#aaa' }}>Chưa nhập</span>
    },
    {
      title: 'Giờ vào hẹn trước',
      dataIndex: 'plannedCheckIn',
      key: 'plannedCheckIn',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Giờ ra hẹn trước',
      dataIndex: 'plannedCheckOut',
      key: 'plannedCheckOut',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => getBookingStatusTag(status)
    },
    {
      title: 'Vé QR',
      key: 'qr',
      render: (_: any, record: Booking) => (
        (record.status === 0 || record.status === 'Pending') && (
          <Button
            size="small"
            icon={<QrCode size={14} />}
            onClick={() => handleOpenQR(record)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Mã QR
          </Button>
        )
      )
    },
    {
      title: 'Hủy',
      key: 'cancel',
      align: 'right' as const,
      render: (_: any, record: Booking) => (
        (record.status === 0 || record.status === 'Pending') && (
          <Button
            size="small"
            danger
            type="text"
            icon={<Trash2 size={14} />}
            onClick={() => handleCancel(record.bookingId)}
          />
        )
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Đặt chỗ trước (Reservations)</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Đặt lịch giữ chỗ đỗ xe trước khi đến bến. Lịch sẽ tự động hủy nếu bạn đến muộn quá 15 phút.</span>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setCreateModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
        >
          Đặt chỗ mới
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Table
            dataSource={bookings}
            columns={columns}
            rowKey="bookingId"
            loading={loading}
          />
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card 
              title="Trạng thái bãi đỗ (Live)" 
              size="small"
              extra={
                buildingsList.length > 1 && (
                  <Select
                    size="small"
                    value={selectedSidebarBuildingId}
                    onChange={(val) => {
                      setSelectedSidebarBuildingId(val);
                      const b = buildingsList.find((x) => x.buildingId === val);
                      if (b) setPublicInfo(b);
                    }}
                    style={{ width: '130px' }}
                    options={buildingsList.map((b) => ({ value: b.buildingId, label: b.buildingName }))}
                  />
                )
              }
            >
              {infoLoading ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}><Spin size="small" /></div>
              ) : publicInfo ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '13px', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '8px' }}>
                    <strong>{publicInfo.buildingName}</strong>
                    <div style={{ color: 'var(--colors-ink-muted)', marginTop: '4px' }}>{publicInfo.address}</div>
                    <div style={{ color: 'var(--colors-ink-muted)', marginTop: '4px' }}>
                      Mở cửa: {publicInfo.openTime} - {publicInfo.closeTime}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Xe máy (Tầng B1/B2):</span>
                      <strong style={{ color: publicInfo.freeSlots.motorbike > 0 ? 'var(--colors-semantic-success)' : 'var(--colors-semantic-error)' }}>
                        {publicInfo.freeSlots.motorbike} ô trống
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Ô tô (Tầng 1/2):</span>
                      <strong style={{ color: publicInfo.freeSlots.car > 0 ? 'var(--colors-semantic-success)' : 'var(--colors-semantic-error)' }}>
                        {publicInfo.freeSlots.car} ô trống
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Xe tải (Tầng 3):</span>
                      <strong style={{ color: publicInfo.freeSlots.truck > 0 ? 'var(--colors-semantic-success)' : 'var(--colors-semantic-error)' }}>
                        {publicInfo.freeSlots.truck} ô trống
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <Text type="secondary">Không lấy được thông tin bãi xe.</Text>
              )}
            </Card>

            <Card title="Bảng giá vé hiện hành" size="small">
              {infoLoading ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}><Spin size="small" /></div>
              ) : activeTariffs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeTariffs.map((t: any) => (
                    <div key={t.tariffId} style={{ borderBottom: '1px solid var(--colors-surface-1)', paddingBottom: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--colors-primary)', marginBottom: '6px' }}>
                        {getVehicleTypeName(t.vehicleType)}
                      </div>
                      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Giá Ca Ngày (06:00 - 18:00):</span>
                          <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.pricePerHour)}/lượt</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Giá Ca Đêm (18:00 - 06:00):</span>
                          <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.pricePerHour * t.peakHourRate)}/lượt</strong>
                        </div>
                        {t.dailyMaxFee && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span>Phí gửi qua đêm (qua 02:00 AM):</span>
                            <strong>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.dailyMaxFee)}/đêm</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#ff4d4f' }}>
                          <span>Phạt mất vé (chỉ Khách vãng lai):</span>
                          <span>+{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(t.lostTicketFee)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    * Người dùng đặt chỗ trước (Booking) sử dụng vé QR điện tử nên không áp dụng phí phạt mất vé.
                  </div>
                </div>
              ) : (
                <Text type="secondary">Chưa có thông tin bảng giá.</Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>

      {/* Booking Form Modal */}
      <Modal
        title="Lên lịch đặt chỗ đỗ xe"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Card style={{ backgroundColor: '#e3f9eb', border: '1px solid var(--colors-semantic-success)', marginBottom: 20, borderRadius: 0 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertCircle size={20} color="var(--colors-semantic-success)" />
            <span style={{ fontSize: '13px', color: '#1e7e34', fontFamily: 'IBM Plex Sans' }}>
              Giờ hẹn vào phải cách thời điểm hiện tại tối thiểu 30 phút. Thời gian đỗ tối đa là 7 ngày.
            </span>
          </div>
        </Card>

        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreate} 
          requiredMark={false}
          initialValues={{
            vehicleType: 1,
            buildingId: selectedSidebarBuildingId || undefined
          }}
        >
          <Form.Item
            label="Chọn tòa nhà gửi xe"
            name="buildingId"
            rules={[{ required: true, message: 'Vui lòng chọn tòa nhà!' }]}
          >
            <Select
              placeholder="Chọn tòa nhà..."
              options={buildingsList.map((b) => ({ value: b.buildingId, label: b.buildingName }))}
            />
          </Form.Item>

          <Form.Item label="Phương tiện gửi" name="vehicleType" rules={[{ required: true }]} initialValue={1}>
            <Select
              options={[
                { value: 0, label: 'Xe máy' },
                { value: 1, label: 'Ô tô' },
                { value: 2, label: 'Xe tải' }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Biển số xe dự kiến (tùy chọn)"
            name="licensePlate"
            tooltip="Nhập bằng bàn phím thông thường. Dùng dấu gạch ngang thường (-)"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  // Normalize: trim, uppercase, replace exotic dash variants with standard hyphen-minus
                  const normalized = value.trim().toUpperCase().replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');

                  // Vietnamese license plate formats:
                  const patterns = [
                    /^[0-9]{2}[A-Z]-[0-9]{5}$/,          // 29A-12345
                    /^[0-9]{2}[A-Z][0-9]-[0-9]{4}$/,     // 29A1-1234
                    /^[0-9]{2}[A-Z][0-9]-[0-9]{5}$/,     // 29A1-12345
                    /^[0-9]{2}[A-Z]{2}-[0-9]{5}$/,       // 29AA-12345
                  ];

                  const isValid = patterns.some(p => p.test(normalized));
                  if (!isValid) {
                    return Promise.reject(
                      'Biển số không đúng định dạng. VD hợp lệ: 29A-12345 | 29A1-1234 | 29A1-12345 | 29AA-12345'
                    );
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Input
              placeholder="VD: 29A-12345 hoặc 29A1-12345"
              style={{ textTransform: 'uppercase' }}
              onChange={(e) => {
                // Auto-replace exotic dash variants + force uppercase
                const val = e.target.value
                  .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
                  .toUpperCase();
                form.setFieldValue('licensePlate', val);
              }}
            />
          </Form.Item>

          <Form.Item
            label="Thời gian vào dự kiến (Planned Check-In)"
            name="plannedCheckIn"
            rules={[{ required: true, message: 'Chọn thời gian vào!' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%', borderRadius: 0 }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            label="Thời gian ra dự kiến (Planned Check-Out)"
            name="plannedCheckOut"
            tooltip="Hệ thống dùng giờ này để giữ ô đỗ cho bạn. Phí thực tế được tính theo giờ check-out thực tế, không phải giờ dự kiến."
            rules={[
              { required: true, message: 'Chọn thời gian ra!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();
                  const checkIn = getFieldValue('plannedCheckIn');
                  if (checkIn && value.isBefore(checkIn)) {
                    return Promise.reject('Giờ ra phải sau giờ vào!');
                  }
                  return Promise.resolve();
                }
              })
            ]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%', borderRadius: 0 }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>
          <div style={{ fontSize: '12px', color: 'var(--colors-ink-muted)', marginTop: '-12px', marginBottom: '16px', padding: '8px', backgroundColor: 'var(--colors-surface-1)', borderLeft: '3px solid var(--colors-primary)' }}>
            💡 <strong>Lưu ý:</strong> Ô đỗ được giữ cho bạn đến giờ dự kiến. Nếu bạn ra <em>trễ hơn</em>, phí sẽ được tính theo giờ thực tế khi Staff check-out cho bạn.
          </div>

          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" size="large">Xác nhận đặt chỗ</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* QR Display Modal */}
      <Modal
        title="Mã vé đặt chỗ đỗ xe"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null}
        destroyOnClose
        width={320}
      >
        {selectedBooking && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Trình mã QR này cho Nhân viên bãi xe khi Check-In vào cổng.
            </Text>
            <QRCode value={selectedBooking.qrCode} size={200} style={{ margin: '0 auto' }} />
            <div style={{ marginTop: 24, fontSize: '15px' }}>
              <strong>Mã vé:</strong> <code>{selectedBooking.qrCode}</code>
            </div>
            <div style={{ marginTop: 8, fontSize: '13px', color: 'var(--colors-ink-muted)' }}>
              Vị trí được giữ: <strong>{selectedBooking.floorName} - {selectedBooking.slotCode}</strong>
            </div>
          </div>
        )}
      </Modal>
    </Space>
  );
};
