import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AGRUPAMENTO, schools as initialSchools } from "../api/mockData";
import schoolsService, { BackendSchoolResource } from "../api/services/schools.service";
import type { School } from "../types";

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
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
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

        if (mapped.length > 0) {
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
  }, []);

  const selectedSchool =
    schoolsList.find((s) => String(s.id) === String(selectedSchoolId)) ||
    (schoolsList.length > 0 ? schoolsList[0] : null);

  function setSchoolId(id: number | string) {
    if (String(id) === String(selectedSchoolId)) return;

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

