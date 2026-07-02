"use client";

import { useState } from "react";
import { apiPost, ApiClientError } from "@/lib/client";
import { Eye, EyeOff, Lock } from "lucide-react";

const DISPLAY = "var(--font-grotesk), var(--font-inter), ui-sans-serif, system-ui, sans-serif";

export function UnlockForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/unlock", { password });
      // Hard navigation (not router.push) so the just-set unlock cookie is
      // re-read by the edge middleware on a fresh request. A soft SPA
      // navigation races the middleware re-check and leaves the button
      // spinning until a manual refresh.
      const target = next && next.startsWith("/") ? next : "/";
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Incorrect password");
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.02)",
        padding: 28,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.04)",
          color: "#ffffff",
          marginBottom: 16,
        }}
      >
        <Lock size={20} />
      </span>
      <h1 style={{ margin: 0, fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "-.01em" }}>
        Private preview
      </h1>
      <p style={{ margin: "6px 0 0", fontSize: 14, color: "#c8c8cc" }}>Enter the access password to continue.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="ce-unlock-pw" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#c8c8cc", marginBottom: 8 }}>
            Access password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="ce-unlock-pw"
              type={show ? "text" : "password"}
              required
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                height: 46,
                padding: "0 42px 0 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.03)",
                color: "#ffffff",
                fontSize: 15,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                height: 46,
                display: "inline-flex",
                alignItems: "center",
                padding: "0 12px",
                background: "transparent",
                border: 0,
                color: "#6c6c74",
                cursor: "pointer",
              }}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error ? (
          <p
            style={{
              margin: 0,
              borderRadius: 10,
              border: "1px solid rgba(255,120,120,.35)",
              background: "rgba(255,120,120,.10)",
              padding: "8px 12px",
              fontSize: 14,
              color: "#ff9a9a",
            }}
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            height: 46,
            width: "100%",
            borderRadius: 10,
            border: 0,
            background: busy ? "#c8c8cc" : "#ffffff",
            color: "#000000",
            fontWeight: 700,
            fontSize: 15,
            cursor: busy ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {busy ? (
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid rgba(0,0,0,.28)",
                borderTopColor: "#000",
                display: "inline-block",
                animation: "ceUnlockSpin .6s linear infinite",
              }}
            />
          ) : (
            "Unlock"
          )}
        </button>
      </form>

      <style>{`@keyframes ceUnlockSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
