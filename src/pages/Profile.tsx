import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AssistantProfile from "../components/assistants/AssistantProfile";

export default function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const assistantId = id || searchParams.get("id") || undefined;

  return (
    <AssistantProfile
      assistantId={assistantId}
      onBack={() => navigate("/assistants")}
    />
  );
}


