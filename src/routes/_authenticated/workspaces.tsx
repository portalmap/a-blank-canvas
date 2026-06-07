import { createFileRoute } from "@tanstack/react-router";
import WorkspaceOverview from "@/page-views/WorkspaceOverview";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><WorkspaceOverview /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/workspaces")({
  component: RouteComponent,
});
