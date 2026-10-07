import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Loader2,
  Save,
  Shield,
  Upload,
  X,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Role } from "../../types";
import { Card } from "../ui/card";
import DatePicker from "../common/DatePicker";
import ConfirmationModal from "../common/ConfirmationModal";
import { notify } from "../common/FeedbackNotification";
import { useAuth } from "../../context/AuthContext";
import authService from "../../api/services/auth.service";

interface AccountProfilePageProps {
  role?: Role;
}

export default function AccountProfilePage({
  role: propRole,
}: AccountProfilePageProps) {
  const { user, role: contextRole, refreshProfile, updateUserLocal } = useAuth();
  const role = propRole || contextRole || "admin";

  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "privacy"
  >("profile");

  // ── Profile fields state ──────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  }>({});

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

  // ── Privacy state ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRgpdConfirm, setShowRgpdConfirm] = useState(false);

  // ── Profile save handler ──────────────────────────────────────────────────
  async function handleSaveProfile() {
    const fName = firstName.trim();
    const lName = lastName.trim();
    const mail = email.trim();

    const errors: { first_name?: string; last_name?: string; email?: string } = {};

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

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setSavingProfile(true);

    try {
      await authService.updateProfile(
        { first_name: fName, last_name: lName, email: mail },
        user.id
      );
      updateUserLocal({ first_name: fName, last_name: lName, email: mail });
      await refreshProfile();
      notify.success("Dados pessoais atualizados com sucesso.");
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors) {
        setProfileErrors({
          first_name: backendErrors.first_name?.[0],
          last_name: backendErrors.last_name?.[0],
          email: backendErrors.email?.[0],
        });
      }

      if (err?.response?.status !== 422) {
        // Fallback local caso o endpoint não esteja acessível
        updateUserLocal({ first_name: fName, last_name: lName, email: mail });
        notify.success("Dados pessoais guardados localmente.");
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

    if (!curr) {
      errors.current_password = "A password atual é obrigatória.";
    }
    if (!next) {
      errors.new_password = "A nova password é obrigatória.";
    } else if (next.length < 8) {
      errors.new_password = "A nova password deve conter pelo menos 8 caracteres.";
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
      const res = await authService.changePassword({
        current_password: curr,
        new_password: next,
        new_password_confirmation: nextConf,
      });
      notify.success(res?.message || "Password atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
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
          "Não foi possível atualizar a password. Verifique os dados introduzidos.";
        notify.error(errorMsg);
      }
    } finally {
      setSavingPassword(false);
    }
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
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Dados Pessoais
            </h3>
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
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile || !firstName.trim() || !lastName.trim() || !email.trim()}
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
          </Card>

          {role === "staff" && (
            <Card className="p-5 border-[#D97706]/30 bg-[#FEF9EC]/50">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle
                  size={16}
                  className="text-[#D97706] flex-shrink-0 mt-0.5"
                />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Registo Criminal
                  </h3>
                  <p className="text-xs text-[#D97706] mt-0.5">
                    O seu registo criminal expira em 15 Mar 2026. Submeta um novo
                    documento.
                  </p>
                </div>
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:border-accent/50 transition-colors mb-3">
                <Upload
                  size={16}
                  className="text-muted-foreground flex-shrink-0"
                />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Clique para submeter novo registo criminal
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    PDF, JPG · Max 5MB
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">
                  Data de Validade
                </label>
                <DatePicker value="" onChange={() => {}} className="w-full" />
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "security" && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Alterar Password
          </h3>
          <div className="space-y-4">
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
                  placeholder="Mínimo de 8 caracteres"
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
              {passwordErrors.new_password && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {passwordErrors.new_password}
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
            disabled={savingPassword || !currentPassword || !newPassword || !newPasswordConfirmation}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-xs"
          >
            {savingPassword ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                A atualizar...
              </>
            ) : (
              <>
                <Shield size={14} />
                Atualizar Password
              </>
            )}
          </button>
        </Card>
      )}

      {activeTab === "privacy" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Direito ao Esquecimento (RGPD)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Solicitar a eliminação de todos os dados pessoais. Esta operação é
              irreversível e sujeita a análise.
            </p>
            <button
              type="button"
              onClick={() => setShowRgpdConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#C8291A]/30 text-[#C8291A] text-sm font-medium hover:bg-[#FEF2F2] transition-colors"
            >
              <XCircle size={14} />
              Solicitar Eliminação de Dados
            </button>
          </Card>
          <Card className="p-5 border-destructive/20">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Eliminar Conta
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Elimina permanentemente esta conta e revoga todos os acessos.
              Irreversível.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors shadow-xs"
            >
              <X size={14} />
              Eliminar Conta
            </button>
          </Card>
        </div>
      )}

      {/* Confirmation Modal for RGPD Right to be Forgotten */}
      <ConfirmationModal
        open={showRgpdConfirm}
        onClose={() => setShowRgpdConfirm(false)}
        onConfirm={() => {
          setShowRgpdConfirm(false);
          notify.success(
            "Pedido de eliminação de dados (RGPD) registado com sucesso. Os dados pessoais serão anonimizados no BackOffice."
          );
        }}
        title="Direito ao Esquecimento (RGPD)"
        description="Tem a certeza que pretende solicitar a eliminação dos seus dados pessoais? Os seus dados de identificação serão anonimizados no sistema e os seus acessos revogados, mantendo-se apenas o registo histórico legal e operacional dos turnos e atividades já realizadas."
        confirmLabel="Confirmar Pedido RGPD"
        cancelLabel="Cancelar"
        variant="warning"
      />

      {/* Confirmation Modal for account deletion */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          notify.success("Conta eliminada com sucesso. Os acessos foram revogados.");
        }}
        title="Eliminar Conta"
        description="Tem a certeza que pretende eliminar permanentemente esta conta? Esta operação é irreversível, revogará todos os acessos e os dados pessoais associados serão anonimizados na plataforma."
        confirmLabel="Eliminar Definitivamente"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

