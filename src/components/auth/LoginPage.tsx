import React, { useState } from "react";
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Eye,
  Layers,
  RefreshCw,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/auth.service";

interface LoginPageProps {
  onLogin?: (role: Role) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const auth = useAuth();
  const [view, setView] = useState<"login" | "forgot" | "forgot-sent">(
    "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  function handleAuthSuccess(role: Role) {
    if (onLogin) {
      onLogin(role);
    } else {
      auth.login(role);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Pedido real à API Laravel Sanctum (/api/login)
      const resolvedRole = await auth.loginWithCredentials(
        { email, password },
        rememberMe
      );
      handleAuthSuccess(resolvedRole);
    } catch (err: any) {
      // 2. Extrai a mensagem de erro retornada pela API
      if (err?.response?.data) {
        const data = err.response.data;
        const apiErrorMessage =
          data?.errors?.email?.[0] ||
          data?.errors?.password?.[0] ||
          data?.message ||
          "Email ou password incorretos.";
        setError(apiErrorMessage);
      } else {
        setError(
          "Não foi possível contactar o servidor em http://localhost:8000/api."
        );
      }
      setLoading(false);
    }
  }

  /* Pinx-style decorative pattern for the right panel */
  const PinxPattern = () => (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 grid gap-4 p-8"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
        }}
      >
        {Array.from({ length: 56 }).map((_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const isFilled = (col + row) % 3 !== 0;
          return (
            <div
              key={i}
              className="rounded-2xl"
              style={{
                backgroundColor: isFilled
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.08)",
              }}
            />
          );
        })}
      </div>
    </div>
  );

  const inputCls = (hasError = false) =>
    `w-full px-3.5 py-2.5 text-sm rounded-xl border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all placeholder:text-muted-foreground/40 ${
      hasError ? "border-destructive" : "border-border"
    }`;

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: form ── */}
      <div className="flex-1 lg:max-w-[480px] bg-card flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-[340px]">
          {/* Logo mark */}
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6 shadow-sm shadow-primary/30">
              <Layers size={20} className="text-primary-foreground" />
            </div>

            {view === "login" && (
              <>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">
                  Bem-vindo de volta
                </h1>
                <p className="text-sm text-muted-foreground">
                  Hoje é um novo dia. Inicie sessão para gerir as escalas.
                </p>
              </>
            )}
            {view === "forgot" && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setError("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ChevronLeft size={13} />
                  Voltar ao login
                </button>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">
                  Recuperar password
                </h1>
                <p className="text-sm text-muted-foreground">
                  Introduza o seu email e enviaremos um link para redefinir a sua
                  password.
                </p>
              </>
            )}
            {view === "forgot-sent" && (
              <>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle size={22} className="text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-1">
                  Email enviado
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enviámos um link de recuperação para{" "}
                  <strong className="text-foreground">{resetEmail}</strong>.
                </p>
              </>
            )}
          </div>

          {/* ── LOGIN form ── */}
          {view === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="admin@sgde.pt"
                    autoComplete="email"
                    className={inputCls(!!error)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Password <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setResetEmail(email);
                        setError("");
                      }}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Esqueceu a password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={inputCls(!!error) + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye
                        size={15}
                        className={showPassword ? "opacity-100" : "opacity-40"}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Lembrar</span>
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || loading}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      A entrar...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">Ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Social buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => handleAuthSuccess("admin"), 700);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 18 18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                      fill="#EA4335"
                    />
                  </svg>
                  Entrar com Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    setTimeout(() => handleAuthSuccess("admin"), 700);
                  }}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm font-medium text-foreground"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 21 21"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  Entrar com Microsoft
                </button>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD form ── */}
          {view === "forgot" && (
            <>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  try {
                    await authService.forgotPassword(resetEmail);
                  } catch {
                    // Fail silently or still show sent screen for privacy/security
                  } finally {
                    setLoading(false);
                    setView("forgot-sent");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email institucional{" "}
                    <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@sgde.pt"
                    autoComplete="email"
                    className={inputCls()}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!resetEmail || loading}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    "Enviar link de recuperação"
                  )}
                </button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-5">
                Não recebeu o email? Verifique a pasta de spam ou contacte o
                administrador.
              </p>
            </>
          )}

          {/* ── FORGOT SENT ── */}
          {view === "forgot-sent" && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-muted-foreground">
                Se o email estiver registado no agrupamento, receberá instruções
                em instantes.
              </p>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                }}
                className="w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: visual branding ── */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex-col justify-between p-12 text-primary-foreground overflow-hidden">
        <PinxPattern />

        {/* Top badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15">
            <Shield size={14} className="text-white" />
            <span className="text-xs font-medium text-white">
              SGDE · Gestão de Escalas
            </span>
          </div>
          <span className="text-xs text-white/60 font-mono">v0.0.1</span>
        </div>

        {/* Middle illustration / testimonial */}
        <div className="relative z-10 max-w-md my-auto">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
            <Calendar size={24} className="text-white" />
          </div>
          <blockquote className="text-2xl font-semibold leading-snug mb-4 text-white">
            "Organização inteligente de horários e equipas para agrupamentos
            escolares."
          </blockquote>
          <p className="text-sm text-white/75 leading-relaxed">
            Plataforma centralizada para gestão de matrizes semanais,
            ausências, reforços e horários de assistentes operacionais.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { icon: <BarChart2 size={12} />, label: "Matriz Dinâmica" },
              { icon: <Users size={12} />, label: "Controlo de Lotação" },
              { icon: <Shield size={12} />, label: "Motor de Regras" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium border border-white/15 text-white/90"
              >
                {p.icon}
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
          <span>Agrupamento de Escolas</span>
          <span>Ano Letivo 2026/2027</span>
        </div>
      </div>
    </div>
  );
}
