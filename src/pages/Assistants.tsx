import React from "react";
import { useNavigate } from "react-router-dom";
import AssistantesPageWrapper from "../components/assistants/AssistantesPageWrapper";

export default function Assistants() {
  const navigate = useNavigate();
  return <AssistantesPageWrapper onViewProfile={() => navigate("/profile")} />;
}
