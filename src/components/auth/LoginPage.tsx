import React, { useEffect, useState } from "react";
import { notify } from "../common/FeedbackNotification";
import {
  AlertCircle,
  BarChart2,
  CheckCircle,
  ChevronLeft,
  Eye,
  Mail,
  RefreshCw,
  Shield,
  Users,
  Loader2,
  X,
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
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "azure" | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Capturar erro vindo do callback OAuth do BackOffice (?error=...)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      setError(decoded);
      // Limpa o parâmetro da URL do browser para manter o endereço limpo
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

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
      // Pedido real à API Laravel Sanctum (/api/login) com suporte a 'remember'
      const resolvedRole = await auth.loginWithCredentials(
        { email, password, remember: rememberMe },
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
          data?.error ||
          "Email ou password incorretos.";
        setError(apiErrorMessage);
      } else {
        const fallback =
          err?.message ||
          "Não foi possível contactar o servidor em http://localhost:8000/api.";
        setError(fallback);
      }
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google" | "microsoft") {
    setError("");
    // No backend Laravel Socialite, o provider Microsoft está configurado como 'azure'
    const backendProvider: "google" | "azure" = provider === "microsoft" ? "azure" : "google";
    setSocialLoading(backendProvider);

    try {
      const redirectUrl = await authService.getOAuthRedirectUrl(backendProvider);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("O servidor não retornou o URL de autorização OAuth.");
      }
    } catch (err: any) {
      console.error(`[OAuth] Falha ao iniciar com ${provider}:`, err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        `Não foi possível iniciar a autenticação com ${provider === "google" ? "Google" : "Microsoft"}.`;
      setError(apiMsg);
      notify.error(apiMsg);
      setSocialLoading(null);
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
            {/* Top icon: SGDE brand icon for login/forgot, or success check badge for forgot-sent */}
            {view === "forgot-sent" ? (
              <div className="w-14 h-14 rounded-2xl bg-[#2baf82]/10 border border-[#2baf82]/25 shadow-xs flex items-center justify-center mb-6 text-[#2baf82]">
                <CheckCircle size={28} className="stroke-[2.2]" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/80 shadow-xs flex items-center justify-center mb-6 p-2.5">
                <img
                  src={appIcon}
                  alt="SGDE"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

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
                <h1 className="text-2xl font-bold text-foreground leading-tight mb-2">
                  Verifique o seu email
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enviámos as instruções de recuperação para:
                </p>
                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs font-semibold text-foreground">
                  <Mail size={13} className="text-[#2baf82]" />
                  <span className="truncate max-w-[260px]">{resetEmail || "o seu email"}</span>
                </div>
              </>
            )}
          </div>

          {/* ── LOGIN form ── */}
          {view === "login" && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Email institucional{" "}
                  <span className="text-destructive ml-0.5">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    tabIndex={-1}
                    onClick={() => {
                      setView("forgot");
                      setResetEmail(email);
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={inputCls(!!error) + " pr-10"}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
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
                <div className="flex items-start gap-2.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2.5">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed break-words">{error}</span>
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

            {/* Separador e Botões de Login Social */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-medium">
                  Ou
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={loading || socialLoading !== null}
                onClick={() => handleSocialLogin("google")}
                className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 disabled:opacity-50 text-foreground text-xs font-semibold transition-colors flex items-center justify-center shadow-xs cursor-pointer"
              >
                {socialLoading === "google" ? (
                  <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {socialLoading === "google"
                    ? "A redirecionar para a Google..."
                    : "Entrar com Google"}
                </span>
              </button>

              <button
                type="button"
                disabled={loading || socialLoading !== null}
                onClick={() => handleSocialLogin("microsoft")}
                className="w-full py-2.5 px-4 rounded-xl border border-border bg-background hover:bg-muted/50 disabled:opacity-50 text-foreground text-xs font-semibold transition-colors flex items-center justify-center shadow-xs cursor-pointer"
              >
                {socialLoading === "azure" ? (
                  <Loader2 className="w-4 h-4 mr-2.5 animate-spin text-primary" />
                ) : (
                  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                )}
                <span>
                  {socialLoading === "azure"
                    ? "A redirecionar para a Microsoft..."
                    : "Entrar com Microsoft"}
                </span>
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

          {/* ── FORGOT SENT actions ── */}
          {view === "forgot-sent" && (
            <div className="space-y-4">
              <div className="bg-muted/35 border border-border/70 rounded-xl p-3.5 text-xs text-muted-foreground leading-relaxed">
                Se a conta estiver registada no sistema, receberá a ligação em instantes. Verifique também a pasta de <strong>spam</strong>.
              </div>

              <button
                type="button"
                onClick={() => {
                  setView("login");
                  setError("");
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
              >
                Voltar ao login
              </button>

              <p className="text-xs text-muted-foreground text-center pt-1">
                Não recebeu o email?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    setError("");
                  }}
                  className="text-primary font-medium hover:underline transition-colors"
                >
                  Tentar outro email
                </button>
              </p>
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
            "Organização inteligente de horários e equipas para estabelecimentos escolares."
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
          <span>Gestão de Escolas</span>
          <span>Ano Letivo 2026/2027</span>
        </div>
      </div>
    </div>
  );
}
