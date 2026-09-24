import React, { createContext, useContext, useState } from "react";
import { AGRUPAMENTO, schools as initialSchools } from "../api/mockData";
import type { School } from "../types";

export interface OperatingHours {
  startHour: number;
  endHour: number;
  open: string;
  close: string;
}

interface SchoolContextType {
  selectedSchoolId: number;
  selectedSchool: School;
  schools: School[];
  setSchoolId: (id: number) => void;
  agrupamento: typeof AGRUPAMENTO;
  updateSchool: (school: School) => void;
  addSchool: (school: Omit<School, "id">) => void;
  operatingHours: OperatingHours;
  updateOperatingHours: (hours: Partial<OperatingHours>) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schoolsList, setSchoolsList] = useState<School[]>(initialSchools);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(1);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    startHour: 7,
    endHour: 21,
    open: "07:30",
    close: "21:00",
  });

  const selectedSchool =
    schoolsList.find((s) => s.id === selectedSchoolId) || schoolsList[0];

  function setSchoolId(id: number) {
    setSelectedSchoolId(id);
  }

  function updateSchool(updated: School) {
    setSchoolsList((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }

  function addSchool(newSchool: Omit<School, "id">) {
    const nextId = Math.max(...schoolsList.map((s) => s.id), 0) + 1;
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

