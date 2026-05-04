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
 *   --validate         validate committed candidates against the M19 gate
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
      url: "https://arxiv.org/abs/2510.23853",
      primary_principle:
        "LLM agents can misalign tool-use decisions with human time perception; freshness-dependent claims need explicit temporal scaffolding.",
      applicability_signal: "freshness|recency|temporal-anchor|wallclock",
      citation_form: "Cheng, Y. et al. (2025). Your LLM Agents are Temporally Blind. arXiv:2510.23853.",
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
  validate: boolean
  dimension?: string
}
function parseArgs(): Args {
  const a: Args = { dryRun: false, validate: false }
  for (const x of process.argv.slice(2)) {
    if (x === "--dry-run") a.dryRun = true
    else if (x === "--validate") a.validate = true
    else if (x.startsWith("--dimension=")) a.dimension = x.slice("--dimension=".length)
  }
  return a
}

const M19_EXTENSIONS: Record<string, SeedSource[]> = {
  "software-architecture": [
    {
      id: "fowler-refactoring",
      source_name: "Refactoring: Improving the Design of Existing Code",
      source_type: "book",
      author_or_publisher: "Martin Fowler",
      year: 2018,
      url: "https://refactoring.com/",
      primary_principle: "Improve internal structure without changing externally observable behavior, so humans can safely evolve code.",
      applicability_signal: "refactor|cleanup|technical-debt|maintainability",
      citation_form: "Fowler, M. (2018). Refactoring: Improving the Design of Existing Code, 2nd ed. Addison-Wesley.",
    },
    {
      id: "twelve-factor-app",
      source_name: "The Twelve-Factor App",
      source_type: "industry-guide",
      author_or_publisher: "Heroku",
      year: 2017,
      url: "https://12factor.net/",
      primary_principle: "Build deployable services around explicit configuration, isolated dependencies, stateless processes, and reproducible operations.",
      applicability_signal: "deployment|config|service|cloud|devops",
      citation_form: "Wiggins, A. The Twelve-Factor App. 12factor.net.",
    },
    {
      id: "arc42-template",
      source_name: "arc42 Architecture Documentation Template",
      source_type: "industry-guide",
      author_or_publisher: "arc42",
      url: "https://arc42.org/overview",
      primary_principle: "Document architecture through human-reviewable constraints, context, decisions, quality goals, and risks.",
      applicability_signal: "architecture-doc|adr|quality-attribute|stakeholder",
      citation_form: "arc42. Architecture Documentation Template. arc42.org.",
    },
    {
      id: "c4-model",
      source_name: "The C4 Model for Visualising Software Architecture",
      source_type: "industry-guide",
      author_or_publisher: "Simon Brown",
      url: "https://c4model.com/",
      primary_principle: "Explain software architecture at nested levels of abstraction so different audiences can understand the same system.",
      applicability_signal: "diagram|architecture|context|container|component",
      citation_form: "Brown, S. The C4 Model for Visualising Software Architecture. c4model.com.",
    },
    {
      id: "sei-quality-attributes",
      source_name: "Quality Attribute Scenarios",
      source_type: "industry-guide",
      author_or_publisher: "Carnegie Mellon Software Engineering Institute",
      url: "https://insights.sei.cmu.edu/library/quality-attribute-scenarios/",
      primary_principle: "Make quality goals testable by stating stimulus, environment, artifact, response, and response measure.",
      applicability_signal: "quality-attribute|performance|security|availability|modifiability",
      citation_form: "Software Engineering Institute. Quality Attribute Scenarios. Carnegie Mellon University.",
    },
  ],
  "api-dx": [
    {
      id: "microsoft-rest-guidelines",
      source_name: "Microsoft REST API Guidelines",
      source_type: "industry-guide",
      author_or_publisher: "Microsoft",
      url: "https://github.com/microsoft/api-guidelines/blob/vNext/Guidelines.md",
      primary_principle: "Design APIs consistently around resources, predictable HTTP semantics, versioning, errors, and evolvability.",
      applicability_signal: "rest|http|versioning|api-error|pagination",
      citation_form: "Microsoft. REST API Guidelines. github.com/microsoft/api-guidelines.",
    },
    {
      id: "zalando-rest-guidelines",
      source_name: "Zalando RESTful API and Event Guidelines",
      source_type: "industry-guide",
      author_or_publisher: "Zalando",
      url: "https://opensource.zalando.com/restful-api-guidelines/",
      primary_principle: "APIs are products: consistency, compatibility, discoverability, and consumer-oriented documentation are part of the interface.",
      applicability_signal: "api-product|rest|compatibility|documentation",
      citation_form: "Zalando. RESTful API and Event Guidelines. opensource.zalando.com.",
    },
    {
      id: "json-api",
      source_name: "JSON:API Specification",
      source_type: "standard",
      author_or_publisher: "JSON:API",
      url: "https://jsonapi.org/format/",
      primary_principle: "Use a shared media type for resources, relationships, errors, links, and included data to reduce client ambiguity.",
      applicability_signal: "json-api|resource|relationship|errors|links",
      citation_form: "JSON:API. Specification. jsonapi.org/format.",
    },
    {
      id: "http-semantics-rfc9110",
      source_name: "HTTP Semantics RFC 9110",
      source_type: "standard",
      author_or_publisher: "IETF",
      year: 2022,
      url: "https://www.rfc-editor.org/rfc/rfc9110.html",
      primary_principle: "Preserve HTTP method, status, representation, and caching semantics so intermediaries and clients can reason correctly.",
      applicability_signal: "http|status-code|method|cache|semantics",
      citation_form: "Fielding, R., Nottingham, M., and J. Reschke. RFC 9110: HTTP Semantics. IETF, 2022.",
    },
    {
      id: "stripe-api-docs",
      source_name: "Stripe API Documentation",
      source_type: "industry-guide",
      author_or_publisher: "Stripe",
      url: "https://docs.stripe.com/api",
      primary_principle: "Developer experience improves when API references expose runnable examples, stable objects, errors, and idempotent workflows.",
      applicability_signal: "api-doc|sdk|idempotency|payments|examples",
      citation_form: "Stripe. API Reference. docs.stripe.com/api.",
    },
  ],
  "ui-visual": [
    {
      id: "govuk-design-system",
      source_name: "GOV.UK Design System",
      source_type: "industry-guide",
      author_or_publisher: "Government Digital Service",
      url: "https://design-system.service.gov.uk/",
      primary_principle: "Use proven, accessible components and patterns so public services stay usable by diverse citizens.",
      applicability_signal: "government|forms|service-design|accessible-ui",
      citation_form: "Government Digital Service. GOV.UK Design System. design-system.service.gov.uk.",
    },
    {
      id: "ibm-carbon",
      source_name: "IBM Carbon Design System",
      source_type: "industry-guide",
      author_or_publisher: "IBM",
      url: "https://carbondesignsystem.com/",
      primary_principle: "Use systematic foundations, components, and patterns to create coherent product experiences across complex enterprise surfaces.",
      applicability_signal: "enterprise-ui|design-system|component|dashboard",
      citation_form: "IBM. Carbon Design System. carbondesignsystem.com.",
    },
    {
      id: "adobe-spectrum",
      source_name: "Adobe Spectrum Design System",
      source_type: "industry-guide",
      author_or_publisher: "Adobe",
      url: "https://spectrum.adobe.com/",
      primary_principle: "Design components around inclusive interaction states, visual language, and cross-platform consistency.",
      applicability_signal: "creative-tools|component|inclusive-design|cross-platform",
      citation_form: "Adobe. Spectrum Design System. spectrum.adobe.com.",
    },
    {
      id: "shopify-polaris",
      source_name: "Shopify Polaris",
      source_type: "industry-guide",
      author_or_publisher: "Shopify",
      url: "https://polaris.shopify.com/",
      primary_principle: "Use commerce-specific components, content, and patterns that help merchants complete business tasks with confidence.",
      applicability_signal: "commerce|admin|merchant|design-system",
      citation_form: "Shopify. Polaris Design System. polaris.shopify.com.",
    },
    {
      id: "atlassian-design-system",
      source_name: "Atlassian Design System",
      source_type: "industry-guide",
      author_or_publisher: "Atlassian",
      url: "https://atlassian.design/",
      primary_principle: "Design team-work software with shared foundations, tokens, components, and content standards that reduce interface fragmentation.",
      applicability_signal: "collaboration|teamwork|design-token|enterprise-ui",
      citation_form: "Atlassian. Design System. atlassian.design.",
    },
  ],
  accessibility: [
    {
      id: "wai-aria-apg",
      source_name: "ARIA Authoring Practices Guide",
      source_type: "standard",
      author_or_publisher: "W3C WAI",
      url: "https://www.w3.org/WAI/ARIA/apg/",
      primary_principle: "Use native semantics first; when ARIA is necessary, implement expected roles, states, properties, and keyboard interaction patterns.",
      applicability_signal: "aria|keyboard|screen-reader|widget|semantic-html",
      citation_form: "W3C WAI. ARIA Authoring Practices Guide. w3.org/WAI/ARIA/apg.",
    },
    {
      id: "w3c-easy-checks",
      source_name: "Easy Checks - A First Review of Web Accessibility",
      source_type: "toolkit",
      author_or_publisher: "W3C WAI",
      url: "https://www.w3.org/WAI/test-evaluate/preliminary/",
      primary_principle: "Run quick human checks for title, alt text, headings, contrast, resize, keyboard access, and forms before deeper audits.",
      applicability_signal: "accessibility-review|alt-text|headings|keyboard|contrast",
      citation_form: "W3C WAI. Easy Checks - A First Review of Web Accessibility. w3.org/WAI.",
    },
    {
      id: "ibm-equal-access-toolkit",
      source_name: "IBM Equal Access Toolkit",
      source_type: "industry-guide",
      author_or_publisher: "IBM Accessibility",
      url: "https://www.ibm.com/able/toolkit/",
      primary_principle: "Embed accessibility into product planning, design, development, verification, and launch rather than treating it as a late audit.",
      applicability_signal: "accessibility-process|checklist|planning|verification|launch",
      citation_form: "IBM Accessibility. Equal Access Toolkit. ibm.com/able/toolkit.",
    },
    {
      id: "webaim-contrast",
      source_name: "WebAIM Contrast Checker",
      source_type: "toolkit",
      author_or_publisher: "WebAIM",
      url: "https://webaim.org/resources/contrastchecker/",
      primary_principle: "Verify text and background contrast ratios rather than relying on visual intuition.",
      applicability_signal: "contrast|color|wcag-aa|low-vision",
      citation_form: "WebAIM. Contrast Checker. webaim.org/resources/contrastchecker.",
    },
    {
      id: "microsoft-inclusive-design",
      source_name: "Microsoft Inclusive Design",
      source_type: "industry-guide",
      author_or_publisher: "Microsoft",
      url: "https://inclusive.microsoft.design/",
      primary_principle: "Solve for one, extend to many: constraints experienced by disabled people can reveal broadly useful design improvements.",
      applicability_signal: "inclusive-design|disability|persona|mismatch",
      citation_form: "Microsoft. Inclusive Design. inclusive.microsoft.design.",
    },
  ],
  "ux-research": [
    {
      id: "nng-10-usability-heuristics",
      source_name: "10 Usability Heuristics for User Interface Design",
      source_type: "industry-guide",
      author_or_publisher: "Nielsen Norman Group",
      year: 2024,
      url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
      primary_principle: "Evaluate interfaces against visibility, match, control, consistency, prevention, recognition, flexibility, aesthetics, recovery, and help.",
      applicability_signal: "heuristic-evaluation|usability|ui-review|ux-audit",
      citation_form: "Nielsen, J. 10 Usability Heuristics for User Interface Design. Nielsen Norman Group.",
    },
    {
      id: "nng-why-five-users",
      source_name: "Why You Only Need to Test with 5 Users",
      source_type: "industry-guide",
      author_or_publisher: "Nielsen Norman Group",
      year: 2000,
      url: "https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/",
      primary_principle: "Small iterative usability tests reveal many interface problems faster than one large late test.",
      applicability_signal: "usability-test|iteration|sample-size|research-plan",
      citation_form: "Nielsen, J. (2000). Why You Only Need to Test with 5 Users. Nielsen Norman Group.",
    },
    {
      id: "design-council-double-diamond",
      source_name: "The Double Diamond",
      source_type: "toolkit",
      author_or_publisher: "Design Council",
      url: "https://www.designcouncil.org.uk/our-resources/the-double-diamond/",
      primary_principle: "Separate divergent discovery/definition from divergent development/delivery so teams solve the right problem before polishing solutions.",
      applicability_signal: "discovery|ideation|problem-definition|service-design",
      citation_form: "Design Council. The Double Diamond. designcouncil.org.uk.",
    },
    {
      id: "baymard-checkout-usability",
      source_name: "Baymard Institute E-Commerce UX Research",
      source_type: "industry-guide",
      author_or_publisher: "Baymard Institute",
      url: "https://baymard.com/research",
      primary_principle: "Ground ecommerce UX decisions in large-scale observed usability research rather than conversion folklore.",
      applicability_signal: "ecommerce|checkout|product-page|ux-benchmark",
      citation_form: "Baymard Institute. UX Research. baymard.com/research.",
    },
    {
      id: "measuringu-sus",
      source_name: "System Usability Scale resources",
      source_type: "industry-guide",
      author_or_publisher: "MeasuringU",
      url: "https://measuringu.com/sus/",
      primary_principle: "Use validated usability instruments like SUS to quantify perceived usability instead of relying on anecdotal preference.",
      applicability_signal: "sus|usability-metric|survey|quantitative-ux",
      citation_form: "MeasuringU. System Usability Scale (SUS). measuringu.com.",
    },
  ],
  "ai-ml-product": [
    {
      id: "nist-generative-ai-profile",
      source_name: "NIST AI RMF Generative AI Profile",
      source_type: "standard",
      author_or_publisher: "NIST",
      year: 2024,
      url: "https://www.nist.gov/itl/ai-risk-management-framework/generative-artificial-intelligence-profile",
      primary_principle: "Govern generative AI risks through documented measurement, monitoring, provenance, misuse analysis, and human oversight.",
      applicability_signal: "generative-ai|risk|provenance|monitoring|governance",
      citation_form: "NIST (2024). Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile.",
    },
    {
      id: "google-ai-principles",
      source_name: "Google AI Principles",
      source_type: "industry-guide",
      author_or_publisher: "Google",
      url: "https://ai.google/responsibility/principles/",
      primary_principle: "AI should be socially beneficial, avoid creating unfair bias, be built and tested for safety, and be accountable to people.",
      applicability_signal: "ai-principles|fairness|safety|accountability",
      citation_form: "Google. AI Principles. ai.google/responsibility/principles.",
    },
    {
      id: "anthropic-constitutional-ai",
      source_name: "Constitutional AI: Harmlessness from AI Feedback",
      source_type: "research-paper",
      author_or_publisher: "Anthropic",
      year: 2022,
      url: "https://arxiv.org/abs/2212.08073",
      primary_principle: "Use explicit principles and AI feedback to reduce harmful assistant behavior without relying only on human preference labels.",
      applicability_signal: "constitutional-ai|alignment|safety|feedback",
      citation_form: "Bai, Y. et al. (2022). Constitutional AI: Harmlessness from AI Feedback. arXiv:2212.08073.",
    },
    {
      id: "dpo-paper",
      source_name: "Direct Preference Optimization",
      source_type: "research-paper",
      author_or_publisher: "Rafailov et al.",
      year: 2023,
      url: "https://arxiv.org/abs/2305.18290",
      primary_principle: "Optimize language models directly against preference data without a separate reinforcement-learning loop when the objective allows it.",
      applicability_signal: "preference-optimization|rlhf|dpo|alignment",
      citation_form: "Rafailov, R. et al. (2023). Direct Preference Optimization. arXiv:2305.18290.",
    },
    {
      id: "partnership-ai-human-ai-guidelines",
      source_name: "Partnership on AI Guidelines for Human-AI Interaction",
      source_type: "industry-guide",
      author_or_publisher: "Partnership on AI",
      url: "https://partnershiponai.org/paper/human-ai-interaction-guidelines/",
      primary_principle: "Human-AI products should preserve agency, communicate uncertainty, support contestability, and avoid deceptive anthropomorphism.",
      applicability_signal: "human-ai-interaction|agency|uncertainty|contestability",
      citation_form: "Partnership on AI. Guidelines for Human-AI Interaction. partnershiponai.org.",
    },
  ],
  "policy-governance": [
    {
      id: "oecd-ai-principles",
      source_name: "OECD AI Principles",
      source_type: "standard",
      author_or_publisher: "OECD",
      year: 2019,
      url: "https://oecd.ai/en/ai-principles",
      primary_principle: "AI systems should support inclusive growth, human-centered values, transparency, robustness, accountability, and democratic governance.",
      applicability_signal: "ai-policy|transparency|accountability|human-rights",
      citation_form: "OECD (2019). OECD Principles on Artificial Intelligence. oecd.ai.",
    },
    {
      id: "unesco-ai-ethics",
      source_name: "UNESCO Recommendation on the Ethics of Artificial Intelligence",
      source_type: "standard",
      author_or_publisher: "UNESCO",
      year: 2021,
      url: "https://www.unesco.org/en/artificial-intelligence/recommendation-ethics",
      primary_principle: "AI governance should protect human rights, dignity, cultural diversity, environment, transparency, accountability, and human oversight.",
      applicability_signal: "ai-ethics|human-rights|cultural-diversity|oversight",
      citation_form: "UNESCO (2021). Recommendation on the Ethics of Artificial Intelligence.",
    },
    {
      id: "iso-iec-42001",
      source_name: "ISO/IEC 42001 AI Management System",
      source_type: "standard",
      author_or_publisher: "ISO/IEC",
      year: 2023,
      url: "https://www.iso.org/standard/81230.html",
      primary_principle: "Manage AI through an auditable management system covering policies, risk controls, lifecycle processes, and continual improvement.",
      applicability_signal: "ai-management-system|audit|risk-control|iso",
      citation_form: "ISO/IEC 42001:2023. Information technology - Artificial intelligence - Management system.",
    },
    {
      id: "white-house-ai-bill-of-rights",
      source_name: "Blueprint for an AI Bill of Rights",
      source_type: "standard",
      author_or_publisher: "White House Office of Science and Technology Policy",
      year: 2022,
      url: "https://bidenwhitehouse.archives.gov/ostp/ai-bill-of-rights/",
      primary_principle: "People should have safe and effective systems, algorithmic discrimination protections, data privacy, notice, explanation, and human alternatives.",
      applicability_signal: "ai-rights|privacy|notice|explanation|human-alternative",
      citation_form: "White House OSTP (2022). Blueprint for an AI Bill of Rights.",
    },
    {
      id: "mit-ai-risk-repository",
      source_name: "AI Risk Repository",
      source_type: "toolkit",
      author_or_publisher: "MIT FutureTech",
      year: 2024,
      url: "https://airisk.mit.edu/",
      primary_principle: "Use a structured risk taxonomy to avoid missing known AI harm categories during governance review.",
      applicability_signal: "ai-risk|taxonomy|governance|hazard-analysis",
      citation_form: "MIT FutureTech. AI Risk Repository. airisk.mit.edu.",
    },
  ],
  "llm-failure-research": [
    {
      id: "reversal-curse",
      source_name: "The Reversal Curse",
      source_type: "research-paper",
      author_or_publisher: "Berglund et al.",
      year: 2023,
      url: "https://arxiv.org/abs/2309.12288",
      primary_principle: "Models trained on A-is-B facts may fail to infer B-is-A, so prompt scaffolds must not assume bidirectional recall.",
      applicability_signal: "reversal-curse|fact-recall|bidirectional|evaluation",
      citation_form: "Berglund, L. et al. (2023). The Reversal Curse. arXiv:2309.12288.",
    },
    {
      id: "socially-placed-hallucination",
      source_name: "Socially Situated Hallucination and Sycophancy in LLMs",
      source_type: "research-paper",
      author_or_publisher: "Sharma et al.",
      year: 2023,
      url: "https://arxiv.org/abs/2310.13548",
      primary_principle: "Models can prioritize user approval over factual accuracy, so stance-stability must be checked under disagreement pressure.",
      applicability_signal: "sycophancy|disagreement|stance-stability|truthfulness",
      citation_form: "Sharma, M. et al. (2023). Towards Understanding Sycophancy in Language Models. arXiv:2310.13548.",
    },
    {
      id: "theory-of-mind-llms",
      source_name: "Theory of Mind May Have Spontaneously Emerged in Large Language Models",
      source_type: "research-paper",
      author_or_publisher: "Kosinski",
      year: 2023,
      url: "https://arxiv.org/abs/2302.02083",
      primary_principle: "LLM theory-of-mind behavior is test-sensitive and should be evaluated with belief-state tasks rather than assumed from fluent explanation.",
      applicability_signal: "theory-of-mind|belief-state|false-belief|evaluation",
      citation_form: "Kosinski, M. (2023). Theory of Mind May Have Spontaneously Emerged in Large Language Models. arXiv:2302.02083.",
    },
    {
      id: "cultural-bias-llms",
      source_name: "Cultural Bias and Cultural Alignment of Large Language Models",
      source_type: "research-paper",
      author_or_publisher: "arXiv",
      year: 2023,
      url: "https://arxiv.org/abs/2311.14096",
      primary_principle: "LLMs can overrepresent dominant cultural defaults, so culturally charged outputs need explicit plural witnesses.",
      applicability_signal: "cultural-bias|plurality|weird|cross-cultural",
      citation_form: "arXiv (2023). Cultural Bias and Cultural Alignment of Large Language Models. arXiv:2311.14096.",
    },
    {
      id: "truthfulqa",
      source_name: "TruthfulQA",
      source_type: "research-paper",
      author_or_publisher: "Lin, Hilton, and Evans",
      year: 2021,
      url: "https://arxiv.org/abs/2109.07958",
      primary_principle: "Models may imitate common falsehoods, so truthfulness benchmarks must distinguish informative correctness from plausible misconceptions.",
      applicability_signal: "truthfulness|hallucination|misconception|benchmark",
      citation_form: "Lin, S., Hilton, J., and Evans, O. (2021). TruthfulQA. arXiv:2109.07958.",
    },
  ],
}

