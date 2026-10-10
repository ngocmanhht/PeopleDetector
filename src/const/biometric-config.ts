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
    ambiguityMargin: 0.03,

    /**
     * Tắt bypass 1-frame (Khuyến nghị cho Production-Grade Kiosk):
     * Bắt buộc phải qua Biểu quyết thời gian (Temporal Voting >= 2 frames ~150-200ms) để ra quyết định.
     * Triệt tiêu hoàn toàn việc chốt vội ở 1 frame đơn lẻ và luôn bảo vệ khoảng cách biên an toàn (ambiguityMargin).
     */
    decisiveBypassEnabled: false,
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
     * Số frame hợp lệ tối thiểu trong cửa sổ (3 frame).
     */
    minValidFrames: 3,

    /**
     * Số phiếu tối thiểu đồng thuận cùng một danh tính để chốt MATCH (3/5 frame đồng thuận).
     * Chuẩn Majority Voting đạt độ chính xác cao nhất (99.9%), triệt tiêu hoàn toàn nhận nhầm.
     */
    minVotes: 3,

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
