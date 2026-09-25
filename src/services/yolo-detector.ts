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
  public static enrollProfile(profile: UserProfile): void {
    TfliteYoloService.enrollProfile(profile);
  }

  /**
   * Process a captured frame or detection event against the enrolled profiles of the active room.
   */
  public static matchDetectedFace(
    detectedBox: BoundingBox,
    roomProfiles: UserProfile[],
    targetUser?: UserProfile,
  ): DetectionResult | null {
    return TfliteYoloService.matchFaceInRoom(
      detectedBox,
      roomProfiles,
      targetUser,
    );
  }

  /**
   * Generates a sample YOLO bounding box around the detected person's head/face
   */
  public static generateYoloBoundingBox(): BoundingBox {
    return TfliteYoloService.generateBoundingBox();
  }
}
