"use client"

import React, { useState, useRef, useMemo, useCallback, useEffect, startTransition } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Mail, Printer, User as UserIcon, Calendar, Upload, Trash2, X, ChevronDown, UserCheck, CheckCircle2, XCircle, Plus as PlusIcon, Download, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Loader, Spinner } from "@/components/ui/loader"
import Image from "next/image"
import { formatDate, formatRecordDate, formatCurrency } from "./utils"
import { useMembersPaginated, useCreateMember, useUpdateMember, useDeleteMember, useMember } from "@/hooks/members"
import { useGroups } from "@/hooks/members"
import { useDepartments } from "@/hooks/members"
import { useRolesPositions } from "@/hooks/members"
import { convertMember } from "@/lib/utils/type-converters"
import { createClient } from "@/lib/supabase/client"
import { useMemberAttendanceRecords, useDeleteMemberAttendanceRecord } from "@/hooks/members"
import { useMemberFollowUps, useCreateMemberFollowUp, useUpdateMemberFollowUp, useDeleteMemberFollowUp } from "@/hooks/members"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useOrganization } from "@/hooks/use-organization"
import { useQueryClient } from "@tanstack/react-query"
import { generateMemberSampleExcel, parseExcelFile } from "@/lib/utils/excel-export"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import type { Member } from "./types"
import type { IncomeRecord } from "@/app/(dashboard)/dashboard/finance/types"
import { SpouseAutocomplete } from "@/components/members/SpouseAutocomplete"

// Ensure we're using the correct Member type from members module
type MembersModuleMember = Member

// Memoized Member Card component to prevent unnecessary re-renders
// Optimized for large lists with better memoization
const MemberCard = React.memo(({
  member,
  onClick,
  onHover
}: {
  member: Member
  onClick: (member: Member) => void
  onHover?: (memberId: string) => void
}) => {
  const handleClick = useCallback(() => {
    onClick(member)
  }, [member, onClick])

  const handleMouseEnter = useCallback(() => {
    if (onHover && member.uuid) {
      onHover(member.uuid)
    }
  }, [onHover, member.uuid])

  const phoneNumbers = useMemo(() => {
    return [member.phone_number, member.secondary_phone]
      .filter(Boolean)
      .join(" | ")
  }, [member.phone_number, member.secondary_phone])

  const initials = useMemo(() => {
    return `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`
  }, [member.first_name, member.last_name])

  const badgeClassName = useMemo(() => {
    return member.membership_status === "active"
      ? "bg-green-500 hover:bg-green-600"
      : "bg-red-500 hover:bg-red-600"
  }, [member.membership_status])

  return (
    <Card
      className="relative overflow-hidden border-0 border-l-0 border-r-0 border-b-0 border-t-4 cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
      style={{ borderTopColor: '#14b8a6' } as React.CSSProperties}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
    >
      <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
        {member.photo && !member.photo.startsWith('data:') ? (
          <Image
            src={member.photo}
            alt={`${member.first_name} ${member.last_name}`}
            fill
            className="object-cover object-top"
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
          />
        ) : (
          <div className="text-4xl font-bold text-muted-foreground">
            {initials}
          </div>
        )}
      </div>
      <div className="p-3 text-center space-y-1">
        <p className="font-medium text-md">{member.first_name} {member.last_name}</p>
        <p className="text-xs text-muted-foreground">
          {phoneNumbers}
        </p>
      </div>
      {member.membership_status && (
        <Badge
          className={`absolute top-2 right-2 text-white text-xs rounded-sm ${badgeClassName}`}
        >
          {member.membership_status}
        </Badge>
      )}
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  // Only re-render if these specific fields change
  return (
    prevProps.member.id === nextProps.member.id &&
    prevProps.member.first_name === nextProps.member.first_name &&
    prevProps.member.last_name === nextProps.member.last_name &&
    prevProps.member.photo === nextProps.member.photo &&
    prevProps.member.membership_status === nextProps.member.membership_status &&
    prevProps.member.phone_number === nextProps.member.phone_number &&
    prevProps.member.secondary_phone === nextProps.member.secondary_phone &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onHover === nextProps.onHover
  )
})
MemberCard.displayName = "MemberCard"

// Multi-select component for groups/departments - memoized for performance
const MultiSelect = React.memo(function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder,
  label,
  setupLink,
  setupMessage,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder: string
  label: string
  setupLink?: string
  setupMessage?: string
}) {
  const [open, setOpen] = useState(false)

  const toggleOption = useCallback((value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((v) => v !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }, [selected, onSelectionChange])

  const removeOption = useCallback((value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selected.filter((v) => v !== value))
  }, [selected, onSelectionChange])

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-10 h-auto py-2 px-3"
            type="button"
            disabled={options.length === 0 && !setupLink}
          >
            <div className="flex flex-wrap gap-1 flex-1 mr-2">
              {selected.length === 0 ? (
                options.length === 0 && setupLink ? (
                  <span className="text-muted-foreground italic">No {label.toLowerCase()} available</span>
                ) : (
                  <span className="text-muted-foreground">{placeholder}</span>
                )
              ) : (
                selected.map((value) => {
                  const option = options.find((opt) => opt.value === value)
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{option?.label || value}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => removeOption(value, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            removeOption(value, e as any)
                          }
                        }}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  )
                })
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[110]" align="start">
          <ScrollArea className="h-[200px]">
            <div className="p-2">
              {options.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {setupMessage || `No ${label.toLowerCase()} available`}
                  </p>
                  {setupLink && (
                    <Link
                      href={setupLink}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 underline transition-colors"
                    >
                      <span>Click here to add {label.toLowerCase()}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              ) : (
                options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleOption(option.value)}
                  >
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => toggleOption(option.value)}
                    />
                    <Label className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if options, selected, or callbacks change
  return (
    prevProps.options.length === nextProps.options.length &&
    prevProps.options.every((opt, idx) =>
      opt.value === nextProps.options[idx]?.value &&
      opt.label === nextProps.options[idx]?.label
    ) &&
    prevProps.selected.length === nextProps.selected.length &&
    prevProps.selected.every(val => nextProps.selected.includes(val)) &&
    prevProps.onSelectionChange === nextProps.onSelectionChange &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.label === nextProps.label &&
    prevProps.setupLink === nextProps.setupLink &&
    prevProps.setupMessage === nextProps.setupMessage
  )
})
MultiSelect.displayName = "MultiSelect"

