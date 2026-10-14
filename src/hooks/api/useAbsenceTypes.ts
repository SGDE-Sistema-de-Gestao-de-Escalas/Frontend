import { useQuery } from "@tanstack/react-query";
import absenceTypesService, {
  BackendAbsenceTypeResource,
} from "../../api/services/absenceTypes.service";
import { absenceTypes as mockAbsenceTypes } from "../../api/mockData";

export const ABSENCE_TYPES_QUERY_KEY = ["absence-types"];

export function useAbsenceTypesList() {
  return useQuery({
    queryKey: ABSENCE_TYPES_QUERY_KEY,
    queryFn: async (): Promise<BackendAbsenceTypeResource[]> => {
      try {
        const response: any = await absenceTypesService.getAll();
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
        if (data.length > 0) return data;
        return mockAbsenceTypes.map((t) => ({
          id: t.id,
          name: t.name,
          requires_document: false,
          can_delete: true,
          cannot_delete_reason: null,
        }));
      } catch {
        return mockAbsenceTypes.map((t) => ({
          id: t.id,
          name: t.name,
          requires_document: false,
          can_delete: true,
          cannot_delete_reason: null,
        }));
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

