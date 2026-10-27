import React from "react";
import { useSchool } from "../context/SchoolContext";
import NotificationsPage from "../components/notifications/NotificationsPage";
import NoSchoolPlaceholder from "../components/common/NoSchoolPlaceholder";

export default function Notifications() {
  const { selectedSchool } = useSchool();

  if (!selectedSchool) {
    return <NoSchoolPlaceholder moduleName="as Notificações" />;
  }

  return <NotificationsPage />;
}
