import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../context/SchoolContext";
import DashboardSection from "../components/dashboard/DashboardSection";
import AssistantDayModal from "../components/dashboard/AssistantDayModal";
import QuickAbsenceModal from "../components/dashboard/QuickAbsenceModal";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";
import type { EntityId } from "../types";

export default function Dashboard() {
  const [selectedAssistantData, setSelectedAssistantData] = useState<{
    id: EntityId;
    dayOffset: number;
  } | null>(null);
  const [absenceFor, setAbsenceFor] = useState<{
    name: string;
    dateIso?: string;
  } | null>(null);
  const { currentSchoolId, selectedSchool } = useSchool();
  const navigate = useNavigate();

  // Resetar seleções e modais quando a escola ativa é alterada
  useEffect(() => {
    setSelectedAssistantData(null);
    setAbsenceFor(null);
  }, [currentSchoolId]);

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="o Dashboard" />;
  }

  return (
    <div key={String(currentSchoolId ?? "dash")} className="w-full">
      <DashboardSection
        onSelectAssistant={(id, offset) =>
          setSelectedAssistantData({ id, dayOffset: offset ?? 0 })
        }
        currentSchoolId={currentSchoolId}
      />

      {/* Assistant Day Drawer Modal */}
      {selectedAssistantData !== null && (
        <AssistantDayModal
          assistantId={selectedAssistantData.id}
          dayOffset={selectedAssistantData.dayOffset}
          onClose={() => setSelectedAssistantData(null)}
          onViewProfile={() => {
            const aid = selectedAssistantData.id;
            setSelectedAssistantData(null);
            navigate(aid ? `/profile/${aid}` : "/profile");
          }}
          onMarkAbsence={(name, dateIso) => {
            setSelectedAssistantData(null);
            setAbsenceFor({ name, dateIso });
          }}
        />
      )}

      {/* Quick Absence Modal */}
      {absenceFor !== null && (
        <QuickAbsenceModal
          assistantName={absenceFor.name}
          initialDate={absenceFor.dateIso}
          onClose={() => setAbsenceFor(null)}
          currentSchoolId={currentSchoolId}
        />
      )}
    </div>
  );
}
