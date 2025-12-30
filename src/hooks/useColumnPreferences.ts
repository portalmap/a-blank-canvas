import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ColumnId =
  | "checkbox"
  | "title"
  | "status"
  | "assignee"
  | "due_date"
  | "start_date"
  | "priority"
  | "tags"
  | "comments"
  | "subtasks"
  | "actions";

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: ColumnId;
  direction: SortDirection;
}

export interface ColumnDefinition {
  id: ColumnId;
  label: string;
  canHide: boolean;
  defaultVisible: boolean;
  sortable?: boolean;
}

export const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: "checkbox", label: "Seleção", canHide: false, defaultVisible: true },
  { id: "title", label: "Nome", canHide: false, defaultVisible: true },
  { id: "status", label: "Status", canHide: true, defaultVisible: true },
  { id: "assignee", label: "Responsável", canHide: true, defaultVisible: true },
  { id: "due_date", label: "Data de vencimento", canHide: true, defaultVisible: true },
  { id: "start_date", label: "Data de início", canHide: true, defaultVisible: false },
  { id: "priority", label: "Prioridade", canHide: true, defaultVisible: true },
  { id: "tags", label: "Etiquetas", canHide: true, defaultVisible: false },
  { id: "comments", label: "Comentários", canHide: true, defaultVisible: false },
  { id: "subtasks", label: "Subtarefas", canHide: true, defaultVisible: false },
  { id: "actions", label: "Ações", canHide: false, defaultVisible: true },
];

export const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = AVAILABLE_COLUMNS
  .filter((col) => col.defaultVisible)
  .map((col) => col.id);

export const DEFAULT_COLUMN_ORDER: ColumnId[] = AVAILABLE_COLUMNS.map((col) => col.id);

export interface ColumnPreferences {
  id: string;
  user_id: string;
  list_id: string | null;
  scope: string;
  visible_columns: ColumnId[];
  column_order: ColumnId[];
}

export function useColumnPreferences(listId: string | null, scope: "list" | "everything" = "list") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["column-preferences", user?.id, listId, scope],
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from("user_column_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("scope", scope);

      if (scope === "list" && listId) {
        query = query.eq("list_id", listId);
      } else if (scope === "everything") {
        query = query.is("list_id", null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          visible_columns: DEFAULT_VISIBLE_COLUMNS,
          column_order: DEFAULT_COLUMN_ORDER,
        };
      }

      return {
        visible_columns: (data.visible_columns || DEFAULT_VISIBLE_COLUMNS) as ColumnId[],
        column_order: (data.column_order || DEFAULT_COLUMN_ORDER) as ColumnId[],
      };
    },
    enabled: !!user?.id,
  });
}

export function useSaveColumnPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      listId,
      scope,
      visibleColumns,
      columnOrder,
    }: {
      listId: string | null;
      scope: "list" | "everything";
      visibleColumns: ColumnId[];
      columnOrder: ColumnId[];
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_column_preferences")
        .upsert(
          {
            user_id: user.id,
            list_id: scope === "everything" ? null : listId,
            scope,
            visible_columns: visibleColumns,
            column_order: columnOrder,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,list_id,scope",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["column-preferences", user?.id, variables.listId, variables.scope],
      });
    },
  });
}
