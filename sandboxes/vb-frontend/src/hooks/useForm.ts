import { useState, useCallback, ChangeEvent, FormEvent } from 'react';

interface ValidationRule<T> {
  validate: (value: T, formValues?: any) => boolean;
  message: string;
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

interface UseFormReturn<T> {
  values: T;
  setValues: (values: T) => void;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSubmit: (onSubmit: () => Promise<void>) => (e: FormEvent) => void;
  fieldErrors: { [K in keyof T]?: string };
  formError: string | null;
  setFormError: (error: string | null) => void;
  isSubmitting: boolean;
  validateForm: () => boolean;
  setFieldRules: <K extends keyof T>(field: K, rules: ValidationRule<T[K]>[]) => void;
  resetForm: () => void;
}

/**
 * Custom hook for form handling with validation
 */
export function useForm<T extends Record<string, any>>(initialValues: T): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<{ [K in keyof T]?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldRules, setAllFieldRules] = useState<ValidationRules<T>>({});

  /**
   * Validate a specific field against its rules
   */
  const validateField = useCallback(
    (field: keyof T, value: any, candidateValues: T = values) => {
    const rules = fieldRules[field];
    if (!rules) return true;

    for (const rule of rules) {
      if (!rule.validate(value, candidateValues)) {
        setFieldErrors(prev => ({
          ...prev,
          [field]: rule.message
        }));
        return false;
      }
    }

    // Clear error if validation passes
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    return true;
  }, [fieldRules, values]);

  /**
   * Handle input changes
   */
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;

    // Process different input types
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }

    const nextValues = {
      ...values,
      [name]: processedValue
    };

    setValues(nextValues);

    // Validate the field if it has rules
    if (fieldRules[name as keyof T]) {
      validateField(name as keyof T, processedValue, nextValues);
    }

    // Revalidate fields that currently have errors so cross-field rules clear immediately
    const erroredFields = Object.keys(fieldErrors) as (keyof T)[];
    erroredFields.forEach((field) => {
      if (field === (name as keyof T) || !fieldRules[field]) return;
      validateField(field, nextValues[field], nextValues);
    });
  }, [fieldErrors, fieldRules, validateField, values]);

  /**
   * Validate the entire form
   */
  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors: { [K in keyof T]?: string } = {};

    // Validate each field with rules
    for (const field in fieldRules) {
      const rules = fieldRules[field as keyof T];
      if (!rules) continue;

      const fieldValue = values[field as keyof T];
      let fieldIsValid = true;

      for (const rule of rules) {
        if (!rule.validate(fieldValue, values)) {
          newErrors[field as keyof T] = rule.message;
          isValid = false;
          fieldIsValid = false;
          break;
        }
      }

      if (fieldIsValid) {
        delete newErrors[field as keyof T];
      }
    }

    setFieldErrors(newErrors);
    return isValid;
  }, [fieldRules, values]);

  /**
   * Set validation rules for a field
   */
  const setFieldRules = useCallback(<K extends keyof T>(field: K, rules: ValidationRule<T[K]>[]) => {
    setAllFieldRules(prev => ({
      ...prev,
      [field]: rules
    }));
  }, []);

  /**
   * Form submission handler
   */
  const handleSubmit = useCallback((onSubmit: () => Promise<void>) => {
    return async (e: FormEvent) => {
      e.preventDefault();
      setFormError(null);

      // Validate form before submission
      const isValid = validateForm();
      if (!isValid) return;

      setIsSubmitting(true);
      try {
        await onSubmit();
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [validateForm]);

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setFieldErrors({});
    setFormError(null);
  }, [initialValues]);

  return {
    values,
    setValues,
    handleChange,
    handleSubmit,
    fieldErrors,
    formError,
    setFormError,
    isSubmitting,
    validateForm,
    setFieldRules,
    resetForm
  };
}