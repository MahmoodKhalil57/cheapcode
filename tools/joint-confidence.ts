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

const CLAIMS: Claim[] = [
  { name: "cheapllm_cheaper_proven", c: 0.95, tier: "L1", group: "cheapllm-perf" },
  { name: "cheapllm_faster_proven", c: 0.95, tier: "L1", group: "cheapllm-perf" },
  { name: "cheapllm_more_context_proven", c: 0.85, tier: "L1", group: "cheapllm-perf" },
  { name: "cheapllm_smart_axis_pending", c: 0.50, tier: "L1-pending", group: "cheapllm-smart" },
  { name: "cheapcode_smart_on_cheapbench", c: 0.50, tier: "L1-pending", group: "cheapcode-harness" },
  { name: "cheapbench_uses_public_data_only", c: 0.95, tier: "L1", group: "cheapbench-design" },
  { name: "cheapbench_zero_marginal_cost", c: 0.85, tier: "L1", group: "cheapbench-design" },
  { name: "cheapcode_beats_codex_on_cost", c: 0.30, tier: "L4-only", group: "vs-codex" },
  { name: "cheapcode_beats_codex_on_latency", c: 0.30, tier: "L4-only", group: "vs-codex" },
  { name: "cheapcode_beats_codex_on_capability", c: 0.30, tier: "L4-only", group: "vs-codex" },
  { name: "cheapcode_beats_vanilla_opencode_on_capability", c: 0.40, tier: "L1-pending", group: "vs-vanilla" },
  { name: "cheapllm_cost_evidence_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "cheapllm_latency_evidence_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "cheapllm_context_evidence_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "mizaj_substrate_solid_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "khazina_substrate_solid_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "khatim_negative_knowledge_solid_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "vanilla_opencode_arch_solid_l1", c: 0.99, tier: "L1", group: "substrate-l1" },
  { name: "claim_shape_thesis_atom_anchored", c: 0.99, tier: "L1", group: "atom-anchors" },
  { name: "cheapbench_design_atom_anchored", c: 0.99, tier: "L1", group: "atom-anchors" },
  { name: "conservative_transfer_atom_anchored", c: 0.99, tier: "L1", group: "atom-anchors" },
  { name: "calibration_credential_atom_anchored", c: 0.99, tier: "L1", group: "atom-anchors" },
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
  "cheapllm-perf": 0.95,
  "cheapllm-smart": 0.85,
  "cheapcode-harness": 0.85,
  "cheapbench-design": 0.95,
  "vs-codex": 0.85,
  "vs-vanilla": 0.85,
  "substrate-l1": 0.99,
  "atom-anchors": 0.99,
};

function postMeasurementJoint(): { joint: number; groups: Array<{ group: string; ceiling: number }> } {
  const groups = Object.entries(POST_MEASUREMENT_CEILINGS).map(([group, ceiling]) => ({ group, ceiling }));
  const joint = groups.reduce((p, g) => p * g.ceiling, 1);
  return { joint, groups };
}

function perClaimNeededFor(target: number, n: number): number {
  return Math.pow(target, 1 / n);
}

const ind = independentJoint(CLAIMS);
const cor = correlatedJoint(CLAIMS);
const postm = postMeasurementJoint();

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
  post_full_L1_measurement_state: {
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
};

console.log(JSON.stringify(out, null, 2));
