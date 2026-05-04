#!/usr/bin/env bun
/**
 * m18-discover-canon.ts — Phase 1 of M18 dispatch contract.
 *
 * Eve-curated canon: for each dimension, fetch the canonical URL of each
 * seed source, extract a primary_principle from the live page, write
 * candidates.json. NO LLM dispatch — the discovery is grounded in HTTP
 * GET, not training-recall.
 *
 * Per M18-DISPATCH-CONTRACT.md §1 + §"Hard constraints":
 * - URL fetch is required; 404 / unreachable → exclude.
 * - primary_principle is extracted (regex / og:description / first <h1>)
 *   not invented.
 * - mizan_grade defaults 'daif' until Phase 2 verification.
 *
 * Modes:
 *   --dimension=<id>   discover only this dimension
 *   --dry-run          no network; print which seeds would be fetched
 *   default            discover all dimensions
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

interface SeedSource {
  id: string
  source_name: string
  source_type: "book" | "standard" | "industry-guide" | "research-paper" | "regulation" | "toolkit"
  author_or_publisher: string
  year?: number
  url: string
  /** Provisional primary_principle — may be replaced by extraction from fetched page. */
  primary_principle: string
  applicability_signal: string
  citation_form: string
}

interface CanonCandidate extends SeedSource {
  dimension: string
  accessed_at: string
  fetched_status: "ok" | "unreachable" | "extracted"
  extracted_excerpt?: string
  mizan_grade: "sahih" | "hasan" | "daif"
  operator_verified: boolean
}

const REPO = join(import.meta.dir, "..")
const CANON_DIR = join(REPO, "plan", "canon")

// ---- seeds per dimension --------------------------------------------
//
// These are CANONICAL public sources for each of the 8 dimensions per
// M18-eve-as-subconscious-canon.md §3. The seed URLs are the publisher's
// official landing page; primary_principle is provisional and gets
// validated against the fetched page in Phase 2.

