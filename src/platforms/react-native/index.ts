import * as Localization from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

export const storage = {
  getItem: (key: string): string | null => {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem?.(key) ?? null;
    }
    return Storage.getItemSync(key);
  },
  setItem: (key: string, value: string): void => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem?.(key, value);
      return;
    }
    Storage.setItemSync(key, value);
  },
};

export const detectors = {
  syncStorage: <T extends string>(): T | null => {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem?.('locale') as T | null;
    }
    return Storage.getItemSync('locale') as T | null;
  },

  deviceLocale: <T extends string>(): T | null => {
    const localeRemaps: Record<string, string> = {
      nb: 'no',
      nn: 'no',
      se: 'sv',
      dk: 'da',
    };
    // Use the first locale from the array of preferred locales
    const firstLocale = Localization.getLocales()[0]?.languageCode ?? null;
    const langCode = firstLocale ? firstLocale.split('-')?.[0]?.toLowerCase() : null;
    return ((langCode && localeRemaps?.[langCode]) || langCode) as T;
  },
} as const;

export const defaultDetectors = [detectors.syncStorage, detectors.deviceLocale] as const;
