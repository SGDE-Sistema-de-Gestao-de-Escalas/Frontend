import ConfigEngine from "../components/config/ConfigEngine";
import { useSchool } from "../context/SchoolContext";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Config() {
  const { selectedSchool, selectedSchoolId } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="as Regras do Motor" />;
  }

  return (
    <div key={String(selectedSchoolId ?? "config")} className="w-full">
      <ConfigEngine />
    </div>
  );
}