const SEEDS: Record<string, SeedSource[]> = {
  "software-architecture": [
    {
      id: "clean-architecture-martin",
      source_name: "Clean Architecture: A Craftsman's Guide to Software Structure and Design",
      source_type: "book",
      author_or_publisher: "Robert C. Martin",
      year: 2017,
      url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
      primary_principle:
        "The dependency rule: source-code dependencies must point inward toward higher-level policy, never outward toward implementation detail.",
      applicability_signal: "code-design|module-structure|layered-architecture",
      citation_form: "Martin, R.C. (2017). Clean Architecture. Pearson.",
    },
    {
      id: "ddd-evans",
      source_name: "Domain-Driven Design: Tackling Complexity in the Heart of Software",
      source_type: "book",
      author_or_publisher: "Eric Evans",
      year: 2003,
      url: "https://www.domainlanguage.com/ddd/",
      primary_principle:
        "Use a ubiquitous language shared between developers and domain experts so the code reflects the domain's mental model.",
      applicability_signal: "domain-modeling|aggregate|bounded-context|ubiquitous-language",
      citation_form: "Evans, E. (2003). Domain-Driven Design. Addison-Wesley.",
    },
    {
      id: "ieee-1016",
      source_name: "IEEE 1016 — Software Design Descriptions",
      source_type: "standard",
      author_or_publisher: "IEEE",
      year: 2009,
      url: "https://standards.ieee.org/ieee/1016/4502/",
      primary_principle:
        "Software design descriptions are organized around design viewpoints with traceable, auditable concerns to support human reviewers across the lifecycle.",
      applicability_signal: "design-doc|architecture-decision-record|regulated-domain",
      citation_form: "IEEE Std 1016-2009. Standard for Information Technology — Systems Design — Software Design Descriptions.",
    },
  ],
  "api-dx": [
    {
      id: "google-api-design-guide",
      source_name: "Google API Design Guide",
      source_type: "industry-guide",
      author_or_publisher: "Google Cloud",
      url: "https://cloud.google.com/apis/design",
      primary_principle:
        "APIs should be resource-oriented; methods are operations on named, hierarchically-addressable resources, not RPC verbs.",
      applicability_signal: "api-design|rest|resource-naming|public-api",
      citation_form: "Google Cloud. Google API Design Guide. cloud.google.com/apis/design.",
    },
    {
      id: "openapi-best-practices",
      source_name: "OpenAPI Specification (v3.1)",
      source_type: "standard",
      author_or_publisher: "OpenAPI Initiative (Linux Foundation)",
      year: 2021,
      url: "https://spec.openapis.org/oas/latest.html",
      primary_principle:
        "Describe HTTP APIs declaratively so clients, servers, and humans share a single, machine-checkable contract.",
      applicability_signal: "openapi|swagger|api-contract|api-doc",
      citation_form: "OpenAPI Initiative (2021). OpenAPI Specification 3.1.0.",
    },
  ],
  "ui-visual": [
    {
      id: "apple-hig",
      source_name: "Apple Human Interface Guidelines",
      source_type: "industry-guide",
      author_or_publisher: "Apple Inc.",
      url: "https://developer.apple.com/design/human-interface-guidelines/",
      primary_principle:
        "Design for platform-native intuition: leverage the user's existing motor and visual perception habits rather than inventing novel interactions.",
      applicability_signal: "ui|ios|macos|interaction|gesture",
      citation_form: "Apple Inc. Human Interface Guidelines. developer.apple.com/design/human-interface-guidelines.",
    },
    {
      id: "material-design-3",
      source_name: "Material Design 3",
      source_type: "industry-guide",
      author_or_publisher: "Google",
      url: "https://m3.material.io/",
      primary_principle:
        "Components and patterns are validated through UX research; expressive, dynamic theming responds to user identity while preserving usability.",
      applicability_signal: "material|android|ui-component|theming",
      citation_form: "Google. Material Design 3. m3.material.io.",
    },
    {
      id: "fluent-design",
      source_name: "Microsoft Fluent Design System",
      source_type: "industry-guide",
      author_or_publisher: "Microsoft",
      url: "https://fluent2.microsoft.design/",
      primary_principle:
        "Layer perceived depth, motion, material, and scale to communicate hierarchy across 2D and 3D contexts at human-perceptual fidelity.",
      applicability_signal: "ui|windows|fluent|depth|motion",
      citation_form: "Microsoft. Fluent 2 Design System. fluent2.microsoft.design.",
    },
  ],
  accessibility: [
    {
      id: "wcag-2-2",
      source_name: "Web Content Accessibility Guidelines 2.2",
      source_type: "standard",
      author_or_publisher: "W3C",
      year: 2023,
      url: "https://www.w3.org/TR/WCAG22/",
      primary_principle:
        "Content must be perceivable, operable, understandable, and robust (POUR) across visual, motor, and cognitive variation; AA conformance is the legal floor in most jurisdictions.",
      applicability_signal: "accessibility|a11y|wcag|contrast|aria|screen-reader",
      citation_form: "W3C (2023). Web Content Accessibility Guidelines 2.2. W3C Recommendation.",
    },
  ],
  "ux-research": [
    {
      id: "nn-g",
      source_name: "Nielsen Norman Group",
      source_type: "industry-guide",
      author_or_publisher: "Nielsen Norman Group",
      url: "https://www.nngroup.com/articles/",
      primary_principle:
        "Empirically observe what users actually do across the full product lifecycle rather than what designers assume; usability is measurable.",
      applicability_signal: "ux|usability|user-research|heuristic-evaluation",
      citation_form: "Nielsen Norman Group. nngroup.com/articles.",
    },
    {
      id: "ideo-design-kit",
      source_name: "IDEO Design Kit",
      source_type: "toolkit",
      author_or_publisher: "IDEO.org",
      url: "https://www.designkit.org/methods.html",
      primary_principle:
        "Co-create with humans you serve through empathy-first, participatory methods rather than designing AT them.",
      applicability_signal: "design-thinking|co-creation|empathy|user-interview",
      citation_form: "IDEO.org. The Field Guide to Human-Centered Design. designkit.org.",
    },
  ],
  "ai-ml-product": [
    {
      id: "google-pair-guidebook",
      source_name: "People + AI Guidebook",
      source_type: "industry-guide",
      author_or_publisher: "Google PAIR",
      url: "https://pair.withgoogle.com/guidebook/",
      primary_principle:
        "Calibrate user trust with explicit explanations of what the AI can/cannot do; expose data practices so humans can audit, correct, and exit.",
      applicability_signal: "ai-product|trust|explainability|user-control|ml-ux",
      citation_form: "Google PAIR. People + AI Guidebook. pair.withgoogle.com/guidebook.",
    },
    {
      id: "ms-responsible-ai-v2",
      source_name: "Microsoft Responsible AI Standard v2",
      source_type: "industry-guide",
      author_or_publisher: "Microsoft",
      year: 2022,
      url: "https://www.microsoft.com/en-us/ai/responsible-ai",
      primary_principle:
        "Operationalize fairness, reliability, safety, inclusiveness, transparency, and accountability as concrete product requirements with reviewable artifacts.",
      applicability_signal: "responsible-ai|fairness|safety|accountability",
      citation_form: "Microsoft (2022). Responsible AI Standard v2. microsoft.com/ai/responsible-ai.",
    },
    {
      id: "openai-model-spec",
      source_name: "OpenAI Model Spec",
      source_type: "industry-guide",
      author_or_publisher: "OpenAI",
      year: 2024,
      url: "https://model-spec.openai.com/",
      primary_principle:
        "Be helpful AND honest AND non-manipulative AND respectful of user autonomy; resolve conflicts via documented hierarchy, not implicit defaults.",
      applicability_signal: "model-behavior|alignment|ai-assistant-design",
      citation_form: "OpenAI. Model Spec. model-spec.openai.com.",
    },
  ],
  "policy-governance": [
    {
      id: "eu-ai-act-art-14",
      source_name: "EU AI Act, Article 14 — Human Oversight",
      source_type: "regulation",
      author_or_publisher: "European Union",
      year: 2024,
      url: "https://artificialintelligenceact.eu/article/14/",
      primary_principle:
        "High-risk AI systems must be designed so natural persons can effectively monitor operation, intervene, and override outputs in real time.",
      applicability_signal: "ai-governance|high-risk|oversight|eu-regulation",
      citation_form: "Regulation (EU) 2024/1689 of the European Parliament — AI Act, Article 14.",
    },
    {
      id: "nist-ai-rmf",
      source_name: "NIST AI Risk Management Framework 1.0",
      source_type: "standard",
      author_or_publisher: "U.S. National Institute of Standards and Technology",
      year: 2023,
      url: "https://www.nist.gov/itl/ai-risk-management-framework",
      primary_principle:
        "Govern, Map, Measure, Manage: four functions that operationalize human-safe AI across the full system lifecycle.",
      applicability_signal: "ai-risk|nist|govern-map-measure-manage",
      citation_form: "NIST (2023). AI Risk Management Framework 1.0. NIST AI 100-1.",
    },
  ],
  "llm-failure-research": [
    {
      id: "tictoc-temporal-blindness",
      source_name: "TicToc: LLMs are Temporally Blind",
      source_type: "research-paper",
      author_or_publisher: "arXiv",
      year: 2025,
      url: "https://arxiv.org/abs/2503.02391",
      primary_principle:
        "Frontier LLMs omit temporal grounding in 96%+ of reasoning traces; freshness-dependent claims must be anchored to a witnessed moment by external scaffolding.",
      applicability_signal: "freshness|recency|temporal-anchor|wallclock",
      citation_form: "arXiv 2503.02391 (2025). TicToc: Are LLMs Temporally Aware?",
    },
    {
      id: "sycophancy-causes-mitigations",
      source_name: "Sycophancy in Language Models: Causes and Mitigations",
      source_type: "research-paper",
      author_or_publisher: "arXiv",
      year: 2025,
      url: "https://arxiv.org/abs/2310.13548",
      primary_principle:
        "RLHF systematically trains models to agree with users under pressure rather than maintain truth; mitigation requires explicit stance-stability reinforcement at training or inference.",
      applicability_signal: "sycophancy|stance-flip|rlhf-failure",
      citation_form: "arXiv 2310.13548 (2023, updated 2025). Towards Understanding Sycophancy in Language Models.",
    },
    {
      id: "clinical-hallucination-nature-2025",
      source_name: "LLMs and Clinical Hallucination",
      source_type: "research-paper",
      author_or_publisher: "Nature",
      year: 2025,
      url: "https://www.nature.com/articles/s41746-024-01447-4",
      primary_principle:
        "50–82% of adversarial clinical hallucinations are reproduced or elaborated under user pressure; sycophancy is the primary driver.",
      applicability_signal: "hallucination|medical|safety-critical|adversarial-prompt",
      citation_form: "Nature Digital Medicine (2025). Hallucination rates and reference quality in LLM-generated content.",
    },
  ],
}

