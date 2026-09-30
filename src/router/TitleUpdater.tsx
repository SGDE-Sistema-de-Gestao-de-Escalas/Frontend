import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { formatDocumentTitle } from "../hooks/useDocumentTitle";

export const ROUTE_TITLES: Record<string, string> = {
  "/login": "Iniciar Sessão",
  "/dashboard": "Dashboard",
  "/schedules": "Dashboard",
  "/assistants": "Assistentes",
  "/absences": "Ausências",
  "/reports": "Relatórios",
  "/config": "Regras do Motor",
  "/gantt": "Mapa de Gantt",
  "/profile": "Perfil do Assistente",
  "/platform-settings": "Definições",
  "/account": "A Minha Conta",
  "/staff/schedule": "O Meu Horário",
  "/staff/register-absence": "Justificar Falta",
  "/staff/absences": "As Minhas Faltas",
  "/staff/absence": "As Minhas Faltas",
  "/staff/account": "A Minha Conta",
  "/legacy": "Versão Anterior",
  "/legacy/staff": "Versão Anterior (Staff)",
};

export function getTitleForPath(pathname: string): string {
  if (ROUTE_TITLES[pathname]) {
    return ROUTE_TITLES[pathname];
  }

  if (pathname.startsWith("/assistants/")) {
    return "Perfil do Assistente";
  }
  if (pathname.startsWith("/staff/")) {
    return "Área do Funcionário";
  }

  return "";
}

export default function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = getTitleForPath(location.pathname);
    document.title = formatDocumentTitle(pageTitle);
  }, [location.pathname]);

  return null;
}
