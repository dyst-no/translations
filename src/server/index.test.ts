import { expect, test } from 'bun:test';
import { type ExtractLocales } from '../core';
import { initializeTranslations, createLabel } from '.';

test('translation chain', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en');

  // Test English translations (default language)
  const tEn = chain.createTranslation('en');
  const greetingEn = tEn('hello').no('hei').ro('salut');
  expect(String(greetingEn)).toBe('hello');

  // Test Norwegian translations
  const tNo = chain.createTranslation('no');
  const greetingNo = tNo('hello').no('hei').ro('salut');
  expect(String(greetingNo)).toBe('hei');

  // Test Romanian translations
  const tRo = chain.createTranslation('ro');
  const greetingRo = tRo('hello').no('hei').ro('salut');
  expect(String(greetingRo)).toBe('salut');
});

test('type safety with ExtractLocales', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en');

  // This type assertion verifies that ExtractLocales correctly extracts the locale tuple type
  type ExtractedLocales = ExtractLocales<typeof chain>;
  type Expected = readonly ['en', 'no', 'ro'];

  // TypeScript will error if these types don't match
  const _typeCheck: Expected = ['en', 'no', 'ro'] as ExtractedLocales;

  // Verify that we can't use unsupported locales
  // @ts-expect-error - "fr" is not a supported locale
  chain.createTranslation('fr');
});

test('incomplete translation chain', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en');
  const t = chain.createTranslation('en');

  // Create an incomplete chain (missing Romanian translation)
  const incomplete = t('hello').no('hei');

  // Verify the incomplete chain has the correct type
  type HasRoMethod = typeof incomplete extends { ro: (text: string) => any } ? true : false;
  const _typeCheck: true = {} as HasRoMethod;

  // Runtime check - incomplete chains should still return the base language
  expect(String(incomplete)).toBe('hello');
});

test('labels functionality in server', () => {
  enum Status {
    Active = 'Active',
    Inactive = 'Inactive',
  }

  const chain = initializeTranslations(['en', 'no'] as const, 'en', {
    labels: (t) => ({
      status: createLabel(Status, {
        Active: t('Active').no('Aktiv'),
        Inactive: t('Inactive').no('Inaktiv'),
      }),
    }),
  });
  expect(String(chain.labels.status('Active'))).toBe('Active');
  expect(String(chain.labels.status('Inactive'))).toBe('Inactive');
});
