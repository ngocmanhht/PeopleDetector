import { HOST_DOMAIN } from '@env';

class AppUtils {
  getUrlImage = (url?: string | null) => {
    if (!url) return undefined;

    const isAbsoluteUrl =
      url.startsWith('http://') || url.startsWith('https://');

    if (isAbsoluteUrl) return url;

    if (url.startsWith('//')) {
      return url;
    }

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

    if (url.startsWith('/')) {
      const formattedHost = HOST_DOMAIN?.endsWith('/')
        ? HOST_DOMAIN
        : `${HOST_DOMAIN}/`;
      return `${formattedHost}${url.slice(1)}`;
    }

    const formattedHost = HOST_DOMAIN?.endsWith('/')
      ? HOST_DOMAIN
      : `${HOST_DOMAIN}/`;
    return `${formattedHost}${url}`;
  };
}

export const appUtils = new AppUtils();
