import React from "react";
import ConfigEngine from "../components/config/ConfigEngine";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Config() {
  const { selectedSchool } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="as Regras do Motor" />;
  }

  return <ConfigEngine />;
}

