import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import appIcon from "../assets/icon.svg";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleCallback() {
      const errorParam = searchParams.get("error");
      const tokenParam = searchParams.get("token");

      // Se o BackOffice enviou erro via query param (ex: Utilizador não registado, conta inativa, etc.)
      if (errorParam) {
        const decodedError = decodeURIComponent(errorParam);
        console.warn("[OAuth] Erro retornado pelo BackOffice:", decodedError);
        toast.error(decodedError, { duration: Infinity });
        navigate(`/login?error=${encodeURIComponent(decodedError)}`, { replace: true });
        return;
      }

      // Se o BackOffice enviou o token de autenticação
      if (tokenParam) {
        try {
          const role = await loginWithToken(tokenParam);
          toast.success("Autenticação efetuada com sucesso!");
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
          toast.error(backendMessage);
          navigate(`/login?error=${encodeURIComponent(backendMessage)}`, { replace: true });
        }
        return;
      }

      // Se não vier nem token nem erro
      const fallbackMsg = "Nenhum parâmetro de autenticação foi recebido do fornecedor.";
      toast.error(fallbackMsg);
      navigate(`/login?error=${encodeURIComponent(fallbackMsg)}`, { replace: true });
    }

    handleCallback();
  }, [searchParams, navigate, loginWithToken]);

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
