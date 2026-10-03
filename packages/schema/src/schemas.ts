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
  $id: 'https://notlm.dev/schemas/binder-predicate.json',
  oneOf: [
    binderLeaf,
    {
      type: 'object',
      additionalProperties: false,
      required: ['all'],
      properties: {
        all: {
          type: 'array',
          items: { $ref: 'https://notlm.dev/schemas/binder-predicate.json' },
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
          items: { $ref: 'https://notlm.dev/schemas/binder-predicate.json' },
        },
      },
    },
  ],
} as const;

export const manifestSchema = {
  $id: 'https://notlm.dev/schemas/manifest.json',
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
  $id: 'https://notlm.dev/schemas/flow.json',
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
      hideWhen: {
        type: 'array',
        items: {
          oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
      showWhen: {
        type: 'array',
        items: {
          oneOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
      subgraph: { type: 'string', minLength: 1 },
    },
  },
} as const;

export const controlsSchema = {
  $id: 'https://notlm.dev/schemas/controls.json',
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
      openSurface: { type: 'string' },
      surfaceStep: { type: 'string' },
      spotlight: { type: 'string' },
      coachMessage: { type: 'string' },
      role: {
        type: 'string',
        enum: [
          'cta',
          'field',
          'tab',
          'nav',
          'row',
          'drawer',
          'menu',
          'dialog',
          'step',
          'combobox',
          'upload',
        ],
      },
      prefill: { type: 'object', additionalProperties: true },
      userFill: { type: 'array', items: { type: 'string', minLength: 1 } },
      coachCreate: { type: 'boolean' },
      draftKey: { type: 'string', minLength: 1 },
      compilerId: { type: 'string', minLength: 1 },
      beforeOpen: { type: 'array', items: { type: 'string', minLength: 1 } },
      openMenu: { type: 'string', minLength: 1 },
      confirmDialog: { type: 'string', minLength: 1 },
      spotlightOnly: { type: 'boolean' },
      instructOnly: { type: 'boolean' },
      wizardId: { type: 'string', minLength: 1 },
      wizardPage: { type: 'integer', minimum: 0 },
    },
  },
} as const;

export const intentsSchema = {
  $id: 'https://notlm.dev/schemas/intents.json',
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
    confirm: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
} as const;

export const normalizeSchema = {
  $id: 'https://notlm.dev/schemas/normalize.json',
  type: 'object',
  additionalProperties: true,
  properties: {
    replacements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', minLength: 1 },
          to: { type: 'string' },
        },
      },
    },
    surfaceWords: { type: 'array', items: { type: 'string', minLength: 1 } },
    trailingFillers: { type: 'array', items: { type: 'string', minLength: 1 } },
    leadingPoliteness: { type: 'array', items: { type: 'string', minLength: 1 } },
    openVerbAliases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', minLength: 1 },
          to: { type: 'string' },
        },
      },
    },
    openVerbPrefixes: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
} as const;

export const repliesSchema = {
  $id: 'https://notlm.dev/schemas/replies.json',
  type: 'object',
  additionalProperties: {
    type: 'array',
    items: { type: 'string', minLength: 1 },
  },
} as const;

/** Binders file: array of { stepId, …predicate }. */
export const bindersSchema = {
  $id: 'https://notlm.dev/schemas/binders.json',
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
  $id: 'https://notlm.dev/schemas/corpus.json',
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
  $id: 'https://notlm.dev/schemas/scenarios.json',
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

export const faqSchema = {
  $id: 'https://notlm.dev/schemas/faq.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['id', 'aliases', 'text'],
    properties: {
      id: { type: 'string', minLength: 1 },
      aliases: { type: 'array', items: { type: 'string' } },
      text: { type: 'string', minLength: 1 },
      stepId: { type: 'string' },
    },
  },
} as const;

