---
id: 0011
slug: smallest-distinguishing-experiment-first
title: Smallest distinguishing experiment before architecture commitment
created_at: 2026-04-29
created_by: gpt-5.4
created_in_session: 2026-04-29 r107 khazina audit from burhan-mizaj-daftar substrate work

novel_move:
  seed: |
    No architecture story without one experiment that could have killed it.
    Run the narrowest real-task probe whose outcome would differ between
    status quo and proposed design before authorizing the broader redesign.
  class: meta-method
  anchor: session://r103-khatim-burhan-mizaj-review + session://r104-experiment
  one_line: Before adopting a broad refactor or architecture story, require one narrow real-task experiment whose result would come out differently under the status quo and the proposed design; use that result to earn or kill the larger redesign.
  falsification: If teams that run the smallest distinguishing experiment still cannot tell which architecture is better, or if the experiment routinely points in the wrong direction and has to be overridden by the full refactor anyway, the move is not a distinct transformable invention.

applicable_problem_shapes:
  - class: methodology-publication
    example: "A paper or internal note on how to evaluate architecture proposals without paying the full refactor cost first."
  - class: design-rationale
    example: "A repo has competing ideas for how to make verification real; one cheap experiment should distinguish symbolic ceremony from actual world contact."
  - class: org-design-template
    example: "An engineering organization wants a standing rule for when proposals must ship a discriminating experiment before receiving broad implementation budget."

transformation_work:
  cost_class: moderate
  description: |
    1. State the architectural dispute in terms of an observable difference,
       not a preference essay.
    2. Identify the smallest real task where status quo and proposed design
       would produce different outcomes.
    3. Build only the minimum slice needed to run that task and capture a real
       artifact, receipt, or runtime result.
    4. Define success and failure before running the experiment, including what
       outcome would kill the larger redesign.
    5. Run the experiment on the real task, not on an abstract benchmark.
    6. Promote the broader architecture only if the experiment yields a clear
       discriminating result that survives rerun or local verification.
  skill_required:
    - experiment design
    - architecture analysis
    - verification discipline

output_forms:
  - value_class: consulting-deliverable
    example: "Architecture decision memo that includes one discriminating experiment and its result before recommending the broader redesign."
    monetization: paid architecture review or technical-advisory engagement
  - value_class: audit-methodology
    example: "A review standard that blocks broad refactors until a narrow real-task experiment has produced evidence."
    monetization: internal engineering governance playbook or reliability consulting package
  - value_class: heuristic
    example: "Rule of thumb: no architecture story without one experiment that could have killed it."
    monetization: indirect through reduced wasted refactor spend and faster decision cycles

evidence:
  successful_transformations:
    - "r103 refused a broad six-move refactor first and instead specified one cheap oracle experiment: add `observe_test(command)` and see whether it catches a false-green, forces honest failure when no oracle exists, and enables independent re-check. r104 then ran exactly that experiment and got a discriminating yes on all three questions (`/tmp/r103-khatim-burhan-mizaj-review.md`:79-89, `/tmp/r104-experiment.md`:59-170)."
    - "The move changed implementation scope materially: instead of architectural theater, the session landed one small receipt-bearing primitive that produced an auditable effect and created the basis for later witness work (`/tmp/r104-experiment.md`:168-170)."
  failed_transformations: []
  use_stories_refs: []

meta:
  novelty_class: meta-method-class
  cohort_origin: 2026-04-29 r99-r106 substrate work, first made explicit in r103 and validated in r104
  audit_notes: |
    Operationally adjacent to atom 0005 but not a duplicate. 0005 is the broad
    recursive method of reshaping narratives against constants. This atom names a
    narrower sequencing rule inside that method: earn the architecture with one
    experiment that could have falsified it.

    Distinct from atom 0009. 0009 is about remeasuring numbers inside a report.
    This atom is about decision sequencing before the larger implementation is
    authorized.

    Re-audit after use outside substrate-language design, especially in product
    and infra decisions where the cheapest discriminating experiment may be less
    obvious than in r104.
  # First-sweep adoption per ~/apps/khazina/lectionary/atom-maintenance-principles.md (2026-05-03):
  maintenance:
    confidence: hasan          # validated in r104, secproj fresh-machine reval, cheapcode Phase 0
    cost_of_being_wrong: extreme  # B.10 — wrong = architecture commits without falsifier; the atom IS the discipline
    provenance: obs            # A.2 — observed live in r103/r104
    evict_to: null             # A.4 — most-cited atom (6 dependents); not a candidate for eviction
    dependents:
      - khazina/atoms/0012-decode-time-constraint-via-grammar.md  # uses 0011 inside transformation_work
      - khazina/atoms/0016-substrate-as-deterministic-verifier-head.md  # arm-split is 0011 applied to its own falsifier
      - khazina/lectionary/calibration-audit.md (cycle step 1)
      - secproj/plan/MAIN.bn (umbrella 2 cycle citation)
      - cheapcode/plan/MAIN.bn (lectionary cycle)
      - cheapcode/plan/PLAN.bn (iai_router_pattern_anchor)
    last_validated_at: 2026-05-03
---

# Atom 0011 — Smallest distinguishing experiment before architecture commitment

Many architecture discussions fail because they start at the scale of the final story. The team debates a full redesign, richer ontology, or broader workflow before it has one concrete observation that could distinguish the new path from the old one. This atom says to invert that order. Do not fund or narrate the big architecture first. First find the narrowest real task where the proposed change would behave differently, and make that task answer the question.

The session gives a clean example. The critique in r103 raised a large family of possible Burhan improvements, but the review deliberately cut the next step down to one experiment: can a single receipt-bearing observation primitive catch a false-green and enable rerun? r104 then answered that with artifacts rather than prose. That is why this is not generic "prototype first" advice. The prototype is specifically chosen because its outcome distinguishes the competing architectures.

This is commercially useful because architecture indecision is expensive. A review practice that forces proposals to come with one cheap discriminating experiment reduces speculative refactor spend and improves executive confidence in technical recommendations. Customers do not only buy the experiment; they buy the discipline that prevents elegant but unearned redesign stories from consuming the roadmap.
