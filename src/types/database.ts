export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      organization_users: {
        Row: OrganizationUser
        Insert: OrganizationUserInsert
        Update: OrganizationUserUpdate
      }
      user_sessions: {
        Row: UserSession
        Insert: UserSessionInsert
        Update: UserSessionUpdate
      }
    }
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  type: string
  size?: string | null
  description?: string | null
  currency: string
  location?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  settings: Json
  created_at: string
  updated_at: string
}

export interface OrganizationInsert {
  id?: string
  name: string
  slug: string
  type?: string
  size?: string | null
  description?: string | null
  currency?: string
  location?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  settings?: Json
  created_at?: string
  updated_at?: string
}

export interface OrganizationUpdate {
  name?: string
  slug?: string
  type?: string
  size?: string | null
  description?: string | null
  currency?: string
  location?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
  settings?: Json
  updated_at?: string
}

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  email?: string
  full_name?: string | null
  avatar_url?: string | null
  updated_at?: string
}

export interface OrganizationUser {
  id: string
  organization_id: string
  user_id: string
  role: 'super_admin' | 'admin' | 'member' | 'viewer'
  created_at: string
  updated_at: string
}

export interface OrganizationUserInsert {
  id?: string
  organization_id: string
  user_id: string
  role?: 'admin' | 'member'
  created_at?: string
  updated_at?: string
}

export interface OrganizationUserUpdate {
  role?: 'admin' | 'member'
  updated_at?: string
}

export interface UserSession {
  id: string
  user_id: string
  organization_id: string
  created_at: string
  updated_at: string
}

export interface UserSessionInsert {
  id?: string
  user_id: string
  organization_id: string
  created_at?: string
  updated_at?: string
}

export interface UserSessionUpdate {
  organization_id?: string
  updated_at?: string
}

// Form types
export interface SignUpData {
  email: string
  password: string
  full_name: string
}

export interface SignInData {
  email: string
  password: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ResetPasswordData {
  password: string
  confirmPassword: string
}

export interface OrganizationSetupData {
  name: string
  type: string
}

