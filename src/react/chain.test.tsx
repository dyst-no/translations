// biome-ignore lint/correctness/noUnusedImports: we need react for the type checking in IDE
import React from 'react';
import { test, expect, beforeEach } from 'bun:test';
import { render, screen, act } from '@testing-library/react';
import { createLabel, initializeTranslations, TranslationProvider, type ChainInstance } from './chain';
import { detectors, storage } from '../platforms/react';

beforeEach(() => {
  // Clear any potential state between tests
  localStorage.clear();

  // Reset window.navigator.languages
  Object.defineProperty(window.navigator, 'languages', {
    value: [],
    configurable: true,
  });

  // Reset window.location
  Object.defineProperty(window, 'location', {
    value: new URL('http://example.com'),
    configurable: true,
  });
});

test('Translation Provider and Hook usage', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.localStorage],
    storage,
  });
  const { useTranslation } = chain;

  function TestComponent() {
    const { t, locale, changeLocale } = useTranslation();
    return (
      <div>
        <div data-testid="greeting">{t('hello').no('hei').ro('salut')}</div>
        <div data-testid="current-locale">{locale}</div>
        <button onClick={() => changeLocale('no')} data-testid="change-locale" type="button">
          Change to Norwegian
        </button>
      </div>
    );
  }

  render(
    <TranslationProvider instance={chain}>
      <TestComponent />
    </TranslationProvider>,
  );

  // Test initial render (English)
  expect(screen.getByTestId('greeting').textContent).toBe('hello');
  expect(screen.getByTestId('current-locale').textContent).toBe('en');

  // Test locale change
  act(() => {
    screen.getByTestId('change-locale').click();
  });

  expect(screen.getByTestId('greeting').textContent).toBe('hei');
  expect(screen.getByTestId('current-locale').textContent).toBe('no');
});

test('Translation store usage', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', { storage });
  const { translationStore } = chain;

  expect(translationStore.locale).toBe('en');
  translationStore.changeLocale('no');

  const greetingAfterChange = translationStore.t('hello').no('hei').ro('salut');
  expect(String(greetingAfterChange)).toBe('hei');
});

test('onLocaleChange callback', async () => {
  let callbackCount = 0;
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    onLocaleChange: () => {
      callbackCount++;
    },
    storage,
  });

  // Wait for initial callback
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(callbackCount).toBe(1); // Initial call

  await chain.translationStore.changeLocale('no');
  expect(callbackCount).toBe(2); // Called after change
});

test('default locale when no detection method is available', () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', { storage });
  expect(chain.translationStore.locale).toBe('en');
});

test('navigator language detector', () => {
  // Mock navigator.languages
  Object.defineProperty(window.navigator, 'languages', {
    value: ['ro', 'en'],
    configurable: true,
  });

  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.navigator],
    storage,
  });
  expect(chain.translationStore.locale).toBe('ro');
});

test('localStorage detector and persistence', () => {
  // Set initial value in localStorage
  localStorage.setItem('locale', 'ro');

  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.localStorage],
    storage,
  });
  expect(chain.translationStore.locale).toBe('ro');

  // Change locale and verify it's persisted
  chain.translationStore.changeLocale('no');
  expect(localStorage.getItem('locale')).toBe('no');
});

test('URL detector', () => {
  // Mock URL with locale parameter
  Object.defineProperty(window, 'location', {
    value: new URL('http://example.com?locale=no'),
    configurable: true,
  });

  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.url],
    storage,
  });
  expect(chain.translationStore.locale).toBe('no');
});

test('detector priority order', () => {
  // Set up multiple detection methods
  localStorage.setItem('locale', 'ro');
  Object.defineProperty(window.navigator, 'languages', {
    value: ['no', 'en'],
    configurable: true,
  });
  Object.defineProperty(window, 'location', {
    value: new URL('http://example.com?locale=en'),
    configurable: true,
  });

  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.localStorage, detectors.url, detectors.navigator],
    storage,
  });
  expect(chain.translationStore.locale).toBe('ro');
});

test('custom detector implementation', () => {
  const customDetector = () => 'no' as const;

  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [customDetector],
    storage,
  });
  expect(chain.translationStore.locale).toBe('no');
});

test('storage persistence', async () => {
  const chain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', { storage });

  await chain.translationStore.changeLocale('no');
  expect(localStorage.getItem('locale')).toBe('no');

  const newChain = initializeTranslations(['en', 'no', 'ro'] as const, 'en', {
    detectors: [detectors.localStorage],
    storage,
  });
  expect(newChain.translationStore.locale).toBe('no');
});

