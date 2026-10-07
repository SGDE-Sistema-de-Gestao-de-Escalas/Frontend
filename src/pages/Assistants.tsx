import React from "react";
import { useNavigate } from "react-router-dom";
import AssistantsPageWrapper from "../components/assistants/AssistantsPageWrapper";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Assistants() {
  const navigate = useNavigate();
  const { selectedSchool } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="os Assistentes" />;
  }

  return <AssistantsPageWrapper onViewProfile={() => navigate("/profile")} />;
}
