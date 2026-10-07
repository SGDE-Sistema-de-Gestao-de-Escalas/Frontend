import React from "react";
import ReportsPage from "../components/reports/ReportsPage";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Reports() {
  const { selectedSchool } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="os Relatórios" />;
  }

  return <ReportsPage />;
}