test('null and undefined handling fallback to base locale', () => {
  const chain = initializeTranslations(['en', 'no', 'pl'] as const, 'en', { storage });
  const { translationStore } = chain;

  // Test with null values - should fallback to base locale (en)
  translationStore.changeLocale('no');
  const greetingWithNull = translationStore.t('hello').no(null).pl('dzien dobry');
  expect(String(greetingWithNull)).toBe('hello'); // Falls back to base locale

  // Test with undefined values - should fallback to base locale (en)
  translationStore.changeLocale('pl');
  const greetingWithUndefined = translationStore.t('hello').no('hei').pl(undefined);
  expect(String(greetingWithUndefined)).toBe('hello'); // Falls back to base locale

  // Test with mixed null/undefined - should fallback to base locale (en)
  translationStore.changeLocale('no');
  const greetingWithMixed = translationStore.t('hello').no(null).pl(undefined);
  expect(String(greetingWithMixed)).toBe('hello'); // Falls back to base locale

  // Test valid translation still works after null/undefined
  translationStore.changeLocale('no');
  const validGreeting = translationStore.t('hello').no('hei').pl('dzien dobry');
  expect(String(validGreeting)).toBe('hei'); // Should work normally

  // Test that base locale is not affected by null/undefined in other locales
  translationStore.changeLocale('en');
  const baseLocaleGreeting = translationStore.t('hello').no(null).pl(undefined);
  expect(String(baseLocaleGreeting)).toBe('hello'); // Base locale should work

  // TypeScript should prevent null/undefined in base locale method
  // The following should not compile (commenting out to avoid TS errors in tests):
  // translationStore.t(null); // Should be a TypeScript error
  // translationStore.t(undefined); // Should be a TypeScript error
});

test('primitive mode: chaining unsupported locales after completion throws an error', () => {
  const chain = initializeTranslations(['en', 'no'] as const, 'en', {
    storage,
    returnPrimitive: true,
  });
  const overriddenChain = chain as unknown as ChainInstance<readonly ['en', 'no', 'pl'], 'en'>;
  const appTranslationStore = overriddenChain.translationStore;
  // This call should throw an error because .pl() is called on a primitive string
  expect(() => {
    appTranslationStore.t('hello').no('hei').pl('cześć');
  }).toThrow();
  // A regular chain should still work and return a string
  const greeting = appTranslationStore.t('another').no('en annen');
  expect(greeting).toBe('another' as any);
});
test('primitive mode: final translation returns a primitive string', () => {
  const chain = initializeTranslations(['en', 'no'] as const, 'en', { storage, returnPrimitive: true });
  const { translationStore } = chain;
  // Set locale to 'en'
  act(() => {
    translationStore.changeLocale('en');
  });
  const greetingEn = translationStore.t('hello').no('hei');
  expect(typeof greetingEn).toBe('string');
  expect(greetingEn).toBe('hello');
  // Set locale to 'no'
  act(() => {
    translationStore.changeLocale('no');
  });
  const greetingNo = translationStore.t('hello').no('hei');
  expect(typeof greetingNo).toBe('string');
  expect(greetingNo).toBe('hei');
});

test('labels: using createLabel helper', () => {
  const ViolationType = {
    TooMuchDriving: 'TooMuchDriving',
    InsufficientRest: 'InsufficientRest',
  } as const;

  const chain = initializeTranslations(['en', 'no'] as const, 'en', {
    storage,
    labels: (t) => ({
      violation: createLabel(ViolationType, {
        TooMuchDriving: t('Too Much Driving').no('For mye kjøring'),
        InsufficientRest: t('Insufficient Rest').no('Utilstrekkelig hvile'),
      }),
    }),
  });
  const { translationStore } = chain;
  expect(String(translationStore.labels.violation('TooMuchDriving'))).toBe('Too Much Driving');
  translationStore.changeLocale('no');
  expect(String(translationStore.labels.violation('TooMuchDriving'))).toBe('For mye kjøring');
});

test('labels: accessible from useTranslation hook', () => {
  enum Status {
    Active = 'Active',
    Inactive = 'Inactive',
  }

  const chain = initializeTranslations(['en', 'no'] as const, 'en', {
    storage,
    labels: (t) => ({
      status: createLabel(Status, {
        Active: t('Active').no('Aktiv'),
        Inactive: t('Inactive').no('Inaktiv'),
      }),
    }),
  });

  const { useTranslation } = chain;

  function TestComponent() {
    const { labels, changeLocale } = useTranslation();
    return (
      <div>
        <div data-testid="status">{labels.status(Status.Active)}</div>
        <button onClick={() => changeLocale('no')} data-testid="change-locale" type="button">
          Change
        </button>
      </div>
    );
  }

  render(
    <TranslationProvider instance={chain}>
      <TestComponent />
    </TranslationProvider>,
  );

  expect(screen.getByTestId('status').textContent).toBe('Active');
  act(() => screen.getByTestId('change-locale').click());
  expect(screen.getByTestId('status').textContent).toBe('Aktiv');
});

test('labels: updates when locale changes', () => {
  enum Role {
    Admin = 'Admin',
    User = 'User',
  }

  const chain = initializeTranslations(['en', 'no'] as const, 'en', {
    storage,
    labels: (t) => ({
      role: createLabel(Role, {
        Admin: t('Administrator').no('Administrator'),
        User: t('User').no('Bruker'),
      }),
    }),
  });

  expect(String(chain.translationStore.labels.role(Role.User))).toBe('User');
  chain.translationStore.changeLocale('no');
  expect(String(chain.translationStore.labels.role(Role.User))).toBe('Bruker');
});
