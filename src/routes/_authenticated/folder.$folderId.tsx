import { createFileRoute } from "@tanstack/react-router";
import FolderDetailView from "@/page-views/FolderDetailView";
import { GuestBlockedRoute } from "@/components/GuestRoute";

function RouteComponent() {
  return <GuestBlockedRoute><FolderDetailView /></GuestBlockedRoute>;
}

export const Route = createFileRoute("/_authenticated/folder/$folderId")({
  component: RouteComponent,
});
