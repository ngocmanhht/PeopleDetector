export const appAiModel = {
  YoloV8n: require('../assets/models/yolov8n-face.tflite'),
  MobileFaceNet: require('../assets/models/mobilefacenet.tflite'),
  GhostFaceNet: require('../assets/models/ghostfacenet.tflite'),
} as const;
