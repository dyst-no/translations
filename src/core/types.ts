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
