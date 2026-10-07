import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AGRUPAMENTO, schools as initialSchools } from "../api/mockData";
import schoolsService, { BackendSchoolResource } from "../api/services/schools.service";
import type { School } from "../types";
import { useAuth } from "./AuthContext";

export interface OperatingHours {
  startHour: number;
  endHour: number;
  open: string;
  close: string;
}

interface SchoolContextType {
  selectedSchoolId: number | string | null;
  currentSchoolId: number | string | null;
  selectedSchool: School | null;
  schools: School[];
  setSchoolId: (id: number | string) => void;
  agrupamento: typeof AGRUPAMENTO;
  updateSchool: (school: School) => void;
  addSchool: (school: Omit<School, "id">) => void;
  refreshSchools: () => Promise<void>;
  operatingHours: OperatingHours;
  updateOperatingHours: (hours: Partial<OperatingHours>) => void;
  canSwitchSchool: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { role, user } = useAuth();
  const isStaff = role === "staff";
  const isAdmin = role === "admin";
  const canSwitchSchool = isAdmin;

  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | string | null>(() => {
    return localStorage.getItem("selected_school_id") || null;
  });
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    startHour: 7,
    endHour: 21,
    open: "07:30",
    close: "21:00",
  });

  // Sincronização do contexto escolar consoante o papel do utilizador:
  // - Assistentes (Staff): pertencem obrigatoriamente a uma escola atribuída (user.school_id)
  // - Administradores (Admin): têm acesso global a todas as escolas do agrupamento
  useEffect(() => {
    if (isStaff && user?.school_id) {
      const staffSchoolId = String(user.school_id);
      if (String(selectedSchoolId) !== staffSchoolId) {
        localStorage.setItem("selected_school_id", staffSchoolId);
        setSelectedSchoolId(user.school_id);
      }
    }
  }, [isStaff, user?.school_id]);

  const refreshSchools = async () => {
    try {
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

        if (isStaff && user?.school_id) {
          // Assistentes ficam restritos à sua escola
          const staffSchoolId = String(user.school_id);
          localStorage.setItem("selected_school_id", staffSchoolId);
          setSelectedSchoolId(user.school_id);
        } else if (mapped.length > 0) {
          // Administradores: valida se o ID atual existe na base de dados
          setSelectedSchoolId((currId) => {
            const exists = mapped.some((s) => String(s.id) === String(currId));
            if (!exists) {
              const firstActive = mapped.find((s) => s.active) || mapped[0];
              localStorage.setItem("selected_school_id", String(firstActive.id));
              return firstActive.id;
            }
            return currId;
          });
        } else {
          setSelectedSchoolId(null);
          localStorage.removeItem("selected_school_id");
        }
      }
    } catch (err) {
      console.warn("Could not fetch schools from API in SchoolContext:", err);
      // Mantém fallback caso a API esteja offline e ainda não haja escolas carregadas
      setSchoolsList((prev) => (prev.length > 0 ? prev : initialSchools));
    }
  };

  useEffect(() => {
    refreshSchools();
  }, [isStaff, user?.school_id]);

  const selectedSchool =
    schoolsList.find((s) => String(s.id) === String(selectedSchoolId)) ||
    (schoolsList.length > 0 ? schoolsList[0] : null);

  function setSchoolId(id: number | string) {
    if (String(id) === String(selectedSchoolId)) return;

    // Verificação de Acesso Frontend:
    // Assistentes não podem selecionar escolas arbitrárias; apenas a sua escola atribuída
    if (isStaff && user?.school_id && String(id) !== String(user.school_id)) {
      console.warn("Acesso negado: Assistentes apenas têm acesso à sua escola atribuída.");
      return;
    }

    // 1) Gravar primeiro no localStorage: o interceptor do Axios lê daqui o
    //    header X-School-ID, por isso tem de estar atualizado antes de qualquer refetch.
    localStorage.setItem("selected_school_id", String(id));

    // 2) Atualizar o estado: as queries que usam o schoolId na queryKey
    //    mudam de key e são pedidas de novo automaticamente.
    setSelectedSchoolId(id);

    // 3) Rede de segurança: invalida tudo o que está em cache, para apanhar
    //    queries que dependam da escola mas não tenham o schoolId na key.
    queryClient.invalidateQueries();
  }

  function updateSchool(updated: School) {
    setSchoolsList((prev) =>
      prev.map((s) => (String(s.id) === String(updated.id) ? updated : s))
    );
  }

  function addSchool(newSchool: Omit<School, "id">) {
    const nextId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setSchoolsList((prev) => [...prev, { ...newSchool, id: nextId }]);
  }

  function updateOperatingHours(hours: Partial<OperatingHours>) {
    setOperatingHours((prev) => ({ ...prev, ...hours }));
  }

  return (
    <SchoolContext.Provider
      value={{
        selectedSchoolId,
        currentSchoolId: selectedSchoolId,
        selectedSchool,
        schools: schoolsList,
        setSchoolId,
        agrupamento: AGRUPAMENTO,
        updateSchool,
        addSchool,
        refreshSchools,
        operatingHours,
        updateOperatingHours,
        canSwitchSchool,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return ctx;
}

