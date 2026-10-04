import { apiClient } from '../axios-services';
import { createMMKV } from 'react-native-mmkv';

const settingStorage = createMMKV({ id: 'app-system-settings' });

export interface UserCodeFormatConfig {
  format: string; // e.g. "AA-BB-{INDEX}" or "HV-{YYYY}-{INDEX}"
  currentIndex?: number;
  nextCode?: string;
}

export class SettingService {
  private static instance: SettingService;

  private constructor() {}

  public static getInstance(): SettingService {
    if (!SettingService.instance) {
      SettingService.instance = new SettingService();
    }
    return SettingService.instance;
  }

  /**
   * Retrieves the configured code format from backend, or local cache
   */
  public async getUserCodeFormat(): Promise<UserCodeFormatConfig> {
    try {
      const res = await apiClient.get<{ success: boolean; data: UserCodeFormatConfig }>(
        '/settings/user-code-format',
      );
      if (res?.data) {
        settingStorage.set('user_code_format', res.data.format || 'AA-BB-{INDEX}');
        return res.data;
      }
    } catch {
      // Offline fallback
    }

    const cachedFormat = settingStorage.getString('user_code_format') || 'AA-BB-{INDEX}';
    return { format: cachedFormat };
  }

  /**
   * Generates next user code based on current format and total enrolled count
   */
  public async getNextUserCode(existingCount = 0): Promise<string> {
    try {
      const res: any = await apiClient.get(
        '/settings/user-code-format/next-code',
      );
      const code = res?.data?.code || res?.code || res?.data?.nextCode;
      if (code) {
        return code;
      }
    } catch {
      // Offline fallback
    }

    const config = await this.getUserCodeFormat();
    const format = config.format || 'AG-MT-CS2-index';
    const idx = (existingCount + 1).toString().padStart(4, '0');
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const yy = yyyy.slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');

    let result = format.trim();
    result = result
      .replace(/{YYYY}/gi, yyyy)
      .replace(/{YY}/gi, yy)
      .replace(/{MM}/gi, mm)
      .replace(/{DD}/gi, dd);

    if (/{INDEX}/i.test(result)) {
      result = result.replace(/{INDEX}/gi, idx);
    } else if (/\(INDEX\)/i.test(result)) {
      result = result.replace(/\(INDEX\)/gi, idx);
    } else if (/\[INDEX\]/i.test(result)) {
      result = result.replace(/\[INDEX\]/gi, idx);
    } else if (/INDEX/i.test(result)) {
      result = result.replace(/INDEX/gi, idx);
    } else {
      result = `${result}-${idx}`;
    }

    return result;
  }
}

export const settingService = SettingService.getInstance();
