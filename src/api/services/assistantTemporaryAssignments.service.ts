import apiClient from "../client";

export interface AssistantTemporaryAssignmentApi {
  id: string;
  assistant_id: string;
  origin_school_id: string;
  destination_school_id: string;
  created_by_user_id?: string;
  validated_by_user_id?: string | null;
  valid_from: string;
  valid_until: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  assistant?: {
    id: string;
    internal_number?: string;
    school_id?: string;
    user?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
    };
  };
  origin_school?: {
    id: string;
    name: string;
    acronym?: string;
  };
  destination_school?: {
    id: string;
    name: string;
    acronym?: string;
  };
}

export interface ListTemporaryAssignmentsParams {
  school_id?: string;
  start_date?: string;
  end_date?: string;
}

export const assistantTemporaryAssignmentsService = {
  async getAll(params?: ListTemporaryAssignmentsParams): Promise<AssistantTemporaryAssignmentApi[]> {
    const response = await apiClient.get<any>("/assistant-temporary-assignments", { params });
    if (Array.isArray(response.data?.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/assistant-temporary-assignments/${id}`);
  },
};

export default assistantTemporaryAssignmentsService;
