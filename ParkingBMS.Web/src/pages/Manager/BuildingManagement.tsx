import React, { useEffect, useState } from 'react';
import { Space, Card, Row, Col, Button, Table, Modal, Form, Input, InputNumber, Select, message, Typography, Popconfirm, Tag, Segmented } from 'antd';
import { api } from '../../services/api';
import { Plus, Building2, Layers, Grid, Edit, Trash2 } from 'lucide-react';

const { Title, Text } = Typography;

interface Building {
  buildingId: number;
  buildingName: string;
  address?: string;
  openTime: string;
  closeTime: string;
  contactPhone?: string;
  isActive: boolean;
}

interface Floor {
  floorId: number;
  buildingId: number;
  floorName: string;
  floorNumber: number;
  vehicleType: number;
  totalSlots: number;
  description?: string;
  isActive: boolean;
}

interface Slot {
  slotId: number;
  floorId: number;
  slotCode: string;
  vehicleType: number;
  status: number;
  isActive: boolean;
}

export const BuildingManagement: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  // Modals & UX state
  const [submitLoading, setSubmitLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');
  const [adminSlotModalOpen, setAdminSlotModalOpen] = useState(false);
  const [selectedSlotForAdmin, setSelectedSlotForAdmin] = useState<Slot | null>(null);

  const [bModalOpen, setBModalOpen] = useState(false);
  const [bEditMode, setBEditMode] = useState(false);
  
  const [fModalOpen, setFModalOpen] = useState(false);
  const [fEditMode, setFEditMode] = useState(false);

  const [sModalOpen, setSModalOpen] = useState(false);
  const [sBulkModalOpen, setSBulkModalOpen] = useState(false);
  const [sEditModalOpen, setSEditModalOpen] = useState(false);
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<Slot | null>(null);

  const [bForm] = Form.useForm();
  const [fForm] = Form.useForm();
  const [sForm] = Form.useForm();
  const [sBulkForm] = Form.useForm();
  const [sEditForm] = Form.useForm();

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/buildings');
      const data = response.data.data;
      setBuildings(data);
      if (data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(data[0]);
      }
    } catch (e: any) {
      message.error('Không thể lấy thông tin tòa nhà.');
    }
  };

  const fetchFloors = async (buildingId: number) => {
    try {
      const response = await api.get(`/buildings/${buildingId}/floors`);
      const floorsData = response.data.data;
      setFloors(floorsData);
      
      // Preserve selected floor if it still exists in the fresh floors list
      if (selectedFloor) {
        const stillExists = floorsData.find((f: any) => f.floorId === selectedFloor.floorId);
        if (!stillExists) {
          setSelectedFloor(null);
          setSlots([]);
        } else {
          // Update selectedFloor with fresh data from the server
          setSelectedFloor(stillExists);
        }
      }
    } catch (e) {
      message.error('Không thể lấy danh sách tầng.');
    }
  };

  const fetchSlots = async (floorId: number) => {
    try {
      const response = await api.get(`/floors/${floorId}/slots`, { params: { pageSize: 1000 } });
      setSlots(response.data.data.items);
    } catch (e) {
      message.error('Không thể lấy danh sách slot đỗ xe.');
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      fetchFloors(selectedBuilding.buildingId);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedFloor) {
      fetchSlots(selectedFloor.floorId);
    }
  }, [selectedFloor]);

  // Building Actions
  const handleOpenBuildingCreate = () => {
    bForm.resetFields();
    setBEditMode(false);
    setBModalOpen(true);
  };

  const handleOpenBuildingEdit = () => {
    if (!selectedBuilding) return;
    // Format TimeSpan (e.g. "06:00:00" -> "06:00") to keep the UI input clean and simple for the user!
    const openTimeShort = selectedBuilding.openTime.split(':').slice(0, 2).join(':');
    const closeTimeShort = selectedBuilding.closeTime.split(':').slice(0, 2).join(':');
    
    bForm.setFieldsValue({
      ...selectedBuilding,
      openTime: openTimeShort,
      closeTime: closeTimeShort,
    });
    setBEditMode(true);
    setBModalOpen(true);
  };

  const handleBuildingSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      // Ensure times have seconds ":00" so System.Text.Json deserializer parses TimeSpan successfully
      // And always preserve the isActive: true state when editing/creating a building
      const payload = {
        ...values,
        isActive: bEditMode ? (selectedBuilding?.isActive ?? true) : true,
        openTime: values.openTime.includes(':') && values.openTime.split(':').length === 2 ? `${values.openTime}:00` : values.openTime,
        closeTime: values.closeTime.includes(':') && values.closeTime.split(':').length === 2 ? `${values.closeTime}:00` : values.closeTime,
      };

      if (bEditMode && selectedBuilding) {
        const response = await api.put(`/buildings/${selectedBuilding.buildingId}`, payload);
        message.success('Cập nhật tòa nhà thành công.');
        setSelectedBuilding(response.data.data);
      } else {
        const response = await api.post('/buildings', payload);
        message.success('Thêm tòa nhà mới thành công.');
        setSelectedBuilding(response.data.data);
      }
      setBModalOpen(false);
      fetchBuildings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;
    setSubmitLoading(true);
    try {
      await api.delete(`/buildings/${selectedBuilding.buildingId}`);
      message.success('Xóa tòa nhà thành công.');
      setSelectedBuilding(null);
      setFloors([]);
      setSelectedFloor(null);
      setSlots([]);
      fetchBuildings();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa tòa nhà.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Floor Actions
  const handleOpenFloorCreate = () => {
    fForm.resetFields();
    setFEditMode(false);
    setFModalOpen(true);
  };

  const handleOpenFloorEdit = (floor: Floor) => {
    setSelectedFloor(floor);
    fForm.setFieldsValue({
      ...floor,
      vehicleType: mapVehicleTypeToVal(floor.vehicleType)
    });
    setFEditMode(true);
    setFModalOpen(true);
  };

  const handleFloorSubmit = async (values: any) => {
    if (!selectedBuilding) return;
    setSubmitLoading(true);
    try {
      const payload = {
        ...values,
        isActive: fEditMode ? (selectedFloor?.isActive ?? true) : true
      };

      if (fEditMode && values.floorId) {
        await api.put(`/floors/${values.floorId}`, payload);
        message.success('Cập nhật tầng thành công.');
      } else {
        const response = await api.post(`/buildings/${selectedBuilding.buildingId}/floors`, payload);
        const newFloor = response.data.data;
        message.success('Thêm tầng mới thành công.');

        // Auto-generate initial slots if specified
        const { initMotorbikeSlots, initCarSlots, initTruckSlots } = values;
        
        if (initMotorbikeSlots && initMotorbikeSlots > 0) {
          try {
            await api.post(`/floors/${newFloor.floorId}/slots/bulk`, {
              prefix: 'M',
              startNumber: 1,
              endNumber: initMotorbikeSlots,
              vehicleType: 0
            });
          } catch (slotErr) {
            console.error('Lỗi khi tạo tự động slot xe máy:', slotErr);
            message.warning('Tạo tầng thành công nhưng gặp lỗi khi tự động tạo slot xe máy.');
          }
        }
        
        if (initCarSlots && initCarSlots > 0) {
          try {
            await api.post(`/floors/${newFloor.floorId}/slots/bulk`, {
              prefix: 'C',
              startNumber: 1,
              endNumber: initCarSlots,
              vehicleType: 1
            });
          } catch (slotErr) {
            console.error('Lỗi khi tạo tự động slot ô tô:', slotErr);
            message.warning('Tạo tầng thành công nhưng gặp lỗi khi tự động tạo slot ô tô.');
          }
        }

        if (initTruckSlots && initTruckSlots > 0) {
          try {
            await api.post(`/floors/${newFloor.floorId}/slots/bulk`, {
              prefix: 'T',
              startNumber: 1,
              endNumber: initTruckSlots,
              vehicleType: 2
            });
          } catch (slotErr) {
            console.error('Lỗi khi tạo tự động slot xe tải:', slotErr);
            message.warning('Tạo tầng thành công nhưng gặp lỗi khi tự động tạo slot xe tải.');
          }
        }
      }
      setFModalOpen(false);
      fetchFloors(selectedBuilding.buildingId);
      if (selectedFloor) {
        fetchSlots(selectedFloor.floorId);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteFloor = async (floorId: number) => {
    if (!selectedBuilding) return;
    setSubmitLoading(true);
    try {
      await api.delete(`/floors/${floorId}`);
      message.success('Xóa tầng đỗ xe thành công.');
      fetchFloors(selectedBuilding.buildingId);
      if (selectedFloor?.floorId === floorId) {
        setSelectedFloor(null);
        setSlots([]);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa tầng đỗ xe.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Slot Actions
  const handleOpenSlotCreate = () => {
    sForm.resetFields();
    if (selectedFloor) {
      sForm.setFieldsValue({ vehicleType: mapVehicleTypeToVal(selectedFloor.vehicleType) });
    }
    setSModalOpen(true);
  };

  const handleOpenBulkSlotCreate = () => {
    sBulkForm.resetFields();
    if (selectedFloor) {
      sBulkForm.setFieldsValue({ vehicleType: mapVehicleTypeToVal(selectedFloor.vehicleType) });
    }
    setSBulkModalOpen(true);
  };

  const handleSlotCreate = async (values: any) => {
    if (!selectedFloor) return;
    setSubmitLoading(true);
    try {
      await api.post(`/floors/${selectedFloor.floorId}/slots`, values);
      message.success('Tạo slot đỗ xe thành công.');
      setSModalOpen(false);
      fetchSlots(selectedFloor.floorId);
      fetchFloors(selectedBuilding!.buildingId); // update floor count
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleBulkSlotCreate = async (values: any) => {
    if (!selectedFloor) return;
    setSubmitLoading(true);
    try {
      const payload = {
        prefix: values.prefix,
        startNumber: values.startNumber,
        endNumber: values.startNumber + values.count - 1,
        vehicleType: values.vehicleType
      };
      await api.post(`/floors/${selectedFloor.floorId}/slots/bulk`, payload);
      message.success('Tạo hàng loạt slot đỗ xe thành công.');
      setSBulkModalOpen(false);
      fetchSlots(selectedFloor.floorId);
      fetchFloors(selectedBuilding!.buildingId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    setSubmitLoading(true);
    try {
      await api.delete(`/slots/${slotId}`);
      message.success('Xóa slot đỗ xe thành công.');
      if (selectedFloor) {
        fetchSlots(selectedFloor.floorId);
        fetchFloors(selectedBuilding!.buildingId);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa slot.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteAllSlots = async () => {
    if (!selectedFloor) return;
    setSubmitLoading(true);
    try {
      await api.delete(`/floors/${selectedFloor.floorId}/slots`);
      message.success('Xóa toàn bộ ô đỗ xe của tầng thành công.');
      fetchSlots(selectedFloor.floorId);
      fetchFloors(selectedBuilding!.buildingId);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa toàn bộ ô đỗ.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleSlotStatus = async (slotId: number, newStatus: number) => {
    setSubmitLoading(true);
    try {
      await api.put(`/slots/${slotId}/status`, { status: newStatus });
      message.success('Cập nhật trạng thái slot thành công.');
      setAdminSlotModalOpen(false);
      setSelectedSlotForAdmin(null);
      if (selectedFloor) {
        fetchSlots(selectedFloor.floorId);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái slot.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenSlotEdit = (slot: Slot) => {
    setSelectedSlotForEdit(slot);
    sEditForm.setFieldsValue({
      ...slot,
      vehicleType: mapVehicleTypeToVal(slot.vehicleType)
    });
    setSEditModalOpen(true);
  };

  const handleSlotEdit = async (values: any) => {
    if (!selectedSlotForEdit) return;
    setSubmitLoading(true);
    try {
      await api.put(`/slots/${selectedSlotForEdit.slotId}`, values);
      message.success('Cập nhật thông tin slot thành công.');
      setSEditModalOpen(false);
      sEditForm.resetFields();
      setSelectedSlotForEdit(null);
      setAdminSlotModalOpen(false);
      if (selectedFloor) {
        fetchSlots(selectedFloor.floorId);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getVehicleTypeName = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return 'Xe máy';
    if (type === 1 || type === 'Car') return 'Ô tô';
    if (type === 2 || type === 'Truck') return 'Xe tải';
    return 'Khác';
  };

  const getVehicleTypeIcon = (type: number | string) => {
    if (type === 0 || type === 'Motorbike') return '🏍️';
    if (type === 1 || type === 'Car') return '🚗';
    if (type === 2 || type === 'Truck') return '🚚';
    return '';
  };

  const mapVehicleTypeToVal = (type: number | string): number => {
    if (type === 0 || type === 'Motorbike') return 0;
    if (type === 1 || type === 'Car') return 1;
    if (type === 2 || type === 'Truck') return 2;
    return 0;
  };

  const getSlotStatusTag = (status: number | string) => {
    if (status === 0 || status === 'Free') return <Tag color="success">Trống</Tag>;
    if (status === 1 || status === 'Occupied') return <Tag color="error">Đang đỗ</Tag>;
    if (status === 2 || status === 'Reserved') return <Tag color="warning">Đặt trước</Tag>;
    if (status === 3 || status === 'Maintenance') return <Tag color="default">Bảo trì</Tag>;
    if (status === 4 || status === 'Locked') return <Tag color="magenta">Khóa</Tag>;
    return <Tag>Không rõ</Tag>;
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Cấu trúc bãi đỗ xe</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Cấu hình các tòa nhà, tầng đỗ xe, và tạo danh sách các ô đỗ xe (slots) đơn lẻ hoặc hàng loạt.</span>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Buildings column */}
        <Col xs={24} md={6}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={16} /> Tòa nhà</span>
                <Button size="small" icon={<Plus size={14} />} onClick={handleOpenBuildingCreate}>Thêm</Button>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {buildings.map((b) => (
                <div
                  key={b.buildingId}
                  onClick={() => setSelectedBuilding(b)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: selectedBuilding?.buildingId === b.buildingId ? 'var(--colors-surface-1)' : '#ffffff',
                    border: '1px solid',
                    borderColor: selectedBuilding?.buildingId === b.buildingId ? 'var(--colors-primary)' : 'var(--colors-hairline)',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Sans'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--colors-ink)' }}>{b.buildingName}</div>
                  <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)', marginTop: '4px' }}>Giờ: {b.openTime} - {b.closeTime}</div>
                </div>
              ))}
            </div>
          </Card>

          {selectedBuilding && (
            <Card title="Thông tin tòa nhà" style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <div><strong>Tên:</strong> {selectedBuilding.buildingName}</div>
                <div><strong>Địa chỉ:</strong> {selectedBuilding.address || 'Không có'}</div>
                <div><strong>Giờ mở cửa:</strong> {selectedBuilding.openTime}</div>
                <div><strong>Giờ đóng cửa:</strong> {selectedBuilding.closeTime}</div>
                <div><strong>SĐT liên hệ:</strong> {selectedBuilding.contactPhone || 'Không có'}</div>
              </div>
              <Space direction="vertical" style={{ width: '100%', marginTop: '16px' }}>
                <Button
                  type="dashed"
                  block
                  icon={<Edit size={14} />}
                  onClick={handleOpenBuildingEdit}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  Chỉnh sửa thông tin
                </Button>
                <Popconfirm
                  title="Bạn có chắc muốn xóa tòa nhà này cùng toàn bộ các tầng và ô đỗ thuộc tòa nhà này?"
                  onConfirm={handleDeleteBuilding}
                  okText="Xóa"
                  cancelText="Hủy"
                  disabled={submitLoading}
                >
                  <Button
                    danger
                    type="dashed"
                    block
                    icon={<Trash2 size={14} />}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    loading={submitLoading}
                  >
                    Xóa tòa nhà
                  </Button>
                </Popconfirm>
              </Space>
            </Card>
          )}
        </Col>

        {/* Floors Column */}
        <Col xs={24} md={9}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Layers size={16} /> Danh sách Tầng</span>
                {selectedBuilding && (
                  <Button size="small" icon={<Plus size={14} />} onClick={handleOpenFloorCreate}>Thêm tầng</Button>
                )}
              </div>
            }
          >
            <Table
              dataSource={floors}
              rowKey="floorId"
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => setSelectedFloor(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor: selectedFloor?.floorId === record.floorId ? 'var(--colors-surface-1)' : undefined
                }
              })}
              columns={[
                {
                  title: 'Tên tầng',
                  dataIndex: 'floorName',
                  key: 'floorName',
                  render: (text: string) => <strong style={{ color: 'var(--colors-ink)' }}>{text}</strong>
                },
                {
                  title: 'Loại xe',
                  dataIndex: 'vehicleType',
                  key: 'vehicleType',
                  render: (type: number) => getVehicleTypeName(type)
                },
                {
                  title: 'Số Slot',
                  dataIndex: 'totalSlots',
                  key: 'totalSlots',
                  align: 'right'
                },
                {
                  title: '',
                  key: 'actions',
                  align: 'right',
                  render: (_, record: Floor) => (
                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="small"
                        type="text"
                        icon={<Edit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFloorEdit(record);
                        }}
                      />
                      <Popconfirm
                        title="Bạn có chắc muốn xóa tầng đỗ xe này cùng toàn bộ các ô đỗ thuộc tầng này?"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteFloor(record.floorId);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Xóa"
                        cancelText="Hủy"
                        disabled={submitLoading}
                      >
                        <Button
                          size="small"
                          danger
                          type="text"
                          icon={<Trash2 size={14} />}
                          onClick={(e) => e.stopPropagation()}
                          disabled={submitLoading}
                        />
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        {/* Slots Column */}
        <Col xs={24} md={9}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Grid size={16} /> Ô đỗ xe (Slots)</span>
                {selectedFloor && (
                  <Space>
                    <Segmented
                      size="small"
                      options={[
                        { label: 'Sơ đồ', value: 'visual' },
                        { label: 'Bảng', value: 'table' }
                      ]}
                      value={viewMode}
                      onChange={(val) => setViewMode(val as 'table' | 'visual')}
                      style={{ borderRadius: 0 }}
                    />
                    <Button size="small" onClick={handleOpenSlotCreate}>+ Đơn</Button>
                    <Button size="small" type="primary" onClick={handleOpenBulkSlotCreate}>+ Hàng loạt</Button>
                    <Popconfirm
                      title="Bạn có chắc chắn muốn xóa TOÀN BỘ ô đỗ trên tầng này? Hành động này không thể hoàn tác!"
                      onConfirm={handleDeleteAllSlots}
                      okText="Xóa tất cả"
                      cancelText="Hủy"
                      disabled={submitLoading || slots.length === 0}
                    >
                      <Button size="small" danger type="dashed" style={{ borderRadius: 0 }} disabled={slots.length === 0} loading={submitLoading}>
                        Xóa toàn bộ
                      </Button>
                    </Popconfirm>
                  </Space>
                )}
              </div>
            }
          >
            {selectedFloor ? (
              viewMode === 'table' ? (
                <Table
                  dataSource={slots}
                  rowKey="slotId"
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  columns={[
                    {
                      title: 'Mã Slot',
                      dataIndex: 'slotCode',
                      key: 'slotCode',
                      render: (code: string) => <code>{code}</code>
                    },
                    {
                      title: 'Loại xe',
                      dataIndex: 'vehicleType',
                      key: 'vehicleType',
                      render: (type: number) => <span>{getVehicleTypeIcon(type)} {getVehicleTypeName(type)}</span>
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: number) => getSlotStatusTag(status)
                    },
                    {
                      title: 'Sửa',
                      key: 'edit',
                      align: 'right' as const,
                      render: (_, record: Slot) => (
                        <Button
                          size="small"
                          type="text"
                          icon={<Edit size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSlotEdit(record);
                          }}
                          disabled={record.status !== 0 && record.status !== 3 && record.status !== 4 || submitLoading}
                        />
                      )
                    },
                    {
                      title: 'Xóa',
                      key: 'delete',
                      align: 'right' as const,
                      render: (_, record: Slot) => (
                        <Popconfirm
                          title="Bạn có chắc muốn xóa slot này?"
                          onConfirm={() => handleDeleteSlot(record.slotId)}
                          disabled={record.status !== 0} // Only delete free slots
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button
                            size="small"
                            danger
                            type="text"
                            icon={<Trash2 size={14} />}
                            disabled={record.status !== 0 || submitLoading}
                          />
                        </Popconfirm>
                      )
                    }
                  ]}
                />
              ) : (
                /* Visual Floor layout grid */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: '8px', padding: '8px 0', maxHeight: '420px', overflowY: 'auto' }}>
                    {slots.map(slot => {
                      const statusColor = 
                        slot.status === 0 ? 'var(--colors-semantic-success)' : // Trống (Green)
                        slot.status === 1 ? 'var(--colors-semantic-error)' :   // Đang đỗ (Red)
                        slot.status === 2 ? 'var(--colors-semantic-warning)' : // Đặt trước (Yellow)
                        slot.status === 3 ? '#8c8c8c' :                        // Bảo trì (Gray)
                        slot.status === 4 ? '#da1e28' :                        // Khóa (Magenta)
                        '#161616';
                      
                      const bgColor = 
                        slot.status === 0 ? '#f6ffed' : 
                        slot.status === 1 ? '#fff5f5' : 
                        slot.status === 2 ? '#fffbe6' :
                        slot.status === 3 ? '#f5f5f5' :
                        '#fff1f0';

                      return (
                        <div
                          key={slot.slotId}
                          onClick={() => {
                            setSelectedSlotForAdmin(slot);
                            setAdminSlotModalOpen(true);
                          }}
                          style={{
                            padding: '12px 4px',
                            textAlign: 'center',
                            border: '1px solid',
                            borderColor: statusColor,
                            backgroundColor: bgColor,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <code style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--colors-ink)' }}>{getVehicleTypeIcon(slot.vehicleType)} {slot.slotCode}</code>
                          <div style={{ fontSize: '9px', marginTop: '4px', color: 'var(--colors-ink-muted)' }}>
                            {slot.status === 0 ? 'Trống' : slot.status === 1 ? 'Đang đỗ' : slot.status === 2 ? 'Đặt trước' : slot.status === 3 ? 'Bảo trì' : 'Khóa'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Legend guide */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '12px', fontSize: '11px', color: 'var(--colors-ink-muted)' }}>
                    <Space><div style={{ width: 8, height: 8, backgroundColor: 'var(--colors-semantic-success)' }} /> Trống</Space>
                    <Space><div style={{ width: 8, height: 8, backgroundColor: 'var(--colors-semantic-error)' }} /> Đang đỗ</Space>
                    <Space><div style={{ width: 8, height: 8, backgroundColor: 'var(--colors-semantic-warning)' }} /> Đặt trước</Space>
                    <Space><div style={{ width: 8, height: 8, backgroundColor: '#8c8c8c' }} /> Bảo trì</Space>
                    <Space><div style={{ width: 8, height: 8, backgroundColor: '#da1e28' }} /> Đang Khóa</Space>
                  </div>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--colors-ink-subtle)', fontFamily: 'IBM Plex Sans' }}>
                Vui lòng chọn một Tầng để cấu hình slots đỗ xe.
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Building Modal */}
      <Modal
        title={bEditMode ? 'Chỉnh sửa tòa nhà' : 'Tạo tòa nhà mới'}
        open={bModalOpen}
        onCancel={() => setBModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={bForm} layout="vertical" onFinish={handleBuildingSubmit} requiredMark={false}>
          <Form.Item label="Tên tòa nhà" name="buildingName" rules={[{ required: true, message: 'Nhập tên tòa nhà!' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="address">
            <Input />
          </Form.Item>
          <Form.Item label="Giờ mở cửa (HH:mm)" name="openTime" rules={[{ required: true, message: 'Nhập giờ mở cửa!' }]} initialValue="06:00">
            <Input placeholder="06:00" />
          </Form.Item>
          <Form.Item label="Giờ đóng cửa (HH:mm)" name="closeTime" rules={[{ required: true, message: 'Nhập giờ đóng cửa!' }]} initialValue="22:00">
            <Input placeholder="22:00" />
          </Form.Item>
          <Form.Item label="SĐT liên hệ" name="contactPhone">
            <Input />
          </Form.Item>
          <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {bEditMode ? (
                <Popconfirm
                  title="Bạn có chắc muốn xóa tòa nhà này cùng toàn bộ các tầng và ô đỗ thuộc tòa nhà này?"
                  onConfirm={async () => {
                    await handleDeleteBuilding();
                    setBModalOpen(false);
                  }}
                  okText="Xóa"
                  cancelText="Hủy"
                  disabled={submitLoading}
                >
                  <Button danger type="dashed" htmlType="button" style={{ borderRadius: 0 }} loading={submitLoading}>Xóa tòa nhà</Button>
                </Popconfirm>
              ) : <div />}
              <Space>
                <Button onClick={() => setBModalOpen(false)} style={{ borderRadius: 0 }}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={submitLoading} style={{ borderRadius: 0 }}>Lưu</Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Floor Modal */}
      <Modal
        title={fEditMode ? 'Chỉnh sửa tầng đỗ xe & Quản lý Ô đỗ' : 'Tạo tầng đỗ xe mới'}
        open={fModalOpen}
        onCancel={() => setFModalOpen(false)}
        footer={null}
        destroyOnClose
        width={fEditMode ? 1000 : 520}
        style={{ top: 40 }}
      >
        {fEditMode ? (
          <Row gutter={24}>
            {/* Left Column: Floor Details Form */}
            <Col xs={24} md={10} style={{ borderRight: '1px solid var(--colors-hairline)', paddingRight: '24px' }}>
              <Title level={5} style={{ marginTop: 0, marginBottom: '16px', fontWeight: 500 }}>Thông tin tầng</Title>
              <Form form={fForm} layout="vertical" onFinish={handleFloorSubmit} requiredMark={false}>
                <Form.Item name="floorId" hidden><Input /></Form.Item>
                <Form.Item label="Tên tầng (VD: Tầng B1)" name="floorName" rules={[{ required: true, message: 'Nhập tên tầng!' }]}>
                  <Input style={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item label="Số thứ tự tầng (Tầng hầm dùng số âm: -1, -2)" name="floorNumber" rules={[{ required: true, message: 'Nhập số thứ tự tầng!' }]}>
                  <InputNumber style={{ width: '100%', borderRadius: 0 }} disabled />
                </Form.Item>
                <Form.Item label="Loại xe được phép đỗ chính" name="vehicleType" rules={[{ required: true, message: 'Chọn loại xe!' }]}>
                  <Select
                    style={{ borderRadius: 0 }}
                    options={[
                      { value: 0, label: 'Xe máy' },
                      { value: 1, label: 'Ô tô' },
                      { value: 2, label: 'Xe tải' }
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Mô tả thêm" name="description">
                  <Input style={{ borderRadius: 0 }} />
                </Form.Item>
                <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Popconfirm
                      title="Bạn có chắc muốn xóa tầng đỗ xe này cùng toàn bộ các ô đỗ thuộc tầng này?"
                      onConfirm={async () => {
                        if (selectedFloor) {
                          await handleDeleteFloor(selectedFloor.floorId);
                          setFModalOpen(false);
                        }
                      }}
                      okText="Xóa"
                      cancelText="Hủy"
                      disabled={submitLoading}
                    >
                      <Button danger type="dashed" style={{ borderRadius: 0 }} loading={submitLoading}>Xóa tầng</Button>
                    </Popconfirm>
                    <Space>
                      <Button onClick={() => setFModalOpen(false)} style={{ borderRadius: 0 }}>Hủy</Button>
                      <Button type="primary" htmlType="submit" loading={submitLoading} style={{ borderRadius: 0 }}>Lưu tầng</Button>
                    </Space>
                  </div>
                </Form.Item>
              </Form>
            </Col>

            {/* Right Column: Floor Slots Management */}
            <Col xs={24} md={14}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={5} style={{ margin: 0, fontWeight: 500 }}>Danh sách ô đỗ xe của Tầng</Title>
                <Space>
                  <Button size="small" onClick={handleOpenSlotCreate} style={{ borderRadius: 0 }}>+ Ô đơn</Button>
                  <Button size="small" type="primary" onClick={handleOpenBulkSlotCreate} style={{ borderRadius: 0 }}>+ Hàng loạt</Button>
                  <Popconfirm
                    title="Bạn có chắc chắn muốn xóa TOÀN BỘ ô đỗ trên tầng này? Hành động này không thể hoàn tác!"
                    onConfirm={handleDeleteAllSlots}
                    okText="Xóa tất cả"
                    cancelText="Hủy"
                    disabled={submitLoading || slots.length === 0}
                  >
                    <Button size="small" danger type="dashed" style={{ borderRadius: 0 }} disabled={slots.length === 0} loading={submitLoading}>
                      Xóa toàn bộ
                    </Button>
                  </Popconfirm>
                </Space>
              </div>

              {/* Slot breakdown metrics */}
              <Row gutter={8} style={{ marginBottom: '16px' }}>
                <Col span={6}>
                  <div style={{ padding: '8px', border: '1px solid var(--colors-hairline)', textAlign: 'center', backgroundColor: 'var(--colors-surface-1)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>Tổng số</div>
                    <strong style={{ fontSize: '16px' }}>{slots.length}</strong>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', border: '1px solid var(--colors-hairline)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>🏍️ Xe máy</div>
                    <strong style={{ fontSize: '16px' }}>{slots.filter(s => s.vehicleType === 0).length}</strong>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', border: '1px solid var(--colors-hairline)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>🚗 Ô tô</div>
                    <strong style={{ fontSize: '16px' }}>{slots.filter(s => s.vehicleType === 1).length}</strong>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ padding: '8px', border: '1px solid var(--colors-hairline)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--colors-ink-muted)' }}>🚚 Xe tải</div>
                    <strong style={{ fontSize: '16px' }}>{slots.filter(s => s.vehicleType === 2).length}</strong>
                  </div>
                </Col>
              </Row>

              <Table
                dataSource={slots}
                rowKey="slotId"
                size="small"
                pagination={{ pageSize: 5, showSizeChanger: false, simple: true }}
                columns={[
                  {
                    title: 'Mã Slot',
                    dataIndex: 'slotCode',
                    key: 'slotCode',
                    render: (code: string) => <code>{code}</code>
                  },
                  {
                    title: 'Loại xe',
                    dataIndex: 'vehicleType',
                    key: 'vehicleType',
                    render: (type: number) => <span>{getVehicleTypeIcon(type)} {getVehicleTypeName(type)}</span>
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: number) => getSlotStatusTag(status)
                  },
                  {
                    title: 'Sửa',
                    key: 'edit',
                    align: 'right' as const,
                    render: (_, record: Slot) => (
                      <Button
                        size="small"
                        type="text"
                        icon={<Edit size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSlotEdit(record);
                        }}
                        disabled={record.status !== 0 && record.status !== 3 && record.status !== 4 || submitLoading}
                      />
                    )
                  },
                  {
                    title: 'Xóa',
                    key: 'delete',
                    align: 'right' as const,
                    render: (_, record: Slot) => (
                      <Popconfirm
                        title="Bạn có chắc muốn xóa slot này?"
                        onConfirm={() => handleDeleteSlot(record.slotId)}
                        disabled={record.status !== 0}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button
                          size="small"
                          danger
                          type="text"
                          icon={<Trash2 size={14} />}
                          disabled={record.status !== 0 || submitLoading}
                        />
                      </Popconfirm>
                    )
                  }
                ]}
              />
            </Col>
          </Row>
        ) : (
          /* Create Floor Form */
          <Form form={fForm} layout="vertical" onFinish={handleFloorSubmit} requiredMark={false}>
            <Form.Item label="Tên tầng (VD: Tầng B1)" name="floorName" rules={[{ required: true, message: 'Nhập tên tầng!' }]}>
              <Input style={{ borderRadius: 0 }} />
            </Form.Item>
            <Form.Item label="Số thứ tự tầng (Tầng hầm dùng số âm: -1, -2. Tầng trên dùng số dương: 1, 2)" name="floorNumber" rules={[{ required: true, message: 'Nhập số thứ tự tầng!' }]}>
              <InputNumber style={{ width: '100%', borderRadius: 0 }} />
            </Form.Item>
            <Form.Item label="Loại xe được phép đỗ chính" name="vehicleType" rules={[{ required: true, message: 'Chọn loại xe!' }]} initialValue={0}>
              <Select
                style={{ borderRadius: 0 }}
                options={[
                  { value: 0, label: 'Xe máy' },
                  { value: 1, label: 'Ô tô' },
                  { value: 2, label: 'Xe tải' }
                ]}
              />
            </Form.Item>
            <Form.Item label="Mô tả thêm" name="description">
              <Input style={{ borderRadius: 0 }} />
            </Form.Item>

            {/* Initial Slots Configuration Section */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--colors-hairline)', paddingTop: '16px' }}>
              <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--colors-ink)', fontSize: '13px' }}>
                Khởi tạo danh sách ô đỗ xe (Slots) ban đầu
              </div>
              <p style={{ fontSize: '12px', color: 'var(--colors-ink-muted)', marginBottom: '16px' }}>
                Hệ thống sẽ tự động tạo các ô đỗ xe với ký tự tiền tố mặc định (M cho xe máy, C cho ô tô, T cho xe tải) bắt đầu từ số 1.
              </p>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label="Số ô Xe máy (🏍️)" name="initMotorbikeSlots" initialValue={0}>
                    <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 0 }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Số ô Ô tô (🚗)" name="initCarSlots" initialValue={0}>
                    <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 0 }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Số ô Xe tải (🚚)" name="initTruckSlots" initialValue={0}>
                    <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 0 }} />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setFModalOpen(false)} style={{ borderRadius: 0 }}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={submitLoading} style={{ borderRadius: 0 }}>Lưu</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Single Slot Modal */}
      <Modal
        title="Tạo ô đỗ xe (Slot) mới"
        open={sModalOpen}
        onCancel={() => setSModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={sForm} layout="vertical" onFinish={handleSlotCreate} requiredMark={false}>
          <Form.Item label="Mã Slot đỗ xe (VD: A01)" name="slotCode" rules={[{ required: true, message: 'Nhập mã slot!' }]}>
            <Input placeholder="A01" />
          </Form.Item>
          <Form.Item label="Loại xe" name="vehicleType" rules={[{ required: true, message: 'Chọn loại xe đỗ!' }]}>
            <Select
              options={[
                { value: 0, label: 'Xe máy' },
                { value: 1, label: 'Ô tô' },
                { value: 2, label: 'Xe tải' }
              ]}
              style={{ borderRadius: 0 }}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setSModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>Tạo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Bulk Slot Modal */}
      <Modal
        title="Tạo hàng loạt slot đỗ xe"
        open={sBulkModalOpen}
        onCancel={() => setSBulkModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={sBulkForm} layout="vertical" onFinish={handleBulkSlotCreate} requiredMark={false}>
          <Form.Item
            label="Ký tự tiền tố (Prefix - VD: 'A', 'B')"
            name="prefix"
            rules={[{ required: true, message: 'Nhập tiền tố!' }]}
            initialValue="A"
          >
            <Input placeholder="A" />
          </Form.Item>
          <Form.Item
            label="Số bắt đầu (VD: 1)"
            name="startNumber"
            rules={[{ required: true, message: 'Nhập số bắt đầu!' }]}
            initialValue={1}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="Số lượng slot cần tạo"
            name="count"
            rules={[{ required: true, message: 'Nhập số lượng!' }]}
            initialValue={20}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Loại xe" name="vehicleType" rules={[{ required: true, message: 'Chọn loại xe đỗ!' }]}>
            <Select
              options={[
                { value: 0, label: 'Xe máy' },
                { value: 1, label: 'Ô tô' },
                { value: 2, label: 'Xe tải' }
              ]}
              style={{ borderRadius: 0 }}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setSBulkModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>Xác nhận tạo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Admin Slot Status Modal */}
      <Modal
        title={`Quản trị Slot đỗ xe: ${selectedSlotForAdmin?.slotCode}`}
        open={adminSlotModalOpen}
        onCancel={() => {
          setAdminSlotModalOpen(false);
          setSelectedSlotForAdmin(null);
        }}
        footer={null}
        destroyOnClose
        width={380}
      >
        {selectedSlotForAdmin && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '12px' }}>
              <div><strong>Mã số Slot:</strong> <code>{selectedSlotForAdmin.slotCode}</code></div>
              <div><strong>Loại xe:</strong> {getVehicleTypeIcon(selectedSlotForAdmin.vehicleType)} {getVehicleTypeName(selectedSlotForAdmin.vehicleType)}</div>
              <div><strong>Trạng thái hiện tại:</strong> {getSlotStatusTag(selectedSlotForAdmin.status)}</div>
            </div>

            <Text style={{ fontSize: '13px', color: 'var(--colors-ink-muted)' }}>
              Chọn thao tác quản lý bên dưới (Chỉ áp dụng cho các ô đỗ không có xe đang đỗ hoặc đặt trước):
            </Text>

            <Space direction="vertical" style={{ width: '100%' }}>
              {/* Edit Details Option (Only if not occupied or reserved) */}
              {(selectedSlotForAdmin.status === 0 || selectedSlotForAdmin.status === 3 || selectedSlotForAdmin.status === 4) && (
                <Button
                  block
                  icon={<Edit size={14} />}
                  onClick={() => handleOpenSlotEdit(selectedSlotForAdmin)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px', borderRadius: 0 }}
                >
                  Chỉnh sửa thông tin ô đỗ
                </Button>
              )}

              {/* Lock / Unlock Toggle */}
              {selectedSlotForAdmin.status === 4 ? (
                <Button 
                  block 
                  type="primary" 
                  onClick={() => handleToggleSlotStatus(selectedSlotForAdmin.slotId, 0)}
                  loading={submitLoading}
                >
                  Mở khóa ô đỗ xe (Cho phép gửi)
                </Button>
              ) : selectedSlotForAdmin.status === 0 ? (
                <Button 
                  block 
                  danger 
                  onClick={() => handleToggleSlotStatus(selectedSlotForAdmin.slotId, 4)}
                  loading={submitLoading}
                >
                  Khóa ô đỗ xe (Chặn gửi xe)
                </Button>
              ) : null}

              {/* Maintenance Toggle */}
              {selectedSlotForAdmin.status === 3 ? (
                <Button 
                  block 
                  type="primary"
                  style={{ backgroundColor: 'var(--colors-semantic-success)', borderColor: 'var(--colors-semantic-success)' }}
                  onClick={() => handleToggleSlotStatus(selectedSlotForAdmin.slotId, 0)}
                  loading={submitLoading}
                >
                  Hoàn tất bảo trì (Sẵn sàng đỗ)
                </Button>
              ) : selectedSlotForAdmin.status === 0 ? (
                <Button 
                  block 
                  style={{ backgroundColor: '#8c8c8c', color: '#ffffff', borderColor: '#8c8c8c' }}
                  onClick={() => handleToggleSlotStatus(selectedSlotForAdmin.slotId, 3)}
                  loading={submitLoading}
                >
                  Đưa vào bảo trì (Sửa chữa/Vệ sinh)
                </Button>
              ) : null}

              {/* If slot is occupied or reserved */}
              {(selectedSlotForAdmin.status === 1 || selectedSlotForAdmin.status === 2) && (
                <div style={{ color: 'var(--colors-semantic-error)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', marginTop: '8px' }}>
                  Không thể thay đổi trạng thái quản trị khi ô đỗ đang có xe hoạt động.
                </div>
              )}

              {/* Delete slot option (only if free) */}
              {selectedSlotForAdmin.status === 0 && (
                <Popconfirm
                  title="Bạn có chắc muốn xóa vĩnh viễn slot này?"
                  onConfirm={async () => {
                    await handleDeleteSlot(selectedSlotForAdmin.slotId);
                    setAdminSlotModalOpen(false);
                    setSelectedSlotForAdmin(null);
                  }}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button block danger type="dashed" style={{ marginTop: '16px' }} loading={submitLoading}>
                    Xóa vĩnh viễn slot này
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Space>
        )}
      </Modal>

      {/* Edit Slot Modal */}
      <Modal
        title={`Chỉnh sửa ô đỗ xe: ${selectedSlotForEdit?.slotCode}`}
        open={sEditModalOpen}
        onCancel={() => {
          setSEditModalOpen(false);
          setSelectedSlotForEdit(null);
        }}
        footer={null}
        destroyOnClose
        width={400}
      >
        <Form form={sEditForm} layout="vertical" onFinish={handleSlotEdit} requiredMark={false}>
          <Form.Item label="Mã Slot đỗ xe" name="slotCode" rules={[{ required: true, message: 'Nhập mã slot!' }]}>
            <Input placeholder="VD: A01" style={{ borderRadius: 0 }} />
          </Form.Item>
          <Form.Item label="Loại xe đỗ" name="vehicleType" rules={[{ required: true, message: 'Chọn loại xe đỗ!' }]}>
            <Select
              options={[
                { value: 0, label: 'Xe máy' },
                { value: 1, label: 'Ô tô' },
                { value: 2, label: 'Xe tải' }
              ]}
              style={{ borderRadius: 0 }}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setSEditModalOpen(false);
                setSelectedSlotForEdit(null);
              }} style={{ borderRadius: 0 }}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading} style={{ borderRadius: 0 }}>Lưu thay đổi</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
