import { z } from 'zod';

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

const error: () => z.core.$ZodErrorMap = () => {
  const Sizable: Record<string, { unit: string; verb: string }> = {
    string: { unit: 'tegn', verb: 'inneholde' },
    file: { unit: 'størrelse', verb: 'ha' },
    array: { unit: 'element', verb: 'inneholde' },
    set: { unit: 'element', verb: 'inneholde' },
    date: { unit: 'dato', verb: 'være' },
    time: { unit: 'tid', verb: 'være' },
  };

  function getSizing(origin: string): { unit: string; verb: string } | null {
    return Sizable[origin] ?? null;
  }

  const Nouns: {
    [k in z.core.$ZodStringFormats | (string & {})]?: string;
  } = {
    regex: 'format',
    email: 'e-postadresse',
    url: 'nettadresse',
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
    datetime: 'dato og klokkeslett',
    date: 'dato',
    time: 'klokkeslett',
    duration: 'tidsperiode',
    ipv4: 'IP-adresse',
    ipv6: 'IP-adresse',
    cidrv4: 'IP-adresseområde',
    cidrv6: 'IP-adresseområde',
    base64: 'data',
    base64url: 'data',
    json_string: 'data',
    e164: 'telefonnummer',
    jwt: 'tilgangstoken',
    template_literal: 'tekst',
  };

  const parsedType = (data: any): string => {
    const t = typeof data;

    switch (t) {
      case 'number': {
        return Number.isNaN(data) ? 'ugyldig tall' : 'tall';
      }
      case 'object': {
        if (Array.isArray(data)) {
          return 'liste';
        }
        if (data === null) {
          return 'tom verdi';
        }

        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return 'objekt';
      }
      case 'string': {
        return 'tekst';
      }
      case 'boolean': {
        return 'ja/nei-verdi';
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
          return 'Dette feltet er påkrevd';
        }
        if (issue.expected === 'date') {
          return 'Datoen har et ugyldig format';
        }
        return `Forventet ${issue.expected}, men mottok ${parsedType(issue.input)}`;
      case 'invalid_value':
        if (issue.input === undefined || issue.input === null) {
          return 'Dette feltet er påkrevd';
        }
        if (issue.values.length === 1)
          return `Ugyldig verdi: forventet ${z.core.util.stringifyPrimitive(issue.values[0])}`;
        return `Ugyldig valg: forventet en av ${z.core.util.joinValues(issue.values, '|')}`;
      case 'too_big': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit;
          const value = issue.maximum as number;
          const plural = value === 1 ? '' : 'er';

          if (issue.origin === 'date') {
            const condition = issue.inclusive ? 'senest' : 'før';
            return `Dato må være ${condition} ${formatDate(new Date(value))}`;
          }
          if (issue.origin === 'time') {
            return 'Sluttid må være etter starttid';
          }
          const condition = issue.inclusive ? 'maksimalt' : 'færre enn';

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Tekst for lang, forventet nøyaktig ${value} ${unit}`;
            }
            return `Teksten kan ha ${condition} ${value} ${unit}`;
          }
          if (issue.origin === 'array') {
            return `Listen må ${verb} ${condition} ${value} ${unit}${plural}`;
          }
          return `Må ${verb} ${condition} ${value} ${unit}${plural}`;
        }
        const condition = issue.inclusive ? 'mindre enn eller lik' : 'mindre enn';
        return `Tallet må være ${condition} ${issue.maximum}`;
      }
      case 'too_small': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit;
          const value = issue.minimum as number;
          const plural = value === 1 ? '' : 'er';
          const condition = issue.inclusive ? 'minst' : 'mer enn';

          if (issue.origin === 'date') {
            return `Dato må være ${condition} ${formatDate(new Date(value))}`;
          }

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Tekst for kort, forventet nøyaktig ${value} ${unit}`;
            }
            return `Teksten må være på ${condition} ${value} ${unit} lang`;
          }
          if (issue.origin === 'array') {
            return `Listen må ${verb} ${condition} ${value} ${unit}${plural}`;
          }
          return `Må ${verb} ${condition} ${value} ${unit}${plural}`;
        }
        const condition = issue.inclusive ? 'større enn eller lik' : 'større enn';
        return `Tallet må være ${condition} ${issue.minimum}`;
      }
      case 'invalid_format': {
        const _issue = issue as z.core.$ZodStringFormatIssues;
        if (_issue.format === 'starts_with') return `Ugyldig tekst: må starte med "${_issue.prefix}"`;
        if (_issue.format === 'ends_with') return `Ugyldig tekst: må ende med "${_issue.suffix}"`;
        if (_issue.format === 'includes') return `Ugyldig tekst: må inneholde "${_issue.includes}"`;
        if (_issue.format === 'regex') return 'Ugyldig tekst: må følge det påkrevde formatet';
        return `Vennligst skriv inn en gyldig ${Nouns[_issue.format] ?? 'input'}`;
      }
      case 'not_multiple_of':
        return `Ugyldig tall: må være et multiplum av ${issue.divisor}`;
      case 'unrecognized_keys':
        return `${issue.keys.length > 1 ? 'Ukjente felt' : 'Ukjent felt'}: ${z.core.util.joinValues(issue.keys, ', ')}`;
      case 'invalid_key':
        return `Ugyldig felt i ${parsedType(issue.origin)}`;
      case 'invalid_union':
        return 'Ugyldig input';
      case 'invalid_element':
        return `Ugyldig verdi i ${parsedType(issue.origin)}`;
      default:
        return 'Ugyldig input';
    }
  };
};

export default function (): Partial<z.core.$ZodConfig> {
  return {
    localeError: error(),
  };
}
