# M19 in progress

## Phase 1 — Research-first canon expansion

Status: completed locally.

- Expanded `script/m18-discover-canon.ts` with M19 extension seeds across all eight dimensions and added `--validate` for the M19 falsification gate.
- Regenerated `plan/canon/*.candidates.json` by fetching source URLs directly.
- Validation: `bun script/m18-discover-canon.ts --validate` passed with 52 candidates across 8 dimensions; every dimension has at least 4 candidates with non-empty `extracted_excerpt`.
- Anti-sycophancy probe: `inclusivedesignprinciples.org` fetched gambling spam content. I removed it from the seed set and replaced it with IBM Equal Access Toolkit instead of retaining the operator-seeded inclusive-design idea uncritically.
- Contradiction surfaced: the previous TicToc seed `arxiv:2503.02391` pointed to a pseudo-concave optimization paper. I fetched the arXiv search result for "temporally blind" and corrected the seed to `arxiv:2510.23853`.
- Assumption: Firecrawl web search was unavailable due insufficient credits, so Phase 1 used direct URL fetches plus an arXiv web-fetch search for the known bad TicToc seed. The candidate entries remain `mizan_grade: "daif"` until Phase 2 receipts grade them.

### Phase 1 anti-fab self-check

- "52 candidates across 8 dimensions" — verified by `bun script/m18-discover-canon.ts --validate`.
- "Every dimension has at least 4 entries with non-empty `extracted_excerpt`" — verified by validator.
- "TicToc prior seed was wrong" — verified by fetched arXiv abstract for `2503.02391` in the prior candidate file and the arXiv search fetch for "temporally blind".
- "Inclusive Design Principles URL was poisoned" — verified by fetched excerpt in the first M19 run output, then removed from committed candidates.
- "Authoritativeness of new candidates" — ASSUMPTION (unverified beyond URL fetch and publisher/source identity); Phase 2 must verify source-principle support.
