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
     * 0.64 là ngưỡng chuẩn tối ưu thực tế cho MobileFaceNet 512-d giữa camera tablet và ảnh đại diện.
     */
    matchThreshold: 0.64,

    /**
     * Khoảng cách biên an toàn tối thiểu giữa ứng viên Top-1 và Top-2 (Top1.similarity - Top2.similarity).
     * Ngăn ngừa tuyệt đối trường hợp Người A bị nhận nhầm thành Người B khi 2 người có nét mặt gần giống nhau.
     */
    ambiguityMargin: 0.04,

    /**
     * KHÔNG bypass kiểm tra mơ hồ trong bài toán 1:N.
     * Dù độ tương đồng cao (ví dụ 0.75), nếu margin < 0.04 vẫn phải chuyển sang VERIFY để đảm bảo an toàn.
     */
    decisiveBypassEnabled: false,

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
    matchThreshold: 0.65,
  },

  /**
   * 3. Tiêu chuẩn chất lượng khuôn mặt (Face Image Quality Gate)
   */
  imageQuality: {
    /**
     * Ngưỡng độ nét tối thiểu đo bằng phương sai Laplacian trên ROI khuôn mặt.
     * 12.0 là ngưỡng thực tế phù hợp với camera trước của tablet trong nhà, lọc bỏ rung lắc mạnh nhưng không chặn mặt thường.
     */
    minSharpness: 12.0,

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
     * Số frame hợp lệ tối thiểu trong cửa sổ.
     */
    minValidFrames: 2,

    /**
     * Số phiếu tối thiểu đồng thuận cùng một danh tính để chốt MATCH (2 frame đồng thuận).
     * Đảm bảo phản hồi nhanh (~150-250ms) trên tablet mà vẫn lọc bỏ frame nhiễu.
     */
    minVotes: 2,

    /**
     * Thời gian tồn tại tối đa của cửa sổ trượt (1.5 giây).
     */
    maxWindowTimeMs: 1500,

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
    minLivenessScore: 0.50,

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
