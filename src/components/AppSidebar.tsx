import { Home, MessageSquare, Users, FileText, BarChart3, Settings, Zap, ArrowLeftRight, CheckSquare, PanelLeft, PanelLeftClose, Layers } from 'lucide-react';
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
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSpaces } from '@/hooks/useSpaces';
import { useUserRole } from '@/hooks/useUserRole';
import { SpaceTreeItem } from '@/components/workspace/SpaceTreeItem';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const mainNavItems = [
  { title: 'Workspace', url: '/', icon: Home },
];

const everythingNavItem = { title: 'Tudo', url: '/everything', icon: Layers };

const modulesNavItems = [
  { title: 'Chat', url: '/chat', icon: MessageSquare },
  { title: 'Equipes', url: '/teams', icon: Users },
  { title: 'Documentos', url: '/documents', icon: FileText },
  { title: 'Painéis', url: '/dashboards', icon: BarChart3 },
  { title: 'Automações', url: '/automations', icon: Zap },
];

export function AppSidebar() {
  const { state, sidebarWidth, setSidebarWidth, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { activeWorkspace, clearActiveWorkspace } = useWorkspace();
  const { data: spaces } = useSpaces(activeWorkspace?.id);
  const { data: userRole } = useUserRole();
  
  const isAdmin = userRole?.isAdmin ?? false;
  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';
  
  // Filtrar módulos - Automações só para admin
  const filteredModulesNavItems = modulesNavItems.filter(item => {
    if (item.url === '/automations') return isAdmin;
    return true;
  });

  // Resize handler
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      setSidebarWidth(startWidth + delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Logo + Nome - só quando expandido */}
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-sidebar-primary rounded-lg p-2">
                <CheckSquare className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">MAP Flow</span>
            </div>
          )}
          
          {/* Toggle Button - sempre visível */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                {isCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                Expandir menu
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Everything - Tudo link */}
              <SidebarMenuItem>
                <Tooltip delayDuration={isCollapsed ? 0 : 1000}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={everythingNavItem.url}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <everythingNavItem.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{everythingNavItem.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {everythingNavItem.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
              
              {filteredModulesNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip delayDuration={isCollapsed ? 0 : 1000}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            {activeWorkspace ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Home className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="font-medium text-sm truncate">
                        {activeWorkspace.name}
                      </span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <button
                      onClick={clearActiveWorkspace}
                      className="p-1 hover:bg-sidebar-accent rounded flex-shrink-0"
                      title="Trocar Workspace"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Spaces hierarchy */}
                <div className="space-y-0.5">
                  {spaces?.map(space => (
                    <SpaceTreeItem 
                      key={space.id} 
                      space={space}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/" 
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Home className="h-4 w-4" />
                      {!isCollapsed && <span>Workspace</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <SidebarMenuItem>
                  <Tooltip delayDuration={isCollapsed ? 0 : 1000}>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to="/settings"
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <Settings className="h-4 w-4" />
                          {!isCollapsed && <span>Configurações</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        Configurações
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <Tooltip delayDuration={isCollapsed ? 0 : 1000}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton onClick={signOut}>
                      <span className="h-4 w-4">🚪</span>
                      {!isCollapsed && <span>Sair</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      Sair
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40 transition-colors z-50"
          onMouseDown={handleResizeStart}
        />
      )}
    </Sidebar>
  );
}