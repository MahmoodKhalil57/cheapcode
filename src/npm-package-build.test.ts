import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"

const script = () => readFileSync("script/build-npm-package.ts", "utf-8")
const pkg = () => JSON.parse(readFileSync("package.json", "utf-8"))

test("package exposes npm release build script", () => {
  expect(pkg().scripts["build:npm"]).toBe("bun script/build-npm-package.ts")
})

test("npm package builder emits node bin entries and provider export", () => {
  const text = script()
  expect(text).toContain('"cheapcode-accounts-mcp"')
  expect(text).toContain('"--target=node"')
  expect(text).toContain('name: "cheapcode-ai"')
  expect(text).toContain('main: "./dist/cheapcode-tiers.js"')
  expect(text).toContain('engines:')
  expect(text).toContain('node: ">=22"')
})
