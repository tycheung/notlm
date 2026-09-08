import AjvModule from 'ajv';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { PACK_PIECE_SCHEMAS, type PackPieceName, scenariosSchema } from './schemas.js';

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
    const path = e.instancePath || '/';
    return `${prefix}${path} ${e.message ?? 'invalid'}`.trim();
  });
}

export function validatePiece(piece: PackPieceName, data: unknown): ValidationResult {
  const validate = getValidator(piece);
  const ok = validate(data);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: formatErrors(piece, validate.errors) };
}

/** Validate labeled utterance scenarios (author-011). */
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

/** Re-export schema id used by tests / CLI docs. */
export { scenariosSchema };
