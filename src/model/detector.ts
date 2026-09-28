export interface Zone {
  id: string;
  name: string;
  description?: string;
}

export interface Room {
  id: string;
  zoneId: string;
  name: string;
  capacity?: number;
}

export interface UserProfile {
  id: string;
  code: string; // e.g. "HV-00123"
  fullName: string; // e.g. "Trần Văn Minh"
  avatarUri: string;
  photos?: string[]; // Array of up to PHOTO_CONFIG.MAX_PHOTOS_PER_USER photos
  zoneId: string;
  roomId: string;
  enrolledAt: string;
}

export type AttendanceStatus = 'present' | 'missing' | 'verify';

export interface AttendanceRecord {
  userId: string;
  status: AttendanceStatus;
  confidence: number; // percentage (0 - 100)
  timestamp: string;
  detectedImageUrl?: string;
}

export interface BoundingBox {
  x: number; // percentage 0-100 or px
  y: number;
  width: number;
  height: number;
  frameWidth?: number;
  frameHeight?: number;
}

export interface DetectionResult {
  userId: string;
  fullName: string;
  code: string;
  avatarUri: string;
  zoneName: string;
  roomName: string;
  confidence: number;
  timestamp: string;
  status: AttendanceStatus;
  boundingBox?: BoundingBox;
}

export interface AlertLog {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'warning' | 'info' | 'error';
}

export interface AttendanceSession {
  id: string;
  name: string; // Tên phiên do user đặt hoặc mặc định: Phiên HH:mm DD-MM-YYYY
  zoneId: string;
  zoneName: string;
  roomId: string;
  roomName: string;
  startTime: string;
  endTime?: string;
  createdAt: string;
  isActive: boolean;
  attendanceMap: Record<string, AttendanceRecord>;
  totalCount: number;
  presentCount: number;
  missingCount: number;
  verifyCount: number;
}

