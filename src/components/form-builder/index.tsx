import React from 'react';
import {
  useForm,
  SubmitHandler,
  Control,
  FieldValues,
  Path,
  Resolver,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { View } from 'react-native';
import * as yup from 'yup';
import { AppFormInput } from '../app-form-input';
import { AppButton } from '../app-button';

type FieldType = 'text' | 'email' | 'password' | 'number' | 'phone';

export type FormField<T extends FieldValues> = {
  name: keyof T;
  label?: string;
  placeholder?: string;
  type?: FieldType;
  secure?: boolean;
  multiline?: boolean;
};

type FormBuilderProps<T extends FieldValues> = {
  fields: FormField<T>[];
  schema: yup.ObjectSchema<T>;
  onSubmit: SubmitHandler<T>;
  submitLabel?: string;
};

export function FormBuilder<T extends FieldValues>({
  fields,
  schema,
  onSubmit,
  submitLabel = 'Submit',
}: FormBuilderProps<T>) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<T>({
    resolver: yupResolver(schema) as unknown as Resolver<T>,
  });

  const renderField = (field: FormField<T>) => {
    const isSecure = field.type === 'password' || field.secure;
    return (
      <AppFormInput<T>
        key={field.name as string}
        name={field.name as Path<T>}
        control={control}
        label={field.label}
        placeholder={field.placeholder}
        secure={isSecure}
        multiline={field.multiline}
      />
    );
  };

  return (
    <View>
      {fields.map(renderField)}
      <AppButton
        title={submitLabel}
        onPress={() => handleSubmit(onSubmit)()}
        loading={isSubmitting}
      />
    </View>
  );
}
