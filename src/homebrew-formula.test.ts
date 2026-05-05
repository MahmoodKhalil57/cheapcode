import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"

const formula = () => readFileSync("Formula/cheapcode.rb", "utf-8")
const cheapcodeCli = () => readFileSync("bin/cheapcode", "utf-8")
const accountsCli = () => readFileSync("bin/cheapcode-accounts", "utf-8")

test("Homebrew formula installs cheapcode and opencode under libexec", () => {
  const text = formula()
  expect(text).toContain('depends_on "node"')
  expect(text).toContain('depends_on "ripgrep"')
  expect(text).toContain('depends_on "bun" => :build')
  expect(text).toContain('system "bun", "run", "build:npm"')
  expect(text).toContain('resource("opencode").stage do')
  expect(text).toContain('system "bun", "run", "--cwd", "packages/opencode", "build", "--single"')
  expect(text).toContain('system "npm", "install", *std_npm_args')
})

test("Homebrew formula exposes wrapper bins instead of ~/.cheapcode symlinks", () => {
  const text = formula()
  expect(text).toContain('write_homebrew_wrapper')
  expect(text).toContain('export CHEAPCODE_OPENCODE_BIN="#{libexec}/opencode-bin/opencode"')
  expect(text).toContain('export CHEAPCODE_HOMEBREW="1"')
  expect(text).toContain('Formula["node"].opt_bin')
  expect(text).not.toContain('Formula["bun"].opt_bin')
  expect(text).not.toContain(".cheapcode/bin")
  expect(text).not.toContain("install.sh")
})

test("Homebrew formula has clean uninstall/zap boundaries", () => {
  const text = formula()
  expect(text).toContain("def caveats")
  expect(text).toContain("zap trash:")
  expect(text).toContain('"~/.config/cheapcode"')
  expect(text).toContain('"~/.local/share/cheapcode"')
})

test("accounts login delegates through cheapcode when running from Homebrew", () => {
  const text = accountsCli()
  expect(text).toContain('process.env.CHEAPCODE_OPENCODE ? "cheapcode" : "opencode"')
})

test("cheapcode update defers to Homebrew when installed by brew", () => {
  const text = cheapcodeCli()
  expect(text).toContain('process.env.CHEAPCODE_HOMEBREW === "1"')
  expect(text).toContain("brew upgrade cheapcode")
  expect(text).toContain("brew reinstall --HEAD cheapcode")
})

test("CLI root detection recognizes npm package name", () => {
  const text = cheapcodeCli()
  expect(text).toContain('pkg.name === "@cheapcode/ai-sdk-provider" || pkg.name === "cheapcode-ai"')
})

test("CLI can run a packaged opencode binary without Bun", () => {
  const text = cheapcodeCli()
  expect(text).toContain("const OPENCODE_BIN = process.env.CHEAPCODE_OPENCODE_BIN")
  expect(text).toContain("return spawn(OPENCODE_BIN, args")
})
