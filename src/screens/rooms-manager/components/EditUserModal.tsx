import React, { useState, useEffect } from 'react';
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
  UserCheck,
  FlipHorizontal,
  RotateCw,
} from 'lucide-react-native';
import { updateUserProfile } from '../../../store/slices/detectorSlice';
import { profileService, uploadService } from '../../../services/api';
import { UserProfile } from '../../../model/detector';
import { PHOTO_CONFIG } from '../../../const/photo-config';
import { UploadFolder } from '../../../const/upload-folder';
import { ImagePickerService } from '../../../services/image-picker-service';
import { tfliteYoloService } from '../../../services/tflite-yolo-service';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';

interface EditUserModalProps {
  visible: boolean;
  user: UserProfile | null;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  user,
  onClose,
}) => {
  const { isPhone } = useResponsive();
  const dispatch = useAppDispatch();
  const { rooms } = useAppSelector(state => state.detector);

  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [roomId, setRoomId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && visible) {
      setFullName(user.fullName);
      setCode(user.code);
      setRoomId(user.roomId);
      const initialPhotos =
        user.photos && user.photos.length > 0
          ? [...user.photos]
          : user.avatarUri
          ? [user.avatarUri]
          : [];
      setPhotos(initialPhotos);
      setAvatarUri(user.avatarUri || initialPhotos[0] || '');
      setError('');
    }
  }, [user, visible]);

  const handleCapturePhoto = () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert(
        'Đã đủ ảnh',
        `Mỗi hồ sơ tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`,
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
          if (uri) {
            setPhotos(prev => {
              const next = [...prev, uri];
              if (!avatarUri) setAvatarUri(uri);
              return next;
            });
          }
        },
      },
      {
        text: 'Camera trước (Selfie)',
        onPress: async () => {
          const uri = await ImagePickerService.captureImageWithCamera(
            photos.length,
            'front',
          );
          if (uri) {
            setPhotos(prev => {
              const next = [...prev, uri];
              if (!avatarUri) setAvatarUri(uri);
              return next;
            });
          }
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  // Flip photo horizontally to fix mirrored selfie images
  const handleFlipPhoto = async (photoUri: string) => {
    const flippedUri = await ImagePickerService.flipImageHorizontal(photoUri);
    setPhotos(prev => prev.map(p => (p === photoUri ? flippedUri : p)));
    if (avatarUri === photoUri) {
      setAvatarUri(flippedUri);
    }
  };

  // Rotate photo 90 degrees clockwise
  const handleRotatePhoto = async (photoUri: string) => {
    const rotatedUri = await ImagePickerService.rotateImage90(photoUri);
    setPhotos(prev => prev.map(p => (p === photoUri ? rotatedUri : p)));
    if (avatarUri === photoUri) {
      setAvatarUri(rotatedUri);
    }
  };

  const handlePickPhotos = async () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert(
        'Đã đủ ảnh',
        `Mỗi hồ sơ tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh nhận diện.`,
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
        if (!avatarUri && combined.length > 0) {
          setAvatarUri(combined[0]);
        }
        return combined;
      });
    }
  };

  const handleDeletePhoto = (photoToDelete: string) => {
    Alert.alert('Xóa ảnh', 'Bạn có chắc chắn muốn xóa ảnh này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          const nextPhotos = photos.filter(p => p !== photoToDelete);
          setPhotos(nextPhotos);
          if (avatarUri === photoToDelete) {
            setAvatarUri(nextPhotos[0] || '');
          }
        },
      },
    ]);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!code.trim()) {
      setError('Vui lòng nhập mã định danh');
      return;
    }

    setIsSubmitting(true);
    try {
      // Tải các ảnh mới (cục bộ) lên backend và nhận URL thực tế
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

      const finalAvatar =
        avatarUri && (avatarUri.startsWith('http://') || avatarUri.startsWith('https://'))
          ? avatarUri
          : serverPhotos[0] || '';

      const updatedData = {
        fullName: fullName.trim(),
        code: code.trim(),
        roomId: roomId || user.roomId,
        avatarUri: finalAvatar,
        photos: serverPhotos,
      };

      tfliteYoloService.invalidateProfileCache(user.id);
      dispatch(
        updateUserProfile({
          id: user.id,
          ...updatedData,
        }),
      );

      profileService.updateProfile(user.id, updatedData).catch(err => {
        console.log('[EditUserModal] Failed to sync update to BE:', err);
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

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
                <UserCheck size={20} color={appColors.blue600} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={[styles.title, isPhone && styles.titlePhone]}
                  numberOfLines={1}
                >
                  Chỉnh sửa nhân sự
                </AppText>
                <AppText style={styles.subtitle} numberOfLines={1}>
                  Cập nhật thông tin & ảnh nhận diện
                </AppText>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={appColors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

            {/* Photos Management */}
            <View style={styles.photoSection}>
              <View
                style={[
                  styles.photoHeaderRow,
                  isPhone && styles.photoHeaderRowPhone,
                ]}
              >
                <View>
                  <AppText style={styles.sectionLabel}>
                    Bộ ảnh nhận diện ({photos.length}/
                    {PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh)
                  </AppText>
                  <AppText style={styles.sectionDesc}>
                    Thêm ảnh mới hoặc xóa ảnh cũ để tối ưu độ chính xác
                  </AppText>
                </View>

                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.actionBtnCamera}
                    onPress={handleCapturePhoto}
                    disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
                  >
                    <Camera size={16} color={appColors.white} />
                    <AppText style={styles.actionBtnCameraText}>
                      Chụp thêm
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnLibrary}
                    onPress={handlePickPhotos}
                    disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
                  >
                    <ImageIcon size={16} color={appColors.blue600} />
                    <AppText style={styles.actionBtnLibraryText}>
                      Chọn thêm
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {photos.length === 0 ? (
                <View style={styles.emptyPhotoBox}>
                  <ImageIcon size={36} color={appColors.slate300} />
                  <AppText style={styles.emptyPhotoText}>
                    Chưa có ảnh nào. Vui lòng chụp hoặc chọn ảnh nhận diện.
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
                      const isMain = uri === avatarUri;
                      return (
                        <View key={`${uri}-${idx}`} style={styles.photoCard}>
                          <Image source={{ uri }} style={styles.photoThumb} />

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
                              onPress={() => setAvatarUri(uri)}
                              activeOpacity={0.8}
                            >
                              <AppText style={styles.setMainText}>
                                Đặt chính
                              </AppText>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.deletePhotoBtn}
                            onPress={() => handleDeletePhoto(uri)}
                            activeOpacity={0.8}
                          >
                            <Trash2 size={12} color={appColors.red600} />
                          </TouchableOpacity>

                          {/* Bottom Action Tools: Flip and Rotate */}
                          <View style={styles.photoBottomTools}>
                            <TouchableOpacity
                              style={styles.toolIconBtn}
                              onPress={() => handleFlipPhoto(uri)}
                              activeOpacity={0.7}
                            >
                              <FlipHorizontal
                                size={12}
                                color={appColors.white}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.toolIconBtn}
                              onPress={() => handleRotatePhoto(uri)}
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

            {/* Information Inputs */}
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <AppText style={styles.label}>Họ và tên *</AppText>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={appColors.slate400}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText style={styles.label}>Mã định danh / ID *</AppText>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholderTextColor={appColors.slate400}
                />
              </View>
            </View>

            {/* Room Change */}
            {rooms.length > 0 && (
              <View style={styles.formGroupSpacing}>
                <AppText style={styles.label}>Chuyển sang phòng khác:</AppText>
                <View style={styles.chipsRow}>
                  {rooms.map(r => {
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
                {isSubmitting ? 'Đang lưu & tải ảnh...' : 'Lưu thay đổi'}
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
  titlePhone: {
    fontSize: 16,
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
