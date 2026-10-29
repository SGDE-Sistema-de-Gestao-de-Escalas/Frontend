import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { notify } from "../components/common/FeedbackNotification";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import appIcon from "../assets/icon.svg";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleCallback() {
      const errorParam = searchParams.get("error");

      // Se o BackOffice enviou erro via query param (ex: Utilizador não registado, conta inativa, etc.)
      if (errorParam) {
        const decodedError = decodeURIComponent(errorParam);
        console.warn("[OAuth] Erro retornado pelo BackOffice:", decodedError);
        notify.error(decodedError, undefined, undefined, { duration: Infinity });
        navigate(`/login?error=${encodeURIComponent(decodedError)}`, { replace: true });
        return;
      }

      // O BackOffice já criou a sessão num cookie HttpOnly antes de redirecionar para aqui.
      // O token nunca viaja no endereço (F-10): se vier um "?token=", é ignorado.
      try {
        const role = await loginWithSession();
        notify.success("Autenticação efetuada com sucesso!");
        if (role === "admin") {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/staff/schedule", { replace: true });
        }
      } catch (err: any) {
        console.error("[OAuth] Falha ao obter dados do utilizador:", err);
        const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Não foi possível validar a sessão do utilizador com o servidor.";
        notify.error(backendMessage);
        navigate(`/login?error=${encodeURIComponent(backendMessage)}`, { replace: true });
      }
    }

    handleCallback();
  }, [searchParams, navigate, loginWithSession]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-sm">
          <img src={appIcon} alt="SGDE" className="w-8 h-8" />
        </div>

        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />

        <h2 className="text-base font-semibold text-foreground">
          A autenticar com o fornecedor...
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5">
          Por favor aguarde um momento enquanto validamos as suas credenciais no BackOffice.
        </p>
      </div>
    </div>
  );
}
