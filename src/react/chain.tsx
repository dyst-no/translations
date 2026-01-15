import { createContext, useCallback, useContext, useState } from 'react';
import type { ChainLocales, TranslationFunction, BaseChainInstance, LocaleDetector, StorageInterface } from '../core';
import { detectLocale, createTranslationFunction, createLabel } from '../core';

export interface ChainInstance<
  TLocales extends readonly string[],
  TBase extends TLocales[number],
  TLabels extends Record<string, any> = Record<string, never>,
> extends BaseChainInstance<TLocales, TBase> {
  useTranslation: () => {
    t: TranslationFunction<TLocales, TBase>;
    changeLocale: (locale: TLocales[number]) => void;
    locale: TLocales[number];
    labels: TLabels;
  };
  translationStore: {
    t: TranslationFunction<TLocales, TBase>;
    changeLocale: (locale: TLocales[number]) => void;
    locale: TLocales[number];
    labels: TLabels;
  };
}

const TranslationContext = createContext<{
  t: TranslationFunction<any, any>;
  changeLocale: (locale: string) => void;
  locale: string;
  labels: any;
} | null>(null);

export function useUntypedTranslation<TInstance extends ChainInstance<any, any, any>>(): ReturnType<
  TInstance['useTranslation']
> {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context as ReturnType<TInstance['useTranslation']>;
}

// Update TranslationProvider to accept instance prop
export function TranslationProvider({
  children,
  instance,
}: {
  children: React.ReactNode;
  instance: ChainInstance<any, any, any>;
}) {
  const [locale, setLocale] = useState(instance.translationStore.locale);

  const changeLocale = useCallback(
    (newLocale: typeof locale) => {
      setLocale(newLocale);
      instance.translationStore.changeLocale(newLocale);
    },
    [instance.translationStore.changeLocale],
  );

  return (
    <TranslationContext.Provider
      value={{
        t: instance.translationStore.t,
        changeLocale,
        locale,
        labels: instance.translationStore.labels,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function initializeTranslations<
  const TLocales extends readonly string[],
  const TBase extends TLocales[number],
  const TLabels extends Record<string, any> = Record<string, never>,
>(
  supportedLocales: TLocales,
  baseLocale: TBase,
  options: {
    /**
     * A callback function that runs after the locale has been changed.
     * Can be used to update other parts of the application that depend on the locale, this runs within the same render cycle as the locale change.
     */
    onLocaleChange?: (locale: TLocales[number], t: TranslationFunction<TLocales, TBase>) => void;
    /**
     * Custom locale detectors to determine the initial locale.
     * If not provided, uses the default detector chain: [detectors.localStorage, detectors.url, detectors.navigator]
     * Detectors are tried in order until a supported locale is found.
     */
    detectors?: LocaleDetector<ChainLocales<TLocales>>[];
    storage?: StorageInterface;
    labels?: (t: TranslationFunction<TLocales, TBase>) => TLabels;
    /**
     * If true, the translation chain will return a primitive string as soon as all supported locales are provided.
     * This is useful for react native apps, where if we pass a translation chain to a native component/module/function, it doesn't correctly resolve to a string primitive.
     * Downside of using this is that if we chain a locale after the final locale, it will throw an error.
     * @default false
     */
    returnPrimitive?: boolean;
  } = {},
): ChainInstance<TLocales, TBase, TLabels> {
  type SupportedLocales = ChainLocales<TLocales>;

  // Create a mutable locale holder that translation builders can reference
  const initialLocale = detectLocale(supportedLocales, baseLocale, options.detectors || []) as SupportedLocales;
  const localeHolder = { current: initialLocale };

  // Create a store type
  type TranslationStore = {
    t: TranslationFunction<TLocales, TBase>;
    changeLocale: (locale: SupportedLocales) => void;
    locale: SupportedLocales;
    labels: TLabels;
  };

  // Create a function that generates the t function wrapper
  const createTFunction = (): TranslationFunction<TLocales, TBase> => {
    return createTranslationFunction(supportedLocales, baseLocale, localeHolder.current, options.returnPrimitive);
  };

  // Create a function that generates labels
  const createLabels = (): TLabels => {
    if (!options.labels) {
      return {} as TLabels;
    }
    return options.labels(createTFunction());
  };

  // Create the global store instance
  const translationStore: TranslationStore = {
    locale: initialLocale,
    t: createTFunction(),
    labels: createLabels(),
    changeLocale: (newLocale: SupportedLocales) => {
      translationStore.locale = newLocale;
      localeHolder.current = newLocale;
      // Create a new t function wrapper for the new locale
      translationStore.t = createTFunction();
      // Regenerate labels with the new locale
      translationStore.labels = createLabels();
      options.onLocaleChange?.(newLocale, translationStore.t);
      if (options?.storage?.setItem) {
        options.storage.setItem('locale', newLocale);
      }
    },
  };

  // Trigger changeLocale so that the onLocaleChange callback is called, in case it needs initialization
  translationStore.changeLocale(translationStore.locale);

  const instance: ChainInstance<TLocales, TBase, TLabels> = {
    useTranslation: useUntypedTranslation,
    translationStore,
    supportedLocales,
    baseLocale,
  };

  return instance;
}

// Re-export createLabel for convenience
export { createLabel };