export const lookupsSchema = {
  $id: 'https://notlm.dev/schemas/lookups.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['id', 'dataPath'],
    properties: {
      id: { type: 'string', minLength: 1 },
      dataPath: { type: 'string', minLength: 1 },
      nameKey: { type: 'string' },
      idKey: { type: 'string' },
      utteranceHints: { type: 'array', items: { type: 'string' } },
      entityWords: { type: 'array', items: { type: 'string' } },
      guideIdTemplate: { type: 'string' },
      stepId: { type: 'string' },
    },
  },
} as const;

export const glossarySchema = {
  $id: 'https://notlm.dev/schemas/glossary.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['id', 'aliases', 'text'],
    properties: {
      id: { type: 'string', minLength: 1 },
      aliases: { type: 'array', items: { type: 'string' } },
      text: { type: 'string', minLength: 1 },
      guideId: { type: 'string' },
    },
  },
} as const;

export const configSchema = {
  $id: 'https://notlm.dev/schemas/config.json',
  type: 'object',
  additionalProperties: true,
  properties: {
    guideAttr: { type: 'string' },
    features: { type: 'object', additionalProperties: true },
    paths: { type: 'object', additionalProperties: true },
    author: { type: 'object', additionalProperties: true },
  },
} as const;

/**
 * Portable MissRecord wire shape (POST ingest + GET/export list items).
 * Hosts may attach extra admin fields (id, userId, consumedAt, …);
 * snake_case aliases (utterance, pack_id, …) are not part of this contract.
 */
export const missRecordSchema = {
  $id: 'https://notlm.dev/schemas/miss-record.json',
  type: 'object',
  additionalProperties: true,
  required: ['text', 'kind', 'at'],
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 },
    kind: {
      type: 'string',
      enum: ['unknown', 'ambiguous', 'low_confidence'],
    },
    packId: { type: 'string' },
    pathname: { type: 'string' },
    rawIntent: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
    at: { type: 'string', minLength: 1 },
  },
} as const;

/** GET/export body: JSON array of MissRecords (host extras allowed per item). */
export const missRecordListSchema = {
  $id: 'https://notlm.dev/schemas/miss-record-list.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['text', 'kind', 'at'],
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 500 },
      kind: {
        type: 'string',
        enum: ['unknown', 'ambiguous', 'low_confidence'],
      },
      packId: { type: 'string' },
      pathname: { type: 'string' },
      rawIntent: { type: ['string', 'null'] },
      confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
      at: { type: 'string', minLength: 1 },
    },
  },
} as const;

const missProposedProperties = {
  type: { type: 'string', enum: ['faq', 'goto', 'meta', 'refuse'] },
  stepId: { type: 'string' },
  faqId: { type: 'string' },
  aliases: { type: 'array', items: { type: 'string' } },
} as const;

/** Portable MissExchange = MissRecord + LLM reply + optional proposed label. */
export const missExchangeSchema = {
  $id: 'https://notlm.dev/schemas/miss-exchange.json',
  type: 'object',
  additionalProperties: true,
  required: ['text', 'kind', 'at', 'llmReply'],
  properties: {
    text: { type: 'string', minLength: 1, maxLength: 500 },
    kind: {
      type: 'string',
      enum: ['unknown', 'ambiguous', 'low_confidence'],
    },
    packId: { type: 'string' },
    pathname: { type: 'string' },
    rawIntent: { type: ['string', 'null'] },
    confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
    at: { type: 'string', minLength: 1 },
    llmReply: { type: 'string', minLength: 1, maxLength: 2000 },
    proposed: {
      type: 'object',
      additionalProperties: true,
      required: ['type'],
      properties: missProposedProperties,
    },
    provider: {
      type: 'object',
      additionalProperties: true,
      required: ['id', 'model'],
      properties: {
        id: { type: 'string' },
        model: { type: 'string' },
      },
    },
    exchangeId: { type: 'string' },
  },
} as const;

