export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          automation_id: string
          error_message: string | null
          executed_at: string
          id: string
          status: string
          task_id: string | null
        }
        Insert: {
          automation_id: string
          error_message?: string | null
          executed_at?: string
          id?: string
          status: string
          task_id?: string | null
        }
        Update: {
          automation_id?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          status?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          enabled: boolean
          id: string
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["automation_scope"]
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          enabled?: boolean
          id?: string
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["automation_scope"]
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          enabled?: boolean
          id?: string
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["automation_scope"]
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_channel_role"]
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_channel_role"]
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_channel_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          linked_folder_id: string | null
          linked_list_id: string | null
          linked_space_id: string | null
          linked_task_id: string | null
          name: string
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          name: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          name?: string
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_linked_folder_id_fkey"
            columns: ["linked_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_list_id_fkey"
            columns: ["linked_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_space_id_fkey"
            columns: ["linked_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          channel_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          channel_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_permissions: {
        Row: {
          created_at: string
          dashboard_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_permissions_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          config: Json
          created_at: string
          created_by_user_id: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by_user_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_message_conversations: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_message_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "direct_message_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_permissions: {
        Row: {
          created_at: string
          document_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: Json
          created_at: string
          created_by_user_id: string
          id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by_user_id: string
          id?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by_user_id?: string
          id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          linked_folder_id: string | null
          linked_list_id: string | null
          linked_space_id: string | null
          linked_task_id: string | null
          title: string | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          title?: string | null
          visibility?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          linked_folder_id?: string | null
          linked_list_id?: string | null
          linked_space_id?: string | null
          linked_task_id?: string | null
          title?: string | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_linked_folder_id_fkey"
            columns: ["linked_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_list_id_fkey"
            columns: ["linked_list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_space_id_fkey"
            columns: ["linked_space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_permissions: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          space_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          space_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      list_permissions: {
        Row: {
          created_at: string
          id: string
          list_id: string
          role: Database["public"]["Enums"]["permission_role"]
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_permissions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          default_view: Database["public"]["Enums"]["list_view"]
          description: string | null
          folder_id: string | null
          id: string
          name: string
          space_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_view?: Database["public"]["Enums"]["list_view"]
          description?: string | null
          folder_id?: string | null
          id?: string
          name: string
          space_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_view?: Database["public"]["Enums"]["list_view"]
          description?: string | null
          folder_id?: string | null
          id?: string
          name?: string
          space_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      space_permissions: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          space_id: string
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          space_id: string
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          space_id?: string
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_permissions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          order_index: number
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["status_scope"]
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          order_index?: number
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["status_scope"]
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          order_index?: number
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["status_scope"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_permissions: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["permission_role"]
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["permission_role"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_permissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          due_date: string | null
          folder_id: string | null
          id: string
          list_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          space_id: string | null
          start_date: string | null
          status_id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          space_id?: string | null
          start_date?: string | null
          status_id: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          due_date?: string | null
          folder_id?: string | null
          id?: string
          list_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          space_id?: string | null
          start_date?: string | null
          status_id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_invitations: { Args: never; Returns: undefined }
      get_user_id_by_email: { Args: { email: string }; Returns: string }
      get_user_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      user_can_access_folder: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_list: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_space: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_space_permission: {
        Args: { _space_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      user_is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      user_is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      automation_action:
        | "auto_assign_user"
        | "auto_assign_team"
        | "notify_channel"
        | "set_status"
      automation_scope: "workspace" | "space" | "folder" | "list"
      automation_trigger:
        | "on_task_created"
        | "on_task_updated"
        | "on_status_changed"
      chat_channel_role: "owner" | "member"
      chat_channel_type: "client" | "department" | "project" | "custom"
      list_view: "list" | "kanban" | "sprint"
      permission_role: "viewer" | "commenter" | "editor"
      status_scope: "workspace" | "space" | "folder" | "list"
      task_priority: "low" | "medium" | "high" | "urgent"
      team_role: "leader" | "member"
      workspace_role: "owner" | "admin" | "member" | "limited_member" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      automation_action: [
        "auto_assign_user",
        "auto_assign_team",
        "notify_channel",
        "set_status",
      ],
      automation_scope: ["workspace", "space", "folder", "list"],
      automation_trigger: [
        "on_task_created",
        "on_task_updated",
        "on_status_changed",
      ],
      chat_channel_role: ["owner", "member"],
      chat_channel_type: ["client", "department", "project", "custom"],
      list_view: ["list", "kanban", "sprint"],
      permission_role: ["viewer", "commenter", "editor"],
      status_scope: ["workspace", "space", "folder", "list"],
      task_priority: ["low", "medium", "high", "urgent"],
      team_role: ["leader", "member"],
      workspace_role: ["owner", "admin", "member", "limited_member", "guest"],
    },
  },
} as const
