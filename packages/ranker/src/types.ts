export type RankerModelJson = {
  version: 1;
  dim: number;
  ngrams: number[];
  /** Intent label ids (goto:*, meta, unknown, …). */
  intentLabels: string[];
  /** Flattened row-major weights: intentLabels.length × dim */
  intentW: number[];
  intentB: number[];
  /** Optional multi-label slot keys. */
  slotLabels: string[];
  /** Flattened row-major: slotLabels.length × dim */
  slotW: number[];
  slotB: number[];
  trainedAt: string;
  exampleCount: number;
};

export type RankerIntentScore = {
  label: string;
  score: number;
  probability: number;
};

export type RankerSlotScore = {
  key: string;
  probability: number;
};

export type RankerInferResult = {
  intent: RankerIntentScore;
  intents: RankerIntentScore[];
  slots: RankerSlotScore[];
  backend: 'json' | 'onnx';
};