export const missExchangeListSchema = {
  $id: 'https://notlm.dev/schemas/miss-exchange-list.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['text', 'kind', 'at', 'llmReply'],
    properties: {
      text: { type: 'string', minLength: 1, maxLength: 500 },
      kind: {
        type: 'string',
        enum: ['unknown', 'ambiguous', 'low_confidence'],
      },
      packId: { type: 'string' },
      pathname: { type: 'string' },
      rawIntent: { type: ['string', 'null'] },
      confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
      at: { type: 'string', minLength: 1 },
      llmReply: { type: 'string', minLength: 1, maxLength: 2000 },
      proposed: {
        type: 'object',
        additionalProperties: true,
        required: ['type'],
        properties: missProposedProperties,
      },
      provider: {
        type: 'object',
        additionalProperties: true,
        required: ['id', 'model'],
        properties: {
          id: { type: 'string' },
          model: { type: 'string' },
        },
      },
      exchangeId: { type: 'string' },
    },
  },
} as const;

const conversationTurnProperties = {
  conversationId: { type: 'string', minLength: 1 },
  turnId: { type: 'string', minLength: 1 },
  at: { type: 'string', minLength: 1 },
  role: { type: 'string', enum: ['user', 'assistant'] },
  text: { type: 'string', minLength: 1, maxLength: 2000 },
  outcome: {
    type: 'string',
    enum: ['hit', 'miss', 'blocked', 'confirm', 'slot_ask', 'adapter'],
  },
  stepId: { type: 'string' },
  missKind: {
    type: 'string',
    enum: ['unknown', 'ambiguous', 'low_confidence', 'blocked'],
  },
  rawIntent: { type: ['string', 'null'] },
  confidence: { type: 'string', enum: ['high', 'mid', 'low'] },
  pathname: { type: 'string' },
  packId: { type: 'string' },
} as const;

/** Portable append-only ConversationTurn (POST ingest). */
export const conversationTurnSchema = {
  $id: 'https://notlm.dev/schemas/conversation-turn.json',
  type: 'object',
  additionalProperties: true,
  required: ['conversationId', 'turnId', 'at', 'role', 'text'],
  properties: conversationTurnProperties,
} as const;

export const conversationTurnListSchema = {
  $id: 'https://notlm.dev/schemas/conversation-turn-list.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['conversationId', 'turnId', 'at', 'role', 'text'],
    properties: conversationTurnProperties,
  },
} as const;

/** Aggregated ConversationRecord for training dumps. */
export const conversationRecordSchema = {
  $id: 'https://notlm.dev/schemas/conversation-record.json',
  type: 'object',
  additionalProperties: true,
  required: ['conversationId', 'startedAt', 'turns'],
  properties: {
    conversationId: { type: 'string', minLength: 1 },
    packId: { type: 'string' },
    startedAt: { type: 'string', minLength: 1 },
    endedAt: { type: 'string' },
    turns: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['conversationId', 'turnId', 'at', 'role', 'text'],
        properties: conversationTurnProperties,
      },
    },
  },
} as const;

export const conversationRecordListSchema = {
  $id: 'https://notlm.dev/schemas/conversation-record-list.json',
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: true,
    required: ['conversationId', 'startedAt', 'turns'],
    properties: {
      conversationId: { type: 'string', minLength: 1 },
      packId: { type: 'string' },
      startedAt: { type: 'string', minLength: 1 },
      endedAt: { type: 'string' },
      turns: { type: 'array' },
    },
  },
} as const;

export const PACK_PIECE_SCHEMAS = {
  manifest: manifestSchema,
  flow: flowSchema,
  controls: controlsSchema,
  intents: intentsSchema,
  normalize: normalizeSchema,
  binders: bindersSchema,
  corpus: corpusSchema,
  scenarios: scenariosSchema,
  config: configSchema,
  glossary: glossarySchema,
  faq: faqSchema,
  lookups: lookupsSchema,
  replies: repliesSchema,
} as const;

export type PackPieceName = keyof typeof PACK_PIECE_SCHEMAS;
