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

export type UserConditionStatus =
  | 'normal'
  | 'leave'
  | 'medical'
  | 'warning'
  | 'suspended';

export interface UserStatusLog {
  id: string;
  timestamp: string;
  oldStatus?: string;
  newStatus: string;
  note: string;
  updatedBy: string;
}

export interface UserProfile {
  id: string;
  code: string; // e.g. "AA-BB-0001"
  fullName: string;
  dateOfBirth?: string; // REQUIRED on create: "DD/MM/YYYY" or "YYYY-MM-DD"
  gender?: string; // REQUIRED on create: "Nam" | "Nữ" | "Khác"
  idCardNumber?: string; // REQUIRED on create
  idCardStatus?: string; // "Đã có" | "Mất" | "Chưa làm" | "Không"
  age?: number;
  avatarUri: string;
  photos?: string[]; // Array of up to PHOTO_CONFIG.MAX_PHOTOS_PER_USER photos
  embeddings?: number[][]; // Server pre-computed 512-dim biometric vectors
  zoneId: string;
  roomId: string;
  enrolledAt: string;
  phoneNumber?: string;
  conditionStatus?: UserConditionStatus | string;
  conditionNote?: string;

  // --- Logic Khách thăm gặp (isVisitor) ---
  isVisitor?: boolean;
  visitedProfileId?: string | null;
  visitedProfile?: {
    id: string;
    fullName: string;
    code: string;
    roomName?: string;
  } | null;

  // --- Nơi thường trú ---
  permanentProvince?: string;
  permanentDistrict?: string;
  permanentWard?: string;
  permanentAddress?: string;

  // --- Quyết định cai nghiện ---
  decisionType?: string; // "Bắt buộc" | "Tự nguyện"
  decisionNumber?: string;
  decisionIssuedDate?: string;
  decisionIssuedUnit?: string;
  decisionExecDate?: string;
  admissionDate?: string;
  detoxDuration?: string;
  reducedDuration?: string;
  reintegrationDate?: string;

  // --- Thông tin xác định dương tính ma túy ---
  drugType?: string;
  drugTestDate?: string;
  drugTestUnit?: string;
  drugUsageForm?: string;
  drugUsageReason?: string;

  // --- Phiếu xác định tình trạng nghiện ---
  addictionReportNumber?: string;
  addictionReportDate?: string;
  addictionReportUnit?: string;

  // --- Nhân thân & Gia đình ---
  admissionCount?: number;
  educationLevel?: string;
  occupation?: string;
  recordNumber?: string;
  criminalRecord?: string;
  fatherName?: string;
  motherName?: string;
  ethnicity?: string;
  religion?: string;

  // --- Quản lý khu & cán bộ ---
  zoneManagerName?: string;

  statusLogs?: UserStatusLog[];
}

export type AttendanceStatus = 'present' | 'missing' | 'verify';

export interface AttendanceRecord {
  userId: string;
  status: AttendanceStatus;
  confidence: number; // percentage (0 - 100)
  timestamp: string;
  detectedImageUrl?: string;
  avatarUri?: string;
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
  hasUnverifiedStranger?: boolean;
  additionalVerified?: DetectionResult[];
  isVisitor?: boolean;
  visitedProfileName?: string;
  qualityWarning?: string;
}

export interface AlertLog {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'warning' | 'info' | 'error';
}

export type ScanMode = 'all' | 'zone' | 'room';
export type ScanDirection = 'in' | 'out'; // Chốt quét: vào / ra

export interface ScanEvent {
  id: string;
  timestamp: string; // "HH:mm:ss"
  epochTime: number; // Date.now()
  confidence: number;
  avatarUri?: string;
  capturedAvatarUri?: string;
  scanMode: ScanMode;
  direction?: ScanDirection; // thiếu = 'in' (dữ liệu cũ)
  isVisitor?: boolean;
  visitedProfileName?: string;
}

export interface ScanHistoryItem {
  id: string; // userId for registered, or unique id for unverified
  userId?: string;
  fullName: string;
  code?: string;
  avatarUri?: string;
  capturedAvatarUri?: string;
  roomId?: string;
  roomName?: string;
  zoneId?: string;
  zoneName?: string;
  status: AttendanceStatus; // 'present' = Đã xác minh / Vào cơ sở, 'verify' = Chưa xác minh
  confidence: number;
  firstInTime?: string; // HH:mm:ss (Thời gian của lượt VÀO sớm nhất)
  firstInEpoch?: number;
  lastOutTime?: string; // HH:mm:ss (Thời gian của lượt RA muộn nhất)
  lastOutEpoch?: number;
  lastDirection?: ScanDirection; // Hướng quét gần nhất: 'in' | 'out'
  inCount?: number; // Số lượt vào
  outCount?: number; // Số lượt ra
  scanCount: number; // Tổng số lượt quét phát hiện trong phiên
  history: ScanEvent[]; // Danh sách các lần quét
  lastScanTime: string;
  isFacilityEntry?: boolean; // true khi quét ở chế độ All (xác nhận vào cơ sở)
  isVisitor?: boolean;
  visitedProfileName?: string;
}

export interface AttendanceSession {
  id: string;
  name: string; // Tên phiên do user đặt hoặc mặc định: Phiên HH:mm DD-MM-YYYY
  zoneId?: string;
  zoneName: string;
  roomId?: string;
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
  scanMode?: ScanMode;
  durationSeconds?: number;
  scanHistory?: ScanHistoryItem[];
  totalScansCount?: number;
}


