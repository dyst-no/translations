import z from 'zod';

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

const error: () => z.core.$ZodErrorMap = () => {
  const Sizable: Record<string, { unit: string; verb: string }> = {
    string: { unit: 'character', verb: 'contain' },
    file: { unit: 'size', verb: 'have' },
    array: { unit: 'element', verb: 'contain' },
    set: { unit: 'element', verb: 'contain' },
    date: { unit: 'date', verb: 'be' },
    time: { unit: 'time', verb: 'be' },
  };

  function getSizing(origin: string): { unit: string; verb: string } | null {
    return Sizable[origin] ?? null;
  }

  const Nouns: {
    [k in z.core.$ZodStringFormats | (string & {})]?: string;
  } = {
    regex: 'shape',
    email: 'email address',
    url: 'website address',
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
    datetime: 'date and time',
    date: 'date',
    time: 'time',
    duration: 'time period',
    ipv4: 'IP address',
    ipv6: 'IP address',
    cidrv4: 'IP address range',
    cidrv6: 'IP address range',
    base64: 'data',
    base64url: 'data',
    json_string: 'data',
    e164: 'phone number',
    jwt: 'access token',
    template_literal: 'text',
  };

  const parsedType = (data: any): string => {
    const t = typeof data;

    switch (t) {
      case 'number': {
        return Number.isNaN(data) ? 'invalid number' : 'number';
      }
      case 'object': {
        if (Array.isArray(data)) {
          return 'list';
        }
        if (data === null) {
          return 'empty value';
        }

        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return 'object';
      }
      case 'string': {
        return 'text';
      }
      case 'boolean': {
        return 'yes/no value';
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
          return 'This field is required';
        }
        if (issue.expected === 'date') {
          return 'The date has an invalid format';
        }
        return `Expected ${issue.expected}, but received ${parsedType(issue.input)}`;

      case 'invalid_value':
        if (issue.input === undefined || issue.input === null) {
          return 'This field is required';
        }
        if (issue.values.length === 1)
          return `Invalid input: expected ${z.core.util.stringifyPrimitive(issue.values[0])}`;
        return `Expected one of ${z.core.util.joinValues(issue.values, '|')}`;
      case 'too_big': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit;
          const value = issue.maximum as number;
          const plural = value === 1 ? '' : 's';

          if (issue.origin === 'date') {
            const condition = issue.inclusive ? 'at most' : 'at least';
            return `Date must be ${condition} ${formatDate(new Date(value))}`;
          }
          if (issue.origin === 'time') {
            return 'End time must be after start time';
          }
          const condition = issue.inclusive ? 'at most' : 'fewer than';

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement
            // When using z.string().length(11), Zod internally creates both .min(11) and .max(11) constraints
            // This causes either a "too_big" or "too_small" error, but we can detect it's an exact length
            // requirement by checking the schema definition which contains { check: "length_equals", length: 11 }
            // This allows us to provide a clearer error message instead of "must be at most/at least 11 characters"
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Text too long, expected exactly ${value} ${unit}${plural}`;
            }
            return `Text must be ${condition} ${value} ${unit}${plural} long`;
          }
          if (issue.origin === 'array') {
            return `The list must ${verb} ${condition} ${value} ${unit}${plural}`;
          }
          return `Must ${verb} ${condition} ${value} ${unit}${plural}`;
        }
        const condition = issue.inclusive ? 'less than or equal to' : 'less than';
        return `Number must be ${condition} ${issue.maximum}`;
      }
      case 'too_small': {
        const sizing = getSizing(issue.origin);
        if (sizing) {
          const verb = sizing.verb;
          const unit = sizing.unit;
          const value = issue.minimum as number;
          const plural = value === 1 ? '' : 's';
          const condition = issue.inclusive ? 'at least' : 'more than';

          if (issue.origin === 'date') {
            return `Date must be ${condition} ${formatDate(new Date(value))}`;
          }

          if (issue.origin === 'string') {
            // Check if this is an exact length requirement (see comment in "too_big" case above)
            const inst = (issue as any).inst;
            if (inst?._zod?.def?.check === 'length_equals' && inst._zod.def.length === value) {
              return `Text too short, expected exactly ${value} ${unit}${plural}`;
            }
            return `Text must be ${condition} ${value} ${unit}${plural} long`;
          }
          if (issue.origin === 'array') {
            return `The list must ${verb} ${condition} ${value} ${unit}${plural}`;
          }
          return `Must ${verb} ${condition} ${value} ${unit}${plural}`;
        }
        const condition = issue.inclusive ? 'greater than or equal to' : 'greater than';
        return `Number must be ${condition} ${issue.minimum}`;
      }
      case 'invalid_format': {
        const _issue = issue as z.core.$ZodStringFormatIssues;
        if (_issue.format === 'starts_with') {
          return `Invalid text: must start with "${_issue.prefix}"`;
        }
        if (_issue.format === 'ends_with') return `Invalid text: must end with "${_issue.suffix}"`;
        if (_issue.format === 'includes') return `Invalid text: must include "${_issue.includes}"`;
        if (_issue.format === 'regex') return 'Invalid text: must match the required format';
        return `Please enter a valid ${Nouns[_issue.format] ?? 'input'}`;
      }
      case 'not_multiple_of':
        return `Invalid number: must be a multiple of ${issue.divisor}`;
      case 'unrecognized_keys':
        return `Unknown field${issue.keys.length > 1 ? 's' : ''}: ${z.core.util.joinValues(issue.keys, ', ')}`;
      case 'invalid_key':
        return `Invalid field in ${parsedType(issue.origin)}`;
      case 'invalid_union':
        return 'Invalid input';
      case 'invalid_element':
        return `Invalid value in ${parsedType(issue.origin)}`;
      default:
        return 'Invalid input';
    }
  };
};

export default function (): Partial<z.core.$ZodConfig> {
  return {
    localeError: error(),
  };
}
