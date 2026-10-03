import * as XLSX from 'xlsx';
import Share from 'react-native-share';
import dayjs from 'dayjs';
import { AttendanceSession, Room, UserProfile, Zone } from '../model/detector';

export interface MonthlyExportOptions {
  month: number; // 1 - 12
  year: number; // e.g. 2026
  roomId?: string; // Optional: filter by room
  userType?: 'all' | 'official' | 'visitor'; // Optional: filter by user type
  zones: Zone[];
  rooms: Room[];
  userProfiles: UserProfile[];
  sessions: AttendanceSession[];
}

export const getConditionStatusLabel = (status?: string): string => {
  switch (status) {
    case 'normal':
      return 'Bình thường';
    case 'leave':
      return 'Nghỉ phép / Tạm vắng';
    case 'medical':
      return 'Kiểm tra y tế';
    case 'warning':
      return 'Cảnh báo / Vi phạm';
    case 'suspended':
      return 'Đình chỉ';
    default:
      return status || 'Bình thường';
  }
};

export const exportMonthlyAttendanceExcel = async ({
  month,
  year,
  roomId,
  userType = 'all',
  zones,
  rooms,
  userProfiles,
  sessions,
}: MonthlyExportOptions): Promise<{ success: boolean; message?: string }> => {
  try {
    const formattedMonth = String(month).padStart(2, '0');
    const monthYearFilter = `${formattedMonth}-${year}`;
    const monthYearSlash = `${formattedMonth}/${year}`;

    // Filter sessions belonging to the specified month/year and room
    const monthlySessions = sessions.filter(s => {
      const matchRoom = !roomId || s.roomId === roomId;
      // s.createdAt or s.startTime can be "DD/MM/YYYY" or "HH:mm DD-MM-YYYY" or ISO
      const dateStr = s.startTime || s.createdAt || '';
      const matchDate =
        dateStr.includes(monthYearFilter) ||
        dateStr.includes(monthYearSlash) ||
        dateStr.includes(`${year}-${formattedMonth}`);
      return matchRoom && matchDate;
    });

    // Users to export with userType filter
    let targetUsers = roomId
      ? userProfiles.filter(u => u.roomId === roomId)
      : userProfiles;

    if (userType === 'official') {
      targetUsers = targetUsers.filter(u => !u.isVisitor);
    } else if (userType === 'visitor') {
      targetUsers = targetUsers.filter(u => !!u.isVisitor);
    }

    // ==========================================
    // 1. SHEET 1: TỔNG HỢP CHUYÊN CẦN THÁNG
    // ==========================================
    const summaryRows: any[][] = [
      [`BÁO CÁO ĐIỂM DANH & NHÂN SỰ THÁNG ${monthYearSlash}`],
      [`Thời gian xuất báo cáo: ${dayjs().format('HH:mm:ss DD/MM/YYYY')}`],
      [
        `Tổng số nhân sự: ${targetUsers.length} | Tổng số phiên trong tháng: ${
          monthlySessions.length
        } | Phân loại: ${
          userType === 'official'
            ? 'Chính thức'
            : userType === 'visitor'
            ? 'Thân nhân'
            : 'Tất cả'
        }`,
      ],
      [], // Empty row
      [
        'STT',
        'Loại đối tượng',
        'Mã Nhân sự/HV',
        'Họ và tên',
        'Người được thân nhân',
        'Phòng ban/Lớp',
        'Khu vực',
        'Tình trạng CMS',
        'Ghi chú tình trạng',
        'Số buổi có mặt',
        'Số buổi thiếu/vắng',
        'Tỷ lệ chuyên cần (%)',
      ],
    ];

    targetUsers.forEach((user, index) => {
      const room = rooms.find(r => r.id === user.roomId);
      const zone = zones.find(z => z.id === user.zoneId);

      // Count attendance in monthly sessions
      let attendedCount = 0;
      let missingCount = 0;

      monthlySessions.forEach(session => {
        // If session was for this room or user participated
        const record = session.attendanceMap?.[user.id];
        if (record && record.status === 'present') {
          attendedCount++;
        } else if (session.roomId === user.roomId) {
          missingCount++;
        }
      });

      const totalRelevantSessions = attendedCount + missingCount;
      const rate =
        totalRelevantSessions > 0
          ? Math.round((attendedCount / totalRelevantSessions) * 100)
          : monthlySessions.length > 0
          ? 0
          : 100;

      const visitedName = user.isVisitor
        ? user.visitedProfile
          ? `${user.visitedProfile.fullName} (${user.visitedProfile.code})`
          : userProfiles.find(v => v.id === user.visitedProfileId)
          ? `${
              userProfiles.find(v => v.id === user.visitedProfileId)?.fullName
            } (${userProfiles.find(v => v.id === user.visitedProfileId)?.code})`
          : '-'
        : '-';

      summaryRows.push([
        index + 1,
        user.isVisitor ? 'Thân nhân' : 'Chính thức',
        user.code,
        user.fullName,
        visitedName,
        room?.name || 'Chưa gán phòng',
        zone?.name || 'Chưa gán khu',
        getConditionStatusLabel(user.conditionStatus),
        user.conditionNote || '',
        attendedCount,
        missingCount,
        `${rate}%`,
      ]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!cols'] = [
      { wch: 6 }, // STT
      { wch: 18 }, // Loại đối tượng
      { wch: 16 }, // Mã
      { wch: 26 }, // Họ tên
      { wch: 28 }, // Người được thăm
      { wch: 22 }, // Phòng
      { wch: 20 }, // Khu
      { wch: 22 }, // Tình trạng
      { wch: 30 }, // Ghi chú
      { wch: 16 }, // Có mặt
      { wch: 18 }, // Thiếu
      { wch: 22 }, // Tỷ lệ
    ];

    // ==========================================
    // 2. SHEET 2: CHI TIẾT CÁC PHIÊN ĐIỂM DANH
    // ==========================================
    const detailRows: any[][] = [
      [`CHI TIẾT LỊCH SỬ ĐIỂM DANH THÁNG ${monthYearSlash}`],
      [],
      [
        'STT',
        'Loại đối tượng',
        'Người được thân nhân',
        'Tên phiên điểm danh',
        'Phòng',
        'Khu vực',
        'Thời gian phiên',
        'Mã Nhân sự/HV',
        'Họ và tên',
        'Trạng thái điểm danh',
        'Thời gian ghi nhận',
        'Độ tin cậy AI (%)',
      ],
    ];

    let detailIndex = 1;
    monthlySessions.forEach(session => {
      const room = rooms.find(r => r.id === session.roomId);
      const zone = zones.find(z => z.id === session.zoneId);

      // List of users who attended or should have attended
      const roomUsers = targetUsers.filter(u => u.roomId === session.roomId);
      roomUsers.forEach(user => {
        const record = session.attendanceMap?.[user.id];
        const statusText =
          record?.status === 'present'
            ? 'Đã có mặt'
            : record?.status === 'verify'
            ? 'Cần xác minh'
            : 'Vắng mặt';
        const recordTime = record?.timestamp || '-';
        const confidenceText =
          record?.confidence !== undefined
            ? `${
                record.confidence > 1
                  ? Math.round(record.confidence)
                  : Math.round(record.confidence * 100)
              }%`
            : '-';

        const visitedName = user.isVisitor
          ? user.visitedProfile
            ? `${user.visitedProfile.fullName} (${user.visitedProfile.code})`
            : userProfiles.find(v => v.id === user.visitedProfileId)
            ? `${
                userProfiles.find(v => v.id === user.visitedProfileId)?.fullName
              } (${
                userProfiles.find(v => v.id === user.visitedProfileId)?.code
              })`
            : '-'
          : '-';

        detailRows.push([
          detailIndex++,
          user.isVisitor ? 'Thân nhân' : 'Chính thức',
          visitedName,
          session.name,
          session.roomName || room?.name || 'Phòng',
          session.zoneName || zone?.name || 'Khu',
          session.startTime,
          user.code,
          user.fullName,
          statusText,
          recordTime,
          confidenceText,
        ]);
      });
    });

    const detailWs = XLSX.utils.aoa_to_sheet(detailRows);
    detailWs['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 28 },
      { wch: 26 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
    ];

    // ==========================================
    // 3. SHEET 3: NHẬT KÝ CẬP NHẬT TÌNH TRẠNG CMS (AUDIT LOGS)
    // ==========================================
    const logRows: any[][] = [
      ['NHẬT KÝ CẬP NHẬT TÌNH TRẠNG NHÂN SỰ (CMS AUDIT LOGS)'],
      [],
      [
        'STT',
        'Mã Nhân sự/HV',
        'Họ và tên',
        'Thời gian cập nhật',
        'Tình trạng trước',
        'Tình trạng mới',
        'Người thực hiện',
        'Ghi chú / Lý do',
      ],
    ];

    let logIndex = 1;
    targetUsers.forEach(user => {
      if (Array.isArray(user.statusLogs)) {
        user.statusLogs.forEach(log => {
          logRows.push([
            logIndex++,
            user.code,
            user.fullName,
            log.timestamp,
            getConditionStatusLabel(log.oldStatus),
            getConditionStatusLabel(log.newStatus),
            log.updatedBy,
            log.note,
          ]);
        });
      }
    });

    const logWs = XLSX.utils.aoa_to_sheet(logRows);
    logWs['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 24 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 35 },
    ];

    // Build Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng hợp chuyên cần');
    XLSX.utils.book_append_sheet(wb, detailWs, 'Chi tiết điểm danh');
    XLSX.utils.book_append_sheet(wb, logWs, 'Nhật ký CMS');

    // Generate base64
    const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const filename = `Bao_cao_diem_danh_Thang_${formattedMonth}_${year}.xlsx`;

    // Share / Open
    await Share.open({
      title: `Báo cáo điểm danh & nhân sự Tháng ${monthYearSlash}`,
      filename,
      url: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64Data}`,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    return { success: true };
  } catch (error: any) {
    // User dismissal of the share sheet is not a failure
    if (error?.message?.includes('User did not share')) {
      return { success: true };
    }
    console.log('[exportMonthlyAttendanceExcel] Error:', error);
    return {
      success: false,
      message: error?.message || 'Không thể tạo file báo cáo Excel.',
    };
  }
};
