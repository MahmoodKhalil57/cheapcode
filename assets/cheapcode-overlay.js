/**
 * cheapcode-overlay.js — DOM injection script that adds a "+ Add another"
 * button next to Disconnect on connected providers in opencode's UI.
 *
 * Loaded by cheapcode's proxy (src/web-server.ts) via <script> injection
 * into opencode's served index.html.
 *
 * Maintenance posture (operator directive: "easy to maintain in the future"):
 *   - Uses opencode's existing data-component selectors (stable hooks intended
 *     for testing/extensions) — see settings-providers.tsx in opencode source
 *   - MutationObserver-based: the SPA re-renders on navigation; we react
 *   - All UI primitives (button, prompt) use vanilla DOM — no framework dep
 *   - Calls opencode's existing HTTP API (/auth/{name} PUT) — not internal APIs
 *   - When opencode UI changes, only the selectors here might need updating
 *
 * Initial scope (M12): API-key flow only. User clicks button → enters name +
 * API key → cheapcode PUTs to opencode's /auth/{name} endpoint. opencode
 * picks up the new credential immediately. Cheapcode auto-discovery (M8)
 * exposes it for cheapcode/* tier routing.
 *
 * Future scope (M13+): OAuth multi-account via the swap-and-rename dance
 * (currently only available via the cheapcode-accounts MCP chat tool).
 */

