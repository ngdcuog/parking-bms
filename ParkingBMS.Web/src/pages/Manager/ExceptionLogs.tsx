import React, { useEffect, useState } from 'react';
import { Space, Card, Table, Input, Select, DatePicker, Button, Typography, Tag, message, Modal, Row, Col } from 'antd';
import { api } from '../../services/api';
import { Search, RefreshCw, Download } from 'lucide-react';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ExceptionLog {
  logId: number;
  sessionId: string;
  handledByName: string;
  exceptionType: number;
  originalValue?: string;
  newValue?: string;
  description?: string;
  additionalFee: number;
  createdAt: string;
}

export const ExceptionLogs: React.FC = () => {
  const [logs, setLogs] = useState<ExceptionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);

  // Modal and Export state
  const [selectedLog, setSelectedLog] = useState<ExceptionLog | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);
  const [sessionSearch, setSessionSearch] = useState('');
  const [dates, setDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const dateFrom = dates[0]?.toISOString();
      const dateTo = dates[1]?.toISOString();

      const response = await api.get('/exceptions', {
        params: {
          exceptionType: typeFilter,
          sessionId: sessionSearch || undefined,
          dateFrom,
          dateTo,
          page: currentPage,
          pageSize
        }
      });
      const { items, totalCount } = response.data.data;
      setLogs(items);
      setTotalCount(totalCount);
    } catch (e: any) {
      message.error('Không thể lấy danh sách log ngoại lệ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, typeFilter, dates]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setTypeFilter(undefined);
    setSessionSearch('');
    setDates([null, null]);
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const dateFrom = dates[0]?.toISOString();
      const dateTo = dates[1]?.toISOString();

      // Fetch up to 1000 items matching the active filter for export
      const response = await api.get('/exceptions', {
        params: {
          exceptionType: typeFilter,
          sessionId: sessionSearch || undefined,
          dateFrom,
          dateTo,
          page: 1,
          pageSize: 1000
        }
      });
      
      const exportItems = response.data.data.items || [];
      if (exportItems.length === 0) {
        message.warning('Không có dữ liệu ngoại lệ để xuất.');
        return;
      }

      const headers = [
        'Mã Log', 
        'Mã Session', 
        'Loại Ngoại lệ', 
        'Dữ liệu cũ (Original)', 
        'Dữ liệu mới (New)', 
        'Phí phạt thêm (VNĐ)', 
        'Lý do / Mô tả', 
        'Người xử lý', 
        'Thời gian'
      ];
      
      const rows = exportItems.map((item: ExceptionLog) => {
        let typeStr = 'Khác';
        if (item.exceptionType === 0) typeStr = 'Mất vé';
        else if (item.exceptionType === 1) typeStr = 'Sai biển số';
        else if (item.exceptionType === 2) typeStr = 'Xe quá hạn';
        else if (item.exceptionType === 3) typeStr = 'Sai khu vực';

        return [
          `#${item.logId}`,
          item.sessionId,
          typeStr,
          item.originalValue || '-',
          item.newValue || '-',
          item.additionalFee,
          item.description || '',
          item.handledByName || '',
          dayjs(item.createdAt).format('DD/MM/YYYY HH:mm:ss')
        ];
      });

      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'BÁO CÁO PHÂN TÍCH NGOẠI LỆ HỆ THỐNG GỬI XE\n';
      csvContent += `Thời gian xuất: ${dayjs().format('DD/MM/YYYY HH:mm:ss')}\n\n`;
      csvContent += headers.join(',') + '\n';
      csvContent += rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n';

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `log_ngoai_le_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Xuất file CSV log ngoại lệ thành công!');
    } catch (error) {
      console.error(error);
      message.error('Không thể xuất báo cáo log ngoại lệ.');
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const getExceptionTypeName = (type: number) => {
    switch (type) {
      case 0: return 'Mất vé';
      case 1: return 'Sai biển số';
      case 2: return 'Xe quá hạn';
      case 3: return 'Sai khu vực';
      case 4: return 'Khác';
      default: return 'Khác';
    }
  };

  const getExceptionTypeTag = (type: number) => {
    switch (type) {
      case 0: return <Tag color="error" style={{ borderRadius: 0 }}>Mất vé (Lost Ticket)</Tag>;
      case 1: return <Tag color="warning" style={{ borderRadius: 0 }}>Sai biển số (Wrong Plate)</Tag>;
      case 2: return <Tag color="processing" style={{ borderRadius: 0 }}>Xe quá hạn (Overstay)</Tag>;
      case 3: return <Tag color="cyan" style={{ borderRadius: 0 }}>Sai khu vực (Wrong Zone)</Tag>;
      default: return <Tag color="default" style={{ borderRadius: 0 }}>Khác</Tag>;
    }
  };

  const columns = [
    {
      title: 'Mã Log',
      dataIndex: 'logId',
      key: 'logId',
      width: 90,
      render: (id: number) => <code>#{id}</code>
    },
    {
      title: 'Mã Session',
      dataIndex: 'sessionId',
      key: 'sessionId',
      width: 140,
      ellipsis: true,
      render: (sid: string) => <code style={{ fontSize: '11px' }}>{sid}</code>
    },
    {
      title: 'Loại ngoại lệ',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      render: (type: number) => getExceptionTypeTag(type)
    },
    {
      title: 'Dữ liệu cũ',
      dataIndex: 'originalValue',
      key: 'originalValue',
      render: (val?: string) => val ? <code>{val}</code> : <span style={{ color: '#aaa' }}>-</span>
    },
    {
      title: 'Dữ liệu mới',
      dataIndex: 'newValue',
      key: 'newValue',
      render: (val?: string) => val ? <code style={{ color: 'var(--colors-semantic-success)' }}>{val}</code> : <span style={{ color: '#aaa' }}>-</span>
    },
    {
      title: 'Phí phạt cộng thêm',
      dataIndex: 'additionalFee',
      key: 'additionalFee',
      render: (fee: number) => <span style={{ fontWeight: 600, color: fee > 0 ? 'var(--colors-semantic-error)' : 'var(--colors-ink)' }}>{formatCurrency(fee)}</span>
    },
    {
      title: 'Lý do / Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Người xử lý',
      dataIndex: 'handledByName',
      key: 'handledByName',
      render: (text: string) => <strong style={{ color: 'var(--colors-ink)' }}>{text}</strong>
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: ExceptionLog) => (
        <Button 
          size="small" 
          type="link" 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(record);
            setDetailModalOpen(true);
          }}
          style={{ padding: 0 }}
        >
          Xem chi tiết
        </Button>
      )
    }
  ];

  const hasActiveFilters = sessionSearch || typeFilter !== undefined || dates[0] !== null;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Log Ngoại lệ hệ thống</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Xem lịch sử các trường hợp ngoại lệ bất biến (Lost Ticket, Wrong Plate, Overstay, Wrong Zone) phục vụ đối soát kiểm toán.</span>
        </div>
        <Button
          type="default"
          icon={<Download size={14} />}
          onClick={handleExportCSV}
          loading={exportLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', borderRadius: 0 }}
        >
          Xuất Báo cáo CSV
        </Button>
      </div>

      {/* Filters Card */}
      <Card style={{ backgroundColor: 'var(--colors-surface-1)', border: 'none', borderRadius: 0 }}>
        <Space wrap size="middle">
          <Input
            placeholder="Tìm theo Mã Session (UUID)..."
            value={sessionSearch}
            onChange={(e) => setSessionSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<Search size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 4 }} />}
            style={{ width: '250px', borderRadius: 0 }}
          />

          <Select
            placeholder="Loại ngoại lệ"
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            allowClear
            style={{ width: '180px', borderRadius: 0 }}
            options={[
              { value: 0, label: 'Mất vé' },
              { value: 1, label: 'Sai biển số' },
              { value: 2, label: 'Xe quá hạn' },
              { value: 3, label: 'Sai khu vực' },
              { value: 4, label: 'Khác' }
            ]}
          />

          <RangePicker
            value={[dates[0], dates[1]]}
            onChange={(val) => setDates(val ? [val[0], val[1]] : [null, null])}
            style={{ borderRadius: 0 }}
          />

          <Button type="primary" onClick={handleSearch} style={{ borderRadius: 0 }}>Lọc</Button>
          <Button icon={<RefreshCw size={14} />} onClick={handleReset} style={{ borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>Làm mới</Button>
        </Space>
      </Card>

      {/* Smart filter chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '-12px', padding: '4px 8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--colors-ink-muted)' }}>Bộ lọc đang áp dụng:</span>
          {sessionSearch && (
            <Tag 
              closable 
              onClose={() => {
                setSessionSearch('');
                setCurrentPage(1);
              }}
              style={{ borderRadius: 0 }}
            >
              Session: {sessionSearch}
            </Tag>
          )}
          {typeFilter !== undefined && (
            <Tag 
              closable 
              onClose={() => {
                setTypeFilter(undefined);
                setCurrentPage(1);
              }}
              style={{ borderRadius: 0 }}
            >
              Loại: {getExceptionTypeName(typeFilter)}
            </Tag>
          )}
          {dates[0] && (
            <Tag 
              closable 
              onClose={() => {
                setDates([null, null]);
                setCurrentPage(1);
              }}
              style={{ borderRadius: 0 }}
            >
              Thời gian: {dates[0].format('DD/MM/YYYY')} - {dates[1]?.format('DD/MM/YYYY')}
            </Tag>
          )}
          <Button 
            type="link" 
            size="small" 
            onClick={handleReset} 
            style={{ fontSize: '12px', padding: 0, height: 'auto', display: 'flex', alignItems: 'center' }}
          >
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="logId"
        loading={loading}
        onRow={(record) => ({
          onClick: () => {
            setSelectedLog(record);
            setDetailModalOpen(true);
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: currentPage,
          total: totalCount,
          pageSize: pageSize,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false
        }}
        style={{ borderRadius: 0 }}
      />

      {/* Chi tiết đối soát Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '12px', width: '100%' }}>
            <span style={{ fontWeight: 400 }}>Chi tiết Đối Soát Ngoại Lệ</span>
            <code>#{selectedLog?.logId}</code>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => {
          setDetailModalOpen(false);
          setSelectedLog(null);
        }}
        footer={[
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setDetailModalOpen(false)}
            style={{ borderRadius: 0 }}
          >
            Đóng đối soát
          </Button>
        ]}
        width={600}
        destroyOnClose
        style={{ borderRadius: 0 }}
      >
        {selectedLog && (
          <div style={{ padding: '12px 0', fontFamily: 'IBM Plex Sans' }}>
            {/* Main high-contrast header */}
            <div style={{ 
              backgroundColor: 'var(--colors-surface-1)', 
              padding: '16px', 
              borderLeft: '4px solid var(--colors-primary)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loại ngoại lệ</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px' }}>{getExceptionTypeName(selectedLog.exceptionType)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Phí phạt cộng thêm</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--colors-semantic-error)', marginTop: '2px', textAlign: 'right' }}>
                    {formatCurrency(selectedLog.additionalFee)}
                  </div>
                </div>
              </div>
            </div>

            {/* Audit details metadata */}
            <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
              <Col span={24}>
                <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Mã Phiên Gửi Xe (Session UUID)</div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}><code style={{ wordBreak: 'break-all' }}>{selectedLog.sessionId}</code></div>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: '20px', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
              <Col span={12}>
                <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Người xử lý sự cố</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>{selectedLog.handledByName || 'Hệ thống tự động'}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Thời gian ghi nhận</div>
                <div style={{ fontSize: '13px', marginTop: '2px' }}>{dayjs(selectedLog.createdAt).format('DD/MM/YYYY HH:mm:ss')}</div>
              </Col>
            </Row>

            {/* Audit Comparison Panel */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colors-ink-muted)', marginBottom: '8px' }}>DỮ LIỆU ĐỐI CHIẾU SỰ CỐ</div>
              <Row gutter={16}>
                <Col span={12}>
                  <Card styles={{ body: { padding: '12px', backgroundColor: '#fff5f5', border: '1px solid #ffccc7', borderRadius: 0 } }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-semantic-error)' }}>Dữ liệu gốc (Ban đầu)</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-all' }}>
                      {selectedLog.originalValue ? <code>{selectedLog.originalValue}</code> : <span style={{ color: '#aaa', fontWeight: 'normal' }}>Không có</span>}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card styles={{ body: { padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 0 } }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-semantic-success)' }}>Dữ liệu mới (Sau điều chỉnh)</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px', wordBreak: 'break-all', color: 'var(--colors-semantic-success)' }}>
                      {selectedLog.newValue ? <code>{selectedLog.newValue}</code> : <span style={{ color: '#aaa', fontWeight: 'normal' }}>Không có</span>}
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>

            {/* Description & Narrative */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--colors-ink-muted)', marginBottom: '4px' }}>MÔ TẢ VỤ VIỆC & LÝ DO ĐIỀU CHỈNH</div>
              <div style={{ 
                backgroundColor: 'var(--colors-surface-2)', 
                padding: '12px 16px', 
                fontSize: '13px', 
                lineHeight: '1.6', 
                color: 'var(--colors-ink)',
                border: '1px solid var(--colors-hairline)'
              }}>
                {selectedLog.description || 'Không có mô tả chi tiết được cung cấp.'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Space>
  );
};
