import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { BoundingBox, DetectionResult } from '../../../model/detector';
import {
  ScanLine,
  UserCheck,
  Camera as CameraIcon,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { appColors } from '../../../const/app-colors';

export interface CameraViewFinderRef {
  captureFrame: () => Promise<string | null>;
}

export interface CameraViewFinderProps {
  boundingBox?: BoundingBox | null;
  detection?: DetectionResult | null;
  isSessionActive: boolean;
  onManualScan?: (photoPath?: string) => void;
  cameraFacing?: 'front' | 'back';
  isTabFocused?: boolean;
}

export const CameraViewFinder = forwardRef<
  CameraViewFinderRef,
  CameraViewFinderProps
>(
  (
    {
      boundingBox,
      detection,
      isSessionActive,
      cameraFacing = 'front',
      isTabFocused = true,
    },
    ref,
  ) => {
    const cameraRef = useRef<Camera>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [cameraError, setCameraError] = useState(false);
    const [containerLayout, setContainerLayout] = useState<{
      width: number;
      height: number;
    }>({ width: 0, height: 0 });

    // Smooth Spring Physics Tracking for Bounding Box
    const animLeft = useRef(new Animated.Value(0)).current;
    const animTop = useRef(new Animated.Value(0)).current;
    const animWidth = useRef(new Animated.Value(0)).current;
    const animHeight = useRef(new Animated.Value(0)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;
    const animScale = useRef(new Animated.Value(0.92)).current;
    const scanLineAnim = useRef(new Animated.Value(0)).current;

    const isFirstDetection = useRef(true);
    const prevCoordsRef = useRef<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);
    const [isBoxMounted, setIsBoxMounted] = useState(false);

    // Vision Camera Permission Hook
    const { hasPermission, requestPermission } = useCameraPermission();

    // Vision Camera Device Hook
    const device = useCameraDevice(cameraFacing);

    // Expose captureFrame to parent via ref
    useImperativeHandle(ref, () => ({
      captureFrame: async (): Promise<string | null> => {
        if (cameraRef.current && hasPermission && device) {
          try {
            const photo = await cameraRef.current.takePhoto({
              enableShutterSound: false,
            });
            return photo.path;
          } catch (err) {
            console.warn('[VisionCamera] captureFrame error:', err);
          }
        }
        return null;
      },
    }));

    // Request permission automatically on mount if not yet granted
    useEffect(() => {
      if (!hasPermission) {
        requestPermission();
      }
    }, [hasPermission, requestPermission]);

    // Pulse animation for targeting bracket (useNativeDriver: false to match layout animations)
    useEffect(() => {
      let pulseLoop: Animated.CompositeAnimation | null = null;
      if (isSessionActive) {
        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.04,
              duration: 850,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 850,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
        );
        pulseLoop.start();
      }
      return () => {
        if (pulseLoop) pulseLoop.stop();
      };
    }, [isSessionActive, pulseAnim]);

    // Fallback workshop preview image for simulator/testing
    const fallbackBackgroundUri =
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1000&auto=format&fit=crop&q=80';

    const isVerified = detection?.status === 'present';
    const hasDetectedFace = Boolean(
      boundingBox && boundingBox.width > 0 && boundingBox.height > 0,
    );

    // Laser scan line looping animation
    useEffect(() => {
      let scanAnimation: Animated.CompositeAnimation | null = null;
      if (isSessionActive) {
        scanAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(scanLineAnim, {
              toValue: 1,
              duration: 1400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(scanLineAnim, {
              toValue: 0,
              duration: 1400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
        );
        scanAnimation.start();
      }
      return () => {
        if (scanAnimation) scanAnimation.stop();
      };
    }, [isSessionActive, scanLineAnim]);

    // Compute target bounding box coordinates mapped to preview viewport
    const targetCoords = React.useMemo<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(() => {
      if (
        !boundingBox ||
        typeof boundingBox.x !== 'number' ||
        isNaN(boundingBox.x) ||
        typeof boundingBox.y !== 'number' ||
        isNaN(boundingBox.y) ||
        typeof boundingBox.width !== 'number' ||
        isNaN(boundingBox.width) ||
        typeof boundingBox.height !== 'number' ||
        isNaN(boundingBox.height)
      ) {
        return null;
      }
      const isFront = cameraFacing === 'front';

      const Wc =
        containerLayout.width > 0 && isFinite(containerLayout.width)
          ? containerLayout.width
          : 360;
      const Hc =
        containerLayout.height > 0 && isFinite(containerLayout.height)
          ? containerLayout.height
          : 480;

      // Real camera frame dimensions from YOLO detector
      const Wf =
        boundingBox.frameWidth &&
        boundingBox.frameWidth > 0 &&
        isFinite(boundingBox.frameWidth)
          ? boundingBox.frameWidth
          : Wc;
      const Hf =
        boundingBox.frameHeight &&
        boundingBox.frameHeight > 0 &&
        isFinite(boundingBox.frameHeight)
          ? boundingBox.frameHeight
          : Hc;

      // VisionCamera preview uses resizeMode="cover" (Aspect Fill centered)
      const scale = Math.max(Wc / Wf, Hc / Hf);
      if (!isFinite(scale) || scale <= 0) return null;

      const renderedW = Wf * scale;
      const renderedH = Hf * scale;
      const offsetX = (Wc - renderedW) / 2;
      const offsetY = (Hc - renderedH) / 2;

      const normX = boundingBox.x / 100;
      const normY = boundingBox.y / 100;
      const normW = boundingBox.width / 100;
      const normH = boundingBox.height / 100;

      // When using front camera, preview is mirrored horizontally
      const faceX = isFront
        ? (1 - normX - normW) * renderedW
        : normX * renderedW;
      const faceY = normY * renderedH;
      const faceW = normW * renderedW;
      const faceH = normH * renderedH;

      const left = Math.max(2, Math.min(Wc - 30, offsetX + faceX));
      const top = Math.max(2, Math.min(Hc - 30, offsetY + faceY));
      const width = Math.max(24, Math.min(Wc - left - 2, faceW));
      const height = Math.max(24, Math.min(Hc - top - 2, faceH));

      if (
        !isFinite(left) ||
        !isFinite(top) ||
        !isFinite(width) ||
        !isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return null;
      }

      // Deadband jitter filter: ignore micro-tremors (< 3.5px) when person holds still
      const prev = prevCoordsRef.current;
      if (
        prev &&
        Math.abs(left - prev.left) < 3.5 &&
        Math.abs(top - prev.top) < 3.5 &&
        Math.abs(width - prev.width) < 4.0 &&
        Math.abs(height - prev.height) < 4.0
      ) {
        return prev;
      }

      const next = { left, top, width, height };
      prevCoordsRef.current = next;
      return next;
    }, [boundingBox, cameraFacing, containerLayout]);

    // Butter-smooth Glide Tracking & Fade Transitions
    useEffect(() => {
      if (hasDetectedFace && targetCoords) {
        setIsBoxMounted(true);

        if (isFirstDetection.current) {
          animLeft.setValue(targetCoords.left);
          animTop.setValue(targetCoords.top);
          animWidth.setValue(targetCoords.width);
          animHeight.setValue(targetCoords.height);
          isFirstDetection.current = false;
        } else {
          // Smooth glide with Animated.timing for predictable, butter-smooth tracking without jerk
          Animated.parallel([
            Animated.timing(animLeft, {
              toValue: targetCoords.left,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(animTop, {
              toValue: targetCoords.top,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(animWidth, {
              toValue: targetCoords.width,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(animHeight, {
              toValue: targetCoords.height,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ]).start();
        }

        // Smooth fade-in & scale up
        Animated.parallel([
          Animated.timing(animOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: false,
          }),
          Animated.timing(animScale, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(animOpacity, {
            toValue: 0,
            duration: 280,
            useNativeDriver: false,
          }),
          Animated.timing(animScale, {
            toValue: 0.95,
            duration: 280,
            useNativeDriver: false,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            setIsBoxMounted(false);
            isFirstDetection.current = true;
            prevCoordsRef.current = null;
          }
        });
      }
    }, [
      hasDetectedFace,
      targetCoords,
      animLeft,
      animTop,
      animWidth,
      animHeight,
      animOpacity,
      animScale,
    ]);

    return (
      <View
        style={styles.container}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setContainerLayout({ width, height });
          }
        }}
      >
        {/* 1. Camera View: Hardware VisionCamera or Fallback Preview */}
        {hasPermission && device && !cameraError ? (
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isSessionActive && isTabFocused && !cameraError}
            photo={true}
            outputOrientation="preview"
            onError={error => {
              console.warn('[VisionCamera Error]:', error);
              setCameraError(true);
            }}
          />
        ) : !hasPermission ? (
          <View style={styles.permissionContainer}>
            <ShieldAlert size={48} color={appColors.red500} />
            <AppText style={styles.permissionTitle}>
              Yêu cầu cấp quyền truy cập Camera
            </AppText>
            <AppText style={styles.permissionSubtitle}>
              Ứng dụng cần quyền Camera để nhận diện khuôn mặt và điểm danh trực
              tiếp.
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
              Phiên chưa bắt đầu. Nhấn "Bắt đầu phiên" để kích hoạt camera & tự
              động quét.
            </AppText>
          </View>
        )}

        {/* 3. YOLO Bounding Box: FLUID SPRING TRACKING & LASER SCAN OVERLAY */}
        {isSessionActive && isBoxMounted && (
          <Animated.View
            style={[
              styles.boxWrapper,
              !isVerified && styles.boxWrapperWarning,
              {
                left: animLeft,
                top: animTop,
                width: animWidth,
                height: animHeight,
                opacity: animOpacity,
                transform: [{ scale: Animated.multiply(animScale, pulseAnim) }],
              },
            ]}
          >
            {/* Sci-Fi Laser Scan Line */}
            <Animated.View
              style={[
                styles.scanLine,
                !isVerified && styles.scanLineWarning,
                {
                  top: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['5%', '92%'],
                  }),
                },
              ]}
            />
            {/* 4 Corner brackets (Green if verified, Orange if unverified) */}
            <View
              style={[
                styles.corner,
                styles.cornerTopLeft,
                !isVerified && styles.cornerWarning,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerTopRight,
                !isVerified && styles.cornerWarning,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerBottomLeft,
                !isVerified && styles.cornerWarning,
              ]}
            />
            <View
              style={[
                styles.corner,
                styles.cornerBottomRight,
                !isVerified && styles.cornerWarning,
              ]}
            />

            {/* YOLO Detection Label Badge with real profile or verification status */}
            <View
              style={[
                styles.detectionLabel,
                !isVerified && styles.detectionLabelWarning,
                targetCoords && targetCoords.top < 34
                  ? styles.detectionLabelBottom
                  : styles.detectionLabelTop,
              ]}
            >
              {isVerified ? (
                <UserCheck size={12} color={appColors.white} />
              ) : (
                <AlertTriangle size={12} color={appColors.white} />
              )}
              <AppText style={styles.detectionLabelText} numberOfLines={1}>
                {detection
                  ? `${detection.fullName} (${detection.confidence}%)`
                  : 'Phát hiện mặt'}
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
                ? `VISION CAMERA [${cameraFacing.toUpperCase()}] • YOLO AI`
                : 'VISION CAMERA [SIMULATOR] • YOLO AI'}
            </AppText>
          </View>

          {/* AI Auto-Scan Live Indicator */}
          {isSessionActive && (
            <View style={styles.autoScanBadge}>
              <View style={styles.autoScanDot} />
              <AppText style={styles.autoScanText}>AI AUTO-SCAN</AppText>
            </View>
          )}
        </View>
      </View>
    );
  },
);

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
    borderColor: 'rgba(34, 197, 94, 0.85)',
    borderRadius: 18,
    zIndex: 20,
    elevation: 10,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  boxWrapperWarning: {
    borderColor: 'rgba(234, 88, 12, 0.9)',
    shadowColor: '#f97316',
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 2,
  },
  scanLineWarning: {
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: appColors.green500,
    zIndex: 21,
  },
  cornerWarning: {
    borderColor: appColors.amber500,
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
    left: 0,
    backgroundColor: appColors.cameraSuccessBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 240,
    zIndex: 22,
    elevation: 12,
  },
  detectionLabelTop: {
    top: -30,
  },
  detectionLabelBottom: {
    bottom: -32,
  },
  detectionLabelWarning: {
    backgroundColor: appColors.amber600,
  },
  detectionLabelText: {
    color: appColors.white,
    fontSize: 12,
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
  autoScanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  autoScanDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: appColors.white,
  },
  autoScanText: {
    color: appColors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
