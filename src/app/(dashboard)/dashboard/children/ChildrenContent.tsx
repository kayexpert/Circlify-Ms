"use client"

import React, { useState, useCallback, useMemo, memo, startTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Search, Baby, Trash2, Upload, Loader2, AlertTriangle, ChevronsUpDown, Check, User as UserIcon, UserCheck, UserX, Clock, Download, Pencil } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
    useChildrenPaginated,
    useCreateChild,
    useUpdateChild,
    useDeleteChild,
    useClassGroupOptions,
    useChildAttendance,
    useUpdateAttendance,
    useDeleteChildAttendance
} from "@/hooks/children"
import { useMembers } from "@/hooks/members/useMembers"
import { useOrganization } from "@/hooks/use-organization"
import { Loader } from "@/components/ui/loader"
import { Pagination } from "@/components/ui/pagination"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { generateChildSampleExcel, parseExcelFile } from "@/lib/utils/excel-export"
import type { Child, ChildAttendanceRecord } from "./types"

// Child Card Component - matching Members card style
const ChildCard = memo(function ChildCard({
    child,
    onSelect,
}: {
    child: Child
    onSelect: (child: Child) => void
}) {
    const fullName = `${child.first_name} ${child.last_name}`
    const initials = `${child.first_name?.[0] || ''}${child.last_name?.[0] || ''}`
    const age = child.date_of_birth
        ? differenceInYears(new Date(), new Date(child.date_of_birth))
        : null

    const parentInfo = useMemo(() => {
        const parents = []
        if (child.mother_name) parents.push(child.mother_name)
        if (child.father_name) parents.push(child.father_name)
        if (child.guardian_name) parents.push(child.guardian_name)
        return parents.join(" & ")
    }, [child.mother_name, child.father_name, child.guardian_name])

    return (
        <Card
            className="relative overflow-hidden border-0 border-l-0 border-r-0 border-b-0 border-t-4 cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
            style={{ borderTopColor: '#f59e0b' } as React.CSSProperties}
            onClick={() => onSelect(child)}
        >
            <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
                {child.photo && !child.photo.startsWith('data:') ? (
                    <Image
                        src={child.photo}
                        alt={fullName}
                        fill
                        className="object-cover object-top"
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                ) : (
                    <div className="text-4xl font-bold text-muted-foreground">
                        {initials}
                    </div>
                )}
            </div>
            <div className="p-3 text-center space-y-1">
                <p className="font-medium text-md">{fullName}</p>
                {age !== null && (
                    <p className="text-xs text-muted-foreground">{age} years old</p>
                )}
                {parentInfo && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{parentInfo}</p>
                )}
            </div>
            {child.status && (
                <Badge
                    className={cn(
                        "absolute top-2 right-2 text-white text-xs rounded-sm",
                        child.status === "active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"
                    )}
                >
                    {child.status}
                </Badge>
            )}
        </Card>
    )
})

