import React, { useEffect, useState } from 'react';
import { Space, Card, Button, Table, Modal, Form, InputNumber, Select, message, Typography, Tag, Row, Col, DatePicker } from 'antd';
import { api } from '../../services/api';
import { Plus, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

const { Title } = Typography;

interface Tariff {
  tariffId: number;
  vehicleType: number;
  pricePerHour: number;
  peakHourRate: number;
  peakStartTime?: string;
  peakEndTime?: string;
  dailyMaxFee?: number;
  lostTicketFee: number;
  overtimeHourThreshold?: number;
  overtimeFeeRate?: number;
  effectiveFrom: string;
  isActive: boolean;
}

const formatterVND = (value: any) => {
  if (value === undefined || value === null || value === '') return '';
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parserVND = (value: any) => {
  if (!value) return '';
  return value.replace(/\./g, '');
};

export const TariffManagement: React.FC = () => {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchTariffs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tariffs');
      setTariffs(response.data.data);
    } catch (e) {
      message.error('Không thể lấy danh sách bảng giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTariffs();
  }, []);

  const handleCreate = async (values: any) => {
    setSubmitLoading(true);
    try {
      const pricePerHour = values.pricePerHour || 1;
      const nightRate = values.nightRate || pricePerHour;
      const peakHourRate = Number((nightRate / pricePerHour).toFixed(2));

      // Process TimeSpan values from TimePicker or locked values
      const payload = {
        vehicleType: values.vehicleType,
        pricePerHour: values.pricePerHour,
        peakHourRate: peakHourRate,
        peakStartTime: '18:00:00',
        peakEndTime: '06:00:00',
        dailyMaxFee: values.dailyMaxFee,
        lostTicketFee: values.lostTicketFee,
        overtimeHourThreshold: null,
        overtimeFeeRate: null,
        effectiveFrom: values.effectiveFrom ? values.effectiveFrom.toISOString() : new Date().toISOString()
      };

      await api.post('/tariffs', payload);
      message.success('Tạo bảng giá mới thành công (Đã áp dụng và lưu lịch sử).');
      setModalOpen(false);
      form.resetFields();
      fetchTariffs();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo bảng giá.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  const columns = [
    {
      title: 'Loại xe',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      render: (type: number) => <strong>{getVehicleTypeName(type)}</strong>
    },
    {
      title: 'Giá Ca Ngày (06:00 - 18:00)',
      dataIndex: 'pricePerHour',
      key: 'pricePerHour',
      render: (price: number) => formatCurrency(price)
    },
    {
      title: 'Giá Ca Đêm (18:00 - 06:00)',
      key: 'peakPrice',
      render: (_: any, record: Tariff) => {
        const nightPrice = record.pricePerHour * record.peakHourRate;
        return (
          <span>
            {formatCurrency(nightPrice)} <span style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>(Hệ số: x{record.peakHourRate})</span>
          </span>
        );
      }
    },
    {
      title: 'Phí gửi Qua Đêm',
      dataIndex: 'dailyMaxFee',
      key: 'dailyMaxFee',
      render: (fee?: number) => (fee ? formatCurrency(fee) : 'Không áp dụng')
    },
    {
      title: 'Phí mất vé',
      dataIndex: 'lostTicketFee',
      key: 'lostTicketFee',
      render: (fee: number) => formatCurrency(fee)
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveFrom',
      key: 'effectiveFrom',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'default'} style={{ borderRadius: 0 }}>
          {active ? 'Đang hoạt động' : 'Hết hiệu lực'}
        </Tag>
      )
    }
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Cấu hình giá vé gửi xe</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Cài đặt bảng giá cơ bản, khung giờ cao điểm, giới hạn trần và các chính sách phạt mất vé, quá hạn đỗ.</span>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', borderRadius: 0 }}
        >
          Cấu hình giá mới
        </Button>
      </div>

      <Card style={{ backgroundColor: '#fff9e6', border: '1px solid var(--colors-semantic-warning)', borderRadius: 0 }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle size={24} color="var(--colors-semantic-warning)" />
          <span style={{ fontSize: '13px', color: '#856404', fontFamily: 'IBM Plex Sans' }}>
            <strong>Lưu ý:</strong> Khi bạn tạo cấu hình bảng giá mới cho một loại xe, bảng giá hiện tại của loại xe đó sẽ tự động được chuyển sang trạng thái <strong>Hết hiệu lực (Archived)</strong> và bảng giá mới sẽ được áp dụng kể từ ngày hiệu lực đã chọn.
          </span>
        </div>
      </Card>

      <Table
        dataSource={tariffs}
        columns={columns}
        rowKey="tariffId"
        loading={loading}
        pagination={{ pageSize: 10 }}
        style={{ borderRadius: 0 }}
      />

      {/* Create Tariff Modal */}
      <Modal
        title="Tạo bảng cấu hình giá vé mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Loại xe áp dụng" name="vehicleType" rules={[{ required: true }]} initialValue={0}>
                <Select
                  options={[
                    { value: 0, label: 'Xe máy' },
                    { value: 1, label: 'Ô tô' },
                    { value: 2, label: 'Xe tải' }
                  ]}
                  style={{ borderRadius: 0 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Giá Ca Ngày (06:00 - 18:00) (VNĐ)" 
                name="pricePerHour" 
                rules={[{ required: true, message: 'Nhập giá ca ngày!' }]} 
                initialValue={5000}
              >
                <InputNumber 
                  style={{ width: '100%', borderRadius: 0 }} 
                  min={0} 
                  step={1000} 
                  formatter={formatterVND}
                  parser={parserVND}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="Giá Ca Đêm (18:00 - 06:00) (VNĐ)" 
                name="nightRate" 
                rules={[{ required: true, message: 'Nhập giá ca đêm!' }]} 
                initialValue={7000}
              >
                <InputNumber 
                  style={{ width: '100%', borderRadius: 0 }} 
                  min={0} 
                  step={1000} 
                  formatter={formatterVND}
                  parser={parserVND}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="Phí gửi Qua Đêm (VNĐ)" 
                name="dailyMaxFee"
              >
                <InputNumber 
                  style={{ width: '100%', borderRadius: 0 }} 
                  min={0} 
                  step={5000} 
                  placeholder="Không áp dụng" 
                  formatter={formatterVND}
                  parser={parserVND}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="Phí phạt mất vé (VNĐ)" 
                name="lostTicketFee" 
                rules={[{ required: true, message: 'Nhập phí phạt mất vé!' }]} 
                initialValue={50000}
              >
                <InputNumber 
                  style={{ width: '100%', borderRadius: 0 }} 
                  min={0} 
                  step={5000} 
                  formatter={formatterVND}
                  parser={parserVND}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày áp dụng hiệu lực" name="effectiveFrom" initialValue={dayjs()}>
                <DatePicker style={{ width: '100%', borderRadius: 0 }} showTime format="YYYY-MM-DD HH:mm" />
              </Form.Item>
            </Col>
          </Row>


          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 0 }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading} style={{ borderRadius: 0 }}>Xác nhận áp dụng</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
