import { DetectionResult, UserProfile, BoundingBox } from '../model/detector';
import { TfliteYoloService } from './tflite-yolo-service';

/**
 * YOLO & Face Recognition Service
 * Handles face/person detection using YOLO pipeline, extracting bounding boxes,
 * and matching against enrolled user profiles in the active room.
 */
export class YoloDetectorService {
  /**
   * Initializes on-device YOLO and MobileFaceNet models
   */
  public static async initialize(): Promise<boolean> {
    return TfliteYoloService.initialize();
  }

  /**
   * Enroll a profile into the face recognition feature embedding cache
   */
  public static async enrollProfile(profile: UserProfile): Promise<void> {
    await TfliteYoloService.enrollProfile(profile);
  }

  /**
   * Process a captured real photo from camera through real YOLOv8 and MobileFaceNet pipeline
   */
  public static async processCapturedFrame(
    photoPath: string,
    roomProfiles: UserProfile[],
    isFrontCamera?: boolean,
  ): Promise<DetectionResult | null> {
    return TfliteYoloService.processCapturedFrame(
      photoPath,
      roomProfiles,
      isFrontCamera,
    );
  }

  /**
   * Pre-loads and extracts face embeddings for all profiles in the room in background
   */
  public static async warmupRoomEmbeddings(
    roomProfiles: UserProfile[],
  ): Promise<void> {
    await TfliteYoloService.warmupRoomEmbeddings(roomProfiles);
  }

  /**
   * Fallback simulator scan when no hardware camera device exists (debug only)
   */
  public static simulateScanDetection(
    roomProfiles: UserProfile[],
  ): DetectionResult | null {
    if (__DEV__) {
      return TfliteYoloService.simulateScanDetection(roomProfiles);
    }
    return null;
  }

  /**
   * Process a captured frame or detection event against the enrolled profiles of the active room.
   */
  public static async matchDetectedFace(
    detectedBox: BoundingBox,
    roomProfiles: UserProfile[],
    targetUser?: UserProfile,
    photoPath?: string,
    isFrontCamera?: boolean,
  ): Promise<DetectionResult | null> {
    if (!photoPath) return null;
    return TfliteYoloService.matchFaceInRoom(
      detectedBox,
      roomProfiles,
      targetUser,
      photoPath,
      isFrontCamera,
    );
  }

  /**
   * Generates a sample YOLO bounding box around the detected person's head/face
   */
  public static generateYoloBoundingBox(): BoundingBox {
    return TfliteYoloService.generateBoundingBox();
  }

  /**
   * Selects which biometric feature extractor to use: 'mobilefacenet' or 'ghostfacenet'
   */
  public static async setBiometricModel(
    type: 'mobilefacenet' | 'ghostfacenet',
  ): Promise<void> {
    await TfliteYoloService.getInstance().setBiometricModel(type);
  }

  /**
   * Returns currently active biometric model name
   */
  public static getBiometricModel(): 'mobilefacenet' | 'ghostfacenet' {
    return TfliteYoloService.getInstance().biometricModelType;
  }

  /**
   * Clears session stranger embeddings cache
   */
  public static clearStrangerCache(): void {
    TfliteYoloService.clearStrangerCache();
  }

  /**
   * Removes a specific stranger embedding from session cache
   */
  public static removeStranger(strangerId: string): void {
    TfliteYoloService.removeStranger(strangerId);
  }
}
