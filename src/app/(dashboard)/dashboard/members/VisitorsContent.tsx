"use client"

import React, { useState, useRef, useMemo } from "react"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Mail, Printer, UserPlus, Users, CheckCircle2, Camera, Upload, ArrowRight, X, Trash2, Download } from "lucide-react"
import { Loader, Spinner, CompactLoader } from "@/components/ui/loader"
import Image from "next/image"
import { formatDate } from "./utils"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useVisitors, useCreateVisitor, useUpdateVisitor, useDeleteVisitor, useCreateMember, useVisitorFollowUps, useCreateVisitorFollowUp, useDeleteVisitorFollowUp } from "@/hooks/members"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { generateVisitorSampleExcel, parseExcelFile } from "@/lib/utils/excel-export"
import type { Visitor } from "./types"

export default function VisitorsContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false)
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [selectedVisitorUUID, setSelectedVisitorUUID] = useState<string | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const { organization } = useOrganization()
  const supabase = createClient()
  const queryClient = useQueryClient()

  // Fetch data using hooks
  const { data: allVisitors = [], isLoading: visitorsLoading } = useVisitors()

  // Mutations
  const createVisitor = useCreateVisitor()
  const updateVisitor = useUpdateVisitor()
  const deleteVisitor = useDeleteVisitor()
  const createMember = useCreateMember()

  // Follow-ups
  const { data: followUps = [], isLoading: followUpsLoading } = useVisitorFollowUps(selectedVisitorUUID)
  const createFollowUp = useCreateVisitorFollowUp()
  const deleteFollowUp = useDeleteVisitorFollowUp()

  const isLoading = visitorsLoading
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
    visit_date: "",
    source: "Walk-in",
    status: "New",
    invited_by: "",
    interests: "",
    notes: "",
    follow_up_required: true,
    follow_up_date: "",
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [followUpForm, setFollowUpForm] = useState<{
    date: Date | undefined
    method: string
    notes: string
  }>({
    date: undefined,
    method: "",
    notes: "",
  })

  // Helper to get visitor UUID by number ID
  const getVisitorUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    const currentVisitor = allVisitors.find((visitor: Visitor) => visitor.id === numberId)
    if (!currentVisitor) return null

    try {
      const { data, error } = await supabase
        .from("visitors")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching visitors for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingVisitor = data.find((visitor: { id: string }) => {
        const convertedId = parseInt(visitor.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === numberId
      })

      return (matchingVisitor as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getVisitorUUID:", error)
      return null
    }
  }

  const filteredVisitors = useMemo(() => {
    return allVisitors.filter((visitor: Visitor) => {
      const searchText = `${visitor.first_name} ${visitor.last_name} ${visitor.email} ${visitor.phone_number}`.toLowerCase()
      const matchesSearch = searchText.includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === "all" || visitor.status.toLowerCase() === filterStatus.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [allVisitors, searchQuery, filterStatus])

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
      visit_date: "",
      source: "Walk-in",
      status: "New",
      invited_by: "",
      interests: "",
      notes: "",
      follow_up_required: true,
      follow_up_date: "",
    })
    setPhotoPreview(null)
    setVisitDate(undefined)
    setDateOfBirth(undefined)
    setSelectedVisitor(null)
    setSelectedVisitorUUID(null)
  }

  const handleVisitorClick = async (visitor: Visitor) => {
    setSelectedVisitor(visitor)
    const visitDateObj = visitor.visit_date ? new Date(visitor.visit_date + "T00:00:00") : undefined
    const dobObj = visitor.date_of_birth ? new Date(visitor.date_of_birth + "T00:00:00") : undefined
    
    setFormData({
      first_name: visitor.first_name || "",
      last_name: visitor.last_name || "",
      middle_name: visitor.middle_name || "",
      email: visitor.email || "",
      phone_number: visitor.phone_number || "",
      secondary_phone: visitor.secondary_phone || "",
      gender: visitor.gender || "",
      date_of_birth: visitor.date_of_birth || "",
      marital_status: visitor.marital_status || "",
      spouse_name: visitor.spouse_name || "",
      number_of_children: visitor.number_of_children?.toString() || "",
      occupation: visitor.occupation || "",
      address: visitor.address || "",
      city: visitor.city || "",
      town: visitor.town || "",
      region: visitor.region || "",
      digital_address: visitor.digital_address || "",
      visit_date: visitor.visit_date || "",
      source: visitor.source || "Walk-in",
      status: visitor.status || "New",
      invited_by: visitor.invited_by || "",
      interests: visitor.interests || "",
      notes: visitor.notes || "",
      follow_up_required: visitor.follow_up_required ?? true,
      follow_up_date: visitor.follow_up_date || "",
    })
    setVisitDate(visitDateObj && !isNaN(visitDateObj.getTime()) ? visitDateObj : undefined)
    setDateOfBirth(dobObj && !isNaN(dobObj.getTime()) ? dobObj : undefined)
    setPhotoPreview(visitor.photo || null)
    
    // Get UUID for the visitor
    const visitorUUID = await getVisitorUUID(visitor.id)
    setSelectedVisitorUUID(visitorUUID)
    
    setIsSheetOpen(true)
  }

  const handleAddVisitor = () => {
    resetForm()
    setIsSheetOpen(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const { validateImageFile } = await import('@/lib/utils/image-compression')
    const validation = validateImageFile(file, 5) // Max 5MB before compression
    
    if (!validation.isValid) {
      toast.error(validation.error || 'Invalid image file')
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
      return
    }

    try {
      // Compress image before preview
      const { compressImage } = await import('@/lib/utils/image-compression')
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.5, // Compress to max 500KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      })

      // Show preview of compressed image
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
      
      // Show compression info
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)
      const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2)
      if (file.size > compressedFile.size) {
        toast.success(`Image compressed from ${originalSizeMB}MB to ${compressedSizeMB}MB`)
      }
    } catch (error: any) {
      console.error('Error compressing image:', error)
      toast.error(error.message || 'Failed to process image. Please try again.')
      // Reset file input
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.phone_number || !formData.visit_date) {
      return
    }

    try {
      if (selectedVisitor && selectedVisitorUUID) {
        // Update existing visitor
        await updateVisitor.mutateAsync({
          id: selectedVisitorUUID,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || undefined,
          email: formData.email || undefined,
          phone_number: formData.phone_number,
          secondary_phone: formData.secondary_phone || undefined,
          photo: photoPreview || undefined,
          gender: formData.gender || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          marital_status: formData.marital_status || undefined,
          spouse_name: formData.spouse_name || undefined,
          number_of_children: formData.number_of_children ? parseInt(formData.number_of_children) : undefined,
          occupation: formData.occupation || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          town: formData.town || undefined,
          region: formData.region || undefined,
          digital_address: formData.digital_address || undefined,
          visit_date: formData.visit_date,
          source: formData.source as "Walk-in" | "Invited" | "Online",
          status: formData.status as "New" | "Returning",
          invited_by: formData.invited_by || undefined,
          interests: formData.interests || undefined,
          notes: formData.notes || undefined,
          follow_up_required: formData.follow_up_required,
          follow_up_date: formData.follow_up_date || undefined,
        } as any)
      } else {
        // Create new visitor
        await createVisitor.mutateAsync({
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || undefined,
          email: formData.email || "",
          phone_number: formData.phone_number,
          secondary_phone: formData.secondary_phone || undefined,
          photo: photoPreview || undefined,
          status: formData.status as "New" | "Returning",
          visit_date: formData.visit_date,
          source: formData.source as "Walk-in" | "Invited" | "Online",
          follow_up_required: formData.follow_up_required,
          gender: formData.gender || undefined,
          date_of_birth: formData.date_of_birth || undefined,
          marital_status: formData.marital_status || undefined,
          spouse_name: formData.spouse_name || undefined,
          number_of_children: formData.number_of_children ? parseInt(formData.number_of_children) : undefined,
          occupation: formData.occupation || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          town: formData.town || undefined,
          region: formData.region || undefined,
          digital_address: formData.digital_address || undefined,
          invited_by: formData.invited_by || undefined,
          interests: formData.interests || undefined,
          notes: formData.notes || undefined,
          follow_up_date: formData.follow_up_date || undefined,
        })
      }

      setIsSheetOpen(false)
      resetForm()
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting visitor:", error)
    }
  }

  const handleConvertToMember = async () => {
    if (!selectedVisitor || !selectedVisitorUUID) {
      toast.error("No visitor selected")
      return
    }

    setIsConverting(true)
    try {
      // Create member from visitor data - include all fields
      const memberData = {
        first_name: selectedVisitor.first_name,
        last_name: selectedVisitor.last_name,
        middle_name: selectedVisitor.middle_name,
        email: selectedVisitor.email || "",
        phone_number: selectedVisitor.phone_number || "",
        secondary_phone: selectedVisitor.secondary_phone,
        photo: selectedVisitor.photo,
        gender: selectedVisitor.gender,
        date_of_birth: selectedVisitor.date_of_birth,
        marital_status: selectedVisitor.marital_status,
        spouse_name: selectedVisitor.spouse_name,
        number_of_children: selectedVisitor.number_of_children,
        occupation: selectedVisitor.occupation,
        address: selectedVisitor.address,
        city: selectedVisitor.city,
        town: selectedVisitor.town,
        region: selectedVisitor.region,
        digital_address: selectedVisitor.digital_address,
        membership_status: "active" as const,
        join_date: selectedVisitor.visit_date, // Use visit date as join date
        notes: selectedVisitor.notes 
          ? `Converted from visitor. Original notes: ${selectedVisitor.notes}${selectedVisitor.interests ? ` Interests: ${selectedVisitor.interests}` : ''}${selectedVisitor.invited_by ? ` Invited by: ${selectedVisitor.invited_by}` : ''}`
          : selectedVisitor.interests 
            ? `Converted from visitor. Interests: ${selectedVisitor.interests}${selectedVisitor.invited_by ? ` Invited by: ${selectedVisitor.invited_by}` : ''}`
            : selectedVisitor.invited_by
              ? `Converted from visitor. Invited by: ${selectedVisitor.invited_by}`
              : "Converted from visitor",
      }

      // Create the member
      await createMember.mutateAsync(memberData)

      // Delete the visitor after successful conversion
      if (selectedVisitorUUID) {
        await deleteVisitor.mutateAsync(selectedVisitorUUID)
      }

      toast.success(`${selectedVisitor.first_name} ${selectedVisitor.last_name} has been converted to a member!`)
      
      // Invalidate members query to refresh the members list immediately
      queryClient.invalidateQueries({ queryKey: ["members", organization?.id] })
      
      // Close the sheet and reset form
      setIsSheetOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error converting visitor to member:", error)
      toast.error("Failed to convert visitor to member. Please try again.")
    } finally {
      setIsConverting(false)
    }
  }

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVisitorUUID) {
      toast.error("Please save the visitor first before adding follow-ups")
      return
    }
    
    if (followUpForm.date && followUpForm.method && followUpForm.notes) {
      try {
        await createFollowUp.mutateAsync({
          visitorId: selectedVisitorUUID,
          date: followUpForm.date.toISOString().split('T')[0],
          method: followUpForm.method,
          notes: followUpForm.notes,
        })
        setFollowUpForm({
          date: undefined,
          method: "",
          notes: "",
        })
      } catch (error) {
        // Error is already handled by the hook (toast)
        console.error("Error creating follow-up:", error)
      }
    }
  }

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!selectedVisitorUUID) return
    
    try {
      await deleteFollowUp.mutateAsync({
        id: followUpId,
        visitorId: selectedVisitorUUID,
      })
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error deleting follow-up:", error)
    }
  }

  const handleDeleteClick = () => {
    if (selectedVisitor && selectedVisitorUUID) {
      setIsDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (selectedVisitor && selectedVisitorUUID) {
      try {
        await deleteVisitor.mutateAsync(selectedVisitorUUID)
        setIsSheetOpen(false)
        setIsDeleteDialogOpen(false)
        resetForm()
      } catch (error) {
        // Error is already handled by the hook (toast)
        console.error("Error deleting visitor:", error)
        setIsDeleteDialogOpen(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search visitors" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Visitors" />
            </SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="all">All Visitors</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="returning">Returning</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddVisitor}>
            <UserPlus className="h-4 w-4 mr-2" />
            New Visitor
          </Button>
          <Button onClick={() => setIsUploadSheetOpen(true)} variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Visitors Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {isLoading ? (
          <div className="col-span-full">
            <Loader text="Loading visitors..." size="lg" />
          </div>
        ) : filteredVisitors.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || filterStatus !== "all" ? "No visitors found matching your filters." : "No visitors found. Add your first visitor!"}
          </div>
        ) : (
          filteredVisitors.map((visitor: Visitor) => (
            <Card 
              key={visitor.id} 
              className="relative overflow-hidden border-0 border-l-0 border-r-0 border-b-0 border-t-4 cursor-pointer hover:shadow-lg transition-shadow"
              style={{ borderTopColor: '#14b8a6' } as React.CSSProperties}
              onClick={() => handleVisitorClick(visitor)}
            >
              <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
                {visitor.photo ? (
                  <Image 
                    src={visitor.photo} 
                    alt={`${visitor.first_name} ${visitor.last_name}`} 
                    fill 
                    className="object-cover object-top" 
                  />
                ) : (
                  <div className="text-4xl font-bold text-muted-foreground">
                    {visitor.first_name?.[0]}{visitor.last_name?.[0]}
                  </div>
                )}
              </div>
              <div className="p-3 text-center space-y-1">
                <p className="font-medium text-sm">{visitor.first_name} {visitor.last_name}</p>
                <p className="text-xs text-muted-foreground">{visitor.status}</p>
              </div>
              <Badge 
                className={`absolute top-2 right-2 text-white text-xs rounded-md ${
                  visitor.status === "New" 
                    ? "bg-green-500 hover:bg-green-600" 
                    : "bg-purple-500 hover:bg-purple-600"
                }`}
              >
                {visitor.status}
              </Badge>
            </Card>
          ))
        )}
      </div>

      {/* Visitor Profile Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full max-h-screen overflow-hidden">
          <SheetHeader className="pb-6 flex-shrink-0">
            <SheetTitle className="text-xl font-semibold">
              Visitor Profile
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 flex-shrink-0 w-full max-w-full overflow-hidden">
            <div className="px-2 py-2 w-full max-w-full">
              <div className="mb-5">
                <div className="flex items-center gap-6">
                  <div 
                    className="w-36 h-36 bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {(photoPreview || selectedVisitor?.photo) ? (
                      <Image 
                        src={photoPreview || selectedVisitor?.photo || ''} 
                        alt={selectedVisitor ? `${selectedVisitor.first_name} ${selectedVisitor.last_name}` : 'Profile'} 
                        width={144} 
                        height={144} 
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                        {formData.first_name?.[0] || ''}{formData.last_name?.[0] || ''}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                  />
                  
                  <div className="flex-1 space-y-4">
                    {/* Visitor Name at the top of highlighted section */}
                    <h2 className="text-xl font-semibold mb-1">
                      {selectedVisitor ? `${selectedVisitor.first_name} ${selectedVisitor.last_name}` : formData.first_name && formData.last_name ? `${formData.first_name} ${formData.last_name}` : "New Visitor"}
                    </h2>
                    {selectedVisitor && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Visit Date: {selectedVisitor.visit_date ? formatDate(selectedVisitor.visit_date) : 'N/A'}
                        </p>
                        <p className="text-sm text-muted-foreground">Source: {selectedVisitor.source}</p>
                        <p className="text-sm text-muted-foreground">Status: {selectedVisitor.status}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedVisitor && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="bg-primary text-primary-foreground hover:bg-primary/90" 
                          onClick={handleConvertToMember}
                          disabled={isConverting || createMember.isPending || deleteVisitor.isPending}
                          title="Convert to Member"
                        >
                          {isConverting || createMember.isPending || deleteVisitor.isPending ? (
                            <>
                              <Spinner size="sm" className="mr-2" />
                              Converting...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Convert to Member
                            </>
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="bg-teal-600/20 border-teal-500 text-teal-600 hover:bg-teal-600/30" title="Send Email">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="bg-slate-200 border-slate-300 hover:bg-slate-300" onClick={() => fileInputRef.current?.click()} title="Upload Photo">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="bg-red-600/20 border-red-500 text-red-600 hover:bg-red-600/30" title="Print Profile">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {selectedVisitor && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="bg-red-600/20 border-red-500 text-red-600 hover:bg-red-600/30" 
                          onClick={handleDeleteClick}
                          disabled={deleteVisitor.isPending}
                          title="Delete Visitor"
                        >
                          {deleteVisitor.isPending ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Tabs defaultValue="Bio" className="w-full max-w-full overflow-hidden">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="Bio">
                    <Users className="h-4 w-4 mr-2" />
                    Bio
                  </TabsTrigger>
                  <TabsTrigger value="followup">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Follow-up
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(100vh-350px)] mt-4 w-full max-w-full">
                  <div className="py-4 pr-4 w-full max-w-full overflow-hidden">
                    <TabsContent value="Bio">
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
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                              required
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input 
                              id="last_name" 
                              value={formData.last_name} 
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                              required
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                        </div>

                        {/* Row 2: Primary Phone Number, Secondary Phone Number */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="phone_number">Primary Phone Number *</Label>
                            <Input 
                              id="phone_number" 
                              type="tel" 
                              value={formData.phone_number} 
                              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} 
                              placeholder="+233 24 123 4567"
                              required
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="secondary_phone">Secondary Phone Number</Label>
                            <Input 
                              id="secondary_phone" 
                              type="tel" 
                              value={formData.secondary_phone} 
                              onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })} 
                              placeholder="+233 24 123 4567"
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
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
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input 
                              id="email" 
                              type="email" 
                              value={formData.email} 
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                              placeholder="example@email.com"
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
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
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                              zIndex={110}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select 
                              value={formData.gender} 
                              onValueChange={(value) => setFormData({ ...formData, gender: value })}
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            >
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
                            <Select 
                              value={formData.marital_status} 
                              onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            >
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
                            <Label htmlFor="spouse_name">Spouse Name (Optional)</Label>
                            <Input 
                              id="spouse_name" 
                              value={formData.spouse_name} 
                              onChange={(e) => setFormData({ ...formData, spouse_name: e.target.value })} 
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="number_of_children">Number of Children</Label>
                            <Input 
                              id="number_of_children" 
                              type="number"
                              min="0"
                              value={formData.number_of_children} 
                              onChange={(e) => setFormData({ ...formData, number_of_children: e.target.value })} 
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                        </div>

                        {/* Row 6: Address */}
                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Textarea 
                            id="address" 
                            value={formData.address} 
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                            rows={3}
                            disabled={createVisitor.isPending || updateVisitor.isPending}
                          />
                        </div>

                        {/* Row 7: City, Town, Region */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input 
                              id="city" 
                              value={formData.city} 
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="town">Town</Label>
                            <Input 
                              id="town" 
                              value={formData.town} 
                              onChange={(e) => setFormData({ ...formData, town: e.target.value })} 
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="region">Region</Label>
                            <Input 
                              id="region" 
                              value={formData.region} 
                              onChange={(e) => setFormData({ ...formData, region: e.target.value })} 
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            />
                          </div>
                        </div>

                        {/* Row 8: Digital Address */}
                        <div className="space-y-2">
                          <Label htmlFor="digital_address">Digital Address</Label>
                          <Input 
                            id="digital_address" 
                            value={formData.digital_address} 
                            onChange={(e) => setFormData({ ...formData, digital_address: e.target.value })} 
                            placeholder="e.g., GA-123-4567"
                            disabled={createVisitor.isPending || updateVisitor.isPending}
                          />
                        </div>

                        {/* Visitor-Specific Fields */}
                        <div className="mb-4 pt-4 border-t">
                          <p className="text-md font-semibold mb-4">Visitor Information</p>
                        </div>

                        {/* Row 9: Visit Date, Source */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="visit_date">Visit Date *</Label>
                            <DatePicker
                              date={visitDate}
                              onSelect={(date) => {
                                setVisitDate(date)
                                setFormData({ 
                                  ...formData, 
                                  visit_date: date ? date.toISOString().split('T')[0] : "" 
                                })
                              }}
                              placeholder="Select visit date"
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                              zIndex={110}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="source">Source *</Label>
                            <Select 
                              value={formData.source} 
                              onValueChange={(value) => setFormData({ ...formData, source: value })}
                              disabled={createVisitor.isPending || updateVisitor.isPending}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Source" />
                              </SelectTrigger>
                              <SelectContent className="z-[110]">
                                <SelectItem value="Walk-in">Walk-in</SelectItem>
                                <SelectItem value="Invited">Invited</SelectItem>
                                <SelectItem value="Online">Online</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 10: Additional Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="notes">Additional Notes</Label>
                          <Textarea 
                            id="notes" 
                            value={formData.notes} 
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                            rows={4} 
                            placeholder="Any additional information about the visitor"
                            disabled={createVisitor.isPending || updateVisitor.isPending}
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button 
                            size="sm" 
                            type="submit" 
                            className="flex-1"
                            disabled={createVisitor.isPending || updateVisitor.isPending}
                          >
                            {(createVisitor.isPending || updateVisitor.isPending) ? (
                              <>
                                <Spinner size="sm" className="mr-2" />
                                {selectedVisitor ? "Updating..." : "Adding..."}
                              </>
                            ) : (
                              selectedVisitor ? "Update" : "Add"
                            )}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>

                    <TabsContent value="followup" className="space-y-6 w-full max-w-full">
                      {/* Follow-up History */}
                      <div className="w-full max-w-full overflow-hidden">
                        <div className="mb-4">
                          <p className="text-md font-semibold">Follow-up History</p>
                        </div>
                        <div className="rounded-lg border w-full max-w-full overflow-hidden">
                          <div className="w-full max-w-full overflow-x-auto">
                            <Table className="w-full min-w-full" style={{ tableLayout: 'fixed', width: '100%' } as React.CSSProperties}>
                              <colgroup>
                                <col style={{ width: '100px' }} />
                                <col style={{ width: '110px' }} />
                                <col style={{ width: 'auto' }} />
                              </colgroup>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead className="w-[110px]">Method</TableHead>
                                  <TableHead className="!whitespace-normal">Notes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {followUpsLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                      <CompactLoader />
                                    </TableCell>
                                  </TableRow>
                                ) : followUps.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                      {selectedVisitorUUID ? "No follow-ups recorded yet" : "Save visitor first to add follow-ups"}
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  followUps.map((followUp: any) => (
                                    <TableRow key={followUp.id}>
                                      <TableCell className="font-medium whitespace-nowrap">{formatDate(followUp.date)}</TableCell>
                                      <TableCell className="whitespace-nowrap">{followUp.method}</TableCell>
                                      <TableCell className="!whitespace-normal !break-words pr-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' } as React.CSSProperties}>
                                        <div className="flex items-start justify-between gap-2">
                                          <span>{followUp.notes}</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteFollowUp(followUp.id)}
                                            disabled={deleteFollowUp.isPending}
                                            title="Delete follow-up"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
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
            <DialogTitle>Delete Visitor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedVisitor ? `${selectedVisitor.first_name} ${selectedVisitor.last_name}` : 'this visitor'}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteVisitor.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteVisitor.isPending}
            >
              {deleteVisitor.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Visitor'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Visitors Sheet */}
      <Sheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Import Visitors</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 mt-6">
            {/* Download Sample Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <h3 className="font-semibold text-lg mb-2">Import Contacts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Download our sample file to properly format your contacts. This template ensures correct data structure, reducing errors when uploading your recipient list.
                </p>
                <Button onClick={generateVisitorSampleExcel} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample File
                </Button>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <Label>Upload Excel File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
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
                  id="visitor-upload-input"
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
                        htmlFor="visitor-upload-input"
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
                        const visitorData = {
                          first_name: String(row.first_name || '').trim(),
                          last_name: String(row.last_name || '').trim(),
                          middle_name: row.middle_name ? String(row.middle_name).trim() : undefined,
                          email: String(row.email || '').trim() || "",
                          phone_number: String(row.phone_number || '').trim(),
                          secondary_phone: row.secondary_phone ? String(row.secondary_phone).trim() : undefined,
                          photo: undefined,
                          status: (row.status as "New" | "Returning") || "New",
                          visit_date: row.visit_date ? String(row.visit_date).trim() : "",
                          source: (row.source as "Walk-in" | "Invited" | "Online") || "Walk-in",
                          gender: row.gender ? String(row.gender).trim() : undefined,
                          date_of_birth: row.date_of_birth ? String(row.date_of_birth).trim() : undefined,
                          marital_status: row.marital_status ? String(row.marital_status).trim() : undefined,
                          spouse_name: row.spouse_name ? String(row.spouse_name).trim() : undefined,
                          number_of_children: row.number_of_children ? parseInt(String(row.number_of_children)) : undefined,
                          occupation: row.occupation ? String(row.occupation).trim() : undefined,
                          address: row.address ? String(row.address).trim() : undefined,
                          city: row.city ? String(row.city).trim() : undefined,
                          town: row.town ? String(row.town).trim() : undefined,
                          region: row.region ? String(row.region).trim() : undefined,
                          digital_address: row.digital_address ? String(row.digital_address).trim() : undefined,
                          invited_by: row.invited_by ? String(row.invited_by).trim() : undefined,
                          interests: row.interests ? String(row.interests).trim() : undefined,
                          notes: row.notes ? String(row.notes).trim() : undefined,
                          follow_up_required: row.follow_up_required ? String(row.follow_up_required).toLowerCase() === 'true' : true,
                          follow_up_date: row.follow_up_date ? String(row.follow_up_date).trim() : undefined,
                        }

                        if (!visitorData.first_name || !visitorData.last_name || !visitorData.phone_number) {
                          errorCount++
                          continue
                        }

                        await createVisitor.mutateAsync(visitorData)
                        successCount++
                      } catch (error) {
                        errorCount++
                        console.error('Error creating visitor:', error)
                      }
                    }

                    toast.success(`Successfully imported ${successCount} visitor(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`)
                    setUploadFile(null)
                    setIsUploadSheetOpen(false)
                    queryClient.invalidateQueries({ queryKey: ["visitors", organization?.id] })
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
                  'Upload and Import Visitors'
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

