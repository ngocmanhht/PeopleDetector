/**
 * Configuration for user profile photos
 * Configurable photo limits and image compression quality
 */
export const PHOTO_CONFIG = {
  MAX_PHOTOS_PER_USER: 10,
  IMAGE_QUALITY: 0.8,
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
} as const;

export type PhotoConfig = typeof PHOTO_CONFIG;
