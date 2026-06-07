import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/page-views/ResetPassword";

function RouteComponent() {
  return <ResetPassword />;
}

export const Route = createFileRoute("/auth/reset-password")({
  component: RouteComponent,
});
