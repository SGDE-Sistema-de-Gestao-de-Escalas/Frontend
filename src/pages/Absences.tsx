import React from "react";
import AbsenceManagement from "../components/absences/AbsenceManagement";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Absences() {
  const { selectedSchool } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="as Ausências" />;
  }

  return <AbsenceManagement />;
}
