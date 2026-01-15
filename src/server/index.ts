import type { BaseChainInstance, TranslationFunction, ChainLocales } from '../core';
import { TranslationBuilder, createLabel, type ExtractLocales, type ExtractTFunction } from '../core';

export interface ChainInstance<
  TLocales extends readonly string[],
  TBase extends TLocales[number],
  TLabels extends Record<string, any> = Record<string, never>,
> extends BaseChainInstance<TLocales, TBase> {
  createTranslation: (locale: TLocales[number]) => TranslationFunction<TLocales, TBase>;
  labels: TLabels;
}

export function initializeTranslations<
  const TLocales extends readonly string[],
  const TBase extends TLocales[number],
  const TLabels extends Record<string, any> = Record<string, never>,
>(
  locales: TLocales,
  baseLocale: TBase,
  options: {
    labels?: (t: TranslationFunction<TLocales, TBase>) => TLabels;
  } = {},
): ChainInstance<TLocales, TBase, TLabels> {
  type SupportedLocales = ChainLocales<TLocales>;

  function createTranslation(locale: SupportedLocales): TranslationFunction<TLocales, TBase> {
    return (baseText: string) => {
      return new TranslationBuilder(
        {
          supportedLocales: locales,
          baseLocale,
          currentLocale: locale,
        },
        { [baseLocale]: baseText },
      ) as any;
    };
  }

  // Create labels
  const createLabels = (): TLabels => {
    if (!options.labels) {
      return {} as TLabels;
    }
    return options.labels(createTranslation(baseLocale));
  };

  const labels = createLabels();

  return { createTranslation, supportedLocales: locales, baseLocale, labels };
}

export { createLabel, type ExtractLocales, type ExtractTFunction };
