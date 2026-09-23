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
  Settings,
  Shield,
  User,
  Users,
} from "lucide-react";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";

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

  const DEMO_ACCOUNTS = [
    {
      email: "admin@sgde.pt",
      password: "admin123",
      role: "admin" as Role,
      name: "Miguel Silva",
      label: "Gestor",
    },
    {
      email: "assistente@sgde.pt",
      password: "staff123",
      role: "staff" as Role,
      name: "Fábio Lopes",
      label: "Assistente",
    },
  ];

  function handleAuthSuccess(role: Role) {
    if (onLogin) {
      onLogin(role);
    } else {
      auth.login(role);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find(
        (a) => a.email === email && a.password === password
      );
      if (account) {
        handleAuthSuccess(account.role);
      } else {
        setError("Email ou password incorretos.");
        setLoading(false);
      }
    }, 600);
  }

  function quickLogin(role: Role) {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    setEmail(account.email);
    setPassword(account.password);
    setError("");
    setLoading(true);
    setTimeout(() => handleAuthSuccess(role), 400);
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
                      className="w-3.5 h-3.5 rounded border-border accent-primary"
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

              {/* Divider */}
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

              {/* Demo quick access */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider mb-3 font-semibold">
                  Acesso rápido · Demo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => quickLogin("admin")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Settings
                        size={14}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      Gestor Admin
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      admin@sgde.pt
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickLogin("staff")}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User
                        size={14}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      Assistente
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      assistente@sgde.pt
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD form ── */}
          {view === "forgot" && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    setView("forgot-sent");
                  }, 800);
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
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl px-4 py-3 text-xs font-mono text-muted-foreground text-center">
                {resetEmail}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O link é válido durante{" "}
                <strong className="text-foreground">30 minutos</strong>.
                Verifique também a pasta de spam.
              </p>
              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setResetEmail("");
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: decorative Pinx pattern ── */}
      <div className="hidden lg:block flex-1 bg-primary relative overflow-hidden">
        <PinxPattern />
        {/* Centered branding overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-12">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
            <Layers size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
            Sistema de Gestão
            <br />
            Dinâmica de Escalas
          </h2>
          <p className="text-white/70 text-sm max-w-xs leading-relaxed">
            Controlo de cobertura, gestão de ausências e conformidade em tempo
            real para equipas de assistentes.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-xs">
            {[
              { icon: <Calendar size={14} />, text: "Escalas automáticas" },
              { icon: <Shield size={14} />, text: "Cobertura mínima" },
              { icon: <Users size={14} />, text: "Gestão de equipa" },
              { icon: <BarChart2 size={14} />, text: "Relatórios" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5 border border-white/10"
              >
                <span className="text-white/70">{f.icon}</span>
                <span className="text-white/90 text-xs font-medium">{f.text}</span>
              </div>
            ))}
          </div>
          <p className="absolute bottom-6 text-white/30 text-xs">
            © 2026 SGDE · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}

