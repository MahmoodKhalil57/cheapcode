import { readFileSync } from "node:fs"
import { expect, test } from "bun:test"

const formula = () => readFileSync("Formula/cheapcode.rb", "utf-8")
const cheapcodeCli = () => readFileSync("bin/cheapcode", "utf-8")
const accountsCli = () => readFileSync("bin/cheapcode-accounts", "utf-8")

test("Homebrew formula installs cheapcode and opencode under libexec", () => {
  const text = formula()
  expect(text).toContain('depends_on "bun"')
  expect(text).toContain('depends_on "ripgrep"')
  expect(text).toContain('libexec.install Dir["*"]')
  expect(text).toContain('resource("opencode").stage do')
  expect(text).toContain('(libexec/"opencode").install Dir["*"]')
  expect(text).toContain('system "bun", "install"')
  expect(text).toContain('system "bun", "run", "--cwd", "packages/app", "build"')
})

test("Homebrew formula exposes wrapper bins instead of ~/.cheapcode symlinks", () => {
  const text = formula()
  expect(text).toContain('write_homebrew_wrapper')
  expect(text).toContain('export CHEAPCODE_OPENCODE="#{libexec}/opencode"')
  expect(text).toContain('export CHEAPCODE_HOMEBREW="1"')
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
