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

// Updated 2026-05-02b for the architectural pivot: 5-model surgical add
// to opencode's provider registry rather than wrapping cheapllm as
// separate process. Smaller claim set; per-claim confidences higher
// because cheapllm's receipts directly transfer.
const CLAIMS: Claim[] = [
  { name: "cheap_tier_uses_deepseek_v4_flash", c: 0.95, tier: "L1", group: "tier-choices-receipted" },
  { name: "cheap_fast_uses_race_k_cheapllm_strategy", c: 0.90, tier: "L1", group: "tier-choices-receipted" },
  { name: "smart_tier_routes_directly_to_capable_model", c: 0.92, tier: "L1", group: "tier-choices-receipted" },
  { name: "long_context_uses_grok_4_fast", c: 0.95, tier: "L1", group: "tier-choices-receipted" },
  { name: "smart_fast_tier_choice_pending_measurement", c: 0.50, tier: "L1-pending", group: "tier-choices-pending" },
  { name: "auto_wrapper_apophatic_routing_works", c: 0.80, tier: "L3-iai", group: "auto-wrapper" },
  { name: "verifier_hook_catches_50pct_of_wrong_answers", c: 0.94, tier: "L1+L3-research-synthesized", group: "auto-wrapper" },
  { name: "cross_witness_pattern_lifts_hard_reasoning", c: 0.80, tier: "L3-research-synthesized", group: "auto-wrapper" },
  { name: "plan_decompose_amortizes_smart_calls", c: 0.80, tier: "L3-research-synthesized", group: "auto-wrapper" },
  { name: "cheapcode_auto_3_axis_dominance_on_multistep_over_raw_frontier", c: 0.65, tier: "L1-EXPERIMENT-1-pending-multistep", group: "hard-reasoning-claim" },
  { name: "best_of_k_3_lifts_completion_5_to_15pct", c: 0.85, tier: "L3-research-synthesized-mutawatir", group: "ensemble-methods" },
  { name: "cross_model_verification_lifts_over_self_verify", c: 0.80, tier: "L3-research-synthesized", group: "ensemble-methods" },
  { name: "parallel_leaf_execution_keeps_latency_below_raw", c: 0.89, tier: "L1+L3-research-synthesized", group: "ensemble-methods" },
  { name: "honest_niche_dominance_includes_cost_adjusted_hard_reasoning", c: 0.85, tier: "L1-cheapllm-v1", group: "honest-niche" },
  { name: "provider_registry_propagation_holds", c: 0.85, tier: "L1-source-readable", group: "propagation" },
  { name: "or_provider_inheritance_safe", c: 0.90, tier: "L1-source-readable", group: "propagation" },
  { name: "surgical_fork_loc_budget_holds", c: 0.85, tier: "project-meta", group: "maintainability" },
  { name: "upstream_files_modified_within_budget", c: 0.90, tier: "project-meta", group: "maintainability" },
  { name: "weekly_rebase_holds", c: 0.80, tier: "project-meta", group: "maintainability" },
  { name: "cheapcode_beats_codex_after_pricing_fetch", c: 0.75, tier: "L2-pending", group: "vs-codex" },
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
  "tier-choices-receipted": 0.95,
  "tier-choices-pending": 0.90,
  "auto-wrapper": 0.85,
  "hard-reasoning-claim": 0.85,
  "ensemble-methods": 0.85,
  "honest-niche": 0.95,
  "propagation": 0.92,
  "maintainability": 0.82,
  "vs-codex": 0.85,
  "vs-vanilla": 0.92,
  "substrate-l1": 0.99,
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
  "tier-choices-pending": 0.85, // could find latency benchmarks for some OR models
  "auto-wrapper": 0.90, // multiple L3 papers + 1 in-house = high
  "hard-reasoning-claim": 0.65, // 3-axis combination is cheapcode-specific; literature thin
  "ensemble-methods": 0.85, // mutawatir-equivalent L3 (4+ groups for best-of-K)
  "honest-niche": 0.95, // cheapllm-v1 already proved
  "propagation": 0.92, // opencode source-readable
  "maintainability": 0.82, // project-meta, not really research-liftable
  "vs-codex": 0.80, // L2 vendor pricing is fetchable
  "vs-vanilla": 0.85, // limited research; mostly source-readable
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

const target = 0.99999;
const out = {
  meta: {
    target_confidence: target,
    n_claims: CLAIMS.length,
    n_correlated_groups: cor.groups.length,
    audit_tag: "cheapcode-joint-confidence-computation",
    timestamp: new Date().toISOString(),
  },
  current_state: {
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
