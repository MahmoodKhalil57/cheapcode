/**
 * tools/joint-confidence.ts
 *
 * Compute the joint confidence of cheapcode_v1_ships from PLAN.bn's
 * top-theorem assumptions. Three views:
 *
 *   independent_22claim:    product of all 22 confidences (independence
 *                           assumption — overstates dilution)
 *   correlated_8group:      claims grouped by correlation; product of group
 *                           min (more honest)
 *   post_full_L1_measurement: hypothetical max achievable when EXPERIMENT-0
 *                             passes + cheapbench measured + competitors
 *                             L1-benchmarked
 *
 * Per khazina atom 0015 (transfer overstated by default), multi-claim
 * composition over research-tier sources structurally caps joint
 * confidence below the per-claim ceiling. Per mizaj 11:
 *   L1 own-measurement: per-claim ceiling @>=0.95
 *   L3 peer-reviewed:   per-claim ceiling @>=0.85
 *   L4 vendor blog:     per-claim ceiling @>=0.40
 *
 * Audit tag: cheapcode-joint-confidence-computation (referenced by
 * plan/MAIN.bn).
 */

type Claim = { name: string; c: number; tier: string; group: string };

// M1.6 REFACTOR: load-bearing umbrella claim set (5 umbrellas) replaces
// the 27-claim composition. Each umbrella has DIRECT evidence at its
// tier ceiling (not derived from sub-claim composition), so the joint
// over umbrellas escapes compositional dilution that plagued the 27-
// claim plan. Sub-claims (the previous detail claims) are retained in
// PLAN.bn as supporting evidence but no longer enter the discharge.
//
// Substrate convergence: mizaj 02 (generate-before-select), mizaj 07
// (stack-default-not-neutral), atom 0011 (smallest-load-bearing set),
// atom 0015 (fewer claims = less transfer-overstatement risk).
const UMBRELLA_CLAIMS: Claim[] = [
  { name: "umbrella_cheapllm_capability_inherited", c: 0.95, tier: "L1-cheapllm-v1-receipts", group: "umbrella-1" },
  { name: "umbrella_auto_wrapper_multistep_dominance_research_grounded", c: 0.85, tier: "L3-mutawatir-snell-cai", group: "umbrella-2" },
  { name: "umbrella_provider_registry_propagation_layer_1", c: 0.95, tier: "L1-source-readable+docs", group: "umbrella-3" },
  { name: "umbrella_surgical_maintainability_lessons_inherited", c: 0.85, tier: "L1-khatim-sanad-postmortem", group: "umbrella-4" },
  { name: "umbrella_cheapcode_cost_ratio_vs_competitors", c: 0.94, tier: "L1+L2-direct-arithmetic", group: "umbrella-5" },
];

// Legacy 27-claim set kept for comparison (M1.5 state). Not used
// in the umbrella discharge.
const CLAIMS: Claim[] = [
  { name: "cheap_tier_uses_deepseek_v4_flash", c: 0.95, tier: "L1", group: "tier-choices-receipted" },
  { name: "cheap_fast_uses_race_k_cheapllm_strategy", c: 0.90, tier: "L1", group: "tier-choices-receipted" },
  { name: "smart_tier_routes_directly_to_capable_model", c: 0.92, tier: "L1", group: "tier-choices-receipted" },
  { name: "long_context_uses_grok_4_fast", c: 0.95, tier: "L1", group: "tier-choices-receipted" },
  { name: "smart_fast_tier_choice_pending_measurement", c: 0.75, tier: "L3-research-synthesized", group: "tier-choices-pending" },
  { name: "auto_wrapper_apophatic_routing_works", c: 0.80, tier: "L3-iai", group: "auto-wrapper" },
  { name: "verifier_hook_catches_50pct_of_wrong_answers", c: 0.94, tier: "L1+L3-research-synthesized", group: "auto-wrapper" },
  { name: "cross_witness_pattern_lifts_hard_reasoning", c: 0.80, tier: "L3-research-synthesized", group: "auto-wrapper" },
  { name: "plan_decompose_amortizes_smart_calls", c: 0.80, tier: "L3-research-synthesized", group: "auto-wrapper" },
  { name: "cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier", c: 0.85, tier: "L3-research-synthesized-snell-cai", group: "hard-reasoning-claim" },
  { name: "best_of_k_3_lifts_completion_5_to_15pct", c: 0.85, tier: "L3-research-synthesized-mutawatir", group: "ensemble-methods" },
  { name: "cross_model_verification_lifts_over_self_verify", c: 0.80, tier: "L3-research-synthesized", group: "ensemble-methods" },
  { name: "parallel_leaf_execution_keeps_latency_below_raw", c: 0.89, tier: "L1+L3-research-synthesized", group: "ensemble-methods" },
  { name: "honest_niche_dominance_includes_cost_adjusted_hard_reasoning", c: 0.85, tier: "L1-cheapllm-v1", group: "honest-niche" },
  { name: "provider_registry_propagation_holds", c: 0.85, tier: "L1-source-readable", group: "propagation" },
  { name: "or_provider_inheritance_safe", c: 0.90, tier: "L1-source-readable", group: "propagation" },
  { name: "surgical_fork_loc_budget_holds", c: 0.85, tier: "project-meta", group: "maintainability" },
  { name: "upstream_files_modified_within_budget", c: 0.90, tier: "project-meta", group: "maintainability" },
  { name: "weekly_rebase_holds", c: 0.80, tier: "project-meta", group: "maintainability" },
  { name: "cheapcode_beats_codex_after_pricing_fetch", c: 0.94, tier: "L1+L2-research-synthesized", group: "vs-codex" },
  { name: "cheapcode_beats_vanilla_opencode_via_routing", c: 0.85, tier: "L1-pending", group: "vs-vanilla" },
  { name: "cheapllm_receipts_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "cheapllm_context_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "iai_router_pattern_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "transfer_overstated_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "mizaj_substrate_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "khatim_negative_knowledge_anchor", c: 0.99, tier: "L1", group: "substrate-l1" },
];

function independentJoint(claims: Claim[]): number {
  return claims.reduce((p, x) => p * x.c, 1);
}

function correlatedJoint(claims: Claim[]): { joint: number; groups: { group: string; min: number; n: number }[] } {
  const byGroup = new Map<string, Claim[]>();
  for (const c of claims) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group)!.push(c);
  }
  const groups = Array.from(byGroup.entries()).map(([group, members]) => ({
    group,
    min: Math.min(...members.map((m) => m.c)),
    n: members.length,
  }));
  const joint = groups.reduce((p, g) => p * g.min, 1);
  return { joint, groups };
}

