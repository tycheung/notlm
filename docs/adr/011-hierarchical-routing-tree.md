# ADR 011 — Hierarchical routing tree (plane → lane → leaf)

## Status

Accepted (2026-10-19)

## Context

Flat rule/ranker NLU plus chrome Ask/Guide/Do hard-gates produced confident wrong
routes (how-to → open, format-apply → billing) and forced TDs to know whether they
were “asking” or “doing.” ADR-010 quarantine defers risky actions but does not
shrink the competing label space. Training already names **13 capability lanes**;
runtime still used one softmax / alias soup.

## Decision

1. **Tree order:** Stage0 `ask | guide | do` (NLU **InteractionPlane**) **above**
   Stage1 capability lanes **above** Stage2 leaf classifiers.
2. **Chrome override:** When `features.routingTree` is on, a confident inferred
   plane **overrides** the session Ask/Guide/Do toggle. Chrome is inferred display
   + soft bias only when plane confidence is low.
3. **Lane mask (platform default, pack-overridable via `routingTree.json`):**
   - ask → faq, query, context, compare, handoff, audit, ood, disambiguation
   - guide → ask + goto, tour, search
   - do → guide + mutation, mutation_high_risk
4. **Artifacts (host pack):** `routingTree.json`, optional `ranker.plane.json`,
   `ranker.lane.json`, `ranker.leaves.<lane>.json`. Missing tree → legacy flat parse.
5. **SoC:** Mechanisms in `@notlm/core` / `@notlm/ranker`; words in host pack;
   training in `notlm-training`. No host brand in core.
6. **Autosplit:** During `notlm-training auto`, confident FP overlap **applies**
   submodel splits to the host pack and retrains (metric-gated: min support, max
   depth, confusion). Not runtime online learning. Manual feedback/author drafts
   may remain accept-gated.
7. **ADR-010:** Quarantine / ConfirmSession still apply **inside** the plane-masked set.
8. **Out of scope v1:** Multi-Laya specialist weight trees.

## Consequences

- Dispatch uses `resolveEffectivePlane` when `routingTree` is enabled.
- Hosts (VB) enable via `.notlm/config.json` `features.routingTree` and ship tree
  artifacts; remap catalogs onto leaves.
- Flat `ranker.json` remains fallback until leaves exist.
