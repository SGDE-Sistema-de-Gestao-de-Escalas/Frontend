import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import { ThemeProvider } from "./context/ThemeContext";
import { SchoolProvider } from "./context/SchoolContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <ThemeProvider>
      <SchoolProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </SchoolProvider>
    </ThemeProvider>
  );
}
