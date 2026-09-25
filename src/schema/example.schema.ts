import * as yup from 'yup';

export const exampleSchema = () =>
  yup.object({
    phone: yup
      .string()
      .required('validationPhoneRequired')
      .min(10, 'validationPhoneMinLength')
      .max(11, 'validationPhoneMaxLength'),
  });
