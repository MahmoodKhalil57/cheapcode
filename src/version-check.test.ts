import { afterEach, expect, test } from "bun:test"
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { buildUpdateBanner, checkForUpdates, hasUpdate, probeRepo } from "./version-check"

let tmpDir: string

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

const initLocalRepo = async (
  path: string,
  remotePath: string,
): Promise<{ localSha: string; remoteSha: string }> => {
  await mkdir(path, { recursive: true })
  await mkdir(remotePath, { recursive: true })
  // remote: bare repo
  spawnSync("git", ["init", "--bare", remotePath], { stdio: "ignore" })
  // local: init + initial commit + push
  spawnSync("git", ["init", "-b", "main", path], { stdio: "ignore" })
  spawnSync("git", ["-C", path, "config", "user.email", "test@test"], { stdio: "ignore" })
  spawnSync("git", ["-C", path, "config", "user.name", "test"], { stdio: "ignore" })
  await writeFile(join(path, "README"), "v1")
  spawnSync("git", ["-C", path, "add", "."], { stdio: "ignore" })
  spawnSync("git", ["-C", path, "commit", "-m", "init"], { stdio: "ignore" })
  spawnSync("git", ["-C", path, "remote", "add", "origin", remotePath], { stdio: "ignore" })
  spawnSync("git", ["-C", path, "push", "-u", "origin", "main"], { stdio: "ignore" })
  const localSha = spawnSync("git", ["-C", path, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim()
  return { localSha, remoteSha: localSha }
}

test("probeRepo: current when local sha == remote tip", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-vc-current-"))
  const { localSha } = await initLocalRepo(join(tmpDir, "lib"), join(tmpDir, "lib.git"))
  const r = probeRepo({ path: join(tmpDir, "lib"), remoteUrl: join(tmpDir, "lib.git"), branch: "main" })
  expect(r.status).toBe("current")
  if (r.status === "current") expect(r.localSha).toBe(localSha)
})

test("probeRepo: behind when remote tip moves ahead", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-vc-behind-"))
  const localPath = join(tmpDir, "lib")
  const remotePath = join(tmpDir, "lib.git")
  await initLocalRepo(localPath, remotePath)
  // create another local clone, push a new commit, leaving the original behind.
  // The bare repo's HEAD doesn't always point at "main" after the first push,
  // so explicitly check out + track main on the clone before committing.
  const otherPath = join(tmpDir, "other")
  spawnSync("git", ["clone", "--branch", "main", remotePath, otherPath], { stdio: "ignore" })
  spawnSync("git", ["-C", otherPath, "config", "user.email", "test@test"], { stdio: "ignore" })
  spawnSync("git", ["-C", otherPath, "config", "user.name", "test"], { stdio: "ignore" })
  await writeFile(join(otherPath, "README"), "v2")
  spawnSync("git", ["-C", otherPath, "add", "."], { stdio: "ignore" })
  spawnSync("git", ["-C", otherPath, "commit", "-m", "v2"], { stdio: "ignore" })
  spawnSync("git", ["-C", otherPath, "push", "origin", "main"], { stdio: "ignore" })

  const r = probeRepo({ path: localPath, remoteUrl: remotePath, branch: "main" })
  expect(r.status).toBe("behind")
})

test("probeRepo: unknown when path doesn't exist", () => {
  const r = probeRepo({ path: "/nonexistent/path/abc123", remoteUrl: "x", branch: "main" })
  expect(r.status).toBe("unknown")
})

test("probeRepo: unknown when path is not a git checkout", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-vc-nogit-"))
  await writeFile(join(tmpDir, "file"), "x")
  const r = probeRepo({ path: tmpDir, remoteUrl: "x", branch: "main" })
  expect(r.status).toBe("unknown")
  if (r.status === "unknown") expect(r.reason).toContain("not a git checkout")
})

