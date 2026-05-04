export type ClaimShape = "verified" | "fetched-fact" | "recommendation" | "assumption" | "unsupported"

export interface ClaimTag {
  text: string
  shape: ClaimShape
  reason: string
}

export function tagClaimShapes(output: string): ClaimTag[] {
  return output
    .split(/(?<=[.!?])\s+/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => {
      const lower = text.toLowerCase()
      if (/\b(test|validated|verified|receipt|passed|committed)\b/.test(lower)) return { text, shape: "verified" as const, reason: "mentions test, receipt, validation, or commit evidence" }
      if (/\b(fetched|source|url|citation|according to|wcag|arxiv|nist|w3c)\b/.test(lower)) return { text, shape: "fetched-fact" as const, reason: "mentions external source or citation marker" }
      if (/\b(should|recommend|prefer|consider|use|avoid)\b/.test(lower)) return { text, shape: "recommendation" as const, reason: "normative recommendation language" }
      if (/\b(assume|likely|probably|may|might|unverified)\b/.test(lower)) return { text, shape: "assumption" as const, reason: "explicit uncertainty or assumption language" }
      return { text, shape: "unsupported" as const, reason: "no witness or recommendation marker detected" }
    })
}

export function buildClaimShapeReport(output: string): string {
  const tags = tagClaimShapes(output)
  const unsupported = tags.filter((tag) => tag.shape === "unsupported").length
  const assumptions = tags.filter((tag) => tag.shape === "assumption").length
  return `claim-shape: ${tags.length} sentence(s), ${unsupported} unsupported, ${assumptions} assumption(s)`
}
