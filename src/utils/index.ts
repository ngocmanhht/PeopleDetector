import { HOST_DOMAIN, API_URL } from '@env';

class AppUtils {
  getUrlImage = (url?: string | null): string | undefined => {
    if (!url) return undefined;

    const isAbsoluteUrl =
      url.startsWith('http://') || url.startsWith('https://');

    if (isAbsoluteUrl) return url;

    if (
      url.startsWith('file://') ||
      url.startsWith('data:') ||
      url.startsWith('content://') ||
      url.startsWith('ph://') ||
      url.startsWith('/var/') ||
      url.startsWith('/private/') ||
      url.startsWith('/Users/') ||
      url.startsWith('/data/') ||
      url.startsWith('/storage/')
    ) {
      return url;
    }

    // Xác định host domain: ưu tiên HOST_DOMAIN, fallback tự suy ra từ API_URL (bỏ /api)
    let host = (HOST_DOMAIN || 'http://192.168.1.4:3000').trim();
    if (!host && API_URL) {
      host = API_URL.replace(/\/api\/?$/, '').trim();
    }

    if (!host) return url;

    const cleanHost = host.replace(/\/+$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${cleanHost}${cleanPath}`;
  };
}

export const appUtils = new AppUtils();
