import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders,
  AxiosHeaders,
  HeadersDefaults,
} from 'axios';
import { StatusCode } from '../const/status-code';
import { API_URL } from '@env';
import { store } from '../store';
import { setToken, logout } from '../store/slices/appSlice';
import { Token } from '../model/token';
import { navigationService } from '../navigation/navigation-service';
import { appScreens } from '../const/app-screens';

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: {
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  }[] = [];

  constructor(baseUrl?: string) {
    const defaultHeaders:
      | RawAxiosRequestHeaders
      | AxiosHeaders
      | Partial<HeadersDefaults> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    this.instance = axios.create({
      baseURL: baseUrl ?? API_URL,
      headers: defaultHeaders,
      timeout: 90000,
    });

    this.setupInterceptors();
  }

  /**
   * Processes the queue of promises created by the request interceptor when the request was delayed
   * due to the token being refreshed.
   */
  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  /**
   * Set up request and response interceptors for the API client.
   * - Request: logs and attaches Authorization: Bearer <accessToken>
   * - Response: unwraps response.data; on 401 Unauthorized, automatically calls /auth/refresh
   *   with refreshToken, updates token in Redux, and replays pending queue.
   */
  private setupInterceptors() {
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        try {
          const token = store.getState().app.token?.accessToken;
          if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
          }
        } catch (e) {
          // If store is not initialized yet, proceed
        }

        console.log(
          `[Request] ${config.method?.toUpperCase()} ${config.url}`,
          config.params || config.data || '',
        );
        return config;
      },
      error => Promise.reject(error),
    );

    this.instance.interceptors.response.use(
      response => {
        console.log(
          `[Response] ${response.status} ${response.config.url}`,
          response.data,
        );
        return response.data;
      },
      async error => {
        const originalRequest = error?.config;
        const status = error?.response?.status;
        const data = error?.response?.data;

        // Auto Refresh Token on 401 UNAUTHORIZED
        if (
          (status === StatusCode.UNAUTHORIZED || status === 401) &&
          originalRequest &&
          !originalRequest._retry
        ) {
          // If this was already a refresh request that failed, logout immediately
          if (originalRequest.url?.includes('/auth/refresh')) {
            store.dispatch(logout());
            navigationService.reset(appScreens.Authentication);
            return Promise.reject(new Error('Phiên đăng nhập đã hết hạn'));
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({
                resolve: (token: string) => {
                  originalRequest.headers.set(
                    'Authorization',
                    `Bearer ${token}`,
                  );
                  resolve(this.instance(originalRequest));
                },
                reject,
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const currentRefreshToken =
              store.getState().app.token?.refreshToken;
            if (!currentRefreshToken) {
              store.dispatch(logout());
              navigationService.reset(appScreens.Authentication);
              return Promise.reject(new Error('Không tìm thấy refresh token'));
            }

            const refreshBaseUrl = this.instance.defaults.baseURL || API_URL;
            const refreshUrl = refreshBaseUrl.endsWith('/')
              ? `${refreshBaseUrl}auth/refresh`
              : `${refreshBaseUrl}/auth/refresh`;

            const response = await axios.post(refreshUrl, {
              refreshToken: currentRefreshToken,
              refresh_token: currentRefreshToken,
            });

            const newAccessToken =
              response.data?.accessToken || response.data?.access_token;
            const newRefreshToken =
              response.data?.refreshToken ||
              response.data?.refresh_token ||
              currentRefreshToken;

            if (!newAccessToken) {
              throw new Error('Phản hồi refresh token không hợp lệ');
            }

            const newToken: Token = {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            };

            store.dispatch(setToken(newToken));
            this.processQueue(null, newAccessToken);
            originalRequest.headers.set(
              'Authorization',
              `Bearer ${newAccessToken}`,
            );
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            store.dispatch(logout());
            navigationService.reset(appScreens.Authentication);
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        let networkError: Error;
        switch (status) {
          case StatusCode.FAILED_VALIDATION:
          case 422:
            const firstField = Object.keys(data?.errors || {})[0];
            const errorMessage =
              data?.errors?.[firstField]?.[0] || data?.message;
            networkError = new Error(errorMessage ?? 'Dữ liệu không hợp lệ');
            break;
          case StatusCode.INTERNAL_SERVER_ERROR:
          case 500:
            networkError = new Error(data?.message ?? 'Lỗi máy chủ');
            break;
          default:
            networkError = new Error(data?.message ?? 'Có lỗi xảy ra');
            break;
        }
        return Promise.reject(networkError);
      },
    );
  }

  public async get<T = any>(path: string, params?: unknown): Promise<T> {
    return (await this.instance.get(path, { params })) as T;
  }

  public async post<T = any>(path: string, data?: unknown): Promise<T> {
    return (await this.instance.post(path, data)) as T;
  }

  public async postFormData<T = any>(
    path: string,
    formData: FormData,
  ): Promise<T> {
    return (await this.instance.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })) as T;
  }

  public async put<T = any>(path: string, data?: unknown): Promise<T> {
    return (await this.instance.put(path, data)) as T;
  }

  public async patch<T = any>(path: string, data?: unknown): Promise<T> {
    return (await this.instance.patch(path, data)) as T;
  }

  public async delete<T = any>(path: string, params?: unknown): Promise<T> {
    return (await this.instance.delete(path, { params })) as T;
  }
}

// === Export Singleton Instance ===
export const apiClient = new ApiClient();
