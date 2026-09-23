import React, { useState } from "react";
import AssistantsListPage from "./AssistantsListPage";
import AddEditAssistant from "./AddEditAssistant";

interface AssistantesPageWrapperProps {
  onViewProfile: () => void;
  initialAdd?: boolean;
}

export default function AssistantesPageWrapper({
  onViewProfile,
  initialAdd = false,
}: AssistantesPageWrapperProps) {
  const [showCreate, setShowCreate] = useState(initialAdd);

  if (showCreate) {
    return (
      <AddEditAssistant
        onSave={() => setShowCreate(false)}
        onCancel={() => setShowCreate(false)}
      />
    );
  }

  return (
    <AssistantsListPage
      onAddNew={() => setShowCreate(true)}
      onViewProfile={onViewProfile}
    />
  );
}

