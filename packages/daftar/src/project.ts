import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";

export type ProjectRegistryEntry = {
  original_path: string;
  last_seen_at: string;
};

export type ProjectRegistry = Record<string, ProjectRegistryEntry>;

export function daftarRoot(): string {
  const configured = process.env.DAFTAR_ROOT?.trim();
  return configured ? resolve(configured) : resolve(homedir(), ".local", "share", "daftar");
}

export function ensureDaftarRoot(): string {
  const root = daftarRoot();
  mkdirSync(root, { recursive: true });
  mkdirSync(resolve(root, "projects"), { recursive: true });
  return root;
}

export function canonicalProjectPath(inputPath?: string): string {
  const requested = resolve(inputPath ?? process.cwd());
  const gitRoot = detectGitRoot(requested);
  return realpathSafe(gitRoot ?? requested);
}

export function projectHash(projectPath: string): string {
  const canonical = canonicalProjectPath(projectPath);
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export function projectDbPath(projectPath?: string): string {
  const canonical = canonicalProjectPath(projectPath);
  const hash = projectHash(canonical);
  return resolve(ensureDaftarRoot(), "projects", `${hash}.db`);
}

export function registryPath(): string {
  return resolve(ensureDaftarRoot(), "registry.json");
}

export function readRegistry(): ProjectRegistry {
  const file = registryPath();
  if (!existsSync(file)) return {};

  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as ProjectRegistry;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeRegistry(registry: ProjectRegistry): void {
  const file = registryPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function touchProjectRegistry(projectPath?: string): { hash: string; canonicalPath: string } {
  const canonicalPath = canonicalProjectPath(projectPath);
  const hash = projectHash(canonicalPath);
  const registry = readRegistry();
  registry[hash] = {
    original_path: canonicalPath,
    last_seen_at: new Date().toISOString(),
  };
  writeRegistry(registry);
  return { hash, canonicalPath };
}

export function listProjects(): Array<{ hash: string; original_path: string; last_seen_at: string }> {
  return Object.entries(readRegistry())
    .map(([hash, entry]) => ({ hash, ...entry }))
    .sort((a, b) => b.last_seen_at.localeCompare(a.last_seen_at));
}

function detectGitRoot(startPath: string): string | null {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: startPath,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

  if (result.status !== 0) return null;
  const output = result.stdout.trim();
  return output ? output : null;
}

function realpathSafe(inputPath: string): string {
  try {
    return realpathSync(inputPath);
  } catch {
    return resolve(inputPath);
  }
}
