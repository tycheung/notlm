const binderLeaf = {
  type: 'object',
  additionalProperties: true,
  required: ['path', 'op'],
  properties: {
    path: { type: 'string', minLength: 1 },
    op: {
      type: 'string',
      enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'truthy', 'falsy'],
    },
    value: {},
  },
} as const;

/** Recursive binder predicate (path/op or all/any). */
export const binderPredicateSchema = {
  $id: 'https://uipilot.dev/schemas/binder-predicate.json',
  oneOf: [
    binderLeaf,
    {
      type: 'object',
      additionalProperties: false,
      required: ['all'],
      properties: {
        all: {
          type: 'array',
          items: { $ref: 'https://uipilot.dev/schemas/binder-predicate.json' },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['any'],
      properties: {
        any: {
          type: 'array',
          items: { $ref: 'https://uipilot.dev/schemas/binder-predicate.json' },
        },
      },
    },
  ],
} as const;

export const manifestSchema = {
  $id: 'https://uipilot.dev/schemas/manifest.json',
  type: 'object',
  additionalProperties: true,
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
    version: { type: 'string' },
    title: { type: 'string' },
    features: { type: 'object', additionalProperties: true },
    files: { type: 'object', additionalProperties: { type: 'string' } },
  },
} as const;

export const flowSchema = {
  $id: 'https://uipilot.dev/schemas/flow.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['id', 'title', 'kind', 'requires'],
    properties: {
      id: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      kind: { type: 'string', minLength: 1 },
      requires: { type: 'array', items: { type: 'string' } },
      keywords: { type: 'array', items: { type: 'string' } },
      prefers: { type: 'array', items: { type: 'string' } },
      hideWhen: { type: 'array', items: { type: 'string' } },
    },
  },
} as const;

export const controlsSchema = {
  $id: 'https://uipilot.dev/schemas/controls.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
      stepId: { type: 'string' },
      path: { type: 'string' },
      openModal: { type: 'string' },
      spotlight: { type: 'string' },
      coachMessage: { type: 'string' },
      role: { type: 'string' },
    },
  },
} as const;

export const intentsSchema = {
  $id: 'https://uipilot.dev/schemas/intents.json',
  type: 'object',
  additionalProperties: true,
  required: ['aliases'],
  properties: {
    aliases: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    meta: { type: 'array', items: { type: 'string' } },
    slots: { type: 'object', additionalProperties: true },
  },
} as const;

/** Binders file: array of { stepId, …predicate }. */
export const bindersSchema = {
  $id: 'https://uipilot.dev/schemas/binders.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['stepId'],
    properties: {
      stepId: { type: 'string', minLength: 1 },
      path: { type: 'string' },
      op: { type: 'string' },
      value: {},
      all: { type: 'array' },
      any: { type: 'array' },
    },
  },
} as const;

export const corpusSchema = {
  $id: 'https://uipilot.dev/schemas/corpus.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['utterance'],
    properties: {
      utterance: { type: 'string' },
      expect: { type: 'object', additionalProperties: true },
      id: { type: 'string' },
      aliases: { type: 'array', items: { type: 'string' } },
    },
  },
} as const;

export const scenariosSchema = {
  $id: 'https://uipilot.dev/schemas/scenarios.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['utterance', 'expect'],
    properties: {
      id: { type: 'string' },
      utterance: { type: 'string', minLength: 1 },
      expect: {
        type: 'object',
        additionalProperties: true,
        properties: {
          stepId: { type: ['string', 'null'] },
          rawIntent: { type: ['string', 'null'] },
          goBack: { type: 'boolean' },
          isCorrection: { type: 'boolean' },
          slots: { type: 'object', additionalProperties: true },
        },
      },
    },
  },
} as const;

export const configSchema = {
  $id: 'https://uipilot.dev/schemas/config.json',
  type: 'object',
  additionalProperties: true,
  properties: {
    guideAttr: { type: 'string' },
    features: { type: 'object', additionalProperties: true },
    paths: { type: 'object', additionalProperties: true },
    author: { type: 'object', additionalProperties: true },
  },
} as const;

export const PACK_PIECE_SCHEMAS = {
  manifest: manifestSchema,
  flow: flowSchema,
  controls: controlsSchema,
  intents: intentsSchema,
  binders: bindersSchema,
  corpus: corpusSchema,
  scenarios: scenariosSchema,
  config: configSchema,
} as const;

export type PackPieceName = keyof typeof PACK_PIECE_SCHEMAS;
