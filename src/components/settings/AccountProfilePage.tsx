import { useState, useEffect } from "react";
import {
  Loader2,
  Save,
  Shield,
  Download,
  FileText,
  X,
  XCircle,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../../types";
import { Card } from "../ui/card";
import ConfirmationModal from "../common/ConfirmationModal";
import { notify } from "../common/FeedbackNotification";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/auth.service";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULE_HINT,
  validateNewPassword,
} from "../../utils/passwordPolicy";

interface AccountProfilePageProps {
  role?: Role;
}

export default function AccountProfilePage({
  role: propRole,
}: AccountProfilePageProps) {
  const { user, role: contextRole, refreshProfile, updateUserLocal, isLoading } = useAuth();
  const role = propRole || contextRole || "admin";
  const hasPassword = user.has_password !== false;

  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "privacy"
  >("profile");

  // ── Profile fields state ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [email, setEmail] = useState(user.email || "");
  // Mudar o email exige a password atual (F-08): só aparece quando o email é alterado.
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
    current_password?: string;
  }>({});
  const emailChanged =
    email.trim().toLowerCase() !== (user.email || "").trim().toLowerCase();

  // Sync with auth user on mount or user change
  useEffect(() => {
    if (user) {
      if (user.first_name !== undefined && user.first_name !== null) {
        setFirstName(user.first_name);
      } else if (user.name) {
        const parts = user.name.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (user.last_name !== undefined && user.last_name !== null) {
        setLastName(user.last_name);
      }
      if (user.email) {
        setEmail(user.email);
      }
    }
  }, [user]);

  // ── Security fields state ─────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current_password?: string;
    new_password?: string;
    new_password_confirmation?: string;
  }>({});

  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Privacy state ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRgpdConfirm, setShowRgpdConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [requestingDeactivation, setRequestingDeactivation] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [exportingData, setExportingData] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const pdfBlob = await authService.exportPersonalDataPdf();
      const blob = new Blob([pdfBlob], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha-dados-pessoais-${user?.id || "rgpd"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("A sua Ficha de Dados Pessoais (PDF) foi descarregada com sucesso.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Não foi possível gerar o documento PDF com os seus dados pessoais.";
      notify.error(msg, undefined, "Erro na Exportação");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportData() {
    setExportingData(true);
    try {
      const data = await authService.exportPersonalData();
      // Criar blob para download do ficheiro JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-pessoais-${user?.id || "rgpd"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify.success("Exportação concluída. O ficheiro com os seus dados foi descarregado.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Não foi possível exportar os seus dados pessoais.";
      notify.error(msg, undefined, "Erro na Exportação");
    } finally {
      setExportingData(false);
    }
  }

  async function handleRequestDeactivation() {
    setRequestingDeactivation(true);

    try {
      const res = await authService.requestDeactivation(deactivationReason.trim() || undefined);
      setShowRgpdConfirm(false);
      setDeactivationReason("");
      updateUserLocal({
        deactivation_requested: true,
        deactivation_requested_at: (res as any)?.deactivation_requested_at || new Date().toISOString(),
      });
      notify.success(
        res?.message || "Pedido de anonimização submetido com sucesso. Enviámos um comprovativo para o seu email e notificámos os administradores."
      );
    } catch (err: any) {
      setShowRgpdConfirm(false);
      const msg = err?.response?.data?.message || "Não foi possível submeter o pedido de desativação.";
      notify.error(msg, undefined, "Erro ao Enviar Pedido");
    } finally {
      setRequestingDeactivation(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);

    try {
      // O backend disponibilizou especificamente DELETE /api/me para o utilizador autenticado
      const res = await authService.deleteMe();
      setShowDeleteConfirm(false);
      notify.success(
        res?.message || "Conta eliminada com sucesso. Os acessos foram revogados."
      );
      // Efetua logout e redireciona para a página de login
      await logout();
      navigate("/login");
    } catch (err: any) {
      setShowDeleteConfirm(false);
      const status = err?.response?.status;
      const backendErrors = err?.response?.data?.errors;
      const userErrorMsg = backendErrors?.user?.[0];
      const message =
        userErrorMsg ||
        err?.response?.data?.message ||
        "Não foi possível eliminar a conta. Verifique com o administrador da instituição.";

      if (status === 422) {
        // Validação da regra de proteção: único admin ativo da instituição
        notify.error(
          message,
          undefined,
          "Operação Não Permitida"
        );
      } else if (status === 403) {
        notify.error(
          message || "Não tem permissões para eliminar esta conta.",
          undefined,
          "Acesso Negado"
        );
      } else {
        notify.error(message, undefined, "Erro ao Eliminar Conta");
      }
    } finally {
      setDeletingAccount(false);
    }
  }

  // ── Profile save handler ──────────────────────────────────────────────────
  async function handleSaveProfile() {
    const fName = firstName.trim();
    const lName = lastName.trim();
    const mail = email.trim();

    const errors: {
      first_name?: string;
      last_name?: string;
      email?: string;
      current_password?: string;
    } = {};

    if (!fName) {
      errors.first_name = "O primeiro nome é obrigatório.";
    }
    if (!lName) {
      errors.last_name = "O último nome é obrigatório.";
    }
    if (!mail) {
      errors.email = "O email é obrigatório.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      errors.email = "Por favor introduza um email válido.";
    }
    if (emailChanged && !emailChangePassword) {
      errors.current_password = "Indique a sua password atual para alterar o email.";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setSavingProfile(true);

    try {
      await authService.updateProfile(
        {
          first_name: fName,
          last_name: lName,
          email: mail,
          ...(emailChanged ? { current_password: emailChangePassword } : {}),
        },
        user.id
      );
      setEmailChangePassword("");
      updateUserLocal({ first_name: fName, last_name: lName, email: mail });
      await refreshProfile();
      notify.success("Dados pessoais atualizados com sucesso.");
    } catch (err: any) {
      const status = err?.response?.status;
      const backendErrors = err?.response?.data?.errors;
      const message = err?.response?.data?.message;

      if (status === 422 && backendErrors) {
        setProfileErrors({
          first_name: backendErrors.first_name?.[0],
          last_name: backendErrors.last_name?.[0],
          email: backendErrors.email?.[0],
          current_password: backendErrors.current_password?.[0],
        });
        if (message) {
          notify.error(message, undefined, "Erro de Validação");
        }
      } else if (status === 403) {
        notify.error(
          message || "Não tem permissão para alterar estes dados.",
          undefined,
          "Acesso Negado"
        );
      } else if (!err?.response) {
        notify.error("Não foi possível contactar o servidor para atualizar os dados pessoais.", undefined, "Erro de Ligação");
      } else {
        notify.error(
          message || "Não foi possível atualizar os dados pessoais.",
          undefined,
          "Erro"
        );
      }
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password change handler ───────────────────────────────────────────────
  async function handleChangePassword() {
    const curr = currentPassword;
    const next = newPassword;
    const nextConf = newPasswordConfirmation;

    const errors: {
      current_password?: string;
      new_password?: string;
      new_password_confirmation?: string;
    } = {};

    if (hasPassword && !curr) {
      errors.current_password = "A password atual é obrigatória.";
    }
    const newPasswordError = validateNewPassword(next);
    if (newPasswordError) {
      errors.new_password = newPasswordError;
    }
    if (!nextConf) {
      errors.new_password_confirmation = "Confirme a nova password.";
    } else if (next !== nextConf) {
      errors.new_password_confirmation = "As passwords não coincidem.";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);

    try {
      const payload: {
        new_password: string;
        new_password_confirmation: string;
        current_password?: string;
      } = {
        new_password: next,
        new_password_confirmation: nextConf,
      };
      if (hasPassword) {
        payload.current_password = curr;
      }

      const res = await authService.changePassword(payload);
      notify.success(
        res?.message ||
          (hasPassword
            ? "Password atualizada com sucesso."
            : "Password definida com sucesso.")
      );
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      await refreshProfile();
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors) {
        setPasswordErrors({
          current_password: backendErrors.current_password?.[0],
          new_password: backendErrors.new_password?.[0],
          new_password_confirmation: backendErrors.new_password_confirmation?.[0],
        });
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          (hasPassword
            ? "Não foi possível atualizar a password. Verifique os dados introduzidos."
            : "Não foi possível definir a password. Verifique os dados introduzidos.");
        notify.error(errorMsg);
      }
    } finally {
      setSavingPassword(false);
    }
  }

  if (isLoading || !user?.email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">A carregar os seus dados de conta...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">A Minha Conta</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerir dados pessoais, segurança e privacidade
        </p>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { id: "profile", label: "Perfil" },
          { id: "security", label: "Segurança" },
          { id: "privacy", label: "Privacidade & RGPD" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() =>
              setActiveTab(t.id as "profile" | "security" | "privacy")
            }
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                Dados Pessoais
              </h3>
              {role === "staff" && (
                <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border">
                  Apenas Leitura
                </span>
              )}
            </div>

            {role === "staff" ? (
              <div className="space-y-4">
                {/* Banner Informativo */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground mb-0.5">
                      Identificação Gerida Institucionalmente
                    </p>
                    <p>
                      Os seus dados de identificação e email institucional são geridos exclusivamente pela administração escolar para assegurar a consistência dos registos em toda a plataforma. Se necessitar de atualizar o seu nome ou email, por favor solicite a retificação junto da direção ou dos administradores escolares.
                    </p>
                  </div>
                </div>

                {/* Dados Informativos em Cartões de Leitura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Primeiro Nome
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {firstName || user.first_name || "—"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Último Nome
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {lastName || user.last_name || "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Email Institucional
                    </span>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {email || user.email || "—"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/70 bg-card">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      N.º Mecanográfico
                    </span>
                    <span className="text-sm font-mono font-semibold text-foreground">
                      {user.mecanografico || user.internal_number || "—"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-lg border border-border/40 bg-muted/10">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">
                      Perfil de Acesso
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      Assistente Operacional
                    </span>
                  </div>

                  {user.school_name && (
                    <div className="p-3 rounded-lg border border-border/40 bg-muted/10">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">
                        Escola Principal
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {user.school_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Primeiro Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (profileErrors.first_name) {
                          setProfileErrors((prev) => ({ ...prev, first_name: undefined }));
                        }
                      }}
                      placeholder="Ex: Miguel"
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                        profileErrors.first_name
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {profileErrors.first_name && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {profileErrors.first_name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Último Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (profileErrors.last_name) {
                          setProfileErrors((prev) => ({ ...prev, last_name: undefined }));
                        }
                      }}
                      placeholder="Ex: Silva"
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                        profileErrors.last_name
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {profileErrors.last_name && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {profileErrors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email Institucional <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (profileErrors.email) {
                        setProfileErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="utilizador@sgde.pt"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      profileErrors.email
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {profileErrors.email && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {profileErrors.email}
                    </p>
                  )}
                </div>

                {emailChanged && (
                  !hasPassword ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                      <p className="font-medium">Definição de palavra-passe necessária</p>
                      <p className="mt-1">
                        A sua conta ainda não tem uma palavra-passe definida. Para alterar o seu email, defina primeiro uma palavra-passe no separador <strong>Segurança</strong>.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">
                        Password atual <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={emailChangePassword}
                        onChange={(e) => {
                          setEmailChangePassword(e.target.value);
                          if (profileErrors.current_password) {
                            setProfileErrors((prev) => ({ ...prev, current_password: undefined }));
                          }
                        }}
                        placeholder="Confirme com a sua password atual"
                        className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                          profileErrors.current_password
                            ? "border-destructive focus:ring-destructive"
                            : "border-border focus:ring-ring"
                        }`}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Para mudar o email tem de confirmar a sua password.
                      </p>
                      {profileErrors.current_password && (
                        <p className="text-[11px] text-destructive mt-1 font-medium">
                          {profileErrors.current_password}
                        </p>
                      )}
                    </div>
                  )
                )}

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={
                    savingProfile ||
                    !firstName.trim() ||
                    !lastName.trim() ||
                    !email.trim() ||
                    (emailChanged && (!hasPassword || !emailChangePassword))
                  }
                  className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-xs"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      A guardar...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Guardar Alterações
                    </>
                  )}
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {hasPassword ? "Alterar Password" : "Definir Password"}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {hasPassword
              ? "Recomendamos que utilize uma password forte com letras, números e símbolos."
              : "A sua conta ainda não tem uma password definida. Defina uma password para poder entrar também diretamente com o seu email e password, além da autenticação por Google."}
          </p>
          <div className="space-y-4">
            {hasPassword && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Password Atual <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordErrors.current_password) {
                        setPasswordErrors((prev) => ({ ...prev, current_password: undefined }));
                      }
                    }}
                    placeholder="Introduza a sua password atual"
                    className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      passwordErrors.current_password
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {passwordErrors.current_password}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Nova Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.new_password) {
                      setPasswordErrors((prev) => ({ ...prev, new_password: undefined }));
                    }
                  }}
                  placeholder={`Mínimo de ${PASSWORD_MIN_LENGTH} caracteres`}
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    passwordErrors.new_password
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordErrors.new_password ? (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.new_password}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {PASSWORD_RULE_HINT}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Confirmar Nova Password <span className="text-destructive">*</span>
              </label>
              <input
                type="password"
                value={newPasswordConfirmation}
                onChange={(e) => {
                  setNewPasswordConfirmation(e.target.value);
                  if (passwordErrors.new_password_confirmation) {
                    setPasswordErrors((prev) => ({
                      ...prev,
                      new_password_confirmation: undefined,
                    }));
                  }
                }}
                placeholder="Repita a nova password"
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  passwordErrors.new_password_confirmation
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {passwordErrors.new_password_confirmation && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.new_password_confirmation}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword || (hasPassword && !currentPassword) || !newPassword || !newPasswordConfirmation}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-xs"
          >
            {savingPassword ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {hasPassword ? "A atualizar..." : "A guardar..."}
              </>
            ) : (
              <>
                <Shield size={14} />
                {hasPassword ? "Atualizar Password" : "Definir Password"}
              </>
            )}
          </button>
        </Card>
      )}

      {activeTab === "privacy" && (
        <div className="space-y-4">
          {/* Cartão de Portabilidade RGPD (disponível para todos os utilizadores) */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Portabilidade de Dados (RGPD)
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Descarregue uma cópia integral de todos os seus dados pessoais e de registo guardados na plataforma (perfil de utilizador, dados profissionais, morada e contactos de emergência) num documento PDF pronto a ler ou imprimir, ou em formato estruturado JSON (Artigos 15.º e 20.º do RGPD).
            </p>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || exportingData}
              className="inline-flex items-center gap-2 px-4 py-2 mr-2.5 mb-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {exportingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  A gerar documento PDF...
                </>
              ) : (
                <>
                  <FileText size={14} />
                  Descarregar Ficha de Dados Pessoais (PDF)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportingData}
              className="inline-flex items-center gap-2 px-3.5 py-2 mb-2 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium hover:bg-muted/60 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {exportingData ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  A descarregar dados...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Formato Estruturado (JSON)
                </>
              )}
            </button>
          </Card>

          {role === "admin" ? (
            <Card className="p-5 border-destructive/20">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Eliminar Conta de Administrador
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Ao eliminar a sua conta de administrador, os seus acessos serão revogados de imediato. Todo o histórico de operações criado por si na instituição (escalas, aprovações de ausências e configurações) será preservado de forma íntegra no sistema, sendo os seus dados de identificação pessoal devidamente anonimizados ao abrigo do RGPD.
              </p>
              <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground mb-4">
                <strong>Salvaguarda de Segurança:</strong> Esta operação exige que exista pelo menos mais um administrador ativo na instituição para garantir a continuidade da gestão escolar.
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deletingAccount}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors shadow-xs"
              >
                {deletingAccount ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A processar eliminação...
                  </>
                ) : (
                  <>
                    <X size={14} />
                    Eliminar e Anonimizar Conta
                  </>
                )}
              </button>
            </Card>
          ) : user.deactivation_requested || user.deactivation_requested_at ? (
            <Card className="p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Pedido de Anonimização Pendente
                  </h3>
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Em análise pela administração escolar
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Submeteu um pedido formal de anonimização e desativação dos seus dados cadastrais
                {user.deactivation_requested_at && (
                  <> em <strong className="text-foreground">{new Date(user.deactivation_requested_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></>
                )}. A administração da sua instituição foi notificada diretamente por email e através da plataforma para validar o processo.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs font-medium cursor-not-allowed"
                >
                  <CheckCircle size={14} className="text-amber-500" />
                  Pedido Submetido (Não é possível reenviar)
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Solicitar Desativação e Anonimização de Dados (RGPD)
              </h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Como assistente operacional com registo vinculado à gestão de escalas escolares, a sua conta não pode ser eliminada diretamente para salvaguarda da operação. Pode submeter aqui um pedido formal de desativação e anonimização de dados pessoais, que será enviado por email aos administradores da sua escola para validação do processo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeactivationReason("");
                  setShowRgpdConfirm(true);
                }}
                disabled={requestingDeactivation}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] dark:hover:bg-[#C8291A]/10 disabled:opacity-50 transition-colors"
              >
                {requestingDeactivation ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A submeter pedido...
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    Solicitar Desativação de Conta
                  </>
                )}
              </button>
            </Card>
          )}
        </div>
      )}

      {/* Confirmation Modal for Staff RGPD Request */}
      <ConfirmationModal
        open={showRgpdConfirm}
        onClose={() => setShowRgpdConfirm(false)}
        onConfirm={handleRequestDeactivation}
        title="Solicitar Anonimização e Desativação de Dados (RGPD)"
        description={
          <div className="space-y-3">
            <p>
              Tem a certeza que pretende solicitar a desativação da sua conta e a anonimização dos seus dados pessoais?
            </p>
            <p className="text-xs text-muted-foreground">
              Receberá um email de comprovativo do pedido e os administradores da sua instituição serão notificados de imediato na plataforma e por email para dar seguimento ao processo.
            </p>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Motivo do pedido (opcional):
              </label>
              <textarea
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                maxLength={1000}
                placeholder="Indique o motivo ou observações relevantes para o administrador..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20"
              />
            </div>
          </div>
        }
        confirmLabel={requestingDeactivation ? "A enviar..." : "Submeter Pedido aos Administradores"}
        cancelLabel="Cancelar"
        variant="warning"
      />

      {/* Confirmation Modal for Admin account deletion */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Eliminar Conta de Administrador"
        description="Tem a certeza que pretende eliminar a sua conta? Os seus acessos serão revogados e os seus dados pessoais serão anonimizados, preservando o histórico de todas as operações e escalas criadas por si no sistema. Esta ação não poderá ser concluída caso seja o único administrador ativo desta instituição."
        confirmLabel="Eliminar e Anonimizar"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

