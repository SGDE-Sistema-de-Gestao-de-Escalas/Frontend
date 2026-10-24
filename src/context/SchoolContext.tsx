import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import schoolsService, { BackendSchoolResource } from "../api/services/schools.service";
import type { School, SchoolCluster } from "../types";
import { useAuth } from "./AuthContext";

const DEFAULT_AGRUPAMENTO: SchoolCluster = {
  id: 1,
  name: "Agrupamento de Escolas de Lisboa Norte",
  code: "AELN",
};

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
  isLoading: boolean;
  setSchoolId: (id: number | string) => void;
  agrupamento: SchoolCluster;
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
  const { role, user, isAuthenticated } = useAuth();
  const isStaff = role === "staff";
  const isAdmin = role === "admin";
  const canSwitchSchool = isAdmin;

  const [schoolsList, setSchoolsList] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | string | null>(() => {
    const stored = localStorage.getItem("selected_school_id") || null;
    if (stored) {
      apiClient.defaults.headers.common["X-School-ID"] = stored;
    }
    return stored;
  });
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    startHour: 7,
    endHour: 21,
    open: "07:30",
    close: "21:00",
  });

  useEffect(() => {
    if (isStaff && user?.school_id) {
      const staffSchoolId = String(user.school_id);
      if (String(selectedSchoolId) !== staffSchoolId) {
        localStorage.setItem("selected_school_id", staffSchoolId);
        apiClient.defaults.headers.common["X-School-ID"] = staffSchoolId;
        queryClient.cancelQueries();
        setSelectedSchoolId(user.school_id);
      }
    }
  }, [isStaff, user?.school_id]);

  const refreshSchools = async () => {
    setIsLoading(true);
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

        if (isStaff) {
          const matched = mapped.find(
            (s) =>
              (user?.school_id && String(s.id) === String(user.school_id)) ||
              (user?.school_name &&
                s.name.toLowerCase() === user.school_name.toLowerCase())
          ) || mapped.find((s) => s.active) || mapped[0];
          const staffSchoolId = String(matched?.id || user?.school_id || "");
          localStorage.setItem("selected_school_id", staffSchoolId);
          apiClient.defaults.headers.common["X-School-ID"] = staffSchoolId;
          setSelectedSchoolId(matched?.id || user?.school_id || null);
        } else if (mapped.length > 0) {
          setSelectedSchoolId((currId) => {
            const exists = mapped.some((s) => String(s.id) === String(currId));
            if (!exists) {
              const firstActive = mapped.find((s) => s.active) || mapped[0];
              localStorage.setItem("selected_school_id", String(firstActive.id));
              apiClient.defaults.headers.common["X-School-ID"] = String(firstActive.id);
              return firstActive.id;
            }
            return currId;
          });
        } else {
          setSelectedSchoolId(null);
          localStorage.removeItem("selected_school_id");
          delete apiClient.defaults.headers.common["X-School-ID"];
        }
      }
    } catch (err) {
      console.warn("Could not fetch schools from API in SchoolContext:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshSchools();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, isStaff, user?.school_id]);

  const selectedSchool =
    schoolsList.find((s) => String(s.id) === String(selectedSchoolId)) ||
    (schoolsList.length > 0 ? schoolsList[0] : null);

  function setSchoolId(id: number | string) {
    if (String(id) === String(selectedSchoolId)) return;

    if (isStaff && user?.school_id && String(id) !== String(user.school_id)) {
      console.warn("Acesso negado: Assistentes apenas têm acesso à sua escola atribuída.");
      return;
    }

    const schoolStr = String(id);
    localStorage.setItem("selected_school_id", schoolStr);
    apiClient.defaults.headers.common["X-School-ID"] = schoolStr;
    // Cancelar queries ativas da escola anterior antes de mudar o estado para prevenir race conditions
    queryClient.cancelQueries();

    setSelectedSchoolId(id);
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
        isLoading,
        setSchoolId,
        agrupamento: DEFAULT_AGRUPAMENTO,
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
