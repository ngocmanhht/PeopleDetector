import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { AppText } from '../../../components/app-text';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  X,
  Camera,
  Image as ImageIcon,
  Trash2,
  Star,
  UserPlus,
  FlipHorizontal,
  RotateCw,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { PickerModal } from './PickerModal';
import { addUserProfile } from '../../../store/slices/detectorSlice';
import { profileService, uploadService, settingService } from '../../../services/api';
import { PHOTO_CONFIG } from '../../../const/photo-config';
import { UploadFolder } from '../../../const/upload-folder';
import { ImagePickerService } from '../../../services/image-picker-service';
import { appColors } from '../../../const/app-colors';
import { useResponsive } from '../../../hooks/use-responsive';
import { appUtils } from '../../../utils';
import { UserProfile } from '../../../model/detector';
import {
  userProfileSchema,
  UserProfileFormValues,
} from '../../../schemas/userProfileSchema';

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  initialPhotoUri?: string | null;
  initialFullName?: string;
  onUserCreated?: (createdProfile: UserProfile) => void;
}

type FormTab = 'basic' | 'residence' | 'decision' | 'drug' | 'personal' | 'facility';

export const AddUserModal: React.FC<AddUserModalProps> = ({
  visible,
  onClose,
  initialPhotoUri,
  initialFullName,
  onUserCreated,
}) => {
  const { isPhone, height: screenHeight } = useResponsive();
  const dispatch = useAppDispatch();
  const { zones, rooms, userProfiles, selectedZoneId, selectedRoomId } =
    useAppSelector(state => state.detector);

  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0);
  const [showVisitorPicker, setShowVisitorPicker] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  const bodyScrollRef = useRef<any>(null);

  const handleTabPress = (tab: FormTab) => {
    setActiveTab(tab);
    requestAnimationFrame(() => {
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  };

  const officialProfiles = (userProfiles || []).filter(u => !u.isVisitor);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserProfileFormValues>({
    resolver: yupResolver(userProfileSchema),
    defaultValues: {
      code: '',
      fullName: '',
      dateOfBirth: '',
      gender: 'Nam',
      idCardNumber: '',
      idCardStatus: 'Đã có',
      age: null,
      isVisitor: false,
      visitedProfileId: null,
      permanentProvince: '',
      permanentDistrict: '',
      permanentWard: '',
      permanentAddress: '',
      decisionType: 'Bắt buộc',
      decisionNumber: '',
      decisionIssuedDate: '',
      decisionIssuedUnit: '',
      decisionExecDate: '',
      admissionDate: '',
      detoxDuration: '',
      reducedDuration: '',
      reintegrationDate: '',
      drugType: '',
      drugTestDate: '',
      drugTestUnit: '',
      drugUsageForm: '',
      drugUsageReason: '',
      addictionReportNumber: '',
      addictionReportDate: '',
      addictionReportUnit: '',
      admissionCount: null,
      educationLevel: '',
      occupation: '',
      recordNumber: '',
      criminalRecord: '',
      fatherName: '',
      motherName: '',
      ethnicity: 'Kinh',
      religion: 'Không',
      zoneId: selectedZoneId || (zones[0]?.id ?? ''),
      roomId: selectedRoomId || (rooms[0]?.id ?? ''),
      zoneManagerName: '',
    },
  });

  const isVisitor = watch('isVisitor');
  const visitedProfileId = watch('visitedProfileId');
  const zoneId = watch('zoneId');
  const roomId = watch('roomId');
  const gender = watch('gender');
  const idCardStatus = watch('idCardStatus');
  const decisionType = watch('decisionType');

  // Generate or fetch code on open
  const handleRegenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const code = await settingService.getNextUserCode(userProfiles.length);
      setValue('code', code, { shouldValidate: true });
    } catch {
      setValue('code', `AA-BB-${Math.floor(1000 + Math.random() * 9000)}`);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  useEffect(() => {
    if (visible) {
      reset({
        code: '',
        fullName: initialFullName || '',
        dateOfBirth: '',
        gender: 'Nam',
        idCardNumber: '',
        idCardStatus: 'Đã có',
        age: null,
        isVisitor: false,
        visitedProfileId: null,
        permanentProvince: '',
        permanentDistrict: '',
        permanentWard: '',
        permanentAddress: '',
        decisionType: 'Bắt buộc',
        decisionNumber: '',
        decisionIssuedDate: '',
        decisionIssuedUnit: '',
        decisionExecDate: '',
        admissionDate: '',
        detoxDuration: '',
        reducedDuration: '',
        reintegrationDate: '',
        drugType: '',
        drugTestDate: '',
        drugTestUnit: '',
        drugUsageForm: '',
        drugUsageReason: '',
        addictionReportNumber: '',
        addictionReportDate: '',
        addictionReportUnit: '',
        admissionCount: null,
        educationLevel: '',
        occupation: '',
        recordNumber: '',
        criminalRecord: '',
        fatherName: '',
        motherName: '',
        ethnicity: 'Kinh',
        religion: 'Không',
        zoneId: selectedZoneId || (zones[0]?.id ?? ''),
        roomId: selectedRoomId || (rooms[0]?.id ?? ''),
        zoneManagerName: '',
      });

      handleRegenerateCode();

      if (initialPhotoUri) {
        setPhotos([initialPhotoUri]);
        setSelectedAvatarIndex(0);
      } else {
        setPhotos([]);
      }
      setActiveTab('basic');
      requestAnimationFrame(() => {
        bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialPhotoUri, initialFullName, selectedZoneId, selectedRoomId]);

  // Auto-calculate age on dateOfBirth change
  const handleDobChange = (text: string) => {
    setValue('dateOfBirth', text, { shouldValidate: true });
    const parts = text.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        day = parseInt(parts[2], 10);
      }
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year < 2100) {
        const b = dayjs(`${year}-${month}-${day}`);
        if (b.isValid()) {
          const calculatedAge = dayjs().diff(b, 'year');
          if (calculatedAge >= 0 && calculatedAge < 120) {
            setValue('age', calculatedAge);
          }
        }
      }
    }
  };

  // Photos management
  const handleCapturePhoto = () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert('Đã đủ ảnh', `Tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh cho mỗi người.`);
      return;
    }

    Alert.alert('Chọn Camera', 'Bạn muốn chụp ảnh hồ sơ bằng camera nào?', [
      {
        text: 'Camera sau (Khuyên dùng)',
        onPress: async () => {
          const uri = await ImagePickerService.captureImageWithCamera(photos.length, 'back');
          if (uri) setPhotos(prev => [...prev, uri]);
        },
      },
      {
        text: 'Camera trước (Selfie)',
        onPress: async () => {
          const uri = await ImagePickerService.captureImageWithCamera(photos.length, 'front');
          if (uri) setPhotos(prev => [...prev, uri]);
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handlePickPhotos = async () => {
    if (photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER) {
      Alert.alert('Đã đủ ảnh', `Tối đa ${PHOTO_CONFIG.MAX_PHOTOS_PER_USER} ảnh cho mỗi người.`);
      return;
    }
    const remainCount = PHOTO_CONFIG.MAX_PHOTOS_PER_USER - photos.length;
    const uris = await ImagePickerService.pickImagesFromLibrary(remainCount);
    if (uris && uris.length > 0) {
      setPhotos(prev => [...prev, ...uris].slice(0, PHOTO_CONFIG.MAX_PHOTOS_PER_USER));
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (selectedAvatarIndex >= index && selectedAvatarIndex > 0) {
      setSelectedAvatarIndex(selectedAvatarIndex - 1);
    }
  };

  const handleFlipPhoto = async (index: number) => {
    const currentUri = photos[index];
    if (!currentUri) return;
    const newUri = await ImagePickerService.flipImageHorizontal(currentUri);
    if (newUri) {
      setPhotos(prev => {
        const next = [...prev];
        next[index] = newUri;
        return next;
      });
    }
  };

  const handleRotatePhoto = async (index: number) => {
    const currentUri = photos[index];
    if (!currentUri) return;
    const newUri = await ImagePickerService.rotateImage90(currentUri);
    if (newUri) {
      setPhotos(prev => {
        const next = [...prev];
        next[index] = newUri;
        return next;
      });
    }
  };

  const onSubmit = async (values: UserProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const serverPhotos: string[] = [];
      for (const uri of photos) {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          serverPhotos.push(uri);
        } else {
          try {
            const res = await uploadService.uploadImage(uri, UploadFolder.PROFILES);
            serverPhotos.push(res.path);
          } catch {
            serverPhotos.push(uri);
          }
        }
      }

      const mainAvatar =
        serverPhotos.length > 0
          ? serverPhotos[selectedAvatarIndex] || serverPhotos[0]
          : '';

      const visitedUser = values.isVisitor && values.visitedProfileId
        ? officialProfiles.find(u => u.id === values.visitedProfileId)
        : null;

      const targetZoneId = values.isVisitor && visitedUser?.zoneId
        ? visitedUser.zoneId
        : values.zoneId || '';

      const targetRoomId = values.isVisitor && visitedUser?.roomId
        ? visitedUser.roomId
        : values.roomId || '';

      const newProfile: UserProfile = {
        id: `user-${Date.now()}`,
        code: values.code || `AA-BB-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: values.fullName.trim(),
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        idCardNumber: values.idCardNumber.trim(),
        idCardStatus: values.idCardStatus || undefined,
        age: values.age || undefined,
        zoneId: targetZoneId,
        roomId: targetRoomId,
        avatarUri: mainAvatar,
        photos: serverPhotos,
        enrolledAt: dayjs().format('YYYY-MM-DD'),
        isVisitor: values.isVisitor,
        visitedProfileId: values.isVisitor ? values.visitedProfileId : null,
        visitedProfile: values.isVisitor && visitedUser
          ? {
              id: visitedUser.id,
              fullName: visitedUser.fullName,
              code: visitedUser.code,
              roomName: rooms.find(r => r.id === visitedUser.roomId)?.name || '',
            }
          : null,
        permanentProvince: values.permanentProvince || undefined,
        permanentDistrict: values.permanentDistrict || undefined,
        permanentWard: values.permanentWard || undefined,
        permanentAddress: values.permanentAddress || undefined,
        decisionType: values.decisionType || undefined,
        decisionNumber: values.decisionNumber || undefined,
        decisionIssuedDate: values.decisionIssuedDate || undefined,
        decisionIssuedUnit: values.decisionIssuedUnit || undefined,
        decisionExecDate: values.decisionExecDate || undefined,
        admissionDate: values.admissionDate || undefined,
        detoxDuration: values.detoxDuration || undefined,
        reducedDuration: values.reducedDuration || undefined,
        reintegrationDate: values.reintegrationDate || undefined,
        drugType: values.drugType || undefined,
        drugTestDate: values.drugTestDate || undefined,
        drugTestUnit: values.drugTestUnit || undefined,
        drugUsageForm: values.drugUsageForm || undefined,
        drugUsageReason: values.drugUsageReason || undefined,
        addictionReportNumber: values.addictionReportNumber || undefined,
        addictionReportDate: values.addictionReportDate || undefined,
        addictionReportUnit: values.addictionReportUnit || undefined,
        admissionCount: values.admissionCount || undefined,
        educationLevel: values.educationLevel || undefined,
        occupation: values.occupation || undefined,
        recordNumber: values.recordNumber || undefined,
        criminalRecord: values.criminalRecord || undefined,
        fatherName: values.fatherName || undefined,
        motherName: values.motherName || undefined,
        ethnicity: values.ethnicity || undefined,
        religion: values.religion || undefined,
        zoneManagerName: values.zoneManagerName || undefined,
      };

      dispatch(addUserProfile(newProfile));
      if (onUserCreated) {
        onUserCreated(newProfile);
      }
      profileService.createProfile(newProfile).catch(err => {
        console.log('[AddUserModal] Failed to sync profile to BE:', err);
      });

      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể tạo hồ sơ người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalidSubmit = () => {
    // If errors in basic tab, switch to basic tab
    if (
      errors.fullName ||
      errors.dateOfBirth ||
      errors.gender ||
      errors.idCardNumber ||
      errors.visitedProfileId
    ) {
      handleTabPress('basic');
    }
    Alert.alert(
      'Thiếu thông tin bắt buộc',
      'Vui lòng kiểm tra lại Họ tên, Ngày sinh, Giới tính, CCCD/CMND' +
        (isVisitor ? ' và Người được thăm gặp.' : '.'),
    );
  };

  const selectedZone = zones.find(z => z.id === zoneId);
  const roomsInZone = rooms.filter(r => r.zoneId === zoneId);
  const selectedRoom = rooms.find(r => r.id === roomId);

  const renderPhotoSection = () => (
    <View style={styles.photoSection}>
      <View style={[styles.photoHeaderRow, isPhone && styles.photoHeaderRowPhone]}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.sectionLabel}>
            Ảnh nhận diện ({photos.length}/{PHOTO_CONFIG.MAX_PHOTOS_PER_USER})
          </AppText>
          <AppText style={styles.sectionDesc} numberOfLines={1}>
            Chụp hoặc tải ảnh để trích xuất vector khuôn mặt
          </AppText>
        </View>
        <View style={styles.photoActions}>
          <TouchableOpacity
            style={styles.actionBtnCamera}
            onPress={handleCapturePhoto}
            disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
          >
            <Camera size={15} color={appColors.white} />
            <AppText style={styles.actionBtnCameraText}>Chụp</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnLibrary}
            onPress={handlePickPhotos}
            disabled={photos.length >= PHOTO_CONFIG.MAX_PHOTOS_PER_USER}
          >
            <ImageIcon size={15} color={appColors.blue600} />
            <AppText style={styles.actionBtnLibraryText}>Thư viện</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {photos.length === 0 ? (
        <View style={styles.emptyPhotoBox}>
          <ImageIcon size={30} color={appColors.slate300} />
          <AppText style={styles.emptyPhotoText}>
            Chưa có ảnh nào. Nhấn "Chụp" hoặc "Thư viện" để thêm ảnh khuôn mặt
          </AppText>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          <View style={styles.photosRow}>
            {photos.map((uri, idx) => {
              const isMain = idx === selectedAvatarIndex;
              return (
                <View key={`${uri}-${idx}`} style={styles.photoCard}>
                  <Image source={{ uri: appUtils.getUrlImage(uri) }} style={styles.photoThumb} />
                  {isMain ? (
                    <View style={styles.mainBadge}>
                      <Star size={10} color={appColors.white} />
                      <AppText style={styles.mainBadgeText}>Chính</AppText>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.setMainBtn}
                      onPress={() => setSelectedAvatarIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <AppText style={styles.setMainText}>Đặt chính</AppText>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.deletePhotoBtn}
                    onPress={() => handleDeletePhoto(idx)}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={12} color={appColors.red600} />
                  </TouchableOpacity>
                  <View style={styles.photoBottomTools}>
                    <TouchableOpacity style={styles.toolIconBtn} onPress={() => handleFlipPhoto(idx)}>
                      <FlipHorizontal size={11} color={appColors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolIconBtn} onPress={() => handleRotatePhoto(idx)}>
                      <RotateCw size={11} color={appColors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.overlay, isPhone && styles.overlayPhone]}>
          <View
            style={[
              styles.modalContent,
              isPhone && styles.modalContentPhone,
              { height: isPhone ? '95%' : Math.min(screenHeight * 0.9, 780) },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerTitleRow, { flex: 1, paddingRight: 8 }]}>
                <View style={styles.iconWrap}>
                  <UserPlus size={20} color={appColors.blue600} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.title, isPhone && { fontSize: 16 }]} numberOfLines={1}>
                    {isVisitor ? 'Thêm Khách thăm gặp' : 'Thêm hồ sơ đối tượng'}
                  </AppText>
                  <AppText style={styles.subtitle} numberOfLines={1}>
                    Quản lý thông tin & nhận diện sinh trắc học
                  </AppText>
                </View>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color={appColors.slate500} />
              </TouchableOpacity>
            </View>

            {/* Visitor Switch Section - Đặt ở trên đầu */}
            <View style={styles.visitorSwitchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <AppText style={styles.visitorSwitchTitle}>Khách thăm gặp / Thân nhân</AppText>
                <AppText style={styles.visitorSwitchSub}>
                  Bật nếu là thân nhân / khách đến thăm người trong cơ sở
                </AppText>
              </View>
              <Controller
                control={control}
                name="isVisitor"
                render={({ field: { value, onChange } }) => (
                  <Switch
                    value={value}
                    onValueChange={val => {
                      onChange(val);
                      if (!val) {
                        setValue('visitedProfileId', null);
                      }
                    }}
                    trackColor={{ false: appColors.slate300, true: '#9333ea' }}
                    thumbColor={appColors.white}
                  />
                )}
              />
            </View>

            {/* Form Tabs Bar: CHỈ hiển thị khi là Học viên/Đối tượng */}
            {!isVisitor && (
              <View style={styles.tabsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={styles.tabsScroll}
                >
                  {[
                    { key: 'basic', label: 'Cơ bản (*)' },
                    { key: 'residence', label: 'Thường trú' },
                    { key: 'decision', label: 'Quyết định' },
                    { key: 'drug', label: 'Ma túy & Nghiện' },
                    { key: 'personal', label: 'Nhân thân' },
                    { key: 'facility', label: 'Cơ sở' },
                  ].map(t => {
                    const isActive = activeTab === t.key;
                    const hasErrorInTab =
                      t.key === 'basic' &&
                      Boolean(
                        errors.fullName ||
                          errors.dateOfBirth ||
                          errors.gender ||
                          errors.idCardNumber,
                      );
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[styles.tabItem, isActive && styles.tabItemActive, hasErrorInTab && styles.tabItemError]}
                        onPress={() => handleTabPress(t.key as FormTab)}
                        activeOpacity={0.7}
                      >
                        <AppText
                          style={[
                            styles.tabText,
                            isActive && styles.tabTextActive,
                            hasErrorInTab && styles.tabTextError,
                          ]}
                        >
                          {t.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Tab Contents */}
            <ScrollView
              ref={bodyScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyScrollContent}
            >
              {/* TRƯỜNG HỢP 1: LÀ KHÁCH THĂM GẶP / THÂN NHÂN (FORM TINH GỌN, ẨN TOÀN BỘ TAB THỪA) */}
              {isVisitor ? (
                <View style={styles.tabContent}>
                  <View style={styles.visitorNoticeBox}>
                    <AlertCircle size={16} color="#6d28d9" />
                    <AppText style={styles.visitorNoticeText}>
                      Hồ sơ Thân nhân: Thu thập thông tin nhận diện và liên kết với học viên trong cơ sở. Không yêu cầu các thông tin cai nghiện/ma túy.
                    </AppText>
                  </View>

                  {/* Bắt buộc chọn người được thăm */}
                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>
                      Người được thăm gặp <AppText style={styles.reqStar}>*</AppText>
                    </AppText>
                    <TouchableOpacity
                      style={[
                        styles.visitorPickerTrigger,
                        errors.visitedProfileId && styles.inputErrorBorder,
                      ]}
                      onPress={() => setShowVisitorPicker(true)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <UserCheck
                          size={16}
                          color={visitedProfileId ? appColors.purple700 : appColors.slate400}
                        />
                        <AppText
                          style={[
                            styles.visitorPickerValue,
                            !visitedProfileId && styles.visitorPickerPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {visitedProfileId && officialProfiles.find(u => u.id === visitedProfileId)
                            ? `${officialProfiles.find(u => u.id === visitedProfileId)?.fullName} (${
                                officialProfiles.find(u => u.id === visitedProfileId)?.code
                              })`
                            : 'Nhấn để chọn người được thăm...'}
                        </AppText>
                      </View>
                    </TouchableOpacity>
                    {errors.visitedProfileId?.message ? (
                      <AppText style={styles.errorMsgText}>
                        {errors.visitedProfileId.message}
                      </AppText>
                    ) : null}
                  </View>

                  {/* Ảnh nhận diện */}
                  {renderPhotoSection()}

                  {/* Mã định danh (Hệ thống tự sinh, không cho nhập tay) & Họ tên */}
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <View style={styles.labelWithAction}>
                        <AppText style={styles.label}>Mã định danh (Tự sinh)</AppText>
                        <TouchableOpacity
                          style={styles.refreshCodeBtn}
                          onPress={handleRegenerateCode}
                          disabled={isGeneratingCode}
                        >
                          <RefreshCw size={12} color={appColors.blue600} />
                          <AppText style={styles.refreshCodeText}>Đổi mã</AppText>
                        </TouchableOpacity>
                      </View>
                      <Controller
                        control={control}
                        name="code"
                        render={({ field: { value } }) => (
                          <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={value || '(Tự động sinh)'}
                            editable={false}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                      <AppText style={styles.inputHelperText}>Tự động cấp theo mẫu cấu hình CMS</AppText>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>
                        Họ và tên <AppText style={styles.reqStar}>*</AppText>
                      </AppText>
                      <Controller
                        control={control}
                        name="fullName"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={[styles.input, errors.fullName && styles.inputErrorBorder]}
                            placeholder="Ví dụ: Nguyễn Văn An"
                            value={value}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                      {errors.fullName?.message ? (
                        <AppText style={styles.errorMsgText}>{errors.fullName.message}</AppText>
                      ) : null}
                    </View>
                  </View>

                  {/* Ngày sinh & Giới tính */}
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>
                        Ngày sinh (DD/MM/YYYY) <AppText style={styles.reqStar}>*</AppText>
                      </AppText>
                      <Controller
                        control={control}
                        name="dateOfBirth"
                        render={({ field: { value } }) => (
                          <TextInput
                            style={[styles.input, errors.dateOfBirth && styles.inputErrorBorder]}
                            placeholder="01/01/1990"
                            value={value || ''}
                            onChangeText={handleDobChange}
                            placeholderTextColor={appColors.slate400}
                            keyboardType="numbers-and-punctuation"
                          />
                        )}
                      />
                      {errors.dateOfBirth?.message ? (
                        <AppText style={styles.errorMsgText}>{errors.dateOfBirth.message}</AppText>
                      ) : null}
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>
                        Giới tính <AppText style={styles.reqStar}>*</AppText>
                      </AppText>
                      <View style={styles.segmentRow}>
                        {['Nam', 'Nữ', 'Khác'].map(g => {
                          const isSel = gender === g;
                          return (
                            <TouchableOpacity
                              key={g}
                              style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                              onPress={() => setValue('gender', g as 'Nam' | 'Nữ' | 'Khác', { shouldValidate: true })}
                              activeOpacity={0.8}
                            >
                              <AppText style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                                {g}
                              </AppText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* CCCD / CMND & Tuổi */}
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 2 }]}>
                      <AppText style={styles.label}>
                        CCCD / CMND <AppText style={styles.reqStar}>*</AppText>
                      </AppText>
                      <Controller
                        control={control}
                        name="idCardNumber"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={[styles.input, errors.idCardNumber && styles.inputErrorBorder]}
                            placeholder="001200000000"
                            value={value}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                            keyboardType="number-pad"
                          />
                        )}
                      />
                      {errors.idCardNumber?.message ? (
                        <AppText style={styles.errorMsgText}>{errors.idCardNumber.message}</AppText>
                      ) : null}
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <AppText style={styles.label}>Tuổi</AppText>
                      <Controller
                        control={control}
                        name="age"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Tuổi"
                            value={value !== null && value !== undefined ? String(value) : ''}
                            onChangeText={t => onChange(t ? Number(t) : null)}
                            placeholderTextColor={appColors.slate400}
                            keyboardType="number-pad"
                          />
                        )}
                      />
                    </View>
                  </View>

                  {/* Tình trạng CCCD */}
                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>Tình trạng CCCD</AppText>
                    <View style={styles.segmentRow}>
                      {['Đã có', 'Mất', 'Chưa làm', 'Không'].map(st => {
                        const isSel = idCardStatus === st;
                        return (
                          <TouchableOpacity
                            key={st}
                            style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                            onPress={() => setValue('idCardStatus', st)}
                            activeOpacity={0.8}
                          >
                            <AppText style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                              {st}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ) : (
                /* TRƯỜNG HỢP 2: ĐỐI TƯỢNG / HỌC VIÊN CHÍNH THỨC (HIỂN THỊ ĐỦ CÁC TABS) */
                <>
                  {/* TAB 1: BASIC INFORMATION */}
                  {activeTab === 'basic' && (
                    <View style={styles.tabContent}>
                      {/* Photo Section */}
                      {renderPhotoSection()}

                      {/* Mã định danh (Hệ thống tự sinh, không cho nhập tay) & Họ tên */}
                      <View style={styles.formRow}>
                        <View style={styles.formGroup}>
                          <View style={styles.labelWithAction}>
                            <AppText style={styles.label}>Mã định danh (Tự sinh)</AppText>
                            <TouchableOpacity
                              style={styles.refreshCodeBtn}
                              onPress={handleRegenerateCode}
                              disabled={isGeneratingCode}
                            >
                              <RefreshCw size={12} color={appColors.blue600} />
                              <AppText style={styles.refreshCodeText}>Đổi mã</AppText>
                            </TouchableOpacity>
                          </View>
                          <Controller
                            control={control}
                            name="code"
                            render={({ field: { value } }) => (
                              <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={value || '(Tự động sinh)'}
                                editable={false}
                                placeholderTextColor={appColors.slate400}
                              />
                            )}
                          />
                          <AppText style={styles.inputHelperText}>Tự động cấp theo mẫu cấu hình CMS</AppText>
                        </View>

                        <View style={styles.formGroup}>
                          <AppText style={styles.label}>
                            Họ và tên <AppText style={styles.reqStar}>*</AppText>
                          </AppText>
                          <Controller
                            control={control}
                            name="fullName"
                            render={({ field: { value, onChange } }) => (
                              <TextInput
                                style={[styles.input, errors.fullName && styles.inputErrorBorder]}
                                placeholder="Ví dụ: Nguyễn Văn An"
                                value={value}
                                onChangeText={onChange}
                                placeholderTextColor={appColors.slate400}
                              />
                            )}
                          />
                          {errors.fullName?.message ? (
                            <AppText style={styles.errorMsgText}>{errors.fullName.message}</AppText>
                          ) : null}
                        </View>
                      </View>

                      {/* Ngày sinh & Giới tính */}
                      <View style={styles.formRow}>
                        <View style={styles.formGroup}>
                          <AppText style={styles.label}>
                            Ngày sinh (DD/MM/YYYY) <AppText style={styles.reqStar}>*</AppText>
                          </AppText>
                          <Controller
                            control={control}
                            name="dateOfBirth"
                            render={({ field: { value } }) => (
                              <TextInput
                                style={[styles.input, errors.dateOfBirth && styles.inputErrorBorder]}
                                placeholder="01/01/1990"
                                value={value || ''}
                                onChangeText={handleDobChange}
                                placeholderTextColor={appColors.slate400}
                                keyboardType="numbers-and-punctuation"
                              />
                            )}
                          />
                          {errors.dateOfBirth?.message ? (
                            <AppText style={styles.errorMsgText}>{errors.dateOfBirth.message}</AppText>
                          ) : null}
                        </View>

                        <View style={styles.formGroup}>
                          <AppText style={styles.label}>
                            Giới tính <AppText style={styles.reqStar}>*</AppText>
                          </AppText>
                          <View style={styles.segmentRow}>
                            {['Nam', 'Nữ', 'Khác'].map(g => {
                              const isSel = gender === g;
                              return (
                                <TouchableOpacity
                                  key={g}
                                  style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                                  onPress={() => setValue('gender', g as 'Nam' | 'Nữ' | 'Khác', { shouldValidate: true })}
                                  activeOpacity={0.8}
                                >
                                  <AppText style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                                    {g}
                                  </AppText>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>

                      {/* CCCD/CMND, Tình trạng & Tuổi */}
                      <View style={styles.formRow}>
                        <View style={[styles.formGroup, { flex: 2 }]}>
                          <AppText style={styles.label}>
                            CCCD / CMND <AppText style={styles.reqStar}>*</AppText>
                          </AppText>
                          <Controller
                            control={control}
                            name="idCardNumber"
                            render={({ field: { value, onChange } }) => (
                              <TextInput
                                style={[styles.input, errors.idCardNumber && styles.inputErrorBorder]}
                                placeholder="001200000000"
                                value={value}
                                onChangeText={onChange}
                                placeholderTextColor={appColors.slate400}
                                keyboardType="number-pad"
                              />
                            )}
                          />
                          {errors.idCardNumber?.message ? (
                            <AppText style={styles.errorMsgText}>{errors.idCardNumber.message}</AppText>
                          ) : null}
                        </View>

                        <View style={[styles.formGroup, { flex: 1 }]}>
                          <AppText style={styles.label}>Tuổi</AppText>
                          <Controller
                            control={control}
                            name="age"
                            render={({ field: { value, onChange } }) => (
                              <TextInput
                                style={styles.input}
                                placeholder="Tuổi"
                                value={value !== null && value !== undefined ? String(value) : ''}
                                onChangeText={t => onChange(t ? Number(t) : null)}
                                placeholderTextColor={appColors.slate400}
                                keyboardType="number-pad"
                              />
                            )}
                          />
                        </View>
                      </View>

                      {/* Tình trạng CCCD */}
                      <View style={styles.formGroupSpacing}>
                        <AppText style={styles.label}>Tình trạng CCCD</AppText>
                        <View style={styles.segmentRow}>
                          {['Đã có', 'Mất', 'Chưa làm', 'Không'].map(st => {
                            const isSel = idCardStatus === st;
                            return (
                              <TouchableOpacity
                                key={st}
                                style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                                onPress={() => setValue('idCardStatus', st)}
                                activeOpacity={0.8}
                              >
                                <AppText style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                                  {st}
                                </AppText>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  )}

              {/* TAB 2: NƠI THƯỜNG TRÚ */}
              {activeTab === 'residence' && (
                <View style={styles.tabContent}>
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Tỉnh / Thành phố</AppText>
                      <Controller
                        control={control}
                        name="permanentProvince"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: TP. Hà Nội"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Quận / Huyện</AppText>
                      <Controller
                        control={control}
                        name="permanentDistrict"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: Ba Đình"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Xã / Phường</AppText>
                      <Controller
                        control={control}
                        name="permanentWard"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: Cống Vị"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Chi tiết số nhà, đường</AppText>
                      <Controller
                        control={control}
                        name="permanentAddress"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Số nhà, ngõ/xóm..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 3: QUYẾT ĐỊNH CAI NGHIỆN */}
              {activeTab === 'decision' && (
                <View style={styles.tabContent}>
                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>Loại quyết định</AppText>
                    <View style={styles.segmentRow}>
                      {['Bắt buộc', 'Tự nguyện'].map(dt => {
                        const isSel = decisionType === dt;
                        return (
                          <TouchableOpacity
                            key={dt}
                            style={[styles.segmentBtn, isSel && styles.segmentBtnActive]}
                            onPress={() => setValue('decisionType', dt)}
                            activeOpacity={0.8}
                          >
                            <AppText style={[styles.segmentText, isSel && styles.segmentTextActive]}>
                              {dt}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Số quyết định</AppText>
                      <Controller
                        control={control}
                        name="decisionNumber"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="123/QĐ-UBND"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày ban hành</AppText>
                      <Controller
                        control={control}
                        name="decisionIssuedDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Đơn vị ban hành</AppText>
                      <Controller
                        control={control}
                        name="decisionIssuedUnit"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="UBND Quận/Huyện..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày thi hành QĐ</AppText>
                      <Controller
                        control={control}
                        name="decisionExecDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày đưa vào cơ sở</AppText>
                      <Controller
                        control={control}
                        name="admissionDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Thời gian cai nghiện</AppText>
                      <Controller
                        control={control}
                        name="detoxDuration"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: 12 tháng"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Thời gian giảm</AppText>
                      <Controller
                        control={control}
                        name="reducedDuration"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: 2 tháng"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày tái hòa nhập</AppText>
                      <Controller
                        control={control}
                        name="reintegrationDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 4: MA TÚY & TÌNH TRẠNG NGHIỆN */}
              {activeTab === 'drug' && (
                <View style={styles.tabContent}>
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Loại ma túy</AppText>
                      <Controller
                        control={control}
                        name="drugType"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Heroin, Ma túy đá, Cần sa..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày xét nghiệm</AppText>
                      <Controller
                        control={control}
                        name="drugTestDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Đơn vị xét nghiệm</AppText>
                      <Controller
                        control={control}
                        name="drugTestUnit"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Trung tâm y tế..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Hình thức sử dụng (1)</AppText>
                      <Controller
                        control={control}
                        name="drugUsageForm"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Hút, Hít, Tiêm chích..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>Nguyên nhân sử dụng (2)</AppText>
                    <Controller
                      control={control}
                      name="drugUsageReason"
                      render={({ field: { value, onChange } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Bạn bè rủ rê, áp lực công việc..."
                          value={value || ''}
                          onChangeText={onChange}
                          placeholderTextColor={appColors.slate400}
                        />
                      )}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Số phiếu xác định nghiện</AppText>
                      <Controller
                        control={control}
                        name="addictionReportNumber"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Số phiếu..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Ngày xác định</AppText>
                      <Controller
                        control={control}
                        name="addictionReportDate"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TAB 5: NHÂN THÂN & GIA ĐÌNH */}
              {activeTab === 'personal' && (
                <View style={styles.tabContent}>
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Họ tên cha</AppText>
                      <Controller
                        control={control}
                        name="fatherName"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Họ tên cha"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Họ tên mẹ</AppText>
                      <Controller
                        control={control}
                        name="motherName"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Họ tên mẹ"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Dân tộc</AppText>
                      <Controller
                        control={control}
                        name="ethnicity"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Kinh, Tày, Nùng..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Tôn giáo</AppText>
                      <Controller
                        control={control}
                        name="religion"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Không, Phật giáo..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Học vấn</AppText>
                      <Controller
                        control={control}
                        name="educationLevel"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="12/12, Đại học..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Nghề nghiệp</AppText>
                      <Controller
                        control={control}
                        name="occupation"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Lao động tự do..."
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Số hồ sơ</AppText>
                      <Controller
                        control={control}
                        name="recordNumber"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="HS-00123"
                            value={value || ''}
                            onChangeText={onChange}
                            placeholderTextColor={appColors.slate400}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Số lần vào cơ sở</AppText>
                      <Controller
                        control={control}
                        name="admissionCount"
                        render={({ field: { value, onChange } }) => (
                          <TextInput
                            style={styles.input}
                            placeholder="Ví dụ: 1"
                            value={value !== null && value !== undefined ? String(value) : ''}
                            onChangeText={t => onChange(t ? Number(t) : null)}
                            placeholderTextColor={appColors.slate400}
                            keyboardType="number-pad"
                          />
                        )}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>Tiền án / Tiền sự</AppText>
                    <Controller
                      control={control}
                      name="criminalRecord"
                      render={({ field: { value, onChange } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Không hoặc ghi rõ tiền án, tiền sự..."
                          value={value || ''}
                          onChangeText={onChange}
                          placeholderTextColor={appColors.slate400}
                        />
                      )}
                    />
                  </View>
                </View>
              )}

              {/* TAB 6: PHÂN BỔ CƠ SỞ */}
              {activeTab === 'facility' && (
                <View style={styles.tabContent}>
                  <View style={styles.formRow}>
                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Khu vực (Zone)</AppText>
                      <TouchableOpacity
                        style={styles.dropdownBtn}
                        onPress={() => setShowZonePicker(true)}
                        activeOpacity={0.8}
                      >
                        <AppText style={styles.dropdownText} numberOfLines={1}>
                          {selectedZone?.name || 'Chọn khu vực'}
                        </AppText>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                      <AppText style={styles.label}>Phòng ở (Room)</AppText>
                      <TouchableOpacity
                        style={styles.dropdownBtn}
                        onPress={() => setShowRoomPicker(true)}
                        activeOpacity={0.8}
                      >
                        <AppText style={styles.dropdownText} numberOfLines={1}>
                          {selectedRoom?.name || 'Chọn phòng'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formGroupSpacing}>
                    <AppText style={styles.label}>Cán bộ quản lý khu</AppText>
                    <Controller
                      control={control}
                      name="zoneManagerName"
                      render={({ field: { value, onChange } }) => (
                        <TextInput
                          style={styles.input}
                          placeholder="Tên cán bộ quản lý..."
                          value={value || ''}
                          onChangeText={onChange}
                          placeholderTextColor={appColors.slate400}
                        />
                      )}
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <AppText style={styles.cancelBtnText}>Hủy bỏ</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
                onPress={() => handleSubmit(onSubmit, onInvalidSubmit)()}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={appColors.white} />
                ) : (
                  <>
                    <UserPlus size={16} color={appColors.white} />
                    <AppText style={styles.saveBtnText}>Lưu hồ sơ</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Visited Person Picker Modal */}
      <PickerModal
        visible={showVisitorPicker}
        title="Chọn học viên được thăm gặp"
        items={officialProfiles.map(u => ({
          id: u.id,
          label: u.fullName,
          subtitle: `${u.code} • ${rooms.find(r => r.id === u.roomId)?.name || 'Chưa gán phòng'}`,
        }))}
        selectedId={visitedProfileId || ''}
        onSelect={id => {
          setValue('visitedProfileId', id, { shouldValidate: true });
          const target = officialProfiles.find(u => u.id === id);
          if (target) {
            if (target.zoneId) setValue('zoneId', target.zoneId);
            if (target.roomId) setValue('roomId', target.roomId);
          }
          setShowVisitorPicker(false);
        }}
        onClose={() => setShowVisitorPicker(false)}
      />

      {/* Zone Picker Modal */}
      <PickerModal
        visible={showZonePicker}
        title="Chọn Khu vực"
        items={zones.map(z => ({ id: z.id, label: z.name, subtitle: z.description }))}
        selectedId={zoneId || ''}
        onSelect={id => {
          setValue('zoneId', id);
          const firstRoom = rooms.find(r => r.zoneId === id);
          if (firstRoom) setValue('roomId', firstRoom.id);
          setShowZonePicker(false);
        }}
        onClose={() => setShowZonePicker(false)}
      />

      {/* Room Picker Modal */}
      <PickerModal
        visible={showRoomPicker}
        title="Chọn Phòng"
        items={roomsInZone.map(r => ({
          id: r.id,
          label: r.name,
          subtitle: `Sức chứa ${r.capacity || 30} người`,
        }))}
        selectedId={roomId || ''}
        onSelect={id => {
          setValue('roomId', id);
          setShowRoomPicker(false);
        }}
        onClose={() => setShowRoomPicker(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayPhone: {
    padding: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: appColors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 760,
    height: '90%',
    maxHeight: '94%',
    padding: 20,
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContentPhone: {
    height: '95%',
    maxHeight: '96%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: appColors.blue50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: appColors.slate900,
  },
  subtitle: {
    fontSize: 12,
    color: appColors.slate500,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoSection: {
    backgroundColor: appColors.slate50,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: appColors.slate200,
  },
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  photoHeaderRowPhone: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.slate800,
  },
  sectionDesc: {
    fontSize: 11,
    color: appColors.slate500,
    marginTop: 1,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: appColors.blue600,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnCameraText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.white,
  },
  actionBtnLibrary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.blue200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnLibraryText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.blue600,
  },
  emptyPhotoBox: {
    height: 76,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.white,
    paddingHorizontal: 16,
  },
  emptyPhotoText: {
    fontSize: 11,
    color: appColors.slate400,
    textAlign: 'center',
    marginTop: 4,
  },
  photosScroll: {
    marginTop: 6,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoCard: {
    width: 68,
    height: 84,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: appColors.slate300,
    position: 'relative',
    backgroundColor: appColors.white,
  },
  photoThumb: {
    width: '100%',
    height: 60,
  },
  mainBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: appColors.blue600,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mainBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: appColors.white,
  },
  setMainBtn: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  setMainText: {
    fontSize: 8,
    fontWeight: '600',
    color: appColors.white,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBottomTools: {
    flexDirection: 'row',
    height: 24,
    backgroundColor: appColors.slate800,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  toolIconBtn: {
    padding: 3,
  },
  tabsContainer: {
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: appColors.slate200,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 6,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: appColors.slate100,
  },
  tabItemActive: {
    backgroundColor: appColors.blue600,
  },
  tabItemError: {
    borderWidth: 1,
    borderColor: appColors.red500,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  tabTextActive: {
    color: appColors.white,
  },
  tabTextError: {
    color: appColors.red600,
  },
  bodyScroll: {
    flex: 1,
    marginTop: 8,
  },
  bodyScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  tabContent: {
    paddingVertical: 4,
    minHeight: 320,
  },
  visitorSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: appColors.purple50,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: appColors.purple100,
    marginBottom: 10,
  },
  visitorSwitchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#581c87',
  },
  visitorSwitchSub: {
    fontSize: 11,
    color: '#9333ea',
    marginTop: 1,
  },
  visitorPickerTrigger: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d8b4fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: appColors.white,
  },
  visitorPickerValue: {
    fontSize: 13,
    color: '#581c87',
    fontWeight: '600',
  },
  visitorPickerPlaceholder: {
    color: appColors.slate400,
    fontWeight: '400',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  formGroup: {
    flex: 1,
  },
  formGroupSpacing: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate700,
    marginBottom: 4,
  },
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reqStar: {
    color: appColors.red600,
  },
  refreshCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  refreshCodeText: {
    fontSize: 11,
    color: appColors.blue600,
    fontWeight: '600',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: appColors.slate900,
    backgroundColor: appColors.white,
  },
  inputDisabled: {
    backgroundColor: appColors.slate100,
    color: appColors.slate500,
    borderColor: appColors.slate200,
  },
  inputHelperText: {
    fontSize: 10,
    color: appColors.slate500,
    marginTop: 2,
  },
  visitorNoticeBox: {
    backgroundColor: '#faf5ff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitorNoticeText: {
    fontSize: 12,
    color: '#6b21a8',
    flex: 1,
    lineHeight: 16,
  },
  inputErrorBorder: {
    borderColor: appColors.red500,
    backgroundColor: '#fff5f5',
  },
  errorMsgText: {
    fontSize: 11,
    color: appColors.red600,
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appColors.slate200,
    backgroundColor: appColors.slate50,
    overflow: 'hidden',
    height: 40,
  },
  segmentBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: appColors.blue600,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: appColors.slate600,
  },
  segmentTextActive: {
    color: appColors.white,
  },
  dropdownBtn: {
    height: 40,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: appColors.white,
  },
  dropdownText: {
    fontSize: 13,
    color: appColors.slate800,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: appColors.slate100,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: appColors.slate300,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appColors.white,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: appColors.slate600,
  },
  saveBtn: {
    flex: 2,
    height: 42,
    backgroundColor: appColors.blue600,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: appColors.white,
  },
});
