/**
 * Configuration for user profile photos
 * Configurable photo limits and image compression quality
 */
export const PHOTO_CONFIG = {
  MAX_PHOTOS_PER_USER: 10,
  IMAGE_QUALITY: 0.7,
  MAX_WIDTH: 600,
  MAX_HEIGHT: 600,
} as const;

export type PhotoConfig = typeof PHOTO_CONFIG;
