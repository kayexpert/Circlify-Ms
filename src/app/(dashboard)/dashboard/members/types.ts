// Members Module Shared Types

export interface Member {
  id: number
  uuid: string // Original UUID from database for CRUD operations
  first_name: string
  last_name: string
  email: string
  phone_number: string
  secondary_phone?: string
  photo?: string
  membership_status: "active" | "inactive" | "visitor"
  join_date?: string
  city?: string
  region?: string
  middle_name?: string
  gender?: string
  date_of_birth?: string
  marital_status?: string
  spouse_name?: string
  number_of_children?: number
  occupation?: string
  address?: string
  town?: string
  digital_address?: string
  groups?: string[]
  departments?: string[]
  notes?: string
}

export interface Visitor {
  id: number
  first_name: string
  last_name: string
  middle_name?: string
  email: string
  phone_number: string
  secondary_phone?: string
  photo?: string
  status: "New" | "Returning"
  visit_date: string
  source: "Walk-in" | "Invited" | "Online"
  follow_up_required: boolean
  gender?: string
  date_of_birth?: string
  marital_status?: string
  spouse_name?: string
  number_of_children?: number
  occupation?: string
  address?: string
  city?: string
  town?: string
  region?: string
  digital_address?: string
  invited_by?: string
  interests?: string
  notes?: string
  follow_up_date?: string
}

export interface VisitorFollowUp {
  id: string
  visitor_id: string
  date: string
  method: string
  notes: string
  created_at?: string
}

export interface AttendanceRecord {
  id: number
  date: string
  service_type: string
  expected_attendance?: number
  total_attendance: number
  men: number
  women: number
  children: number
  first_timers: number
  notes?: string
}

export interface Group {
  id: string
  name: string
  description: string
  leader: string
  members: number
  status: "Active" | "Inactive"
}

export interface Department {
  id: string
  name: string
  description: string
  leader: string
  members: number
  status: "Active" | "Inactive"
}

export interface Birthday {
  id: number
  first_name: string
  last_name: string
  photo?: string
  age: number
  birthday_date: string
  role?: string
  days_until?: number
}
