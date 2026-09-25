import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  RawAxiosRequestHeaders,
  AxiosHeaders,
  HeadersDefaults,
} from 'axios';
import { StatusCode } from '../const/status-code';
import { Token } from '../model/token';
import { API_URL } from '@env';
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
   *
   * If the refresh token request failed, all promises in the queue are rejected with the error.
   * If the refresh token request succeeded, all promises in the queue are resolved with the new
   * access token.
   *
   * @param {unknown} error The error returned by the refresh token request, or `null` if the request
   *                        was successful.
   * @param {string | null} token The new access token, or `null` if the refresh token request failed.
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
   * The request interceptor logs the request and adds the access token to the request headers.
   * The response interceptor logs the response, returns the response data, and handles errors.
   * If the response status is 401 (Unauthorized), the interceptor attempts to refresh the access token.
   * If the refresh token is invalid or not provided, the interceptor logs out the user and redirects them to the login screen.
   * If the refresh token is valid, the interceptor updates the access token and retries the original request.
   * If the response status is 422 (Failed validation), the interceptor returns the first validation error message.
   * If the response status is 500 (Internal Server Error) or any other unexpected status, the interceptor returns a generic error message.
   */
  private setupInterceptors() {
    this.instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        console.log(
          `[Request] ${config.method?.toUpperCase()} ${config.url}`,
          config,
        );
        // const token = rootStore.sessionStore.token?.accessToken;

        // if (token) {
        //   config.headers.set('Authorization', `Bearer ${token}`);
        // }
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

        // if (status === StatusCode.UNAUTHORIZED && !originalRequest._retry) {
        //   if (this.isRefreshing) {
        //     return new Promise((resolve, reject) => {
        //       this.failedQueue.push({
        //         resolve: (token: string) => {
        //           originalRequest.headers.Authorization = `Bearer ${token}`;
        //           resolve(this.instance(originalRequest));
        //         },
        //         reject,
        //       });
        //     });
        //   }

        //   originalRequest._retry = true;
        //   this.isRefreshing = true;

        //   try {
        //     const refreshToken = rootStore.sessionStore.token?.refreshToken;
        //     if (!refreshToken) {
        //       navigationService.reset(appScreens.Authentication);
        //       await rootStore.sessionStore.logout();
        //       return Promise.reject(new Error('No refresh token'));
        //     }

        //     const response = await axios.post(`${API_URL}/auth/refresh`, {
        //       refresh_token: refreshToken,
        //     });
        //     const newAccessToken = response.data.access_token;
        //     const newToken: Token = {
        //       accessToken: newAccessToken,
        //       refreshToken: response.data.refresh_token,
        //     };
        //     rootStore.sessionStore.setToken(newToken);
        //     this.processQueue(null, newAccessToken);
        //     originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        //     return this.instance(originalRequest);
        //   } catch (refreshError) {
        //     this.processQueue(refreshError, null);
        //     navigationService.reset(appScreens.Authentication);
        //     rootStore.sessionStore.logout();
        //     return Promise.reject(refreshError);
        //   } finally {
        //     this.isRefreshing = false;
        //   }
        // }

        let networkError: Error;
        switch (status) {
          case StatusCode.FAILED_VALIDATION:
            const firstField = Object.keys(data?.errors || {})[0];
            const errorMessage = data?.errors?.[firstField]?.[0];
            networkError = new Error(errorMessage ?? 'Failed validation');
            break;
          case StatusCode.INTERNAL_SERVER_ERROR:
            networkError = new Error(data?.message ?? 'Server error');
            break;
          default:
            networkError = new Error(data?.message ?? 'Something went wrong');
            break;
        }
        return Promise.reject(networkError);
      },
    );
  }

  public async get(path: string, params?: unknown) {
    return await this.instance.get(path, { params });
  }

  public async post(path: string, data?: unknown) {
    return this.instance.post(path, data);
  }

  public async postFormData(path: string, formData: FormData) {
    return await this.instance.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  public async put(path: string, data?: unknown) {
    return this.instance.put(path, data);
  }

  public async delete(path: string, params?: unknown) {
    return this.instance.delete(path, { params });
  }
}

// === Export Singleton Instance ===
export const apiClient = new ApiClient();
