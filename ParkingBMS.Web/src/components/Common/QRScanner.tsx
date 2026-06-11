import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button, Input, Space, Typography, Alert } from 'antd';
import jsQR from 'jsqr';
import { Camera, CameraOff, Clipboard } from 'lucide-react';

const { Text } = Typography;

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  open,
  onClose,
  onScanSuccess,
  title = 'Quét mã QR'
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  // --- Core scanner logic ---
  const stopCamera = useCallback(async () => {
    // Cancel animation frame first
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Detach video src safely
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (mountedRef.current) {
      setIsRunning(false);
    }
  }, []);

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !mountedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        onScanSuccess(code.data);
        stopCamera();
        onClose();
        return; // Don't schedule next frame
      }
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onScanSuccess, onClose, stopCamera]);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // prefer rear camera on mobile
      });

      if (!mountedRef.current) {
        // Component unmounted while waiting for camera — clean up immediately
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsRunning(true);
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setCameraError('Trình duyệt từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt, hoặc nhập mã thủ công bên dưới.');
      } else if (err?.name === 'NotFoundError') {
        setCameraError('Không tìm thấy thiết bị camera. Vui lòng nhập mã thủ công bên dưới.');
      } else {
        setCameraError(`Không thể mở camera: ${err?.message || 'Lỗi không xác định'}`);
      }
      setIsRunning(false);
    }
  }, [scanFrame]);

  // --- Lifecycle ---
  useEffect(() => {
    mountedRef.current = true;

    if (open) {
      setManualCode('');
      setCameraError(null);
      // Small delay so Modal finishes animating before we attach video
      const timer = setTimeout(() => {
        if (mountedRef.current) startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }

    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (!code) return;
    stopCamera();
    onScanSuccess(code);
    onClose();
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnHidden
      width={480}
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Camera viewport */}
        <div style={{ position: 'relative', width: '100%', background: '#161616', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Hidden canvas for jsQR processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {cameraError ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#fff' }}>
              <CameraOff size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            </div>
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
            />
          )}

          {!isRunning && !cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 8 }}>
              <Camera size={40} style={{ opacity: 0.6 }} />
              <Text style={{ color: '#aaa', fontSize: 13 }}>Đang khởi tạo camera...</Text>
            </div>
          )}

          {/* QR aiming box overlay */}
          {isRunning && (
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 200, height: 200,
              border: '2px solid #0f62fe',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {/* Camera error alert */}
        {cameraError && (
          <Alert
            message={cameraError}
            type="warning"
            showIcon
            style={{ borderRadius: 0 }}
          />
        )}

        {/* Manual fallback */}
        <div style={{ borderTop: '1px solid var(--colors-hairline)', paddingTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Không có camera? Nhập hoặc dán mã QR (UUID hoặc mã Booking) bên dưới:
          </Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="VD: d671fba2-a89e-4e4b..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onPressEnter={handleManualSubmit}
              prefix={<Clipboard size={16} style={{ color: 'var(--colors-ink-subtle)', marginRight: 8 }} />}
            />
            <Button type="primary" onClick={handleManualSubmit}>Xác nhận</Button>
          </Space.Compact>
        </div>
      </Space>
    </Modal>
  );
};
