# Verify gate — Laya-backed UiPilot (pre-commit)

Date: 2026-09-25

| Goal | Status | Evidence |
|------|--------|----------|
| Decision fallback (Laya-shaped), no LLM required in unit tests | PASS | `fallbackLlm.test.ts`, BE `test_uipilot_fallback.py` degrade path |
| Session phrase LRU hit/miss/promote/evict | PASS | `phraseLru.test.ts` |
| Subgraphs load + scoped NLU + parent completion | PASS | `loadFolder` loads `subgraphs.json`; `dispatch` uses `activeFlowSteps`; `queueAdvance` + `maybeCompleteParentSubgraph` |
| Mixed + pure OOD canned with entities | PASS | `oodReply.test.ts` muffins + create event + recipe |
| Thinking… show/replace/clear | PASS | `UiPilotContext` thinking bubble on fallback |
| LabelProvider + Laya labeler + convert/train CLI | PASS | `@uipilot-training/laya-train`, `layaLabeler.test.ts`, `convert.test.ts` |
| Install scaffold + Celery option | PASS | `@uipilot/ops`, `uipilotCLI laya install` / `celery setup`, `ops/src/index.test.ts` |
| Ranker = cache retrain; nightly ≠ Laya weight tune | PASS | Docs in ops templates + BE `uipilot_promote.py` |
| Sidecar + degrade + VB proxy | PASS | `backend/uipilot_laya`, `uipilot_fallback.py`, 7 unit tests |
| Full uipilot `npm test` | PASS | 259 tests |
| uipilot-training laya unit tests | PASS | 5 tests |

Wiring audit: miss → Thinking… → `invokeLlmFallback` → host `/uipilot/fallback` → Laya sidecar `/decide` → replace bubble; dispatch → LRU → parse → packed OOD; training `laya convert` → JSONL → dry-run train.

**Blockers for full local weight fine-tune:** GPU/`laya` package optional; ship gate uses dry-run + convert fixture. Checkpoint artifact shipped separately when trained.
