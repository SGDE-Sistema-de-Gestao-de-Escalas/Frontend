import StaffScheduleSection from "../staff/StaffScheduleSection";
import type { EntityId } from "../../types";

export interface ProfileScheduleHistoryProps {
  assistantId?: EntityId;
  assistantName?: string;
  schoolId?: EntityId;
}

/**
 * Separador de Histórico e Consulta de Escalas Publicadas do Assistente.
 * Utiliza o mesmo design e UX/UI da secção de horários do Dashboard Staff
 * (Vistas de Dia, Semana e Mês com navegação e blocos visuais de atividades).
 */
export default function ProfileScheduleHistory({
  assistantId,
  assistantName,
  schoolId,
}: ProfileScheduleHistoryProps) {
  return (
    <div className="w-full">
      <StaffScheduleSection
        targetAssistantId={assistantId}
        targetAssistantName={assistantName}
        targetSchoolId={schoolId}
      />
    </div>
  );
}