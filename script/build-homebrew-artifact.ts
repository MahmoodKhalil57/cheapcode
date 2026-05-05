#!/usr/bin/env bun
import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = await Bun.file(join(root, "package.json")).json()
const version = pkg.version as string
const outRoot = join(root, ".release", "homebrew")
const stage = join(outRoot, "stage")

const platform = process.platform === "darwin" ? "darwin" : process.platform === "linux" ? "linux" : process.platform
const arch = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : process.arch
const artifact = `cheapcode-${version}-${platform}-${arch}.tar.gz`

function run(cmd: string[], cwd = root) {
  const proc = Bun.spawnSync(cmd, { cwd, stdout: "inherit", stderr: "inherit" })
  if (!proc.success) process.exit(proc.exitCode || 1)
}

function findOpencodeBinary() {
  const explicit = process.env.CHEAPCODE_OPENCODE_BIN
  if (explicit && existsSync(explicit)) return explicit
  const fork = process.env.CHEAPCODE_OPENCODE ?? join(process.env.HOME ?? "", ".cheapcode", "opencode")
  const candidates = new Bun.Glob("packages/opencode/dist/opencode-*/bin/opencode").scanSync({ cwd: fork })
  const found = [...candidates][0]
  return found ? join(fork, found) : undefined
}

run(["bun", "run", "build:npm"])

const opencodeBinary = findOpencodeBinary()
if (!opencodeBinary) {
  console.error("opencode binary missing. Build it first, e.g.:")
  console.error("  bun run --cwd ~/.cheapcode/opencode/packages/opencode build --single --skip-install")
  process.exit(1)
}

rmSync(stage, { recursive: true, force: true })
mkdirSync(join(stage, "lib", "node_modules"), { recursive: true })
mkdirSync(join(stage, "opencode-bin"), { recursive: true })

cpSync(join(root, ".release", "npm"), join(stage, "lib", "node_modules", "cheapcode-ai"), { recursive: true })
cpSync(opencodeBinary, join(stage, "opencode-bin", "opencode"))
chmodSync(join(stage, "opencode-bin", "opencode"), 0o755)

rmSync(join(outRoot, artifact), { force: true })
run(["tar", "-czf", join(outRoot, artifact), "-C", stage, "."])
run(["shasum", "-a", "256", join(outRoot, artifact)])
console.log(`built Homebrew artifact: ${join(outRoot, artifact)}`)
console.log(`artifact name: ${basename(artifact)}`)
