import { useQuery } from "@tanstack/react-query";
import assistantTemporaryAssignmentsService, {
  type AssistantTemporaryAssignmentApi,
  type ListTemporaryAssignmentsParams,
} from "../../api/services/assistantTemporaryAssignments.service";
import { useSchool } from "../../context/SchoolContext";
import { schoolScopedKey } from "../../lib/queryClient";

export const ASSISTANT_TEMPORARY_ASSIGNMENTS_KEY = "assistant-temporary-assignments";

export function useAssistantTemporaryAssignmentsList(params?: ListTemporaryAssignmentsParams) {
  const { selectedSchoolId } = useSchool();

  return useQuery({
    queryKey: schoolScopedKey(ASSISTANT_TEMPORARY_ASSIGNMENTS_KEY, selectedSchoolId, params),
    queryFn: () => assistantTemporaryAssignmentsService.getAll(params),
  });
}
