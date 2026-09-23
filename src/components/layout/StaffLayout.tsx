import React, { useState } from "react";
import type { StaffPage } from "../../types";
import { Sheet, SheetContent } from "../ui/sheet";
import MobileBottomNav from "./MobileBottomNav";
import Sidebar from "./Sidebar";
import SidebarContent from "./SidebarContent";
import TopHeader from "./TopHeader";
import StaffScheduleSection from "../staff/StaffScheduleSection";
import RegisterAbsence from "../staff/RegisterAbsence";
import StaffAbsenceDetail from "../staff/StaffAbsenceDetail";
import AccountProfilePage from "../settings/AccountProfilePage";

export const STAFF_PAGE_LABELS: Record<string, string> = {
  schedule: "O Meu Horário",
  "register-absence": "Justificar Falta",
  "absence-detail": "As Minhas Faltas",
  account: "A Minha Conta",
};

interface StaffLayoutProps {
  currentPage?: StaffPage;
  initialPage?: StaffPage;
  onNavigate?: (page: StaffPage) => void;
  onSwitchRole?: () => void;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export default function StaffLayout({
  currentPage,
  initialPage = "schedule",
  onNavigate,
  onSwitchRole,
  onLogout,
  children,
}: StaffLayoutProps) {
  const [internalPage, setInternalPage] = useState<StaffPage>(
    currentPage || initialPage
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activePage = currentPage || internalPage;

  function handleNavigate(pageId: string) {
    const p = pageId as StaffPage;
    setInternalPage(p);
    if (onNavigate) {
      onNavigate(p);
    }
    setMobileMenuOpen(false);
  }

  const currentTitle = STAFF_PAGE_LABELS[activePage] || "SGDE Staff";

  return (
    <div className="flex h-screen bg-background overflow-hidden w-full">
      {/* Desktop Staff Sidebar */}
      <Sidebar
        currentPage={activePage}
        onNavigate={handleNavigate}
        onSwitchRole={onSwitchRole}
        onLogout={onLogout}
      />

      {/* Mobile Staff Drawer (Sheet) */}
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
              {activePage === "schedule" && <StaffScheduleSection />}
              {activePage === "register-absence" && <RegisterAbsence />}
              {activePage === "absence-detail" && <StaffAbsenceDetail />}
              {activePage === "account" && <AccountProfilePage role="staff" />}
            </>
          )}
        </div>
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

