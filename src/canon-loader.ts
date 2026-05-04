import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

export type CanonGrade = "sahih" | "hasan" | "daif"

export interface CanonEntry {
  id: string
  dimension: string
  source_name: string
  source_type: string
  author_or_publisher: string
  year?: number
  url: string
  accessed_at: string
  primary_principle: string
  applicability_signal: string
  citation_form: string
  operator_verified: boolean
  mizan_grade: CanonGrade
  evidence_tier?: string
  extracted_excerpt?: string
}

const GRADE_RANK: Record<CanonGrade, number> = { daif: 0, hasan: 1, sahih: 2 }

function isCanonEntry(value: unknown): value is CanonEntry {
  const candidate = value as Partial<CanonEntry>
  return typeof candidate.id === "string"
    && typeof candidate.dimension === "string"
    && typeof candidate.source_name === "string"
    && typeof candidate.url === "string"
    && typeof candidate.primary_principle === "string"
    && typeof candidate.applicability_signal === "string"
    && (candidate.mizan_grade === "sahih" || candidate.mizan_grade === "hasan" || candidate.mizan_grade === "daif")
}

export function loadCanon(planDir: string): Map<string, CanonEntry[]> {
  const out = new Map<string, CanonEntry[]>()
  if (!existsSync(planDir)) return out
  for (const file of readdirSync(planDir).filter((entry) => entry.endsWith(".verified.json") || entry.endsWith(".candidates.json"))) {
    try {
      const parsed = JSON.parse(readFileSync(join(planDir, file), "utf8"))
      const entries = Array.isArray(parsed.candidates) ? parsed.candidates : Array.isArray(parsed.entries) ? parsed.entries : []
      for (const entry of entries.filter(isCanonEntry)) {
        out.set(entry.dimension, [...(out.get(entry.dimension) ?? []), entry])
      }
    } catch {
      // Fail soft: missing or malformed canon should not block dispatch.
    }
  }
  return out
}

export function filterByGrade(canon: Map<string, CanonEntry[]>, minGrade: "sahih" | "hasan" = "hasan"): Map<string, CanonEntry[]> {
  const out = new Map<string, CanonEntry[]>()
  for (const [dimension, entries] of canon) {
    const filtered = entries.filter((entry) => GRADE_RANK[entry.mizan_grade] >= GRADE_RANK[minGrade])
    if (filtered.length > 0) out.set(dimension, filtered)
  }
  return out
}
