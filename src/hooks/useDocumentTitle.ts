import { useEffect } from "react";

export const APP_TITLE_SUFFIX = "SGDE - Sistemas de Gestão de Escalas";

/**
 * Returns full title formatted as: "<pageTitle> | SGDE - Sistemas de Gestão de Escalas"
 */
export function formatDocumentTitle(pageTitle?: string): string {
  if (!pageTitle) {
    return APP_TITLE_SUFFIX;
  }
  return `${pageTitle} | ${APP_TITLE_SUFFIX}`;
}

/**
 * Hook to set document title for a component
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (title) {
      document.title = formatDocumentTitle(title);
    }
  }, [title]);
}

export default useDocumentTitle;
