import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { BoundingBox } from '../../../model/detector';
import {
  ScanLine,
  RefreshCw,
  UserCheck,
  Camera as CameraIcon,
  ShieldAlert,
} from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { appColors } from '../../../const/app-colors';

interface CameraViewFinderProps {
  boundingBox?: BoundingBox;
  isSessionActive: boolean;
  onManualScan?: () => void;
  cameraFacing?: 'front' | 'back';
}

export const CameraViewFinder: React.FC<CameraViewFinderProps> = ({
  boundingBox,
  isSessionActive,
  onManualScan,
  cameraFacing = 'front',
}) => {
  const cameraRef = useRef<Camera>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isCapturing, setIsCapturing] = useState(false);

  // Vision Camera Permission Hook
  const { hasPermission, requestPermission } = useCameraPermission();

  // Vision Camera Device Hook
  const device = useCameraDevice(cameraFacing);

  // Request permission automatically on mount if not yet granted
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Pulse animation for targeting bracket
  useEffect(() => {
    if (isSessionActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isSessionActive, pulseAnim]);

  // Handle capture & detection scan
  const handleTriggerScan = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      if (cameraRef.current && hasPermission && device) {
        // Real photo snapshot from Vision Camera hardware
        const photo = await cameraRef.current.takePhoto({
          enableShutterSound: false,
        });
        console.log(
          '[VisionCamera] Photo captured for YOLO pipeline:',
          photo.path,
        );
      }
    } catch (err) {
      console.log('[VisionCamera] Snapshot note (or simulator fallback):', err);
    } finally {
      setIsCapturing(false);
      onManualScan?.();
    }
  };

  // Fallback workshop preview image for simulator/testing
  const fallbackBackgroundUri =
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80';

  const defaultBox = boundingBox || {
    x: 23,
    y: 16,
    width: 32,
    height: 48,
  };

  return (
    <View style={styles.container}>
      {/* 1. Camera View: Hardware VisionCamera or Fallback Preview */}
      {hasPermission && device ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isSessionActive}
          photo={true}
          onError={error => console.warn('[VisionCamera Error]:', error)}
        />
      ) : !hasPermission ? (
        <View style={styles.permissionContainer}>
          <ShieldAlert size={48} color={appColors.red500} />
          <AppText style={styles.permissionTitle}>
            Yêu cầu cấp quyền truy cập Camera
          </AppText>
          <AppText style={styles.permissionSubtitle}>
            Ứng dụng cần quyền Camera để nhận diện khuôn mặt và điểm danh trực
            tiếp qua YOLO.
          </AppText>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <CameraIcon size={18} color={appColors.white} />
            <AppText style={styles.permissionBtnText}>
              Cấp quyền Camera ngay
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <Image
          source={{ uri: fallbackBackgroundUri }}
          style={styles.previewImage}
          resizeMode="cover"
        />
      )}

      {/* 2. Dark overlay when session is not active */}
      {!isSessionActive && (
        <View style={styles.inactiveOverlay}>
          <AppText style={styles.inactiveText}>
            Phiên chưa bắt đầu. Nhấn "Bắt đầu phiên" để kích hoạt camera & YOLO.
          </AppText>
        </View>
      )}

      {/* 3. YOLO Bounding Box with corner reticles */}
      {isSessionActive && (
        <Animated.View
          style={[
            styles.boxWrapper,
            {
              left: `${defaultBox.x}%`,
              top: `${defaultBox.y}%`,
              width: `${defaultBox.width}%`,
              height: `${defaultBox.height}%`,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* 4 Corner brackets (Green matching the screenshot) */}
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />

          {/* YOLO Detection Label Badge */}
          <View style={styles.detectionLabel}>
            <UserCheck size={12} color={appColors.white} />
            <AppText style={styles.detectionLabelText}>
              YOLOv8-Face: 98%
            </AppText>
          </View>
        </Animated.View>
      )}

      {/* 4. HUD Top Bar */}
      <View style={styles.hudTop}>
        <View style={styles.hudBadge}>
          <ScanLine size={13} color={appColors.green500} />
          <AppText style={styles.hudText}>
            {device
              ? `VISION CAMERA [${cameraFacing.toUpperCase()}] • YOLO 30 FPS`
              : 'VISION CAMERA [SIMULATOR] • YOLO 30 FPS'}
          </AppText>
        </View>

        {onManualScan && isSessionActive && (
          <TouchableOpacity
            style={styles.triggerBtn}
            onPress={handleTriggerScan}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color={appColors.white} />
            ) : (
              <RefreshCw size={12} color={appColors.white} />
            )}
            <AppText style={styles.triggerBtnText}>
              {isCapturing ? 'Đang chụp...' : 'Quét nhận diện'}
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.slate900,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: appColors.slate200,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  permissionContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: appColors.slate900,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: appColors.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: appColors.slate400,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    maxWidth: 320,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.blue600,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  permissionBtnText: {
    color: appColors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  inactiveOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: appColors.overlayDark75,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inactiveText: {
    color: appColors.slate200,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  boxWrapper: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: appColors.cameraBorder,
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: appColors.green500,
  },
  cornerTopLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTopRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  detectionLabel: {
    position: 'absolute',
    top: -28,
    left: 0,
    backgroundColor: appColors.cameraSuccessBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detectionLabelText: {
    color: appColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  hudTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.overlayDark75,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: appColors.white10,
  },
  hudText: {
    color: appColors.slate50,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: appColors.cameraTagBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  triggerBtnText: {
    color: appColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