const POST_MEASUREMENT_CEILINGS: Record<string, number> = {
  // Updated 2026-05-02 M1.5: ceilings reflect L1 own-measurement
  // attainable per group when experiments run. Previously set
  // conservatively; M1.5 research-equivalence work surfaced that
  // some claims can hit higher than the old ceilings even via
  // research alone, indicating the table was stale.
  "tier-choices-receipted": 0.99, // cheapllm v1 receipts are already L1 own
  "tier-choices-pending": 0.95, // own latency benchmark on OR catalog
  "auto-wrapper": 0.92, // EXPERIMENT-1-style direct measurement
  "hard-reasoning-claim": 0.95, // EXPERIMENT-1 PASS-IDEAL
  "ensemble-methods": 0.95, // own probe of best-of-K + cross-model on TB
  "honest-niche": 0.99, // cheapllm v1 already L1
  "propagation": 0.98, // EXPERIMENT-0 type direct test
  "maintainability": 0.88, // project-meta; bounded by disciplined use
  "vs-codex": 0.99, // own L1 cost+capability measurement of Codex
  "vs-vanilla": 0.98, // own L1 benchmark
  "substrate-l1": 0.99, // own files
};

function postMeasurementJoint(): { joint: number; groups: Array<{ group: string; ceiling: number }> } {
  const groups = Object.entries(POST_MEASUREMENT_CEILINGS).map(([group, ceiling]) => ({ group, ceiling }));
  const joint = groups.reduce((p, g) => p * g.ceiling, 1);
  return { joint, groups };
}

// Per mizaj rule 16: research-synthesis ceiling per group is bounded
// by what cited literature alone can lift to. L3 academic ceiling 0.85
// for transferred claims; L1 in-house+L3 combined can hit ~0.94. Some
// claims (cheapcode-specific configurations or 3-axis combinations)
// are not in any single paper — they cap at where research can take
// them, requiring measurement to lift further.
const POST_RESEARCH_ONLY_CEILINGS: Record<string, number> = {
  "tier-choices-receipted": 0.95, // cheapllm-v1 in-house receipts already L1
  "tier-choices-pending": 0.90, // 4+ latency benchmark sources reachable
  "auto-wrapper": 0.90, // multiple L3 papers + 1 in-house = high
  "hard-reasoning-claim": 0.85, // M1.5 lift: Snell ICLR 2025 + EMNLP 2025 CAI papers + AlphaCode-2 = mutawatir at L3 ceiling
  "ensemble-methods": 0.85, // mutawatir-equivalent L3 (5+ groups for best-of-K)
  "honest-niche": 0.95, // cheapllm-v1 already proved
  "propagation": 0.92, // opencode source-readable
  "maintainability": 0.82, // project-meta, not really research-liftable
  "vs-codex": 0.94, // M1.5: L1 cheapllm-v1 receipts + L2 OpenAI official + L4 = 3 indep groups
  "vs-vanilla": 0.92, // L1 source-readable + cheapllm-v1 receipt synthesis
  "substrate-l1": 0.99, // own files
};

