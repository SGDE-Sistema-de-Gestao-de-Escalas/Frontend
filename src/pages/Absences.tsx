import React from "react";
import AbsenceManagement from "../components/absences/AbsenceManagement";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Absences() {
  const { selectedSchool, selectedSchoolId } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="as Ausências" />;
  }

  return (
    <div key={String(selectedSchoolId ?? "absences")} className="w-full">
      <AbsenceManagement />
    </div>
  );
}
