import { z } from 'zod/v4';

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

const error: () => z.core.$ZodErrorMap = () => {
  const Sizable: Record<string, { unit: string; verb: string }> = {
    string: { unit: 'znak', verb: 'zawierać' },
    file: { unit: 'bajt', verb: 'mieć' },
    array: { unit: 'element', verb: 'zawierać' },
    set: { unit: 'element', verb: 'zawierać' },
    date: { unit: 'data', verb: 'być' },
    time: { unit: 'czas', verb: 'być' },
  };

  function getSizing(origin: string): { unit: string; verb: string } | null {
    return Sizable[origin] ?? null;
  }

  function polishPlural(value: number, unit: 'znak' | 'element' | 'bajt'): string {
    if (value === 1) {
      return unit;
    }
    if (unit === 'znak' || unit === 'element') {
      if (value > 1 && value < 5) {
        return `${unit}i`;
      }
      return `${unit}ów`;
    }
    if (unit === 'bajt') {
      if (value > 1 && value < 5) {
        return 'bajty';
      }
      return 'bajtów';
    }
    return unit;
  }

  const Nouns: {
    [k in z.core.$ZodStringFormats | (string & {})]?: string;
  } = {
    regex: 'format',
    email: 'adres email',
    url: 'adres strony',
    emoji: 'emoji',
    uuid: 'ID',
    uuidv4: 'ID',
    uuidv6: 'ID',
    nanoid: 'ID',
    guid: 'ID',
    cuid: 'ID',
    cuid2: 'ID',
    ulid: 'ID',
    xid: 'ID',
    ksuid: 'ID',
    datetime: 'data i czas',
    date: 'data',
    time: 'czas',
    duration: 'okres czasu',
    ipv4: 'adres IP',
    ipv6: 'adres IP',
    cidrv4: 'zakres adresów IP',
    cidrv6: 'zakres adresów IP',
    base64: 'dane',
    base64url: 'dane',
    json_string: 'dane',
    e164: 'numer telefonu',
    jwt: 'token dostępu',
    template_literal: 'tekst',
  };

  const parsedType = (data: any): string => {
    const t = typeof data;

    switch (t) {
      case 'number': {
        return Number.isNaN(data) ? 'nieprawidłowa liczba' : 'liczba';
      }
      case 'object': {
        if (Array.isArray(data)) {
          return 'lista';
        }
        if (data === null) {
          return 'pusta wartość';
        }

        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return 'obiekt';
      }
      case 'string': {
        return 'tekst';
      }
      case 'boolean': {
        return 'wartość tak/nie';
      }
    }
    if (t in Nouns) {
      return Nouns[t as z.core.$ZodStringFormats] ?? t;
    }

    return t;
  };

  return (issue) => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.input === undefined || issue.input === null) {
          return 'To pole jest wymagane';
        }
        if (issue.expected === 'date') {
          return 'Data ma nieprawidłowy format';
        }
        return `Oczekiwano ${issue.expected}, ale otrzymano ${parsedType(issue.input)}`;
      case 'invalid_value':
        if (issue.input === undefined || issue.input === null) {
          return 'To pole jest wymagane';
        }
        if (issue.values.length === 1)
          return `Nieprawidłowe dane wejściowe: oczekiwano ${z.core.util.stringifyPrimitive(issue.values[0])}`;
        return `Nieprawidłowa opcja: oczekiwano jednej z wartości ${z.core.util.joinValues(issue.values, '|')}`;
      case 'too_big': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit as 'znak' | 'element' | 'bajt';
          const value = issue.maximum as number;

          if (issue.origin === 'date') {
            const condition = issue.inclusive ? 'najpóźniej' : 'przed';
            return `Data musi być ${condition} ${formatDate(new Date(value))}`;
          }
          if (issue.origin === 'time') {
            return 'Czas końcowy musi być po czasie początkowym';
          }
          const condition = issue.inclusive ? 'maksymalnie' : 'mniej niż';

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Tekst za długi, oczekiwano dokładnie ${value} ${polishPlural(value, unit)}`;
            }
            return `Tekst musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
          }
          if (issue.origin === 'array') {
            return `Lista musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
          }
          return `Musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
        }
        const condition = issue.inclusive ? 'mniejsza lub równa' : 'mniejsza niż';
        return `Liczba musi być ${condition} ${issue.maximum}`;
      }
      case 'too_small': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit as 'znak' | 'element' | 'bajt';
          const value = issue.minimum as number;

          if (issue.origin === 'date') {
            const condition = issue.inclusive ? 'co najmniej' : 'po';
            return `Data musi być ${condition} ${formatDate(new Date(value))}`;
          }
          const condition = issue.inclusive ? 'co najmniej' : 'więcej niż';

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Tekst za krótki, oczekiwano dokładnie ${value} ${polishPlural(value, unit)}`;
            }
            return `Tekst musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
          }
          if (issue.origin === 'array') {
            return `Lista musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
          }
          return `Musi ${verb} ${condition} ${value} ${polishPlural(value, unit)}`;
        }
        const condition = issue.inclusive ? 'większa lub równa' : 'większa niż';
        return `Liczba musi być ${condition} ${issue.minimum}`;
      }
      case 'invalid_format': {
        const _issue = issue as z.core.$ZodStringFormatIssues;
        if (_issue.format === 'starts_with') {
          return `Nieprawidłowy ciąg znaków: musi zaczynać się od "${_issue.prefix}"`;
        }
        if (_issue.format === 'ends_with') return `Nieprawidłowy ciąg znaków: musi kończyć się na "${_issue.suffix}"`;
        if (_issue.format === 'includes') return `Nieprawidłowy ciąg znaków: musi zawierać "${_issue.includes}"`;
        if (_issue.format === 'regex')
          return 'Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi wymaganemu formatowi';
        return `Wprowadź poprawny ${Nouns[_issue.format] ?? 'dane wejściowe'}`;
      }
      case 'not_multiple_of':
        return `Nieprawidłowa liczba: musi być wielokrotnością ${issue.divisor}`;
      case 'unrecognized_keys':
        return `Nierozpoznane pole${issue.keys.length > 1 ? 'a' : ''}: ${z.core.util.joinValues(issue.keys, ', ')}`;
      case 'invalid_key':
        return `Nieprawidłowy klucz w ${parsedType(issue.origin)}`;
      case 'invalid_union':
        return 'Nieprawidłowe dane wejściowe';
      case 'invalid_element':
        return `Nieprawidłowa wartość w ${parsedType(issue.origin)}`;
      default:
        return 'Nieprawidłowe dane wejściowe';
    }
  };
};

export default function (): { localeError: z.core.$ZodErrorMap } {
  return {
    localeError: error(),
  };
}
