/**
 * web-server.ts — minimal proxy that runs IN FRONT of opencode web (M12).
 *
 * Operator directive: "make sure you add it in the most minimal way so that
 * it is easy to maintain in the future" + "merge frequently from opencode".
 *
 * Strategy choice (vs. forking opencode source):
 *   - Forking would mean rebasing per upstream merge — friction per merge
 *   - This proxy just transparently passes opencode through, only intercepting
 *     the index.html response to inject one <script> tag
 *   - When opencode upstream changes, NO action needed unless they change the
 *     DOM structure of the Providers panel (rare)
 *   - Total surface: this file + the overlay script. ~250 LoC combined.
 *
 * Architecture:
 *   `cheapcode web` spawns opencode on UPSTREAM_PORT (4097), runs this
 *   proxy on PUBLIC_PORT (4096). Browser hits :4096; everything passes
 *   through to :4097 except:
 *     - / and /index.html — html injected with <script src="/cheapcode-overlay.js">
 *     - /cheapcode-overlay.js — served from this proxy itself
 *
 * Per memory project_compat_matrix.md: opencode runs unchanged. cheapcode
 * adds a thin layer. If user runs vanilla `opencode web` directly, they
 * still get full opencode behavior (without the cheapcode overlay).
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// ============================================================
// Locate the overlay script bundle (different paths in dev vs install)
// ============================================================

function getOverlayPath(): string {
  // From this file: ../assets/cheapcode-overlay.js
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    join(here, "..", "assets", "cheapcode-overlay.js"),
    join(here, "..", "..", "assets", "cheapcode-overlay.js"),
  ]
  for (const c of candidates) {
    if (existsSync(c)) return c
  }
  return candidates[0] // fall through to first; will 404 if missing
}

const OVERLAY_PATH = getOverlayPath()
const OVERLAY_SCRIPT_TAG = '<script src="/cheapcode-overlay.js" defer></script>'

// ============================================================
// Types
// ============================================================

export interface WebServerOptions {
  /** Port this proxy listens on (what the user opens in browser). Default 4096. */
  publicPort?: number
  /** Port the upstream opencode listens on. Default 4097. */
  upstreamPort?: number
  /** Hostname for proxy + upstream. Default 127.0.0.1. */
  hostname?: string
}

// ============================================================
// Server
// ============================================================

export function startWebServer(opts: WebServerOptions = {}): { stop: () => void; url: string } {
  const publicPort = opts.publicPort ?? 4096
  const upstreamPort = opts.upstreamPort ?? 4097
  const host = opts.hostname ?? "127.0.0.1"
  const upstreamBase = `http://${host}:${upstreamPort}`

  const server = Bun.serve({
    port: publicPort,
    hostname: host,
    async fetch(req): Promise<Response> {
      const url = new URL(req.url)

      // 1. Serve our overlay script directly (don't proxy)
      if (url.pathname === "/cheapcode-overlay.js") {
        if (!existsSync(OVERLAY_PATH)) {
          return new Response("// cheapcode-overlay.js not found at install path", {
            status: 404,
            headers: { "Content-Type": "application/javascript" },
          })
        }
        return new Response(readFileSync(OVERLAY_PATH, "utf-8"), {
          headers: {
            "Content-Type": "application/javascript",
            // Don't aggressively cache — overlay is small and can iterate quickly
            "Cache-Control": "no-cache",
          },
        })
      }

      // 2. Proxy everything else to opencode
      const targetURL = upstreamBase + url.pathname + url.search
      const upstreamHeaders = new Headers(req.headers)
      // Strip Host header so upstream sees its own host
      upstreamHeaders.delete("host")
      // Force identity encoding from upstream so we never receive gzipped
      // bodies. Bun's fetch auto-decodes gzip on stream access, leading to a
      // header/body mismatch (browser sees Content-Encoding: gzip but receives
      // already-decoded text → ERR_CONTENT_DECODING_FAILED). Skipping
      // compression at the upstream-server boundary side-steps the whole class.
      upstreamHeaders.set("accept-encoding", "identity")

      let upstream: Response
      try {
        upstream = await fetch(targetURL, {
          method: req.method,
          headers: upstreamHeaders,
          body: req.body,
          // @ts-expect-error duplex is bun-specific for streaming bodies
          duplex: "half",
          redirect: "manual",
        })
      } catch (e) {
        return new Response(`upstream opencode unreachable at ${upstreamBase}: ${(e as Error).message}`, {
          status: 502,
        })
      }

      // 3. If response is HTML and contains </head>, inject our overlay script
      const contentType = upstream.headers.get("content-type") ?? ""
      if (contentType.includes("text/html")) {
        // Reading .text() implicitly decodes any Content-Encoding (gzip/br/deflate),
        // so we MUST strip those headers from the outgoing response — otherwise
        // the browser tries to decompress already-decompressed text and bails
        // with ERR_CONTENT_DECODING_FAILED.
        const text = await upstream.text()
        const injected = text.includes(OVERLAY_SCRIPT_TAG)
          ? text
          : text.replace("</head>", `${OVERLAY_SCRIPT_TAG}</head>`)
        const headers = new Headers(upstream.headers)
        headers.delete("content-length") // wrong after injection
        headers.delete("content-encoding") // body is decoded plain text now
        headers.delete("transfer-encoding") // bun will set chunked/identity itself
        // Allow our overlay script to run (relax CSP if upstream sets one).
        // opencode's index.html sets a strict CSP; we add 'self' (which already
        // allows /cheapcode-overlay.js since it comes from the same origin).
        const csp = headers.get("content-security-policy")
        if (csp && !csp.includes("'self'")) {
          headers.set(
            "content-security-policy",
            csp.replace(/script-src\s+/, "script-src 'self' "),
          )
        }
        return new Response(injected, { status: upstream.status, headers })
      }

      // 4. Pass through everything else as-is. Defense-in-depth: also strip
      // Content-Encoding header on pass-through, since Bun's fetch may have
      // auto-decoded the body even if upstream ignored our identity request.
      const passHeaders = new Headers(upstream.headers)
      passHeaders.delete("content-encoding")
      passHeaders.delete("transfer-encoding")
      passHeaders.delete("content-length")
      return new Response(upstream.body, {
        status: upstream.status,
        headers: passHeaders,
      })
    },
  })

  const url = `http://${host}:${publicPort}/`
  return {
    url,
    stop: () => server.stop(true),
  }
}
