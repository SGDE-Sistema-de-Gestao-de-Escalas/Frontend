import React, { useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AssistantProfile from "../components/assistants/AssistantProfile";
import { useSchool } from "../context/SchoolContext";

export default function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const assistantId = id || searchParams.get("id") || undefined;
  const { selectedSchoolId } = useSchool();

  const prevSchoolIdRef = useRef(selectedSchoolId);
  useEffect(() => {
    if (prevSchoolIdRef.current && prevSchoolIdRef.current !== selectedSchoolId) {
      // Ao trocar de escola, redirecionar para a lista de assistentes da nova escola
      navigate("/assistants");
    }
    prevSchoolIdRef.current = selectedSchoolId;
  }, [selectedSchoolId, navigate]);

  return (
    <div key={String(selectedSchoolId ?? "profile")} className="w-full">
      <AssistantProfile
        assistantId={assistantId}
        onBack={() => navigate("/assistants")}
      />
    </div>
  );
}
