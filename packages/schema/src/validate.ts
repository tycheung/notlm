import AjvModule from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import {
  conversationRecordListSchema,
  conversationRecordSchema,
  conversationTurnListSchema,
  conversationTurnSchema,
  missExchangeListSchema,
  missExchangeSchema,
  missRecordListSchema,
  missRecordSchema,
  PACK_PIECE_SCHEMAS,
  type PackPieceName,
  scenariosSchema,
} from './schemas.js';

type AjvLike = {
  compile: (schema: object) => ValidateFunction;
};

type AjvConstructor = new (opts?: {
  allErrors?: boolean;
  strict?: boolean;
  allowUnionTypes?: boolean;
}) => AjvLike;

// NodeNext + ajv CJS interop: default export may be nested.
const Ajv = (
  (AjvModule as unknown as { default?: AjvConstructor }).default ?? AjvModule
) as AjvConstructor;

export type ValidationResult = { ok: boolean; errors: string[] };

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });

const validators = new Map<PackPieceName, ValidateFunction>();

function getValidator(piece: PackPieceName): ValidateFunction {
  const cached = validators.get(piece);
  if (cached) return cached;
  const compiled = ajv.compile(PACK_PIECE_SCHEMAS[piece]);
  validators.set(piece, compiled);
  return compiled;
}

function formatErrors(prefix: string, errors: ErrorObject[] | null | undefined): string[] {
  if (!errors?.length) return [`${prefix}: invalid`];
  return errors.map((e) => {
    const err = e as ErrorObject & { dataPath?: string };
    const path = err.instancePath || err.dataPath || '/';
    return `${prefix}${path} ${e.message ?? 'invalid'}`.trim();
  });
}

export function validatePiece(piece: PackPieceName, data: unknown): ValidationResult {
  const validate = getValidator(piece);
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors(piece, validate.errors) };
}

export function validateScenarios(data: unknown): ValidationResult {
  return validatePiece('scenarios', data);
}

const PACK_FOLDER_KEYS: PackPieceName[] = [
  'manifest',
  'flow',
  'controls',
  'intents',
  'binders',
  'corpus',
  'scenarios',
  'config',
  'glossary',
  'faq',
  'lookups',
  'replies',
];

/**
 * Validate a pack-folder map of JSON pieces.
 * Only validates keys that are present; missing optional pieces are skipped.
 * When present, intents.aliases must be an object and binders must be an array.
 */
export function validatePackFolder(files: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  for (const key of PACK_FOLDER_KEYS) {
    if (!(key in files)) continue;
    const result = validatePiece(key, files[key]);
    if (!result.ok) errors.push(...result.errors);
  }

  if ('intents' in files) {
    const intents = files.intents;
    if (
      intents == null ||
      typeof intents !== 'object' ||
      Array.isArray(intents) ||
      !('aliases' in intents) ||
      typeof (intents as { aliases: unknown }).aliases !== 'object' ||
      Array.isArray((intents as { aliases: unknown }).aliases) ||
      (intents as { aliases: unknown }).aliases === null
    ) {
      errors.push('intents: aliases must be an object');
    }
  }

  if ('binders' in files && !Array.isArray(files.binders)) {
    errors.push('binders: must be an array');
  }

  if ('flow' in files && Array.isArray(files.flow)) {
    for (const [i, step] of files.flow.entries()) {
      if (step == null || typeof step !== 'object' || Array.isArray(step)) {
        errors.push(`flow/${i}: step must be an object`);
        continue;
      }
      const s = step as Record<string, unknown>;
      for (const field of ['id', 'title', 'kind', 'requires'] as const) {
        if (!(field in s)) errors.push(`flow/${i}: missing required '${field}'`);
      }
      if ('requires' in s && !Array.isArray(s.requires)) {
        errors.push(`flow/${i}: requires must be an array`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

let missRecordValidator: ValidateFunction | undefined;
let missRecordListValidator: ValidateFunction | undefined;

function getMissRecordValidator(): ValidateFunction {
  if (!missRecordValidator) {
    missRecordValidator = ajv.compile(missRecordSchema);
  }
  return missRecordValidator;
}

function getMissRecordListValidator(): ValidateFunction {
  if (!missRecordListValidator) {
    missRecordListValidator = ajv.compile(missRecordListSchema);
  }
  return missRecordListValidator;
}

/** Validate a single portable MissRecord (host extras allowed). */
export function validateMissRecord(data: unknown): ValidationResult {
  const validate = getMissRecordValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('missRecord', validate.errors) };
}

/** Validate a GET/export MissRecord[]. */
export function validateMissRecordList(data: unknown): ValidationResult {
  const validate = getMissRecordListValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('missRecordList', validate.errors) };
}

let missExchangeValidator: ValidateFunction | undefined;
let missExchangeListValidator: ValidateFunction | undefined;

function getMissExchangeValidator(): ValidateFunction {
  if (!missExchangeValidator) {
    missExchangeValidator = ajv.compile(missExchangeSchema);
  }
  return missExchangeValidator;
}

function getMissExchangeListValidator(): ValidateFunction {
  if (!missExchangeListValidator) {
    missExchangeListValidator = ajv.compile(missExchangeListSchema);
  }
  return missExchangeListValidator;
}

export function validateMissExchange(data: unknown): ValidationResult {
  const validate = getMissExchangeValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('missExchange', validate.errors) };
}

export function validateMissExchangeList(data: unknown): ValidationResult {
  const validate = getMissExchangeListValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('missExchangeList', validate.errors) };
}

let conversationTurnValidator: ValidateFunction | undefined;
let conversationTurnListValidator: ValidateFunction | undefined;
let conversationRecordValidator: ValidateFunction | undefined;
let conversationRecordListValidator: ValidateFunction | undefined;

function getConversationTurnValidator(): ValidateFunction {
  if (!conversationTurnValidator) {
    conversationTurnValidator = ajv.compile(conversationTurnSchema);
  }
  return conversationTurnValidator;
}

function getConversationTurnListValidator(): ValidateFunction {
  if (!conversationTurnListValidator) {
    conversationTurnListValidator = ajv.compile(conversationTurnListSchema);
  }
  return conversationTurnListValidator;
}

function getConversationRecordValidator(): ValidateFunction {
  if (!conversationRecordValidator) {
    conversationRecordValidator = ajv.compile(conversationRecordSchema);
  }
  return conversationRecordValidator;
}

function getConversationRecordListValidator(): ValidateFunction {
  if (!conversationRecordListValidator) {
    conversationRecordListValidator = ajv.compile(conversationRecordListSchema);
  }
  return conversationRecordListValidator;
}

export function validateConversationTurn(data: unknown): ValidationResult {
  const validate = getConversationTurnValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('conversationTurn', validate.errors) };
}

export function validateConversationTurnList(data: unknown): ValidationResult {
  const validate = getConversationTurnListValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('conversationTurnList', validate.errors) };
}

export function validateConversationRecord(data: unknown): ValidationResult {
  const validate = getConversationRecordValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('conversationRecord', validate.errors) };
}

export function validateConversationRecordList(data: unknown): ValidationResult {
  const validate = getConversationRecordListValidator();
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors('conversationRecordList', validate.errors) };
}

/** Re-export schema id used by tests / CLI docs. */
export { scenariosSchema };
