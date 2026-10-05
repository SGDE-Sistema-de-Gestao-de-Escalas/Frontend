import React, { createContext, useContext, useState, useEffect } from "react";
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
  selectedSchoolId: number | string;
  selectedSchool: School;
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
  const [schoolsList, setSchoolsList] = useState<School[]>(initialSchools);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | string>(() => {
    return localStorage.getItem("selected_school_id") || 1;
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
      }
    } catch (err) {
      console.warn("Could not fetch schools from API in SchoolContext:", err);
    }
  };

  useEffect(() => {
    refreshSchools();
  }, []);

  const selectedSchool =
    schoolsList.find((s) => String(s.id) === String(selectedSchoolId)) || schoolsList[0] || initialSchools[0];

  function setSchoolId(id: number | string) {
    setSelectedSchoolId(id);
    localStorage.setItem("selected_school_id", String(id));
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