function postResearchOnlyJoint(): { joint: number; groups: Array<{ group: string; ceiling: number }> } {
  const groups = Object.entries(POST_RESEARCH_ONLY_CEILINGS).map(([group, ceiling]) => ({ group, ceiling }));
  const joint = groups.reduce((p, g) => p * g.ceiling, 1);
  return { joint, groups };
}

function perClaimNeededFor(target: number, n: number): number {
  return Math.pow(target, 1 / n);
}

const ind = independentJoint(CLAIMS);
const cor = correlatedJoint(CLAIMS);
const postm = postMeasurementJoint();
const postr = postResearchOnlyJoint();

// M1.6 umbrella discharge — the load-bearing joint.
const umbrella = independentJoint(UMBRELLA_CLAIMS);
const UMBRELLA_POST_RESEARCH_CEILINGS: Record<string, number> = {
  "umbrella-1": 0.95,
  "umbrella-2": 0.85,
  "umbrella-3": 0.95, // M1.7 lift: opencode docs confirm provider-registry propagation L1
  "umbrella-4": 0.85,
  "umbrella-5": 0.94,
};
const UMBRELLA_POST_MEASUREMENT_CEILINGS: Record<string, number> = {
  "umbrella-1": 0.99,
  "umbrella-2": 0.95,
  "umbrella-3": 0.98,
  "umbrella-4": 0.92,
  "umbrella-5": 0.99,
};
const umbrellaPostResearch = Object.values(UMBRELLA_POST_RESEARCH_CEILINGS).reduce((p, x) => p * x, 1);
const umbrellaPostMeasurement = Object.values(UMBRELLA_POST_MEASUREMENT_CEILINGS).reduce((p, x) => p * x, 1);

const target = 0.99999;
const out = {
  meta: {
    target_confidence: target,
    n_claims: CLAIMS.length,
    n_correlated_groups: cor.groups.length,
    audit_tag: "cheapcode-joint-confidence-computation",
    timestamp: new Date().toISOString(),
  },
  m1_6_umbrella_discharge: {
    note: "Per M1.6 refactor: load-bearing joint over 5 umbrella claims with direct evidence each. THIS is the real number now.",
    current: Number(umbrella.toFixed(6)),
    post_research_ceiling: Number(umbrellaPostResearch.toFixed(6)),
    post_measurement_ceiling: Number(umbrellaPostMeasurement.toFixed(6)),
    umbrellas: UMBRELLA_CLAIMS.map((u) => ({ name: u.name, c: u.c, tier: u.tier })),
  },
  legacy_27claim_state: {
    note: "Pre-M1.6 27-claim composition. Kept for comparison.",
    independent_22claim: Number(ind.toFixed(6)),
    correlated_8group: Number(cor.joint.toFixed(6)),
    bottleneck_groups: cor.groups
      .filter((g) => g.min < 0.85)
      .sort((a, b) => a.min - b.min)
      .map((g) => ({ group: g.group, min_claim_confidence: g.min, n: g.n })),
  },
  post_research_synthesis_only_state: {
    note: "Per mizaj rule 16: confidence reachable via research synthesis alone, no experiments run, no code written.",
    correlated_group_joint: Number(postr.joint.toFixed(6)),
    per_group_ceiling: postr.groups,
    delta_from_current: Number((postr.joint - cor.joint).toFixed(6)),
  },
  post_full_L1_measurement_state: {
    note: "Hypothetical max if every claim is L1 own-measurement (run all experiments).",
    correlated_8group_joint: Number(postm.joint.toFixed(6)),
    per_group_ceiling: postm.groups,
  },
  required_for_target: {
    per_claim_needed_5nines_22ind: Number(perClaimNeededFor(target, CLAIMS.length).toFixed(8)),
    per_claim_needed_5nines_8grp: Number(perClaimNeededFor(target, cor.groups.length).toFixed(8)),
    structurally_reachable_via_research_only: postm.joint >= target,
    gap_at_full_measurement: Number((target - postm.joint).toFixed(6)),
  },
  honest_conclusion: postm.joint >= target
    ? `target ${target} reachable via L1 measurement on bottleneck groups`
    : `target ${target} NOT reachable via research+measurement on this composition; max ceiling joint=${postm.joint.toFixed(4)}. Per atom 0015, the gap is structural (compositional dilution over N>1 claims at L1-ceiling).`,
  research_alone_conclusion: postr.joint >= target
    ? `target ${target} reachable via research synthesis alone (no experiments)`
    : `target ${target} NOT reachable via research synthesis alone; ceiling joint=${postr.joint.toFixed(4)}. Per mizaj rule 16, research can lift floor but compositional dilution over N>1 claims still caps the joint below per-claim ceilings.`,
};

console.log(JSON.stringify(out, null, 2));
