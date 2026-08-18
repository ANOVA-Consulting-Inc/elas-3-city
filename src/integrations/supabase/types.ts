export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      anova_signatory: {
        Row: {
          active: boolean;
          authority_ref: string;
          created_at: string;
          id: string;
          name: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          authority_ref: string;
          created_at?: string;
          id?: string;
          name: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          authority_ref?: string;
          created_at?: string;
          id?: string;
          name?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      city_participations: {
        Row: {
          address: string | null;
          certificate_path: string | null;
          created_at: string;
          email: string;
          id: string;
          ip: string | null;
          name: string;
          org: string | null;
          project: string | null;
          ref: string | null;
          registered_at: string;
          signature_name: string | null;
          user_agent: string | null;
        };
        Insert: {
          address?: string | null;
          certificate_path?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          ip?: string | null;
          name: string;
          org?: string | null;
          project?: string | null;
          ref?: string | null;
          registered_at?: string;
          signature_name?: string | null;
          user_agent?: string | null;
        };
        Update: {
          address?: string | null;
          certificate_path?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          ip?: string | null;
          name?: string;
          org?: string | null;
          project?: string | null;
          ref?: string | null;
          registered_at?: string;
          signature_name?: string | null;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      dms_audit_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string | null;
          created_at: string;
          document_id: string | null;
          id: string;
          metadata: Json;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          metadata?: Json;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string | null;
          created_at?: string;
          document_id?: string | null;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "dms_audit_log_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "dms_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      dms_document_versions: {
        Row: {
          document_id: string;
          filename: string;
          id: string;
          mime_type: string | null;
          notes: string | null;
          size_bytes: number | null;
          storage_path: string;
          uploaded_at: string;
          uploaded_by: string | null;
          version_no: number;
        };
        Insert: {
          document_id: string;
          filename: string;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          version_no: number;
        };
        Update: {
          document_id?: string;
          filename?: string;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          uploaded_at?: string;
          uploaded_by?: string | null;
          version_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: "dms_document_versions_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "dms_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      dms_documents: {
        Row: {
          ack_id: string | null;
          created_at: string;
          created_by: string | null;
          current_version_id: string | null;
          description: string | null;
          folder_id: string | null;
          id: string;
          search: unknown;
          tags: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          ack_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_version_id?: string | null;
          description?: string | null;
          folder_id?: string | null;
          id?: string;
          search?: unknown;
          tags?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          ack_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          current_version_id?: string | null;
          description?: string | null;
          folder_id?: string | null;
          id?: string;
          search?: unknown;
          tags?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dms_documents_ack_id_fkey";
            columns: ["ack_id"];
            isOneToOne: false;
            referencedRelation: "eoi_acknowledgements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dms_documents_current_version_fk";
            columns: ["current_version_id"];
            isOneToOne: false;
            referencedRelation: "dms_document_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dms_documents_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "dms_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      dms_folders: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dms_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "dms_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      email_send_log: {
        Row: {
          created_at: string;
          error_message: string | null;
          id: string;
          message_id: string | null;
          metadata: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email: string;
          status: string;
          template_name: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          id?: string;
          message_id?: string | null;
          metadata?: Json | null;
          recipient_email?: string;
          status?: string;
          template_name?: string;
        };
        Relationships: [];
      };
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number;
          batch_size: number;
          id: number;
          retry_after_until: string | null;
          send_delay_ms: number;
          transactional_email_ttl_minutes: number;
          updated_at: string;
        };
        Insert: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Update: {
          auth_email_ttl_minutes?: number;
          batch_size?: number;
          id?: number;
          retry_after_until?: string | null;
          send_delay_ms?: number;
          transactional_email_ttl_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_unsubscribe_tokens: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          token: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          token: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          token?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      eoi_access_attempts: {
        Row: {
          attempted_at: string;
          email: string;
          id: number;
          ip: string | null;
        };
        Insert: {
          attempted_at?: string;
          email: string;
          id?: number;
          ip?: string | null;
        };
        Update: {
          attempted_at?: string;
          email?: string;
          id?: number;
          ip?: string | null;
        };
        Relationships: [];
      };
      eoi_acknowledgements: {
        Row: {
          address: string | null;
          countersigned_at: string | null;
          countersigned_by: string | null;
          countersigner_authority_ref: string | null;
          countersigner_title: string | null;
          created_at: string;
          delivered_at: string | null;
          email: string;
          id: string;
          ip: string | null;
          name: string;
          org: string | null;
          pdf_path: string | null;
          pdf_sha256: string | null;
          project: string | null;
          ref: string | null;
          signature_name: string | null;
          signed_at: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          address?: string | null;
          countersigned_at?: string | null;
          countersigned_by?: string | null;
          countersigner_authority_ref?: string | null;
          countersigner_title?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          email: string;
          id?: string;
          ip?: string | null;
          name: string;
          org?: string | null;
          pdf_path?: string | null;
          pdf_sha256?: string | null;
          project?: string | null;
          ref?: string | null;
          signature_name?: string | null;
          signed_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          address?: string | null;
          countersigned_at?: string | null;
          countersigned_by?: string | null;
          countersigner_authority_ref?: string | null;
          countersigner_title?: string | null;
          created_at?: string;
          delivered_at?: string | null;
          email?: string;
          id?: string;
          ip?: string | null;
          name?: string;
          org?: string | null;
          pdf_path?: string | null;
          pdf_sha256?: string | null;
          project?: string | null;
          ref?: string | null;
          signature_name?: string | null;
          signed_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      eoi_name_correction_requests: {
        Row: {
          claimed_name: string;
          created_at: string;
          current_name: string | null;
          email: string;
          id: string;
          note: string | null;
          resolved_at: string | null;
          user_id: string | null;
        };
        Insert: {
          claimed_name: string;
          created_at?: string;
          current_name?: string | null;
          email: string;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          claimed_name?: string;
          created_at?: string;
          current_name?: string | null;
          email?: string;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      eoi_recipients: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          invited_at: string;
          invited_by: string | null;
          name: string;
          name_needs_review: boolean;
          org: string | null;
          revoked_at: string | null;
          surname: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          name: string;
          name_needs_review?: boolean;
          org?: string | null;
          revoked_at?: string | null;
          surname?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          name?: string;
          name_needs_review?: boolean;
          org?: string | null;
          revoked_at?: string | null;
          surname?: string | null;
        };
        Relationships: [];
      };
      platform_access_requests: {
        Row: {
          admin_note: string | null;
          id: string;
          note: string | null;
          requested_at: string;
          responded_at: string | null;
          responded_by: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          id?: string;
          note?: string | null;
          requested_at?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          id?: string;
          note?: string | null;
          requested_at?: string;
          responded_at?: string | null;
          responded_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      suppressed_emails: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          metadata: Json | null;
          reason: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          metadata?: Json | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      email_queue_dispatch: { Args: never; Returns: undefined };
      enqueue_email: {
        Args: { payload: Json; queue_name: string };
        Returns: number;
      };
      eoi_claim_legacy_acks: { Args: never; Returns: number };
      eoi_is_allowlisted: { Args: never; Returns: boolean };
      eoi_lookup_signer: {
        Args: { p_email: string };
        Returns: {
          found: boolean;
          name: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      move_to_dlq: {
        Args: {
          dlq_name: string;
          message_id: number;
          payload: Json;
          source_queue: string;
        };
        Returns: number;
      };
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number };
        Returns: {
          message: Json;
          msg_id: number;
          read_ct: number;
        }[];
      };
    };
    Enums: {
      app_role: "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const;
