import { useQuery } from "@tanstack/react-query";
import absenceTypesService, {
  BackendAbsenceTypeResource,
} from "../../api/services/absenceTypes.service";

export const ABSENCE_TYPES_QUERY_KEY = ["absence-types"];

export function useAbsenceTypesList() {
  return useQuery({
    queryKey: ABSENCE_TYPES_QUERY_KEY,
    queryFn: async (): Promise<BackendAbsenceTypeResource[]> => {
      const response: any = await absenceTypesService.getAll();
      if (Array.isArray(response?.data)) {
        return response.data;
      }
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

