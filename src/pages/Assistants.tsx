import React from "react";
import { useNavigate } from "react-router-dom";
import AssistantsPageWrapper from "../components/assistants/AssistantsPageWrapper";

export default function Assistants() {
  const navigate = useNavigate();
  return <AssistantsPageWrapper onViewProfile={() => navigate("/profile")} />;
}
