import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Select, Space, Card, Modal, Form, Switch, message, Typography, Tag, Progress } from 'antd';
import { api } from '../../services/api';
import { Plus, Search, Key, Edit, RefreshCw, Download } from 'lucide-react';

const { Title } = Typography;

interface UserSummary {
  userId: number;
  username: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'Staff' | 'ParkingUser';
  isActive: boolean;
  buildingId?: number;
  buildingName?: string;
}

// Password strength meter logic
const getPasswordStrength = (pass: string) => {
  if (!pass) return { score: 0, label: '', color: '#e0e0e0' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 2) return { score, label: 'Yếu', color: 'var(--colors-error)' };
  if (score <= 4) return { score, label: 'Trung bình', color: 'var(--colors-warning)' };
  return { score, label: 'Mạnh', color: 'var(--colors-success)' };
};

const PasswordStrengthBar: React.FC<{ password?: string }> = ({ password = '' }) => {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', color: 'var(--colors-ink-muted)' }}>Độ mạnh mật khẩu:</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color }}>{label}</span>
      </div>
      <Progress 
        percent={(score / 5) * 100} 
        strokeColor={color} 
        showInfo={false} 
        size="small" 
        style={{ margin: 0 }}
      />
      <span style={{ fontSize: '11px', color: 'var(--colors-ink-subtle)', display: 'block', marginTop: '4px', lineHeight: '1.4' }}>
        Gợi ý: Mật khẩu nên gồm ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.
      </span>
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<string | null>(null);

  const [buildings, setBuildings] = useState<any[]>([]);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetForm] = Form.useForm();

  const fetchBuildings = async () => {
    try {
      const response = await api.get('/buildings');
      setBuildings(response.data.data);
    } catch (e) {
      console.error('Không thể lấy danh sách tòa nhà', e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', {
        params: {
          search: search || undefined,
          role: roleFilter,
          isActive: statusFilter,
          page: currentPage,
          pageSize: pageSize
        }
      });
      const { items, totalCount } = response.data.data;
      setUsers(items);
      setTotalCount(totalCount);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBuildings();
  }, [currentPage, roleFilter, statusFilter]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter(undefined);
    setStatusFilter(undefined);
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users', {
        params: {
          search: search || undefined,
          role: roleFilter,
          isActive: statusFilter,
          page: 1,
          pageSize: 1000
        }
      });
      const allUsers = response.data.data.items;
      
      const headers = ['Mã ID', 'Tên đăng nhập', 'Họ và tên', 'Vai trò', 'Trạng thái'];
      const rows = allUsers.map((u: any) => [
        u.userId,
        u.username,
        u.fullName,
        u.role,
        u.isActive ? 'Đang hoạt động' : 'Bị khóa'
      ]);
      
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `danh_sach_tai_khoan_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Xuất file CSV thành công!');
    } catch (error) {
      message.error('Không thể xuất file CSV.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    setSubmitLoading(true);
    try {
      await api.post('/users', values);
      message.success('Tạo tài khoản mới thành công.');
      setCreateModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi tạo tài khoản.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenEdit = async (userId: number) => {
    setSelectedUserId(userId);
    try {
      const response = await api.get(`/users/${userId}`);
      const userDetails = response.data.data;
      setSelectedUserRole(userDetails.role);
      editForm.setFieldsValue({
        fullName: userDetails.fullName,
        email: userDetails.email,
        phone: userDetails.phone,
        isActive: userDetails.isActive,
        buildingId: userDetails.buildingId
      });
      setEditModalOpen(true);
    } catch (error: any) {
      message.error('Không thể lấy thông tin chi tiết người dùng.');
    }
  };

  const handleUpdate = async (values: any) => {
    if (!selectedUserId) return;
    setSubmitLoading(true);
    try {
      await api.put(`/users/${selectedUserId}`, values);
      message.success('Cập nhật tài khoản thành công.');
      setEditModalOpen(false);
      editForm.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi cập nhật tài khoản.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenReset = (userId: number) => {
    setSelectedUserId(userId);
    setResetModalOpen(true);
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedUserId) return;
    setSubmitLoading(true);
    try {
      await api.put(`/users/${selectedUserId}/reset-password`, {
        newPassword: values.password
      });
      message.success('Đặt lại mật khẩu thành công.');
      setResetModalOpen(false);
      resetForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi đặt lại mật khẩu.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRoleTagColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'red';
      case 'Manager': return 'blue';
      case 'Staff': return 'green';
      default: return 'orange';
    }
  };

  const columns = [
    {
      title: 'Mã ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 90,
      render: (id: number) => <code>#{id}</code>
    },
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      fontWeight: 'bold',
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={getRoleTagColor(role)}>{role}</Tag>
    },
    {
      title: 'Tòa nhà',
      dataIndex: 'buildingName',
      key: 'buildingName',
      render: (buildingName: string, record: UserSummary) => {
        if (record.role === 'Staff') {
          return buildingName ? <Tag color="geekblue">{buildingName}</Tag> : <Tag color="warning">Chưa phân công</Tag>;
        }
        return <Typography.Text type="secondary">—</Typography.Text>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'success' : 'error'}>
          {active ? 'Đang hoạt động' : 'Bị khóa'}
        </Tag>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 240,
      render: (_: any, record: UserSummary) => (
        <Space size="middle">
          <Button
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleOpenEdit(record.userId)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Chỉnh sửa
          </Button>
          <Button
            size="small"
            icon={<Key size={14} />}
            onClick={() => handleOpenReset(record.userId)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Mật khẩu
          </Button>
        </Space>
      )
    }
  ];

  const hasActiveFilters = search || roleFilter !== undefined || statusFilter !== undefined;

  const removeFilter = (filterType: 'search' | 'role' | 'status') => {
    if (filterType === 'search') setSearch('');
    if (filterType === 'role') setRoleFilter(undefined);
    if (filterType === 'status') setStatusFilter(undefined);
    setCurrentPage(1);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--colors-hairline)', paddingBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 300 }}>Quản lý tài khoản người dùng</Title>
          <span style={{ color: 'var(--colors-ink-muted)' }}>Xem, thêm mới, sửa đổi thông tin và khóa/mở khóa các tài khoản hệ thống.</span>
        </div>
        <Space>
          <Button
            type="default"
            icon={<Download size={16} />}
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            Xuất CSV
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px' }}
          >
            Thêm tài khoản mới
          </Button>
        </Space>
      </div>

      {/* Filters Card */}
      <Card style={{ backgroundColor: 'var(--colors-surface-1)', border: 'none' }}>
        <Space wrap size="middle">
          <Input
            placeholder="Tìm kiếm tài khoản, tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            prefix={<Search size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 4 }} />}
            style={{ width: '220px' }}
          />

          <Select
            placeholder="Chọn vai trò"
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            allowClear
            style={{ width: '160px' }}
            options={[
              { value: 0, label: 'Admin' },
              { value: 1, label: 'Manager' },
              { value: 2, label: 'Staff' },
              { value: 3, label: 'Parking User' }
            ]}
          />

          <Select
            placeholder="Trạng thái"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            allowClear
            style={{ width: '160px' }}
            options={[
              { value: true, label: 'Đang hoạt động' },
              { value: false, label: 'Đang bị khóa' }
            ]}
          />

          <Button type="primary" onClick={handleSearch}>Tìm</Button>
          <Button icon={<RefreshCw size={14} />} onClick={handleResetFilters}>Làm mới</Button>
        </Space>
      </Card>

      {/* Smart Filter Chips */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '-8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--colors-ink-muted)' }}>Bộ lọc đang áp dụng:</span>
          {search && (
            <Tag closable onClose={() => removeFilter('search')} color="blue" style={{ borderRadius: 0 }}>
              Tìm kiếm: "{search}"
            </Tag>
          )}
          {roleFilter !== undefined && (
            <Tag closable onClose={() => removeFilter('role')} color="blue" style={{ borderRadius: 0 }}>
              Vai trò: {['Admin', 'Manager', 'Staff', 'Parking User'][roleFilter]}
            </Tag>
          )}
          {statusFilter !== undefined && (
            <Tag closable onClose={() => removeFilter('status')} color="blue" style={{ borderRadius: 0 }}>
              Trạng thái: {statusFilter ? 'Đang hoạt động' : 'Bị khóa'}
            </Tag>
          )}
          <Button type="link" size="small" onClick={handleResetFilters} style={{ padding: 0, height: 'auto', fontSize: '13px' }}>
            Xóa tất cả bộ lọc
          </Button>
        </div>
      )}

      {/* Users Table */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="userId"
        loading={loading}
        pagination={{
          current: currentPage,
          total: totalCount,
          pageSize: pageSize,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false
        }}
      />

      {/* Create Account Modal */}
      <Modal
        title="Tạo tài khoản hệ thống mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
          <Form.Item
            label="Tên đăng nhập (Username)"
            name="username"
            rules={[
              { required: true, message: 'Nhập tên đăng nhập!' },
              { min: 3, message: 'Tên đăng nhập tối thiểu 3 ký tự!' }
            ]}
          >
            <Input placeholder="VD: staff_an" />
          </Form.Item>
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: 'Nhập họ và tên!' }]}
          >
            <Input placeholder="VD: Nguyễn Văn An" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu ban đầu"
            name="password"
            rules={[
              { required: true, message: 'Nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu ban đầu" />
          </Form.Item>

          {/* Password strength assessment */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.password !== curr.password}>
            {({ getFieldValue }) => (
              <PasswordStrengthBar password={getFieldValue('password')} />
            )}
          </Form.Item>

          <Form.Item
            label="Địa chỉ Email"
            name="email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input placeholder="staff@example.com" />
          </Form.Item>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { pattern: /^0[3|5|7|8|9][0-9]{8}$/, message: 'Số điện thoại VN phải gồm 10 số (bắt đầu bằng số 0)!' }
            ]}
          >
            <Input placeholder="VD: 0912345678" />
          </Form.Item>
          <Form.Item
            label="Vai trò (Role)"
            name="role"
            rules={[{ required: true, message: 'Chọn vai trò!' }]}
            initialValue={2}
          >
            <Select
              options={[
                { value: 0, label: 'Admin' },
                { value: 1, label: 'Manager' },
                { value: 2, label: 'Staff' },
                { value: 3, label: 'Parking User' }
              ]}
            />
          </Form.Item>

          {/* Building assignment for Staff */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.role !== curr.role}>
            {({ getFieldValue }) => {
              const roleVal = getFieldValue('role');
              if (roleVal === 2) {
                return (
                  <Form.Item
                    label="Tòa nhà làm việc"
                    name="buildingId"
                    rules={[{ required: true, message: 'Vui lòng chọn tòa nhà để phân công!' }]}
                  >
                    <Select
                      placeholder="Chọn tòa nhà..."
                      options={buildings.map((b) => ({ value: b.buildingId, label: b.buildingName }))}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>
                Tạo tài khoản
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Account Modal */}
      <Modal
        title="Chỉnh sửa tài khoản"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} requiredMark={false}>
          {selectedUserRole === 'Admin' && (
            <div style={{ marginBottom: '16px', border: '1px solid var(--colors-warning)', backgroundColor: '#fffbe6', padding: '12px 16px', fontSize: '13px' }}>
              <span style={{ color: '#d46b08', fontWeight: 600 }}>⚠️ Bảo mật:</span> Không thể khóa tài khoản thuộc nhóm vai trò quản trị hệ thống (Admin).
            </div>
          )}

          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, message: 'Nhập họ và tên!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Địa chỉ Email"
            name="email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { pattern: /^0[3|5|7|8|9][0-9]{8}$/, message: 'Số điện thoại VN phải gồm 10 số (bắt đầu bằng số 0)!' }
            ]}
          >
            <Input placeholder="VD: 0912345678" />
          </Form.Item>
          <Form.Item
            label="Trạng thái tài khoản"
            name="isActive"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Hoạt động" 
              unCheckedChildren="Khóa" 
              disabled={selectedUserRole === 'Admin'}
            />
          </Form.Item>

          {/* Building assignment for Staff in Edit Modal */}
          {selectedUserRole === 'Staff' && (
            <Form.Item
              label="Tòa nhà làm việc"
              name="buildingId"
              rules={[{ required: true, message: 'Vui lòng chọn tòa nhà để phân công!' }]}
            >
              <Select
                placeholder="Chọn tòa nhà..."
                options={buildings.map((b) => ({ value: b.buildingId, label: b.buildingName }))}
              />
            </Form.Item>
          )}
          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setEditModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>
                Lưu thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title="Đặt lại mật khẩu người dùng"
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical" onFinish={handleResetPassword} requiredMark={false}>
          <Form.Item
            label="Mật khẩu mới"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' }, 
              { min: 6, message: 'Tối thiểu 6 ký tự!' }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          {/* Password strength assessment */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.password !== curr.password}>
            {({ getFieldValue }) => (
              <PasswordStrengthBar password={getFieldValue('password')} />
            )}
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới để xác nhận" />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginTop: '24px', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setResetModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>
                Cập nhật mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};