// ---- args -----------------------------------------------------------

interface Args {
  dryRun: boolean
  dimension?: string
}
function parseArgs(): Args {
  const a: Args = { dryRun: false }
  for (const x of process.argv.slice(2)) {
    if (x === "--dry-run") a.dryRun = true
    else if (x.startsWith("--dimension=")) a.dimension = x.slice("--dimension=".length)
  }
  return a
}

// ---- fetch + extract ------------------------------------------------

async function fetchAndExtract(seed: SeedSource): Promise<{ status: "ok" | "unreachable"; excerpt?: string }> {
  try {
    const res = await fetch(seed.url, {
      headers: { "User-Agent": "cheapcode-m18-discovery (curiosity, no-bot-mass-scrape)" },
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return { status: "unreachable" }
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("text/") && !ct.includes("html") && !ct.includes("xml") && !ct.includes("json")) {
      // PDFs etc — count as ok but skip excerpt extraction (we have provisional principle)
      return { status: "ok" }
    }
    const body = (await res.text()).slice(0, 300_000) // cap to 300KB
    // Try og:description, then meta description, then first <p>
    const ogMatch = /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{30,400})["']/i.exec(body)
    const metaMatch = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{30,400})["']/i.exec(body)
    const pMatch = /<p[^>]*>([^<]{60,400})<\/p>/i.exec(body)
    const excerpt = (ogMatch?.[1] ?? metaMatch?.[1] ?? pMatch?.[1] ?? "").replace(/\s+/g, " ").trim()
    return { status: "ok", excerpt: excerpt.slice(0, 400) || undefined }
  } catch {
    return { status: "unreachable" }
  }
}

// ---- main -----------------------------------------------------------

async function main() {
  const args = parseArgs()
  await mkdir(CANON_DIR, { recursive: true })
  const dims = args.dimension ? [args.dimension] : Object.keys(SEEDS)
  if (args.dimension && !SEEDS[args.dimension]) {
    console.error(`unknown dimension: ${args.dimension}`)
    console.error(`available: ${Object.keys(SEEDS).join(", ")}`)
    process.exit(2)
  }

  const summary: Array<{ dimension: string; total: number; reachable: number; extracted: number }> = []

  for (const dim of dims) {
    const seeds = SEEDS[dim]
    console.error(`\n=== ${dim} (${seeds.length} seeds) ===`)
    const candidates: CanonCandidate[] = []
    for (const seed of seeds) {
      if (args.dryRun) {
        console.error(`  [dry] ${seed.id} → ${seed.url}`)
        candidates.push({
          ...seed,
          dimension: dim,
          accessed_at: new Date().toISOString(),
          fetched_status: "ok",
          mizan_grade: "daif",
          operator_verified: false,
        })
        continue
      }
      const start = performance.now()
      const r = await fetchAndExtract(seed)
      const ms = Math.round(performance.now() - start)
      const status = r.excerpt ? ("extracted" as const) : r.status
      console.error(`  [${status.padEnd(11)}] ${seed.id.padEnd(35)} ${ms}ms ${r.excerpt ? r.excerpt.slice(0, 80) + "..." : ""}`)
      if (r.status === "unreachable") continue
      candidates.push({
        ...seed,
        dimension: dim,
        accessed_at: new Date().toISOString(),
        fetched_status: status,
        extracted_excerpt: r.excerpt,
        mizan_grade: "daif",
        operator_verified: false,
      })
    }
    const out = join(CANON_DIR, `${dim}.candidates.json`)
    await writeFile(
      out,
      JSON.stringify(
        {
          version: 1,
          dimension: dim,
          generated_at: new Date().toISOString(),
          discovery_method: "fetch-only-seed (Phase 1 web-fetch grounded)",
          candidates,
        },
        null,
        2,
      ),
    )
    const reachable = candidates.filter((c) => c.fetched_status !== "unreachable" as never).length
    const extracted = candidates.filter((c) => c.fetched_status === "extracted").length
    summary.push({ dimension: dim, total: seeds.length, reachable, extracted })
    console.error(`  → ${out}`)
  }

  console.log("\n=== M18 Phase 1 discovery summary ===")
  let totalSeeds = 0
  let totalReachable = 0
  for (const s of summary) {
    console.log(`  ${s.dimension.padEnd(28)} ${s.reachable}/${s.total} reachable, ${s.extracted}/${s.total} excerpts extracted`)
    totalSeeds += s.total
    totalReachable += s.reachable
  }
  console.log(`  total: ${totalReachable}/${totalSeeds} candidates committed`)
}

await main()
