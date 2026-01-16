import { test, expect, describe, beforeEach } from 'bun:test';
import { z } from 'zod';
import { initializeTranslations } from '../react/chain';
import { storage, detectors } from '../platforms/react';
import { zodEn, zodNo, zodPl } from '.';

beforeEach(() => {
  localStorage.clear();
});

const chain = initializeTranslations(['en', 'no', 'pl'] as const, 'en', {
  storage,
  detectors: [detectors.localStorage, detectors.url, detectors.navigator],
  onLocaleChange: (locale) => {
    const ZOD_LOCALES = {
      en: zodEn,
      no: zodNo,
      pl: zodPl,
    } satisfies Record<typeof locale, any>;
    z.config(ZOD_LOCALES[locale]());
  },
});

describe('Zod localized error tests', () => {
  describe('basic string/object validation', () => {
    test('email validation should be translated to English', () => {
      chain.translationStore.changeLocale('en');

      const schema = z.email();

      const shortResult = schema.safeParse('ab');
      expect(shortResult.success).toBe(false);
      if (!shortResult.success) {
        const actualMessage = z.treeifyError(shortResult.error).errors[0];
        const expectedMessage = 'Please enter a valid email address';

        expect(actualMessage).toEqual(expectedMessage);
      } else {
        throw new Error('Short result should not be successful');
      }

      const emailSchema = z.email();
      const invalidEmailResult = emailSchema.safeParse('notanemail');
      expect(invalidEmailResult.success).toBe(false);
      if (!invalidEmailResult.success) {
        expect(z.treeifyError(invalidEmailResult.error).errors[0]).toEqual('Please enter a valid email address');
      }
    });

    test('email validation should be translated to Norwegian', () => {
      chain.translationStore.changeLocale('no');
      const emailSchema = z.email();
      const invalidEmailResultNo = emailSchema.safeParse('notanemail');
      if (invalidEmailResultNo.success) throw new Error('Invalid email result should not be successful');

      expect(z.treeifyError(invalidEmailResultNo.error).errors[0]).toEqual(
        'Vennligst skriv inn en gyldig e-postadresse',
      );
    });

    const userSchema = z.object({
      name: z.string().min(2),
      age: z.number().min(18),
    });

    const invalidUser = {
      name: 'A',
      age: 15,
    };

    test('user object validation should be translated to Norwegian', () => {
      chain.translationStore.changeLocale('no');
      const result = userSchema.safeParse(invalidUser);
      if (result.success) throw new Error('Invalid user result should not be successful');

      expect(z.flattenError(result.error).fieldErrors).toEqual({
        name: ['Teksten må være på minst 2 tegn lang'],
        age: ['Tallet må være større enn eller lik 18'],
      });
    });

    test('user object validation should be translated to English', () => {
      chain.translationStore.changeLocale('en');
      const invalidUserResult = userSchema.safeParse(invalidUser);
      expect(invalidUserResult.success).toBe(false);
      if (!invalidUserResult.success) {
        expect(z.flattenError(invalidUserResult.error).fieldErrors).toEqual({
          name: ['Text must be at least 2 characters long'],
          age: ['Number must be greater than or equal to 18'],
        });
      }
    });
  });

  describe('complex schema validation', () => {
    const complexSchema = z.object({
      id: z.uuid(),
      primaryContact: z.object({
        type: z.enum(['email', 'phone']),
        value: z.string().min(5),
      }),
      tags: z.array(z.string().min(2)).min(1).max(3),
      metadata: z.object({
        createdAt: z.date(),
        updatedAt: z.date(),
      }),
      scores: z.array(z.number().min(0).max(100)).min(1),
    });

    const invalidData = {
      id: 'not-a-uuid',
      primaryContact: { type: 'email', value: 'a' },
      tags: [],
      metadata: { createdAt: 'not-a-date', updatedAt: new Date() },
      scores: [101],
    };

    test('complex schema validation should be translated to English', () => {
      chain.translationStore.changeLocale('en');
      const complexResult = complexSchema.safeParse(invalidData);
      if (complexResult.success) throw new Error('Invalid complex result should not be successful');

      const fieldErrors = z.flattenError(complexResult.error).fieldErrors;
      expect(fieldErrors.id).toEqual(['Please enter a valid ID']);
      expect(fieldErrors.primaryContact).toEqual(['Text must be at least 5 characters long']);
      expect(fieldErrors.tags).toEqual(['The list must contain at least 1 element']);
      expect(fieldErrors.metadata).toEqual(['The date has an invalid format']);
      expect(fieldErrors.scores).toEqual(['Number must be less than or equal to 100']);
    });

    test('complex schema validation should be translated to Norwegian', () => {
      chain.translationStore.changeLocale('no');
      const complexResult = complexSchema.safeParse(invalidData);
      expect(complexResult.success).toBe(false);
      if (!complexResult.success) {
        const fieldErrors = z.flattenError(complexResult.error).fieldErrors;

        expect(fieldErrors.id).toEqual(['Vennligst skriv inn en gyldig ID']);
        expect(fieldErrors.primaryContact).toEqual(['Teksten må være på minst 5 tegn lang']);
        expect(fieldErrors.tags).toEqual(['Listen må inneholde minst 1 element']);
        expect(fieldErrors.metadata).toEqual(['Datoen har et ugyldig format']);
        expect(fieldErrors.scores).toEqual(['Tallet må være mindre enn eller lik 100']);
      }
    });

    test('complex schema validation should be translated to Polish', () => {
      chain.translationStore.changeLocale('pl');
      const complexResult = complexSchema.safeParse(invalidData);
      if (complexResult.success) throw new Error('Invalid complex result should not be successful');
      if (!complexResult.success) {
        const fieldErrors = z.flattenError(complexResult.error).fieldErrors;

        expect(fieldErrors.id).toEqual(['Wprowadź poprawny ID']);
        expect(fieldErrors.primaryContact).toEqual(['Tekst musi zawierać co najmniej 5 znaków']);
        expect(fieldErrors.tags).toEqual(['Lista musi zawierać co najmniej 1 element']);
        expect(fieldErrors.metadata).toEqual(['Data ma nieprawidłowy format']);
        expect(fieldErrors.scores).toEqual(['Liczba musi być mniejsza lub równa 100']);
      }
    });

    test('single character length validation for pluralization', () => {
      const singleCharSchema = z.string().min(1);
      chain.translationStore.changeLocale('en');
      const singleCharResult = singleCharSchema.safeParse('');
      expect(singleCharResult.success).toBe(false);
      if (!singleCharResult.success) {
        expect(z.treeifyError(singleCharResult.error).errors[0]).toEqual('Text must be at least 1 character long');
      }
    });
  });

  describe('custom validation with .check', () => {
    const otpSchema = z.coerce
      .string()
      .trim()
      .check((ctx) => {
        if (ctx.value.length !== 6) {
          if (ctx.value.length > 6) {
            ctx.issues.push({
              code: 'too_big',
              maximum: 6,
              inclusive: true,
              origin: 'string',
              input: ctx.value,
              path: ['otp'],
              fatal: true,
            });
          } else {
            ctx.issues.push({
              code: 'too_small',
              minimum: 6,
              inclusive: true,
              origin: 'string',
              input: ctx.value,
              path: ['otp'],
              fatal: true,
            });
          }
        }
      });

    const customSchema = z.object({
      id: z.uuid(),
      otp: otpSchema,
      password: z.string().check((ctx) => {
        if (ctx.value.length < 8) {
          ctx.issues.push({
            code: 'too_small',
            minimum: 8,
            inclusive: false,
            origin: 'string',
            input: ctx.value,
            path: ['password'],
            fatal: true,
          });
        }
      }),
      phoneNumber: z.string().check((ctx) => {
        if (!/^\+?\d{8,15}$/.test(ctx.value)) {
          ctx.issues.push({
            code: 'invalid_format',
            format: 'regex',
            origin: 'string',
            input: ctx.value,
            path: ['phoneNumber'],
            fatal: true,
          });
        }
      }),
      arrayField: z.array(z.string()).check((ctx) => {
        if (ctx.value.length > 3) {
          ctx.issues.push({
            code: 'too_big',
            maximum: 3,
            inclusive: true,
            origin: 'array',
            input: ctx.value,
            path: ['arrayField'],
            fatal: true,
          });
        }
      }),
    });

    const invalidData = {
      id: 'not-a-uuid',
      otp: '12345',
      password: 'weak',
      phoneNumber: 'invalid-phone',
      arrayField: ['a', 'b', 'c', 'd'],
    };

    test('custom validation should be translated to English', () => {
      chain.translationStore.changeLocale('en');

      const result = customSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const fieldErrors = z.flattenError(result.error).fieldErrors;

        expect(fieldErrors.id).toEqual(['Please enter a valid ID']);

        expect(fieldErrors.otp).toEqual(['Text must be at least 6 characters long']);
        expect(fieldErrors.password).toEqual(['Text must be more than 8 characters long']);
        expect(fieldErrors.phoneNumber).toEqual(['Invalid text: must match the required format']);
        expect(fieldErrors.arrayField).toEqual(['The list must contain at most 3 elements']);
      }
    });

    test('custom validation should be translated to Norwegian', () => {
      chain.translationStore.changeLocale('no');

      const result = customSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const fieldErrors = z.flattenError(result.error).fieldErrors;

        expect(fieldErrors.otp).toEqual(['Teksten må være på minst 6 tegn lang']);
        expect(fieldErrors.password).toEqual(['Teksten må være på mer enn 8 tegn lang']);
        expect(fieldErrors.arrayField).toEqual(['Listen må inneholde maksimalt 3 elementer']);
      }
    });

    test('custom validation should be translated to Polish', () => {
      chain.translationStore.changeLocale('pl');

      const result = customSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const fieldErrors = z.flattenError(result.error).fieldErrors;

        expect(fieldErrors.otp).toEqual(['Tekst musi zawierać co najmniej 6 znaków']);
        expect(fieldErrors.password).toEqual(['Tekst musi zawierać więcej niż 8 znaków']);
        expect(fieldErrors.arrayField).toEqual(['Lista musi zawierać maksymalnie 3 elementi']);
      }
    });

    test('custom validation should pass with valid data', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        otp: '123456',
        password: 'StrongPass123',
        phoneNumber: '+1234567890',
        arrayField: ['a', 'b', 'c'],
      };

      const validResult = customSchema.safeParse(validData);
      expect(validResult.success).toBe(true);
    });
  });
});
