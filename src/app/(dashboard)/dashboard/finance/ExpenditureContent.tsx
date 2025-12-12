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
import { Edit, Trash2, Search, Loader2 } from "lucide-react"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { useExpenditureRecordsPaginated, useCreateExpenditureRecord, useUpdateExpenditureRecord, useDeleteExpenditureRecord } from "@/hooks/finance"
import { useAccounts } from "@/hooks/finance"
import { useCategoriesByType } from "@/hooks/finance"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { Pagination } from "@/components/ui/pagination"
import type { ExpenditureRecord, Account } from "./types"
import { formatDate } from "./utils"
import { getCurrencySymbol, formatCurrency } from "@/app/(dashboard)/dashboard/projects/utils"

export default function ExpenditureContent() {
  const { organization } = useOrganization()
  const supabase = createClient()

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Fetch data using hooks
  const { data: expenditureRecordsData, isLoading: expenditureRecordsLoading } = useExpenditureRecordsPaginated(currentPage, pageSize)
  const expenditureRecords = expenditureRecordsData?.data || []
  const totalRecords = expenditureRecordsData?.total || 0
  const totalPages = expenditureRecordsData?.totalPages || 0
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategoriesByType("expense")

  // Mutations
  const createExpenditureRecord = useCreateExpenditureRecord()
  const updateExpenditureRecord = useUpdateExpenditureRecord()
  const deleteExpenditureRecord = useDeleteExpenditureRecord()

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  
  // Debounce search query and reset to page 1 when search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingRecordUUID, setEditingRecordUUID] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date() as Date | undefined,
    category: "",
    description: "",
    amount: "",
    account: "",
  })

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

  const getExpenditureRecordUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    try {
      // Method 1: Try to find by ID conversion (most reliable)
      // Fetch records and match by converted number ID
      const { data: allRecords, error: fetchError } = await supabase
        .from("finance_expenditure_records")
        .select("id, date, category, amount, method, description")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(1000) // Reasonable limit for most organizations

      if (fetchError) {
        console.error("Error fetching expenditure records for UUID lookup:", fetchError)
        // Fall through to method 2
      } else if (allRecords && allRecords.length > 0) {
        // Find by matching converted ID
        const matchingRecord = allRecords.find((rec: { id: string }) => {
          const convertedId = parseInt(rec.id.replace(/-/g, "").substring(0, 8), 16) || 0
          return convertedId === numberId
        })

        if (matchingRecord) {
          return (matchingRecord as { id: string }).id
        }
      }

      // Method 2: Fallback - use record from local data with field matching
      const record = expenditureRecords.find((r: ExpenditureRecord) => r.id === numberId)
      if (!record) {
        console.error(`Expenditure record with numberId ${numberId} not found in local records`)
        return null
      }
      
      // Use date, category, amount, method, and description for matching
      const recordDate = record.date instanceof Date 
        ? record.date.toISOString().split("T")[0] 
        : new Date(record.date).toISOString().split("T")[0]
      
      const { data, error } = await supabase
        .from("finance_expenditure_records")
        .select("id, description")
        .eq("organization_id", organization.id)
        .eq("date", recordDate)
        .eq("category", record.category)
        .eq("amount", record.amount.toString())
        .eq("method", record.method)
        .limit(10) // Get multiple in case of duplicates
      
      if (error) {
        console.error("Error in fallback UUID lookup:", error)
        return null
      }
      
      if (!data || data.length === 0) {
        console.error(`No expenditure record found matching numberId ${numberId}`)
        return null
      }
      
      // If multiple records match, try to find by description
      if (data.length > 1 && record.description) {
        const matching = data.find((r: { id: string; description: string | null }) => 
          (r.description || "") === (record.description || "")
        )
        if (matching) {
          return (matching as { id: string }).id
        }
      }
      
      // Return first match if only one, or if description matching didn't work
      return (data[0] as { id: string }).id || null
    } catch (error) {
      console.error("Unexpected error in getExpenditureRecordUUID:", error)
      return null
    }
  }

  const handleDelete = async (id: number) => {
    const recordToDelete = expenditureRecords.find((r: ExpenditureRecord) => r.id === id)
    if (!recordToDelete) {
      toast.error("Record not found in local data")
      return
    }

    try {
      // Get UUIDs with better error reporting
      const recordUUID = await getExpenditureRecordUUID(id)
      const accountUUID = await getAccountUUIDByName(recordToDelete.method)

      if (!recordUUID) {
        console.error("Failed to find expenditure record UUID for:", {
          id,
          category: recordToDelete.category,
          amount: recordToDelete.amount,
          method: recordToDelete.method,
          date: recordToDelete.date,
          description: recordToDelete.description
        })
        toast.error("Failed to find record UUID. Please refresh the page and try again.")
        return
      }

      if (!accountUUID) {
        console.error("Failed to find account UUID for:", recordToDelete.method)
        toast.error(`Failed to find account "${recordToDelete.method}". Please refresh the page and try again.`)
        return
      }

      // Get liability UUID if this expenditure is linked to a liability
      let liabilityUUID: string | null = null
      if (recordToDelete.linkedLiabilityId) {
        // Find liability by number ID and get its UUID
        const { data: liabilities } = await supabase
          .from("finance_liabilities")
          .select("id")
          .eq("organization_id", organization?.id || "")
          .limit(1000) // Fetch all and match by numberId conversion

        if (liabilities) {
          const matchingLiability = liabilities.find((liability: { id: string }) => {
            const convertedId = parseInt(liability.id.replace(/-/g, "").substring(0, 8), 16) || 0
            return convertedId === recordToDelete.linkedLiabilityId
          })
          liabilityUUID = (matchingLiability as { id: string } | undefined)?.id || null
        }
      }

      await deleteExpenditureRecord.mutateAsync({
        id: recordUUID,
        accountId: accountUUID,
        amount: recordToDelete.amount,
        linkedLiabilityId: liabilityUUID,
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleEdit = async (record: ExpenditureRecord) => {
    // Find the account ID from the account name
    const account = accounts.find((a: Account) => a.name === record.method)
    setEditingId(record.id)
    
    // Get UUID for the record being edited
    const recordUUID = await getExpenditureRecordUUID(record.id)
    setEditingRecordUUID(recordUUID)
    
    setFormData({
      date: record.date,
      category: record.category,
      description: record.description,
      amount: record.amount.toString(),
      account: account?.id.toString() || "",
    })
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
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.date || !formData.category || !formData.amount || !formData.account) {
      toast.error("Please fill in all required fields")
      return
    }

    const selectedAccount = accounts.find((a: Account) => a.id.toString() === formData.account)
    
    if (!selectedAccount) {
      toast.error("Invalid account selection")
      return
    }

    const amount = parseFloat(formData.amount)
    const accountName = selectedAccount.name
    
    // Validate account balance for expenditure
    if (editingId) {
      // For updates, check if the new amount exceeds balance (considering the old amount being restored)
      const oldRecord = expenditureRecords.find((r: ExpenditureRecord) => r.id === editingId)
      const oldAmount = oldRecord?.amount || 0
      const balanceAfterRestore = selectedAccount.balance + oldAmount
      
      if (amount > balanceAfterRestore) {
        toast.error(`Insufficient balance. Available balance: ${formatCurrency(balanceAfterRestore, organization?.currency || "USD")}`)
        return
      }
    } else {
      // For new records, check current balance
      if (amount > (selectedAccount.balance || 0)) {
        toast.error(`Insufficient balance. Available balance: ${formatCurrency(selectedAccount.balance || 0, organization?.currency || "USD")}`)
        return
      }
    }

    try {
      // Get UUIDs
      const accountUUID = await getAccountUUID(selectedAccount.id)
      if (!accountUUID) {
        toast.error("Failed to find account")
        return
      }

      const recordData: Partial<ExpenditureRecord> = {
        date: formData.date!,
        description: formData.description,
        category: formData.category,
        amount: amount,
        method: accountName,
        reference: formData.description,
      }

      if (editingId && editingRecordUUID) {
        // Update existing record
        const oldRecord = expenditureRecords.find((r: ExpenditureRecord) => r.id === editingId)
        const oldAccount = oldRecord ? accounts.find((a: Account) => a.name === oldRecord.method) : null
        const oldAccountUUID = oldAccount ? await getAccountUUID(oldAccount.id) : null
        
        await updateExpenditureRecord.mutateAsync({
          id: editingRecordUUID,
          recordData: recordData,
          accountId: accountUUID,
          oldAmount: oldRecord?.amount,
          oldAccountId: oldAccountUUID || undefined,
        })
        
        setEditingId(null)
        setEditingRecordUUID(null)
      } else {
        // Create new record
        await createExpenditureRecord.mutateAsync({
          recordData: recordData as Omit<ExpenditureRecord, "id">,
          accountId: accountUUID,
        })
      }
      
      // Reset form
      setFormData({
        date: new Date(),
        category: "",
        description: "",
        amount: "",
        account: "",
      })
    } catch (error) {
      // Error handled by hooks
    }
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const filteredRecords = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return expenditureRecords
    }
    return expenditureRecords
      .filter((record: ExpenditureRecord) =>
        record.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        (record.description || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        record.method.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      )
  }, [expenditureRecords, debouncedSearchQuery])

  if (expenditureRecordsLoading) {
    return <Loader text="Loading expenditure records..." size="lg" />
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Form on Left */}
      <Card  style={{ height: 'fit-content' }}>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Expenditure" : "Add Expenditure"}</CardTitle>
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
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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

            {/* Row 3: Description */}
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
                {formData.account && (() => {
                  const selectedAccount = accounts.find((a: Account) => a.id.toString() === formData.account)
                  return selectedAccount ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Avail. Bal: {formatCurrency(selectedAccount.balance || 0, organization?.currency || "USD")}
                    </p>
                  ) : null
                })()}
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

            {/* Row 5: Submit and Cancel Buttons */}
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createExpenditureRecord.isPending || updateExpenditureRecord.isPending}
              >
                {(createExpenditureRecord.isPending || updateExpenditureRecord.isPending) && (
                  <Spinner size="sm" className="mr-2" />
                )}
                {editingId ? "Update Expenditure" : "Add Expenditure"}
              </Button>
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="flex-1"
                  disabled={createExpenditureRecord.isPending || updateExpenditureRecord.isPending}
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
            <CardTitle>Expenditure Records</CardTitle>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search expenditure..." 
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
                        No expenditure records found.
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
                        <TableCell className="font-bold text-red-600">
                          {record.amount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>{record.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" title={record.description}>
                          {truncateText(record.description || "", 30)}
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
                onPageChange={(page) => {
                  setCurrentPage(page)
                  // Reset to first page if search changes
                }}
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