;(function () {
  "use strict"

  // ============================================================
  // Constants — opencode UI selectors (stable per opencode source convention)
  // ============================================================

  const CONNECTED_SECTION_SELECTOR = '[data-component="connected-providers-section"]'
  const PROVIDER_ROW_SELECTOR = "div.group" // each connected provider row uses class "group" (per source)
  const ADDED_BUTTON_MARK = "data-cheapcode-add-another"

  // ============================================================
  // Style — minimal, matches opencode visual language
  // ============================================================

  const STYLE_TAG_ID = "cheapcode-overlay-style"
  function injectStyle() {
    if (document.getElementById(STYLE_TAG_ID)) return
    const s = document.createElement("style")
    s.id = STYLE_TAG_ID
    s.textContent = `
      .cheapcode-add-another-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 500;
        background: transparent;
        color: var(--text-base, #888);
        border: 1px solid var(--border-weak-base, #444);
        border-radius: 6px;
        cursor: pointer;
        margin-right: 8px;
        opacity: 0.85;
        transition: opacity 150ms, color 150ms, border-color 150ms;
      }
      .cheapcode-add-another-btn:focus,
      .cheapcode-add-another-btn:hover {
        opacity: 1;
        color: var(--text-strong, #fff);
        border-color: var(--border-strong-base, #666);
      }
      .cheapcode-modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .cheapcode-modal {
        background: var(--surface-base, #1a1a1a);
        color: var(--text-strong, #fff);
        border: 1px solid var(--border-weak-base, #333);
        border-radius: 8px;
        padding: 24px;
        width: min(420px, 90vw);
        font-family: inherit;
      }
      .cheapcode-modal h2 {
        font-size: 16px;
        margin: 0 0 8px;
        font-weight: 500;
      }
      .cheapcode-modal p {
        font-size: 13px;
        color: var(--text-base, #aaa);
        margin: 0 0 16px;
      }
      .cheapcode-modal label {
        display: block;
        font-size: 12px;
        color: var(--text-base, #aaa);
        margin-bottom: 4px;
      }
      .cheapcode-modal input {
        width: 100%;
        padding: 8px 10px;
        margin-bottom: 12px;
        background: var(--surface-stronger, #222);
        color: var(--text-strong, #fff);
        border: 1px solid var(--border-weak-base, #444);
        border-radius: 6px;
        font-size: 13px;
        font-family: inherit;
        box-sizing: border-box;
      }
      .cheapcode-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .cheapcode-modal-actions button {
        padding: 8px 14px;
        font-size: 13px;
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid var(--border-weak-base, #444);
        background: transparent;
        color: var(--text-strong, #fff);
        font-family: inherit;
      }
      .cheapcode-modal-actions button.primary {
        background: var(--text-interactive-base, #4a9eff);
        color: #000;
        border-color: transparent;
      }
      .cheapcode-modal-error {
        font-size: 12px;
        color: #ff6b6b;
        margin-top: 8px;
      }
      .cheapcode-modal-success {
        font-size: 12px;
        color: #4caf50;
        margin-top: 8px;
      }
    `
    document.head.appendChild(s)
  }

  // ============================================================
  // Heuristic: extract provider id from a row (anchor on icon + name)
  // ============================================================

  function getProviderIdFromRow(row) {
    // Each row has a ProviderIcon component. Look at its data or class.
    // opencode's ProviderIcon usually has the id reflected in some attribute.
    // Fallback: read the visible name and lowercase-slugify it.
    const icon = row.querySelector("[data-provider-id], [data-id]")
    if (icon) {
      const id = icon.getAttribute("data-provider-id") ?? icon.getAttribute("data-id")
      if (id) return id
    }
    // Fallback: read the name span
    const nameEl = row.querySelector("span")
    if (nameEl) {
      return slugify(nameEl.textContent || "")
    }
    return null
  }

  function getProviderNameFromRow(row) {
    const nameEl = row.querySelector("span")
    return nameEl ? (nameEl.textContent || "").trim() : "this provider"
  }

  function slugify(s) {
    return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  }

  // ============================================================
  // Suggest a unique credential name (e.g. openai-2 if openai-1 exists)
  // ============================================================

  async function suggestNextName(providerId) {
    try {
      const res = await fetch("/provider", { credentials: "same-origin" })
      const data = await res.json()
      const connected = data.connected ?? []
      const all = data.all ?? []
      const existing = new Set([
        ...connected.map((p) => p.id),
        ...all.filter((p) => p.id).map((p) => p.id),
      ])
      let n = 2
      while (existing.has(`${providerId}-${n}`)) n++
      return `${providerId}-${n}`
    } catch {
      return `${providerId}-2`
    }
  }

  // ============================================================
  // Modal: prompts user for name + API key, PUTs to /auth/{name}
  // ============================================================

  function showAddAnotherModal(providerId, providerName) {
    const backdrop = document.createElement("div")
    backdrop.className = "cheapcode-modal-backdrop"

    const modal = document.createElement("div")
    modal.className = "cheapcode-modal"
    modal.innerHTML = `
      <h2>Add another ${providerName} account</h2>
      <p>Enter a unique name and API key for this credential. Both accounts will work simultaneously through cheapcode's tier routing.</p>
      <label>Credential name</label>
      <input class="cc-name" type="text" placeholder="loading..." />
      <label>API key</label>
      <input class="cc-key" type="password" placeholder="sk-..." autocomplete="off" />
      <div class="cheapcode-modal-error" style="display:none"></div>
      <div class="cheapcode-modal-success" style="display:none"></div>
      <div class="cheapcode-modal-actions">
        <button class="cancel">Cancel</button>
        <button class="primary submit">Add account</button>
      </div>
    `
    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    const nameInput = modal.querySelector(".cc-name")
    const keyInput = modal.querySelector(".cc-key")
    const errEl = modal.querySelector(".cheapcode-modal-error")
    const okEl = modal.querySelector(".cheapcode-modal-success")
    const cancelBtn = modal.querySelector(".cancel")
    const submitBtn = modal.querySelector(".submit")

    suggestNextName(providerId).then((name) => {
      nameInput.value = name
      nameInput.placeholder = name
      keyInput.focus()
    })

    function close() {
      backdrop.remove()
    }

    function showError(msg) {
      errEl.textContent = msg
      errEl.style.display = "block"
      okEl.style.display = "none"
    }

    function showOk(msg) {
      okEl.textContent = msg
      okEl.style.display = "block"
      errEl.style.display = "none"
    }

    cancelBtn.addEventListener("click", close)
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close()
    })

    submitBtn.addEventListener("click", async () => {
      const name = (nameInput.value || "").trim()
      const key = (keyInput.value || "").trim()
      if (!name) return showError("Name is required")
      if (!key || key.length < 5) return showError("API key looks invalid")

      submitBtn.disabled = true
      try {
        // PUT to opencode's /auth/{name} — same endpoint Custom provider uses
        const res = await fetch(`/auth/${encodeURIComponent(name)}`, {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "api", key }),
        })
        if (!res.ok) {
          const text = await res.text().catch(() => "(unreadable)")
          throw new Error(`opencode rejected: ${res.status} ${text}`)
        }
        showOk(`Saved as "${name}". Both accounts are now active.`)
        setTimeout(() => {
          close()
          // Trigger a soft reload of the providers list (event broadcast OR full reload)
          // For safety, reload the page so opencode re-fetches /provider
          window.location.reload()
        }, 1200)
      } catch (e) {
        showError(`Failed: ${e.message || e}`)
        submitBtn.disabled = false
      }
    })
  }

  // ============================================================
  // Add the "+ Add another" button to each connected provider row
  // ============================================================

  function addButtonsToConnectedProviders() {
    const section = document.querySelector(CONNECTED_SECTION_SELECTOR)
    if (!section) return
    const rows = section.querySelectorAll(PROVIDER_ROW_SELECTOR)
    rows.forEach((row) => {
      if (row.hasAttribute(ADDED_BUTTON_MARK)) return
      const disconnectBtn = Array.from(row.querySelectorAll("button")).find((b) =>
        /disconnect/i.test(b.textContent || ""),
      )
      if (!disconnectBtn) return // env-managed providers have no disconnect; skip them
      const providerId = getProviderIdFromRow(row)
      const providerName = getProviderNameFromRow(row)
      if (!providerId) return

      const btn = document.createElement("button")
      btn.className = "cheapcode-add-another-btn"
      btn.textContent = "+ Add another"
      btn.title = `Add another ${providerName} credential under a different name`
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        showAddAnotherModal(providerId, providerName)
      })

      // Insert before the Disconnect button
      disconnectBtn.parentElement.insertBefore(btn, disconnectBtn)
      row.setAttribute(ADDED_BUTTON_MARK, "1")
    })
  }

  // ============================================================
  // MutationObserver: watch for SPA re-renders + re-add buttons
  // ============================================================

  function start() {
    injectStyle()
    addButtonsToConnectedProviders()
    const observer = new MutationObserver(() => {
      // debounced add — cheap to call
      addButtonsToConnectedProviders()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start)
  } else {
    start()
  }
})()
