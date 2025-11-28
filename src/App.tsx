import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import WorkspaceOverview from "./pages/WorkspaceOverview";
import Chat from "./pages/Chat";
import Teams from "./pages/Teams";
import Documents from "./pages/Documents";
import Dashboards from "./pages/Dashboards";
import Automations from "./pages/Automations";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<WorkspaceOverview />} />
                          <Route path="/chat" element={<Chat />} />
                          <Route path="/teams" element={<Teams />} />
                          <Route path="/documents" element={<Documents />} />
                          <Route path="/dashboards" element={<Dashboards />} />
                          <Route path="/automations" element={<Automations />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
