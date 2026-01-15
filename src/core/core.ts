// Core translation functionality shared between client and server

// Shared types for translation system
export type ChainLocales<T extends readonly string[]> = T[number];

export type Translations<SupportedLocales extends string> = Partial<Record<SupportedLocales, string>>;

// Check if all supported locales are present in the translations
export type IsComplete<T extends Translations<SupportedLocales>, SupportedLocales extends string> = T extends Record<
  SupportedLocales,
  string
>
  ? true
  : false;

// Helper type to check if all translations are present
export type MissingTranslationsError<
  T,
  SupportedLocales extends string,
> = `❌ Missing: ${Exclude<SupportedLocales, keyof T>}`;

export type TranslationFunction<TLocales extends readonly string[], TBase extends TLocales[number]> = (
  text: string,
) => TranslationChain<
  // @ts-expect-error
  { [key in TBase]: string },
  ChainLocales<TLocales>,
  TBase
>;

/** @internal This symbol is used internally to mark incomplete translations */
export const incompleteTranslationBrand = Symbol('incompleteTranslation');
export type IncompleteTranslation = typeof incompleteTranslationBrand;

export type TranslationChain<
  T extends Translations<TSupportedLocales>,
  TSupportedLocales extends string,
  TBase extends string = string,
> = IsComplete<T, TSupportedLocales> extends true
  ? string
  : {
      // Generate methods for each missing locale - base locale only accepts string, others accept string | null | undefined
      [K in Exclude<TSupportedLocales, keyof T>]: (
        text: K extends TBase ? string : string | null | undefined,
      ) => TranslationChain<T & Record<K, string>, TSupportedLocales, TBase>;
    } & {
      // Use the Symbol to cause incomplete translations to be errors in React
      [K in MissingTranslationsError<T, TSupportedLocales>]: IncompleteTranslation;
    };

export type LocaleDetector<T extends string = string> = () => T | null;

export interface StorageInterface {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

// Base ChainInstance interface that can be extended by platform-specific implementations
export interface BaseChainInstance<TLocales extends readonly string[], TBase extends TLocales[number]> {
  supportedLocales: TLocales;
  baseLocale: TBase;
}

// Utility types for extracting information from ChainInstance implementations
export type ExtractLocales<T extends BaseChainInstance<any, any>> = T extends BaseChainInstance<
  infer TLocales,
  infer _TBase
>
  ? TLocales
  : never;

export type ExtractTFunction<T extends BaseChainInstance<any, any>> = T extends BaseChainInstance<
  infer TLocales,
  infer TBase
>
  ? TranslationFunction<TLocales, TBase>
  : never;

export interface TranslationBuilderConfig {
  supportedLocales: readonly string[];
  baseLocale: string;
  returnPrimitive?: boolean;
  currentLocale: string;
}

export class TranslationBuilder<T extends Translations<string>> extends String {
  constructor(
    private config: TranslationBuilderConfig,
    private translations: T,
  ) {
    super();

    // Use a Proxy to intercept property access and provide the fluent API
    // biome-ignore lint/correctness/noConstructorReturn: we do need to return a value from the constructor
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        // If the property exists on the target or is a symbol, return it normally
        // This handles built-in methods like toString, valueOf, etc.
        if (prop in target || typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }

        // For any other property (locale keys like 'en', 'no', 'pl'),
        // return a function that accepts the translation text for that locale
        return (text: string | null | undefined) => {
          // Build new translations object with the provided text for this locale
          const newTranslations =
            text != null
              ? { ...(target.translations as object), [prop as string]: text }
              : { ...(target.translations as object) };

          if (this.config.returnPrimitive) {
            // Check if all required locales are now present
            const hasAllLocales = this.config.supportedLocales.every((locale) => locale in newTranslations);

            // If all locales are present, return the resolved string directly
            if (hasAllLocales) {
              const resolvedString =
                newTranslations[this.config.currentLocale] ?? newTranslations[this.config.baseLocale];
              return resolvedString;
            }
          }

          // Return a new TranslationBuilder with the updated translations
          // This enables method chaining like: t('Hello').en('Hello').no('Hei')
          return new TranslationBuilder(this.config, newTranslations as any);
        };
      },
    });
  }

  // Convert to primitive string when used in React components
  [Symbol.toPrimitive](): string {
    return this.toString();
  }

  public override valueOf(): string {
    return this.toString();
  }

  public override toString(): string {
    const translations = this.translations as Record<string, string>;
    return translations[this.config.currentLocale] ?? translations[this.config.baseLocale]!;
  }
}

// Shared locale detection logic
export function detectLocale(
  supportedLocales: readonly string[],
  fallbackLocale: string,
  detectors: LocaleDetector[],
): string {
  for (const detector of detectors) {
    const detectedLocale = detector();
    if (detectedLocale && supportedLocales.includes(detectedLocale)) {
      return detectedLocale;
    }
  }
  // If no match is found, return the fallbackLocale
  return fallbackLocale;
}

// Utility function to create a translation function
export function createTranslationFunction<TLocales extends readonly string[], TBase extends TLocales[number]>(
  supportedLocales: TLocales,
  baseLocale: TBase,
  currentLocale: string,
  returnPrimitive?: boolean,
): TranslationFunction<TLocales, TBase> {
  return (baseText: string) =>
    new TranslationBuilder(
      {
        supportedLocales,
        baseLocale,
        currentLocale,
        returnPrimitive,
      },
      { [baseLocale]: baseText },
    ) as any;
}

export function createLabel<
  TEnum extends Record<string, string | number>,
  TResult extends { [K in keyof TEnum]: string },
>(enumObj: TEnum, translations: TResult) {
  type EnumValue = TEnum[keyof TEnum];
  type EnumKey = keyof TEnum;
  return (value: EnumValue | EnumKey) => {
    for (const key in enumObj) {
      if (enumObj[key] === value || key === value) {
        return translations[key as keyof TResult];
      }
    }
    return String(value);
  };
}