test("checkForUpdates: caches result and reuses within TTL", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-vc-cache-"))
  const cachePath = join(tmpDir, "cache.json")
  await initLocalRepo(join(tmpDir, "lib"), join(tmpDir, "lib.git"))
  await initLocalRepo(join(tmpDir, "fork"), join(tmpDir, "fork.git"))
  const r1 = checkForUpdates({
    cheapcodeRoot: join(tmpDir, "lib"),
    forkPath: join(tmpDir, "fork"),
    cachePath,
    cheapcodeRemoteUrl: join(tmpDir, "lib.git"),
    forkRemoteUrl: join(tmpDir, "fork.git"),
  })
  expect(r1.cheapcode.status).toBe("current")
  // second call within TTL should return same checked_at (cached)
  const r2 = checkForUpdates({
    cheapcodeRoot: join(tmpDir, "lib"),
    forkPath: join(tmpDir, "fork"),
    cachePath,
    cheapcodeRemoteUrl: join(tmpDir, "lib.git"),
    forkRemoteUrl: join(tmpDir, "fork.git"),
  })
  expect(r2.checked_at).toBe(r1.checked_at)
})

test("checkForUpdates: force re-probes even with fresh cache", async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "cheapcode-vc-force-"))
  const cachePath = join(tmpDir, "cache.json")
  await initLocalRepo(join(tmpDir, "lib"), join(tmpDir, "lib.git"))
  await initLocalRepo(join(tmpDir, "fork"), join(tmpDir, "fork.git"))
  const r1 = checkForUpdates({
    cheapcodeRoot: join(tmpDir, "lib"),
    forkPath: join(tmpDir, "fork"),
    cachePath,
    cheapcodeRemoteUrl: join(tmpDir, "lib.git"),
    forkRemoteUrl: join(tmpDir, "fork.git"),
  })
  await new Promise((r) => setTimeout(r, 5))
  const r2 = checkForUpdates({
    cheapcodeRoot: join(tmpDir, "lib"),
    forkPath: join(tmpDir, "fork"),
    cachePath,
    force: true,
    cheapcodeRemoteUrl: join(tmpDir, "lib.git"),
    forkRemoteUrl: join(tmpDir, "fork.git"),
  })
  expect(r2.checked_at).not.toBe(r1.checked_at)
})

test("buildUpdateBanner: empty string when both repos current", () => {
  const banner = buildUpdateBanner({
    cheapcode: { status: "current", localSha: "a".repeat(40) },
    fork: { status: "current", localSha: "b".repeat(40) },
    checked_at: "now",
  })
  expect(banner).toBe("")
})

test("buildUpdateBanner: includes cheapcode + fork notes when both behind", () => {
  const banner = buildUpdateBanner({
    cheapcode: { status: "behind", localSha: "a", remoteSha: "b", commitsAhead: 3 },
    fork: { status: "behind", localSha: "c", remoteSha: "d", commitsAhead: 1 },
    checked_at: "now",
  })
  expect(banner).toContain("cheapcode: 3 new commits")
  expect(banner).toContain("fork: 1 new commit")
  expect(banner).toContain("cheapcode update")
})

test("buildUpdateBanner: handles unknown commitsAhead", () => {
  const banner = buildUpdateBanner({
    cheapcode: { status: "behind", localSha: "a", remoteSha: "b", commitsAhead: 0 },
    fork: { status: "current", localSha: "c" },
    checked_at: "now",
  })
  expect(banner).toContain("cheapcode: a new commit is available")
})

test("hasUpdate: true when either repo is behind", () => {
  expect(
    hasUpdate({
      cheapcode: { status: "behind", localSha: "a", remoteSha: "b", commitsAhead: 1 },
      fork: { status: "current", localSha: "c" },
      checked_at: "now",
    }),
  ).toBe(true)
  expect(
    hasUpdate({
      cheapcode: { status: "current", localSha: "a" },
      fork: { status: "current", localSha: "b" },
      checked_at: "now",
    }),
  ).toBe(false)
})
