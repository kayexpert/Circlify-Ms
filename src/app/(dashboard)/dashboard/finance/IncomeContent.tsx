"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Edit, Trash2, Search, ChevronDown, Check, Loader2 } from "lucide-react"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useIncomeRecordsPaginated, useCreateIncomeRecord, useUpdateIncomeRecord, useDeleteIncomeRecord } from "@/hooks/finance"
import { useAccounts } from "@/hooks/finance"
import { useCategoriesByType } from "@/hooks/finance"
import { useMembersByStatus } from "@/hooks/members"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { Pagination } from "@/components/ui/pagination"
import type { IncomeRecord, Category, Account } from "./types"
import type { Member as ComponentMember } from "@/app/(dashboard)/dashboard/members/types"
import { formatDate } from "./utils"
import { getCurrencySymbol } from "@/app/(dashboard)/dashboard/projects/utils"

export default function IncomeContent() {
  const { organization } = useOrganization()
  const supabase = createClient()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Fetch data using hooks
  const { data: incomeRecordsData, isLoading: incomeRecordsLoading } = useIncomeRecordsPaginated(currentPage, pageSize)
  const incomeRecords = incomeRecordsData?.data || []
  const totalRecords = incomeRecordsData?.total || 0
  const totalPages = incomeRecordsData?.totalPages || 0
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategoriesByType("income")
  const { data: allMembers = [] } = useMembersByStatus("active")

  // Mutations
  const createIncomeRecord = useCreateIncomeRecord()
  const updateIncomeRecord = useUpdateIncomeRecord()
  const deleteIncomeRecord = useDeleteIncomeRecord()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRecordUUID, setEditingRecordUUID] = useState<string | null>(null)
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)

  // Debounce search input to reduce filter operations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [searchQuery])
  const [formData, setFormData] = useState({
    date: new Date() as Date | undefined,
    category: "",
    description: "",
    amount: "",
    account: "",
    member: "",
  })

  const activeMembers = allMembers

  // Helper functions for UUID lookups
  const getAccountUUIDByName = async (accountName: string): Promise<string | null> => {
    if (!organization?.id) return null
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("name", accountName)
      .maybeSingle()
    
    if (error || !data) return null
    return (data as { id: string }).id || null
  }

  const getAccountUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const account = accounts.find((a: Account) => a.id === numberId)
    if (!account) return null
    return getAccountUUIDByName(account.name)
  }

  const getMemberUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const member = allMembers.find((m: any) => m.id === numberId)
    if (!member) return null
    
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("first_name", member.first_name)
      .eq("last_name", member.last_name)
      .maybeSingle()
    
    if (error || !data) return null
    return (data as { id: string }).id || null
  }

  const getIncomeRecordUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const record = incomeRecords.find((r: IncomeRecord) => r.id === numberId)
    if (!record) return null
    
    // More reliable lookup: use date + category + amount + member_name (if exists)
    // This is more unique than just category + amount + method
    let query = supabase
      .from("finance_income_records")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("category", record.category)
      .eq("amount", record.amount.toString())
      .eq("date", record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date)
      .limit(10) // Get multiple matches to find the right one
    
    // If record has member info, use it to narrow down
    if (record.memberName) {
      query = query.eq("member_name", record.memberName)
    }
    
    const { data, error } = await query
    
    if (error || !data || data.length === 0) return null
    
    // Type assertion for the data array
    const records = data as Array<{ id: string }>
    
    // If multiple matches, return the first one
    // In the future, we could add more sophisticated matching
    if (records.length > 1) {
      return records[0]?.id || null
    }
    
    return records[0]?.id || null
  }
  
  // Check if selected category tracks members
  const selectedCategory = categories.find(c => c.name === formData.category)
  const shouldShowMemberField = selectedCategory?.trackMembers === true

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    return activeMembers.filter((member: any) =>
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||     
      (member.email || "").toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (member.phone_number || "").includes(memberSearchQuery)
    )
  }, [activeMembers, memberSearchQuery])

  // Get selected member name
  const selectedMember = activeMembers.find((m: any) => m.id.toString() === formData.member)
  const selectedMemberName = selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : ""

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery])

  const filteredRecords = useMemo(() => {
    return incomeRecords
      .filter((record: IncomeRecord) =>
        record.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (record.reference || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        record.method.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (record.memberName || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
  }, [incomeRecords, debouncedSearchQuery])

  const handleDelete = async (id: number) => {
    const recordToDelete = incomeRecords.find((r: IncomeRecord) => r.id === id)
    if (!recordToDelete) return

    try {
      // Get UUIDs
      const recordUUID = await getIncomeRecordUUID(id)
      const accountUUID = await getAccountUUIDByName(recordToDelete.method)

      if (!recordUUID || !accountUUID) {
        toast.error("Failed to find record details")
        return
      }

      await deleteIncomeRecord.mutateAsync({
        id: recordUUID,
        accountId: accountUUID,
        amount: recordToDelete.amount,
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleEdit = async (record: IncomeRecord) => {
    // Find the account ID from the account name
    const account = accounts.find((a: Account) => a.name === record.method)
    setEditingId(record.id)
    
    // Get UUID for the record being edited
    const recordUUID = await getIncomeRecordUUID(record.id)
    if (!recordUUID) {
      toast.error("Failed to find record for editing")
      return
    }
    setEditingRecordUUID(recordUUID)
    
    // Find member by ID or name if record has member info
    let memberId = ""
    if (record.memberId) {
      memberId = record.memberId.toString()
    } else if (record.memberName) {
      // Try to find member by name as fallback
      const memberByName = activeMembers.find(
        (m: any) => `${m.first_name} ${m.last_name}` === record.memberName
      )
      if (memberByName) {
        memberId = memberByName.id.toString()
      }
    }
    
    setFormData({
      date: record.date,
      category: record.category,
      description: record.reference || "",
      amount: record.amount.toString(),
      account: account?.id.toString() || "",
      member: memberId,
    })
    
    // Reset member search when editing
    setMemberSearchQuery("")
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingRecordUUID(null)
    setFormData({
      date: new Date(),
      category: "",
      description: "",
      amount: "",
      account: "",
      member: "",
    })
    setMemberSearchQuery("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.date || !formData.category || !formData.amount || !formData.account) {
      toast.error("Please fill in all required fields")
      return
    }

    // If category tracks members, member is required
    if (shouldShowMemberField && !formData.member) {
      toast.error("Please select a member for this category")
      return
    }

    const selectedAccount = accounts.find((a: Account) => a.id.toString() === formData.account)
    const selectedMemberData = activeMembers.find((m: any) => m.id.toString() === formData.member)
    
    if (!selectedAccount) {
      toast.error("Invalid account selection")
      return
    }

    const amount = parseFloat(formData.amount)
    const accountName = selectedAccount.name

    try {
      // Get UUIDs
      const accountUUID = await getAccountUUID(selectedAccount.id)
      if (!accountUUID) {
        toast.error("Failed to find account")
        return
      }

      let memberUUID: string | null = null
      if (selectedMemberData) {
        memberUUID = await getMemberUUID(selectedMemberData.id)
        if (!memberUUID && shouldShowMemberField) {
          toast.error("Failed to find member. Please try again.")
          return
        }
      }

      const recordData: Omit<IncomeRecord, "id"> = {
        date: formData.date!,
        source: formData.category,
        category: formData.category,
        amount: amount,
        method: accountName,
        reference: formData.description,
        memberId: selectedMemberData?.id,
        memberName: selectedMemberData ? `${selectedMemberData.first_name} ${selectedMemberData.last_name}` : undefined,
      }

      if (editingId && editingRecordUUID) {
        // Update existing record
        await updateIncomeRecord.mutateAsync({
          id: editingRecordUUID,
          recordData: recordData,
          accountId: accountUUID,
          memberId: memberUUID,
        })
        
        setEditingId(null)
        setEditingRecordUUID(null)
      } else {
        // Create new record
        await createIncomeRecord.mutateAsync({
          recordData: recordData,
          accountId: accountUUID,
          memberId: memberUUID,
        })
      }
      
      // Reset form after successful operation
      handleCancel()
    } catch (error) {
      // Error handled by hooks
      console.error("Error in handleSubmit:", error)
    }
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  if (incomeRecordsLoading) {
    return <Loader text="Loading income records..." size="lg" />
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Form on Left */}
      <Card style={{ height: 'fit-content' }}>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Income" : "Add Income"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                date={formData.date}
                onSelect={(date) => setFormData({ ...formData, date })}
                placeholder="Select date"
              />
            </div>

            {/* Row 2: Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => {
                  setFormData({ ...formData, category: value, member: "" })
                  setMemberSearchQuery("")
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Member Selection - Only show if category tracks members */}
            {shouldShowMemberField && (
              <div className="space-y-2">
                <Label htmlFor="member">Member *</Label>
                <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberPopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedMemberName || "Select member..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2 border-b">
                      <Input
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-1">
                        {filteredMembers.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No members found.
                          </div>
                        ) : (
                          filteredMembers.map((member: any) => (
                            <div
                              key={member.id}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                formData.member === member.id.toString() && "bg-accent"
                              )}
                              onClick={() => {
                                setFormData({ ...formData, member: member.id.toString() })
                                setMemberPopoverOpen(false)
                                setMemberSearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.member === member.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{member.first_name} {member.last_name}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Row 4: Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Row 4: Amount and Account */}
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select value={formData.account} onValueChange={(value) => setFormData({ ...formData, account: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({getCurrencySymbol(organization?.currency || "USD")}) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Row 6: Submit and Cancel Buttons */}
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createIncomeRecord.isPending || updateIncomeRecord.isPending}
              >
                {(createIncomeRecord.isPending || updateIncomeRecord.isPending) && (
                  <Spinner size="sm" className="mr-2" />
                )}
                {editingId ? "Update Income" : "Add Income"}
              </Button>
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="flex-1"
                  disabled={createIncomeRecord.isPending || updateIncomeRecord.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table on Right */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Income Records</CardTitle>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search income..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="h-[370px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 [&_tr]:bg-background [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="bg-background/95 backdrop-blur">Date</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Category</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Amount ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Account</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Description</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No income records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.category}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {record.amount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>{record.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" title={record.reference}>
                          {truncateText(record.reference || "", 30)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
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
          {totalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalItems={totalRecords}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
