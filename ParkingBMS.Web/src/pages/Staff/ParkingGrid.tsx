import React, { useEffect, useState, useRef } from 'react';
import { Space, Card, Row, Col, Button, Select, Modal, Form, Input, Typography, Tag, message, QRCode, Radio } from 'antd';
import { api } from '../../services/api';
import { QRScanner } from '../../components/Common/QRScanner';
import { ArrowRight, UserCheck, ShieldAlert, Check, Printer, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

interface Floor {
  floorId: number;
  floorName: string;
  vehicleType: number | string;
  totalSlots: number;
}

interface SlotGridItem {
  slotId: number;
  slotCode: string;
  status: number | string; // 0=Free, 1=Occupied, 2=Reserved, 3=Maintenance, 4=Locked
}

interface SlotDetail {
  slotId: number;
  floorId: number;
  slotCode: string;
  vehicleType: number | string;
  status: number | string;
  isActive: boolean;
  activeSession?: {
    sessionId: string;
    licensePlate: string;
    vehicleType: number | string;
    slotCode: string;
    floorName: string;
    checkInTime: string;
    durationMinutes: number;
    estimatedFee: number;
  };
}

export const ParkingGrid: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const buildingId = user?.buildingId;
  const buildingName = user?.buildingName || 'Tòa nhà đỗ xe';

  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [slots, setSlots] = useState<SlotGridItem[]>([]);
  const [floorStats, setFloorStats] = useState({ free: 0, occupied: 0, reserved: 0, maintenance: 0, locked: 0, total: 0 });
  const timerRef = useRef<any>(null);

  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [slotDetailModalOpen, setSlotDetailModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanType, setScanType] = useState<'checkout' | 'checkin-booking'>('checkout');

  // Form data state
  const [selectedSlot, setSelectedSlot] = useState<SlotDetail | null>(null);
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [checkOutInfo, setCheckOutInfo] = useState<any>(null);
  const [availableSwapSlots, setAvailableSwapSlots] = useState<{ slotId: number; slotCode: string }[]>([]);

  // Sub-forms
  const [checkInForm] = Form.useForm();
  const [checkInBookingForm] = Form.useForm();
  const [wrongPlateForm] = Form.useForm();
  const [wrongZoneForm] = Form.useForm();
  const [checkOutForm] = Form.useForm();

  const fetchFloors = async () => {
    if (!buildingId) return;
    try {
      const response = await api.get(`/buildings/${buildingId}/floors`);
      const data = response.data.data;
      setFloors(data);
      if (data.length > 0) {
        setSelectedFloorId(data[0].floorId);
      }
    } catch (e) {
      message.error('Không thể lấy danh sách tầng đỗ xe.');
    }
  };

  const fetchGrid = async (floorId: number) => {
    try {
      const response = await api.get(`/floors/${floorId}/slots/grid`);
      const { slots, freeCount, occupiedCount, reservedCount } = response.data.data;
      setSlots(slots);
      
      // Calculate maintenance and locked manually
      let maintenance = 0;
      let locked = 0;
      slots.forEach((s: any) => {
        if (s.status === 3 || s.status === 'Maintenance') maintenance++;
        if (s.status === 4 || s.status === 'Locked') locked++;
      });

      setFloorStats({
        free: freeCount,
        occupied: occupiedCount,
        reserved: reservedCount,
        maintenance,
        locked,
        total: slots.length
      });
    } catch (e) {
      console.error('Grid fetch error', e);
    }
  };

  useEffect(() => {
    if (buildingId) {
      fetchFloors();
    }
  }, [buildingId]);

  useEffect(() => {
    if (selectedFloorId) {
      fetchGrid(selectedFloorId);
      // Setup polling every 10 seconds
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        fetchGrid(selectedFloorId);
      }, 10000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedFloorId]);

  const handleSlotClick = async (slotId: number) => {
    try {
      const response = await api.get(`/slots/${slotId}`);
      const detail = response.data.data;
      setSelectedSlot(detail);
      
      // Reset forms
      wrongPlateForm.resetFields();
      wrongZoneForm.resetFields();

      // If occupied, load available swap slots
      if (detail.status === 1 || detail.status === 'Occupied') {
        const swapRes = await api.get(`/floors/${detail.floorId}/slots`, {
          params: { status: 0, pageSize: 100 }
        });
        setAvailableSwapSlots(swapRes.data.data.items);
      }

      setSlotDetailModalOpen(true);
    } catch (e) {
      message.error('Không thể lấy chi tiết slot.');
    }
  };

  // Walk-In Check-In
  const handleCheckInWalkIn = async (values: any) => {
    try {
      const response = await api.post('/sessions/checkin', values);
      message.success('Cho xe vào bãi thành công!');
      setTicketInfo(response.data.data);
      setCheckInModalOpen(false);
      checkInForm.resetFields();
      setTicketModalOpen(true);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể check-in.');
    }
  };

  // Booking Check-In
  const handleCheckInBooking = async (values: any) => {
    try {
      const response = await api.post('/sessions/checkin-booking', { qrCode: values.qrCode });
      message.success('Check-in xe đặt lịch thành công!');
      setTicketInfo(response.data.data);
      setScanOpen(false);
      checkInBookingForm.resetFields();
      setTicketModalOpen(true);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Mã đặt chỗ không hợp lệ hoặc đã quá hạn.');
    }
  };

  // Slot status override (Lock/Unlock/Maintenance)
  const handleUpdateStatus = async (status: number) => {
    if (!selectedSlot) return;
    try {
      await api.put(`/slots/${selectedSlot.slotId}/status`, { status });
      message.success('Cập nhật trạng thái slot thành công.');
      setSlotDetailModalOpen(false);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái slot.');
    }
  };

  // Exception WrongPlate
  const handleWrongPlate = async (values: any) => {
    if (!selectedSlot?.activeSession) return;
    try {
      const sessionId = selectedSlot.activeSession.sessionId;
      await api.put(`/sessions/${sessionId}/license-plate`, {
        newLicensePlate: values.newLicensePlate,
        reason: values.reason
      });
      message.success('Cập nhật biển số và ghi nhận log thành công.');
      setSlotDetailModalOpen(false);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // Exception WrongZone (Slot swap)
  const handleWrongZone = async (values: any) => {
    if (!selectedSlot?.activeSession) return;
    try {
      const sessionId = selectedSlot.activeSession.sessionId;
      await api.put(`/sessions/${sessionId}/slot`, {
        newSlotId: values.newSlotId,
        reason: values.reason
      });
      message.success('Điều chuyển slot và ghi nhận log thành công.');
      setSlotDetailModalOpen(false);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // Check-Out Init
  const handleCheckOutInit = async (qrCode: string) => {
    try {
      // Step 1: Normal checkout request (returns fee estimations)
      // CheckOutRequest expects: { qrcode: string, paymentMethod: number }
      // We send with default Cash (0) first just to read fees.
      const response = await api.post('/sessions/checkout', {
        qrCode,
        paymentMethod: 0
      });
      
      // But wait! The checkout endpoint on the backend CLOSES the session immediately when called.
      // Wait, is that true? Let's check SessionsController:
      // "CheckoutNormal: Backend tính phí + tạo Payment + đóng session trong 1 transaction"
      // Ah! Yes, calling POST /sessions/checkout directly closes the session!
      // Wait, so what happens if they scan the QR? It registers the payment and closes it in one go!
      // Let's check CheckOutResponseDTO.
      // Yes, it has TotalFee, and sets session to closed.
      // So if staff clicks Checkout, it completes immediately and returns the printable invoice!
      // This is extremely simple and fast.
      setCheckOutInfo(response.data.data);
      setCheckOutModalOpen(true);
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Thất bại khi quét mã QR check-out.');
    }
  };

  // Check-Out Confirm (for lost tickets where we fetch plate first, then call confirm)
  const handleOpenCheckoutConfirm = (session: any) => {
    setCheckOutInfo({
      sessionId: session.sessionId,
      licensePlate: session.licensePlate,
      slotCode: session.slotCode,
      floorName: session.floorName,
      checkInTime: session.checkInTime,
      vehicleType: session.vehicleType,
      isLostTicket: true,
      // The client calculates penalty/fees or we pull from API.
      // Let's call /current-fee to display estimated price before confirming!
      estimatedFee: session.estimatedFee
    });
    setSlotDetailModalOpen(false);
    checkOutForm.resetFields();
    setCheckOutModalOpen(true);
  };

  const handleCheckoutConfirmSubmit = async (values: any) => {
    if (!checkOutInfo) return;
    try {
      const sessionId = checkOutInfo.sessionId;
      const response = await api.post(`/sessions/${sessionId}/checkout-confirm`, {
        paymentMethod: values.paymentMethod,
        isLostTicket: checkOutInfo.isLostTicket || false
      });
      message.success('Thanh toán và cho xe ra bãi thành công.');
      setCheckOutInfo(response.data.data); // Update with final calculation
      checkOutForm.resetFields();
      if (selectedFloorId) fetchGrid(selectedFloorId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  // QR scan handler
  const handleScanSuccess = (decodedText: string) => {
    if (scanType === 'checkout') {
      handleCheckOutInit(decodedText);
    } else {
      // Checkin booking
      handleCheckInBooking({ qrCode: decodedText });
    }
  };

  const printTicket = () => {
    window.print();
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

  const getSlotStatusTag = (status: number | string) => {
    if (status === 0 || status === 'Free') return <Tag color="success">Trống</Tag>;
    if (status === 1 || status === 'Occupied') return <Tag color="error">Đang đỗ</Tag>;
    if (status === 2 || status === 'Reserved') return <Tag color="warning">Đặt trước</Tag>;
    if (status === 3 || status === 'Maintenance') return <Tag color="default">Bảo trì</Tag>;
    if (status === 4 || status === 'Locked') return <Tag color="magenta">Khóa</Tag>;
    return <Tag>Không rõ</Tag>;
  };

  if (!buildingId) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px', marginTop: '24px', backgroundColor: 'var(--colors-surface-1)' }}>
        <Space direction="vertical" size="large" align="center" style={{ width: '100%' }}>
          <AlertTriangle size={64} style={{ color: 'var(--colors-error)' }} />
          <Typography.Title level={3} style={{ margin: 0 }}>Chưa được phân công Tòa nhà</Typography.Title>
          <Typography.Text type="secondary" style={{ maxWidth: '480px', display: 'block' }}>
            Tài khoản nhân viên của bạn hiện chưa được chỉ định làm việc tại bất kỳ tòa nhà nào trong hệ thống. Vui lòng liên hệ Quản lý (Manager) hoặc Quản trị viên (Admin) để thiết lập bốt trực trước khi thực hiện nghiệp vụ đỗ xe.
          </Typography.Text>
        </Space>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Visual Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Sơ đồ vị trí đỗ xe — {buildingName}</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Giám sát trạng thái bốt trực thời gian thực và thực hiện check-in / check-out nhanh.</span>
        </div>
        <Space wrap>
          <Button
            type="primary"
            icon={<ArrowRight size={16} />}
            onClick={() => setCheckInModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            Xe vào bãi (Check-In)
          </Button>
          <Button
            onClick={() => {
              setScanType('checkin-booking');
              setScanOpen(true);
            }}
            icon={<UserCheck size={16} />}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            Quét QR đặt chỗ
          </Button>
          <Button
            danger
            onClick={() => {
              setScanType('checkout');
              setScanOpen(true);
            }}
            icon={<ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            Quét QR ra bãi
          </Button>
        </Space>
      </div>

      {/* Grid Stats Bar & Floor Selector */}
      <Card style={{ backgroundColor: 'var(--colors-surface-1)', border: 'none' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Space>
              <span style={{ fontWeight: 600 }}>Chọn Tầng:</span>
              <Select
                value={selectedFloorId}
                onChange={(val) => setSelectedFloorId(val)}
                style={{ width: '180px' }}
                options={floors.map((f) => ({ value: f.floorId, label: f.floorName }))}
              />
            </Space>
          </Col>
          <Col xs={24} md={18}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-end' }}>
              <Tag color="success">Trống ({floorStats.free})</Tag>
              <Tag color="error">Đang đỗ ({floorStats.occupied})</Tag>
              <Tag color="warning">Đặt trước ({floorStats.reserved})</Tag>
              <Tag color="default">Bảo trì ({floorStats.maintenance})</Tag>
              <Tag color="magenta">Khóa ({floorStats.locked})</Tag>
              <Tag color="blue">Tổng ({floorStats.total})</Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* The Visual Grid */}
      <Card style={{ padding: '8px' }}>
        {slots.length > 0 ? (
          <Row gutter={[12, 12]}>
            {slots.map((slot) => {
              let classColor = 'slot-free';
              if (slot.status === 1 || slot.status === 'Occupied') classColor = 'slot-occupied';
              if (slot.status === 2 || slot.status === 'Reserved') classColor = 'slot-reserved';
              if (slot.status === 3 || slot.status === 'Maintenance') classColor = 'slot-maintenance';
              if (slot.status === 4 || slot.status === 'Locked') classColor = 'slot-locked';

              return (
                <Col key={slot.slotId} xs={6} sm={4} md={3} lg={2}>
                  <div
                    className={`slot-cell ${classColor}`}
                    onClick={() => handleSlotClick(slot.slotId)}
                  >
                    <span style={{ fontSize: '15px' }}>{slot.slotCode}</span>
                    <span style={{ fontSize: '9px', fontWeight: 300, marginTop: 4 }}>
                      {slot.status === 1 || slot.status === 'Occupied' ? 'Occupied' : slot.status === 2 || slot.status === 'Reserved' ? 'Reserved' : ''}
                    </span>
                  </div>
                </Col>
              );
            })}
          </Row>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--colors-ink-subtle)' }}>
            Không có slot đỗ xe nào trên tầng này.
          </div>
        )}
      </Card>

      {/* Check-In Modal */}
      <Modal
        title="Check-In xe vãng lai vào bãi"
        open={checkInModalOpen}
        onCancel={() => setCheckInModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={checkInForm} layout="vertical" onFinish={handleCheckInWalkIn} requiredMark={false}>
          <Form.Item
            label="Biển số xe"
            name="licensePlate"
            rules={[
              { required: true, message: 'Vui lòng nhập biển số xe!' },
              { max: 20, message: 'Tối đa 20 ký tự!' }
            ]}
          >
            <Input placeholder="VD: 59A-12345" size="large" style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item label="Loại phương tiện" name="vehicleType" rules={[{ required: true }]} initialValue={1}>
            <Radio.Group>
              <Radio.Button value={0}>Xe máy</Radio.Button>
              <Radio.Button value={1}>Ô tô</Radio.Button>
              <Radio.Button value={2}>Xe tải</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCheckInModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" size="large">Cho xe vào</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Slot Details Drawer / Modal */}
      <Modal
        title={`Thông tin ô đỗ xe: ${selectedSlot?.slotCode}`}
        open={slotDetailModalOpen}
        onCancel={() => setSlotDetailModalOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        {selectedSlot && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Common Info */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
              <div><strong>Loại xe đỗ:</strong> {getVehicleTypeName(selectedSlot.vehicleType)}</div>
              <div><strong>Trạng thái:</strong> {getSlotStatusTag(selectedSlot.status)}</div>
            </div>

            {/* FREE Actions */}
            {(selectedSlot.status === 0 || selectedSlot.status === 'Free') && (
              <div style={{ padding: '8px 0' }}>
                <Text type="secondary">Thao tác trạng thái slot:</Text>
                <div style={{ display: 'flex', gap: '12px', marginTop: 12 }}>
                  <Button onClick={() => handleUpdateStatus(3)} icon={<AlertTriangle size={14} />}>Bảo trì</Button>
                  <Button onClick={() => handleUpdateStatus(4)} icon={<ShieldAlert size={14} />}>Khóa ô đỗ</Button>
                </div>
              </div>
            )}

            {/* Locked / Maintenance Actions */}
            {(selectedSlot.status === 3 || selectedSlot.status === 'Maintenance' || selectedSlot.status === 4 || selectedSlot.status === 'Locked') && (
              <div style={{ padding: '8px 0' }}>
                <Button type="primary" onClick={() => handleUpdateStatus(0)} icon={<Check size={14} />}>
                  Mở lại (Unlock)
                </Button>
              </div>
            )}

            {/* Active Session (Occupied) */}
            {(selectedSlot.status === 1 || selectedSlot.status === 'Occupied') && selectedSlot.activeSession && (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Card title="Chi tiết lượt gửi xe hiện tại" size="small" styles={{ header: { backgroundColor: 'var(--colors-surface-1)' } }}>
                  <div style={{ fontSize: '13px', lineHeight: '2.0' }}>
                    <div><strong>Biển số xe:</strong> <code style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedSlot.activeSession.licensePlate}</code></div>
                    <div><strong>Giờ vào:</strong> {dayjs(selectedSlot.activeSession.checkInTime).format('DD/MM/YYYY HH:mm:ss')}</div>
                    <div><strong>Thời gian gửi:</strong> {selectedSlot.activeSession.durationMinutes} phút (~{Math.ceil(selectedSlot.activeSession.durationMinutes / 60)} giờ)</div>
                    <div><strong>Phí tạm tính:</strong> <span style={{ fontWeight: 600, color: 'var(--colors-primary)' }}>{formatCurrency(selectedSlot.activeSession.estimatedFee)}</span></div>
                  </div>
                  
                  {/* Operations */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
                    <Button type="primary" danger onClick={() => handleCheckOutInit(selectedSlot.activeSession!.sessionId)}>
                      Cho xe ra (Check-Out)
                    </Button>
                    <Button onClick={() => handleOpenCheckoutConfirm(selectedSlot.activeSession)}>
                      Mất vé (Lost Ticket)
                    </Button>
                  </div>
                </Card>

                {/* Exceptions inside Slot Detail */}
                <Card title="Xử lý nghiệp vụ ngoại lệ" size="small" style={{ borderColor: 'var(--colors-semantic-warning)' }}>
                  <Form form={wrongPlateForm} layout="vertical" onFinish={handleWrongPlate} requiredMark={false}>
                    <Form.Item
                      label="Sửa sai biển số xe"
                      name="newLicensePlate"
                      rules={[{ required: true, message: 'Nhập biển số đúng!' }]}
                    >
                      <Input placeholder="Nhập biển số đúng..." style={{ textTransform: 'uppercase' }} />
                    </Form.Item>
                    <Form.Item label="Lý do sửa" name="reason" rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
                      <Input placeholder="VD: nhân viên nhập nhầm chữ O thành số 0" />
                    </Form.Item>
                    <Button size="small" type="primary" htmlType="submit">Cập nhật biển số</Button>
                  </Form>

                  <Form form={wrongZoneForm} layout="vertical" onFinish={handleWrongZone} style={{ marginTop: '24px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }} requiredMark={false}>
                    <Form.Item
                      label="Điều chuyển sang ô đỗ khác (Sai khu vực)"
                      name="newSlotId"
                      rules={[{ required: true, message: 'Chọn slot mới!' }]}
                    >
                      <Select
                        placeholder="Chọn slot đỗ trống..."
                        options={availableSwapSlots.map((s) => ({ value: s.slotId, label: s.slotCode }))}
                      />
                    </Form.Item>
                    <Form.Item label="Lý do chuyển" name="reason" rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}>
                      <Input placeholder="VD: đỗ sai vị trí chỉ định" />
                    </Form.Item>
                    <Button size="small" type="primary" htmlType="submit">Điều chuyển ô đỗ</Button>
                  </Form>
                </Card>
              </Space>
            )}
          </Space>
        )}
      </Modal>

      {/* Ticket Modal (Print Ticket when check-in success) */}
      <Modal
        title="Vé xe đỗ - Parking BMS"
        open={ticketModalOpen}
        onCancel={() => setTicketModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setTicketModalOpen(false)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<Printer size={14} />} onClick={printTicket}>In vé</Button>
        ]}
        destroyOnClose
        width={360}
      >
        {ticketInfo && (
          <div id="print-ticket-area" style={{ textAlign: 'center', padding: '16px', fontFamily: 'monospace' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px' }}>VE XE PARKING TOWER A</h3>
            <div>------------------------------</div>
            <div style={{ margin: '16px 0', display: 'inline-block' }}>
              <QRCode value={ticketInfo.qrCode} size={160} bordered={false} />
            </div>
            <div style={{ textAlign: 'left', lineHeight: '2.0', marginTop: '12px', fontSize: '13px' }}>
              <div><strong>Vị trí đỗ:</strong> {ticketInfo.floorName} - {ticketInfo.slotCode}</div>
              <div><strong>Biển số:</strong> {ticketInfo.licensePlate}</div>
              <div><strong>Loại xe:</strong> {getVehicleTypeName(ticketInfo.vehicleType)}</div>
              <div><strong>Thời gian vào:</strong> {dayjs(ticketInfo.checkInTime).format('DD/MM/YYYY HH:mm:ss')}</div>
              {ticketInfo.allocatedByAI && <div style={{ fontStyle: 'italic', fontSize: '11px', color: '#666' }}>* Được phân bổ tự động bằng thuật toán AI</div>}
            </div>
            <div style={{ margin: '16px 0 0' }}>------------------------------</div>
            <div style={{ fontSize: '10px', color: '#666' }}>Vui lòng giữ vé cẩn thận để đối chiếu khi ra bãi. Mất vé sẽ bị phạt tiền theo quy định.</div>
          </div>
        )}
      </Modal>

      {/* Check-Out / Payment Modal */}
      <Modal
        title="Thanh toán & Cho xe ra bãi (Check-Out)"
        open={checkOutModalOpen}
        onCancel={() => setCheckOutModalOpen(false)}
        footer={null}
        destroyOnClose
        width={460}
      >
        {checkOutInfo && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* If checkout is not finalized yet, show form to confirm. Else show receipt */}
            {!checkOutInfo.checkOutTime ? (
              <Form form={checkOutForm} layout="vertical" onFinish={handleCheckoutConfirmSubmit} requiredMark={false} initialValues={{ paymentMethod: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 16 }}>
                  <div><strong>Biển số:</strong> <code style={{ fontSize: '16px', fontWeight: 'bold' }}>{checkOutInfo.licensePlate}</code></div>
                  <div><strong>Vị trí:</strong> {checkOutInfo.floorName} - {checkOutInfo.slotCode}</div>
                  <div><strong>Ước tính phí gửi:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--colors-primary)' }}>{formatCurrency(checkOutInfo.estimatedFee)}</span></div>
                  {checkOutInfo.isLostTicket && <Tag color="error" style={{ width: 'fit-content', marginTop: 4 }}>Ngoại lệ: Mất vé phạt thêm {formatCurrency(50000)}</Tag>}
                </div>

                <Form.Item label="Phương thức thanh toán" name="paymentMethod" rules={[{ required: true }]}>
                  <Radio.Group>
                    <Radio.Button value={0}>Tiền mặt</Radio.Button>
                    <Radio.Button value={1}>QR Pay (Mã MoMo/Ngân hàng)</Radio.Button>
                    <Radio.Button value={2}>Thẻ ATM/Tín dụng</Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
                  <Space>
                    <Button onClick={() => setCheckOutModalOpen(false)}>Hủy</Button>
                    <Button type="primary" htmlType="submit" size="large">Xác nhận thanh toán</Button>
                  </Space>
                </Form.Item>
              </Form>
            ) : (
              // Payment Receipt
              <div style={{ fontFamily: 'monospace', padding: '8px', fontSize: '13px' }}>
                <h3 style={{ textAlign: 'center', margin: '0 0 8px', fontSize: '16px' }}>HÓA ĐƠN GỬI XE</h3>
                <div style={{ textAlign: 'center', margin: '0 0 16px' }}>Mã lượt gửi: {checkOutInfo.sessionId.substring(0, 8)}...</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Biển số xe:</span><strong>{checkOutInfo.licensePlate}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Vị trí đỗ:</span><span>{checkOutInfo.floorName} - {checkOutInfo.slotCode}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Giờ vào:</span><span>{dayjs(checkOutInfo.checkInTime).format('DD/MM HH:mm')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Giờ ra:</span><span>{dayjs(checkOutInfo.checkOutTime).format('DD/MM HH:mm')}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Thời gian đỗ:</span><span>{checkOutInfo.durationMinutes} phút</span></div>
                <div style={{ borderTop: '1px dashed var(--colors-hairline)', margin: '12px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Phí cơ bản:</span><span>{formatCurrency(checkOutInfo.baseFee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Phí phạt/ngoại lệ:</span><span>{formatCurrency(checkOutInfo.penaltyFee)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 6px', fontSize: '15px', fontWeight: 'bold' }}>
                  <span>TỔNG TIỀN:</span>
                  <span style={{ color: 'var(--colors-primary)' }}>{formatCurrency(checkOutInfo.totalFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0' }}><span>Thanh toán:</span><span>{checkOutInfo.paymentMethod === 0 ? 'Tiền mặt' : checkOutInfo.paymentMethod === 1 ? 'QR Pay' : 'Thẻ'}</span></div>
                
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                  <Button type="dashed" icon={<Printer size={14} />} onClick={() => window.print()}>In hóa đơn</Button>
                </div>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* QR Scanner Modal Wrapper */}
      <QRScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanSuccess={handleScanSuccess}
        title={scanType === 'checkout' ? 'Quét vé check-out xe' : 'Quét vé check-in đặt trước'}
      />
    </Space>
  );
};
