# Verify gate — Laya-backed NotLM

Historical snapshot: **2026-09-25**. Re-run `npm test` in `notlm/` for current test counts.

| Goal | Status | Evidence |
|------|--------|----------|
| Decision fallback (Laya-shaped), no LLM in unit tests | PASS | `fallbackLlm.test.ts` |
| Session phrase LRU hit/miss/promote/evict | PASS | `phraseLru.test.ts` |
| Subgraphs load + scoped NLU + parent completion | PASS | `loadFolder`, dispatch + queue advance |
| Mixed + pure OOD canned with entities | PASS | `oodReply.test.ts` |
| Thinking… show/replace/clear | PASS | `NotLMContext` thinking bubble on fallback |
| LabelProvider + Laya labeler + convert/train CLI | PASS | (sibling notlm-training repo) `@notlm-training/laya-train`, `layaLabeler.test.ts`, `convert.test.ts` |
| Install scaffold + Celery option | PASS | `@notlm/ops`, `notlmCLI laya install` / `celery setup` |
| Ranker = cache retrain; nightly ≠ Laya weight tune | PASS | ops templates + host promote docs |
| Sidecar + degrade + host proxy | PASS | ops templates; host wires `/notlm/fallback` |
| Full notlm `npm test` | PASS | 322 tests (re-run to confirm) |
| notlm-training laya unit tests | PASS | (sibling notlm-training repo) laya-train package tests |

Wiring audit: miss → Thinking… → host fallback → Laya `/decide` → replace bubble; dispatch → LRU → parse → packed OOD; training `laya convert` → JSONL → dry-run train.

**Blockers for full local weight fine-tune:** GPU/`laya` package optional; ship gate uses dry-run + convert fixture. Checkpoint artifact ships separately when trained.
