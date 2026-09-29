import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  X,
  Check,
  Camera,
  Image as ImageIcon,
  Trash2,
  Star,
  UserPlus,
  FlipHorizontal,
  RotateCw,
} from 'lucide-react-native';
import { addUserProfile } from '../../../store/slices/detectorSlice';
import { profileService, uploadService } from '../../../services/api';
import { PHOTO_CONFIG } from '../../../const/photo-config';
import { UploadFolder } from '../../../const/upload-folder';
import { ImagePickerService } from '../../../services/image-picker-service';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  visible,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const { zones, rooms, selectedZoneId, selectedRoomId } = useAppSelector(
    state => state.detector,
  );

  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [zoneId, setZoneId] = useState(selectedZoneId || (zones[0]?.id ?? ''));
  const [roomId, setRoomId] = useState(selectedRoomId || (rooms[0]?.id ?? ''));
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
  const [error, setError] = useState('');

  // Keep zone and room in sync when modal opens
  React.useEffect(() => {
    if (visible) {
      if (selectedZoneId) setZoneId(selectedZoneId);
      if (selectedRoomId) setRoomId(selectedRoomId);
      setCode(prev =>
        prev ? prev : `NS-${Math.floor(1000 + Math.random() * 9000)}`,
      );
    }
  }, [visible, selectedZoneId, selectedRoomId]);

  const roomsInZone = rooms.filter(r => r.zoneId === zoneId);

  // Handle Capture Photo from Camera with front/back camera choice
  const handleCapturePhoto = () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert(
        'Đã đủ ảnh',
        `Tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh cho mỗi người.`,
      );
      return;
    }

    Alert.alert('Chọn Camera', 'Bạn muốn chụp ảnh hồ sơ bằng camera nào?', [
      {
        text: 'Camera sau (Khuyên dùng)',
        onPress: async () => {
          const uri = await ImagePickerService.captureImageWithCamera(
            photos.length,
            'back',
          );
          if (uri) setPhotos(prev => [...prev, uri]);
        },
      },
      {
        text: 'Camera trước (Selfie)',
        onPress: async () => {
          const uri = await ImagePickerService.captureImageWithCamera(
            photos.length,
            'front',
          );
          if (uri) setPhotos(prev => [...prev, uri]);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  // Flip photo horizontally to fix mirrored selfie images
  const handleFlipPhoto = async (index: number) => {
    const currentUri = photos[index];
    if (!currentUri) return;
    const flippedUri = await ImagePickerService.flipImageHorizontal(currentUri);
    setPhotos(prev => {
      const copy = [...prev];
      copy[index] = flippedUri;
      return copy;
    });
  };

  // Rotate photo 90 degrees clockwise
  const handleRotatePhoto = async (index: number) => {
    const currentUri = photos[index];
    if (!currentUri) return;
    const rotatedUri = await ImagePickerService.rotateImage90(currentUri);
    setPhotos(prev => {
      const copy = [...prev];
      copy[index] = rotatedUri;
      return copy;
    });
  };

  // Handle Pick Photos from Library
  const handlePickPhotos = async () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert(
        'Đã đủ ảnh',
        `Tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh cho mỗi người.`,
      );
      return;
    }
    const newUris = await ImagePickerService.pickImagesFromLibrary(
      photos.length,
    );
    if (newUris.length > 0) {
      setPhotos(prev => {
        const combined = [...prev];
        newUris.forEach(u => {
          if (
            !combined.includes(u) &&
            combined.length < PHOTO_CONFIG.MAX_PHOTOS_PER_USER
          ) {
            combined.push(u);
          }
        });
        return combined;
      });
    }
  };

  const handleDeletePhoto = (indexToDelete: number) => {
    setPhotos(prev => prev.filter((_, idx) => idx !== indexToDelete));
    if (selectedAvatarIndex >= indexToDelete && selectedAvatarIndex > 0) {
      setSelectedAvatarIndex(prev => prev - 1);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!code.trim()) {
      setError('Vui lòng nhập mã định danh / mã nhân sự');
      return;
    }
    if (!roomId) {
      setError('Vui lòng chọn Phòng');
      return;
    }

    setIsSubmitting(true);
    try {
      // Tải các ảnh cục bộ lên backend và nhận URL thực tế
      const serverPhotos: string[] = [];
      for (const uri of photos) {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          serverPhotos.push(uri);
        } else if (uri.startsWith('data:image') || uri.length > 500) {
          try {
            const res = await uploadService.uploadBase64(uri, UploadFolder.PROFILES);
            serverPhotos.push(res.url);
          } catch {
            serverPhotos.push(uri);
          }
        } else {
          try {
            const res = await uploadService.uploadImage(uri, UploadFolder.PROFILES);
            serverPhotos.push(res.url);
          } catch {
            serverPhotos.push(uri);
          }
        }
      }

      const mainAvatar =
        serverPhotos.length > 0
          ? serverPhotos[selectedAvatarIndex] || serverPhotos[0]
          : '';

      const newProfileData = {
        fullName: fullName.trim(),
        code: code.trim(),
        zoneId: zoneId || '',
        roomId,
        avatarUri: mainAvatar,
        photos: serverPhotos,
      };

      dispatch(addUserProfile(newProfileData));
      profileService.createProfile(newProfileData).catch(err => {
        console.log('[AddUserModal] Failed to sync profile to BE:', err);
      });

      // Reset fields
      setFullName('');
      setCode('');
      setPhotos([]);
      setSelectedAvatarIndex(0);
      setError('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={[
        'portrait',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
        <View
          style={[styles.modalContent, isPhone && styles.modalContentPhone]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerTitleRow, { flex: 1, paddingRight: 8 }]}>
              <View style={styles.iconWrap}>
                <UserPlus size={20} color={appColors.blue600} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={[styles.title, isPhone && { fontSize: 16 }]}
                  numberOfLines={1}
                >
                  Thêm người
                </AppText>
                <AppText style={styles.subtitle} numberOfLines={1}>
                  Nhập thông tin cá nhân & ảnh nhận diện
                </AppText>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            {/* Photo Section */}
            <View style={styles.photoSection}>
              <View
                style={[
                  styles.photoHeaderRow,
                  isPhone && styles.photoHeaderRowPhone,
                ]}
              >
                <View>
                  <AppText style={styles.sectionLabel}>
                    Ảnh nhận diện ({photos.length}/
                    {PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh)
                  </AppText>
                  <AppText style={styles.sectionDesc}>
                    Chụp hoặc chọn nhiều góc mặt để tăng độ chính xác nhận diện
                  </AppText>
                </View>

                {/* Camera and Gallery buttons */}
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.actionBtnCamera}
                    onPress={handleCapturePhoto}
                    disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
                  >
                    <Camera size={16} color={appColors.white} />
                    <AppText style={styles.actionBtnCameraText}>
                      Chụp ảnh
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnLibrary}
                    onPress={handlePickPhotos}
                    disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
                  >
                    <ImageIcon size={16} color={appColors.blue600} />
                    <AppText style={styles.actionBtnLibraryText}>
                      Chọn ảnh
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Photos Grid / List */}
              {photos.length === 0 ? (
                <View style={styles.emptyPhotoBox}>
                  <ImageIcon size={36} color={appColors.slate300} />
                  <AppText style={styles.emptyPhotoText}>
                    Chưa có ảnh nào. Nhấn "Chụp ảnh" hoặc "Chọn ảnh" (tối đa{' '}
                    {PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh)
                  </AppText>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosScroll}
                >
                  <View style={styles.photosRow}>
                    {photos.map((uri, idx) => {
                      const isMain = idx === selectedAvatarIndex;
                      return (
                        <View key={`${uri}-${idx}`} style={styles.photoCard}>
                          <Image source={{ uri }} style={styles.photoThumb} />

                          {/* Main badge or Set Main */}
                          {isMain ? (
                            <View style={styles.mainBadge}>
                              <Star size={10} color={appColors.white} />
                              <AppText style={styles.mainBadgeText}>
                                Chính
                              </AppText>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.setMainBtn}
                              onPress={() => setSelectedAvatarIndex(idx)}
                              activeOpacity={0.8}
                            >
                              <AppText style={styles.setMainText}>
                                Đặt chính
                              </AppText>
                            </TouchableOpacity>
                          )}

                          {/* Delete button */}
                          <TouchableOpacity
                            style={styles.deletePhotoBtn}
                            onPress={() => handleDeletePhoto(idx)}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={12} color={appColors.red600} />
                          </TouchableOpacity>

                          {/* Bottom Action Tools: Flip and Rotate */}
                          <View style={styles.photoBottomTools}>
                            <TouchableOpacity
                              style={styles.toolIconBtn}
                              onPress={() => handleFlipPhoto(idx)}
                              activeOpacity={0.7}
                            >
                              <FlipHorizontal
                                size={12}
                                color={appColors.white}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.toolIconBtn}
                              onPress={() => handleRotatePhoto(idx)}
                              activeOpacity={0.7}
                            >
                              <RotateCw size={12} color={appColors.white} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Full Name & Code */}
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <AppText style={styles.label}>Họ và tên *</AppText>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={appColors.slate400}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText style={styles.label}>
                  Mã người dùng / CCCD / ID *
                </AppText>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: NS-1024"
                  value={code}
                  onChangeText={setCode}
                  placeholderTextColor={appColors.slate400}
                />
              </View>
            </View>

            {/* Zone Selector */}
            {zones.length > 0 && (
              <View style={styles.formGroupSpacing}>
                <AppText style={styles.label}>Khu vực (Zone)</AppText>
                <View style={styles.chipsRow}>
                  {zones.map(z => {
                    const isSelected = z.id === zoneId;
                    return (
                      <TouchableOpacity
                        key={z.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => {
                          setZoneId(z.id);
                          const firstR = rooms.find(r => r.zoneId === z.id);
                          if (firstR) setRoomId(firstR.id);
                        }}
                      >
                        <AppText
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {z.name}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Room Selector */}
            {rooms.length > 0 ? (
              <View style={styles.formGroupSpacing}>
                <AppText style={styles.label}>Phòng trực thuộc *</AppText>
                <View style={styles.chipsRow}>
                  {(roomsInZone.length > 0 ? roomsInZone : rooms).map(r => {
                    const isSelected = r.id === roomId;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setRoomId(r.id)}
                      >
                        <AppText
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {r.name}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.warningBox}>
                <AppText style={styles.warningText}>
                  Chưa có phòng nào được tạo. Bạn vui lòng tạo phòng trước ở mục
                  "Danh sách phòng".
                </AppText>
              </View>
            )}
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <AppText style={styles.cancelBtnText}>Hủy</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={appColors.white} />
              ) : (
                <Check size={18} color={appColors.white} />
              )}
              <AppText style={styles.saveBtnText}>
                {isSubmitting ? 'Đang lưu & tải ảnh...' : 'Lưu hồ sơ'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: appColors.overlayDark65,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlayPhone: {
    padding: 12,
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    width: '78%',
    maxHeight: '92%',
    padding: 24,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalContentPhone: {
    width: '100%',
    maxHeight: '95%',
    padding: 14,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 13,
    color: appColors.slate500,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  errorText: {
    color: appColors.red600,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  photoSection: {
    backgroundColor: appColors.slate50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: appColors.slate200,
    marginBottom: 18,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoHeaderRowPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.slate800,
  },
  sectionDesc: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 2,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.blue600,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnCameraText: {
    color: appColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnLibrary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnLibraryText: {
    color: appColors.blue600,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPhotoBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: appColors.slate300,
    borderRadius: 12,
    backgroundColor: appColors.white,
    gap: 8,
  },
  emptyPhotoText: {
    fontSize: 12,
    color: appColors.slate500,
    textAlign: 'center',
    maxWidth: 320,
  },
  photosScroll: {
    paddingVertical: 4,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoCard: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: appColors.slate200,
    backgroundColor: appColors.slate200,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  mainBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: appColors.blue600,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    zIndex: 5,
  },
  mainBadgeText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  setMainBtn: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: appColors.overlayDark75,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    zIndex: 5,
  },
  setMainText: {
    color: appColors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: appColors.white,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: appColors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  photoBottomTools: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 5,
  },
  toolIconBtn: {
    backgroundColor: appColors.overlayDark75,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
  },
  formGroupSpacing: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate700,
    marginBottom: 8,
  },
  input: {
    backgroundColor: appColors.slate50,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: appColors.slate900,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  chipActive: {
    backgroundColor: appColors.blue50,
    borderColor: appColors.blue600,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate600,
  },
  chipTextActive: {
    color: appColors.blue600,
    fontWeight: '700',
  },
  warningBox: {
    backgroundColor: appColors.warningBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.amber100,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: appColors.warningText,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: appColors.slate200,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: appColors.slate100,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: appColors.slate600,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: appColors.blue600,
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: appColors.white,
  },
});
