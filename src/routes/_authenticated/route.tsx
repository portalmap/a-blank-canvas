import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceRequiredGuard } from "@/components/WorkspaceRequiredGuard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { NotificationListener } from "@/components/notifications/NotificationListener";

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <WorkspaceRequiredGuard>
        <SidebarProvider>
          <NotificationListener />
          <div className="flex flex-col h-screen w-full overflow-hidden">
            <MobileHeader />
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <main className="flex-1 overflow-auto">
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </WorkspaceRequiredGuard>
    </ProtectedRoute>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});