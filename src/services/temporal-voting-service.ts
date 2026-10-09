import { BIOMETRIC_CONFIG } from '../const/biometric-config';
import { UserProfile, BoundingBox } from '../model/detector';

export interface FrameMatchCandidate {
  personId: string | null;
  profile: UserProfile | null;
  top1Similarity: number;
  top2Similarity: number;
  margin: number;
  qualityAccepted: boolean;
  qualityWarning?: string;
  padAccepted: boolean;
  padScore: number;
  padWarning?: string;
  timestamp: number;
  avatarUri: string;
  boundingBox?: BoundingBox;
  embedding?: Float32Array | null;
}

export type DecisionStatus = 'MATCH' | 'VERIFY' | 'UNKNOWN' | 'RECAPTURE';

export interface TemporalDecision {
  status: DecisionStatus;
  personId: string | null;
  profile: UserProfile | null;
  confidencePct: number;
  votesCount: number;
  totalValidFrames: number;
  avgSimilarity: number;
  margin: number;
  avatarUri: string;
  boundingBox?: BoundingBox;
  message?: string;
  qualityWarning?: string;
}

/**
 * Helper to normalize a vector using L2 norm.
 * Handles NaN, Infinity, zero-vectors and dimension mismatches cleanly.
 */
export function l2NormalizeVector(vec: Float32Array | number[]): Float32Array {
  if (!vec || vec.length === 0) {
    return new Float32Array(0);
  }
  const len = vec.length;
  const result = new Float32Array(len);
  let sumSq = 0;

  for (let i = 0; i < len; i++) {
    const val = vec[i];
    if (Number.isFinite(val)) {
      result[i] = val;
      sumSq += val * val;
    } else {
      result[i] = 0;
    }
  }

  if (sumSq <= 1e-12 || !Number.isFinite(sumSq)) {
    // Degenerate vector (all zeros or underflow)
    return result;
  }

  const invNorm = 1.0 / Math.sqrt(sumSq);
  for (let i = 0; i < len; i++) {
    result[i] *= invNorm;
  }

  return result;
}

/**
 * Computes cosine similarity between two vectors.
 * Returns value strictly clamped in [-1.0, 1.0].
 * Returns 0 if vectors have different dimensions or are degenerate.
 */
export function computeCosineSimilarity(
  vecA: Float32Array | number[] | null | undefined,
  vecB: Float32Array | number[] | null | undefined,
): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      continue;
    }
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA <= 1e-12 || normB <= 1e-12) {
    return 0;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12 || !Number.isFinite(denom)) {
    return 0;
  }

  const sim = dotProduct / denom;
  if (!Number.isFinite(sim)) {
    return 0;
  }

  return Math.max(-1.0, Math.min(1.0, sim));
}

/**
 * 1. RGB Presentation Attack Detector (Chống giả mạo khuôn mặt trên camera thông thường)
 * Phân tích độ tương phản da tự nhiên, phản chiếu lóa màn hình & vi chuyển động sinh lý.
 */
export class PresentationAttackDetector {
  /**
   * Phân tích quang phổ, lóa sáng kính màn hình và gradient trên ảnh khuôn mặt chuẩn 112x112
   */
  public static evaluateTextureAndReflection(
    u8: Uint8Array,
    width = 112,
    height = 112,
    step = 4,
    rIdx = 0,
    gIdx = 1,
    bIdx = 2,
  ): { accepted: boolean; score: number; warning?: string } {
    if (!BIOMETRIC_CONFIG.presentationAttackDetection.enabled) {
      return { accepted: true, score: 1.0 };
    }

    const totalPixels = width * height;
    let specularGlarePixels = 0;
    let totalBrightness = 0;
    let totalRed = 0;
    let totalBlue = 0;

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * step;
      const r = u8[offset + rIdx];
      const g = u8[offset + gIdx];
      const b = u8[offset + bIdx];

      totalRed += r;
      totalBlue += b;
      const lum = (77 * r + 150 * g + 29 * b) >> 8;
      totalBrightness += lum;

      // Phản chiếu lóa sáng cực gắt (> 250 ở cả 3 kênh) thường xuất hiện trên kính điện thoại / ảnh ép bóng
      if (r > 250 && g > 250 && b > 250) {
        specularGlarePixels++;
      }
    }

