import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import usersService from "../../api/services/users.service";
import schoolsService, { BackendSchoolResource } from "../../api/services/schools.service";
import absenceTypesService from "../../api/services/absenceTypes.service";
import type { School, AbsenceType, AdminUser, EntityId } from "../../types";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Switch } from "../ui/switch";
import Modal from "../common/Modal";
import ConfirmationModal from "../common/ConfirmationModal";
import { ActionTooltip } from "../common/ActionTooltip";
import FeedbackNotification, {
  notify,
  getBackendErrorMessage,
  getBackendSuccessMessage,
} from "../common/FeedbackNotification";
import { useSchool } from "../../context/SchoolContext";
import { useAuth } from "../../context/AuthContext";

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<"schools" | "users" | "absence-types">("schools");
  const { refreshSchools: refreshGlobalSchools } = useSchool();
  const { user: currentUser } = useAuth();

  // ── Schools state ─────────────────────────────────────────────────────────
  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [savingSchool, setSavingSchool] = useState(false);
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [schoolEditId, setSchoolEditId] = useState<EntityId | null>(null);
  const [schoolStatusConfirm, setSchoolStatusConfirm] = useState<School | null>(null);
  const [schoolDeleteConfirm, setSchoolDeleteConfirm] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolAcronym, setSchoolAcronym] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolFormErrors, setSchoolFormErrors] = useState<{
    name?: string;
    acronym?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});

  const fetchSchools = async () => {
    try {
      setLoadingSchools(true);
      const res = await schoolsService.getAll();
      const rawList = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : null;
      if (rawList !== null) {
        const mapped: School[] = rawList.map((s: BackendSchoolResource) => ({
          id: s.id,
          name: s.name,
          acronym: s.acronym || undefined,
          address: s.address || "",
          phone: s.phone || "",
          email: s.email || undefined,
          active: s.active,
          assistants: s.assistants ?? s.assistants_count ?? 0,
          assistants_count: s.assistants_count ?? s.assistants ?? 0,
          can_delete: s.can_delete ?? true,
          cannot_delete_reason: s.cannot_delete_reason ?? null,
        }));
        setSchoolsList(mapped);
      }
    } catch (err) {
      console.warn("Backend schools API offline or error:", err);
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  function openAddSchool() {
    setSchoolName("");
    setSchoolAcronym("");
    setSchoolAddress("");
    setSchoolPhone("");
    setSchoolEmail("");
    setSchoolEditId(null);
    setSchoolFormErrors({});
    setShowSchoolForm(true);
  }

  function openEditSchool(s: School) {
    setSchoolName(s.name);
    setSchoolAcronym(s.acronym || "");
    setSchoolAddress(s.address || "");
    setSchoolPhone(s.phone || "");
    setSchoolEmail(s.email || "");
    setSchoolEditId(s.id);
    setSchoolFormErrors({});
    setShowSchoolForm(true);
  }

  async function handleSaveSchool() {
    const sName = schoolName.trim();
    const sAcronym = schoolAcronym.trim();
    const sEmail = schoolEmail.trim();

    const errors: { name?: string; acronym?: string; email?: string } = {};

    if (!sName) {
      errors.name = "O nome da escola é obrigatório.";
    }

    if (!sAcronym) {
      errors.acronym = "A sigla ou código é obrigatória.";
    } else if (sAcronym.length > 20) {
      errors.acronym = "A sigla não pode ter mais de 20 caracteres.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (sEmail && !emailRegex.test(sEmail)) {
      errors.email = "Por favor introduza um endereço de email válido.";
    }

    if (Object.keys(errors).length > 0) {
      setSchoolFormErrors(errors);
      return;
    }

    setSchoolFormErrors({});
    const isEditing = schoolEditId !== null;
    setSavingSchool(true);

    try {
      if (isEditing) {
        const res = await schoolsService.update(schoolEditId, {
          name: sName,
          acronym: sAcronym,
          address: schoolAddress.trim() || null,
          phone: schoolPhone.trim() || null,
          email: sEmail || null,
        });
        notify.success(res);
      } else {
        const res = await schoolsService.create({
          name: sName,
          acronym: sAcronym,
          address: schoolAddress.trim() || null,
          phone: schoolPhone.trim() || null,
          email: sEmail || null,
          active: true,
        });
        notify.success(res);
      }
      await fetchSchools();
      refreshGlobalSchools().catch(() => {});
      setShowSchoolForm(false);
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors) {
        setSchoolFormErrors({
          name: backendErrors.name?.[0],
          acronym: backendErrors.acronym?.[0],
          email: backendErrors.email?.[0],
          phone: backendErrors.phone?.[0],
          address: backendErrors.address?.[0],
        });
      }

      // Notifica com toast apenas se não for erro de validação (422)
      if (err?.response?.status !== 422 && !(err as any)?.__alreadyNotified) {
        notify.error(err);
      }

      // Fallback local caso a API não esteja disponível:
      if (!err?.response) {
        if (isEditing) {
          setSchoolsList((p) =>
            p.map((s) =>
              s.id === schoolEditId
                ? {
                    ...s,
                    name: sName,
                    acronym: sAcronym,
                    address: schoolAddress.trim(),
                    phone: schoolPhone.trim(),
                    email: sEmail || undefined,
                  }
                : s
            )
          );
        } else {
          setSchoolsList((p) => [
            ...p,
            {
              id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              name: sName,
              acronym: sAcronym,
              address: schoolAddress.trim(),
              phone: schoolPhone.trim(),
              email: sEmail || undefined,
              active: true,
              assistants: 0,
              can_delete: true,
            },
          ]);
        }
        setShowSchoolForm(false);
      }
    } finally {
      setSavingSchool(false);
    }
  }

  async function toggleSchoolActive(id: EntityId) {
    const currentSchool = schoolsList.find((s) => s.id === id);
    if (!currentSchool) return;
    const newStatus = !currentSchool.active;

    try {
      const res = await schoolsService.toggleActive(id, newStatus);
      notify.success(res);
      await fetchSchools();
      refreshGlobalSchools().catch(() => {});
    } catch (err: any) {
      if (!(err as any)?.__alreadyNotified) {
        notify.error(err);
      }
      // Fallback local apenas se erro de rede offline:
      if (!err?.response) {
        setSchoolsList((p) =>
          p.map((s) => (s.id === id ? { ...s, active: newStatus } : s))
        );
      }
    }
  }

  async function deleteSchool(id: EntityId) {
    try {
      const res = await schoolsService.delete(id);
      notify.success(res);
      await fetchSchools();
      refreshGlobalSchools().catch(() => {});
    } catch (err: any) {
      if (!(err as any)?.__alreadyNotified) {
        notify.error(err);
      }
      // Se for erro de rede offline (sem resposta do backend), remove localmente como fallback:
      if (!err?.response) {
        setSchoolsList((p) => p.filter((s) => s.id !== id));
      }
    } finally {
      setSchoolDeleteConfirm(null);
    }
  }

  // ── Absence types state ───────────────────────────────────────────────────
  // ── Absence types state ───────────────────────────────────────────────────
  const [absenceTypesList, setAbsenceTypesList] = useState<AbsenceType[]>([]);
  const [loadingAbsenceTypes, setLoadingAbsenceTypes] = useState(true);
  const [savingAbsenceType, setSavingAbsenceType] = useState(false);
  const [showAbsenceTypeForm, setShowAbsenceTypeForm] = useState(false);
  const [absenceTypeEditId, setAbsenceTypeEditId] = useState<EntityId | null>(null);
  const [absenceTypeDeleteConfirm, setAbsenceTypeDeleteConfirm] = useState<AbsenceType | null>(null);
  const [absenceTypeName, setAbsenceTypeName] = useState("");
  const [absenceTypeRequiresDoc, setAbsenceTypeRequiresDoc] = useState(false);
  const [absenceTypeFormError, setAbsenceTypeFormError] = useState<string | null>(null);

  const fetchAbsenceTypes = async () => {
    try {
      setLoadingAbsenceTypes(true);
      const res: any = await absenceTypesService.getAll();
      const rawList = Array.isArray(res) ? res : res?.data || [];
      if (Array.isArray(rawList)) {
        const mapped: AbsenceType[] = rawList.map((item: any) => ({
          id: item.id,
          name: item.name,
          requiresDocument: Boolean(item.requires_document),
          requires_document: Boolean(item.requires_document),
          can_delete: item.can_delete ?? true,
          cannot_delete_reason: item.cannot_delete_reason ?? null,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        setAbsenceTypesList(mapped);
      }
    } catch (err) {
      console.warn("Backend absence-types API not available:", err);
    } finally {
      setLoadingAbsenceTypes(false);
    }
  };

  useEffect(() => {
    fetchAbsenceTypes();
  }, []);

  function openAddAbsenceType() {
    setAbsenceTypeName("");
    setAbsenceTypeRequiresDoc(false);
    setAbsenceTypeEditId(null);
    setAbsenceTypeFormError(null);
    setShowAbsenceTypeForm(true);
  }

  function openEditAbsenceType(t: AbsenceType) {
    setAbsenceTypeName(t.name);
    setAbsenceTypeRequiresDoc(t.requiresDocument ?? t.requires_document ?? false);
    setAbsenceTypeEditId(t.id);
    setAbsenceTypeFormError(null);
    setShowAbsenceTypeForm(true);
  }

  async function handleSaveAbsenceType() {
    const trimmed = absenceTypeName.trim();
    if (!trimmed) {
      setAbsenceTypeFormError("O nome do tipo de falta é obrigatório.");
      return;
    }

    setAbsenceTypeFormError(null);
    setSavingAbsenceType(true);

    const isEditing = absenceTypeEditId !== null;

    try {
      if (isEditing) {
        const res = await absenceTypesService.update(absenceTypeEditId, {
          name: trimmed,
          requires_document: absenceTypeRequiresDoc,
        });
        notify.success(res?.message || "Tipo de falta atualizado com sucesso.");
      } else {
        const res = await absenceTypesService.create({
          name: trimmed,
          requires_document: absenceTypeRequiresDoc,
        });
        notify.success(res?.message || "Tipo de falta criado com sucesso.");
      }

      await fetchAbsenceTypes();
      setShowAbsenceTypeForm(false);
    } catch (err: any) {
      const status = err?.response?.status;
      const backendErrors = err?.response?.data?.errors;
      const errorMsg =
        backendErrors?.name?.[0] ||
        err?.response?.data?.message ||
        "Erro ao guardar o tipo de falta.";

      if (status === 422) {
        setAbsenceTypeFormError(errorMsg);
      } else {
        notify.error(errorMsg);
      }

      // Fallback local se a API estiver offline
      if (!err?.response) {
        if (isEditing) {
          setAbsenceTypesList((p) =>
            p.map((t) =>
              t.id === absenceTypeEditId
                ? {
                    ...t,
                    name: trimmed,
                    requiresDocument: absenceTypeRequiresDoc,
                    requires_document: absenceTypeRequiresDoc,
                  }
                : t
            )
          );
        } else {
          setAbsenceTypesList((p) => [
            ...p,
            {
              id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              name: trimmed,
              requiresDocument: absenceTypeRequiresDoc,
              requires_document: absenceTypeRequiresDoc,
              can_delete: true,
            },
          ]);
        }
        setShowAbsenceTypeForm(false);
      }
    } finally {
      setSavingAbsenceType(false);
    }
  }

  async function deleteAbsenceType(id: EntityId) {
    try {
      const res = await absenceTypesService.delete(id);
      setAbsenceTypesList((p) => p.filter((t) => t.id !== id));
      notify.success(res?.message || "Tipo de falta removido com sucesso.");
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMsg =
        err?.response?.data?.message ||
        "Não foi possível remover este tipo de falta.";

      if (status === 409) {
        // Conflito: existem faltas associadas a este tipo
        notify.error(
          errorMsg,
          undefined,
          "Impossível Eliminar"
        );
      } else {
        notify.error(errorMsg);
      }
    } finally {
      setAbsenceTypeDeleteConfirm(null);
    }
  }

  // ── Admins state ──────────────────────────────────────────────────────────
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEditId, setAdminEditId] = useState<EntityId | null>(null);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminActive, setAdminActive] = useState(true);
  const [adminFormErrors, setAdminFormErrors] = useState<{
    first_name?: string;
    last_name?: string;
    email?: string;
  }>({});

  // Status toggle confirm modal state
  const [adminStatusConfirm, setAdminStatusConfirm] = useState<AdminUser | null>(null);

  // Delete confirm modal state
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState<AdminUser | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingAdmins(true);
      const res = await usersService.getAll();
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : null;

      if (rawList !== null) {
        const mapped: AdminUser[] = rawList
          .filter((u: any) => {
            // Regra 1: Apenas administradores
            if (u.role && u.role !== "admin") return false;
            // Regra 2: Excluir o utilizador atualmente autenticado (por ID ou email)
            if (currentUser?.id && String(u.id) === String(currentUser.id)) return false;
            if (currentUser?.email && u.email?.toLowerCase() === currentUser.email?.toLowerCase()) return false;
            return true;
          })
          .map((u: any) => {
            const fName = u.first_name || (u.name ? u.name.split(" ")[0] : "");
            const lName = u.last_name || (u.name ? u.name.split(" ").slice(1).join(" ") : "");
            return {
              id: u.id,
              first_name: fName,
              last_name: lName,
              email: u.email,
              role: (u.role as "admin") || "admin",
              is_active: u.is_active,
              active: u.is_active,
              created_at: u.created_at ? new Date(u.created_at).toLocaleDateString("pt-PT") : undefined,
              can_delete: u.can_delete ?? true,
              cannot_delete_reason: u.cannot_delete_reason ?? null,
              delete_action: u.delete_action || "hard_delete",
              delete_message: u.delete_message,
            };
          });

        setAdminsList(mapped);
      }
    } catch (err) {
      console.warn("Backend users API not ready or error:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.id, currentUser?.email]);

  function openAddAdmin() {
    setAdminFirstName("");
    setAdminLastName("");
    setAdminEmail("");
    setAdminActive(true);
    setAdminEditId(null);
    setAdminFormErrors({});
    setShowAdminForm(true);
  }

  function openEditAdmin(admin: AdminUser) {
    setAdminFirstName(admin.first_name || "");
    setAdminLastName(admin.last_name || "");
    setAdminEmail(admin.email);
    setAdminActive(admin.is_active ?? admin.active ?? true);
    setAdminEditId(admin.id);
    setAdminFormErrors({});
    setShowAdminForm(true);
  }

  async function handleSaveAdmin() {
    const fName = adminFirstName.trim();
    const lName = adminLastName.trim();
    const emailVal = adminEmail.trim();

    const errors: { first_name?: string; last_name?: string; email?: string } = {};

    if (!fName) {
      errors.first_name = "O primeiro nome é obrigatório.";
    }

    if (!lName) {
      errors.last_name = "O último nome é obrigatório.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal) {
      errors.email = "O email institucional é obrigatório.";
    } else if (!emailRegex.test(emailVal)) {
      errors.email = "Por favor introduza um endereço de email válido.";
    }

    if (Object.keys(errors).length > 0) {
      setAdminFormErrors(errors);
      return;
    }

    setAdminFormErrors({});
    const isEditing = adminEditId !== null;

    if (isEditing) {
      try {
        const updatePayload: any = {
          first_name: fName,
          last_name: lName,
          email: emailVal,
        };
        // UpdateUserRequest aceita is_active apenas se for boolean e true (accepted)
        if (adminActive) {
          updatePayload.is_active = true;
        }

        const res = await usersService.update(adminEditId, updatePayload);
        notify.success(res);
        await fetchUsers();
        setShowAdminForm(false);
      } catch (err: any) {
        console.warn("API update failed:", err);
        const backendErrors = err?.response?.data?.errors;
        if (backendErrors) {
          setAdminFormErrors({
            first_name: backendErrors.first_name?.[0],
            last_name: backendErrors.last_name?.[0],
            email: backendErrors.email?.[0],
          });
        }
        if (!(err as any)?.__alreadyNotified) {
          notify.error(err);
        }
      }

      setAdminsList((prev) =>
        prev.map((a) =>
          a.id === adminEditId
            ? {
                ...a,
                first_name: fName,
                last_name: lName,
                email: emailVal,
                active: adminActive,
                is_active: adminActive,
              }
            : a
        )
      );
    } else {
      let createdId: EntityId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `admin-${Date.now()}`;

      try {
        // StoreUserRequest do backend espera first_name, last_name e email
        const res = await usersService.create({
          first_name: fName,
          last_name: lName,
          email: emailVal,
        });
        if (res?.data?.id) {
          createdId = res.data.id;
        }
        notify.success(res);
        await fetchUsers();
        setShowAdminForm(false);
      } catch (err: any) {
        console.warn("API create failed:", err);
        const backendErrors = err?.response?.data?.errors;
        if (backendErrors) {
          setAdminFormErrors({
            first_name: backendErrors.first_name?.[0],
            last_name: backendErrors.last_name?.[0],
            email: backendErrors.email?.[0],
          });
        }
        if (!(err as any)?.__alreadyNotified) {
          notify.error(err);
        }

        // Fallback local caso offline
        const newAdmin: AdminUser = {
          id: createdId,
          first_name: fName,
          last_name: lName,
          email: emailVal,
          role: "admin",
          active: adminActive,
          is_active: adminActive,
          created_at: new Date().toLocaleDateString("pt-PT"),
          can_delete: true,
          delete_action: "hard_delete",
        };
        setAdminsList((prev) => [...prev, newAdmin]);
        setShowAdminForm(false);
      }
    }
  }

  async function handleConfirmStatusToggle() {
    if (!adminStatusConfirm) return;
    const target = adminStatusConfirm;
    const currentActive = target.is_active ?? target.active ?? true;
    const newStatus = !currentActive;

    try {
      if (!newStatus) {
        // Desativar conta usa POST /api/users/{id}/deactivate
        const res = await usersService.deactivate(target.id);
        notify.success(res);
      } else {
        // Reativar conta usa PUT /api/users/{id} com is_active: true
        const res = await usersService.update(target.id, { is_active: true });
        notify.success(res);
      }

      setAdminsList((prev) =>
        prev.map((a) =>
          a.id === target.id
            ? { ...a, active: newStatus, is_active: newStatus }
            : a
        )
      );
    } catch (err: any) {
      console.warn("API status toggle failed:", err);
      if (!(err as any)?.__alreadyNotified) {
        notify.error(err);
      }
    } finally {
      setAdminStatusConfirm(null);
    }
  }

  async function handleConfirmDeleteAdmin() {
    if (!adminDeleteConfirm) return;
    const targetId = adminDeleteConfirm.id;

    try {
      const res = await usersService.delete(targetId);
      setAdminsList((prev) => prev.filter((a) => a.id !== targetId));
      notify.success(res);
    } catch (err: any) {
      console.warn("API delete failed:", err);
      if (!(err as any)?.__alreadyNotified) {
        notify.error(err);
      }
    } finally {
      setAdminDeleteConfirm(null);
    }
  }

  const TABS = [
    {
      id: "schools" as const,
      label: "Escolas",
      icon: <Building2 size={14} />,
    },
    {
      id: "users" as const,
      label: "Administradores",
      icon: <ShieldCheck size={14} />,
    },
    {
      id: "absence-types" as const,
      label: "Tipos de Falta",
      icon: <FileText size={14} />,
    },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Settings size={16} className="text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          Configurações da Plataforma
        </h2>
      </div>
      <p className="text-sm text-muted-foreground ml-10 mb-6">
        Gestão de escolas, utilizadores administradores e parametrizações do sistema
      </p>

      {/* Resumo da plataforma */}
      <div className="mb-6 p-4 rounded-xl border border-border bg-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Escolas Ativas",
              value: schoolsList.filter((s) => s.active).length,
            },
            {
              label: "Administradores",
              value: adminsList.filter((a) => a.active).length,
            },
            {
              label: "Assistentes Registados",
              value: schoolsList.reduce((a, s) => a + s.assistants, 0),
            },
            { label: "Total de Escolas", value: schoolsList.length },
          ].map((kpi) => (
            <div key={kpi.label} className="text-center py-1">
              <p className="text-xl font-mono font-bold text-foreground">
                {kpi.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Escolas */}
      {activeTab === "schools" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Escolas Registadas
            </h3>
            <button
              type="button"
              onClick={openAddSchool}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={13} />
              Nova Escola
            </button>
          </div>
          {loadingSchools ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-xs">A carregar escolas...</span>
            </div>
          ) : schoolsList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50 flex flex-col items-center justify-center">
              <Building2 size={28} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">
                Nenhuma escola registada
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Comece por criar a primeira escola para poder gerir assistentes, horários e configurações.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schoolsList.map((school) => (
                <div
                  key={school.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    school.active
                      ? "border-border bg-card"
                      : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        school.active ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <Building2
                        size={16}
                        className={
                          school.active ? "text-primary" : "text-muted-foreground"
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`text-sm font-semibold ${
                            school.active
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {school.name}
                        </p>
                        {school.acronym && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-muted text-muted-foreground border border-border">
                            {school.acronym}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            school.active
                              ? "bg-[#0E7C59]/10 text-[#0E7C59]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {school.active ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      {school.address && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin size={10} />
                          <span className="truncate">{school.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground flex-wrap">
                        {school.phone && <span>{school.phone}</span>}
                        {school.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={10} />
                            {school.email}
                          </span>
                        )}
                        <span>
                          {school.assistants} assistente
                          {school.assistants !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <ActionTooltip content="Editar escola">
                        <button
                          type="button"
                          onClick={() => openEditSchool(school)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                        >
                          <Pencil size={13} className="text-muted-foreground" />
                        </button>
                      </ActionTooltip>

                      <ActionTooltip content={school.active ? "Desativar escola" : "Ativar escola"}>
                        <button
                          type="button"
                          onClick={() => setSchoolStatusConfirm(school)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                        >
                          {school.active ? (
                            <XCircle size={13} className="text-muted-foreground hover:text-amber-600" />
                          ) : (
                            <CheckCircle
                              size={13}
                              className="text-muted-foreground hover:text-emerald-600"
                            />
                          )}
                        </button>
                      </ActionTooltip>

                      <ActionTooltip
                        content={
                          school.can_delete === false ? (
                            <div className="flex items-start gap-1.5 text-left py-0.5">
                              <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>
                                {school.cannot_delete_reason ||
                                  (school.assistants > 0
                                    ? `Não é possível eliminar: existem ${school.assistants} assistentes associados.`
                                    : "Não é possível eliminar esta escola.")}
                              </span>
                            </div>
                          ) : (
                            "Eliminar escola"
                          )
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (school.can_delete !== false) {
                              setSchoolDeleteConfirm(school);
                            }
                          }}
                          disabled={school.can_delete === false}
                          className={`p-1.5 rounded transition-colors ${
                            school.can_delete === false
                              ? "opacity-30 cursor-not-allowed text-muted-foreground"
                              : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          }`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </ActionTooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSchoolForm && (
            <Modal
              title={schoolEditId !== null ? "Editar Escola" : "Nova Escola"}
              subtitle="Dados de identificação da escola"
              onClose={() => !savingSchool && setShowSchoolForm(false)}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Nome da Escola <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      if (schoolFormErrors.name) {
                        setSchoolFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Ex: EB1 Quinta das Flores"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      schoolFormErrors.name
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                    autoFocus
                  />
                  {schoolFormErrors.name && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {schoolFormErrors.name}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Sigla / Código <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={schoolAcronym}
                      onChange={(e) => {
                        setSchoolAcronym(e.target.value);
                        if (schoolFormErrors.acronym) {
                          setSchoolFormErrors((prev) => ({ ...prev, acronym: undefined }));
                        }
                      }}
                      placeholder="Ex: EB1QF"
                      maxLength={20}
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background uppercase font-mono focus:outline-none focus:ring-1 ${
                        schoolFormErrors.acronym
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {schoolFormErrors.acronym && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {schoolFormErrors.acronym}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={schoolPhone}
                      onChange={(e) => {
                        setSchoolPhone(e.target.value);
                        if (schoolFormErrors.phone) {
                          setSchoolFormErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder="213 000 000"
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 ${
                        schoolFormErrors.phone
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {schoolFormErrors.phone && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {schoolFormErrors.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Morada
                  </label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => {
                      setSchoolAddress(e.target.value);
                      if (schoolFormErrors.address) {
                        setSchoolFormErrors((prev) => ({ ...prev, address: undefined }));
                      }
                    }}
                    placeholder="Rua, número, localidade"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      schoolFormErrors.address
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {schoolFormErrors.address && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {schoolFormErrors.address}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => {
                      setSchoolEmail(e.target.value);
                      if (schoolFormErrors.email) {
                        setSchoolFormErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="escola@sgde.pt"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      schoolFormErrors.email
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {schoolFormErrors.email && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {schoolFormErrors.email}
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={savingSchool}
                    onClick={() => setShowSchoolForm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSchool}
                    disabled={!schoolName.trim() || !schoolAcronym.trim() || savingSchool}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    {savingSchool && <Loader2 size={14} className="animate-spin" />}
                    {schoolEditId !== null ? "Guardar Alterações" : "Criar Escola"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Confirmation Modal for toggling school status */}
          <ConfirmationModal
            open={schoolStatusConfirm !== null}
            onClose={() => setSchoolStatusConfirm(null)}
            onConfirm={() => {
              if (schoolStatusConfirm) {
                toggleSchoolActive(schoolStatusConfirm.id);
                setSchoolStatusConfirm(null);
              }
            }}
            title={schoolStatusConfirm?.active ? "Desativar Escola" : "Ativar Escola"}
            description={
              schoolStatusConfirm?.active ? (
                <>
                  Tem a certeza que pretende desativar a escola{" "}
                  <strong className="text-foreground">{schoolStatusConfirm.name}</strong>?
                  A escola deixará de estar disponível para alocação de novos turnos e horários de assistentes.
                </>
              ) : (
                <>
                  Deseja ativar a escola{" "}
                  <strong className="text-foreground">{schoolStatusConfirm?.name}</strong>?
                  A escola voltará a estar disponível para escalas de serviço e planeamento de pessoal.
                </>
              )
            }
            confirmLabel={schoolStatusConfirm?.active ? "Confirmar Desativação" : "Confirmar Ativação"}
            cancelLabel="Cancelar"
            variant={schoolStatusConfirm?.active ? "warning" : "success"}
          />

          {/* Confirmation Modal for deleting school */}
          <ConfirmationModal
            open={schoolDeleteConfirm !== null}
            onClose={() => setSchoolDeleteConfirm(null)}
            onConfirm={() => {
              if (schoolDeleteConfirm) {
                deleteSchool(schoolDeleteConfirm.id);
                setSchoolDeleteConfirm(null);
              }
            }}
            title="Eliminar Escola"
            description={
              schoolDeleteConfirm ? (
                <>
                  Tem a certeza que pretende eliminar a escola{" "}
                  <strong className="text-foreground">{schoolDeleteConfirm.name}</strong>?
                  Esta ação removerá o registo do estabelecimento e configurações associadas.
                </>
              ) : ""
            }
            confirmLabel="Eliminar Escola"
            cancelLabel="Cancelar"
            variant="danger"
          />
        </>
      )}

      {/* Tab: Administradores */}
      {activeTab === "users" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Utilizadores Administradores
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gestão de utilizadores com permissões de administração da plataforma
              </p>
            </div>
            <button
              type="button"
              onClick={openAddAdmin}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
            >
              <UserPlus size={13} />
              Novo Administrador
            </button>
          </div>

          <div className="space-y-3">
            {loadingAdmins ? (
              <div className="p-8 text-center border border-border rounded-xl bg-card flex flex-col items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">A carregar administradores...</p>
              </div>
            ) : adminsList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50">
                <Shield size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Nenhum outro administrador registado
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Para além da sua conta, não existem outros utilizadores com perfil de administrador na plataforma.
                </p>
              </div>
            ) : (
              adminsList.map((admin) => (
              <div
                key={admin.id}
                className={`p-4 rounded-xl border transition-colors ${
                  admin.active
                    ? "border-border bg-card"
                    : "border-border/50 bg-muted/20 opacity-80"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 font-mono shadow-xs ${
                      admin.active
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {((admin.first_name?.[0] || "") + (admin.last_name?.[0] || "")) ||
                      admin.email?.slice(0, 2).toUpperCase() ||
                      "AD"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`text-sm font-semibold ${
                          admin.active
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {[admin.first_name, admin.last_name].filter(Boolean).join(" ") ||
                          admin.email ||
                          "Administrador"}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          admin.active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {admin.active ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                        Administrador
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} className="text-muted-foreground/70" />
                        <span className="font-mono">{admin.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                      {admin.created_at && (
                        <span>Registado em: {admin.created_at}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ActionTooltip content="Editar utilizador">
                      <button
                        type="button"
                        onClick={() => openEditAdmin(admin)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </ActionTooltip>

                    <ActionTooltip content={admin.active ? "Inativar utilizador" : "Ativar utilizador"}>
                      <button
                        type="button"
                        onClick={() => setAdminStatusConfirm(admin)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          admin.active
                            ? "hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600"
                            : "hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600"
                        }`}
                      >
                        {admin.active ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </button>
                    </ActionTooltip>

                    <ActionTooltip
                      content={
                        admin.can_delete === false ? (
                          <div className="flex items-start gap-1.5 text-left py-0.5">
                            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>
                              {admin.cannot_delete_reason || "Não é possível eliminar este utilizador."}
                            </span>
                          </div>
                        ) : (
                          "Eliminar utilizador"
                        )
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (admin.can_delete !== false) {
                            setAdminDeleteConfirm(admin);
                          }
                        }}
                        disabled={admin.can_delete === false}
                        className={`p-1.5 rounded-lg transition-colors ${
                          admin.can_delete === false
                            ? "opacity-30 cursor-not-allowed text-muted-foreground"
                            : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </ActionTooltip>
                  </div>
                </div>
              </div>
            )))}
          </div>

          {/* Modal: Criar / Editar Administrador */}
          {showAdminForm && (
            <Modal
              title={adminEditId !== null ? "Editar Administrador" : "Novo Administrador"}
              subtitle="Preencha os dados de acesso e identificação"
              onClose={() => setShowAdminForm(false)}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Primeiro Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={adminFirstName}
                      onChange={(e) => {
                        setAdminFirstName(e.target.value);
                        if (adminFormErrors.first_name) {
                          setAdminFormErrors((prev) => ({ ...prev, first_name: undefined }));
                        }
                      }}
                      placeholder="Ex: Miguel"
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                        adminFormErrors.first_name
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {adminFormErrors.first_name && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {adminFormErrors.first_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Último Nome <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={adminLastName}
                      onChange={(e) => {
                        setAdminLastName(e.target.value);
                        if (adminFormErrors.last_name) {
                          setAdminFormErrors((prev) => ({ ...prev, last_name: undefined }));
                        }
                      }}
                      placeholder="Ex: Silva"
                      className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                        adminFormErrors.last_name
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                    {adminFormErrors.last_name && (
                      <p className="text-[11px] text-destructive mt-1 font-medium">
                        {adminFormErrors.last_name}
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
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      if (adminFormErrors.email) {
                        setAdminFormErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="admin@sgde.pt"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      adminFormErrors.email
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {adminFormErrors.email && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {adminFormErrors.email}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Conta Ativa
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Permite acesso imediato ao painel de administração
                    </p>
                  </div>
                  <Switch
                    checked={adminActive}
                    onCheckedChange={setAdminActive}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminForm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAdmin}
                    disabled={!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {adminEditId !== null ? "Guardar Alterações" : "Criar Administrador"}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Modal: Confirmar Alteração de Estado (Inativar / Ativar) */}
          <ConfirmationModal
            open={adminStatusConfirm !== null}
            onClose={() => setAdminStatusConfirm(null)}
            onConfirm={handleConfirmStatusToggle}
            title={adminStatusConfirm?.active ? "Inativar Administrador" : "Reativar Administrador"}
            description={
              adminStatusConfirm?.active ? (
                <>
                  Tem a certeza que pretende inativar o administrador{" "}
                  <strong className="text-foreground">
                    {[adminStatusConfirm.first_name, adminStatusConfirm.last_name].filter(Boolean).join(" ") ||
                      adminStatusConfirm.email}
                  </strong>{" "}
                  ({adminStatusConfirm.email})?
                  Enquanto a conta estiver inativa, o utilizador ficará bloqueado e não conseguirá iniciar sessão no sistema.
                </>
              ) : (
                <>
                  Deseja reativar o acesso de{" "}
                  <strong className="text-foreground">
                    {[adminStatusConfirm?.first_name, adminStatusConfirm?.last_name].filter(Boolean).join(" ") ||
                      adminStatusConfirm?.email}
                  </strong>{" "}
                  ({adminStatusConfirm?.email})?
                  O utilizador voltará a ter permissões de administração na plataforma.
                </>
              )
            }
            confirmLabel={adminStatusConfirm?.active ? "Confirmar Inativação" : "Confirmar Reativação"}
            cancelLabel="Cancelar"
            variant={adminStatusConfirm?.active ? "warning" : "success"}
          />

          {/* Modal: Confirmar Eliminação de Administrador */}
          <ConfirmationModal
            open={adminDeleteConfirm !== null}
            onClose={() => setAdminDeleteConfirm(null)}
            onConfirm={handleConfirmDeleteAdmin}
            title={
              adminDeleteConfirm?.delete_action === "hard_delete"
                ? "Eliminar Administrador"
                : "Remover Administrador"
            }
            description={
              adminDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Tem a certeza que pretende eliminar o administrador{" "}
                    <strong className="text-foreground">
                      {[adminDeleteConfirm.first_name, adminDeleteConfirm.last_name].filter(Boolean).join(" ") ||
                        adminDeleteConfirm.email}
                    </strong>{" "}
                    ({adminDeleteConfirm.email})?
                  </p>

                  {/* Mensagem vinda da API apresentada com alinhamento justificado apenas quando fornecida pelo backend */}
                  {adminDeleteConfirm.delete_message && (
                    <div
                      className={`py-2.5 px-3.5 rounded-lg border text-xs leading-relaxed text-justify transition-colors ${
                        adminDeleteConfirm.delete_action === "hard_delete"
                          ? "bg-destructive/10 text-destructive border-destructive/20 font-medium"
                          : "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/20"
                      }`}
                    >
                      {adminDeleteConfirm.delete_message}
                    </div>
                  )}
                </div>
              ) : ""
            }
            confirmLabel={
              adminDeleteConfirm?.delete_action === "hard_delete"
                ? "Eliminar Definitivamente"
                : "Confirmar Remoção"
            }
            cancelLabel="Cancelar"
            variant={adminDeleteConfirm?.delete_action === "hard_delete" ? "danger" : "warning"}
          />
        </>
      )}

      {/* Tab: Tipos de Falta */}
      {activeTab === "absence-types" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tipos de Falta
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Categorias utilizadas no registo de ausências
              </p>
            </div>
            <button
              type="button"
              onClick={openAddAbsenceType}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors"
            >
              <Plus size={13} />
              Novo Tipo
            </button>
          </div>
          {loadingAbsenceTypes ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">A carregar tipos de falta...</span>
            </div>
          ) : absenceTypesList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-xl bg-card/50 flex flex-col items-center justify-center">
              <FileText size={28} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">
                Nenhum tipo de falta registado
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Comece por criar os tipos de falta para que assistentes e administradores possam justificar e registar ausências.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {absenceTypesList.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {(t.requiresDocument ?? t.requires_document) ? (
                        <span className="flex items-center gap-1">
                          <Paperclip size={10} />
                          Requer documento comprovativo
                        </span>
                      ) : (
                        "Sem documento obrigatório"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ActionTooltip content="Editar tipo de falta">
                      <button
                        type="button"
                        onClick={() => openEditAbsenceType(t)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <Pencil size={13} className="text-muted-foreground" />
                      </button>
                    </ActionTooltip>

                    {t.can_delete === false ? (
                      <ActionTooltip
                        content={
                          t.cannot_delete_reason ||
                          "Este tipo de falta tem faltas associadas e não pode ser eliminado."
                        }
                      >
                        <span className="p-1.5 cursor-not-allowed opacity-40">
                          <Trash2 size={13} className="text-muted-foreground" />
                        </span>
                      </ActionTooltip>
                    ) : (
                      <ActionTooltip content="Eliminar tipo de falta">
                        <button
                          type="button"
                          onClick={() => setAbsenceTypeDeleteConfirm(t)}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2
                            size={13}
                            className="text-muted-foreground hover:text-destructive"
                          />
                        </button>
                      </ActionTooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAbsenceTypeForm && (
            <Modal
              title={
                absenceTypeEditId !== null
                  ? "Editar Tipo de Falta"
                  : "Novo Tipo de Falta"
              }
              subtitle="Parametrização do tipo de ausência"
              onClose={() => setShowAbsenceTypeForm(false)}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Nome <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={absenceTypeName}
                    onChange={(e) => {
                      setAbsenceTypeName(e.target.value);
                      if (absenceTypeFormError) setAbsenceTypeFormError(null);
                    }}
                    placeholder="Ex: Consulta Médica"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                      absenceTypeFormError
                        ? "border-destructive focus:ring-destructive"
                        : "border-border focus:ring-ring"
                    }`}
                  />
                  {absenceTypeFormError && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {absenceTypeFormError}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Requer documento comprovativo
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ativa o upload obrigatório no registo da falta
                    </p>
                  </div>
                  <Switch
                    checked={absenceTypeRequiresDoc}
                    onCheckedChange={setAbsenceTypeRequiresDoc}
                    className="data-[state=checked]:bg-accent"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAbsenceTypeForm(false)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbsenceType}
                    disabled={savingAbsenceType || !absenceTypeName.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {savingAbsenceType ? (
                      <>
                        <Loader2 size={14} className="animate-spin inline mr-1" />
                        A guardar...
                      </>
                    ) : absenceTypeEditId !== null ? (
                      "Guardar Alterações"
                    ) : (
                      "Criar Tipo"
                    )}
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {/* Confirmation Modal for deleting absence type */}
          <ConfirmationModal
            open={absenceTypeDeleteConfirm !== null}
            onClose={() => setAbsenceTypeDeleteConfirm(null)}
            onConfirm={() => {
              if (absenceTypeDeleteConfirm) {
                deleteAbsenceType(absenceTypeDeleteConfirm.id);
              }
            }}
            title="Eliminar Tipo de Falta"
            description={
              absenceTypeDeleteConfirm ? (
                <div className="space-y-3">
                  <p>
                    Tem a certeza que pretende eliminar permanentemente o tipo de falta{" "}
                    <strong className="text-foreground">{absenceTypeDeleteConfirm.name}</strong>?
                  </p>
                  {absenceTypeDeleteConfirm.cannot_delete_reason && (
                    <div className="py-2.5 px-3.5 rounded-lg border text-xs leading-relaxed bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/20">
                      {absenceTypeDeleteConfirm.cannot_delete_reason}
                    </div>
                  )}
                </div>
              ) : ""
            }
            confirmLabel="Eliminar Tipo"
            cancelLabel="Cancelar"
            variant="danger"
          />
        </>
      )}
    </div>
  );
}

