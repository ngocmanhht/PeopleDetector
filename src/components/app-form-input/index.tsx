import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { AppTextInput } from '../app-text-input';

type AppFormInputProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  secure?: boolean;
  [key: string]: any;
};

export const AppFormInput = <T extends FieldValues>({
  name,
  control,
  label,
  secure,
  ...rest
}: AppFormInputProps<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <AppTextInput
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          secure={secure}
          error={error?.message}
          status={error ? 'error' : 'default'}
          {...rest}
        />
      )}
    />
  );
};
