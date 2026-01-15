const isBrowser = typeof window !== 'undefined';

export const detectors = {
  url: <T extends string>(): T | null => {
    if (!isBrowser) return null;
    const url = new URL(window.location.href);
    return url.searchParams.get('locale') as T | null;
  },

  localStorage: <T extends string>(): T | null => {
    if (!isBrowser) return null;
    return window.localStorage.getItem('locale') as T | null;
  },

  navigator: <T extends string>(
    localeMap: Record<string, string> = {
      nb: 'no',
      nn: 'no',
      se: 'sv',
      dk: 'da',
    },
  ): T | null => {
    if (!isBrowser) return null;
    const langCode = window.navigator.languages?.[0]?.split('-')?.[0]?.toLowerCase() ?? null;
    return ((langCode && localeMap?.[langCode]) || langCode) as T;
  },
} as const;

export const defaultDetectors = [detectors.localStorage, detectors.url, detectors.navigator];

export const storage = {
  getItem: (key: string) => (isBrowser ? window?.localStorage?.getItem?.(key) : null), // nullish coalescing to avoid errors when localStorage is not available (opening preview in email client)
  setItem: (key: string, value: string) => (isBrowser ? window?.localStorage?.setItem?.(key, value) : undefined), // nullish coalescing to avoid errors when localStorage is not available (opening preview in email client)
};
