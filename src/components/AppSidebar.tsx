import { Home, Folder, List, MessageSquare, Users, FileText, BarChart3, Settings, ChevronDown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { CheckSquare } from 'lucide-react';

const mainNavItems = [
  { title: 'Workspace', url: '/', icon: Home },
  { title: 'Spaces', url: '/spaces', icon: Folder },
];

const futureModules = [
  { title: 'Chat', icon: MessageSquare },
  { title: 'Equipes', icon: Users },
  { title: 'Documentos', icon: FileText },
  { title: 'Painéis', icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  
  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-64'}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-sidebar-primary rounded-lg p-2">
            <CheckSquare className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-sidebar-foreground">TaskFlow</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Módulos Futuros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {futureModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled>
                    <item.icon className="h-4 w-4 opacity-50" />
                    {!isCollapsed && (
                      <span className="opacity-50">{item.title}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Configurações</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <span className="h-4 w-4">🚪</span>
                  {!isCollapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="p-2 border-t border-sidebar-border">
        <SidebarTrigger className="w-full" />
      </div>
    </Sidebar>
  );
}