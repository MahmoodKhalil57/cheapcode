import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

type JsonObject = Record<string, any>

export const CHEAPCODE_MODEL_IDS = ["cheap", "cheap-fast", "smart", "smart-fast", "auto", "local"] as const

export function cheapcodeProviderConfig(cheapcodeRoot: string) {
  return {
    npm: cheapcodeRoot,
    name: "cheapcode tiers",
    options: { apiKey: "{env:OPENROUTER_API_KEY}" },
    models: {
      cheap: { name: "cheap", tools: true },
      "cheap-fast": { name: "cheap-fast", tools: true },
      smart: { name: "smart", tools: true },
      "smart-fast": { name: "smart-fast", tools: true },
      auto: { name: "auto", tools: true },
      local: { name: "local", tools: true },
    },
  }
}

export function ensureCheapcodeDefaults(input: {
  opencodeConfigPath: string
  cheapcodeRoot: string
  accountsMcpCommand: string
}): { changed: boolean; created: boolean; providerAdded: boolean; mcpAdded: boolean } {
  const created = !existsSync(input.opencodeConfigPath)
  const config: JsonObject = created ? { $schema: "https://opencode.ai/config.json" } : JSON.parse(readFileSync(input.opencodeConfigPath, "utf-8"))
  let changed = created
  let providerAdded = false
  let mcpAdded = false

  config.provider ??= {}
  if (!config.provider.cheapcode) {
    config.provider.cheapcode = cheapcodeProviderConfig(input.cheapcodeRoot)
    changed = true
    providerAdded = true
  }

  config.mcp ??= {}
  if (!config.mcp["cheapcode-accounts"]) {
    config.mcp["cheapcode-accounts"] = {
      type: "local",
      command: [input.accountsMcpCommand],
    }
    changed = true
    mcpAdded = true
  }

  if (changed) {
    mkdirSync(dirname(input.opencodeConfigPath), { recursive: true })
    writeFileSync(input.opencodeConfigPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  }

  return { changed, created, providerAdded, mcpAdded }
}
