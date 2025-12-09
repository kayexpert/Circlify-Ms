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
      asset_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_disposals: {
        Row: {
          account: string
          account_id: string | null
          amount: number
          asset_category: string
          asset_id: string
          asset_name: string
          created_at: string
          date: string
          description: string | null
          id: string
          linked_income_id: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          account: string
          account_id?: string | null
          amount: number
          asset_category: string
          asset_id: string
          asset_name: string
          created_at?: string
          date: string
          description?: string | null
          id?: string
          linked_income_id?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          account?: string
          account_id?: string | null
          amount?: number
          asset_category?: string
          asset_id?: string
          asset_name?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          linked_income_id?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_linked_income_id_fkey"
            columns: ["linked_income_id"]
            isOneToOne: false
            referencedRelation: "finance_income_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          previous_status: string | null
          purchase_date: string
          quantity: number
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          previous_status?: string | null
          purchase_date: string
          quantity: number
          status: string
          updated_at?: string
          value: number
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          previous_status?: string | null
          purchase_date?: string
          quantity?: number
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          children: number | null
          created_at: string
          date: string
          expected_attendance: number | null
          first_timers: number | null
          id: string
          men: number | null
          notes: string | null
          organization_id: string
          service_type: string
          total_attendance: number
          updated_at: string
          women: number | null
        }
        Insert: {
          children?: number | null
          created_at?: string
          date: string
          expected_attendance?: number | null
          first_timers?: number | null
          id?: string
          men?: number | null
          notes?: string | null
          organization_id: string
          service_type: string
          total_attendance: number
          updated_at?: string
          women?: number | null
        }
        Update: {
          children?: number | null
          created_at?: string
          date?: string
          expected_attendance?: number | null
          first_timers?: number | null
          id?: string
          men?: number | null
          notes?: string | null
          organization_id?: string
          service_type?: string
          total_attendance?: number
          updated_at?: string
          women?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader?: string | null
          name: string
          organization_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type_id: string | null
          id: string
          is_recurring: boolean | null
          location: string | null
          name: string
          organization_id: string
          recurrence_frequency: string | null
          reminder_enabled: boolean | null
          reminder_recipient_ids: Json | null
          reminder_recipient_type: string | null
          reminder_send_time: string | null
          track_attendance: boolean | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type_id?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name: string
          organization_id: string
          recurrence_frequency?: string | null
          reminder_enabled?: boolean | null
          reminder_recipient_ids?: Json | null
          reminder_recipient_type?: string | null
          reminder_send_time?: string | null
          track_attendance?: boolean | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type_id?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string | null
          name?: string
          organization_id?: string
          recurrence_frequency?: string | null
          reminder_enabled?: boolean | null
          reminder_recipient_ids?: Json | null
          reminder_recipient_type?: string | null
          reminder_send_time?: string | null
          track_attendance?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          balance: number
          bank_account_type: string | null
          bank_branch: string | null
          bank_name: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          network: string | null
          number: string | null
          opening_balance: number | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          balance?: number
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          network?: string | null
          number?: string | null
          opening_balance?: number | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          balance?: number
          bank_account_type?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          network?: string | null
          number?: string | null
          opening_balance?: number | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_budgets: {
        Row: {
          budgeted: number
          category: string
          created_at: string
          id: string
          organization_id: string
          period: string
          spent: number | null
          updated_at: string
        }
        Insert: {
          budgeted: number
          category: string
          created_at?: string
          id?: string
          organization_id: string
          period: string
          spent?: number | null
          updated_at?: string
        }
        Update: {
          budgeted?: number
          category?: string
          created_at?: string
          id?: string
          organization_id?: string
          period?: string
          spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          track_members: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          track_members?: boolean | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          track_members?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenditure_records: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          date: string
          description: string
          id: string
          is_reconciled: boolean | null
          linked_liability_id: string | null
          linked_liability_name: string | null
          method: string
          organization_id: string
          reconciled_in_reconciliation: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          date: string
          description: string
          id?: string
          is_reconciled?: boolean | null
          linked_liability_id?: string | null
          linked_liability_name?: string | null
          method: string
          organization_id: string
          reconciled_in_reconciliation?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          is_reconciled?: boolean | null
          linked_liability_id?: string | null
          linked_liability_name?: string | null
          method?: string
          organization_id?: string
          reconciled_in_reconciliation?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenditure_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenditure_records_linked_liability_id_fkey"
            columns: ["linked_liability_id"]
            isOneToOne: false
            referencedRelation: "finance_liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_expenditure_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_expenditure_reconciliation"
            columns: ["reconciled_in_reconciliation"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_income_records: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          is_reconciled: boolean | null
          linked_asset_id: string | null
          member_id: string | null
          member_name: string | null
          method: string
          organization_id: string
          reconciled_in_reconciliation: string | null
          reference: string | null
          source: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          category: string
          created_at?: string
          date: string
          id?: string
          is_reconciled?: boolean | null
          linked_asset_id?: string | null
          member_id?: string | null
          member_name?: string | null
          method: string
          organization_id: string
          reconciled_in_reconciliation?: string | null
          reference?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          is_reconciled?: boolean | null
          linked_asset_id?: string | null
          member_id?: string | null
          member_name?: string | null
          method?: string
          organization_id?: string
          reconciled_in_reconciliation?: string | null
          reference?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_income_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_income_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_income_asset"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_income_member"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_income_reconciliation"
            columns: ["reconciled_in_reconciliation"]
            isOneToOne: false
            referencedRelation: "finance_reconciliation_records"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_liabilities: {
        Row: {
          amount_paid: number | null
          balance: number
          category: string
          created_at: string
          creditor: string
          date: string
          description: string
          id: string
          organization_id: string
          original_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          balance: number
          category: string
          created_at?: string
          creditor: string
          date: string
          description: string
          id?: string
          organization_id: string
          original_amount: number
          status: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          balance?: number
          category?: string
          created_at?: string
          creditor?: string
          date?: string
          description?: string
          id?: string
          organization_id?: string
          original_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_liabilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_reconciliation_records: {
        Row: {
          account_id: string
          account_name: string
          added_expenditure_entries: string[] | null
          added_income_entries: string[] | null
          bank_balance: number
          book_balance: number
          created_at: string
          date: string
          difference: number
          id: string
          notes: string | null
          organization_id: string
          reconciled_expenditure_entries: string[] | null
          reconciled_income_entries: string[] | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          added_expenditure_entries?: string[] | null
          added_income_entries?: string[] | null
          bank_balance: number
          book_balance: number
          created_at?: string
          date: string
          difference: number
          id?: string
          notes?: string | null
          organization_id: string
          reconciled_expenditure_entries?: string[] | null
          reconciled_income_entries?: string[] | null
          status: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          added_expenditure_entries?: string[] | null
          added_income_entries?: string[] | null
          bank_balance?: number
          book_balance?: number
          created_at?: string
          date?: string
          difference?: number
          id?: string
          notes?: string | null
          organization_id?: string
          reconciled_expenditure_entries?: string[] | null
          reconciled_income_entries?: string[] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_reconciliation_records_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_reconciliation_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transfers: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          from_account_id: string
          from_account_name: string
          id: string
          organization_id: string
          to_account_id: string
          to_account_name: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description?: string | null
          from_account_id: string
          from_account_name: string
          id?: string
          organization_id: string
          to_account_id: string
          to_account_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          from_account_id?: string
          from_account_name?: string
          id?: string
          organization_id?: string
          to_account_id?: string
          to_account_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "finance_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader: string | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader?: string | null
          name: string
          organization_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader?: string | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_attendance_records: {
        Row: {
          checked_in_at: string
          created_at: string
          date: string
          event_id: string | null
          id: string
          member_id: string
          notes: string | null
          organization_id: string
          service_type: string
          updated_at: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          date: string
          event_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          organization_id: string
          service_type: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          date?: string
          event_id?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          organization_id?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_attendance_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_attendance_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_follow_ups: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          member_id: string
          method: string
          notes: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          member_id: string
          method: string
          notes: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          member_id?: string
          method?: string
          notes?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_follow_ups_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          departments: string[] | null
          digital_address: string | null
          email: string | null
          first_name: string
          gender: string | null
          groups: string[] | null
          id: string
          join_date: string | null
          last_name: string
          marital_status: string | null
          membership_status: string
          middle_name: string | null
          notes: string | null
          number_of_children: number | null
          occupation: string | null
          organization_id: string
          phone_number: string | null
          photo: string | null
          region: string | null
          secondary_phone: string | null
          spouse_name: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          departments?: string[] | null
          digital_address?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          groups?: string[] | null
          id?: string
          join_date?: string | null
          last_name: string
          marital_status?: string | null
          membership_status: string
          middle_name?: string | null
          notes?: string | null
          number_of_children?: number | null
          occupation?: string | null
          organization_id: string
          phone_number?: string | null
          photo?: string | null
          region?: string | null
          secondary_phone?: string | null
          spouse_name?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          departments?: string[] | null
          digital_address?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          groups?: string[] | null
          id?: string
          join_date?: string | null
          last_name?: string
          marital_status?: string | null
          membership_status?: string
          middle_name?: string | null
          notes?: string | null
          number_of_children?: number | null
          occupation?: string | null
          organization_id?: string
          phone_number?: string | null
          photo?: string | null
          region?: string | null
          secondary_phone?: string | null
          spouse_name?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_api_configurations: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sender_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sender_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sender_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messaging_api_configurations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_message_recipients: {
        Row: {
          cost: number | null
          created_at: string
          error_message: string | null
          id: string
          message_id: string
          personalized_message: string | null
          phone_number: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id: string
          personalized_message?: string | null
          phone_number?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type: string
          sent_at?: string | null
          status: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string
          personalized_message?: string | null
          phone_number?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messaging_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_messages: {
        Row: {
          api_configuration_id: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          is_recurring: boolean | null
          message_name: string
          message_text: string
          organization_id: string
          recipient_count: number
          recipient_type: string
          recurrence_end_date: string | null
          recurrence_frequency: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          api_configuration_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          is_recurring?: boolean | null
          message_name: string
          message_text: string
          organization_id: string
          recipient_count?: number
          recipient_type: string
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          api_configuration_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          is_recurring?: boolean | null
          message_name?: string
          message_text?: string
          organization_id?: string
          recipient_count?: number
          recipient_type?: string
          recurrence_end_date?: string | null
          recurrence_frequency?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_messages_api_configuration_id_fkey"
            columns: ["api_configuration_id"]
            isOneToOne: false
            referencedRelation: "messaging_api_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "messaging_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_notification_settings: {
        Row: {
          birthday_messages_enabled: boolean | null
          birthday_template_id: string | null
          contribution_notifications_enabled: boolean | null
          contribution_template_id: string | null
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          birthday_messages_enabled?: boolean | null
          birthday_template_id?: string | null
          contribution_notifications_enabled?: boolean | null
          contribution_template_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          birthday_messages_enabled?: boolean | null
          birthday_template_id?: string | null
          contribution_notifications_enabled?: boolean | null
          contribution_template_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_notification_settings_birthday_template_id_fkey"
            columns: ["birthday_template_id"]
            isOneToOne: false
            referencedRelation: "messaging_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_notification_settings_contribution_template_id_fkey"
            columns: ["contribution_template_id"]
            isOneToOne: false
            referencedRelation: "messaging_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messaging_notification_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_templates: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messaging_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          email: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          size: string | null
          slug: string
          type: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          size?: string | null
          slug: string
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          size?: string | null
          slug?: string
          type?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      visitor_follow_ups: {
        Row: {
          created_at: string
          date: string
          id: string
          method: string
          notes: string
          organization_id: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          method: string
          notes: string
          organization_id: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          method?: string
          notes?: string
          organization_id?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_follow_ups_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          digital_address: string | null
          email: string | null
          first_name: string
          follow_up_date: string | null
          follow_up_required: boolean | null
          gender: string | null
          id: string
          interests: string | null
          invited_by: string | null
          last_name: string
          marital_status: string | null
          middle_name: string | null
          notes: string | null
          number_of_children: number | null
          occupation: string | null
          organization_id: string
          phone_number: string | null
          photo: string | null
          region: string | null
          secondary_phone: string | null
          source: string | null
          spouse_name: string | null
          status: string
          town: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          digital_address?: string | null
          email?: string | null
          first_name: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          gender?: string | null
          id?: string
          interests?: string | null
          invited_by?: string | null
          last_name: string
          marital_status?: string | null
          middle_name?: string | null
          notes?: string | null
          number_of_children?: number | null
          occupation?: string | null
          organization_id: string
          phone_number?: string | null
          photo?: string | null
          region?: string | null
          secondary_phone?: string | null
          source?: string | null
          spouse_name?: string | null
          status: string
          town?: string | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          digital_address?: string | null
          email?: string | null
          first_name?: string
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          gender?: string | null
          id?: string
          interests?: string | null
          invited_by?: string | null
          last_name?: string
          marital_status?: string | null
          middle_name?: string | null
          notes?: string | null
          number_of_children?: number | null
          occupation?: string | null
          organization_id?: string
          phone_number?: string | null
          photo?: string | null
          region?: string | null
          secondary_phone?: string | null
          source?: string | null
          spouse_name?: string | null
          status?: string
          town?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_can_update_org_users:
        | {
            Args: { p_organization_id: string; p_user_id: string }
            Returns: boolean
          }
        | { Args: { p_organization_id: string }; Returns: boolean }
      get_asset_category_counts: {
        Args: { p_organization_id: string }
        Returns: {
          asset_count: number
          category_name: string
        }[]
      }
      get_department_member_counts: {
        Args: { p_organization_id: string }
        Returns: {
          department_name: string
          member_count: number
        }[]
      }
      get_expenditure_by_category: {
        Args: { p_organization_id: string }
        Returns: {
          category: string
          total: number
        }[]
      }
      get_finance_monthly_trends: {
        Args: { p_months?: number; p_organization_id: string }
        Returns: {
          expenditure: number
          income: number
          liabilities: number
          period_label: string
          period_month: number
          period_year: number
        }[]
      }
      get_finance_overview: {
        Args: { p_organization_id: string }
        Returns: {
          account_count: number
          expenditure_record_count: number
          income_record_count: number
          liability_count: number
          net_balance: number
          total_expenditure: number
          total_income: number
          total_liabilities: number
        }[]
      }
      get_finance_yearly_trends: {
        Args: { p_organization_id: string; p_years?: number }
        Returns: {
          expenditure: number
          income: number
          liabilities: number
          period_label: string
          period_year: number
        }[]
      }
      get_group_member_counts: {
        Args: { p_organization_id: string }
        Returns: {
          group_name: string
          member_count: number
        }[]
      }
      get_income_by_category: {
        Args: { p_organization_id: string }
        Returns: {
          category: string
          total: number
        }[]
      }
      get_member_statistics: {
        Args: { p_organization_id: string }
        Returns: {
          active_members: number
          birthdays_this_month: number
          birthdays_this_week: number
          birthdays_today: number
          female_members: number
          inactive_members: number
          male_members: number
          total_departments: number
          total_groups: number
          total_members: number
        }[]
      }
      get_recent_members: {
        Args: { p_limit?: number; p_organization_id: string }
        Returns: {
          first_name: string
          id: string
          join_date: string
          last_name: string
        }[]
      }
      get_upcoming_birthdays: {
        Args: { p_days_ahead?: number; p_organization_id: string }
        Returns: {
          age: number
          date_of_birth: string
          days_until: number
          first_name: string
          id: string
          last_name: string
          photo: string
        }[]
      }
      get_user_organization_id: { Args: never; Returns: string }
      recalculate_all_account_balances: {
        Args: { p_organization_id: string }
        Returns: {
          account_id: string
          account_name: string
          new_balance: number
          old_balance: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

