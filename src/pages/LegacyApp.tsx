import { Navigate } from "react-router-dom";

export default function LegacyApp({ role }: { role?: "admin" | "staff" }) {
  return (
    <Navigate
      to={role === "staff" ? "/staff/schedule" : "/dashboard"}
      replace
    />
  );
}
