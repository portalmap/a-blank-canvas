import { useState, useMemo } from 'react';
import { Hash, Plus, MessageCircle, ChevronDown, ChevronRight, Loader2, Building2, MoreHorizontal, Trash2, Mail, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAllChatChannels, useDeleteChannel, useUpdateChannel } from '@/hooks/useChat';
import { CreateChannelDialog } from './CreateChannelDialog';
import { DMCreateDialog } from './DMCreateDialog';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadChannels } from '@/hooks/useChatUnread';
import { useAllProfiles } from '@/hooks/useAllProfiles';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

// --- Sub-components ---

interface ChannelActionsMenuProps {
  channel: ChannelWithWorkspace;
  canDelete: boolean;
  canRename: boolean;
  onDelete: (channel: ChannelWithWorkspace) => void;
  onRename: (channel: ChannelWithWorkspace) => void;
}

const ChannelActionsMenu = ({ channel, canDelete, canRename, onDelete, onRename }: ChannelActionsMenuProps) => {
  if (!canDelete && !canRename) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canRename && (
          <DropdownMenuItem onClick={() => onRename(channel)}>
            <Pencil className="h-4 w-4 mr-2" />
            Renomear
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(channel)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir canal
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ChatSidebar = ({ selectedChannelId, onSelectChannel }: ChatSidebarProps) => {
  const { data: channels, isLoading } = useAllChatChannels();
  const { data: userRole } = useUserRole();
  const { user } = useAuth();
  const deleteChannel = useDeleteChannel();
  const updateChannel = useUpdateChannel();
  const { data: unreadChannelIds } = useUnreadChannels();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDMDialog, setShowDMDialog] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, { spaces: boolean; custom: boolean; dms: boolean }>>({});
  const [channelToDelete, setChannelToDelete] = useState<ChannelWithWorkspace | null>(null);
  const [channelToRename, setChannelToRename] = useState<ChannelWithWorkspace | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const { data: profiles } = useAllProfiles();

  const isAdminOrOwner = userRole?.isGlobalOwner || userRole?.isOwner || userRole?.isAdmin;
  const canCreateChannel = userRole?.workspaceRole === 'admin' || userRole?.workspaceRole === 'member';

  const canDeleteChannel = (channel: ChannelWithWorkspace) => {
    if (isAdminOrOwner) return true;
    if (userRole?.workspaceRole === 'member') {
      return channel.created_by_user_id === user?.id;
    }
    return false;
  };

  const canRenameChannel = (channel: ChannelWithWorkspace) => {
    // Space channels sync name from the space — don't allow rename
    if (channel.type === 'space') return false;
    return !!isAdminOrOwner;
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;
    await deleteChannel.mutateAsync(channelToDelete.id);
    if (selectedChannelId === channelToDelete.id) {
      onSelectChannel('');
    }
    setChannelToDelete(null);
  };

  const handleRenameChannel = async () => {
    if (!channelToRename || !renameValue.trim()) return;
    await updateChannel.mutateAsync({ id: channelToRename.id, name: renameValue.trim() });
    setChannelToRename(null);
    setRenameValue('');
  };

  const openRenameDialog = (channel: ChannelWithWorkspace) => {
    setChannelToRename(channel);
    setRenameValue(channel.name);
  };

  // Group channels by workspace
  const channelsByWorkspace = useMemo(() => {
    if (!channels) return {};

    const grouped: Record<string, {
      workspace: WorkspaceInfo;
      spaceChannels: ChannelWithWorkspace[];
      customChannels: ChannelWithWorkspace[];
      dmChannels: ChannelWithWorkspace[];
    }> = {};

    channels.forEach((channel: any) => {
      const workspaceId = channel.workspace_id;
      const workspaceInfo = channel.workspace || { id: workspaceId, name: 'Workspace' };

      if (!grouped[workspaceId]) {
        grouped[workspaceId] = {
          workspace: workspaceInfo,
          spaceChannels: [],
          customChannels: [],
          dmChannels: [],
        };
        if (expandedWorkspaces[workspaceId] === undefined) {
          setExpandedWorkspaces(prev => ({ ...prev, [workspaceId]: true }));
        }
        if (!expandedSections[workspaceId]) {
          setExpandedSections(prev => ({ ...prev, [workspaceId]: { spaces: true, custom: true, dms: true } }));
        }
      }

      if (channel.type === 'space') {
        grouped[workspaceId].spaceChannels.push(channel);
      } else if (channel.type === 'dm' || channel.type === 'group_dm') {
        grouped[workspaceId].dmChannels.push(channel);
      } else {
        grouped[workspaceId].customChannels.push(channel);
      }
    });

    Object.values(grouped).forEach(group => {
      group.spaceChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'pt-BR'));
      group.customChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'pt-BR'));
    });

    return grouped;
  }, [channels]);

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces(prev => ({ ...prev, [workspaceId]: !prev[workspaceId] }));
  };

  const toggleSection = (workspaceId: string, section: 'spaces' | 'custom' | 'dms') => {
    setExpandedSections(prev => ({
      ...prev,
      [workspaceId]: { ...prev[workspaceId], [section]: !prev[workspaceId]?.[section] },
    }));
  };

  const getDMDisplayName = (channel: ChannelWithWorkspace) => {
    if (!profiles || !user) return channel.name;
    return channel.name;
  };

  if (isLoading) {
    return (
      <div className="w-64 border-r bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const workspaceIds = Object.keys(channelsByWorkspace).sort((a, b) => {
    const nameA = channelsByWorkspace[a].workspace.name.toLowerCase();
    const nameB = channelsByWorkspace[b].workspace.name.toLowerCase();
    return nameA.localeCompare(nameB, 'pt-BR');
  });

  const renderChannelRow = (channel: ChannelWithWorkspace, icon: React.ReactNode) => {
    const showActions = canDeleteChannel(channel) || canRenameChannel(channel);

    return (
      <div key={channel.id} className="flex items-center group">
        <button
          onClick={() => onSelectChannel(channel.id)}
          className={cn(
            "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors min-w-0",
            selectedChannelId === channel.id
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-foreground"
          )}
        >
          {icon}
          <span className={cn("truncate", unreadChannelIds?.includes(channel.id) && "font-bold text-destructive")}>
            {channel.type === 'dm' || channel.type === 'group_dm' ? getDMDisplayName(channel) : channel.name}
          </span>
        </button>
        {showActions && (
          <ChannelActionsMenu
            channel={channel}
            canDelete={canDeleteChannel(channel)}
            canRename={canRenameChannel(channel)}
            onDelete={setChannelToDelete}
            onRename={openRenameDialog}
          />
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </h2>
          {canCreateChannel && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowCreateDialog(true)} title="Novo canal">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {workspaceIds.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">Nenhum canal disponível</p>
          )}

          {workspaceIds.map((workspaceId) => {
            const { workspace, spaceChannels, customChannels, dmChannels } = channelsByWorkspace[workspaceId];
            const isWorkspaceExpanded = expandedWorkspaces[workspaceId] !== false;
            const sections = expandedSections[workspaceId] || { spaces: true, custom: true, dms: true };

            return (
              <Collapsible key={workspaceId} open={isWorkspaceExpanded} onOpenChange={() => toggleWorkspace(workspaceId)} className="mb-3">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm font-medium">
                  {isWorkspaceExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{workspace.name}</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-4">
                  {/* Space Channels */}
                  <div className="mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSection(workspaceId, 'spaces'); }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
                    >
                      {sections.spaces ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      SPACES ({spaceChannels.length})
                    </button>
                    {sections.spaces && (
                      <div className="mt-0.5 space-y-0.5">
                        {spaceChannels.map((channel) =>
                          renderChannelRow(
                            channel,
                            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: channel.spaces?.color || '#6366f1' }} />
                          )
                        )}
                        {spaceChannels.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">Nenhum space</p>}
                      </div>
                    )}
                  </div>

                  {/* Custom Channels */}
                  <div className="mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSection(workspaceId, 'custom'); }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
                    >
                      {sections.custom ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      PERSONALIZADOS ({customChannels.length})
                    </button>
                    {sections.custom && (
                      <div className="mt-0.5 space-y-0.5">
                        {customChannels.map((channel) =>
                          renderChannelRow(channel, <Hash className="h-3.5 w-3.5 flex-shrink-0" />)
                        )}
                        {canCreateChannel && (
                          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-3.5 w-3.5" />
                            Novo canal
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* DM Channels */}
                  <div className="mt-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSection(workspaceId, 'dms'); }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full px-2 py-1"
                    >
                      {sections.dms ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      MENSAGENS DIRETAS ({dmChannels.length})
                    </button>
                    {sections.dms && (
                      <div className="mt-0.5 space-y-0.5">
                        {dmChannels.map((channel) =>
                          renderChannelRow(channel, <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />)
                        )}
                        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => setShowDMDialog(true)}>
                          <Plus className="h-3.5 w-3.5" />
                          Nova mensagem
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

      <CreateChannelDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <DMCreateDialog open={showDMDialog} onOpenChange={setShowDMDialog} onChannelCreated={(channelId) => onSelectChannel(channelId)} />

      {/* Delete confirmation */}
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
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={!!channelToRename} onOpenChange={(open) => { if (!open) { setChannelToRename(null); setRenameValue(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Canal</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Nome do canal"
            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameChannel(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChannelToRename(null); setRenameValue(''); }}>Cancelar</Button>
            <Button onClick={handleRenameChannel} disabled={!renameValue.trim() || updateChannel.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
