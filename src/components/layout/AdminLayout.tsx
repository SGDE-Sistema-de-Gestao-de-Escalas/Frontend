import React, { useState } from "react";
import type { AdminPage } from "../../types";
import { Sheet, SheetContent } from "../ui/sheet";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";
import SidebarContent from "./SidebarContent";
import TopHeader from "./TopHeader";
import { useSchool } from "../../context/SchoolContext";
import DashboardSection from "../dashboard/DashboardSection";
import AssistantDayModal from "../dashboard/AssistantDayModal";
import QuickAbsenceModal from "../dashboard/QuickAbsenceModal";
import ConfigEngine from "../config/ConfigEngine";
import AssistantProfile from "../assistants/AssistantProfile";
import AssistantsPageWrapper from "../assistants/AssistantsPageWrapper";
import AbsenceManagement from "../absences/AbsenceManagement";
import ReportsPage from "../reports/ReportsPage";
import GanttPage from "../gantt/GanttPage";
import AccountProfilePage from "../settings/AccountProfilePage";
import PlatformSettingsPage from "../settings/PlatformSettingsPage";

export const ADMIN_PAGE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  assistants: "Assistentes",
  absences: "Ausências",
  reports: "Relatórios",
  gantt: "Mapa de Gantt",
  config: "Regras do Motor",
  profile: "Perfil do Assistente",
  "add-assistant": "Novo Assistente",
  "platform-settings": "Configurações da Plataforma",
  account: "A Minha Conta",
};

interface AdminLayoutProps {
  currentPage?: AdminPage;
  initialPage?: AdminPage;
  onNavigate?: (page: AdminPage) => void;
  onSwitchRole?: () => void;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export default function AdminLayout({
  currentPage,
  initialPage = "dashboard",
  onNavigate,
  onSwitchRole,
  onLogout,
  children,
}: AdminLayoutProps) {
  const [internalPage, setInternalPage] = useState<AdminPage>(
    currentPage || initialPage
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(
    null
  );
  const [absenceFor, setAbsenceFor] = useState<string | null>(null);

  const { currentSchoolId } = useSchool();
  const activePage = currentPage || internalPage;

  function handleNavigate(pageId: string) {
    const p = pageId as AdminPage;
    setInternalPage(p);
    if (onNavigate) {
      onNavigate(p);
    }
    setMobileMenuOpen(false);
  }

  const currentTitle = ADMIN_PAGE_LABELS[activePage] || "SGDE";

  return (
    <div className="flex h-screen bg-background overflow-hidden w-full">
      {/* Desktop Sidebar */}
      <Sidebar
        currentPage={activePage}
        onNavigate={handleNavigate}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />

      {/* Mobile Sidebar Drawer (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="p-0 w-64 border-r border-sidebar-border bg-sidebar"
        >
          <SidebarContent
            currentPage={activePage}
            onNavigate={handleNavigate}
            onCloseMobile={() => setMobileMenuOpen(false)}
            onSwitchRole={onSwitchRole}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader
          currentPageTitle={currentTitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPlatformSettings={() => handleNavigate("platform-settings")}
          onAccount={() => handleNavigate("account")}
          onSwitchRole={onSwitchRole}
          onLogout={onLogout}
        />

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          {children ? (
            children
          ) : (
            <>
              {activePage === "dashboard" && (
                <DashboardSection
                  onSelectAssistant={(id) => setSelectedAssistantId(id)}
                  currentSchoolId={currentSchoolId}
                />
              )}
              {activePage === "config" && <ConfigEngine />}
              {activePage === "profile" && (
                <AssistantProfile
                  onBack={() => handleNavigate("assistants")}
                />
              )}
              {activePage === "absences" && <AbsenceManagement />}
              {activePage === "assistants" && (
                <AssistantsPageWrapper
                  onViewProfile={() => handleNavigate("profile")}
                />
              )}
              {activePage === "add-assistant" && (
                <AssistantsPageWrapper
                  onViewProfile={() => handleNavigate("profile")}
                  initialAdd
                />
              )}
              {activePage === "reports" && <ReportsPage />}
              {activePage === "gantt" && <GanttPage />}
              {activePage === "account" && <AccountProfilePage role="admin" />}
              {activePage === "platform-settings" && <PlatformSettingsPage />}
            </>
          )}
        </div>

        {/* Assistant Day Modal */}
        {selectedAssistantId !== null && (
          <AssistantDayModal
            assistantId={selectedAssistantId}
            onClose={() => setSelectedAssistantId(null)}
            onViewProfile={() => {
              setSelectedAssistantId(null);
              handleNavigate("profile");
            }}
            onMarkAbsence={(name) => {
              setSelectedAssistantId(null);
              setAbsenceFor(name);
            }}
          />
        )}

        {/* Quick Absence Modal */}
        {absenceFor !== null && (
          <QuickAbsenceModal
            assistantName={absenceFor}
            onClose={() => setAbsenceFor(null)}
            currentSchoolId={currentSchoolId}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentPage={activePage}
        onNavigate={handleNavigate}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}

