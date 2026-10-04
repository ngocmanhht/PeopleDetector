import * as yup from 'yup';

export const userProfileSchema = yup.object().shape({
  code: yup.string().trim().default(''),
  fullName: yup.string().trim().required('Họ và tên không được để trống'),
  dateOfBirth: yup
    .string()
    .trim()
    .required('Ngày tháng năm sinh là bắt buộc')
    .test('valid-date', 'Ngày sinh không hợp lệ (Định dạng: DD/MM/YYYY hoặc YYYY-MM-DD)', (value) => {
      if (!value) return false;
      const clean = value.trim();
      // Allow DD/MM/YYYY or YYYY-MM-DD
      const ddmmyyyy = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/;
      const yyyymmdd = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/;
      return ddmmyyyy.test(clean) || yyyymmdd.test(clean);
    }),
  gender: yup
    .string()
    .oneOf(['Nam', 'Nữ', 'Khác'], 'Vui lòng chọn giới tính')
    .required('Giới tính là bắt buộc'),
  idCardNumber: yup
    .string()
    .trim()
    .required('Số CCCD/CMND là bắt buộc'),
  idCardStatus: yup.string().nullable().default('Đã có'),
  age: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      String(originalValue).trim() === '' || isNaN(Number(originalValue)) ? null : Number(originalValue)
    ),

  // Logic Khách thăm gặp (isVisitor)
  isVisitor: yup.boolean().default(false),
  visitedProfileId: yup.string().nullable().when('isVisitor', {
    is: true,
    then: schema => schema.required('Vui lòng chọn người được thăm gặp'),
    otherwise: schema => schema.nullable().notRequired(),
  }),

  // Nơi thường trú
  permanentProvince: yup.string().nullable().default(''),
  permanentDistrict: yup.string().nullable().default(''),
  permanentWard: yup.string().nullable().default(''),
  permanentAddress: yup.string().nullable().default(''),

  // Quyết định cai nghiện
  decisionType: yup.string().nullable().default(''),
  decisionNumber: yup.string().nullable().default(''),
  decisionIssuedDate: yup.string().nullable().default(''),
  decisionIssuedUnit: yup.string().nullable().default(''),
  decisionExecDate: yup.string().nullable().default(''),
  admissionDate: yup.string().nullable().default(''),
  detoxDuration: yup.string().nullable().default(''),
  reducedDuration: yup.string().nullable().default(''),
  reintegrationDate: yup.string().nullable().default(''),

  // Thông tin xác định dương tính ma túy
  drugType: yup.string().nullable().default(''),
  drugTestDate: yup.string().nullable().default(''),
  drugTestUnit: yup.string().nullable().default(''),
  drugUsageForm: yup.string().nullable().default(''),
  drugUsageReason: yup.string().nullable().default(''),

  // Phiếu xác định tình trạng nghiện
  addictionReportNumber: yup.string().nullable().default(''),
  addictionReportDate: yup.string().nullable().default(''),
  addictionReportUnit: yup.string().nullable().default(''),

  // Nhân thân & Xã hội
  admissionCount: yup
    .number()
    .nullable()
    .transform((value, originalValue) =>
      String(originalValue).trim() === '' || isNaN(Number(originalValue)) ? null : Number(originalValue)
    ),
  educationLevel: yup.string().nullable().default(''),
  occupation: yup.string().nullable().default(''),
  recordNumber: yup.string().nullable().default(''),
  criminalRecord: yup.string().nullable().default(''),
  fatherName: yup.string().nullable().default(''),
  motherName: yup.string().nullable().default(''),
  ethnicity: yup.string().nullable().default('Kinh'),
  religion: yup.string().nullable().default('Không'),

  // Quản lý cơ sở
  zoneId: yup.string().nullable().default(''),
  roomId: yup.string().nullable().default(''),
  zoneManagerName: yup.string().nullable().default(''),
});

export type UserProfileFormValues = yup.InferType<typeof userProfileSchema>;