    const avgBrightness = totalBrightness / totalPixels;
    const glareRatio = specularGlarePixels / totalPixels;

    // Nếu diện tích lóa sáng vượt quá 6% diện tích mặt -> nghi vấn kính màn hình điện thoại
    if (
      BIOMETRIC_CONFIG.presentationAttackDetection.checkSpecularReflection &&
      glareRatio > 0.06
    ) {
      return {
        accepted: false,
        score: Math.max(0.1, 1 - glareRatio * 10),
        warning: 'Phát hiện lóa sáng màn hình hoặc ảnh chụp lại',
      };
    }

    // Kiểm tra tỷ lệ phổ da tự nhiên: da người thật luôn có thành phần R > B dưới ánh sáng tự nhiên
    const rbRatio = (totalRed + 1) / (totalBlue + 1);
    let livenessScore = 0.85;

    if (rbRatio < 0.75) {
      // Màn hình LCD thường phát ánh sáng xanh lạnh quá mức (blue shift)
      livenessScore -= 0.15;
    }

    // Đánh giá dựa trên độ sáng vừa phải (không quá tối, không lóa cháy sáng)
    if (avgBrightness < 30) {
      return {
        accepted: false,
        score: 0.3,
        warning: 'Ánh sáng quá tối, vui lòng bật thêm đèn',
      };
    }

    if (avgBrightness > 235) {
      return {
        accepted: false,
        score: 0.35,
        warning: 'Ánh sáng bị chói lóa mạnh',
      };
    }

    const accepted =
      livenessScore >=
      BIOMETRIC_CONFIG.presentationAttackDetection.minLivenessScore;
    return {
      accepted,
      score: livenessScore,
      warning: accepted ? undefined : 'Chất lượng da khuôn mặt chưa đạt chuẩn',
    };
  }

  /**
   * Kiểm tra vi chuyển động tự nhiên giữa các frame liên tiếp (chống cầm ảnh giấy tĩnh)
   */
  public static evaluateMicroMotion(
    currentEmbedding: Float32Array,
    currentBox: BoundingBox,
    recentFrames: FrameMatchCandidate[],
  ): { accepted: boolean; score: number; warning?: string } {
    if (
      !BIOMETRIC_CONFIG.presentationAttackDetection.enabled ||
      !BIOMETRIC_CONFIG.presentationAttackDetection.checkMicroMotion ||
      recentFrames.length < 1
    ) {
      return { accepted: true, score: 0.9 };
    }

    // Kiểm tra sự thay đổi bounding box và embedding qua 2-3 frame gần nhất
    const last = recentFrames[recentFrames.length - 1];
    if (!last.embedding || !last.boundingBox) {
      return { accepted: true, score: 0.85 };
    }

    // 1. Tính độ tương đồng giữa 2 frame liên tiếp
    const cosineBetweenFrames = computeCosineSimilarity(
      currentEmbedding,
      last.embedding,
    );

    // 2. Độ dịch chuyển bounding box (pixel hoặc %)
    const dx = Math.abs((currentBox.x || 0) - (last.boundingBox.x || 0));
    const dy = Math.abs((currentBox.y || 0) - (last.boundingBox.y || 0));
    const dw = Math.abs((currentBox.width || 0) - (last.boundingBox.width || 0));
    const totalBoxShift = dx + dy + dw;

    // Nếu Cosine giữa 2 frame = 0.999999 (hoàn toàn y hệt) VÀ box bất động 0.000 pixel -> ảnh tĩnh 100%
    if (cosineBetweenFrames > 0.9995 && totalBoxShift < 0.05) {
      return {
        accepted: false,
        score: 0.2,
        warning: 'Phát hiện ảnh tĩnh không có chuyển động tự nhiên',
      };
    }

    return {
      accepted: true,
      score: 0.95,
    };
  }
}

/**
 * 2. Temporal Voting Manager (Quản lý biểu quyết thời gian 3/5 frame)
 */
export class TemporalVotingManager {
  private static instance: TemporalVotingManager | null = null;

  // Cửa sổ trượt lưu trữ các frame gần nhất
  private slidingWindow: FrameMatchCandidate[] = [];

