# Translation Library

A TypeScript-first translation library that works on both client and server environments with React support.

## Features

- **Fluent API**: Chainable translation methods with type safety
- **Universal**: Works in React, React Native, and server environments
- **Labels Support**: Enum/Object-based label translations
- **Locale Detection**: Automatic locale detection with multiple strategies
- **Type Safe**: Full TypeScript support with compile-time type checking

## Installation

```bash
bun install
```

## Usage

### Server

```typescript
import { initializeTranslations, createLabel } from '@dyst-no/translations/server';

enum UserRole {
  Admin = 'admin',
  Moderator = 'moderator',
  User = 'user'
}

const translations = initializeTranslations(['en', 'no'], 'en', {
  labels: (t) => ({
    userRole: createLabel(UserRole, {
      [UserRole.Admin]: t('Administrator').no('Administrator'),
      [UserRole.Moderator]: t('Moderator').no('Moderator'),
      [UserRole.User]: t('Regular User').no('Vanlig bruker'),
    }),
   
  }),
});

const t = translations.createTranslation('en');
console.log(t('Welcome back').no('Velkommen tilbake')); // "Welcome back"

console.log(translations.labels.userRole(UserRole.Admin)); // "Administrator"
```

### React

```typescript
import {
  initializeTranslations,
  TranslationProvider,
  createLabel
} from '@dyst-no/translations/react';
import { storage, defaultDetectors } from '@dyst-no/translations/platforms/react';

enum Priority {
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

const translations = initializeTranslations(['en', 'no'], 'en', {
  // Automatically persist locale to localStorage
  storage: storage,
  // Automatically detect locale from browser/navigator
  detectors: defaultDetectors,
  labels: (t) => ({
    priority: createLabel(Priority, {
      [Priority.Low]: t('Low Priority').no('Lav prioritet'),
      [Priority.Medium]: t('Medium Priority').no('Medium prioritet'),
      [Priority.High]: t('High Priority').no('Høy prioritet'),
    }),
  }),
  onLocaleChange: (locale, t) => {
    // Optional: Handle locale changes (update external libraries, save to server, etc.)
    console.log(`Locale changed to: ${locale}`);
  },
});

const { useTranslation } = translations;

function Root() {
  return (
    <TranslationProvider instance={translations}>
      <App />
    </TranslationProvider>
  );
}

function App() {
  const { t, labels, locale, changeLocale } = useTranslation();

  return (
    <div>
      <h1>{t('Task Manager').no('Oppgavebehandler')}</h1>

      {/* Locale is automatically detected and persisted */}
      <p>Current locale: {locale}</p>

      <select value={locale} onChange={(e) => changeLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="no">Norsk</option>
      </select>

      <div>
        <strong>{labels.priority(Priority.High)}</strong>
      </div>
    </div>
  );
}
```

## Development

```bash
# Run tests
bun run test
