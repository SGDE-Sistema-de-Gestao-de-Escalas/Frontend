import React, { useState } from "react";
import AssistantsListPage from "./AssistantsListPage";
import AddEditAssistant from "./AddEditAssistant";

interface AssistantsPageWrapperProps {
  onViewProfile: () => void;
  initialAdd?: boolean;
}

export default function AssistantsPageWrapper({
  onViewProfile,
  initialAdd = false,
}: AssistantsPageWrapperProps) {
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

