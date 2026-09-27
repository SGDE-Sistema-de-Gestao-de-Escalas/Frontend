import React, { useState } from "react";
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  ChevronLeft,
  Eye,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/auth.service";
import appIcon from "../../assets/icon.svg";

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
      // Pedido real à API Laravel Sanctum (/api/login)
      const resolvedRole = await auth.loginWithCredentials(
        { email, password },
        rememberMe
      );
      handleAuthSuccess(resolvedRole);
    } catch (err: any) {
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

  /* Padrão decorativo no painel direito com as cores da marca (#4c57a2 e #2baf82) */
  const PinxPattern = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Luz ambiente de destaque no fundo */}
      <div
        className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: "#4c57a2" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full blur-3xl opacity-35"
        style={{ backgroundColor: "#2baf82" }}
      />

      <div
        className="absolute inset-0 grid gap-3.5 p-8"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
        }}
      >
        {Array.from({ length: 56 }).map((_, i) => {
          const col = i % 7;
          const row = Math.floor(i / 7);
          const isFilled = (col + row) % 3 !== 0;
          const colorVariant = (col * 2 + row * 3) % 4;

          let bg = "rgba(255, 255, 255, 0.03)";
          let border = "1px solid rgba(255, 255, 255, 0.06)";

          if (isFilled) {
            if (colorVariant === 0) {
              // Destaque verde esmeralda (#2baf82) translúcido
              bg = "rgba(43, 175, 130, 0.18)";
              border = "1.5px solid rgba(43, 175, 130, 0.35)";
            } else if (colorVariant === 1) {
              // Destaque anil/índigo (#4c57a2) translúcido
              bg = "rgba(76, 87, 162, 0.28)";
              border = "1.5px solid rgba(255, 255, 255, 0.15)";
            } else if (colorVariant === 2) {
              // Vidro branco fosco
              bg = "rgba(255, 255, 255, 0.12)";
              border = "1.5px solid rgba(255, 255, 255, 0.20)";
            } else {
              // Gradiente suave combinando ambas as cores
              bg =
                "linear-gradient(135deg, rgba(76, 87, 162, 0.25) 0%, rgba(43, 175, 130, 0.22) 100%)";
              border = "1.5px solid rgba(43, 175, 130, 0.25)";
            }
          }

          return (
            <div
              key={i}
              className="rounded-2xl transition-all duration-300"
              style={{
                background: bg,
                border: border,
                backdropFilter: isFilled ? "blur(3px)" : "none",
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
          {/* Logo mark com o icon oficial da marca */}
          <div className="mb-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/80 shadow-xs flex items-center justify-center mb-6 p-2.5">
              <img
                src={appIcon}
                alt="SGDE"
                className="w-full h-full object-contain"
              />
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Email institucional{" "}
                  <span className="text-destructive ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="utilizador@sgde.pt"
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

      {/* ── Right panel: visual branding com as cores #4c57a2 e #2baf82 ── */}
      <div
        className="hidden lg:flex flex-1 relative flex-col justify-between p-12 text-white overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #373e75 0%, #4c57a2 35%, #368286 70%, #2baf82 100%)",
        }}
      >
        <PinxPattern />

        {/* Top badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#2baf82" }}
            />
            <Shield size={14} className="text-white" />
            <span className="text-xs font-semibold text-white tracking-wide">
              SGDE · Gestão de Escalas
            </span>
          </div>
          <span className="text-xs text-white/70 font-mono bg-black/15 px-2 py-0.5 rounded-md">
            v0.0.1
          </span>
        </div>

        {/* Middle illustration / testimonial */}
        <div className="relative z-10 max-w-md my-auto">
          <div className="w-14 h-14 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-center mb-6 border border-white/40 shadow-xl p-2.5">
            <img
              src={appIcon}
              alt="SGDE"
              className="w-full h-full object-contain"
            />
          </div>
          <blockquote className="text-2xl font-semibold leading-snug mb-4 text-white">
            "Organização inteligente de horários e equipas para agrupamentos
            escolares."
          </blockquote>
          <p className="text-sm text-white/80 leading-relaxed">
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
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 text-white shadow-xs transition-colors"
              >
                <span style={{ color: "#2baf82" }}>{p.icon}</span>
                {p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/70 border-t border-white/15 pt-4">
          <span>Agrupamento de Escolas</span>
          <span>Ano Letivo 2026/2027</span>
        </div>
      </div>
    </div>
  );
}
