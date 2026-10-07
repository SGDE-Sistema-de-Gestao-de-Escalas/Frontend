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
import { toast } from "sonner";
import {
  schools as INITIAL_SCHOOLS,
  absenceTypes as INITIAL_ABSENCE_TYPES,
  INITIAL_ADMINS,
} from "../../api/mockData";
import usersService from "../../api/services/users.service";
import schoolsService, { BackendSchoolResource } from "../../api/services/schools.service";
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

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<"schools" | "users" | "absence-types">("schools");
  const { refreshSchools: refreshGlobalSchools } = useSchool();

  // ── Schools state ─────────────────────────────────────────────────────────
  const [schoolsList, setSchoolsList] = useState<School[]>(
    INITIAL_SCHOOLS.map((s) => ({ ...s }))
  );
  const [loadingSchools, setLoadingSchools] = useState(false);
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
  const [schoolFormError, setSchoolFormError] = useState<string | null>(null);

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
      console.warn("Backend schools API offline or error, using local data fallback:", err);
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
    setSchoolFormError(null);
    setShowSchoolForm(true);
  }

  function openEditSchool(s: School) {
    setSchoolName(s.name);
    setSchoolAcronym(s.acronym || "");
    setSchoolAddress(s.address || "");
    setSchoolPhone(s.phone || "");
    setSchoolEmail(s.email || "");
    setSchoolEditId(s.id);
    setSchoolFormError(null);
    setShowSchoolForm(true);
  }

  async function handleSaveSchool() {
    if (!schoolName.trim()) {
      notify.error("O nome da escola é obrigatório.", "Dados Incompletos");
      return;
    }

    const derivedAcronym = (
      schoolAcronym.trim() ||
      schoolName
        .trim()
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 10)
    );

    const isEditing = schoolEditId !== null;
    setSavingSchool(true);
    setSchoolFormError(null);

    try {
      if (isEditing) {
        const res = await schoolsService.update(schoolEditId, {
          name: schoolName.trim(),
          acronym: derivedAcronym,
          address: schoolAddress.trim() || null,
          phone: schoolPhone.trim() || null,
          email: schoolEmail.trim() || null,
        });
        notify.success(res);
      } else {
        const res = await schoolsService.create({
          name: schoolName.trim(),
          acronym: derivedAcronym,
          address: schoolAddress.trim() || null,
          phone: schoolPhone.trim() || null,
          email: schoolEmail.trim() || null,
          active: true,
        });
        notify.success(res);
      }
      await fetchSchools();
      refreshGlobalSchools().catch(() => {});
      setShowSchoolForm(false);
    } catch (err: any) {
      const msg = getBackendErrorMessage(err);
      if (msg) {
        setSchoolFormError(msg);
      }
      if (!(err as any)?.__alreadyNotified) {
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
                    name: schoolName.trim(),
                    acronym: derivedAcronym,
                    address: schoolAddress.trim(),
                    phone: schoolPhone.trim(),
                    email: schoolEmail.trim() || undefined,
                  }
                : s
            )
          );
        } else {
          setSchoolsList((p) => [
            ...p,
            {
              id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
              name: schoolName.trim(),
              acronym: derivedAcronym,
              address: schoolAddress.trim(),
              phone: schoolPhone.trim(),
              email: schoolEmail.trim() || undefined,
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
  const [absenceTypesList, setAbsenceTypesList] = useState<AbsenceType[]>(
    INITIAL_ABSENCE_TYPES.map((t) => ({ ...t }))
  );
  const [showAbsenceTypeForm, setShowAbsenceTypeForm] = useState(false);
  const [absenceTypeEditId, setAbsenceTypeEditId] = useState<EntityId | null>(null);
  const [absenceTypeDeleteConfirm, setAbsenceTypeDeleteConfirm] = useState<AbsenceType | null>(null);
  const [absenceTypeName, setAbsenceTypeName] = useState("");
  const [absenceTypeRequiresDoc, setAbsenceTypeRequiresDoc] = useState(false);

  function openAddAbsenceType() {
    setAbsenceTypeName("");
    setAbsenceTypeRequiresDoc(false);
    setAbsenceTypeEditId(null);
    setShowAbsenceTypeForm(true);
  }

  function openEditAbsenceType(t: AbsenceType) {
    setAbsenceTypeName(t.name);
    setAbsenceTypeRequiresDoc(t.requiresDocument ?? t.requires_document ?? false);
    setAbsenceTypeEditId(t.id);
    setShowAbsenceTypeForm(true);
  }

  function handleSaveAbsenceType() {
    if (!absenceTypeName.trim()) return;
    if (absenceTypeEditId !== null) {
      setAbsenceTypesList((p) =>
        p.map((t) =>
          t.id === absenceTypeEditId
            ? {
                ...t,
                name: absenceTypeName,
                requiresDocument: absenceTypeRequiresDoc,
                requires_document: absenceTypeRequiresDoc,
              }
            : t
        )
      );
      notify.success("Tipo de falta atualizado com sucesso");
    } else {
      setAbsenceTypesList((p) => [
        ...p,
        {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          name: absenceTypeName,
          requiresDocument: absenceTypeRequiresDoc,
          requires_document: absenceTypeRequiresDoc,
        },
      ]);
      notify.success("Tipo de falta criado com sucesso");
    }
    setShowAbsenceTypeForm(false);
  }

  function deleteAbsenceType(id: EntityId) {
    setAbsenceTypesList((p) => p.filter((t) => t.id !== id));
    notify.success("Tipo de falta removido com sucesso");
    setAbsenceTypeDeleteConfirm(null);
  }

  // ── Admins state ──────────────────────────────────────────────────────────
  const [adminsList, setAdminsList] = useState<AdminUser[]>(
    INITIAL_ADMINS.map((a) => ({ ...a }))
  );
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEditId, setAdminEditId] = useState<EntityId | null>(null);
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminActive, setAdminActive] = useState(true);

  // Status toggle confirm modal state
  const [adminStatusConfirm, setAdminStatusConfirm] = useState<AdminUser | null>(null);

  // Delete confirm modal state
  const [adminDeleteConfirm, setAdminDeleteConfirm] = useState<AdminUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      try {
        setLoadingAdmins(true);
        const res = await usersService.getAll();
        if (isMounted && res?.data && Array.isArray(res.data)) {
          const mapped: AdminUser[] = res.data
            .filter((u) => !u.role || u.role === "admin")
            .map((u) => {
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
                delete_action: u.delete_action,
                delete_message: u.delete_message,
              };
            });
          if (mapped.length > 0) {
            setAdminsList(mapped);
          }
        }
      } catch (err) {
        console.warn("Backend users API not ready, using local data fallback:", err);
      } finally {
        if (isMounted) setLoadingAdmins(false);
      }
    }
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  function openAddAdmin() {
    setAdminFirstName("");
    setAdminLastName("");
    setAdminEmail("");
    setAdminActive(true);
    setAdminEditId(null);
    setShowAdminForm(true);
  }

  function openEditAdmin(admin: AdminUser) {
    setAdminFirstName(admin.first_name || "");
    setAdminLastName(admin.last_name || "");
    setAdminEmail(admin.email);
    setAdminActive(admin.is_active ?? admin.active ?? true);
    setAdminEditId(admin.id);
    setShowAdminForm(true);
  }

  async function handleSaveAdmin() {
    const fName = adminFirstName.trim();
    const lName = adminLastName.trim();
    if (!fName || !adminEmail.trim()) return;
    const fullName = [fName, lName].filter(Boolean).join(" ");
    const isEditing = adminEditId !== null;

    if (isEditing) {
      try {
        const updatePayload: any = {
          first_name: fName,
          last_name: lName,
          email: adminEmail.trim(),
        };
        // UpdateUserRequest aceita is_active apenas se for boolean e true (accepted)
        if (adminActive) {
          updatePayload.is_active = true;
        }

        const res = await usersService.update(adminEditId, updatePayload);
        notify.success(res);
      } catch (err: any) {
        console.warn("API update failed:", err);
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
                email: adminEmail.trim(),
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
          email: adminEmail.trim(),
        });
        if (res?.data?.id) {
          createdId = res.data.id;
        }
        notify.success(res);
      } catch (err: any) {
        console.warn("API create failed:", err);
        if (!(err as any)?.__alreadyNotified) {
          notify.error(err);
        }
      }

      const newAdmin: AdminUser = {
        id: createdId,
        first_name: fName,
        last_name: lName,
        email: adminEmail.trim(),
        role: "admin",
        active: adminActive,
        is_active: adminActive,
        created_at: new Date().toLocaleDateString("pt-PT"),
      };
      setAdminsList((prev) => [...prev, newAdmin]);
    }
    setShowAdminForm(false);
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
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Building2 size={24} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma escola registada.</p>
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
                {schoolFormError && (
                  <FeedbackNotification
                    type="error"
                    title="Erro ao guardar"
                    message={schoolFormError}
                    onClose={() => setSchoolFormError(null)}
                  />
                )}
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Nome da Escola *
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: EB1 Quinta das Flores"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Sigla / Código *
                    </label>
                    <input
                      type="text"
                      value={schoolAcronym}
                      onChange={(e) => setSchoolAcronym(e.target.value)}
                      placeholder="Ex: EB1QF"
                      maxLength={20}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background uppercase font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                      placeholder="213 000 000"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Morada
                  </label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="Rua, número, localidade"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="escola@sgde.pt"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
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
                    disabled={!schoolName.trim() || savingSchool}
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
            {adminsList.map((admin) => (
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
            ))}
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
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      placeholder="Ex: Miguel"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Último Nome
                    </label>
                    <input
                      type="text"
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      placeholder="Ex: Silva"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Email Institucional <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@sgde.pt"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
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
                    disabled={!adminFirstName.trim() || !adminEmail.trim()}
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
                </div>
              </div>
            ))}
          </div>
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
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={absenceTypeName}
                    onChange={(e) => setAbsenceTypeName(e.target.value)}
                    placeholder="Ex: Consulta Médica"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
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
                    disabled={!absenceTypeName.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {absenceTypeEditId !== null ? "Guardar Alterações" : "Criar Tipo"}
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
                <>
                  Tem a certeza que pretende eliminar permanentemente o tipo de falta{" "}
                  <strong className="text-foreground">{absenceTypeDeleteConfirm.name}</strong>?
                  Esta ação removerá esta categoria do catálogo de ausências.
                </>
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

