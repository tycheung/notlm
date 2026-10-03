# Verify gate — Laya-backed NotLM (pre-commit)

Date: 2026-09-25

| Goal | Status | Evidence |
|------|--------|----------|
| Decision fallback (Laya-shaped), no LLM required in unit tests | PASS | `fallbackLlm.test.ts`, BE `test_notlm_fallback.py` degrade path |
| Session phrase LRU hit/miss/promote/evict | PASS | `phraseLru.test.ts` |
| Subgraphs load + scoped NLU + parent completion | PASS | `loadFolder` loads `subgraphs.json`; `dispatch` uses `activeFlowSteps`; `queueAdvance` + `maybeCompleteParentSubgraph` |
| Mixed + pure OOD canned with entities | PASS | `oodReply.test.ts` muffins + create event + recipe |
| Thinking… show/replace/clear | PASS | `NotLMContext` thinking bubble on fallback |
| LabelProvider + Laya labeler + convert/train CLI | PASS | `@notlm-training/laya-train`, `layaLabeler.test.ts`, `convert.test.ts` |
| Install scaffold + Celery option | PASS | `@notlm/ops`, `notlmCLI laya install` / `celery setup`, `ops/src/index.test.ts` |
| Ranker = cache retrain; nightly ≠ Laya weight tune | PASS | Docs in ops templates + BE `notlm_promote.py` |
| Sidecar + degrade + VB proxy | PASS | `@notlm/ops` templates → `backend/notlm_laya`, `notlm_fallback.py`, 7 unit tests |
| Full notlm `npm test` | PASS | 259 tests |
| notlm-training laya unit tests | PASS | 5 tests |

Wiring audit: miss → Thinking… → `invokeLlmFallback` → host `/notlm/fallback` → Laya sidecar `/decide` → replace bubble; dispatch → LRU → parse → packed OOD; training `laya convert` → JSONL → dry-run train.

**Blockers for full local weight fine-tune:** GPU/`laya` package optional; ship gate uses dry-run + convert fixture. Checkpoint artifact shipped separately when trained.