// Parent Autocomplete Component - similar to SpouseAutocomplete
function ParentAutocomplete({
    label,
    value,
    onChange,
    placeholder = "Type or select parent name"
}: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}) {
    const [open, setOpen] = useState(false)
    const [searchInput, setSearchInput] = useState("")
    const { data: allMembers = [] } = useMembers()

    type MemberOption = { value: string; label: string; id: string }

    const memberOptions: MemberOption[] = useMemo(() => {
        return allMembers.map((m: { first_name: string; last_name: string; uuid: string }) => ({
            value: `${m.first_name} ${m.last_name}`,
            label: `${m.first_name} ${m.last_name}`,
            id: m.uuid,
        }))
    }, [allMembers])

    const filteredOptions = useMemo(() => {
        if (!searchInput) return memberOptions.slice(0, 10)
        const query = searchInput.toLowerCase()
        return memberOptions.filter((opt) =>
            opt.label.toLowerCase().includes(query)
        ).slice(0, 10)
    }, [memberOptions, searchInput])

    const handleSelect = useCallback((selectedValue: string) => {
        onChange(selectedValue)
        setOpen(false)
    }, [onChange])

    const handleInputChange = useCallback((inputValue: string) => {
        setSearchInput(inputValue)
        onChange(inputValue)
    }, [onChange])

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                        type="button"
                    >
                        <span className={cn(!value && "text-muted-foreground")}>
                            {value || placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search members or type name..."
                            value={searchInput}
                            onValueChange={handleInputChange}
                        />
                        <CommandList>
                            <ScrollArea className="h-[200px]">
                                {searchInput && !memberOptions.some((opt) => opt.label.toLowerCase() === searchInput.toLowerCase()) && (
                                    <CommandItem
                                        onSelect={() => handleSelect(searchInput)}
                                        className="flex items-center gap-2"
                                    >
                                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        <span>Use "{searchInput}"</span>
                                    </CommandItem>
                                )}

                                {filteredOptions.length === 0 && !searchInput && (
                                    <CommandEmpty>No members found. Type a name to add manually.</CommandEmpty>
                                )}

                                <CommandGroup heading={searchInput ? "Suggestions" : "Members"}>
                                    {filteredOptions.map((option) => (
                                        <CommandItem
                                            key={option.id}
                                            value={option.value}
                                            onSelect={() => handleSelect(option.value)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === option.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </ScrollArea>
                        </CommandList>
                    </Command>

                    {value && (
                        <div className="border-t p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                type="button"
                                onClick={() => {
                                    onChange("")
                                    setSearchInput("")
                                    setOpen(false)
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}

export default function ChildrenContent() {
    const { organization } = useOrganization()
    const queryClient = useQueryClient()

    // Pagination and filters
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(24)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [classFilter, setClassFilter] = useState<string>("all")
    const [attendanceServiceFilter, setAttendanceServiceFilter] = useState<string>("all")

    // Fetch data
    const { data: childrenData, isLoading } = useChildrenPaginated(currentPage, pageSize)
    const allChildren: Child[] = childrenData?.data || []
    const totalChildren = childrenData?.total || 0
    const totalPages = childrenData?.totalPages || 0

    // Mutations
    const createChild = useCreateChild()
    const updateChild = useUpdateChild()
    const deleteChild = useDeleteChild()
    const { options: classGroupOptions } = useClassGroupOptions()

    // UI state
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedChild, setSelectedChild] = useState<Child | null>(null)
    const [activeTab, setActiveTab] = useState<"bio" | "medical" | "attendance">("bio")
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Date pickers
    const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>()
    const [enrolledDate, setEnrolledDate] = useState<Date | undefined>()

    // Form data
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        phone_number: "",
        gender: "",
        mother_name: "",
        father_name: "",
        guardian_name: "",
        guardian_relationship: "",
        class_group: "",
        status: "active" as "active" | "inactive" | "graduated",
        medical_info: "",
        allergies: "",
        special_needs: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        notes: "",
    })

    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    // Fetch attendance records for selected child
    const { data: attendanceRecords = [] } = useChildAttendance(selectedChild?.uuid || null)

    // Filter attendance records
    const filteredAttendance = useMemo(() => {
        if (attendanceServiceFilter === "all") return attendanceRecords
        return attendanceRecords.filter((r: ChildAttendanceRecord) => r.service_type === attendanceServiceFilter)
    }, [attendanceRecords, attendanceServiceFilter])

    // Attendance Actions
    const [editAttendanceOpen, setEditAttendanceOpen] = useState(false)
    const [attendanceToEdit, setAttendanceToEdit] = useState<ChildAttendanceRecord | null>(null)
    const updateAttendance = useUpdateAttendance()
    const deleteAttendance = useDeleteChildAttendance()

    const resetForm = useCallback(() => {
        setFormData({
            first_name: "",
            last_name: "",
            phone_number: "",
            gender: "",
            mother_name: "",
            father_name: "",
            guardian_name: "",
            guardian_relationship: "",
            class_group: "",
            status: "active",
            medical_info: "",
            allergies: "",
            special_needs: "",
            emergency_contact_name: "",
            emergency_contact_phone: "",
            notes: "",
        })
        setFormErrors({})
        setPhotoPreview(null)
        setSelectedChild(null)
        setDateOfBirth(undefined)
        setEnrolledDate(undefined)
        setActiveTab("bio")
    }, [])

    const handleChildClick = useCallback((child: Child) => {
        setSelectedChild(child)
        setIsSheetOpen(true)
        setActiveTab("bio")

        startTransition(() => {
            const dobObj = child.date_of_birth ? new Date(child.date_of_birth + "T00:00:00") : undefined
            const enrolledObj = child.enrolled_date ? new Date(child.enrolled_date + "T00:00:00") : undefined

            setFormData({
                first_name: child.first_name || "",
                last_name: child.last_name || "",
                phone_number: (child as any).phone_number || "",
                gender: child.gender || "",
                mother_name: child.mother_name || "",
                father_name: child.father_name || "",
                guardian_name: child.guardian_name || "",
                guardian_relationship: child.guardian_relationship || "",
                class_group: child.class_group || "",
                status: child.status || "active",
                medical_info: child.medical_info || "",
                allergies: child.allergies || "",
                special_needs: child.special_needs || "",
                emergency_contact_name: child.emergency_contact_name || "",
                emergency_contact_phone: child.emergency_contact_phone || "",
                notes: child.notes || "",
            })
            setDateOfBirth(dobObj && !isNaN(dobObj.getTime()) ? dobObj : undefined)
            setEnrolledDate(enrolledObj && !isNaN(enrolledObj.getTime()) ? enrolledObj : undefined)
            setPhotoPreview(child.photo || null)
            setFormErrors({})
        })
    }, [])

    const handleAddChild = useCallback(() => {
        resetForm()
        setIsSheetOpen(true)
    }, [resetForm])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Photo must be less than 5MB")
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const validateForm = useCallback(() => {
        const errors: Record<string, string> = {}

        if (!formData.first_name.trim()) errors.first_name = "First name is required"
        if (!formData.last_name.trim()) errors.last_name = "Last name is required"
        if (!dateOfBirth) errors.date_of_birth = "Date of birth is required"

        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }, [formData, dateOfBirth])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            const childData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                phone_number: formData.phone_number || null,
                date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
                gender: formData.gender || null,
                photo: photoPreview || null,
                mother_name: formData.mother_name || null,
                father_name: formData.father_name || null,
                guardian_name: formData.guardian_name || null,
                guardian_relationship: formData.guardian_relationship || null,
                class_group: formData.class_group || null,
                enrolled_date: enrolledDate ? format(enrolledDate, "yyyy-MM-dd") : null,
                status: formData.status,
                medical_info: formData.medical_info || null,
                allergies: formData.allergies || null,
                special_needs: formData.special_needs || null,
                emergency_contact_name: formData.emergency_contact_name || null,
                emergency_contact_phone: formData.emergency_contact_phone || null,
                notes: formData.notes || null,
            }

            if (selectedChild) {
                await updateChild.mutateAsync({ id: selectedChild.uuid, ...childData } as any)
            } else {
                await createChild.mutateAsync(childData as any)
            }

            setIsSheetOpen(false)
            resetForm()
        } catch (error) {
            console.error("Error saving child:", error)
        }
    }, [formData, dateOfBirth, enrolledDate, photoPreview, selectedChild, validateForm, createChild, updateChild, resetForm])

    const handleEditAttendance = (record: ChildAttendanceRecord) => {
        setAttendanceToEdit(record)
        setEditAttendanceOpen(true)
    }

    const handleDeleteAttendanceRecord = async (id: string) => {
        if (!confirm("Are you sure you want to delete this attendance record?")) return
        try {
            await deleteAttendance.mutateAsync(id)
        } catch (error) {
            console.error("Error deleting attendance:", error)
        }
    }

    const handleSaveAttendance = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!attendanceToEdit) return

        const formData = new FormData(event.target as HTMLFormElement)
        const date = attendanceToEdit.date // date shouldn't change usually, or use hidden input
        const checkInTime = formData.get("check_in_time") as string
        const checkOutTime = formData.get("check_out_time") as string
        const serviceType = formData.get("service_type") as string
        const notes = formData.get("notes") as string

        const checkInIso = checkInTime ? new Date(`${date}T${checkInTime}`).toISOString() : attendanceToEdit.checked_in_at
        let checkOutIso = null
        if (checkOutTime) {
            checkOutIso = new Date(`${date}T${checkOutTime}`).toISOString()
        }

        try {
            await updateAttendance.mutateAsync({
                id: attendanceToEdit.id,
                date,
                service_type: serviceType,
                checked_in_at: checkInIso,
                checked_out_at: checkOutIso, // undefined if null
                notes
            })
            setEditAttendanceOpen(false)
            setAttendanceToEdit(null)
        } catch (error) {
            console.error("Error updating attendance:", error)
        }
    }

    const handleUpload = async () => {
        if (!uploadFile) return

        setIsUploading(true)
        try {
            const data = await parseExcelFile(uploadFile)
            let successRaw = 0
            let errorRaw = 0

            toast.message('Processing file...')

            for (const row of data) {
                if (!row.first_name || !row.last_name) {
                    errorRaw++
                    continue
                }

                try {
                    const childPayload = {
                        first_name: row.first_name,
                        last_name: row.last_name,
                        phone_number: row.phone_number,
                        gender: row.gender,
                        date_of_birth: row.date_of_birth,
                        mother_name: row.mother_name,
                        father_name: row.father_name,
                        guardian_name: row.guardian_name,
                        guardian_relationship: row.guardian_relationship,
                        medical_info: row.medical_info,
                        allergies: row.allergies,
                        special_needs: row.special_needs,
                        emergency_contact_name: row.emergency_contact_name,
                        emergency_contact_phone: row.emergency_contact_phone,
                        enrolled_date: row.enrolled_date,
                        status: row.status || 'active',
                        class_group: row.class_group,
                        notes: row.notes,
                    }

                    await createChild.mutateAsync(childPayload as any)
                    successRaw++
                } catch (err) {
                    console.error("Row import error", err)
                    errorRaw++
                }
            }

            if (successRaw > 0) {
                toast.success(`Successfully imported ${successRaw} children`)
                setIsUploadSheetOpen(false)
                setUploadFile(null)
            }
            if (errorRaw > 0) {
                toast.warning(`Skipped ${errorRaw} rows due to errors or missing names`)
            }

        } catch (error) {
            console.error('File parse error:', error)
            toast.error('Failed to parse Excel file')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = useCallback(async () => {
        if (!selectedChild) return

        try {
            await deleteChild.mutateAsync(selectedChild.uuid)
            setIsSheetOpen(false)
            setDeleteDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error("Error deleting child:", error)
        }
    }, [selectedChild, deleteChild, resetForm])

    // Filter children based on search and filters
    const filteredChildren = useMemo(() => {
        return allChildren.filter((child) => {
            const matchesSearch = !searchQuery ||
                `${child.first_name} ${child.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === "all" || (child.status || "").toLowerCase() === statusFilter.toLowerCase()
            const matchesClass = classFilter === "all" || (child.class_group || "").trim().toLowerCase() === classFilter.trim().toLowerCase()

            return matchesSearch && matchesStatus && matchesClass
        })
    }, [allChildren, searchQuery, statusFilter, classFilter])

    if (isLoading) {
        return <Loader text="Loading children..." />
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center gap-3">
                <div className="flex gap-3 flex-1">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search children..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Classes</SelectItem>
                            {classGroupOptions.map((option: { value: string; label: string }) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleAddChild} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Child
                    </Button>
                    <Button onClick={() => setIsUploadSheetOpen(true)} variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                    </Button>
                </div>
            </div>

            {/* Children Grid */}
            {filteredChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <Baby className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No children found</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {filteredChildren.map((child) => (
                            <ChildCard
                                key={child.uuid}
                                child={child}
                                onSelect={handleChildClick}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Child Profile Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsSheetOpen(open) }}>
                <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
                    <SheetHeader className="px-6 pt-6 pb-4">
                        <SheetTitle>{selectedChild ? "Child Profile" : "Add Child"}</SheetTitle>
                    </SheetHeader>

                    {/* Photo Section */}
                    <div className="px-6 pb-4">
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <Baby className="h-10 w-10 text-muted-foreground" />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                {/* Display Name and Class when in Edit Mode */}
                                {selectedChild && (
                                    <div className="mb-2">
                                        <h3 className="text-xl font-bold leading-none">
                                            {formData.first_name} {formData.last_name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {formData.class_group || "No Class Assigned"}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                        id="photo-upload"
                                    />
                                    <Label htmlFor="photo-upload" className="cursor-pointer">
                                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent text-sm font-medium">
                                            <Upload className="h-4 w-4" />
                                            Upload Photo
                                        </div>
                                    </Label>
                                    {photoPreview && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setPhotoPreview(null)}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-3 mx-6 flex-shrink-0">
                            <TabsTrigger value="bio">Bio</TabsTrigger>
                            <TabsTrigger value="medical">Medical</TabsTrigger>
                            <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto">
                            <div className="px-6 pr-10 py-4">
                                <form onSubmit={handleSubmit} className="space-y-4 pb-6">
                                    {/* Bio Tab */}
                                    <TabsContent value="bio" className="space-y-4 mt-0">
                                        {/* Personal Information Section */}
                                        <div className="mb-4">
                                            <p className="text-md font-semibold">Personal Information</p>
                                        </div>

                                        {/* Row 1: First Name, Last Name */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="first_name">First Name *</Label>
                                                <Input
                                                    id="first_name"
                                                    value={formData.first_name}
                                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                    className={formErrors.first_name ? "border-red-500" : ""}
                                                />
                                                {formErrors.first_name && <p className="text-xs text-red-500">{formErrors.first_name}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="last_name">Last Name *</Label>
                                                <Input
                                                    id="last_name"
                                                    value={formData.last_name}
                                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                    className={formErrors.last_name ? "border-red-500" : ""}
                                                />
                                                {formErrors.last_name && <p className="text-xs text-red-500">{formErrors.last_name}</p>}
                                            </div>
                                        </div>

                                        {/* Row 2: Phone, Gender, Date of Birth */}
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone_number">Phone Number</Label>
                                                <Input
                                                    id="phone_number"
                                                    type="tel"
                                                    value={formData.phone_number}
                                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                    placeholder="+233 24 123 4567"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="gender">Gender</Label>
                                                <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date of Birth *</Label>
                                                <DatePicker
                                                    date={dateOfBirth}
                                                    onSelect={setDateOfBirth}
                                                    placeholder="Select date of birth"
                                                />
                                                {formErrors.date_of_birth && <p className="text-xs text-red-500">{formErrors.date_of_birth}</p>}
                                            </div>
                                        </div>



                                        {/* Family Information Section */}
                                        <div className="mb-4 pt-4 border-t">
                                            <p className="text-md font-semibold mb-4">Family Information</p>
                                        </div>

                                        {/* Row: Mother, Father */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <ParentAutocomplete
                                                label="Mother (Optional)"
                                                value={formData.mother_name}
                                                onChange={(val) => setFormData({ ...formData, mother_name: val })}
                                                placeholder="Type or select mother's name"
                                            />
                                            <ParentAutocomplete
                                                label="Father (Optional)"
                                                value={formData.father_name}
                                                onChange={(val) => setFormData({ ...formData, father_name: val })}
                                                placeholder="Type or select father's name"
                                            />
                                        </div>

                                        {/* Guardian */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <ParentAutocomplete
                                                label="Guardian (Optional)"
                                                value={formData.guardian_name}
                                                onChange={(val) => setFormData({ ...formData, guardian_name: val })}
                                                placeholder="Type or select guardian's name"
                                            />
                                            {formData.guardian_name && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="guardian_relationship">Guardian Relationship</Label>
                                                    <Input
                                                        id="guardian_relationship"
                                                        placeholder="e.g., Aunt, Uncle, Grandparent"
                                                        value={formData.guardian_relationship}
                                                        onChange={(e) => setFormData({ ...formData, guardian_relationship: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Emergency Contact */}
                                        <div className="mb-4 pt-4 border-t">
                                            <p className="text-md font-semibold mb-4">Emergency Contact</p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="emergency_contact_name">Contact Name</Label>
                                                <Input
                                                    id="emergency_contact_name"
                                                    value={formData.emergency_contact_name}
                                                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                                                <Input
                                                    id="emergency_contact_phone"
                                                    value={formData.emergency_contact_phone}
                                                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Organization Information Section */}
                                        <div className="mb-4 pt-4 border-t">
                                            <p className="text-md font-semibold mb-4">Organization Information</p>
                                        </div>

                                        {/* Row: Enrolled Date, Status, Class Group */}
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label>Enrolled Date</Label>
                                                <DatePicker
                                                    date={enrolledDate}
                                                    onSelect={setEnrolledDate}
                                                    placeholder="Select enrolled date"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="status">Status</Label>
                                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val as any })}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="active">Active</SelectItem>
                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                        <SelectItem value="graduated">Graduated</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="class_group">Class Group</Label>
                                                <Select value={formData.class_group} onValueChange={(val) => setFormData({ ...formData, class_group: val })}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select class" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {classGroupOptions.map((option: { value: string; label: string }) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Notes</Label>
                                            <Textarea
                                                id="notes"
                                                placeholder="Any additional notes..."
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                rows={4}
                                            />
                                        </div>
                                    </TabsContent>

                                    {/* Medical Tab */}
                                    <TabsContent value="medical" className="space-y-4 mt-0">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                    <Label htmlFor="allergies">Allergies</Label>
                                                </div>
                                                <Textarea
                                                    id="allergies"
                                                    placeholder="List any known allergies..."
                                                    value={formData.allergies}
                                                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="medical_info">Medical Information</Label>
                                                <Textarea
                                                    id="medical_info"
                                                    placeholder="Important medical information..."
                                                    value={formData.medical_info}
                                                    onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                                                    rows={4}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="special_needs">Special Needs</Label>
                                                <Textarea
                                                    id="special_needs"
                                                    placeholder="Any special needs or accommodations..."
                                                    value={formData.special_needs}
                                                    onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* Attendance Tab */}
                                    <TabsContent value="attendance" className="space-y-4 mt-0">
                                        {selectedChild ? (
                                            <>
                                                {/*  Stats Cards */}
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <Card className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-muted">
                                                                <UserCheck className="h-5 w-5 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Total Present</p>
                                                                <p className="text-2xl font-bold">{filteredAttendance.length}</p>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                    <Card className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-muted">
                                                                <UserX className="h-5 w-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Total Absent</p>
                                                                <p className="text-2xl font-bold">0</p>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </div>

                                                {/* Attendance History Table */}
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-medium">Attendance Records</h3>
                                                        <Select value={attendanceServiceFilter} onValueChange={setAttendanceServiceFilter}>
                                                            <SelectTrigger className="w-[180px]">
                                                                <SelectValue placeholder="Filter by Service" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">All Services</SelectItem>
                                                                <SelectItem value="Sunday Service">Sunday Service</SelectItem>
                                                                <SelectItem value="Midweek Service">Midweek Service</SelectItem>
                                                                <SelectItem value="Special Event">Special Event</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {filteredAttendance.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-8">
                                                            No attendance records found
                                                        </p>
                                                    ) : (
                                                        <div className="border rounded-md">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Date</TableHead>
                                                                        <TableHead>Service Type</TableHead>
                                                                        <TableHead>Status</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {filteredAttendance.map((record: ChildAttendanceRecord) => (
                                                                        <TableRow key={record.id}>
                                                                            <TableCell>{format(new Date(record.date), "MMM dd, yyyy")}</TableCell>
                                                                            <TableCell>{record.service_type}</TableCell>
                                                                            <TableCell>
                                                                                <Badge className={record.status === "absent"
                                                                                    ? "bg-red-100 text-red-800 hover:bg-red-100 border-none"
                                                                                    : "bg-green-100 text-green-800 hover:bg-green-100 border-none"
                                                                                }>
                                                                                    {record.status === "absent" ? "Absent" : "Present"}
                                                                                </Badge>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                Save the child first to view attendance history
                                            </p>
                                        )}
                                    </TabsContent>

                                    {/* Form Actions */}
                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button
                                            type="submit"
                                            className="flex-1"
                                            disabled={createChild.isPending || updateChild.isPending}
                                        >
                                            {createChild.isPending || updateChild.isPending ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                selectedChild ? "Update" : "Create"
                                            )}
                                        </Button>
                                        {selectedChild && (
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => setDeleteDialogOpen(true)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Tabs>
                </SheetContent>
            </Sheet>

            {/* Upload Children Sheet */}
            <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Import Children</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 mt-6">
                        {/* Download Sample Section */}
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Import Children Data</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Download our sample file to properly format your data. This template ensures correct structure for importing children.
                                </p>
                                <Button onClick={generateChildSampleExcel} variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Sample File
                                </Button>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-4">
                            <Label>Upload Excel File</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
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
                                    id="child-upload-input"
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
                                        <div className="flex items-center justify-center gap-2 text-primary font-medium">
                                            <Upload className="h-5 w-5" />
                                            {uploadFile.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setUploadFile(null)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            Remove file
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2 cursor-pointer" onClick={() => document.getElementById('child-upload-input')?.click()}>
                                        <div className="flex justify-center">
                                            <Upload className="h-10 w-10 text-muted-foreground/50" />
                                        </div>
                                        <p className="font-medium">Click to upload or drag and drop</p>
                                        <p className="text-sm text-muted-foreground">Excel files only (.xlsx, .xls)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Actions */}
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsUploadSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!uploadFile || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    'Start Import'
                                )}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Edit Attendance Dialog */}
            <Dialog open={editAttendanceOpen} onOpenChange={setEditAttendanceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Attendance</DialogTitle>
                    </DialogHeader>
                    {attendanceToEdit && (
                        <form onSubmit={handleSaveAttendance} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Check In</Label>
                                    <Input
                                        name="check_in_time"
                                        type="time"
                                        defaultValue={format(new Date(attendanceToEdit.checked_in_at), "HH:mm")}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Check Out</Label>
                                    <Input
                                        name="check_out_time"
                                        type="time"
                                        defaultValue={attendanceToEdit.checked_out_at ? format(new Date(attendanceToEdit.checked_out_at), "HH:mm") : ""}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Service Type</Label>
                                <Select name="service_type" defaultValue={attendanceToEdit.service_type}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Sunday Service">Sunday Service</SelectItem>
                                        <SelectItem value="Midweek Service">Midweek Service</SelectItem>
                                        <SelectItem value="Special Event">Special Event</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea name="notes" defaultValue={attendanceToEdit.notes || ""} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditAttendanceOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={updateAttendance.isPending}>Save</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDelete}
                title="Delete Child"
                description={`Are you sure you want to delete ${selectedChild?.first_name} ${selectedChild?.last_name}? This action cannot be undone.`}
                isLoading={deleteChild.isPending}
            />
        </div>
    )
}