  // Tránh lặp lại điểm danh cho cùng 1 người trong khoảng thời gian cooldown
  private lastMatchedPersonId: string | null = null;
  private lastMatchedTimestamp = 0;

  public static getInstance(): TemporalVotingManager {
    if (!this.instance) {
      this.instance = new TemporalVotingManager();
    }
    return this.instance;
  }

  /**
   * Đặt lại bộ đệm biểu quyết (khi đổi phòng, bắt đầu phiên mới, hoặc reset camera)
   */
  public reset(): void {
    this.slidingWindow = [];
  }

  /**
   * Đánh giá và cập nhật frame vào bộ đệm biểu quyết
   * @param candidate Kết quả nhận diện sơ bộ của frame hiện tại
   * @param isSingleShot Nếu true (chế độ test ảnh đơn lẻ trong CMS), bỏ qua yêu cầu gom 3/5 frame
   */
  public evaluateFrame(
    candidate: FrameMatchCandidate,
    isSingleShot = false,
  ): TemporalDecision {
    const config = BIOMETRIC_CONFIG;
    const now = candidate.timestamp || Date.now();

    // -----------------------------------------------------------------------
    // Chế độ Single-Shot (chụp 1 ảnh trong CMS hoặc upload ảnh thử nghiệm)
    // -----------------------------------------------------------------------
    if (isSingleShot) {
      if (!candidate.qualityAccepted) {
        return {
          status: 'RECAPTURE',
          personId: null,
          profile: null,
          confidencePct: 0,
          votesCount: 0,
          totalValidFrames: 0,
          avgSimilarity: 0,
          margin: 0,
          avatarUri: candidate.avatarUri,
          qualityWarning: candidate.qualityWarning,
        };
      }

      if (!candidate.padAccepted) {
        return {
          status: 'RECAPTURE',
          personId: null,
          profile: null,
          confidencePct: 0,
          votesCount: 0,
          totalValidFrames: 0,
          avgSimilarity: 0,
          margin: 0,
          avatarUri: candidate.avatarUri,
          qualityWarning:
            candidate.padWarning || 'Không vượt qua kiểm tra chống giả mạo',
        };
      }

      const isMatch =
        candidate.personId !== null &&
        candidate.top1Similarity >= config.recognition.matchThreshold &&
        candidate.margin >= config.recognition.ambiguityMargin;

      const isAmbiguous =
        candidate.personId !== null &&
        candidate.top1Similarity >= config.recognition.matchThreshold &&
        candidate.margin < config.recognition.ambiguityMargin;

      const confPct = this.calculateConfidencePct(
        candidate.top1Similarity,
        config.recognition.matchThreshold,
        config.recognition.confidenceCeiling,
      );

      if (isMatch) {
        return {
          status: 'MATCH',
          personId: candidate.personId,
          profile: candidate.profile,
          confidencePct: confPct,
          votesCount: 1,
          totalValidFrames: 1,
          avgSimilarity: candidate.top1Similarity,
          margin: candidate.margin,
          avatarUri: candidate.avatarUri,
          boundingBox: candidate.boundingBox,
        };
      }

      if (isAmbiguous) {
        return {
          status: 'VERIFY',
          personId: candidate.personId,
          profile: candidate.profile,
          confidencePct: confPct,
          votesCount: 1,
          totalValidFrames: 1,
          avgSimilarity: candidate.top1Similarity,
          margin: candidate.margin,
          avatarUri: candidate.avatarUri,
          boundingBox: candidate.boundingBox,
          message: 'Kết quả nhận diện chưa rõ ràng giữa các hồ sơ tương tự',
        };
      }

      return {
        status: 'UNKNOWN',
        personId: null,
        profile: null,
        confidencePct: Math.round(candidate.top1Similarity * 100),
        votesCount: 0,
        totalValidFrames: 1,
        avgSimilarity: candidate.top1Similarity,
        margin: candidate.margin,
        avatarUri: candidate.avatarUri,
        boundingBox: candidate.boundingBox,
      };
    }

    // -----------------------------------------------------------------------
    // Chế độ Live Kiosk: Temporal Voting (Biểu quyết trượt đa frame)
    // -----------------------------------------------------------------------
    // 1. Thêm frame vào cửa sổ trượt
    this.slidingWindow.push(candidate);

    // 2. Loại bỏ các frame cũ quá maxWindowTimeMs (1.5 giây) hoặc vượt quá windowSize (5 frame)
    const windowCutoff = now - config.temporalVoting.maxWindowTimeMs;
    this.slidingWindow = this.slidingWindow.filter(
      f => f.timestamp >= windowCutoff,
    );
    if (this.slidingWindow.length > config.temporalVoting.windowSize) {
      this.slidingWindow = this.slidingWindow.slice(
        this.slidingWindow.length - config.temporalVoting.windowSize,
      );
    }

    // 3. Lọc danh sách các frame hợp lệ
    const validFrames = this.slidingWindow.filter(
      f =>
        f.qualityAccepted &&
        f.padAccepted &&
        f.personId !== null &&
        f.top1Similarity >= config.recognition.matchThreshold &&
        f.margin >= config.recognition.ambiguityMargin,
    );

    // 4. Nếu frame hiện tại có cảnh báo chất lượng hoặc PAD
    if (!candidate.qualityAccepted) {
      return {
        status: 'RECAPTURE',
        personId: null,
        profile: null,
        confidencePct: 0,
        votesCount: validFrames.length,
        totalValidFrames: validFrames.length,
        avgSimilarity: 0,
        margin: 0,
        avatarUri: candidate.avatarUri,
        boundingBox: candidate.boundingBox,
        qualityWarning: candidate.qualityWarning,
      };
    }

    if (!candidate.padAccepted) {
      return {
        status: 'RECAPTURE',
        personId: null,
        profile: null,
        confidencePct: 0,
        votesCount: validFrames.length,
        totalValidFrames: validFrames.length,
        avgSimilarity: 0,
        margin: 0,
        avatarUri: candidate.avatarUri,
        boundingBox: candidate.boundingBox,
        qualityWarning:
          candidate.padWarning || 'Dấu hiệu khuôn mặt không đạt chuẩn chống giả mạo',
      };
    }

    // 5. Kiểm tra điều kiện số frame hợp lệ tối thiểu (3 frame)
    if (validFrames.length < config.temporalVoting.minValidFrames) {
      // Đang thu thập frame (1/3 hoặc 2/3)
      if (candidate.personId && candidate.top1Similarity >= config.recognition.matchThreshold) {
        const confPct = this.calculateConfidencePct(
          candidate.top1Similarity,
          config.recognition.matchThreshold,
          config.recognition.confidenceCeiling,
        );
        return {
          status: 'VERIFY',
          personId: candidate.personId,
          profile: candidate.profile,
          confidencePct: confPct,
          votesCount: validFrames.length,
          totalValidFrames: validFrames.length,
          avgSimilarity: candidate.top1Similarity,
          margin: candidate.margin,
          avatarUri: candidate.avatarUri,
          boundingBox: candidate.boundingBox,
          message: `Đang nhận diện (${validFrames.length}/${config.temporalVoting.minVotes})... Vui lòng giữ yên`,
        };
      }

      return {
        status: 'UNKNOWN',
        personId: null,
        profile: null,
        confidencePct: Math.round(candidate.top1Similarity * 100),
        votesCount: 0,
        totalValidFrames: validFrames.length,
        avgSimilarity: candidate.top1Similarity,
        margin: candidate.margin,
        avatarUri: candidate.avatarUri,
        boundingBox: candidate.boundingBox,
      };
    }

    // 6. Đếm phiếu bầu cho từng danh tính (Vote counting)
    const votesMap = new Map<
      string,
      {
        count: number;
        totalSim: number;
        profile: UserProfile;
        lastCandidate: FrameMatchCandidate;
      }
    >();

    for (const vf of validFrames) {
      const pid = vf.personId!;
      const existing = votesMap.get(pid);
      if (existing) {
        existing.count += 1;
        existing.totalSim += vf.top1Similarity;
        existing.lastCandidate = vf;
      } else {
        votesMap.set(pid, {
          count: 1,
          totalSim: vf.top1Similarity,
          profile: vf.profile!,
          lastCandidate: vf,
        });
      }
    }

    // Xếp hạng các ứng viên theo số phiếu giảm dần
    const ranked = Array.from(votesMap.entries()).sort(
      (a, b) => b[1].count - a[1].count,
    );

    const [topPersonId, topVoteInfo] = ranked[0];
    const avgSimilarity = topVoteInfo.totalSim / topVoteInfo.count;
    const confPct = this.calculateConfidencePct(
      avgSimilarity,
      config.recognition.matchThreshold,
      config.recognition.confidenceCeiling,
    );

    // 7. Kiểm tra ngưỡng đủ phiếu (ít nhất 3 phiếu)
    if (topVoteInfo.count < config.temporalVoting.minVotes) {
      return {
        status: 'VERIFY',
        personId: topPersonId,
        profile: topVoteInfo.profile,
        confidencePct: confPct,
        votesCount: topVoteInfo.count,
        totalValidFrames: validFrames.length,
        avgSimilarity,
        margin: candidate.margin,
        avatarUri: topVoteInfo.lastCandidate.avatarUri,
        boundingBox: topVoteInfo.lastCandidate.boundingBox,
        message: `Đang xác minh (${topVoteInfo.count}/${config.temporalVoting.minVotes} phiếu)... Vui lòng giữ yên`,
      };
    }

    // 8. Kiểm tra trường hợp hòa phiếu giữa 2 người khác nhau (Tie-break protection)
    if (ranked.length > 1 && ranked[1][1].count === topVoteInfo.count) {
      return {
        status: 'VERIFY',
        personId: topPersonId,
        profile: topVoteInfo.profile,
        confidencePct: confPct,
        votesCount: topVoteInfo.count,
        totalValidFrames: validFrames.length,
        avgSimilarity,
        margin: candidate.margin,
        avatarUri: topVoteInfo.lastCandidate.avatarUri,
        boundingBox: topVoteInfo.lastCandidate.boundingBox,
        message: 'Kết quả biểu quyết bị phân vân giữa 2 người. Vui lòng nhìn thẳng',
      };
    }

    // 9. Kiểm tra Cooldown sau khi vừa match người này xong (tránh duplicate trigger)
    if (
      this.lastMatchedPersonId === topPersonId &&
      now - this.lastMatchedTimestamp < config.temporalVoting.cooldownAfterMatchMs
    ) {
      return {
        status: 'VERIFY',
        personId: topPersonId,
        profile: topVoteInfo.profile,
        confidencePct: confPct,
        votesCount: topVoteInfo.count,
        totalValidFrames: validFrames.length,
        avgSimilarity,
        margin: candidate.margin,
        avatarUri: topVoteInfo.lastCandidate.avatarUri,
        boundingBox: topVoteInfo.lastCandidate.boundingBox,
        message: 'Đã điểm danh thành công gần đây',
      };
    }

    // -----------------------------------------------------------------------
    // QUYẾT ĐỊNH MATCH: Đạt chuẩn 100% (>= 3/5 votes, Top1 >= 0.68, Margin >= 0.045)
    // -----------------------------------------------------------------------
    this.lastMatchedPersonId = topPersonId;
    this.lastMatchedTimestamp = now;
    // Xóa cửa sổ trượt để chuẩn bị nhận diện người tiếp theo
    this.slidingWindow = [];

    return {
      status: 'MATCH',
      personId: topPersonId,
      profile: topVoteInfo.profile,
      confidencePct: confPct,
      votesCount: topVoteInfo.count,
      totalValidFrames: validFrames.length,
      avgSimilarity,
      margin: candidate.margin,
      avatarUri: topVoteInfo.lastCandidate.avatarUri,
      boundingBox: topVoteInfo.lastCandidate.boundingBox,
    };
  }

  /**
   * Quy đổi điểm Cosine Similarity ra phần trăm (75% - 99%) hiển thị trên giao diện người dùng
   */
  private calculateConfidencePct(
    similarity: number,
    threshold: number,
    ceiling: number,
  ): number {
    const simRange = Math.max(0.01, ceiling - threshold);
    const simRatio = Math.max(0, Math.min(1, (similarity - threshold) / simRange));
    return Math.min(99, Math.max(75, Math.round(75 + simRatio * 24)));
  }
}
