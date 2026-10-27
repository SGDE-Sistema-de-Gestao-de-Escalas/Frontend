import { useState } from "react";
import {
  ChevronLeft,
  Download,
  FileCheck,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Card } from "../ui/card";
import { Switch } from "../ui/switch";
import DatePicker from "../common/DatePicker";
import ActionTooltip from "../common/ActionTooltip";
import { notify } from "../common/FeedbackNotification";
import { useCreateAssistant, useUpdateAssistant } from "../../hooks/api/useAssistants";
import assistantsService from "../../api/services/assistants.service";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import type { Assistant, CreateAssistantPayload, EntityId } from "../../types";

interface AddEditAssistantProps {
  onSave: (id?: EntityId) => void;
  onCancel: () => void;
  onBack?: () => void;
  isEdit?: boolean;
  initialActive?: boolean;
  assistant?: Assistant | null;
}

export default function AddEditAssistant({
  onSave,
  onCancel,
  isEdit = false,
  initialActive = true,
  assistant = null,
}: AddEditAssistantProps) {
  useDocumentTitle(isEdit ? "Editar Assistente" : "Novo Assistente");

  // Helper to ensure empty string instead of null, undefined or dash placeholder
  const clean = (val: string | null | undefined) => (!val || val.trim() === "—" || val.trim() === "-" ? "" : val);

  const [isActive, setIsActive] = useState<boolean>(
    assistant ? (assistant.is_active ?? assistant.active ?? true) : initialActive
  );

  // Form states for Personal Data
  const [firstName, setFirstName] = useState<string>(() => {
    if (assistant?.first_name) return clean(assistant.first_name);
    if (assistant?.name) return clean(assistant.name.split(" ")[0]) || "";
    return "";
  });
  const [lastName, setLastName] = useState<string>(() => {
    if (assistant?.last_name) return clean(assistant.last_name);
    if (assistant?.name) {
      const parts = assistant.name.split(" ");
      return clean(parts.slice(1).join(" ")) || "";
    }
    return "";
  });
  const [internalNumber, setInternalNumber] = useState<string>(() => {
    return clean(assistant?.internal_number || assistant?.mecanografico || assistant?.staffNumber);
  });
  const [email, setEmail] = useState<string>(clean(assistant?.email));
  const [phone, setPhone] = useState<string>(clean(assistant?.phone));
  const [birthDate, setBirthDate] = useState<string>(clean(assistant?.birth_date));
  const [admissionDate, setAdmissionDate] = useState<string>(clean(assistant?.admission_date));

  // Fiscal / SSN
  const [nif, setNif] = useState<string>(clean(assistant?.nif));
  const [socialSecurityNumber, setSocialSecurityNumber] = useState<string>(
    clean(assistant?.social_security_number)
  );

  // Criminal Record
  const [hasCriminalRecord, setHasCriminalRecord] = useState<boolean>(
    assistant?.has_criminal_record ?? true
  );
  const [criminalRecordExpiry, setCriminalRecordExpiry] = useState<string>(
    clean(assistant?.criminal_record_expiry)
  );
  const [criminalRecordFile, setCriminalRecordFile] = useState<File | null>(null);
  const [removeExistingCriminalRecord, setRemoveExistingCriminalRecord] = useState<boolean>(false);
  const [isDownloadingRecord, setIsDownloadingRecord] = useState<boolean>(false);

  // Address
  const [addressStreet, setAddressStreet] = useState<string>(clean(assistant?.address_street));
  const [addressZipCode, setAddressZipCode] = useState<string>(
    clean(assistant?.address_zip_code)
  );
  const [addressCity, setAddressCity] = useState<string>(clean(assistant?.address_city));

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState<string>(
    clean(assistant?.emergency_contact_name)
  );
  const [emergencyPhone, setEmergencyPhone] = useState<string>(
    clean(assistant?.emergency_contact_phone)
  );
  const [emergencyKinship, setEmergencyKinship] = useState<string>(
    clean(assistant?.emergency_contact_kinship)
  );

  // Availability / Transfer (managed directly on the profile page)
  const availableForTransfer =
    assistant?.available_for_transfer ?? assistant?.availableForTransfer ?? false;

  // Errors state
  const [formErrors, setFormErrors] = useState<{
    first_name?: string;
    last_name?: string;
    internal_number?: string;
    email?: string;
    phone?: string;
    nif?: string;
    social_security_number?: string;
    birth_date?: string;
    address_zip_code?: string;
    address_street?: string;
    address_city?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_kinship?: string;
    criminal_record?: string;
    criminal_record_file?: string;
    criminal_record_expiry?: string;
  }>({});

  const createMutation = useCreateAssistant();
  const updateMutation = useUpdateAssistant();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function clearError(field: keyof typeof formErrors) {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleFileSelected(file: File) {
    clearError("criminal_record");
    clearError("criminal_record_file");

    const validMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    const validExts = [".pdf", ".jpg", ".jpeg", ".png"];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!validMimes.includes(file.type) && !hasValidExt) {
      setFormErrors((prev) => ({
        ...prev,
        criminal_record: "O registo criminal deve ser um ficheiro do tipo: pdf, jpg, jpeg ou png.",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        criminal_record: "O registo criminal não pode exceder 5MB.",
      }));
      return;
    }

    setCriminalRecordFile(file);
    setRemoveExistingCriminalRecord(false);
  }

  async function handleDownloadExistingRecord() {
    if (!assistant?.id) return;
    setIsDownloadingRecord(true);
    try {
      await assistantsService.openOrDownloadCriminalRecord(
        assistant.id,
        assistant.criminal_record_name || `registo_criminal_${assistant.id}.pdf`
      );
    } catch {
      notify.error("Não foi possível transferir o documento do registo criminal.", "Erro no Download");
    } finally {
      setIsDownloadingRecord(false);
    }
  }

  async function handleSaveAssistant() {
    const errs: typeof formErrors = {};

    // 1. Campos obrigatórios
    if (!firstName.trim()) {
      errs.first_name = "O primeiro nome é obrigatório.";
    } else if (firstName.trim().length > 255) {
      errs.first_name = "O primeiro nome não pode ter mais de 255 carateres.";
    }

    if (!lastName.trim()) {
      errs.last_name = "O apelido é obrigatório.";
    } else if (lastName.trim().length > 255) {
      errs.last_name = "O apelido não pode ter mais de 255 carateres.";
    }

    if (!internalNumber.trim()) {
      errs.internal_number = "O número mecanográfico é obrigatório.";
    } else if (internalNumber.trim().length > 50) {
      errs.internal_number = "O número mecanográfico não pode ter mais de 50 carateres.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errs.email = "O email institucional é obrigatório.";
    } else if (!emailRegex.test(email.trim())) {
      errs.email = "Por favor, introduza um endereço de email válido.";
    } else if (email.trim().length > 255) {
      errs.email = "O email não pode ter mais de 255 carateres.";
    }

    // 2. Telefone
    if (phone.trim() && phone.trim().length > 20) {
      errs.phone = "O número de telefone não pode ter mais de 20 carateres.";
    }

    // 3. NIF (9 dígitos)
    const cleanNif = nif.replace(/\s+/g, "");
    if (cleanNif && !/^\d{9}$/.test(cleanNif)) {
      errs.nif = "O NIF tem de conter exatamente 9 dígitos.";
    }

    // 4. Segurança Social (11 dígitos)
    const cleanNss = socialSecurityNumber.replace(/\s+/g, "");
    if (cleanNss && !/^\d{11}$/.test(cleanNss)) {
      errs.social_security_number = "O número de Segurança Social tem de conter exatamente 11 dígitos.";
    }

    // 5. Data de nascimento
    if (birthDate) {
      const today = new Date().toISOString().split("T")[0];
      if (birthDate >= today) {
        errs.birth_date = "A data de nascimento tem de ser anterior à data de hoje.";
      }
    }

    // 6. Código postal
    if (addressZipCode.trim() && !/^\d{4}-\d{3}$/.test(addressZipCode.trim())) {
      errs.address_zip_code = "O código postal tem de seguir o formato 0000-000.";
    }

    // 7. Limites de texto
    if (addressStreet.trim().length > 255) {
      errs.address_street = "A morada não pode ter mais de 255 carateres.";
    }
    if (addressCity.trim().length > 100) {
      errs.address_city = "A localidade não pode ter mais de 100 carateres.";
    }
    if (emergencyName.trim().length > 255) {
      errs.emergency_contact_name = "O nome de emergência não pode ter mais de 255 carateres.";
    }
    if (emergencyPhone.trim().length > 20) {
      errs.emergency_contact_phone = "O telefone de emergência não pode ter mais de 20 carateres.";
    }
    if (emergencyKinship.trim().length > 50) {
      errs.emergency_contact_kinship = "O parentesco não pode ter mais de 50 carateres.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      notify.error("Por favor, corrija os erros assinalados no formulário.", "Dados Inválidos");
      return;
    }

    if (formErrors.criminal_record || formErrors.criminal_record_file) {
      notify.error("Por favor, corrija os erros no ficheiro do registo criminal.", "Dados Inválidos");
      return;
    }

    setFormErrors({});

    const payload: CreateAssistantPayload & { remove_criminal_record?: boolean } = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      internal_number: internalNumber.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      nif: cleanNif || undefined,
      social_security_number: cleanNss || undefined,
      birth_date: birthDate || undefined,
      admission_date: admissionDate || undefined,
      criminal_record_expiry: hasCriminalRecord ? (criminalRecordExpiry || undefined) : undefined,
      address_street: addressStreet.trim() || undefined,
      address_zip_code: addressZipCode.trim() || undefined,
      address_city: addressCity.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      emergency_contact_kinship: emergencyKinship.trim() || undefined,
      available_for_transfer: availableForTransfer,
    };

    if (criminalRecordFile) {
      payload.criminal_record = criminalRecordFile;
    } else if (removeExistingCriminalRecord || !hasCriminalRecord) {
      if (assistant?.has_criminal_record) {
        payload.remove_criminal_record = true;
      }
    }

    try {
      if (isEdit && assistant?.id) {
        await updateMutation.mutateAsync({ id: assistant.id, data: payload });
        onSave(assistant.id);
      } else {
        const res = await createMutation.mutateAsync(payload);
        const newId = (res as any)?.data?.id || (res as any)?.id;
        onSave(newId);
      }
    } catch (err: any) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors && typeof backendErrors === "object") {
        const mapped: typeof formErrors = {};
        for (const [key, msgs] of Object.entries(backendErrors)) {
          if (Array.isArray(msgs) && msgs.length > 0) {
            mapped[key as keyof typeof formErrors] = msgs[0] as string;
          }
        }
        setFormErrors(mapped);
      }
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? "Editar Assistente" : "Novo Assistente"}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit
              ? `Altere os dados do perfil de ${assistant?.name || `${firstName} ${lastName}`.trim() || "Assistente"}`
              : "Preencha os dados para criar o perfil"}
          </p>
        </div>
      </div>

      {/* Form Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identificação */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Identificação & Conta
            </h4>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-medium ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {isActive ? "Assistente Ativo" : "Assistente Inativo"}
              </span>
              <ActionTooltip content={isActive ? "Inativar Assistente" : "Ativar Assistente"}>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </ActionTooltip>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Primeiro Nome *
              </label>
              <input
                type="text"
                placeholder="Ex: Ana"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError("first_name");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.first_name
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.first_name && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.first_name}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Apelido *
              </label>
              <input
                type="text"
                placeholder="Ex: Ferreira"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError("last_name");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.last_name
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.last_name && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.last_name}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Nº Mecanográfico *
              </label>
              <input
                type="text"
                placeholder="Ex: AST-0042"
                value={internalNumber}
                onChange={(e) => {
                  setInternalNumber(e.target.value);
                  clearError("internal_number");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 ${
                  formErrors.internal_number
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.internal_number && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.internal_number}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Email Institucional *
              </label>
              <input
                type="email"
                placeholder="Ex: ana.ferreira@escola.pt"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.email
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.email && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Telefone de Contacto
              </label>
              <input
                type="tel"
                placeholder="Ex: 912 345 678"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearError("phone");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.phone
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.phone && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Data de Nascimento
              </label>
              <DatePicker
                value={birthDate}
                onChange={(val) => {
                  setBirthDate(val);
                  clearError("birth_date");
                }}
                className="w-full"
              />
              {formErrors.birth_date && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.birth_date}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Data de Admissão
              </label>
              <DatePicker
                value={admissionDate}
                onChange={setAdmissionDate}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Informação Fiscal & SSN */}
        <Card className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 mb-4 border-b border-border/50">
            Dados Fiscais & Segurança Social
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                NIF (Número de Identificação Fiscal)
              </label>
              <input
                type="text"
                placeholder="9 dígitos (Ex: 123456789)"
                maxLength={9}
                value={nif}
                onChange={(e) => {
                  setNif(e.target.value.replace(/\D/g, ""));
                  clearError("nif");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 ${
                  formErrors.nif
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.nif && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.nif}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Número de Segurança Social (NISS)
              </label>
              <input
                type="text"
                placeholder="11 dígitos (Ex: 12345678901)"
                maxLength={11}
                value={socialSecurityNumber}
                onChange={(e) => {
                  setSocialSecurityNumber(e.target.value.replace(/\D/g, ""));
                  clearError("social_security_number");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 ${
                  formErrors.social_security_number
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.social_security_number && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.social_security_number}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Morada */}
        <Card className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 mb-4 border-b border-border/50">
            Morada Residencial
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Rua / Logradouro
              </label>
              <input
                type="text"
                placeholder="Ex: Rua das Flores, 12, 3º Dto"
                value={addressStreet}
                onChange={(e) => {
                  setAddressStreet(e.target.value);
                  clearError("address_street");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.address_street
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.address_street && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.address_street}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Código Postal
                </label>
                <input
                  type="text"
                  placeholder="0000-000"
                  maxLength={8}
                  value={addressZipCode}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^\d-]/g, "");
                    if (v.length === 4 && !v.includes("-") && e.target.value.length > addressZipCode.length) {
                      v = v + "-";
                    }
                    setAddressZipCode(v);
                    clearError("address_zip_code");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background font-mono focus:outline-none focus:ring-1 ${
                    formErrors.address_zip_code
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                {formErrors.address_zip_code && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.address_zip_code}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Localidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lisboa"
                  value={addressCity}
                  onChange={(e) => {
                    setAddressCity(e.target.value);
                    clearError("address_city");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    formErrors.address_city
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                {formErrors.address_city && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.address_city}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Contacto de Emergência */}
        <Card className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 mb-4 border-b border-border/50">
            Contacto de Emergência
          </h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Nome da Pessoa de Contacto
              </label>
              <input
                type="text"
                placeholder="Ex: Maria Ferreira"
                value={emergencyName}
                onChange={(e) => {
                  setEmergencyName(e.target.value);
                  clearError("emergency_contact_name");
                }}
                className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                  formErrors.emergency_contact_name
                    ? "border-destructive focus:ring-destructive"
                    : "border-border focus:ring-ring"
                }`}
              />
              {formErrors.emergency_contact_name && (
                <p className="text-[11px] text-destructive mt-1 font-medium">
                  {formErrors.emergency_contact_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Grau de Parentesco / Relação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cônjuge, Pai, Irmão"
                  value={emergencyKinship}
                  onChange={(e) => {
                    setEmergencyKinship(e.target.value);
                    clearError("emergency_contact_kinship");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    formErrors.emergency_contact_kinship
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                {formErrors.emergency_contact_kinship && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.emergency_contact_kinship}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Telefone de Emergência
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 910 000 000"
                  value={emergencyPhone}
                  onChange={(e) => {
                    setEmergencyPhone(e.target.value);
                    clearError("emergency_contact_phone");
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-lg border bg-input-background focus:outline-none focus:ring-1 ${
                    formErrors.emergency_contact_phone
                      ? "border-destructive focus:ring-destructive"
                      : "border-border focus:ring-ring"
                  }`}
                />
                {formErrors.emergency_contact_phone && (
                  <p className="text-[11px] text-destructive mt-1 font-medium">
                    {formErrors.emergency_contact_phone}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Registo Criminal & Documentação */}
        <Card className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-3 mb-4 border-b border-border/50">
            Registo Criminal & Conformidade
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Certificado de Registo Criminal
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Comprovativo obrigatório para funções com menores.
                </p>
              </div>
              <Switch
                checked={hasCriminalRecord}
                onCheckedChange={(checked) => {
                  setHasCriminalRecord(checked);
                  if (!checked && assistant?.has_criminal_record) {
                    setRemoveExistingCriminalRecord(true);
                    setCriminalRecordFile(null);
                  }
                }}
              />
            </div>

            {hasCriminalRecord && (
              <div className="pt-4 border-t border-border/40 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Data de Validade do Certificado
                  </label>
                  <DatePicker
                    value={criminalRecordExpiry}
                    onChange={(val) => {
                      setCriminalRecordExpiry(val);
                      clearError("criminal_record_expiry");
                    }}
                    className="w-full"
                  />
                  {formErrors.criminal_record_expiry && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {formErrors.criminal_record_expiry}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Documento do Registo Criminal
                  </label>

                  {/* 1. Novo ficheiro selecionado localmente */}
                  {criminalRecordFile ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {criminalRecordFile.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {(criminalRecordFile.size / 1024 / 1024).toFixed(2)} MB • Pronto a carregar
                          </p>
                        </div>
                      </div>
                      <ActionTooltip content="Remover ficheiro selecionado">
                        <button
                          type="button"
                          onClick={() => setCriminalRecordFile(null)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </ActionTooltip>
                    </div>
                  ) : assistant?.has_criminal_record && !removeExistingCriminalRecord ? (
                    /* 2. Ficheiro existente no servidor */
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0">
                          <FileCheck size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {assistant.criminal_record_name || "Certificado_Registo_Criminal.pdf"}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Documento ativo no servidor
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ActionTooltip content="Descarregar ficheiro">
                          <button
                            type="button"
                            onClick={handleDownloadExistingRecord}
                            disabled={isDownloadingRecord}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            {isDownloadingRecord ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Download size={13} />
                            )}
                            <span>Ver</span>
                          </button>
                        </ActionTooltip>
                        <ActionTooltip content="Substituir por outro documento">
                          <label
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors"
                          >
                            <Upload size={13} />
                            <span>Substituir</span>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileSelected(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </ActionTooltip>
                        <ActionTooltip content="Eliminar documento atual">
                          <button
                            type="button"
                            onClick={() => setRemoveExistingCriminalRecord(true)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </ActionTooltip>
                      </div>
                    </div>
                  ) : removeExistingCriminalRecord ? (
                    /* 3. Marcado para remoção */
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        O documento existente será removido ao guardar.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRemoveExistingCriminalRecord(false)}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Desfazer
                        </button>
                        <label className="text-xs font-medium text-primary hover:underline cursor-pointer">
                          Carregar outro
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelected(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    /* 4. Dropzone para carregar novo ficheiro */
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleFileSelected(f);
                      }}
                      className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20 text-center"
                    >
                      <div className="p-2 rounded-full bg-muted text-muted-foreground">
                        <Upload size={16} />
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        Clique para selecionar ou arraste o ficheiro
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Formatos suportados: PDF, JPG, PNG (máx. 5 MB)
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelected(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  {(formErrors.criminal_record || formErrors.criminal_record_file) && (
                    <p className="text-[11px] text-destructive mt-1 font-medium">
                      {formErrors.criminal_record || formErrors.criminal_record_file}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>


      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveAssistant}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? "Guardar Alterações" : "Criar Assistente"}
        </button>
      </div>
    </div>
  );
}
