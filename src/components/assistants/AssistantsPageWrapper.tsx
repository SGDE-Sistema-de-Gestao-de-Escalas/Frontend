import React, { useState } from "react";
import AssistantsListPage from "./AssistantsListPage";
import AddEditAssistant from "./AddEditAssistant";

import type { EntityId } from "../../types";

interface AssistantsPageWrapperProps {
  onViewProfile: (id?: EntityId) => void;
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
        onSave={(newId?: EntityId) => {
          setShowCreate(false);
          if (newId) {
            onViewProfile(newId);
          }
        }}
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

