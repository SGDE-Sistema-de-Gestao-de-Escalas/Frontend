import React, { createContext, useContext, useState } from "react";
import { AGRUPAMENTO, schools as initialSchools } from "../api/mockData";
import type { School } from "../types";

interface SchoolContextType {
  selectedSchoolId: number;
  selectedSchool: School;
  schools: School[];
  setSchoolId: (id: number) => void;
  agrupamento: typeof AGRUPAMENTO;
  updateSchool: (school: School) => void;
  addSchool: (school: Omit<School, "id">) => void;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schoolsList, setSchoolsList] = useState<School[]>(initialSchools);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(1);

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

