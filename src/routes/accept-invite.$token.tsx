import { createFileRoute } from "@tanstack/react-router";
import AcceptInvite from "@/page-views/AcceptInvite";

function RouteComponent() {
  return <AcceptInvite />;
}

export const Route = createFileRoute("/accept-invite/$token")({
  component: RouteComponent,
});
