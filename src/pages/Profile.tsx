import React from "react";
import { useNavigate } from "react-router-dom";
import AssistantProfile from "../components/assistants/AssistantProfile";

export default function Profile() {
  const navigate = useNavigate();
  return <AssistantProfile onBack={() => navigate("/assistants")} />;
}