// Country options
const countryOptions = [
  { value: "gh", label: "Ghana" },
  { value: "ng", label: "Nigeria" },
  { value: "ke", label: "Kenya" },
  { value: "za", label: "South Africa" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
]

export default function MembersContent() {
  const { organization } = useOrganization()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(24) // 24 for grid layout (4x6)

  // Fetch data using hooks
  // Explicitly type to ensure we use the correct Member type from members module
  const { data: membersData, isLoading: membersLoading } = useMembersPaginated(currentPage, pageSize)
  const allMembersData = membersData?.data || []
  const totalMembers = membersData?.total || 0
  const totalPages = membersData?.totalPages || 0
  // Type assertion to resolve conflict between finance/types.Member and members/types.Member
  const allMembers = allMembersData as unknown as Member[]
  const { data: groups = [], isLoading: groupsLoading } = useGroups()
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  const { data: rolesPositions = [] } = useRolesPositions()
  const queryClient = useQueryClient()

  // Mutations
  const createMember = useCreateMember()
  const updateMember = useUpdateMember()
  const deleteMember = useDeleteMember()

  // Prefetch full member data on hover for instant loading when drawer opens
  // Throttled to prevent excessive prefetching
  const handleMemberHover = useCallback((memberId: string) => {
    if (!organization?.id || !memberId) return

    // Check if already cached to avoid unnecessary prefetch
    const cached = queryClient.getQueryData(["members", organization.id, memberId])
    if (cached) return

    // Prefetch full member data when hovering over a card
    // This makes the drawer open instantly with all data already cached
    queryClient.prefetchQuery({
      queryKey: ["members", organization.id, memberId],
      queryFn: async () => {
        try {
          const supabase = createClient()
          const { data, error } = await (supabase
            .from("members") as any)
            .select("id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, membership_status, join_date, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, notes, groups, departments, roles, created_at, updated_at")
            .eq("id", memberId)
            .eq("organization_id", organization.id)
            .single()

          if (error) {
            // Log detailed error information with defensive property access
            const errorInfo: Record<string, unknown> = {
              memberId,
              organizationId: organization.id,
            }

            // Safely extract error properties
            let hasErrorProperties = false
            if (error && typeof error === 'object' && error !== null) {
              // Check if error object has any enumerable properties
              const errorKeys = Object.keys(error)
              if (errorKeys.length === 0) {
                // Empty error object - likely a false positive or network issue
                errorInfo.message = "Empty error object returned from database query"
                hasErrorProperties = true
              } else {
                // Extract known error properties
                if ('message' in error && error.message) {
                  errorInfo.message = error.message
                  hasErrorProperties = true
                }
                if ('code' in error && error.code) {
                  errorInfo.code = error.code
                  hasErrorProperties = true
                }
                if ('details' in error && error.details) {
                  errorInfo.details = error.details
                  hasErrorProperties = true
                }
                if ('hint' in error && error.hint) {
                  errorInfo.hint = error.hint
                  hasErrorProperties = true
                }
                // If error object has no useful properties, stringify it
                if (!hasErrorProperties && errorKeys.length > 0) {
                  try {
                    const errorString = JSON.stringify(error)
                    // Only add if it's not just an empty object
                    if (errorString !== '{}') {
                      errorInfo.errorString = errorString
                      hasErrorProperties = true
                    }
                  } catch {
                    errorInfo.errorString = String(error)
                    hasErrorProperties = true
                  }
                }
              }
            } else if (error) {
              // Non-object error (string, number, etc.)
              errorInfo.error = String(error)
              hasErrorProperties = true
            }

            // Only log if we have meaningful error information
            if (hasErrorProperties) {
              console.error("Error prefetching member:", errorInfo)
            } else {
              // Silent fail for empty/unclear errors to avoid console spam
              // This can happen with network issues or race conditions
            }
            // Return null to prevent query failure, but don't cache the error
            return null
          }

          return data ? convertMember(data) : null
        } catch (err) {
          // Handle unexpected errors
          console.error("Unexpected error prefetching member:", {
            error: err instanceof Error ? err.message : String(err),
            memberId,
            organizationId: organization.id,
          })
          return null
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    }).catch((err) => {
      // Silently handle prefetch errors to prevent console noise
      // The error is already logged in the queryFn above
      if (process.env.NODE_ENV === 'development') {
        console.debug("Prefetch query failed (non-critical):", err)
      }
    })
  }, [organization?.id, queryClient])

  const isLoading = membersLoading || groupsLoading || departmentsLoading

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useState("all")
  const [attendanceEventTypeFilter, setAttendanceEventTypeFilter] = useState("all")

  // Debounce search input to reduce filter operations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, filterStatus])
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedMemberUUID, setSelectedMemberUUID] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
    email: "",
    phone_number: "",
    secondary_phone: "",
    gender: "",
    date_of_birth: "",
    marital_status: "",
    spouse_name: "",
    number_of_children: "",
    occupation: "",
    address: "",
    city: "",
    town: "",
    region: "",
    digital_address: "",
    join_date: "",
    membership_status: "active",
    groups: [] as string[],
    departments: [] as string[],
    roles: [] as string[],
    notes: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [activeTab, setActiveTab] = useState("bio")

  // Follow-up form state
  const [followUpForm, setFollowUpForm] = useState<{
    date: Date | undefined
    method: string
    notes: string
  }>({
    date: undefined,
    method: "",
    notes: "",
  })
  const [isFollowUpSheetOpen, setIsFollowUpSheetOpen] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [joinDate, setJoinDate] = useState<Date | undefined>(undefined)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync selectedMember when allMembers updates (e.g., after a successful update)
  // This ensures that when the query refetches, we update the selectedMember with the latest data
  // Optimized to only run when necessary
  useEffect(() => {
    if (!selectedMember || !selectedMemberUUID || allMembers.length === 0 || !isSheetOpen) {
      return
    }

    const refreshedMember = allMembers.find(m => m.uuid === selectedMemberUUID)
    if (!refreshedMember) return

    // Check if any fields have changed by comparing key fields
    // Use shallow comparison for arrays to avoid expensive JSON.stringify
    const groupsChanged = (refreshedMember as any).groups?.length !== (selectedMember as any).groups?.length ||
      (refreshedMember as any).groups?.some((g: string, i: number) => g !== (selectedMember as any).groups?.[i])
    const departmentsChanged = (refreshedMember as any).departments?.length !== (selectedMember as any).departments?.length ||
      (refreshedMember as any).departments?.some((d: string, i: number) => d !== (selectedMember as any).departments?.[i])
    const rolesChanged = (refreshedMember as any).roles?.length !== (selectedMember as any).roles?.length ||
      (refreshedMember as any).roles?.some((r: string, i: number) => r !== (selectedMember as any).roles?.[i])

    const hasChanges =
      refreshedMember.first_name !== selectedMember.first_name ||
      refreshedMember.last_name !== selectedMember.last_name ||
      refreshedMember.photo !== selectedMember.photo ||
      groupsChanged ||
      departmentsChanged ||
      rolesChanged

    if (hasChanges) {
      // Update selectedMember with fresh data
      setSelectedMember(refreshedMember as Member)
      // Update form data to match (only if drawer is open)
      setFormData(prev => ({
        ...prev,
        first_name: refreshedMember.first_name || prev.first_name,
        last_name: refreshedMember.last_name || prev.last_name,
        groups: (refreshedMember as any).groups || prev.groups,
        departments: (refreshedMember as any).departments || prev.departments,
        roles: (refreshedMember as any).roles || prev.roles,
      }))
      if (refreshedMember.photo) {
        setPhotoPreview(refreshedMember.photo)
      }
    }
  }, [allMembers, selectedMember, selectedMemberUUID, isSheetOpen]) // Re-run whenever allMembers changes (after refetch)

  // Income records - only load when payment tab is active to improve initial load time
  const shouldLoadIncomeRecords = activeTab === "payments" && selectedMember !== null

  // Fetch member attendance and follow-ups when member is selected and on relevant tabs
  // Use selectedMemberUUID directly (it's already set when member is clicked)
  const memberUUIDForHooks = selectedMemberUUID

  const { data: memberAttendanceRecords = [] } = useMemberAttendanceRecords(
    (activeTab === "attendance" && memberUUIDForHooks) ? memberUUIDForHooks : null
  )
  const { data: memberFollowUps = [] } = useMemberFollowUps(
    (activeTab === "followup" && memberUUIDForHooks) ? memberUUIDForHooks : null
  )

  // Mutations for follow-ups
  const createFollowUp = useCreateMemberFollowUp()
  const updateFollowUp = useUpdateMemberFollowUp()
  const deleteFollowUp = useDeleteMemberFollowUp()
  const deleteAttendanceRecord = useDeleteMemberAttendanceRecord()
  const { data: incomeRecords = [], isLoading: incomeLoading } = useIncomeRecords(shouldLoadIncomeRecords)

  // UUID is now stored directly in member object via convertMember
  // No need for separate database lookup - use member.uuid directly

  // Filter members based on search and status - using debounced search
  // Optimized with early returns and memoized search query
  const searchQueryLower = useMemo(() => debouncedSearchQuery.toLowerCase(), [debouncedSearchQuery])
  const filteredMembers = useMemo((): Member[] => {
    if (!searchQueryLower && filterStatus === "all") {
      return allMembers // Early return for no filters
    }

    return allMembers.filter((member): member is Member => {
      // Only compute search text if needed
      if (searchQueryLower) {
        const searchText = `${member.first_name} ${member.last_name} ${member.email || ''} ${member.phone_number || ''}`.toLowerCase()
        if (!searchText.includes(searchQueryLower)) {
          return false
        }
      }

      // Status filter
      if (filterStatus !== "all" && member.membership_status !== filterStatus) {
        return false
      }

      return true
    })
  }, [allMembers, searchQueryLower, filterStatus])

  // Prepare groups and departments options for multi-select
  const groupOptions = useMemo(() => {
    return groups.map(group => ({ value: group.name, label: group.name }))
  }, [groups])

  const departmentOptions = useMemo(() => {
    return departments.map(dept => ({ value: dept.name, label: dept.name }))
  }, [departments])

  const rolePositionOptions = useMemo(() => {
    return rolesPositions.map(role => ({ value: role.name, label: role.name }))
  }, [rolesPositions])

  // Calculate member contributions for payment history
  // Only compute when payments tab is active to improve performance
  // Memoize member name to avoid recalculating
  const memberFullNameLower = useMemo(() => {
    if (!selectedMember) return ""
    return `${selectedMember.first_name} ${selectedMember.last_name}`.toLowerCase().trim()
  }, [selectedMember?.first_name, selectedMember?.last_name])

  const memberContributions = useMemo(() => {
    if (!selectedMember || activeTab !== "payments" || incomeRecords.length === 0) return []

    const memberId = selectedMember.id

    return incomeRecords.filter((record) => {
      // Primary match: by memberId (if both exist and match) - fastest check
      if (record.memberId && memberId && record.memberId === memberId) {
        return true
      }

      // Secondary match: by member name (case-insensitive, with multiple formats)
      if (record.memberName && memberFullNameLower) {
        const recordMemberNameLower = record.memberName.toLowerCase().trim()
        // Exact match first (most common)
        if (recordMemberNameLower === memberFullNameLower) {
          return true
        }
        // Partial match (handles extra spaces or formatting differences)
        if (recordMemberNameLower.includes(memberFullNameLower) || memberFullNameLower.includes(recordMemberNameLower)) {
          return true
        }
      }

      return false
    })
  }, [incomeRecords, selectedMember, activeTab, memberFullNameLower])

  // Filtered contributions based on category
  const filteredContributions = useMemo(() => {
    if (paymentCategoryFilter === "all") return memberContributions
    return memberContributions.filter(r => r.category === paymentCategoryFilter)
  }, [memberContributions, paymentCategoryFilter])

  // Calculate contribution stats - only when payments tab is active
  const contributionStats = useMemo(() => {
    if (activeTab !== "payments" || memberContributions.length === 0) {
      return { total: 0, thisYear: 0 }
    }

    const total = memberContributions.reduce((sum, record) => sum + (record.amount || 0), 0)
    const currentYear = new Date().getFullYear()
    const thisYear = memberContributions
      .filter((record) => {
        const recordDate = record.date instanceof Date ? record.date : new Date(record.date)
        return recordDate.getFullYear() === currentYear
      })
      .reduce((sum, record) => sum + (record.amount || 0), 0)

    return { total, thisYear }
  }, [memberContributions, activeTab])

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      middle_name: "",
      email: "",
      phone_number: "",
      secondary_phone: "",
      gender: "",
      date_of_birth: "",
      marital_status: "",
      spouse_name: "",
      number_of_children: "",
      occupation: "",
      address: "",
      city: "",
      town: "",
      region: "",
      digital_address: "",
      join_date: "",
      membership_status: "active",
      groups: [],
      departments: [],
      roles: [],
      notes: "",
    })
    setFormErrors({})
    setPhotoPreview(null)
    setSelectedMember(null)
    setSelectedMemberUUID(null)
    setDateOfBirth(undefined)
    setJoinDate(undefined)
    setActiveTab("bio")
  }

  const handleMemberClick = useCallback(async (member: Member) => {
    // Open drawer IMMEDIATELY for instant feedback
    setIsSheetOpen(true)

    // Set basic member data immediately
    setSelectedMember(member)
    setSelectedMemberUUID(member.uuid || null)
    setActiveTab("bio")

    // Try to get prefetched full member data from cache first
    // If not available, use the member object from list (may have limited fields)
    let fullMember: Member | null = null
    if (member.uuid && organization?.id) {
      const cachedData = queryClient.getQueryData<Member>(["members", organization.id, member.uuid])
      if (cachedData) {
        fullMember = cachedData
      } else {
        // If not cached, fetch it quickly in background
        // Don't await - let it populate cache for next time
        const supabase = createClient()
          ; (async () => {
            try {
              const { data, error } = await (supabase
                .from("members") as any)
                .select("id, first_name, last_name, middle_name, email, phone_number, secondary_phone, photo, membership_status, join_date, gender, date_of_birth, marital_status, spouse_name, number_of_children, occupation, address, city, town, region, digital_address, notes, groups, departments, roles, created_at, updated_at")
                .eq("id", member.uuid)
                .eq("organization_id", organization.id)
                .single()

              if (!error && data) {
                fullMember = convertMember(data)
                // Cache it for future use
                queryClient.setQueryData(["members", organization.id, member.uuid], fullMember)
                // Update selectedMember if drawer is still open
                if (isSheetOpen) {
                  setSelectedMember(fullMember)
                }
              }
            } catch (error) {
              console.error("Error fetching full member data:", error)
            }
          })()
      }
    }

    // Use full member data if available, otherwise fall back to list member data
    const memberToUse = fullMember || member

    // Set form data with all available fields
    const joinDateObj = memberToUse.join_date ? new Date(memberToUse.join_date + "T00:00:00") : undefined
    const dobObj = memberToUse.date_of_birth ? new Date(memberToUse.date_of_birth + "T00:00:00") : undefined

    startTransition(() => {
      setFormData({
        first_name: memberToUse.first_name || "",
        last_name: memberToUse.last_name || "",
        middle_name: memberToUse.middle_name || "",
        email: memberToUse.email || "",
        phone_number: memberToUse.phone_number || "",
        secondary_phone: memberToUse.secondary_phone || "",
        gender: memberToUse.gender || "",
        date_of_birth: memberToUse.date_of_birth || "",
        marital_status: memberToUse.marital_status || "",
        spouse_name: memberToUse.spouse_name || "",
        number_of_children: memberToUse.number_of_children?.toString() || "",
        occupation: memberToUse.occupation || "",
        address: memberToUse.address || "",
        city: memberToUse.city || "",
        town: memberToUse.town || "",
        region: memberToUse.region || "",
        digital_address: memberToUse.digital_address || "",
        join_date: memberToUse.join_date || "",
        membership_status: memberToUse.membership_status || "active",
        groups: memberToUse.groups || [],
        departments: memberToUse.departments || [],
        roles: memberToUse.roles || [],
        notes: memberToUse.notes || "",
      })
      setDateOfBirth(dobObj && !isNaN(dobObj.getTime()) ? dobObj : undefined)
      setJoinDate(joinDateObj && !isNaN(joinDateObj.getTime()) ? joinDateObj : undefined)
      setPhotoPreview(memberToUse.photo || null)
      setFormErrors({})

      // Update selectedMember with full data if we fetched it
      if (fullMember) {
        setSelectedMember(fullMember)
      }
    })
  }, [organization?.id, queryClient, isSheetOpen])

  const handleAddMember = () => {
    resetForm()
    setIsSheetOpen(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!organization?.id) {
      toast.error('Organization not found')
      return
    }

    // Validate file
    const { validateImageFile, PROFILE_PHOTO_OPTIONS } = await import('@/lib/utils/image-compression')
    const validation = validateImageFile(file, 10) // Max 10MB before compression

    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid image file')
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
      return
    }

    try {
      setIsUploadingPhoto(true)

      // Delete old photo if it exists (when updating existing member)
      const oldPhotoUrl = selectedMember?.photo || photoPreview
      if (oldPhotoUrl && typeof oldPhotoUrl === 'string' && !oldPhotoUrl.startsWith('data:')) {
        try {
          await fetch('/api/members/delete-photo', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: oldPhotoUrl }),
          })
        } catch (deleteError) {
          // Log but don't fail if old photo deletion fails
          console.error('Error deleting old photo:', deleteError)
        }
      }

      // Compress image aggressively for profile photos
      const { compressImage } = await import('@/lib/utils/image-compression')
      const compressedFile = await compressImage(file, PROFILE_PHOTO_OPTIONS)

      // Upload compressed file to Supabase Storage
      const uploadFormData = new FormData()
      uploadFormData.append('file', compressedFile)
      uploadFormData.append('organizationId', organization.id)

      const uploadResponse = await fetch('/api/members/upload-photo', {
        method: 'POST',
        body: uploadFormData,
      })

      const uploadResult = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || 'Failed to upload photo')
      }

      // Store the storage URL in photoPreview
      setPhotoPreview(uploadResult.url)

      // Show compression info
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)
      const compressedSizeKB = (compressedFile.size / 1024).toFixed(2)
      const compressionRatio = parseFloat(uploadResult.compressionRatio?.replace('%', '') || '0')
      const compressionMessage = compressionRatio > 0.1
        ? `Image optimized: ${originalSizeMB}MB → ${compressedSizeKB}KB (${uploadResult.compressionRatio} reduction)`
        : `Image optimized: ${originalSizeMB}MB → ${compressedSizeKB}KB`
      toast.success(compressionMessage)
    } catch (error: any) {
      console.error('Error processing image:', error)
      toast.error(error.message || 'Failed to process image. Please try again.')
      setPhotoPreview(null)
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Phone validation - supports international formats
  const validatePhone = (phone: string): boolean => {
    if (!phone) return false
    // Allow +, digits, spaces, hyphens, parentheses
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/
    return phoneRegex.test(phone.replace(/\s/g, ""))
  }

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      errors.first_name = "First name is required"
    }
    if (!formData.last_name.trim()) {
      errors.last_name = "Last name is required"
    }
    if (!formData.phone_number.trim()) {
      errors.phone_number = "Phone number is required"
    } else if (!validatePhone(formData.phone_number)) {
      errors.phone_number = "Please enter a valid phone number"
    }
    if (formData.secondary_phone && !validatePhone(formData.secondary_phone)) {
      errors.secondary_phone = "Please enter a valid phone number"
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    if (formData.number_of_children && (isNaN(Number(formData.number_of_children)) || Number(formData.number_of_children) < 0)) {
      errors.number_of_children = "Please enter a valid number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    try {
      // Helper function to convert empty strings to null (for database storage)
      // This ensures all fields are included in the update, even if empty
      // Returns undefined instead of null to match Member type definition
      const toNullIfEmpty = (value: string | undefined): string | undefined => {
        if (!value || value.trim() === "") return undefined
        return value.trim()
      }

      // Helper function for number fields
      const toNullIfEmptyNumber = (value: string | undefined): number | undefined => {
        if (!value || value.trim() === "") return undefined
        const num = parseInt(value)
        return isNaN(num) ? undefined : num
      }

      const memberData: Omit<Member, "id" | "uuid"> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || "",
        phone_number: formData.phone_number,
        // Always include all fields, converting empty strings to undefined
        secondary_phone: toNullIfEmpty(formData.secondary_phone),
        photo: photoPreview || undefined, // photoPreview now contains the Supabase Storage URL
        membership_status: formData.membership_status as "active" | "inactive" | "visitor",
        join_date: toNullIfEmpty(formData.join_date),
        city: toNullIfEmpty(formData.city),
        region: toNullIfEmpty(formData.region),
        middle_name: toNullIfEmpty(formData.middle_name),
        gender: toNullIfEmpty(formData.gender),
        date_of_birth: toNullIfEmpty(formData.date_of_birth),
        marital_status: toNullIfEmpty(formData.marital_status),
        spouse_name: toNullIfEmpty(formData.spouse_name),
        number_of_children: toNullIfEmptyNumber(formData.number_of_children),
        occupation: toNullIfEmpty(formData.occupation),
        address: toNullIfEmpty(formData.address),
        town: toNullIfEmpty(formData.town),
        digital_address: toNullIfEmpty(formData.digital_address),
        groups: formData.groups || [],
        departments: formData.departments || [],
        roles: formData.roles || [],
        notes: toNullIfEmpty(formData.notes),
      }

      if (selectedMember && selectedMemberUUID) {
        // Update existing member
        const updatedMember = await updateMember.mutateAsync({
          id: selectedMemberUUID,
          ...memberData,
        } as Partial<Member> & { id: string })

        // Immediately update selectedMember and form data with the mutation result
        // This ensures the UI updates right away without waiting for refetch
        if (updatedMember) {
          const updatedMemberTyped = updatedMember as Member

          // Update React Query cache for both paginated and individual member queries
          if (organization?.id) {
            queryClient.setQueryData(["members", organization.id, selectedMemberUUID], updatedMemberTyped)

            // Also update the paginated list cache if this member is in the current page
            queryClient.setQueryData(
              ["members", "paginated", organization.id, currentPage, pageSize],
              (oldData: any) => {
                if (!oldData?.data) return oldData
                return {
                  ...oldData,
                  data: oldData.data.map((m: Member) =>
                    m.uuid === selectedMemberUUID ? updatedMemberTyped : m
                  ),
                }
              }
            )
          }

          setSelectedMember(updatedMemberTyped)

          // Update form data with all latest data to ensure consistency
          const joinDateObj = updatedMemberTyped.join_date ? new Date(updatedMemberTyped.join_date + "T00:00:00") : undefined
          const dobObj = updatedMemberTyped.date_of_birth ? new Date(updatedMemberTyped.date_of_birth + "T00:00:00") : undefined

          setFormData({
            first_name: updatedMemberTyped.first_name || "",
            last_name: updatedMemberTyped.last_name || "",
            middle_name: updatedMemberTyped.middle_name || "",
            email: updatedMemberTyped.email || "",
            phone_number: updatedMemberTyped.phone_number || "",
            secondary_phone: updatedMemberTyped.secondary_phone || "",
            gender: updatedMemberTyped.gender || "",
            date_of_birth: updatedMemberTyped.date_of_birth || "",
            marital_status: updatedMemberTyped.marital_status || "",
            spouse_name: updatedMemberTyped.spouse_name || "",
            number_of_children: updatedMemberTyped.number_of_children?.toString() || "",
            occupation: updatedMemberTyped.occupation || "",
            address: updatedMemberTyped.address || "",
            city: updatedMemberTyped.city || "",
            town: updatedMemberTyped.town || "",
            region: updatedMemberTyped.region || "",
            digital_address: updatedMemberTyped.digital_address || "",
            join_date: updatedMemberTyped.join_date || "",
            membership_status: updatedMemberTyped.membership_status || "active",
            groups: (updatedMemberTyped as any).groups || [],
            departments: (updatedMemberTyped as any).departments || [],
            roles: (updatedMemberTyped as any).roles || [],
            notes: updatedMemberTyped.notes || "",
          })
          setDateOfBirth(dobObj && !isNaN(dobObj.getTime()) ? dobObj : undefined)
          setJoinDate(joinDateObj && !isNaN(joinDateObj.getTime()) ? joinDateObj : undefined)
          if (updatedMemberTyped.photo) {
            setPhotoPreview(updatedMemberTyped.photo)
          }
        }
      } else {
        // Create new member
        await createMember.mutateAsync(memberData)
        setIsSheetOpen(false)
        resetForm()
      }
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting member:", error)
    }
  }

  const handleDeleteClick = () => {
    if (selectedMember && selectedMemberUUID) {
      setIsDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (selectedMember && selectedMemberUUID) {
      try {
        await deleteMember.mutateAsync(selectedMemberUUID)
        setIsSheetOpen(false)
        setIsDeleteDialogOpen(false)
        resetForm()
      } catch (error) {
        // Error is already handled by the hook (toast)
        console.error("Error deleting member:", error)
        setIsDeleteDialogOpen(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Active Members</SelectItem>
              <SelectItem value="inactive">Inactive Members</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddMember} size="sm">
            Add Member
          </Button>
          <Button onClick={() => setIsUploadSheetOpen(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading ? (
          <div className="col-span-full">
            <Loader text="Loading members..." size="lg" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery ? 'No members found matching your search' : 'No members yet. Add your first member!'}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={handleMemberClick}
              onHover={handleMemberHover}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && !isLoading && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            totalItems={totalMembers}
            showPageSizeSelector={true}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setCurrentPage(1)
            }}
            pageSizeOptions={[12, 24, 48, 96]}
          />
        </div>
      )}

      {/* Member Form Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-3xl flex flex-col h-full max-h-screen"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="pb-6 flex-shrink-0">
            <SheetTitle className="text-xl font-semibold">
              Member Profile
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 flex-shrink-0">
            <div className="px-2 py-2">
              <div className="mb-5">
                <div className="flex items-center gap-6">
                  <div
                    className="w-36 h-36 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingPhoto ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (photoPreview || (selectedMember?.photo && !selectedMember.photo.startsWith('data:'))) ? (
                      <Image
                        src={photoPreview || selectedMember?.photo || ''}
                        alt={selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : 'Profile'}
                        width={144}
                        height={144}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                        {formData.first_name?.[0] || ''}{formData.last_name?.[0] || ''}
                      </div>
                    )}
                    {!isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="flex-1 space-y-4">
                    <h2 className="text-xl font-semibold mb-1">
                      {selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : formData.first_name && formData.last_name ? `${formData.first_name} ${formData.last_name}` : "New Member"}
                    </h2>
                    {selectedMember && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Join Date: {selectedMember.join_date ? formatDate(selectedMember.join_date) : 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {selectedMember.membership_status || 'Active'}
                          </p>
                        </div>
                        {/* Leader Positions and Roles */}
                        <div className="flex flex-wrap gap-2">
                          {/* Leader Positions */}
                          {(() => {
                            const leaderPositions: string[] = []
                            const memberName = `${selectedMember.first_name} ${selectedMember.last_name}`
                            groups.forEach(group => {
                              if (group.leader === memberName) {
                                leaderPositions.push(`${group.name} Head`)
                              }
                            })
                            departments.forEach(dept => {
                              if (dept.leader === memberName) {
                                leaderPositions.push(`${dept.name} Head`)
                              }
                            })
                            return leaderPositions.map((position, idx) => (
                              <Badge key={`leader-${idx}`} variant="default" className="text-xs">
                                {position}
                              </Badge>
                            ))
                          })()}
                          {/* Roles (Max 4 displayed) */}
                          {selectedMember.roles && selectedMember.roles.slice(0, 4).map((role, idx) => (
                            <Badge key={`role-${idx}`} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                          {selectedMember.roles && selectedMember.roles.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{selectedMember.roles.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="bg-teal-600/20 border-teal-500 text-teal-600 hover:bg-teal-600/30" title="Send Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="bg-slate-200 border-slate-300 hover:bg-slate-300" onClick={() => fileInputRef.current?.click()} title="Upload Photo">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="bg-red-600/20 border-red-500 text-red-600 hover:bg-red-600/30" title="Print Profile">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="bio">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Bio
                  </TabsTrigger>
                  <TabsTrigger value="attendance">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Attendance
                  </TabsTrigger>
                  <TabsTrigger value="followup">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Follow-up
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    <Calendar className="h-4 w-4 mr-2" />
                    Payments
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100vh-350px)] mt-4">
                  <div className="pr-4">
                    <TabsContent value="bio" className="mt-0">
                      <div className="mb-4">
                        <p className="text-md font-semibold">Personal Information</p>
                      </div>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Row 1: First Name, Last Name */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => {
                                setFormData({ ...formData, first_name: e.target.value })
                                if (formErrors.first_name) {
                                  setFormErrors({ ...formErrors, first_name: "" })
                                }
                              }}
                              className={formErrors.first_name ? "border-destructive" : ""}
                              required
                            />
                            {formErrors.first_name && (
                              <p className="text-xs text-destructive">{formErrors.first_name}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input
                              id="last_name"
                              value={formData.last_name}
                              onChange={(e) => {
                                setFormData({ ...formData, last_name: e.target.value })
                                if (formErrors.last_name) {
                                  setFormErrors({ ...formErrors, last_name: "" })
                                }
                              }}
                              className={formErrors.last_name ? "border-destructive" : ""}
                              required
                            />
                            {formErrors.last_name && (
                              <p className="text-xs text-destructive">{formErrors.last_name}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Primary Phone Number, Secondary Phone Number */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone_number">Primary Phone Number</Label>
                            <Input
                              id="phone_number"
                              type="tel"
                              value={formData.phone_number}
                              onChange={(e) => {
                                setFormData({ ...formData, phone_number: e.target.value })
                                if (formErrors.phone_number) {
                                  setFormErrors({ ...formErrors, phone_number: "" })
                                }
                              }}
                              className={formErrors.phone_number ? "border-destructive" : ""}
                              placeholder="+233 24 123 4567"
                              required
                            />
                            {formErrors.phone_number && (
                              <p className="text-xs text-destructive">{formErrors.phone_number}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="secondary_phone">Secondary Phone Number</Label>
                            <Input
                              id="secondary_phone"
                              type="tel"
                              value={formData.secondary_phone}
                              onChange={(e) => {
                                setFormData({ ...formData, secondary_phone: e.target.value })
                                if (formErrors.secondary_phone) {
                                  setFormErrors({ ...formErrors, secondary_phone: "" })
                                }
                              }}
                              className={formErrors.secondary_phone ? "border-destructive" : ""}
                              placeholder="+233 24 123 4567"
                            />
                            {formErrors.secondary_phone && (
                              <p className="text-xs text-destructive">{formErrors.secondary_phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Occupation, Email Address */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="occupation">Occupation</Label>
                            <Input
                              id="occupation"
                              value={formData.occupation}
                              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => {
                                setFormData({ ...formData, email: e.target.value })
                                if (formErrors.email) {
                                  setFormErrors({ ...formErrors, email: "" })
                                }
                              }}
                              className={formErrors.email ? "border-destructive" : ""}
                              placeholder="example@email.com"
                            />
                            {formErrors.email && (
                              <p className="text-xs text-destructive">{formErrors.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 4: Date of Birth, Gender, Marital Status */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <DatePicker
                              date={dateOfBirth}
                              onSelect={(date) => {
                                setDateOfBirth(date)
                                setFormData({
                                  ...formData,
                                  date_of_birth: date ? date.toISOString().split('T')[0] : ""
                                })
                              }}
                              placeholder="Select date"
                              zIndex={110}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                              <SelectContent className="z-[110]">
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="marital_status">Marital Status</Label>
                            <Select value={formData.marital_status} onValueChange={(value) => setFormData({ ...formData, marital_status: value })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent className="z-[110]">
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 5: Spouse Name, Number of Children */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <SpouseAutocomplete
                              value={formData.spouse_name}
                              onChange={(value) => setFormData({ ...formData, spouse_name: value })}
                              currentMemberId={selectedMemberUUID}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="number_of_children">Number of Children</Label>
                            <Input
                              id="number_of_children"
                              type="number"
                              min="0"
                              value={formData.number_of_children}
                              onChange={(e) => {
                                setFormData({ ...formData, number_of_children: e.target.value })
                                if (formErrors.number_of_children) {
                                  setFormErrors({ ...formErrors, number_of_children: "" })
                                }
                              }}
                              className={formErrors.number_of_children ? "border-destructive" : ""}
                            />
                            {formErrors.number_of_children && (
                              <p className="text-xs text-destructive">{formErrors.number_of_children}</p>
                            )}
                          </div>
                        </div>

                        {/* Row 7: Address */}
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={3}
                          />
                        </div>

                        {/* Row 8: City, Town, Region */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="town">Town</Label>
                            <Input
                              id="town"
                              value={formData.town}
                              onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="region">Region</Label>
                            <Input
                              id="region"
                              value={formData.region}
                              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Row 9: Digital Address */}
                        <div className="space-y-2">
                          <Label htmlFor="digital_address">Digital Address</Label>
                          <Input
                            id="digital_address"
                            value={formData.digital_address}
                            onChange={(e) => setFormData({ ...formData, digital_address: e.target.value })}
                            placeholder="e.g., GA-123-4567"
                          />
                        </div>

                        {/* Organization Information Section */}
                        <div className="mb-4 pt-4 border-t">
                          <p className="text-md font-semibold mb-4">Organization Information</p>
                        </div>

                        {/* Row 1: Join Date, Membership Status */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="join_date">Join Date</Label>
                            <DatePicker
                              date={joinDate}
                              onSelect={(date) => {
                                setJoinDate(date)
                                setFormData({
                                  ...formData,
                                  join_date: date ? date.toISOString().split('T')[0] : ""
                                })
                              }}
                              placeholder="Select date"
                              zIndex={110}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="membership_status">Membership Status</Label>
                            <Select value={formData.membership_status} onValueChange={(value) => setFormData({ ...formData, membership_status: value })} required>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent className="z-[110]">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 2: Group, Department */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <MultiSelect
                            options={groupOptions}
                            selected={formData.groups}
                            onSelectionChange={(selected) => setFormData({ ...formData, groups: selected })}
                            placeholder="Select Groups"
                            label="Group"
                            setupLink="/dashboard/members?tab=groups-departments"
                            setupMessage="No groups available. Create groups to organize your members."
                          />
                          <MultiSelect
                            options={departmentOptions}
                            selected={formData.departments}
                            onSelectionChange={(selected) => setFormData({ ...formData, departments: selected })}
                            placeholder="Select Departments"
                            label="Department"
                            setupLink="/dashboard/members?tab=groups-departments"
                            setupMessage="No departments available. Create departments to organize your members."
                          />
                        </div>

                        {/* Row 3: Roles/Positions (Full Width) */}
                        <div className="w-full">
                          <MultiSelect
                            options={rolePositionOptions}
                            selected={formData.roles}
                            onSelectionChange={(selected) => setFormData({ ...formData, roles: selected })}
                            placeholder="Select Roles/Positions"
                            label="Roles/Positions"
                            setupLink="/dashboard/members?tab=groups-departments"
                            setupMessage="No roles/positions available. Create roles and positions to assign to members."
                          />
                        </div>

                        {/* Row 4: Additional Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="notes">Additional Notes</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={5}
                            placeholder="Any additional information"
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            size="sm"
                            type="submit"
                            className="flex-1"
                            disabled={createMember.isPending || updateMember.isPending}
                          >
                            {(createMember.isPending || updateMember.isPending) ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                {selectedMember ? "Updating..." : "Adding..."}
                              </>
                            ) : (
                              selectedMember ? "Update" : "Add"
                            )}
                          </Button>
                          {selectedMember && (
                            <Button
                              size="sm"
                              type="button"
                              variant="destructive"
                              onClick={handleDeleteClick}
                              disabled={deleteMember.isPending || createMember.isPending || updateMember.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="payments" className="mt-0">
                      <div className="mb-4">
                        <p className="text-md font-semibold">Payment History</p>
                      </div>
                      {selectedMember ? (
                        <div className="space-y-4">
                          {incomeLoading ? (
                            <div className="text-center py-12 text-muted-foreground rounded-lg border">
                              <Spinner size="sm" className="mx-auto mb-2" />
                              Loading payment history...
                            </div>
                          ) : memberContributions.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground rounded-lg border">
                              No payment history found for this member.
                            </div>
                          ) : (
                            <>
                              <div className="space-y-4">
                                {/* Stats Cards - Moved to Top */}
                                <div className="grid grid-cols-2 gap-4">
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground mb-1">Total Contributions</p>
                                    <p className="text-2xl font-bold">{formatCurrency(contributionStats.total, organization?.currency || "USD")}</p>
                                  </Card>
                                  <Card className="p-4">
                                    <p className="text-sm text-muted-foreground mb-1">This Year</p>
                                    <p className="text-2xl font-bold">{formatCurrency(contributionStats.thisYear, organization?.currency || "USD")}</p>
                                  </Card>
                                </div>

                                {/* Category Filter */}
                                <div className="flex justify-end">
                                  <div className="w-[200px]">
                                    <Select value={paymentCategoryFilter} onValueChange={setPaymentCategoryFilter}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="All Categories" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {Array.from(new Set(memberContributions.map(r => r.category).filter(Boolean))).map(cat => (
                                          <SelectItem key={cat} value={cat || "unknown"}>{cat}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="rounded-lg border">
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-muted/50">
                                        <tr className="border-b">
                                          <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium">Method</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredContributions
                                          .sort((a, b) => {
                                            const dateA = a.date instanceof Date ? a.date : new Date(a.date)
                                            const dateB = b.date instanceof Date ? b.date : new Date(b.date)
                                            return dateB.getTime() - dateA.getTime()
                                          })
                                          .map((record) => (
                                            <tr key={record.id} className="border-b hover:bg-muted/30">
                                              <td className="px-4 py-3 text-sm">
                                                {formatRecordDate(record.date)}
                                              </td>
                                              <td className="px-4 py-3 text-sm">
                                                <Badge variant="outline">{record.category}</Badge>
                                              </td>
                                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {record.reference || "-"}
                                              </td>
                                              <td className="px-4 py-3 text-sm font-medium text-green-600">
                                                {formatCurrency(record.amount || 0, organization?.currency || "USD")}
                                              </td>
                                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                                {record.method}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          Save member first to view payment history
                        </div>
                      )}
                    </TabsContent>

                    {/* Attendance Tab */}
                    <TabsContent value="attendance" className="mt-0">
                      {selectedMember ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-md font-semibold">Attendance Records</p>
                          </div>

                          {/* Attendance Stats & Filter */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <Card className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <p className="text-sm text-muted-foreground">Total Present</p>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                  {memberAttendanceRecords.filter(r => r.status === 'present').length}
                                </p>
                              </Card>
                              <Card className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <p className="text-sm text-muted-foreground">Total Absent</p>
                                </div>
                                <p className="text-2xl font-bold text-red-600">
                                  {memberAttendanceRecords.filter(r => r.status === 'absent').length}
                                </p>
                              </Card>
                            </div>

                            <div className="flex justify-end">
                              <div className="w-[200px]">
                                <Select value={attendanceEventTypeFilter} onValueChange={setAttendanceEventTypeFilter}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="All Events" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Events</SelectItem>
                                    {Array.from(new Set(memberAttendanceRecords.map(r => r.service_type).filter(Boolean))).map(type => (
                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {memberAttendanceRecords.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No attendance records found for this member
                            </div>
                          ) : (
                            <div className="rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead>Event Type</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {memberAttendanceRecords
                                    .filter(r => attendanceEventTypeFilter === "all" || r.service_type === attendanceEventTypeFilter)
                                    .map((record) => (
                                      <TableRow key={record.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                          {formatDate(record.date)}
                                        </TableCell>
                                        <TableCell>{record.service_type}</TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            {record.status === 'absent' ? (
                                              <>
                                                <XCircle className="h-4 w-4 text-red-600" />
                                                <span className="text-sm font-medium text-red-600">Absent</span>
                                              </>
                                            ) : (
                                              <>
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-600">Present</span>
                                              </>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          Save member first to view attendance records
                        </div>
                      )}
                    </TabsContent>

                    {/* Follow-up Tab */}
                    <TabsContent value="followup" className="mt-0">
                      {selectedMember ? (
                        <div className="space-y-6">
                          {/* Follow-up List */}
                          <div>
                            <p className="text-md font-semibold mb-4">Follow-up History</p>
                            <div className="rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[100px]">Date</TableHead>
                                    <TableHead className="w-[110px]">Method</TableHead>
                                    <TableHead className="!whitespace-normal">Notes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {memberFollowUps.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        No follow-ups recorded yet
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    memberFollowUps.map((followUp) => (
                                      <TableRow key={followUp.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{formatDate(followUp.date)}</TableCell>
                                        <TableCell className="whitespace-nowrap">{followUp.method}</TableCell>
                                        <TableCell className="!whitespace-normal !break-words pr-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' } as React.CSSProperties}>
                                          {followUp.notes}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          Save member first to manage follow-ups
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : 'this member'}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMember.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMember.isPending}
            >
              {deleteMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Members Sheet */}
      <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import Members</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Download Sample Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <h3 className="font-semibold text-lg mb-2">Import Contacts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download our sample file to properly format your contacts. This template ensures correct data structure, reducing errors when uploading your recipient list.
                </p>
                <Button onClick={generateMemberSampleExcel} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample File
                </Button>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <Label>Upload Excel File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(false)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(false)

                  const files = Array.from(e.dataTransfer.files)
                  const excelFile = files.find(file =>
                    file.name.endsWith('.xlsx') ||
                    file.name.endsWith('.xls') ||
                    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                    file.type === 'application/vnd.ms-excel'
                  )

                  if (excelFile) {
                    setUploadFile(excelFile)
                  } else {
                    toast.error('Please upload an Excel file (.xlsx or .xls)')
                  }
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  id="member-upload-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ||
                        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                        file.type === 'application/vnd.ms-excel') {
                        setUploadFile(file)
                      } else {
                        toast.error('Please upload an Excel file (.xlsx or .xls)')
                      }
                    }
                  }}
                />
                {uploadFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                    <p className="font-medium">{uploadFile.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <label
                        htmlFor="member-upload-input"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Click to select a file
                      </label>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Excel files only (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Button */}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!uploadFile) {
                    toast.error('Please select a file to upload')
                    return
                  }

                  setIsUploading(true)
                  try {
                    const data = await parseExcelFile(uploadFile)

                    if (data.length === 0) {
                      toast.error('No data found in the Excel file')
                      setIsUploading(false)
                      return
                    }

                    let successCount = 0
                    let errorCount = 0

                    for (const row of data) {
                      try {
                        const memberData: Omit<Member, "id" | "uuid"> = {
                          first_name: String(row.first_name || '').trim(),
                          last_name: String(row.last_name || '').trim(),
                          email: String(row.email || '').trim() || '',
                          phone_number: String(row.phone_number || '').trim(),
                          secondary_phone: row.secondary_phone ? String(row.secondary_phone).trim() : undefined,
                          membership_status: (row.membership_status as "active" | "inactive" | "visitor") || "active",
                          join_date: row.join_date ? String(row.join_date).trim() : undefined,
                          city: row.city ? String(row.city).trim() : undefined,
                          region: row.region ? String(row.region).trim() : undefined,
                          middle_name: row.middle_name ? String(row.middle_name).trim() : undefined,
                          gender: row.gender ? String(row.gender).trim() : undefined,
                          date_of_birth: row.date_of_birth ? String(row.date_of_birth).trim() : undefined,
                          marital_status: row.marital_status ? String(row.marital_status).trim() : undefined,
                          spouse_name: row.spouse_name ? String(row.spouse_name).trim() : undefined,
                          number_of_children: row.number_of_children ? parseInt(String(row.number_of_children)) : undefined,
                          occupation: row.occupation ? String(row.occupation).trim() : undefined,
                          address: row.address ? String(row.address).trim() : undefined,
                          town: row.town ? String(row.town).trim() : undefined,
                          digital_address: row.digital_address ? String(row.digital_address).trim() : undefined,
                          groups: [],
                          departments: [],
                          notes: row.notes ? String(row.notes).trim() : undefined,
                        }

                        if (!memberData.first_name || !memberData.last_name || !memberData.phone_number) {
                          errorCount++
                          continue
                        }

                        await createMember.mutateAsync(memberData)
                        successCount++
                      } catch (error) {
                        errorCount++
                        console.error('Error creating member:', error)
                      }
                    }

                    toast.success(`Successfully imported ${successCount} member(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`)
                    setUploadFile(null)
                    setIsUploadSheetOpen(false)
                    queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
                  } catch (error) {
                    toast.error('Failed to parse Excel file: ' + (error instanceof Error ? error.message : 'Unknown error'))
                  } finally {
                    setIsUploading(false)
                  }
                }}
                disabled={!uploadFile || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload and Import Members'
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

