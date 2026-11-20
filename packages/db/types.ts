/** Database shape for the initial schema. Keep in sync with the SQL migration. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update, Relationships extends unknown[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      accounts: Table<
        { clerk_user_id: string; plan: 'free' | 'pro'; created_at: string },
        { clerk_user_id: string; plan?: 'free' | 'pro'; created_at?: string },
        { clerk_user_id?: string; plan?: 'free' | 'pro'; created_at?: string }
      >;
      projects: Table<
        { id: string; owner_id: string; name: string; public_key: string; messages_used: number; period_start: string; created_at: string },
        { id?: string; owner_id: string; name: string; public_key: string; messages_used?: number; period_start?: string; created_at?: string },
        { id?: string; owner_id?: string; name?: string; public_key?: string; messages_used?: number; period_start?: string; created_at?: string },
        [{ foreignKeyName: 'projects_owner_id_fkey'; columns: ['owner_id']; isOneToOne: false; referencedRelation: 'accounts'; referencedColumns: ['clerk_user_id'] }]
      >;
      widget_configs: Table<
        { project_id: string; button_color: string; position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; label: string; animation: 'fade' | 'slide' | 'scale'; header_text: string; show_badge: boolean },
        { project_id: string; button_color?: string; position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; label?: string; animation?: 'fade' | 'slide' | 'scale'; header_text?: string; show_badge?: boolean },
        { project_id?: string; button_color?: string; position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; label?: string; animation?: 'fade' | 'slide' | 'scale'; header_text?: string; show_badge?: boolean },
        [{ foreignKeyName: 'widget_configs_project_id_fkey'; columns: ['project_id']; isOneToOne: true; referencedRelation: 'projects'; referencedColumns: ['id'] }]
      >;
      knowledge_sources: Table<
        { id: string; project_id: string; title: string; type: 'text' | 'pdf' | 'md' | 'txt'; storage_key: string | null; status: 'uploading' | 'processing' | 'ready' | 'failed'; created_at: string },
        { id?: string; project_id: string; title: string; type: 'text' | 'pdf' | 'md' | 'txt'; storage_key?: string | null; status?: 'uploading' | 'processing' | 'ready' | 'failed'; created_at?: string },
        { id?: string; project_id?: string; title?: string; type?: 'text' | 'pdf' | 'md' | 'txt'; storage_key?: string | null; status?: 'uploading' | 'processing' | 'ready' | 'failed'; created_at?: string },
        [{ foreignKeyName: 'knowledge_sources_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] }]
      >;
      knowledge_chunks: Table<
        { id: string; project_id: string; source_id: string; content: string; embedding: string },
        { id?: string; project_id: string; source_id: string; content: string; embedding: string },
        { id?: string; project_id?: string; source_id?: string; content?: string; embedding?: string },
        [{ foreignKeyName: 'knowledge_chunks_project_id_source_id_fkey'; columns: ['project_id', 'source_id']; isOneToOne: false; referencedRelation: 'knowledge_sources'; referencedColumns: ['project_id', 'id'] }]
      >;
      conversations: Table<
        { id: string; project_id: string; visitor_id: string; created_at: string },
        { id?: string; project_id: string; visitor_id: string; created_at?: string },
        { id?: string; project_id?: string; visitor_id?: string; created_at?: string },
        [{ foreignKeyName: 'conversations_project_id_fkey'; columns: ['project_id']; isOneToOne: false; referencedRelation: 'projects'; referencedColumns: ['id'] }]
      >;
      messages: Table<
        { id: string; conversation_id: string; role: 'visitor' | 'bot'; body: string; created_at: string },
        { id?: string; conversation_id: string; role: 'visitor' | 'bot'; body: string; created_at?: string },
        { id?: string; conversation_id?: string; role?: 'visitor' | 'bot'; body?: string; created_at?: string },
        [{ foreignKeyName: 'messages_conversation_id_fkey'; columns: ['conversation_id']; isOneToOne: false; referencedRelation: 'conversations'; referencedColumns: ['id'] }]
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
