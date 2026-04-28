"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";

function ImpersonateContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verificando token...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Token não fornecido");
      return;
    }

    async function doImpersonate() {
      try {
        setStatus("Autenticando...");
        const res = await fetch("/api/auth/impersonate-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Erro ao autenticar");
          return;
        }

        const session = await res.json();

        setStatus(`Entrando como ${session.email}...`);

        console.log("[IMPERSONATE-CLIENT] Tokens received:", {
          hasAccessToken: !!session.access_token,
          hasRefreshToken: !!session.refresh_token,
          email: session.email,
        });

        const supabase = createClient();

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        console.log("[IMPERSONATE-CLIENT] setSession result:", {
          error: sessionError?.message || null,
          code: sessionError?.status || null,
        });

        if (sessionError) {
          setError("Erro ao configurar sessão: " + sessionError.message);
          return;
        }

        setStatus("Redirecionando...");
        window.location.href = "/producer";
      } catch (err) {
        setError(
          "Erro inesperado: " +
            (err instanceof Error ? err.message : "desconhecido")
        );
      }
    }

    doImpersonate();
  }, [searchParams]);

  return (
    <div
      style={{
        background: "#0a0a0b",
        color: "#fff",
        fontFamily: "sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        margin: 0,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p
              style={{
                color: "#ef4444",
                fontSize: "16px",
                marginBottom: "12px",
              }}
            >
              {error}
            </p>
            <a href="/admin" style={{ color: "#3b82f6", fontSize: "14px" }}>
              Voltar ao admin
            </a>
          </>
        ) : (
          <>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px",
              }}
            />
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>{status}</p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense>
      <ImpersonateContent />
    </Suspense>
  );
}
