export type Database = {
  public: {
    Tables: {
      notes: {
        Row: { id: string; owner_id: string; title: string; amount: string; created_at: string }
        Insert: {
          id?: string
          owner_id: string
          title: string
          amount?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          amount?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
