import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "bun:test"
import { CHEAPCODE_MODEL_IDS, ensureCheapcodeDefaults } from "./default-config"

function tempConfigPath() {
  return join(mkdtempSync(join(tmpdir(), "cheapcode-default-config-")), "opencode.json")
}

test("creates cheapcode provider and MCP defaults when config is missing", () => {
  const path = tempConfigPath()
  const result = ensureCheapcodeDefaults({
    opencodeConfigPath: path,
    cheapcodeRoot: "/repo/cheapcode",
    accountsMcpCommand: "/repo/cheapcode/bin/cheapcode-accounts-mcp",
  })

  const config = JSON.parse(readFileSync(path, "utf-8"))
  expect(result).toEqual({ changed: true, created: true, providerAdded: true, mcpAdded: true })
  expect(config.provider.cheapcode.npm).toBe("/repo/cheapcode")
  expect(Object.keys(config.provider.cheapcode.models).sort()).toEqual([...CHEAPCODE_MODEL_IDS].sort())
  expect(config.mcp["cheapcode-accounts"].command).toEqual(["/repo/cheapcode/bin/cheapcode-accounts-mcp"])
})

test("adds cheapcode defaults without overwriting existing provider config", () => {
  const path = tempConfigPath()
  writeFileSync(path, JSON.stringify({ provider: { openai: { name: "OpenAI" } }, mcp: { mizan: { type: "local" } } }))

  const result = ensureCheapcodeDefaults({
    opencodeConfigPath: path,
    cheapcodeRoot: "/repo/cheapcode",
    accountsMcpCommand: "/repo/cheapcode/bin/cheapcode-accounts-mcp",
  })

  const config = JSON.parse(readFileSync(path, "utf-8"))
  expect(result).toEqual({ changed: true, created: false, providerAdded: true, mcpAdded: true })
  expect(config.provider.openai).toEqual({ name: "OpenAI" })
  expect(config.mcp.mizan).toEqual({ type: "local" })
  expect(config.provider.cheapcode).toBeDefined()
})

test("does not overwrite an existing cheapcode provider", () => {
  const path = tempConfigPath()
  writeFileSync(path, JSON.stringify({ provider: { cheapcode: { npm: "/custom", models: {} } }, mcp: { "cheapcode-accounts": { command: ["custom"] } } }))

  const result = ensureCheapcodeDefaults({
    opencodeConfigPath: path,
    cheapcodeRoot: "/repo/cheapcode",
    accountsMcpCommand: "/repo/cheapcode/bin/cheapcode-accounts-mcp",
  })

  const config = JSON.parse(readFileSync(path, "utf-8"))
  expect(result).toEqual({ changed: false, created: false, providerAdded: false, mcpAdded: false })
  expect(config.provider.cheapcode.npm).toBe("/custom")
  expect(config.mcp["cheapcode-accounts"].command).toEqual(["custom"])
})
