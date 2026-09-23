import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSchool } from "../context/SchoolContext";
import DashboardSection from "../components/dashboard/DashboardSection";
import AssistantDayModal from "../components/dashboard/AssistantDayModal";
import QuickAbsenceModal from "../components/dashboard/QuickAbsenceModal";

export default function Dashboard() {
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(
    null
  );
  const [absenceFor, setAbsenceFor] = useState<string | null>(null);
  const { currentSchoolId } = useSchool();
  const navigate = useNavigate();

  return (
    <>
      <DashboardSection
        onSelectAssistant={(id) => setSelectedAssistantId(id)}
        currentSchoolId={currentSchoolId}
      />

      {/* Assistant Day Drawer Modal */}
      {selectedAssistantId !== null && (
        <AssistantDayModal
          assistantId={selectedAssistantId}
          onClose={() => setSelectedAssistantId(null)}
          onViewProfile={() => {
            setSelectedAssistantId(null);
            navigate("/profile");
          }}
          onMarkAbsence={(name) => {
            setSelectedAssistantId(null);
            setAbsenceFor(name);
          }}
        />
      )}

      {/* Quick Absence Modal */}
      {absenceFor !== null && (
        <QuickAbsenceModal
          assistantName={absenceFor}
          onClose={() => setAbsenceFor(null)}
          currentSchoolId={currentSchoolId}
        />
      )}
    </>
  );
}
