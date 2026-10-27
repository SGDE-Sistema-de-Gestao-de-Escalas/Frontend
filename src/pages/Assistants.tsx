import { useNavigate } from "react-router-dom";
import AssistantsPageWrapper from "../components/assistants/AssistantsPageWrapper";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Assistants() {
  const navigate = useNavigate();
  const { selectedSchool, selectedSchoolId } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="os Assistentes" />;
  }

  return (
    <div key={String(selectedSchoolId ?? "assistants")} className="w-full">
      <AssistantsPageWrapper
        onViewProfile={(id) => navigate(id ? `/profile/${id}` : "/profile")}
      />
    </div>
  );
}
