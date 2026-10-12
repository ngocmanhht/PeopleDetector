/**
 * CẤU HÌNH SINH TRẮC HỌC & NHẬN DIỆN KHUÔN MẶT TABLET KIOSK (1:N)
 * Tuân thủ tiêu chuẩn NIST và ISO/IEC 30107 cho bài toán nhận diện 1:N trong gallery 500 - 5.000 hồ sơ.
 */
export const BIOMETRIC_CONFIG = {
  /**
   * 1. Cấu hình so khớp nhận diện danh tính (Recognition & 1:N Gallery Matching)
   */
  recognition: {
    /**
     * Điểm Cosine Similarity tối thiểu để Top-1 được coi là khớp danh tính.
     * Nâng nhẹ từ 0.64 lên 0.68 để triệt tiêu tỉ lệ nhận nhầm trong gallery nhiều hồ sơ.
     */
    matchThreshold: 0.68,

    /**
     * Khoảng cách biên an toàn tối thiểu giữa ứng viên Top-1 và Top-2 (Top1.similarity - Top2.similarity).
     * Nâng từ 0.02 lên 0.04 (4% margin): Ngăn ngừa tuyệt đối trường hợp Người A bị nhận nhầm thành Người B
     * khi 2 người có nét mặt gần giống nhau.
     */
    ambiguityMargin: 0.04,

    /**
     * Bật decisive bypass khi độ tin cậy vượt ngưỡng dứt khoát:
     * Nâng lên >= 0.80 (80% cosine) VÀ margin >= 0.04: Chỉ chốt MATCH tức thì ở frame 1 khi cực kỳ chắc chắn,
     * còn lại bắt buộc qua Temporal Voting (2 frame đồng thuận).
     */
    decisiveBypassEnabled: true,
    decisiveThreshold: 0.80,

    /**
     * Mốc trần Cosine Similarity quy đổi ra 99% hiển thị trên giao diện người dùng.
     */
    confidenceCeiling: 0.85,
  },

  /**
   * 2. Cấu hình gom nhóm người lạ trong cùng phiên làm việc (Stranger Clustering)
   */
  strangerClustering: {
    /**
     * Ngưỡng Cosine Similarity để gộp các lần xuất hiện của cùng một người lạ.
     */
    matchThreshold: 0.68,
  },

  /**
   * 3. Tiêu chuẩn chất lượng khuôn mặt (Face Image Quality Gate)
   */
  imageQuality: {
    /**
     * Ngưỡng độ nét tối thiểu đo bằng phương sai Laplacian trên ROI khuôn mặt.
     * Nâng nhẹ lên 15.0 để lọc bỏ các frame rung lắc / nhòe chuyển động gây sai lệch vector đặc trưng.
     */
    minSharpness: 15.0,

    /**
     * Kích thước khuôn mặt tối thiểu trong ảnh làm việc (pixel width & height).
     */
    minFaceSize: 50,

    /**
     * Góc nghiêng đầu tối đa cho phép (Roll degrees).
     * Quá 35 độ sẽ cảnh báo người dùng nhìn thẳng vào camera.
     */
    maxRollDegrees: 35.0,
  },

  /**
   * 4. Biểu quyết theo chuỗi thời gian (Temporal Voting across frames)
   * Thu thập nhiều frame liên tiếp trong 0.5 - 1.5 giây để ra quyết định thay vì chỉ dựa vào 1 frame đơn lẻ.
   */
  temporalVoting: {
    /**
     * Kích thước cửa sổ trượt (thu thập tối đa 5 frame gần nhất).
     */
    windowSize: 5,

    /**
     * Số frame hợp lệ tối thiểu trong cửa sổ (2 frame).
     */
    minValidFrames: 2,

    /**
     * Số phiếu tối thiểu đồng thuận cùng một danh tính để chốt MATCH (2 frame đồng thuận ~180-250ms).
     * Tỷ lệ vàng giữa tốc độ cực nhanh và độ chính xác sinh trắc học cao.
     */
    minVotes: 2,

    /**
     * Thời gian tồn tại tối đa của cửa sổ trượt (2.5 giây).
     * Đảm bảo đủ thời gian gom 2 frame trên CPU tablet mà không bị hết hạn sớm.
     */
    maxWindowTimeMs: 2500,

    /**
     * Khoảng thời gian làm nguội (cooldown) sau khi đã chốt MATCH thành công cho 1 người (3 giây).
     */
    cooldownAfterMatchMs: 3000,
  },

  /**
   * 5. Chống giả mạo khuôn mặt trên camera RGB (Presentation Attack Detection - PAD / Liveness)
   */
  presentationAttackDetection: {
    /**
     * Bật cơ chế kiểm tra chống giả mạo.
     */
    enabled: true,

    /**
     * Điểm tin cậy liveness tối thiểu (0.0 đến 1.0).
     */
    minLivenessScore: 0.5,

    /**
     * Phát hiện phản chiếu lóa sáng (Specular reflection) đặc trưng của kính màn hình điện thoại hoặc giấy bóng.
     */
    checkSpecularReflection: true,

    /**
     * Kiểm tra tính nhất quán và vi chuyển động sinh lý tự nhiên (Micro-motion) qua các frame liên tiếp.
     */
    checkMicroMotion: true,
  },
} as const;

export type BiometricConfig = typeof BIOMETRIC_CONFIG;
