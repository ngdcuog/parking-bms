import React, { useEffect, useState } from 'react';
import { Space, Card, Row, Col, Statistic, DatePicker, Typography, message, Progress, Skeleton, Button } from 'antd';
import { api } from '../../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DollarSign, Car, Compass, AlertCircle, Download } from 'lucide-react';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Define interfaces
interface DashboardSummary {
  todayRevenue: number;
  todaySessions: number;
  currentOccupancyPercent: number;
  totalFreeSlots: number;
  totalOccupiedSlots: number;
  totalReservedSlots: number;
  revenueByVehicleType: { vehicleType: number; revenue: number }[];
  slotsByFloor: {
    floorId: number;
    floorName: string;
    vehicleType: number;
    free: number;
    occupied: number;
    reserved: number;
    maintenance: number;
    locked: number;
    total: number;
    utilizationPercent: number;
  }[];
}

interface RevenueReport {
  period: string;
  totalRevenue: number;
  totalSessions: number;
  avgFee: number;
}

interface HourlyTraffic {
  hour: number;
  checkInCount: number;
  checkOutCount: number;
}

interface ExceptionsSummary {
  total: number;
  lostTicket: number;
  wrongPlate: number;
  overstay: number;
  wrongZone: number;
  other: number;
}

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReport[]>([]);
  const [trafficData, setTrafficData] = useState<HourlyTraffic[]>([]);
  const [exceptionData, setExceptionData] = useState<ExceptionsSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateFrom = dates[0].toISOString();
      const dateTo = dates[1].toISOString();

      const [summaryRes, revRes, trafficRes, exRes] = await Promise.all([
        api.get('/reports/dashboard-summary'),
        api.get('/reports/revenue', { params: { dateFrom, dateTo, groupBy: 'day' } }),
        api.get('/reports/hourly-traffic', { params: { dateFrom, dateTo } }),
        api.get('/reports/exceptions-summary', { params: { dateFrom, dateTo } })
      ]);

      setSummary(summaryRes.data.data);
      setRevenueData(revRes.data.data);
      setTrafficData(trafficRes.data.data);
      setExceptionData(exRes.data.data);
    } catch (error: any) {
      console.error(error);
      message.error('Không thể tải dữ liệu báo cáo thống kê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dates]);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  // Pie chart exceptions mapping
  const pieData = exceptionData
    ? [
        { name: 'Mất vé', value: exceptionData.lostTicket, color: '#da1e28' },
        { name: 'Sai biển', value: exceptionData.wrongPlate, color: '#f1c21b' },
        { name: 'Xe quá hạn', value: exceptionData.overstay, color: '#0f62fe' },
        { name: 'Sai khu vực', value: exceptionData.wrongZone, color: '#8c8c8c' },
        { name: 'Khác', value: exceptionData.other, color: '#161616' }
      ].filter((item) => item.value > 0)
    : [];

  const handleExportCSV = () => {
    try {
      const headersRev = ['Ngày/Kỳ báo cáo', 'Tổng Doanh thu', 'Tổng Lượt gửi', 'Giá trung bình lượt'];
      const rowsRev = revenueData.map(r => [
        r.period,
        r.totalRevenue,
        r.totalSessions,
        r.avgFee
      ]);

      const headersTraffic = ['Khung giờ (h)', 'Lượt xe vào', 'Lượt xe ra'];
      const rowsTraffic = trafficData.map(t => [
        `${t.hour}h`,
        t.checkInCount,
        t.checkOutCount
      ]);

      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'BÁO CÁO PHÂN TÍCH DOANH THU VÀ LƯU LƯỢNG GỬI XE\n';
      csvContent += `Thời gian báo cáo: Từ ${dates[0].format('DD/MM/YYYY')} Đến ${dates[1].format('DD/MM/YYYY')}\n\n`;

      csvContent += 'I. BÁO CÁO DOANH THU HÀNG NGÀY\n';
      csvContent += headersRev.join(',') + '\n';
      csvContent += rowsRev.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n') + '\n\n';

      csvContent += 'II. BÁO CÁO LƯU LƯỢNG XE VÀO RA THEO KHUNG GIỜ\n';
      csvContent += headersTraffic.join(',') + '\n';
      csvContent += rowsTraffic.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n') + '\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bao_cao_parking_${dates[0].format('YYYYMMDD')}_${dates[1].format('YYYYMMDD')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Xuất báo cáo phân tích thành công!');
    } catch (e) {
      message.error('Không thể xuất báo cáo.');
    }
  };

  const isInitialLoading = loading && !summary;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Top Filter and Info header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Dashboard Báo cáo & Phân tích</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Theo dõi doanh thu, lượt xe vào/ra, hiệu suất sử dụng slot và báo cáo ngoại lệ.</span>
        </div>
        <Space size="middle">
          {!isInitialLoading && (
            <Button
              type="default"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Xuất Báo cáo
            </Button>
          )}
          <Space>
            <span style={{ color: 'var(--colors-ink-muted)', fontSize: '13px' }}>Khoảng thời gian:</span>
            <RangePicker
              value={dates}
              onChange={(val) => val && setDates([val[0]!, val[1]!])}
              style={{ borderRadius: 0 }}
              allowClear={false}
            />
          </Space>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="Doanh thu hôm nay"
                value={summary?.todayRevenue ?? 0}
                formatter={(val) => <span style={{ fontWeight: 600, color: 'var(--colors-primary)' }}>{formatCurrency(Number(val))}</span>}
                prefix={<DollarSign size={20} style={{ color: 'var(--colors-primary)', marginRight: 8 }} />}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <Statistic
                title="Lượt gửi hôm nay"
                value={summary?.todaySessions ?? 0}
                valueStyle={{ fontWeight: 600 }}
                prefix={<Car size={20} style={{ color: 'var(--colors-ink-muted)', marginRight: 8 }} />}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <>
                <Statistic
                  title="Hiệu suất đỗ hiện tại"
                  value={summary?.currentOccupancyPercent ?? 0}
                  precision={1}
                  valueStyle={{ fontWeight: 600 }}
                  suffix="%"
                  prefix={<Compass size={20} style={{ color: 'var(--colors-semantic-success)', marginRight: 8 }} />}
                />
                <Progress
                  percent={Number((summary?.currentOccupancyPercent ?? 0).toFixed(1))}
                  size="small"
                  showInfo={false}
                  strokeColor="var(--colors-semantic-success)"
                  style={{ marginTop: 8 }}
                />
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ height: '100%' }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--colors-ink-muted)', fontSize: '14px' }}>Trạng thái Slot</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--colors-semantic-success)' }}>{summary?.totalFreeSlots ?? 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Trống</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--colors-semantic-error)' }}>{summary?.totalOccupiedSlots ?? 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Đang đỗ</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--colors-semantic-warning)' }}>{summary?.totalReservedSlots ?? 0}</div>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Đặt trước</div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Main Charts */}
      <Row gutter={[16, 16]}>
        {/* Doanh thu Chart */}
        <Col xs={24} lg={16}>
          <Card title="Biểu đồ doanh thu hàng ngày" styles={{ body: { height: '340px' } }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" stroke="var(--colors-ink-subtle)" fontSize={12} />
                  <YAxis stroke="var(--colors-ink-subtle)" fontSize={12} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Doanh thu']} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke="var(--colors-primary)"
                    strokeWidth={2}
                    name="Doanh thu (VNĐ)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px' }}>
                <AlertCircle size={40} color="var(--colors-ink-subtle)" />
                <span style={{ color: 'var(--colors-ink-subtle)', fontSize: '13px' }}>Không có dữ liệu doanh thu trong khoảng thời gian này</span>
              </div>
            )}
          </Card>
        </Col>

        {/* Exception distribution */}
        <Col xs={24} lg={8}>
          <Card title="Phân bố log ngoại lệ" styles={{ body: { height: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' } }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Trường hợp']} />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Space direction="vertical" align="center">
                <AlertCircle size={40} color="var(--colors-ink-subtle)" />
                <span style={{ color: 'var(--colors-ink-subtle)', fontSize: '13px' }}>Không có lỗi ngoại lệ nào trong kỳ</span>
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Hourly traffic profile */}
        <Col xs={24} lg={12}>
          <Card title="Lưu lượng xe vào/ra theo khung giờ (Peak Hours)" styles={{ body: { height: '320px' } }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : trafficData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--colors-surface-2)" />
                  <XAxis dataKey="hour" stroke="var(--colors-ink-subtle)" fontSize={12} tickFormatter={(val: number) => `${val}h`} />
                  <YAxis stroke="var(--colors-ink-subtle)" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="checkInCount" fill="var(--colors-primary)" name="Xe vào" />
                  <Bar dataKey="checkOutCount" fill="var(--colors-semantic-success)" name="Xe ra" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '12px' }}>
                <AlertCircle size={40} color="var(--colors-ink-subtle)" />
                <span style={{ color: 'var(--colors-ink-subtle)', fontSize: '13px' }}>Không có dữ liệu lưu lượng xe trong khoảng thời gian này</span>
              </div>
            )}
          </Card>
        </Col>

        {/* Utilization per Floor */}
        <Col xs={24} lg={12}>
          <Card title="Hiệu suất đỗ xe theo tầng" styles={{ body: { padding: '16px', minHeight: '320px' } }}>
            {isInitialLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : summary && summary.slotsByFloor.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--colors-hairline)', textAlign: 'left', color: 'var(--colors-ink-muted)' }}>
                    <th style={{ padding: '8px' }}>Tầng</th>
                    <th style={{ padding: '8px' }}>Loại xe</th>
                    <th style={{ padding: '8px' }}>Trống / Tổng</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Lấp đầy (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.slotsByFloor.map((floor) => (
                    <tr key={floor.floorId} style={{ borderBottom: '1px solid var(--colors-surface-1)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{floor.floorName}</td>
                      <td style={{ padding: '10px 8px' }}>{getVehicleTypeName(floor.vehicleType)}</td>
                      <td style={{ padding: '10px 8px' }}>{floor.free} / {floor.total} slot</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>
                        <span style={{ color: floor.utilizationPercent > 80 ? 'var(--colors-semantic-error)' : 'var(--colors-ink' }}>
                          {floor.utilizationPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--colors-ink-subtle)', fontSize: '13px' }}>
                Không có dữ liệu tầng xe.
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
};
