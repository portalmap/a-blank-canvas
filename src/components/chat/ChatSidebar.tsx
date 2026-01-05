import { useState, useMemo } from 'react';
import { Hash, Plus, MessageCircle, ChevronDown, ChevronRight, Loader2, Building2, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAllChatChannels, useDeleteChannel } from '@/hooks/useChat';
import { CreateChannelDialog } from './CreateChannelDialog';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadChannels } from '@/hooks/useChatUnread';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatSidebarProps {
  selectedChannelId?: string;
  onSelectChannel: (channelId: string) => void;
}

interface WorkspaceInfo {
  id: string;
  name: string;
}

interface ChannelWithWorkspace {
  id: string;
  name: string;
  type: string;
  workspace_id: string;
  created_by_user_id: string;
  spaces?: { name: string; color: string } | null;
  workspace?: WorkspaceInfo | null;
}

export const ChatSidebar = ({ selectedChannelId, onSelectChannel }: ChatSidebarProps) => {
  const { data: channels, isLoading } = useAllChatChannels();
  const { data: userRole } = useUserRole();
  const { user } = useAuth();
  const deleteChannel = useDeleteChannel();
  const { data: unreadChannelIds } = useUnreadChannels();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { spaces: boolean; custom: boolean }>>({});
  const [channelToDelete, setChannelToDelete] = useState<ChannelWithWorkspace | null>(null);

  const canDeleteChannel = (channel: ChannelWithWorkspace) => {
    // Global owner, owner or admin can delete any channel
    if (userRole?.isGlobalOwner || userRole?.isOwner || userRole?.isAdmin) {
      return true;
    }
    // Channel creator can delete their own channel
    return channel.created_by_user_id === user?.id;
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;
    
    await deleteChannel.mutateAsync(channelToDelete.id);
    
    // If the deleted channel was selected, clear selection
    if (selectedChannelId === channelToDelete.id) {
      onSelectChannel('');
    }
    
    setChannelToDelete(null);
  };

  // Group channels by workspace
  const channelsByWorkspace = useMemo(() => {
    if (!channels) return {};

    const grouped: Record<string, {
      workspace: WorkspaceInfo;
      spaceChannels: ChannelWithWorkspace[];
      customChannels: ChannelWithWorkspace[];
    }> = {};

    channels.forEach((channel: any) => {
      const workspaceId = channel.workspace_id;
      const workspaceInfo = channel.workspace || { id: workspaceId, name: 'Workspace' };

      if (!grouped[workspaceId]) {
        grouped[workspaceId] = {
          workspace: workspaceInfo,
          spaceChannels: [],
          customChannels: [],
        };
        // Auto-expand workspaces by default
        if (expandedWorkspaces[workspaceId] === undefined) {
          setExpandedWorkspaces(prev => ({ ...prev, [workspaceId]: true }));
        }
        if (!expandedSections[workspaceId]) {
          setExpandedSections(prev => ({ ...prev, [workspaceId]: { spaces: true, custom: true } }));
        }
      }

      if (channel.type === 'space') {
        grouped[workspaceId].spaceChannels.push(channel);
      } else {
        grouped[workspaceId].customChannels.push(channel);
      }
    });

    // Ordenar canais alfabeticamente dentro de cada workspace
    Object.values(grouped).forEach(group => {
      group.spaceChannels.sort((a, b) => {
        const nameA = (a.spaces?.name || a.name).toLowerCase();
        const nameB = (b.spaces?.name || b.name).toLowerCase();
        return nameA.localeCompare(nameB, 'pt-BR');
      });
      group.customChannels.sort((a, b) => {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'pt-BR');
      });
    });

    return grouped;
  }, [channels]);

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces(prev => ({
      ...prev,
      [workspaceId]: !prev[workspaceId],
    }));
  };

  const toggleSection = (workspaceId: string, section: 'spaces' | 'custom') => {
    setExpandedSections(prev => ({
      ...prev,
      [workspaceId]: {
        ...prev[workspaceId],
        [section]: !prev[workspaceId]?.[section],
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Ordenar workspaces alfabeticamente
  const workspaceIds = Object.keys(channelsByWorkspace).sort((a, b) => {
    const nameA = channelsByWorkspace[a].workspace.name.toLowerCase();
    const nameB = channelsByWorkspace[b].workspace.name.toLowerCase();
    return nameA.localeCompare(nameB, 'pt-BR');
  });

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowCreateDialog(true)}
            title="Novo canal"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {workspaceIds.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              Nenhum canal disponível
            </p>
          )}

          {workspaceIds.map((workspaceId) => {
            const { workspace, spaceChannels, customChannels } = channelsByWorkspace[workspaceId];
            const isWorkspaceExpanded = expandedWorkspaces[workspaceId] !== false;
            const sections = expandedSections[workspaceId] || { spaces: true, custom: true };

            return (
              <Collapsible
                key={workspaceId}
                open={isWorkspaceExpanded}
                onOpenChange={() => toggleWorkspace(workspaceId)}
                className="mb-3"
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm font-medium">
                  {isWorkspaceExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{workspace.name}</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-4">
                  {/* Space Channels */}
                  <div className="mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(workspaceId, 'spaces');
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
                    >
                      {sections.spaces ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      SPACES ({spaceChannels.length})
                    </button>

                    {sections.spaces && (
                      <div className="mt-0.5 space-y-0.5">
                        {spaceChannels.map((channel) => (
                          <button
                            key={channel.id}
                            onClick={() => onSelectChannel(channel.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                              selectedChannelId === channel.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <div
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: channel.spaces?.color || '#6366f1' }}
                            />
                            <span className="truncate">
                              {channel.spaces?.name || channel.name}
                            </span>
                            {unreadChannelIds?.includes(channel.id) && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                            )}
                          </button>
                        ))}
                        {spaceChannels.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-1">
                            Nenhum space
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Channels */}
                  <div className="mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(workspaceId, 'custom');
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
                    >
                      {sections.custom ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      PERSONALIZADOS ({customChannels.length})
                    </button>

                    {sections.custom && (
                      <div className="mt-0.5 space-y-0.5">
                        {customChannels.map((channel) => (
                          <div key={channel.id} className="flex items-center group">
                            <button
                              onClick={() => onSelectChannel(channel.id)}
                              className={cn(
                                "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                                selectedChannelId === channel.id
                                  ? "bg-primary/10 text-primary"
                                  : "hover:bg-muted text-foreground"
                              )}
                            >
                              <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{channel.name}</span>
                              {unreadChannelIds?.includes(channel.id) && (
                                <span className="ml-auto h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                              )}
                            </button>
                            
                            {canDeleteChannel(channel) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setChannelToDelete(channel)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir canal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        ))}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowCreateDialog(true)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Novo canal
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      <CreateChannelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AlertDialog open={!!channelToDelete} onOpenChange={(open) => !open && setChannelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Canal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o canal "{channelToDelete?.name}"? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChannel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
