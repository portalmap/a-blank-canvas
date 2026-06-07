import { useState } from 'react';
import { Home, MessageSquare, Users, FileText, BarChart3, Settings, Zap, MoreHorizontal, PanelLeft, PanelLeftClose, Layers, Sun, Moon, ChevronRight, ArrowLeftRight, Plus, Pencil, Star, StarOff, ExternalLink, FolderPlus, Archive } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useTheme } from 'next-themes';
import mapLogoLight from '@/assets/map-logo-light.png';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUnreadChannels } from '@/hooks/useChatUnread';
import { useCanCreateWorkspace } from '@/hooks/useCanCreateWorkspace';
import { useDefaultWorkspace, useSetDefaultWorkspace, useCreateWorkspace } from '@/hooks/useWorkspaces';
import { WorkspaceEditDialog } from '@/components/workspace/WorkspaceEditDialog';
import { CreateSpaceDialog } from '@/components/spaces/CreateSpaceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const homeNavItem = { title: 'Início', url: '/', icon: Home };

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
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { activeWorkspace, clearActiveWorkspace } = useWorkspace();
  const { data: spaces } = useSpaces(activeWorkspace?.id);
  const { data: userRole } = useUserRole();
  const { data: unreadChannels } = useUnreadChannels();
  const { data: canCreate } = useCanCreateWorkspace();
  const { data: defaultWorkspaceId } = useDefaultWorkspace();
  const setDefaultWorkspace = useSetDefaultWorkspace();
  const createWorkspace = useCreateWorkspace();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  
  const isAdmin = userRole?.isAdmin ?? false;
  const isGuest = userRole?.isGuest ?? false;
  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';
  const hasUnreadMessages = unreadChannels && unreadChannels.length > 0;
  const isDefaultWorkspace = activeWorkspace?.id === defaultWorkspaceId;

  const handleToggleDefault = () => {
    if (!activeWorkspace) return;
    setDefaultWorkspace.mutate(isDefaultWorkspace ? null : activeWorkspace.id);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    await createWorkspace.mutateAsync(newWorkspaceName.trim());
    setNewWorkspaceName('');
    setIsCreateOpen(false);
  };
  
  // Filtrar módulos - Guest não vê nenhum módulo extra, Automações só para admin
  const filteredModulesNavItems = isGuest
    ? []
    : modulesNavItems.filter(item => {
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
    <>
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {/* Logo + Nome - só quando expandido */}
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <img src={mapLogoLight} alt="MAP Flow" className="h-8 w-8 object-contain" />
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
              {/* Início link */}
              <SidebarMenuItem>
                <Tooltip delayDuration={isCollapsed ? 0 : 1000}>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={homeNavItem.url}
                        end
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <homeNavItem.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{homeNavItem.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {homeNavItem.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>

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
                          <div className="relative">
                            <item.icon className="h-4 w-4" />
                            {item.url === '/chat' && hasUnreadMessages && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                            )}
                          </div>
                          {!isCollapsed && <span>{item.title}</span>}
                          {!isCollapsed && item.url === '/chat' && hasUnreadMessages && (
                            <span className="ml-auto h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                          )}
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

        {!isGuest && (
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            {activeWorkspace ? (
              <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
                <div className="flex items-center justify-between px-2 py-2">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 min-w-0 hover:bg-sidebar-accent rounded p-1 flex-1">
                      <ChevronRight className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${workspaceOpen ? 'rotate-90' : ''}`} />
                      <Home className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium text-sm truncate">
                          {activeWorkspace.name}
                        </span>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {!isCollapsed && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 hover:bg-sidebar-accent rounded flex-shrink-0"
                          title="Opções do Workspace"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={clearActiveWorkspace}>
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Trocar Workspace
                        </DropdownMenuItem>
                        {canCreate && (
                          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Workspace
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => setIsCreateSpaceOpen(true)}>
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Novo Space
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Renomear
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleToggleDefault}>
                          {isDefaultWorkspace ? (
                            <>
                              <StarOff className="h-4 w-4 mr-2" />
                              Remover Padrão
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4 mr-2" />
                              Definir como Padrão
                            </>
                          )}
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate('/archived-spaces')}>
                              <Archive className="h-4 w-4 mr-2" />
                              Spaces Arquivados
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/workspaces')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Detalhes do Workspace
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                {/* Spaces hierarchy - collapsible */}
                <CollapsibleContent>
                  <div className="space-y-0.5">
                    {spaces?.map(space => (
                      <SpaceTreeItem 
                        key={space.id} 
                        space={space}
                        isCollapsed={isCollapsed}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/workspaces" 
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Home className="h-4 w-4" />
                      {!isCollapsed && <span>Workspaces</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        )}

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
                    <SidebarMenuButton onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
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

    {/* Workspace Edit Dialog */}
    <WorkspaceEditDialog
      workspace={activeWorkspace}
      open={isEditOpen}
      onOpenChange={setIsEditOpen}
    />

    {/* Create Workspace Dialog */}
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Nome do Workspace *</Label>
            <Input
              id="ws-name"
              placeholder="Meu Projeto"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Create Space Dialog */}
    {activeWorkspace && (
      <CreateSpaceDialog
        open={isCreateSpaceOpen}
        onOpenChange={setIsCreateSpaceOpen}
        workspaceId={activeWorkspace.id}
      />
    )}
    </>
  );
}