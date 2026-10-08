import type { TensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';
import { loadImage, type Image } from 'react-native-nitro-image';
import dayjs from 'dayjs';
import { BoundingBox, DetectionResult, UserProfile } from '../model/detector';
import { createMMKV } from 'react-native-mmkv';
import { appAiModel } from '../const/app-ai-model';
import { appUtils } from '../utils';
import { Platform } from 'react-native';

// Persistent MMKV storage for pre-computed 512-d biometric embeddings
const faceEmbeddingStorage = createMMKV({ id: 'face-embeddings-cache-v9' });

export interface CachedProfileEmbedding {
  userId: string;
  fullName: string;
  code: string;
  avatarUri: string;
  zoneId: string;
  roomId: string;
  embeddings: Float32Array[]; // Multi-photo 512-dim L2-normalized MobileFaceNet vectors
  signature?: string; // Fingerprint of profile photo URLs to auto-detect changes from CMS
}

export interface StrangerRecord {
  id: string;
  sequence: number;
  code: string;
  fullName: string;
  embeddings: Float32Array[];
  avatarUri: string;
  firstSeen: number;
  lastSeen: number;
}

export interface YoloFaceDetection {
  boundingBox: BoundingBox;
  confidence: number;
  cropBox: { x1: number; y1: number; x2: number; y2: number };
  avatarCropBox: { x1: number; y1: number; x2: number; y2: number };
  rollDegrees?: number;
  qualityWarning?: string;
}

/* eslint-disable no-bitwise */
/**
 * Converts an ArrayBuffer to a base64 string safely without stack overflows
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 0x8000;
  let index = 0;
  const length = bytes.length;
  let binary = '';
  while (index < length) {
    const slice = bytes.subarray(index, Math.min(index + CHUNK_SIZE, length));
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
    index += CHUNK_SIZE;
  }
  const globalObj =
    typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { btoa?: (s: string) => string; atob?: (s: string) => string })
      : {};
  if (typeof globalObj.btoa === 'function') {
    return globalObj.btoa(binary);
  }
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < length ? bytes[i + 1] : 0;
    const b2 = i + 2 < length ? bytes[i + 2] : 0;
    base64 += chars[b0 >> 2];
    base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < length ? chars[b2 & 63] : '=';
  }
  return base64;
}

/**
 * Converts a base64 string (or data URI) to an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;
  const globalObj =
    typeof globalThis !== 'undefined'
      ? (globalThis as unknown as { btoa?: (s: string) => string; atob?: (s: string) => string })
      : {};
  if (typeof globalObj.atob === 'function') {
    const binary = globalObj.atob(base64Clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }
  let len = base64Clean.length * 0.75;
  if (base64Clean.endsWith('==')) len -= 2;
  else if (base64Clean.endsWith('=')) len -= 1;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  let p = 0;
  for (let i = 0; i < base64Clean.length; i += 4) {
    const c0 = lookup[base64Clean.charCodeAt(i)];
    const c1 = lookup[base64Clean.charCodeAt(i + 1)];
    const c2 = lookup[base64Clean.charCodeAt(i + 2)];
    const c3 = lookup[base64Clean.charCodeAt(i + 3)];
    bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (base64Clean[i + 2] !== '=') bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (base64Clean[i + 3] !== '=') bytes[p++] = ((c2 & 3) << 6) | (c3 & 63);
  }
  return buffer;
}
/* eslint-enable no-bitwise */

/**
 * Accurately extracts R, G, B components [0..255] for a pixel index `i`
 * supporting all Nitro Image PixelFormats across iOS and Android:
 * - 'BGRA', 'BGRX'
 * - 'ABGR', 'XBGR' (Standard on iOS ARM64 Little-Endian)
 * - 'ARGB', 'XRGB'
 * - 'RGB'
 * - 'BGR'
 * - 'RGBA', 'RGBX'
 */
export function extractRGB(
  u8: Uint8Array,
  i: number,
  pixelFormat?: string,
): { r: number; g: number; b: number } {
  const fmt = (pixelFormat || 'RGBA').toUpperCase();
  if (fmt === 'BGRA' || fmt === 'BGRX') {
    return { r: u8[i * 4 + 2], g: u8[i * 4 + 1], b: u8[i * 4 + 0] };
  } else if (fmt === 'ABGR' || fmt === 'XBGR') {
    return { r: u8[i * 4 + 3], g: u8[i * 4 + 2], b: u8[i * 4 + 1] };
  } else if (fmt === 'ARGB' || fmt === 'XRGB') {
    return { r: u8[i * 4 + 1], g: u8[i * 4 + 2], b: u8[i * 4 + 3] };
  } else if (fmt === 'RGB') {
    return { r: u8[i * 3 + 0], g: u8[i * 3 + 1], b: u8[i * 3 + 2] };
  } else if (fmt === 'BGR') {
    return { r: u8[i * 3 + 2], g: u8[i * 3 + 1], b: u8[i * 3 + 0] };
  } else {
    // RGBA / RGBX or default fallback
    return { r: u8[i * 4 + 0], g: u8[i * 4 + 1], b: u8[i * 4 + 2] };
  }
}

export class TfliteYoloService {
  private static instance: TfliteYoloService | null = null;
  private static fastTfliteModule:
    | typeof import('react-native-fast-tflite')
    | null = null;

  public faceDetectorModel: TensorflowModel | null = null;
  public faceRecognitionModel: TensorflowModel | null = null;
  public biometricModelType: 'mobilefacenet' | 'ghostfacenet' = 'mobilefacenet';
  public isInitialized = false;
  public lastCalculatedSharpness = 100;
  private initPromise: Promise<boolean> | null = null;
  private isProcessingFrame = false;

  // In-memory cache of enrolled user face embeddings (512-d Float32Array)
  private profileEmbeddingsCache: Map<string, CachedProfileEmbedding> =
    new Map();

  // In-memory session cache of unidentified strangers to cluster repeat detections
  private strangerEmbeddingsCache: Map<string, StrangerRecord> = new Map();
  private strangerSequenceCounter = 0;

  // Zero-allocation buffer pool for YOLO & FaceNet tensors (eliminates ~50MB/s garbage collection churn)
  private readonly yoloTensorBuffer: Float32Array = new Float32Array(3 * 640 * 640);
  private readonly faceNetTensorBuffer: Float32Array = new Float32Array(3 * 112 * 112);

  constructor() {
    this.initModels();
  }

  public static getInstance(): TfliteYoloService {
    if (!this.instance) {
      this.instance = new TfliteYoloService();
    }
    return this.instance;
  }

  /**
   * Safely loads react-native-fast-tflite only when its HybridObjects
   * are registered in the native Nitro Modules registry.
   */
  private getFastTflite(): typeof import('react-native-fast-tflite') | null {
    if (TfliteYoloService.fastTfliteModule) {
      return TfliteYoloService.fastTfliteModule;
    }
    try {
      if (
        typeof NitroModules !== 'undefined' &&
        NitroModules.hasHybridObject('AssetLoader') &&
        NitroModules.hasHybridObject('TfliteModule')
      ) {
        TfliteYoloService.fastTfliteModule = require('react-native-fast-tflite');
        return TfliteYoloService.fastTfliteModule;
      }
    } catch (e) {
      console.warn('[TFLite YOLO] Fast-tflite check note:', e);
    }
    return null;
  }

  /**
   * Safely loads ANY image into a NativeImage:
   * - Data URL / Base64
   * - Remote HTTP / HTTPS URL (downloaded via fetch to ArrayBuffer)
   * - Local filesystem path (/var/mobile/..., /Users/..., file://...)
   */
  public async loadNativeImage(src: string): Promise<Image> {
    if (src.startsWith('data:')) {
      const buffer = base64ToArrayBuffer(src);
      return loadImage({
        encodedImageData: {
          buffer,
          width: 0,
          height: 0,
          imageFormat: 'jpg',
        },
      });
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        return await loadImage({ url: src });
      } catch (loadErr) {
        console.log(
          '[TFLite YOLO] NitroWebImage note, falling back to buffer fetch:',
          loadErr,
        );
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: HTTP ${response.status} from ${src}`,
          );
        }
        const buffer = await response.arrayBuffer();
        return loadImage({
          encodedImageData: {
            buffer,
            width: 0,
            height: 0,
            imageFormat: 'jpg',
          },
        });
      }
    }

    const cleanPath = src.replace(/^file:\/\//, '');
    return loadImage({ filePath: cleanPath });
  }

  /**
   * Dynamically switches the biometric recognition model between MobileFaceNet and GhostFaceNet
   */
  public async setBiometricModel(
    type: 'mobilefacenet' | 'ghostfacenet',
  ): Promise<void> {
    if (this.biometricModelType === type && this.faceRecognitionModel) return;
    this.biometricModelType = type;
    const tflite = this.getFastTflite();
    if (!tflite) return;
    const modelAsset =
      type === 'ghostfacenet'
        ? appAiModel.GhostFaceNet
        : appAiModel.MobileFaceNet;
    console.log(
      `[TFLite YOLO] Switching biometric recognition model to ${type}...`,
    );
    const filename =
      type === 'ghostfacenet' ? 'ghostfacenet.tflite' : 'mobilefacenet.tflite';
    try {
      this.faceRecognitionModel = await tflite.loadTensorflowModel(
        modelAsset,
        [],
      );
    } catch (switchErr) {
      console.warn(
        `[TFLite YOLO] Switching to ${type} via standard require failed, trying Android fallback:`,
        switchErr,
      );
      if (Platform.OS === 'android') {
        try {
          this.faceRecognitionModel = await tflite.loadTensorflowModel(
            { url: filename },
            [],
          );
        } catch {
          this.faceRecognitionModel = await tflite.loadTensorflowModel(
            { url: `asset:/${filename}` },
            [],
          );
        }
      } else {
        throw switchErr;
      }
    }
    this.profileEmbeddingsCache.clear();
    console.log(`[TFLite YOLO] ${type} loaded successfully!`);
  }

  /**
   * Clears in-memory and persistent MMKV embedding cache for a profile
   * Call when user updates their photos or a profile is deleted
   */
  public invalidateProfileCache(profileId: string): void {
    this.profileEmbeddingsCache.delete(profileId);
    try {
      faceEmbeddingStorage.remove(`emb_mobilefacenet_${profileId}`);
      faceEmbeddingStorage.remove(`emb_ghostfacenet_${profileId}`);
      faceEmbeddingStorage.remove('emb_' + profileId);
    } catch (e) {
      console.warn('[TFLite YOLO] Invalidate cache note:', e);
    }
  }

  /**
   * Generates a deterministic signature of profile photo sources to detect when photos change or new photos are added
   */
  public getProfilePhotoSignature(profile: UserProfile): string {
    const list: string[] = [];
    if (profile.avatarUri) list.push(profile.avatarUri);
    if (Array.isArray(profile.photos)) {
      for (const p of profile.photos) {
        if (p && !list.includes(p)) list.push(p);
      }
    }
    return list.join('|');
  }

  /**
   * Loads serialized embeddings for a profile from persistent MMKV storage
   */
  private loadEmbeddingsFromStorage(
    profileId: string,
    expectedSignature?: string,
  ): Float32Array[] | null {
    try {
      const key = `emb_${this.biometricModelType}_${profileId}`;
      const raw =
        faceEmbeddingStorage.getString(key) ||
        (this.biometricModelType === 'mobilefacenet'
          ? faceEmbeddingStorage.getString('emb_' + profileId)
          : null);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Object format with photo signature
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (expectedSignature && parsed.signature !== expectedSignature) {
            console.log(
              `[TFLite YOLO] Profile ${profileId} photo signature changed. Storage cache invalidated.`,
            );
            return null;
          }
          if (
            Array.isArray(parsed.embeddings) &&
            parsed.embeddings.length > 0
          ) {
            return parsed.embeddings.map(
              (arr: number[]) => new Float32Array(arr),
            );
          }
        }
        // Legacy format: number[][]
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (expectedSignature) {
            // Upgrade legacy entry to signed entry by re-enrolling
            return null;
          }
          return parsed.map(arr => new Float32Array(arr));
        }
      }
    } catch (e) {
      console.warn('[TFLite YOLO] Read MMKV embedding note:', e);
    }
    return null;
  }

  /**
   * Persists computed Float32Array embeddings into MMKV storage along with photo signature
   */
  private saveEmbeddingsToStorage(
    profileId: string,
    embeddings: Float32Array[],
    signature?: string,
  ): void {
    try {
      const key = `emb_${this.biometricModelType}_${profileId}`;
      const serialized = {
        signature: signature || '',
        embeddings: embeddings.map(emb => Array.from(emb)),
        savedAt: Date.now(),
      };
      faceEmbeddingStorage.set(key, JSON.stringify(serialized));
    } catch (e) {
      console.warn('[TFLite YOLO] Write MMKV embedding note:', e);
    }
  }

  /**
   * Initializes and loads the TFLite models
   */
  public async initModels(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const tflite = this.getFastTflite();
        if (tflite) {
          console.log(
            `[TFLite YOLO] Loading YOLOv8-Face & ${this.biometricModelType} models via loadTensorflowModel...`,
          );
          const { loadTensorflowModel } = tflite;

          // 1. Load YOLOv8-Face (with Android APK asset fallback)
          try {
            this.faceDetectorModel = await loadTensorflowModel(
              appAiModel.YoloV8n,
              [],
            );
          } catch (yoloErr) {
            console.warn(
              '[TFLite YOLO] YOLO standard load failed, trying Android fallback:',
              yoloErr,
            );
            if (Platform.OS === 'android') {
              try {
                this.faceDetectorModel = await loadTensorflowModel(
                  { url: 'yolov8n-face.tflite' },
                  [],
                );
              } catch {
                this.faceDetectorModel = await loadTensorflowModel(
                  { url: 'asset:/yolov8n-face.tflite' },
                  [],
                );
              }
            } else {
              throw yoloErr;
            }
          }

          console.log(
            '[TFLite YOLO] YOLOv8-Face loaded successfully! Inputs:',
            this.faceDetectorModel?.inputs,
            'Outputs:',
            this.faceDetectorModel?.outputs,
          );

          // 2. Load Biometric Recognition Model (with Android APK asset fallback)
          const bioModelAsset =
            this.biometricModelType === 'ghostfacenet'
              ? appAiModel.GhostFaceNet
              : appAiModel.MobileFaceNet;
          const bioFilename =
            this.biometricModelType === 'ghostfacenet'
              ? 'ghostfacenet.tflite'
              : 'mobilefacenet.tflite';

          try {
            this.faceRecognitionModel = await loadTensorflowModel(
              bioModelAsset,
              [],
            );
          } catch (bioErr) {
            console.warn(
              `[TFLite YOLO] ${this.biometricModelType} standard load failed, trying Android fallback:`,
              bioErr,
            );
            if (Platform.OS === 'android') {
              try {
                this.faceRecognitionModel = await loadTensorflowModel(
                  { url: bioFilename },
                  [],
                );
              } catch {
                this.faceRecognitionModel = await loadTensorflowModel(
                  { url: `asset:/${bioFilename}` },
                  [],
                );
              }
            } else {
              throw bioErr;
            }
          }

          console.log(
            `[TFLite YOLO] ${this.biometricModelType} loaded successfully! Inputs:`,
            this.faceRecognitionModel?.inputs,
            'Outputs:',
            this.faceRecognitionModel?.outputs,
          );
        } else {
          console.warn(
            '[TFLite YOLO] Notice: Native module "AssetLoader" is not yet registered in this native binary. Please rebuild app via `npm run ios` or `npm run android` to load models into GPU/CPU runtime.',
          );
        }

        this.isInitialized = true;
        return true;
      } catch (err) {
        console.error('[TFLite YOLO] Initialization error:', err);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Preprocesses a native Image for YOLOv8-Face:
   * 1. Resizes image to 640x640.
   * 2. Reads raw pixel data.
   * 3. Formats into NCHW Float32Array [1, 3, 640, 640], normalized [0.0, 1.0].
   */
  public preprocessImageForYolo(image: Image): Float32Array {
    const resized = image.resize(640, 640);
    const { buffer, pixelFormat } = resized.toRawPixelData();
    const u8 = new Uint8Array(buffer);
    const totalPixels = 640 * 640;
    const tensor = this.yoloTensorBuffer;

    const rOffset = 0;
    const gOffset = totalPixels;
    const bOffset = 2 * totalPixels;

    // Resolve channel offsets and byte step outside loop (avoids 409,600 function calls & allocations)
    const fmt = (pixelFormat || 'RGBA').toUpperCase();
    let rIdx = 0;
    let gIdx = 1;
    let bIdx = 2;
    let step = 4;

    if (fmt === 'BGRA' || fmt === 'BGRX') {
      rIdx = 2;
      gIdx = 1;
      bIdx = 0;
      step = 4;
    } else if (fmt === 'ABGR' || fmt === 'XBGR') {
      rIdx = 3;
      gIdx = 2;
      bIdx = 1;
      step = 4;
    } else if (fmt === 'ARGB' || fmt === 'XRGB') {
      rIdx = 1;
      gIdx = 2;
      bIdx = 3;
      step = 4;
    } else if (fmt === 'RGB') {
      rIdx = 0;
      gIdx = 1;
      bIdx = 2;
      step = 3;
    } else if (fmt === 'BGR') {
      rIdx = 2;
      gIdx = 1;
      bIdx = 0;
      step = 3;
    }

    const INV_255 = 1.0 / 255.0;
    for (let i = 0; i < totalPixels; i++) {
      const base = i * step;
      tensor[rOffset + i] = u8[base + rIdx] * INV_255;
      tensor[gOffset + i] = u8[base + gIdx] * INV_255;
      tensor[bOffset + i] = u8[base + bIdx] * INV_255;
    }

    return tensor;
  }

  /**
   * Constructs a YoloFaceDetection object with UI boundingBox, MobileFaceNet cropBox,
   * and clean portrait avatarCropBox centered on the face.
   */
  private buildFaceDetection(
    item: {
      anchor: number;
      score: number;
      normCx: number;
      normCy: number;
      normW: number;
      normH: number;
      isNormalized: boolean;
    },
    data: Float32Array,
    origWidth: number,
    origHeight: number,
  ): YoloFaceDetection {
    const NUM_ANCHORS = 8400;
    const { anchor, score, normCx, normCy, normW, normH, isNormalized } = item;

    // Extract 5 facial landmarks for head pose & tilt analysis:
    // Channels 5,6: Left Eye (x, y)
    // Channels 8,9: Right Eye (x, y)
    // Channels 11,12: Nose (x, y)
    // Channels 14,15: Left Mouth (x, y)
    // Channels 17,18: Right Mouth (x, y)
    const lmScale = isNormalized ? 1.0 : 1.0 / 640.0;
    const eyeLeftX = (data[5 * NUM_ANCHORS + anchor] || 0) * lmScale;
    const eyeLeftY = (data[6 * NUM_ANCHORS + anchor] || 0) * lmScale;
    const eyeRightX = (data[8 * NUM_ANCHORS + anchor] || 0) * lmScale;
    const eyeRightY = (data[9 * NUM_ANCHORS + anchor] || 0) * lmScale;
    const noseX = (data[11 * NUM_ANCHORS + anchor] || 0) * lmScale;
    const noseY = (data[12 * NUM_ANCHORS + anchor] || 0) * lmScale;

    let tiltBoostW = 0;
    let tiltBoostH = 0;
    let shiftX = 0;
    let shiftY = -normH * 0.04; // Default upward lift to cleanly include full forehead & hair
    let signedRollDegrees = 0;

    const hasValidLandmarks =
      eyeLeftX > 0 &&
      eyeRightX > 0 &&
      Math.abs(eyeLeftX - eyeRightX) > 0.002 &&
      noseX > 0 &&
      noseY > 0;

    if (hasValidLandmarks) {
      // 1. Roll angle (head tilting sideways towards shoulder)
      const eyeDx = eyeRightX - eyeLeftX;
      const eyeDy = eyeRightY - eyeLeftY;
      const rawRollRadians = Math.atan2(eyeDy, eyeDx);
      signedRollDegrees = rawRollRadians * (180 / Math.PI);
      const rollAngle = Math.abs(rawRollRadians); // radians (0 when upright)
      if (rollAngle > 0.1) {
        const rollFactor = Math.min(1.0, (rollAngle - 0.1) / 0.65);
        tiltBoostW += rollFactor * 0.16;
        tiltBoostH += rollFactor * 0.14;
      }

      // 2. Yaw asymmetry (head turned at 3/4 or profile angle)
      const dNoseLeft = Math.hypot(noseX - eyeLeftX, noseY - eyeLeftY);
      const dNoseRight = Math.hypot(noseX - eyeRightX, noseY - eyeRightY);
      const minEyeDist = Math.min(dNoseLeft, dNoseRight);
      const maxEyeDist = Math.max(dNoseLeft, dNoseRight);

      if (minEyeDist > 0.005) {
        const yawAsymmetry = maxEyeDist / minEyeDist;
        if (yawAsymmetry > 1.25) {
          const yawFactor = Math.min(1.0, (yawAsymmetry - 1.25) / 1.5);
          tiltBoostW += yawFactor * 0.18;
          const dir = dNoseRight > dNoseLeft ? 1 : -1;
          shiftX = dir * normW * 0.06 * yawFactor;
        }
      }
    }

    // Adaptive UI bounding box: generous breathing room ensuring forehead, ears, and chin are completely enclosed
    const expandW = 1.2 + Math.min(0.2, tiltBoostW);
    const expandH = 1.25 + Math.min(0.18, tiltBoostH);

    const uiW = normW * expandW;
    const uiH = normH * expandH;
    const uiCx = Math.max(0.02, Math.min(0.98, normCx + shiftX));
    const uiCy = Math.max(0.02, Math.min(0.98, normCy + shiftY));

    const leftPercent = Math.max(0, Math.min(95, (uiCx - uiW / 2) * 100));
    const topPercent = Math.max(0, Math.min(95, (uiCy - uiH / 2) * 100));
    const widthPercent = Math.max(5, Math.min(100 - leftPercent, uiW * 100));
    const heightPercent = Math.max(5, Math.min(100 - topPercent, uiH * 100));

    // Pixel coordinates in original image space
    const origBoxW = Math.max(1, normW * origWidth);
    const origBoxH = Math.max(1, normH * origHeight);
    const faceCx = normCx * origWidth;
    const faceCy = normCy * origHeight;

    const maxSide = Math.min(origWidth, origHeight);
    const faceSize = Math.max(origBoxW, origBoxH);

    // 1. MobileFaceNet crop box: tight 1.15x square box for canonical InsightFace feature extraction.
    // InsightFace MobileFaceNet is trained on tightly aligned faces (face occupying ~80% of 112x112).
    // Keeping this tight eliminates background/hair interference, lowering stranger cross-similarity from ~0.65 to <0.45.
    const cropMultiplier = 1.15;
    const cropSide = Math.min(Math.round(faceSize * cropMultiplier), maxSide);
    let cropX1 = Math.round(faceCx - cropSide / 2);
    let cropY1 = Math.round(faceCy - cropSide / 2);

    if (cropX1 < 0) {
      cropX1 = 0;
    } else if (cropX1 + cropSide > origWidth) {
      cropX1 = Math.max(0, origWidth - cropSide);
    }

    if (cropY1 < 0) {
      cropY1 = 0;
    } else if (cropY1 + cropSide > origHeight) {
      cropY1 = Math.max(0, origHeight - cropSide);
    }

    // 2. Avatar portrait crop box (used for UI display in AttendanceCard, Session history, etc.):
    // Scaled to 1.28x face size, centered slightly higher on the head (lifted by 6% face height)
    // so hair, forehead, eyes, nose, and chin are perfectly framed like a portrait ID photo
    const avatarMultiplier = 1.28;
    const avatarSide = Math.min(
      Math.round(faceSize * avatarMultiplier),
      maxSide,
    );
    const avatarCenterY = Math.round(faceCy - origBoxH * 0.06);
    let avatarX1 = Math.round(faceCx - avatarSide / 2);
    let avatarY1 = Math.round(avatarCenterY - avatarSide / 2);

    if (avatarX1 < 0) {
      avatarX1 = 0;
    } else if (avatarX1 + avatarSide > origWidth) {
      avatarX1 = Math.max(0, origWidth - avatarSide);
    }

    if (avatarY1 < 0) {
      avatarY1 = 0;
    } else if (avatarY1 + avatarSide > origHeight) {
      avatarY1 = Math.max(0, origHeight - avatarSide);
    }

    // --- FACE QUALITY ASSESSMENT (FQA) ---
    // Prevent partial edge faces, extreme yaw poses, and abnormal aspect ratios
    let qualityWarning: string | undefined;

    // 1. Edge Boundary Cutoff (face entering/leaving or cut off by screen border)
    const isEdgeCutoff =
      normCx - normW / 2 < 0.015 ||
      normCy - normH / 2 < 0.015 ||
      normCx + normW / 2 > 0.985 ||
      normCy + normH / 2 > 0.985;
    if (isEdgeCutoff) {
      qualityWarning = 'Vui lòng vào giữa khung hình';
    }

    // 2. Aspect Ratio Check (standard frontal face is ~0.65 to 1.15)
    const aspectRatio = normW / normH;
    if (!qualityWarning && (aspectRatio < 0.55 || aspectRatio > 1.25)) {
      qualityWarning = 'Vui lòng nhìn thẳng vào camera';
    }

    // 3. Minimum Face Size (too far away to reliably identify)
    if (!qualityWarning && (origBoxW < 65 || origBoxH < 65 || normH < 0.085)) {
      qualityWarning = 'Vui lòng lại gần camera hơn';
    }

    // 4. Pose Yaw & Roll Angle Check via 5 facial landmarks
    if (!qualityWarning && hasValidLandmarks) {
      const eyeDx = Math.abs(eyeRightX - eyeLeftX);
      if (eyeDx / normW < 0.18) {
        // Distance between eyes too small relative to face width -> side profile face
        qualityWarning = 'Vui lòng nhìn thẳng vào camera';
      } else {
        const dNoseLeft = Math.hypot(noseX - eyeLeftX, noseY - eyeLeftY);
        const dNoseRight = Math.hypot(noseX - eyeRightX, noseY - eyeRightY);
        const minEyeDist = Math.min(dNoseLeft, dNoseRight);
        const maxEyeDist = Math.max(dNoseLeft, dNoseRight);
        const yawAsymmetry = minEyeDist > 0.005 ? maxEyeDist / minEyeDist : 1.0;
        if (yawAsymmetry > 2.0) {
          // Nose heavily displaced to one side -> face turned > 35-40 degrees
          qualityWarning = 'Vui lòng nhìn thẳng vào camera';
        } else if (Math.abs(signedRollDegrees) > 35) {
          qualityWarning = 'Vui lòng giữ thẳng đầu';
        }
      }
    }

    return {
      boundingBox: {
        x: Math.round(leftPercent * 10) / 10,
        y: Math.round(topPercent * 10) / 10,
        width: Math.round(widthPercent * 10) / 10,
        height: Math.round(heightPercent * 10) / 10,
        frameWidth: origWidth,
        frameHeight: origHeight,
      },
      confidence: Math.round(score * 100),
      cropBox: {
        x1: cropX1,
        y1: cropY1,
        x2: Math.min(origWidth, cropX1 + cropSide),
        y2: Math.min(origHeight, cropY1 + cropSide),
      },
      avatarCropBox: {
        x1: avatarX1,
        y1: avatarY1,
        x2: Math.min(origWidth, avatarX1 + avatarSide),
        y2: Math.min(origHeight, avatarY1 + avatarSide),
      },
      rollDegrees: hasValidLandmarks
        ? Math.round(signedRollDegrees * 10) / 10
        : undefined,
      qualityWarning,
    };
  }

  /**
   * Parses YOLOv8-Face raw output tensor [1, 20, 8400] and applies Non-Maximum Suppression (NMS)
   * to detect ALL distinct faces in the camera frame (handles 1, 2, or multiple people).
   */
  public parseAllYoloFaces(
    outputBuffer: ArrayBuffer,
    origWidth: number,
    origHeight: number,
    minConfidence: number = 0.4,
  ): YoloFaceDetection[] {
    try {
      const data = new Float32Array(outputBuffer);
      const totalLen = data.length;
      if (totalLen < 20 * 8400) return [];

      const NUM_ANCHORS = 8400;
      const CONF_CHANNEL_OFFSET = 4 * NUM_ANCHORS;
      const CONFIDENCE_THRESHOLD = minConfidence; // Filter out low-confidence blurry artifacts and edge noise

      interface RawFaceCandidate {
        anchor: number;
        score: number;
        normCx: number;
        normCy: number;
        normW: number;
        normH: number;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        isNormalized: boolean;
      }

      const candidates: RawFaceCandidate[] = [];

      for (let c = 0; c < NUM_ANCHORS; c++) {
        const rawScore = data[CONF_CHANNEL_OFFSET + c];
        const score =
          rawScore > 1.0 || rawScore < 0.0
            ? 1 / (1 + Math.exp(-rawScore))
            : rawScore;

        if (score >= CONFIDENCE_THRESHOLD) {
          const cx = data[0 * NUM_ANCHORS + c];
          const cy = data[1 * NUM_ANCHORS + c];
          const w = data[2 * NUM_ANCHORS + c];
          const h = data[3 * NUM_ANCHORS + c];

          const isNormalized =
            cx <= 1.05 && cy <= 1.05 && w <= 1.05 && h <= 1.05;
          const normCx = Math.max(0, Math.min(1, isNormalized ? cx : cx / 640));
          const normCy = Math.max(0, Math.min(1, isNormalized ? cy : cy / 640));
          const normW = Math.max(0.01, Math.min(1, isNormalized ? w : w / 640));
          const normH = Math.max(0.01, Math.min(1, isNormalized ? h : h / 640));

          const x1 = Math.max(0, normCx - normW / 2);
          const y1 = Math.max(0, normCy - normH / 2);
          const x2 = Math.min(1, normCx + normW / 2);
          const y2 = Math.min(1, normCy + normH / 2);

          candidates.push({
            anchor: c,
            score,
            normCx,
            normCy,
            normW,
            normH,
            x1,
            y1,
            x2,
            y2,
            isNormalized,
          });
        }
      }

      if (candidates.length === 0) return [];

      // Sort descending by confidence score
      candidates.sort((a, b) => b.score - a.score);

      // Non-Maximum Suppression (NMS) with IoU = 0.40
      const selected: RawFaceCandidate[] = [];
      const IOU_THRESHOLD = 0.4;
      const MAX_FACES = 5;

      for (const cand of candidates) {
        let suppressed = false;
        for (const sel of selected) {
          const interX1 = Math.max(cand.x1, sel.x1);
          const interY1 = Math.max(cand.y1, sel.y1);
          const interX2 = Math.min(cand.x2, sel.x2);
          const interY2 = Math.min(cand.y2, sel.y2);
          const interW = Math.max(0, interX2 - interX1);
          const interH = Math.max(0, interY2 - interY1);
          const interArea = interW * interH;

          if (interArea > 0) {
            const areaA = (cand.x2 - cand.x1) * (cand.y2 - cand.y1);
            const areaB = (sel.x2 - sel.x1) * (sel.y2 - sel.y1);
            const iou = interArea / (areaA + areaB - interArea);
            if (iou > IOU_THRESHOLD) {
              suppressed = true;
              break;
            }
          }
        }
        if (!suppressed) {
          selected.push(cand);
          if (selected.length >= MAX_FACES) break;
        }
      }

      // Convert selected candidate anchors into YoloFaceDetection objects
      return selected.map(item =>
        this.buildFaceDetection(item, data, origWidth, origHeight),
      );
    } catch (e) {
      console.warn('[TFLite YOLO] parseAllYoloFaces error:', e);
      return [];
    }
  }

  /**
   * Parses YOLOv8-Face raw output tensor [1, 20, 8400]
   * Returns primary detected face (backward-compatible)
   */
  public parseYoloOutputs(
    outputBuffer: ArrayBuffer,
    origWidth: number,
    origHeight: number,
    minConfidence: number = 0.4,
  ): YoloFaceDetection | null {
    const all = this.parseAllYoloFaces(
      outputBuffer,
      origWidth,
      origHeight,
      minConfidence,
    );
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Accurately crops avatar portrait from frameImage with selfie mirror support
   */
  public cropAvatarFromFrame(
    frameImage: Image,
    cropBox: { x1: number; y1: number; x2: number; y2: number },
    isFrontCamera?: boolean,
  ): string {
    try {
      const cropX1 = Math.max(0, Math.min(cropBox.x1, frameImage.width - 2));
      const cropY1 = Math.max(0, Math.min(cropBox.y1, frameImage.height - 2));
      const cropX2 = Math.min(
        frameImage.width,
        Math.max(cropBox.x2, cropX1 + 1),
      );
      const cropY2 = Math.min(
        frameImage.height,
        Math.max(cropBox.y2, cropY1 + 1),
      );

      let croppedFaceImage = frameImage.crop(cropX1, cropY1, cropX2, cropY2);

      // If front camera was used, mirror the cropped photo so it matches the selfie preview view
      if (isFrontCamera) {
        try {
          croppedFaceImage = croppedFaceImage.mirrorHorizontally();
        } catch {
          // Keep unmirrored if mirroring fails
        }
      }

      // Quality 80 produces sharp portrait avatar with light memory footprint (~8KB)
      const encoded = croppedFaceImage.toEncodedImageData('jpg', 80);
      return `data:image/jpeg;base64,${arrayBufferToBase64(encoded.buffer)}`;
    } catch (cropErr) {
      console.warn('[TFLite YOLO] Crop avatar error:', cropErr);
      return '';
    }
  }

  /**
   * Preprocesses a facial image (or face crop) for MobileFaceNet:
   * 1. Crops the face region if cropBox specified.
   * 2. Resizes to 112x112.
   * 3. Converts to NHWC Float32Array [1, 112, 112, 3], normalized (x - 127.5) / 128.0.
   */
  public preprocessFaceForMobileFaceNet(
    image: Image,
    cropBox?: { x1: number; y1: number; x2: number; y2: number },
    rollDegrees?: number,
  ): Float32Array {
    let faceImage = image;
    if (cropBox && cropBox.x2 > cropBox.x1 && cropBox.y2 > cropBox.y1) {
      try {
        faceImage = image.crop(cropBox.x1, cropBox.y1, cropBox.x2, cropBox.y2);
      } catch (e) {
        console.warn('[TFLite YOLO] image crop error, using full image:', e);
      }
    }

    // 5-Point Landmark Affine Alignment (Roll Correction):
    // If head is tilted by >= 3 degrees, rotate the face so eyes are horizontal!
    // This dramatically boosts cross-pose accuracy for tilted heads up to 45 degrees.
    if (
      rollDegrees &&
      Math.abs(rollDegrees) >= 3 &&
      Math.abs(rollDegrees) <= 65
    ) {
      try {
        faceImage = faceImage.rotate(-rollDegrees);
      } catch (rotErr) {
        console.warn('[TFLite YOLO] Landmark roll alignment note:', rotErr);
      }
    }

    const resized = faceImage.resize(112, 112);
    const { buffer, pixelFormat } = resized.toRawPixelData();
    const u8 = new Uint8Array(buffer);
    const facePixels = 112 * 112;
    const tensor = this.faceNetTensorBuffer;

    const fmt = (pixelFormat || 'RGBA').toUpperCase();
    let rIdx = 0;
    let gIdx = 1;
    let bIdx = 2;
    let step = 4;

    if (fmt === 'BGRA' || fmt === 'BGRX') {
      rIdx = 2;
      gIdx = 1;
      bIdx = 0;
      step = 4;
    } else if (fmt === 'ABGR' || fmt === 'XBGR') {
      rIdx = 3;
      gIdx = 2;
      bIdx = 1;
      step = 4;
    } else if (fmt === 'ARGB' || fmt === 'XRGB') {
      rIdx = 1;
      gIdx = 2;
      bIdx = 3;
      step = 4;
    } else if (fmt === 'RGB') {
      rIdx = 0;
      gIdx = 1;
      bIdx = 2;
      step = 3;
    } else if (fmt === 'BGR') {
      rIdx = 2;
      gIdx = 1;
      bIdx = 0;
      step = 3;
    }

    const INV_128 = 1.0 / 128.0;
    for (let i = 0; i < facePixels; i++) {
      const base = i * step;
      // Standard input normalization: (x - 127.5) / 128.0
      tensor[i * 3 + 0] = (u8[base + rIdx] - 127.5) * INV_128;
      tensor[i * 3 + 1] = (u8[base + gIdx] - 127.5) * INV_128;
      tensor[i * 3 + 2] = (u8[base + bIdx] - 127.5) * INV_128;
    }

    // Fast Laplacian Variance on central face ROI (72x72) to detect motion blur & out-of-focus
    this.lastCalculatedSharpness = this.calculateImageSharpness(
      u8,
      112,
      112,
      step,
      rIdx,
      gIdx,
      bIdx,
    );

    return tensor;
  }

  /**
   * Fast Laplacian Variance Blur Detector on Face Central ROI:
   * Returns variance of 3x3 Laplacian operator over 112x112 face pixels.
   * - Sharp face: variance >= 45 - 250+
   * - Blurry / motion blur / out of focus: variance < 35.0
   */
  public calculateImageSharpness(
    u8: Uint8Array,
    width: number,
    height: number,
    step: number,
    rIdx: number,
    gIdx: number,
    bIdx: number,
  ): number {
    const startX = Math.round(width * 0.18);
    const endX = Math.round(width * 0.82);
    const startY = Math.round(height * 0.18);
    const endY = Math.round(height * 0.82);
    const roiW = endX - startX;
    const roiH = endY - startY;

    if (roiW <= 2 || roiH <= 2) return 100;

    const gray = new Uint8Array(roiW * roiH);
    for (let y = 0; y < roiH; y++) {
      for (let x = 0; x < roiW; x++) {
        const srcIdx = ((startY + y) * width + (startX + x)) * step;
        const r = u8[srcIdx + rIdx];
        const g = u8[srcIdx + gIdx];
        const b = u8[srcIdx + bIdx];
        // Integer grayscale conversion: (77*R + 150*G + 29*B) >> 8
        gray[y * roiW + x] = (77 * r + 150 * g + 29 * b) >> 8;
      }
    }

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < roiH - 1; y++) {
      const rowOffset = y * roiW;
      const prevRow = (y - 1) * roiW;
      const nextRow = (y + 1) * roiW;
      for (let x = 1; x < roiW - 1; x++) {
        const center = gray[rowOffset + x];
        const top = gray[prevRow + x];
        const bottom = gray[nextRow + x];
        const left = gray[rowOffset + (x - 1)];
        const right = gray[rowOffset + (x + 1)];

        const lap = top + bottom + left + right - (center << 2);
        sum += lap;
        sumSq += lap * lap;
        count++;
      }
    }

    if (count === 0) return 100;
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    return variance;
  }

  /**
   * Extracts a 512-dimensional L2-normalized embedding vector from a face image
   */
  public async extractFaceEmbedding(
    image: Image,
    cropBox?: { x1: number; y1: number; x2: number; y2: number },
    rollDegrees?: number,
  ): Promise<Float32Array | null> {
    if (!this.faceRecognitionModel) {
      await this.initModels();
    }
    if (this.faceRecognitionModel) {
      try {
        const tensor = this.preprocessFaceForMobileFaceNet(
          image,
          cropBox,
          rollDegrees,
        );
        const outputs = await this.faceRecognitionModel.run([
          tensor.buffer as ArrayBuffer,
        ]);
        if (outputs && outputs.length > 0) {
          const raw = new Float32Array(outputs[0]);
          return this.l2Normalize(raw);
        }
      } catch (err) {
        console.warn(
          '[TFLite YOLO] faceRecognitionModel inference error:',
          err,
        );
      }
    }
    return null;
  }

  /**
   * Enrolls a user profile into the in-memory and persistent embedding cache:
   * 1. Awaits AI model initialization to prevent race conditions.
   * 2. Checks memory cache and persistent MMKV storage first (instant 0ms loading).
   * 3. Runs YOLOv8 on each photo to detect and crop face region with high precision.
   * 4. Runs MobileFaceNet to extract 512-dim normalized feature vectors.
   * 5. Saves to MMKV storage permanently so restart doesn't require reprocessing.
   */
  public async enrollProfile(profile: UserProfile): Promise<void> {
    if (!this.isInitialized) {
      await this.initModels();
    }

    const currentSignature = this.getProfilePhotoSignature(profile);

    // 1. Check in-memory cache
    const existing = this.profileEmbeddingsCache.get(profile.id);
    if (existing && existing.embeddings.length > 0) {
      if (!currentSignature || existing.signature === currentSignature) {
        return;
      }
      console.log(
        `[TFLite YOLO] Re-enrolling ${profile.fullName} due to photo changes (in-memory cache mismatch).`,
      );
    }

    // 2. Check persistent MMKV storage (instantly recovers on app launch)
    const storedEmbeddings = this.loadEmbeddingsFromStorage(
      profile.id,
      currentSignature,
    );
    if (storedEmbeddings && storedEmbeddings.length > 0) {
      this.profileEmbeddingsCache.set(profile.id, {
        userId: profile.id,
        fullName: profile.fullName,
        code: profile.code,
        avatarUri: profile.avatarUri,
        zoneId: profile.zoneId,
        roomId: profile.roomId,
        embeddings: storedEmbeddings,
        signature: currentSignature,
      });
      return;
    }

    const embeddings: Float32Array[] = [];
    const photoSources: string[] = [];

    if (profile.avatarUri) photoSources.push(profile.avatarUri);
    if (profile.photos && Array.isArray(profile.photos)) {
      profile.photos.forEach(p => {
        if (p && !photoSources.includes(p)) photoSources.push(p);
      });
    }

    if (this.faceRecognitionModel && photoSources.length > 0) {
      for (const src of photoSources) {
        try {
          const resolvedSrc = appUtils.getUrlImage(src) || src;
          const rawImg = await this.loadNativeImage(resolvedSrc);

          // Clamp large image dimension to max 960 to avoid huge memory spike and lag
          const MAX_ENROLL_DIM = 960;
          let targetW = rawImg.width;
          let targetH = rawImg.height;
          if (Math.max(targetW, targetH) > MAX_ENROLL_DIM) {
            const scale = MAX_ENROLL_DIM / Math.max(targetW, targetH);
            targetW = Math.round(targetW * scale);
            targetH = Math.round(targetH * scale);
          }
          const image = rawImg.resize(targetW, targetH);

          // Auto-detect and crop face in profile photo using YOLO for maximum accuracy!
          let cropBox:
            | { x1: number; y1: number; x2: number; y2: number }
            | undefined;
          let rollDegrees: number | undefined;

          if (this.faceDetectorModel) {
            try {
              const yoloTensor = this.preprocessImageForYolo(image);
              const yoloOutputs = await this.faceDetectorModel.run([
                yoloTensor.buffer as ArrayBuffer,
              ]);
              if (yoloOutputs && yoloOutputs.length > 0) {
                const detectedFace = this.parseYoloOutputs(
                  yoloOutputs[0],
                  image.width,
                  image.height,
                  0.22, // Lower threshold for static profile photos to catch subtle faces
                );
                if (detectedFace) {
                  cropBox = detectedFace.cropBox;
                  rollDegrees = detectedFace.rollDegrees;
                }
              }
            } catch (cropErr) {
              console.warn(
                '[TFLite YOLO] YOLO crop during enrollment skipped:',
                cropErr,
              );
            }
          }

          // Fallback if YOLO didn't detect face in enrollment photo (e.g. tightly cropped selfie)
          if (!cropBox) {
            const side = Math.min(image.width, image.height);
            const x1 = Math.max(0, Math.round((image.width - side) / 2));
            const y1 =
              image.height > image.width
                ? Math.max(0, Math.round(image.height * 0.05))
                : Math.max(0, Math.round((image.height - side) / 2));
            cropBox = {
              x1,
              y1,
              x2: x1 + side,
              y2: Math.min(image.height, y1 + side),
            };
          }

          // 1. Normal orientation embedding with landmark roll alignment
          const emb = await this.extractFaceEmbedding(
            image,
            cropBox,
            rollDegrees,
          );
          if (emb) {
            embeddings.push(emb);

            // 2. Horizontally mirrored embedding for flip-invariance (selfie camera invariance)
            try {
              const mirroredImage = image.mirrorHorizontally();
              const mirroredCropBox = {
                x1: image.width - cropBox.x2,
                y1: cropBox.y1,
                x2: image.width - cropBox.x1,
                y2: cropBox.y2,
              };
              const mirroredEmb = await this.extractFaceEmbedding(
                mirroredImage,
                mirroredCropBox,
                rollDegrees ? -rollDegrees : undefined,
              );
              if (mirroredEmb) {
                embeddings.push(mirroredEmb);
              }
            } catch (mirrorErr) {
              console.warn(
                '[TFLite YOLO] Mirror augmentation note:',
                mirrorErr,
              );
            }

            // 3. Multi-scale context crop (+15% padding) for distance invariance
            try {
              const boxW = cropBox.x2 - cropBox.x1;
              const boxH = cropBox.y2 - cropBox.y1;
              const padW = Math.round(boxW * 0.15);
              const padH = Math.round(boxH * 0.15);
              const expandedCropBox = {
                x1: Math.max(0, cropBox.x1 - padW),
                y1: Math.max(0, cropBox.y1 - padH),
                x2: Math.min(image.width, cropBox.x2 + padW),
                y2: Math.min(image.height, cropBox.y2 + padH),
              };
              const expandedEmb = await this.extractFaceEmbedding(
                image,
                expandedCropBox,
                rollDegrees,
              );
              if (expandedEmb) {
                embeddings.push(expandedEmb);
              }
            } catch (expandErr) {
              // ignore
            }
          }
        } catch (e) {
          console.warn(
            `[TFLite YOLO] Could not load photo for enrollment (${profile.fullName}):`,
            e,
          );
        }
      }
    }

    if (embeddings.length === 0) {
      console.warn(
        `[TFLite YOLO] No valid biometric embeddings extracted for ${profile.fullName} (${profile.id}). Will retry when photo is reachable.`,
      );
      // DO NOT permanently cache empty embeddings so retry is allowed
      return;
    }

    // Persist real biometric embeddings to MMKV storage so future sessions load instantly
    this.saveEmbeddingsToStorage(profile.id, embeddings, currentSignature);

    this.profileEmbeddingsCache.set(profile.id, {
      userId: profile.id,
      fullName: profile.fullName,
      code: profile.code,
      avatarUri: profile.avatarUri,
      zoneId: profile.zoneId,
      roomId: profile.roomId,
      embeddings,
      signature: currentSignature,
    });

    console.log(
      `[TFLite YOLO] Enrolled ${profile.fullName} with ${embeddings.length} real biometric vectors.`,
    );
  }

  /**
   * REAL AI PIPELINE:
   * 1. Loads captured frame from camera snapshot.
   * 2. Runs YOLOv8-Face to detect face bounding box.
   * 3. Crops detected face from real camera frame to get actual scanned photo.
   * 4. Runs MobileFaceNet to extract 512-dim embedding.
   * 5. Matches embedding against all enrolled profiles in the room using Cosine Similarity.
   * 6. Returns match result with real confidence score, bounding box, and real scanned photo.
   */
  public async processCapturedFrame(
    photoPath: string,
    roomProfiles: UserProfile[],
    isFrontCamera?: boolean,
    minConfidenceThreshold: number = 75,
    allProfiles?: UserProfile[],
  ): Promise<DetectionResult | null> {
    if (!photoPath) return null;

    // 1. Reentrancy Lock: Drop frame if previous inference is still executing (prevents native C++ TFLite crashes)
    if (this.isProcessingFrame) {
      return null;
    }
    this.isProcessingFrame = true;

    try {
      if (!this.isInitialized) {
        await this.initModels();
      }

      // 2. Ensure room profile embeddings are ready in cache before matching
      for (const p of roomProfiles) {
        const sig = this.getProfilePhotoSignature(p);
        const cached = this.profileEmbeddingsCache.get(p.id);

        if (!cached || (sig && cached.signature !== sig)) {
          const stored = this.loadEmbeddingsFromStorage(p.id, sig);
          if (stored && stored.length > 0) {
            this.profileEmbeddingsCache.set(p.id, {
              userId: p.id,
              fullName: p.fullName,
              code: p.code,
              avatarUri: p.avatarUri,
              zoneId: p.zoneId,
              roomId: p.roomId,
              embeddings: stored,
              signature: sig,
            });
          } else {
            // Await enrollment so biometric vectors exist before cosine matching
            await this.enrollProfile(p);
          }
        }
      }

      const timeString = dayjs().format('HH:mm:ss');

      // If native models are not loaded in the runtime, do NOT fake real camera detection!
      if (!this.faceDetectorModel || !this.faceRecognitionModel) {
        console.warn(
          '[TFLite YOLO] AI models not loaded into native runtime. Cannot process camera frame.',
        );
        return null;
      }

      // 3. Load camera frame image safely across data URL, remote URL, or local file
      const rawImage = await this.loadNativeImage(photoPath);

      // Clamp frame image to optimal working size (max dimension 720)
      // This normalizes native UIImage EXIF orientation, speeds up processing, and keeps memory light (<1.5MB)
      const MAX_WORKING_DIM = 720;
      let targetW = rawImage.width;
      let targetH = rawImage.height;
      if (Math.max(targetW, targetH) > MAX_WORKING_DIM) {
        const scale = MAX_WORKING_DIM / Math.max(targetW, targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }
      const frameImage = rawImage.resize(targetW, targetH);

      // 4. Run YOLOv8-Face detection
      const yoloTensor = this.preprocessImageForYolo(frameImage);
      const yoloOutputs = await this.faceDetectorModel.run([
        yoloTensor.buffer as ArrayBuffer,
      ]);
      if (!yoloOutputs || yoloOutputs.length === 0) {
        return null;
      }

      // 4. Run YOLOv8-Face detection: parse ALL faces in frame using NMS
      const detectedFaces = this.parseAllYoloFaces(
        yoloOutputs[0],
        frameImage.width,
        frameImage.height,
      );

      // If no face was detected in camera frame (score < 0.40), return null immediately
      if (detectedFaces.length === 0) {
        return null;
      }

      // Check Quality Gate for the primary detected face (angle / partial / edge cutoff)
      const primaryFaceCandidate = detectedFaces[0];
      if (primaryFaceCandidate.qualityWarning) {
        console.log(
          `[TFLite YOLO] Quality gate rejected face: "${primaryFaceCandidate.qualityWarning}"`,
        );
        return {
          userId: '',
          fullName: primaryFaceCandidate.qualityWarning,
          code: 'POOR_QUALITY',
          avatarUri: '',
          zoneName: '',
          roomName: '',
          confidence: primaryFaceCandidate.confidence,
          timestamp: timeString,
          status: 'verify',
          boundingBox: primaryFaceCandidate.boundingBox,
          qualityWarning: primaryFaceCandidate.qualityWarning,
        };
      }

      // 5. Extract avatar crop and 512-d biometric embeddings for each detected face
      interface ExtractedFaceInfo {
        face: YoloFaceDetection;
        avatarUri: string;
        embedding: Float32Array | null;
      }

      const extractedFaces: ExtractedFaceInfo[] = [];
      for (const face of detectedFaces) {
        let faceAvatarUri = this.cropAvatarFromFrame(
          frameImage,
          face.avatarCropBox,
          isFrontCamera,
        );
        if (!faceAvatarUri) {
          faceAvatarUri =
            photoPath.startsWith('data:') || photoPath.startsWith('file://')
              ? photoPath
              : `file://${photoPath}`;
        }
        const liveEmbedding = await this.extractFaceEmbedding(
          frameImage,
          face.cropBox,
          face.rollDegrees,
        );

        // Check blur sharpness for primary face
        const sharpness = this.lastCalculatedSharpness;
        const MIN_SHARPNESS_THRESHOLD = 35.0;
        if (
          face === primaryFaceCandidate &&
          sharpness < MIN_SHARPNESS_THRESHOLD
        ) {
          const blurWarning = 'Ảnh bị mờ, vui lòng giữ yên';
          console.log(
            `[TFLite YOLO] Blur rejected face (sharpness variance: ${sharpness.toFixed(
              1,
            )} < ${MIN_SHARPNESS_THRESHOLD})`,
          );
          return {
            userId: '',
            fullName: blurWarning,
            code: 'BLURRY_FRAME',
            avatarUri: faceAvatarUri,
            zoneName: '',
            roomName: '',
            confidence: face.confidence,
            timestamp: timeString,
            status: 'verify',
            boundingBox: face.boundingBox,
            qualityWarning: blurWarning,
          };
        }

        extractedFaces.push({
          face,
          avatarUri: faceAvatarUri,
          embedding: liveEmbedding,
        });
      }

      // 6. Greedy 1-to-1 Assignment against enrolled profiles:
      // Prevents 2 different faces from claiming the same enrolled profile!
      const MATCH_THRESHOLD = 0.58;

      interface MatchCandidate {
        faceIdx: number;
        profile: UserProfile;
        similarity: number;
      }
      const allCandidates: MatchCandidate[] = [];
      const faceMaxSim: number[] = new Array(extractedFaces.length).fill(0.15);

      for (let fIdx = 0; fIdx < extractedFaces.length; fIdx++) {
        const liveEmb = extractedFaces[fIdx].embedding;
        if (!liveEmb) continue;

        let maxSimForThisFace = 0;
        for (const p of roomProfiles) {
          const cached = this.profileEmbeddingsCache.get(p.id);
          if (!cached || !cached.embeddings || cached.embeddings.length === 0)
            continue;
          for (const emb of cached.embeddings) {
            const sim = this.calculateCosineSimilarity(liveEmb, emb);
            if (sim > maxSimForThisFace) {
              maxSimForThisFace = sim;
            }
            if (sim >= MATCH_THRESHOLD) {
              allCandidates.push({
                faceIdx: fIdx,
                profile: p,
                similarity: sim,
              });
            }
          }
        }
        faceMaxSim[fIdx] = maxSimForThisFace;
      }

      // Sort candidate matches descending by similarity
      allCandidates.sort((a, b) => b.similarity - a.similarity);

      const assignedFaces = new Set<number>();
      const assignedProfiles = new Set<string>();
      const faceAssignedProfile = new Map<number, UserProfile>();
      const faceAssignedSim = new Map<number, number>();

      for (const cand of allCandidates) {
        if (
          !assignedFaces.has(cand.faceIdx) &&
          !assignedProfiles.has(cand.profile.id)
        ) {
          assignedFaces.add(cand.faceIdx);
          assignedProfiles.add(cand.profile.id);
          faceAssignedProfile.set(cand.faceIdx, cand.profile);
          faceAssignedSim.set(cand.faceIdx, cand.similarity);
        }
      }

      // 6b. Cross-room fallback matching: check remaining unassigned faces against allProfiles (if provided)
      if (allProfiles && allProfiles.length > 0) {
        const unassignedFaceIndices = extractedFaces
          .map((_, idx) => idx)
          .filter(idx => !assignedFaces.has(idx));

        if (unassignedFaceIndices.length > 0) {
          const roomProfileIds = new Set(roomProfiles.map(p => p.id));
          const otherProfiles = allProfiles.filter(
            p => !roomProfileIds.has(p.id),
          );

          const fallbackCandidates: MatchCandidate[] = [];
          for (const fIdx of unassignedFaceIndices) {
            const liveEmb = extractedFaces[fIdx].embedding;
            if (!liveEmb) continue;

            for (const p of otherProfiles) {
              const cached = this.profileEmbeddingsCache.get(p.id);
              if (
                !cached ||
                !cached.embeddings ||
                cached.embeddings.length === 0
              )
                continue;
              for (const emb of cached.embeddings) {
                const sim = this.calculateCosineSimilarity(liveEmb, emb);
                if (sim > faceMaxSim[fIdx]) {
                  faceMaxSim[fIdx] = sim;
                }
                if (sim >= MATCH_THRESHOLD) {
                  fallbackCandidates.push({
                    faceIdx: fIdx,
                    profile: p,
                    similarity: sim,
                  });
                }
              }
            }
          }

          fallbackCandidates.sort((a, b) => b.similarity - a.similarity);
          for (const cand of fallbackCandidates) {
            if (
              !assignedFaces.has(cand.faceIdx) &&
              !assignedProfiles.has(cand.profile.id)
            ) {
              assignedFaces.add(cand.faceIdx);
              assignedProfiles.add(cand.profile.id);
              faceAssignedProfile.set(cand.faceIdx, cand.profile);
              faceAssignedSim.set(cand.faceIdx, cand.similarity);
            }
          }
        }
      }

      interface EvaluatedFace {
        detection: YoloFaceDetection;
        profile: UserProfile | null;
        similarity: number;
        status: 'present' | 'verify';
        avatarUri: string;
        embedding: Float32Array | null;
      }
      const evaluatedFaces: EvaluatedFace[] = [];

      for (let fIdx = 0; fIdx < extractedFaces.length; fIdx++) {
        const item = extractedFaces[fIdx];
        const assignedProfile = faceAssignedProfile.get(fIdx) || null;
        const sim = faceAssignedSim.get(fIdx) ?? faceMaxSim[fIdx];
        const isMatch = assignedProfile !== null && sim >= MATCH_THRESHOLD;

        evaluatedFaces.push({
          detection: item.face,
          profile: isMatch ? assignedProfile : null,
          similarity: sim,
          status: isMatch ? 'present' : 'verify',
          avatarUri: item.avatarUri,
          embedding: item.embedding,
        });
      }

      if (evaluatedFaces.length === 0) {
        return null;
      }

      // 7. PRIORITIZATION RULE:
      // - Verified profiles come first (highest similarity), unverified next
      evaluatedFaces.sort((a, b) => {
        if (a.status === 'present' && b.status !== 'present') return -1;
        if (b.status === 'present' && a.status !== 'present') return 1;
        return b.similarity - a.similarity;
      });

      const primary = evaluatedFaces[0];
      const hasUnverifiedStranger = evaluatedFaces.some(
        f => f.status === 'verify' && f !== primary,
      );

      // Collect all other verified faces in this frame for simultaneous multi-person attendance!
      const otherVerifiedFaces = evaluatedFaces.filter(
        f => f !== primary && f.status === 'present' && f.profile,
      );
      const additionalVerified: DetectionResult[] = [];
      for (const f of otherVerifiedFaces) {
        const confPct = Math.min(
          99,
          Math.max(
            75,
            Math.round(
              75 +
                ((f.similarity - MATCH_THRESHOLD) /
                  (0.85 - MATCH_THRESHOLD)) *
                  24,
            ),
          ),
        );
        // Only accept additional matches that meet the configured minConfidenceThreshold
        if (confPct >= minConfidenceThreshold) {
          additionalVerified.push({
            userId: f.profile!.id,
            fullName: f.profile!.fullName,
            code: f.profile!.code,
            avatarUri: f.avatarUri,
            zoneName: 'Khu vực chính',
            roomName: 'Phòng hiện tại',
            confidence: confPct,
            timestamp: timeString,
            status: 'present',
            boundingBox: f.detection.boundingBox,
          });
        }
      }

      console.log(
        `[TFLite YOLO] Total faces in frame: ${
          evaluatedFaces.length
        } | Primary: "${primary.profile?.fullName || 'UNKNOWN'}" (${(
          primary.similarity * 100
        ).toFixed(1)}%) -> ${primary.status.toUpperCase()}${
          hasUnverifiedStranger ? ' [WARNING: Stranger detected in frame]' : ''
        }${
          additionalVerified.length > 0
            ? ` [MULTI-MATCH: +${additionalVerified.length} members]`
            : ''
        } | MinThreshold: ${minConfidenceThreshold}%`,
      );

      if (primary.status === 'present' && primary.profile) {
        // Enrolled person recognized!
        const confidencePct = Math.min(
          99,
          Math.max(
            75,
            Math.round(
              75 +
                ((primary.similarity - MATCH_THRESHOLD) /
                  (0.85 - MATCH_THRESHOLD)) *
                  24,
            ),
          ),
        );

        // Check if confidence meets the user-configured threshold
        const isThresholdMet = confidencePct >= minConfidenceThreshold;

        return {
          userId: primary.profile.id,
          fullName: primary.profile.fullName,
          code: primary.profile.code,
          avatarUri: primary.avatarUri, // Clean portrait crop of THIS enrolled person
          zoneName: 'Khu vực chính',
          roomName: 'Phòng hiện tại',
          confidence: confidencePct,
          timestamp: timeString,
          status: isThresholdMet ? 'present' : 'verify',
          boundingBox: primary.detection.boundingBox,
          hasUnverifiedStranger,
          additionalVerified:
            isThresholdMet && additionalVerified.length > 0
              ? additionalVerified
              : undefined,
        };
      }

      // No enrolled user matched: unverified face detected (1 or multiple unverified strangers)
      // Check against session stranger embeddings cache to group repeat sightings of the same stranger
      let matchedStranger: StrangerRecord | null = null;
      let bestStrangerSim = 0;
      const STRANGER_MATCH_THRESHOLD = 0.7;

      if (primary.embedding) {
        for (const stranger of this.strangerEmbeddingsCache.values()) {
          for (const emb of stranger.embeddings) {
            const sim = this.calculateCosineSimilarity(primary.embedding, emb);
            if (sim > bestStrangerSim) {
              bestStrangerSim = sim;
              matchedStranger = stranger;
            }
          }
        }
      }

      if (matchedStranger && bestStrangerSim >= STRANGER_MATCH_THRESHOLD) {
        // Matched existing stranger from this session!
        matchedStranger.lastSeen = Date.now();
        if (primary.embedding && matchedStranger.embeddings.length < 3) {
          matchedStranger.embeddings.push(primary.embedding);
        }
        if (!matchedStranger.avatarUri && primary.avatarUri) {
          matchedStranger.avatarUri = primary.avatarUri;
        }
      } else {
        // New unidentified person: register in stranger cache
        this.strangerSequenceCounter++;
        const seq = this.strangerSequenceCounter;
        const strangerId = `stranger-${Date.now()}-${seq}`;
        const code = `STRANGER-${String(seq).padStart(2, '0')}`;
        const fullName = `Người chưa xác minh #${String(seq).padStart(2, '0')}`;
        matchedStranger = {
          id: strangerId,
          sequence: seq,
          code,
          fullName,
          embeddings: primary.embedding ? [primary.embedding] : [],
          avatarUri: primary.avatarUri,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
        };
        this.strangerEmbeddingsCache.set(strangerId, matchedStranger);
      }

      const strangerConfidence = Math.max(
        10,
        Math.round(
          (bestStrangerSim >= STRANGER_MATCH_THRESHOLD
            ? bestStrangerSim
            : primary.similarity) * 100,
        ),
      );

      return {
        userId: matchedStranger.id,
        fullName: matchedStranger.fullName,
        code: matchedStranger.code,
        avatarUri: matchedStranger.avatarUri || primary.avatarUri,
        zoneName: 'Khu vực',
        roomName: 'Phòng',
        confidence: strangerConfidence,
        timestamp: timeString,
        status: 'verify',
        boundingBox: primary.detection.boundingBox,
        hasUnverifiedStranger,
      };
    } catch (err) {
      console.warn('[TFLite YOLO] processCapturedFrame error:', err);
      return null;
    } finally {
      this.isProcessingFrame = false;
    }
  }

  private _isWarmingUp: boolean = false;

  public isWarmingUp(): boolean {
    return this._isWarmingUp;
  }

  /**
   * Warm-up room profile embeddings in advance (e.g. on entering room or login)
   */
  public async warmupRoomEmbeddings(
    roomProfiles: UserProfile[],
    onProgress?: (
      current: number,
      total: number,
      profileName?: string,
      isCached?: boolean,
    ) => void,
  ): Promise<void> {
    if (!roomProfiles || roomProfiles.length === 0) {
      onProgress?.(0, 0);
      return;
    }
    if (!this.isInitialized) {
      await this.initModels();
    }
    this._isWarmingUp = true;
    const total = roomProfiles.length;
    let processedCount = 0;
    try {
      for (let i = 0; i < total; i++) {
        const p = roomProfiles[i];
        const sig = this.getProfilePhotoSignature(p);
        const cached = this.profileEmbeddingsCache.get(p.id);
        const isAlreadyCached = Boolean(
          cached && (!sig || cached.signature === sig),
        );

        if (!isAlreadyCached) {
          await this.enrollProfile(p);
          processedCount++;
          // Micro-yield so JS thread and UI animation remain silky smooth
          await new Promise<void>(resolve => setTimeout(resolve, 8));
        }

        onProgress?.(i + 1, total, p.fullName, isAlreadyCached);
      }
    } finally {
      this._isWarmingUp = false;
    }
  }

  /**
   * Match face: strictly requires a valid photoPath on production.
   * If photoPath is missing, returns null instead of false phantom attendance!
   */
  public async matchFaceInRoom(
    detectedBox: BoundingBox,
    roomProfiles: UserProfile[],
    targetUser?: UserProfile,
    photoPath?: string,
    isFrontCamera?: boolean,
  ): Promise<DetectionResult | null> {
    if (!photoPath) {
      return null;
    }
    return this.processCapturedFrame(photoPath, roomProfiles, isFrontCamera);
  }

  /**
   * Simulator detection fallback: when running on simulator with no hardware camera
   */
  public simulateScanDetection(
    roomProfiles: UserProfile[],
  ): DetectionResult | null {
    if (!__DEV__ || roomProfiles.length === 0) return null;
    const timeString = dayjs().format('HH:mm:ss');
    const targetUser = roomProfiles[0];
    const boundingBox: BoundingBox = {
      x: 26,
      y: 18,
      width: 48,
      height: 52,
    };
    return {
      userId: targetUser.id,
      fullName: targetUser.fullName,
      code: targetUser.code,
      avatarUri:
        targetUser.avatarUri || (targetUser.photos ? targetUser.photos[0] : ''),
      zoneName: 'Khu vực chính',
      roomName: 'Phòng hiện tại',
      confidence: 96,
      timestamp: timeString,
      status: 'present',
      boundingBox,
    };
  }

  /**
   * Computes the Cosine Similarity between two L2-normalized embedding vectors:
   * CosineSimilarity = dot(A, B) / (||A|| * ||B||)
   */
  public calculateCosineSimilarity(
    vecA: Float32Array | number[],
    vecB: Float32Array | number[],
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Helper to normalize a vector by its L2 norm
   */
  private l2Normalize(vec: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    const sqrtNorm = Math.sqrt(norm) || 1;
    const normalized = new Float32Array(vec.length);
    for (let i = 0; i < vec.length; i++) {
      normalized[i] = vec[i] / sqrtNorm;
    }
    return normalized;
  }

  /**
   * Deterministic embedding generator (512-dimensional L2-normalized float vector)
   */
  /* eslint-disable no-bitwise */
  private generateDeterministicEmbedding(seedStr: string): Float32Array {
    const dim = 512;
    const vec = new Float32Array(dim);

    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    /* eslint-enable no-bitwise */

    let norm = 0;
    for (let i = 0; i < dim; i++) {
      const val = Math.sin(hash + i * 13.37);
      vec[i] = val;
      norm += val * val;
    }

    // L2 Normalize
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dim; i++) {
      vec[i] /= sqrtNorm;
    }

    return vec;
  }

  /**
   * Generates dynamic bounding box for YOLOv8 face targeting fallback
   */
  public generateBoundingBox(): BoundingBox {
    return {
      x: 23,
      y: 16,
      width: 32,
      height: 48,
    };
  }

  public isModelReady(): boolean {
    return this.isInitialized;
  }

  // --- Static Compatibility Delegates ---
  public static async initialize(): Promise<boolean> {
    return this.getInstance().initModels();
  }

  public static async enrollProfile(profile: UserProfile): Promise<void> {
    return this.getInstance().enrollProfile(profile);
  }

  public static async matchFaceInRoom(
    detectedBox: BoundingBox,
    roomProfiles: UserProfile[],
    targetUser?: UserProfile,
    photoPath?: string,
    isFrontCamera?: boolean,
  ): Promise<DetectionResult | null> {
    return this.getInstance().matchFaceInRoom(
      detectedBox,
      roomProfiles,
      targetUser,
      photoPath,
      isFrontCamera,
    );
  }

  public static async processCapturedFrame(
    photoPath: string,
    roomProfiles: UserProfile[],
    isFrontCamera?: boolean,
    minConfidenceThreshold?: number,
    allProfiles?: UserProfile[],
  ): Promise<DetectionResult | null> {
    return this.getInstance().processCapturedFrame(
      photoPath,
      roomProfiles,
      isFrontCamera,
      minConfidenceThreshold,
      allProfiles,
    );
  }

  public static async warmupRoomEmbeddings(
    roomProfiles: UserProfile[],
    onProgress?: (
      current: number,
      total: number,
      profileName?: string,
      isCached?: boolean,
    ) => void,
  ): Promise<void> {
    return this.getInstance().warmupRoomEmbeddings(roomProfiles, onProgress);
  }

  public static isWarmingUp(): boolean {
    return this.getInstance().isWarmingUp();
  }

  public static simulateScanDetection(
    roomProfiles: UserProfile[],
  ): DetectionResult | null {
    return this.getInstance().simulateScanDetection(roomProfiles);
  }

  public static calculateCosineSimilarity(
    vecA: Float32Array | number[],
    vecB: Float32Array | number[],
  ): number {
    return this.getInstance().calculateCosineSimilarity(vecA, vecB);
  }

  public static generateBoundingBox(): BoundingBox {
    return this.getInstance().generateBoundingBox();
  }

  public static invalidateProfileCache(profileId: string): void {
    this.getInstance().invalidateProfileCache(profileId);
  }

  public clearStrangerCache(): void {
    this.strangerEmbeddingsCache.clear();
    this.strangerSequenceCounter = 0;
  }

  public removeStranger(strangerId: string): void {
    this.strangerEmbeddingsCache.delete(strangerId);
  }

  public getStrangersCount(): number {
    return this.strangerEmbeddingsCache.size;
  }

  // --- Static Compatibility Delegates ---
  public static clearStrangerCache(): void {
    this.getInstance().clearStrangerCache();
  }

  public static removeStranger(strangerId: string): void {
    this.getInstance().removeStranger(strangerId);
  }

  public static isModelReady(): boolean {
    return this.getInstance().isModelReady();
  }

  public static getStrangersCount(): number {
    return this.getInstance().getStrangersCount();
  }
}

export const tfliteYoloService = TfliteYoloService.getInstance();
