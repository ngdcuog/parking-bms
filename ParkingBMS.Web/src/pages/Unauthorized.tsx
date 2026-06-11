import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Result
        status="403"
        title="403"
        subTitle={
          <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 300, fontSize: '16px', color: '#525252' }}>
            Bạn không có quyền truy cập vào chức năng này. Vui lòng liên hệ Admin hệ thống.
          </div>
        }
        icon={<ShieldAlert size={64} color="var(--colors-semantic-error)" style={{ margin: '0 auto 24px' }} />}
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Quay lại trang chủ
          </Button>
        }
        style={{ background: '#ffffff', border: '1px solid var(--colors-hairline)', padding: 48 }}
      />
    </div>
  );
};
