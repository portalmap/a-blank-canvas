import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { WorkspaceRequiredGuard } from "@/components/WorkspaceRequiredGuard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { TopBar } from "@/components/TopBar";
import { SafeBoundary } from "@/components/SafeBoundary";
import { NotificationListener } from "@/components/notifications/NotificationListener";
import { NotificationReminderProvider } from "@/components/notifications/NotificationReminderProvider";

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <WorkspaceRequiredGuard>
        <SidebarProvider>
          <SafeBoundary name="notifications">
            <NotificationListener />
            <NotificationReminderProvider />
          </SafeBoundary>
          <div className="flex flex-col h-screen w-full overflow-hidden">
            <MobileHeader />
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <main className="flex flex-1 flex-col overflow-hidden">
                <TopBar />
                <div className="flex-1 overflow-auto">
                  <Outlet />
                </div>
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