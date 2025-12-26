// Kidz Church Module Shared Types

export interface Child {
    id: number
    uuid: string // Original UUID from database for CRUD operations
    first_name: string
    last_name: string
    phone_number?: string
    date_of_birth?: string
    gender?: string
    photo?: string

    // Parent/Guardian (text fields, searchable/typeable)
    mother_name?: string
    father_name?: string
    guardian_name?: string
    guardian_relationship?: string

    // Medical & Emergency Information
    medical_info?: string
    allergies?: string
    special_needs?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string

    // Ministry tracking
    enrolled_date?: string
    status: "active" | "inactive" | "graduated"
    class_group?: string
    notes?: string

    // Metadata
    created_at?: string
    updated_at?: string
}

export interface ChildAttendanceRecord {
    id: string
    child_id: string
    child_name?: string // Derived
    date: string
    service_type: string
    checked_in_at: string
    checked_out_at?: string | null
    checked_in_by?: string
    notes?: string | null
    status?: "present" | "absent"
}

export interface ChildClassGroup {
    id: string
    name: string
    description?: string
    min_age?: number
    max_age?: number
    leader?: string
    leader_id?: string
    status: "Active" | "Inactive"
    children_count?: number // Derived count
}

export interface ChildBirthday {
    id: number
    first_name: string
    last_name: string
    photo?: string
    age: number
    birthday_date: string
    class_group?: string
    days_until?: number
}

export interface ChildStatistics {
    total_children: number
    active_children: number
    inactive_children: number
    graduated_children: number
    children_by_class: { class_group: string; count: number }[]
    recent_enrollments: number
    upcoming_birthdays: number
}