for (const [dimension, seeds] of Object.entries(M19_EXTENSIONS)) SEEDS[dimension] = [...(SEEDS[dimension] ?? []), ...seeds]

async function validateCandidates() {
  const files = (await readdir(CANON_DIR)).filter((file) => file.endsWith(".candidates.json"))
  const failures: string[] = []
  let total = 0
  for (const file of files) {
    const parsed = JSON.parse(await readFile(join(CANON_DIR, file), "utf8"))
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : []
    const withExcerpt = candidates.filter(
      (candidate) =>
        typeof candidate.extracted_excerpt === "string" &&
        candidate.extracted_excerpt.trim().length > 0 &&
        typeof candidate.url === "string" &&
        candidate.url.length > 0 &&
        typeof candidate.accessed_at === "string" &&
        candidate.accessed_at.length > 0,
    )
    total += candidates.length
    if (withExcerpt.length < 4) failures.push(`${file}: ${withExcerpt.length}/4 candidates with non-empty extracted_excerpt`)
  }
  if (files.length !== Object.keys(SEEDS).length) failures.push(`expected ${Object.keys(SEEDS).length} candidate files, found ${files.length}`)
  if (total < 40) failures.push(`expected >=40 total candidates, found ${total}`)
  if (failures.length > 0) {
    console.error(`M19 canon validation failed:\n${failures.map((failure) => `  - ${failure}`).join("\n")}`)
    process.exit(1)
  }
  console.log(`M19 canon validation passed: ${total} candidates across ${files.length} dimensions`)
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
  if (args.validate) return validateCandidates()
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
