import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import AppRouter from "./router/AppRouter";
import { ThemeProvider } from "./context/ThemeContext";
import { SchoolProvider } from "./context/SchoolContext";
import { AuthProvider } from "./context/AuthContext";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SchoolProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRouter />
              <Toaster
                position="top-right"
                richColors
                style={{
                  top: "70px",
                  right: "24px",
                }}
              />
            </BrowserRouter>
          </AuthProvider>
        </SchoolProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
