import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import { ThemeProvider } from "./context/ThemeContext";
import { SchoolProvider } from "./context/SchoolContext";
import { AuthProvider } from "./context/AuthContext";

import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <ThemeProvider>
      <SchoolProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
      </SchoolProvider>
    </ThemeProvider>
  );
}
