import { UserConditionStatus } from '../../model/detector';
import { appColors } from '../../const/app-colors';

export enum CmsSubTab {
  SCAN_STATUS = 'scan_status',
  USER_LIST = 'user_list',
  REPORTS = 'reports',
}

export const STATUS_CONFIG: Record<
  UserConditionStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  normal: {
    label: 'Bình thường',
    bg: appColors.green50,
    text: appColors.green700,
    border: appColors.green200,
  },
  leave: {
    label: 'Nghỉ phép',
    bg: appColors.blue50,
    text: appColors.blue700,
    border: appColors.blue200,
  },
  medical: {
    label: 'Y tế / Khám',
    bg: appColors.amber50,
    text: appColors.amber600,
    border: appColors.amber200,
  },
  warning: {
    label: 'Cảnh báo',
    bg: appColors.red50,
    text: appColors.red700,
    border: appColors.red200,
  },
  suspended: {
    label: 'Đình chỉ',
    bg: appColors.slate100,
    text: appColors.slate700,
    border: appColors.slate300,
  },
};

export const getStatusConfig = (status?: string) => {
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as UserConditionStatus];
  }
  return STATUS_CONFIG.normal;
};
