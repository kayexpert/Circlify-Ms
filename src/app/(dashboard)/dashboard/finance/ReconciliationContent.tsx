"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, CheckCircle2, Circle, Calculator, Loader2 } from "lucide-react"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { cn } from "@/lib/utils"
import ReconciliationDrawer from "./ReconciliationDrawer"
import type { Account, IncomeRecord, ExpenditureRecord, ReconciliationRecord } from "./types"
import { useReconciliationRecords, useCreateReconciliation, useDeleteReconciliation } from "@/hooks/finance"
import { useAccounts } from "@/hooks/finance/useAccounts"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useExpenditureRecords } from "@/hooks/finance/useExpenditureRecords"
import { useCategoriesByType } from "@/hooks/finance/useCategories"
import { useMembersByStatus } from "@/hooks/members"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { formatCurrency, getCurrencySymbol } from "@/app/(dashboard)/dashboard/projects/utils"

export default function ReconciliationContent() {
  // Hooks
  const { organization } = useOrganization()
  const supabase = createClient()
  const { data: reconciliationRecordsData = [], isLoading: reconciliationLoading } = useReconciliationRecords()
  const { data: accountsData = [], isLoading: accountsLoading } = useAccounts()
  const { data: incomeRecordsData = [] } = useIncomeRecords()
  const { data: expenditureRecordsData = [] } = useExpenditureRecords()
  const { data: incomeCategoriesData = [] } = useCategoriesByType("income")
  const { data: membersData = [] } = useMembersByStatus("active")
  
  const createReconciliation = useCreateReconciliation()
  const deleteReconciliation = useDeleteReconciliation()

  // Use hooks data
  const reconciliationRecords = reconciliationRecordsData
  const accounts = accountsData
  const incomeRecords = incomeRecordsData
  const expenditureRecords = expenditureRecordsData
  const incomeCategories = incomeCategoriesData
  const members = membersData
  const expenditureCategories = ["Utilities", "Salaries", "Equipment", "Administrative", "Maintenance", "Outreach", "Liabilities", "Other"]

  const [formData, setFormData] = useState({
    date: new Date() as Date | undefined,
    account: "",
    bankBalance: "",
    notes: "",
  })
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedReconciliation, setSelectedReconciliation] = useState<ReconciliationRecord | null>(null)
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<number | null>(null) // Store ID to keep reference stable
  const stableReconciliationRef = useRef<ReconciliationRecord | null>(null) // Stable ref to prevent drawer from closing during refetches
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reconciliationToDelete, setReconciliationToDelete] = useState<ReconciliationRecord | null>(null)

  // UUID lookup helpers
  const getAccountUUID = async (accountId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("id, organization_id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching accounts for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingAccount = data.find((account: { id: string }) => {
        const convertedId = parseInt(account.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === accountId
      })

      return (matchingAccount as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getAccountUUID:", error)
      return null
    }
  }

  const getReconciliationUUID = async (reconciliationId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      const { data, error } = await supabase
        .from("finance_reconciliation_records")
        .select("id, organization_id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching reconciliations for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingReconciliation = data.find((reconciliation: { id: string }) => {
        const convertedId = parseInt(reconciliation.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === reconciliationId
      })

      return (matchingReconciliation as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getReconciliationUUID:", error)
      return null
    }
  }

  // Calculate book balance when account is selected
  useEffect(() => {
    if (formData.account) {
      const account = accounts.find(a => a.id.toString() === formData.account)
      setSelectedAccount(account || null)
    } else {
      setSelectedAccount(null)
    }
  }, [formData.account, accounts])

  // Store stable reconciliation reference when selected
  useEffect(() => {
    if (selectedReconciliation && isDrawerOpen) {
      stableReconciliationRef.current = selectedReconciliation
    }
  }, [selectedReconciliation?.id, isDrawerOpen]) // Only update when ID changes
  
  // Keep selectedReconciliation in sync when reconciliation records update (important for drawer persistence)
  useEffect(() => {
    if (selectedReconciliationId && isDrawerOpen) {
      // If we have reconciliation records, try to find and update
      if (reconciliationRecords.length > 0) {
        const updatedReconciliation = reconciliationRecords.find(r => r.id === selectedReconciliationId)
        if (updatedReconciliation) {
          // Always update selectedReconciliation with latest data from refetched list
          setSelectedReconciliation(updatedReconciliation)
          stableReconciliationRef.current = updatedReconciliation
          // Also update the account in case it changed
          const account = accounts.find(a => a.id === updatedReconciliation.accountId)
          if (account) {
            setSelectedAccount(account)
          }
        } else if (stableReconciliationRef.current) {
          // Reconciliation not found in updated list - use stable reference to prevent drawer from closing
          setSelectedReconciliation(stableReconciliationRef.current)
        }
      } else if (stableReconciliationRef.current) {
        // During refetch when list is empty, use stable reference to prevent drawer from closing
        setSelectedReconciliation(stableReconciliationRef.current)
      }
      // Never clear selectedReconciliation while drawer is open - this prevents drawer from unmounting
    }
  }, [reconciliationRecords, selectedReconciliationId, isDrawerOpen, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.account || !formData.bankBalance) {
      toast.error("Please fill in all required fields")
      return
    }

    const account = accounts.find(a => a.id.toString() === formData.account)
    if (!account) {
      toast.error("Invalid account selection")
      return
    }

    const bankBalance = parseFloat(formData.bankBalance)
    if (isNaN(bankBalance)) {
      toast.error("Bank balance must be a valid number")
      return
    }

    const bookBalance = account.balance
    const difference = bankBalance - bookBalance

    // Get account UUID
    const accountUUID = await getAccountUUID(account.id)
    if (!accountUUID) {
      toast.error("Could not find account")
      return
    }

    try {
      await createReconciliation.mutateAsync({
        reconciliationData: {
          date: formData.date!,
          accountName: account.name,
          bookBalance: bookBalance,
          bankBalance: bankBalance,
          difference: difference,
          status: "Pending",
          notes: formData.notes || undefined,
        },
        accountId: accountUUID,
        reconciledIncomeEntryUUIDs: [],
        reconciledExpenditureEntryUUIDs: [],
        addedIncomeEntryUUIDs: [],
        addedExpenditureEntryUUIDs: [],
      })

      // Reset form
      setFormData({
        date: new Date(),
        account: "",
        bankBalance: "",
        notes: "",
      })
      setSelectedAccount(null)
    } catch (error) {
      // Error is already handled by the hook (toast)
    }
  }

  const handleDeleteClick = (id: number) => {
    const reconciliation = reconciliationRecords.find((r: ReconciliationRecord) => r.id === id)
    if (!reconciliation) return
    setReconciliationToDelete(reconciliation)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!reconciliationToDelete) return

    const reconciliationUUID = await getReconciliationUUID(reconciliationToDelete.id)
    if (!reconciliationUUID) {
      toast.error("Could not find reconciliation to delete")
      setDeleteDialogOpen(false)
      setReconciliationToDelete(null)
      return
    }

    try {
      await deleteReconciliation.mutateAsync(reconciliationUUID)
      // Note: The hook handles unmarking reconciled entries.
      // Entries added during reconciliation will persist (which is likely correct behavior).
      setDeleteDialogOpen(false)
      setReconciliationToDelete(null)
    } catch (error) {
      // Error is already handled by the hook (toast)
      setDeleteDialogOpen(false)
      setReconciliationToDelete(null)
    }
  }

  const handleReconcile = (reconciliation: ReconciliationRecord) => {
    // Find the account for this reconciliation
    const account = accounts.find(a => a.id === reconciliation.accountId)
    if (!account) {
      toast.error("Account not found for this reconciliation")
      return
    }
    setSelectedReconciliation(reconciliation)
    setSelectedReconciliationId(reconciliation.id) // Store ID to keep reference stable across refetches
    stableReconciliationRef.current = reconciliation // Store stable reference to prevent drawer from closing during refetches
    setSelectedAccount(account)
    setIsDrawerOpen(true)
  }

  const handleUpdateReconciliation = (updatedReconciliation: ReconciliationRecord) => {
    // Update will be handled by React Query cache invalidation
    // ReconciliationDrawer will invalidate queries after updates
    // This callback is kept for ReconciliationDrawer compatibility but does nothing
    // as React Query handles the state updates automatically
  }

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('default', { month: 'short' })
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${capitalizedMonth}-${year}`
  }

  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-green-600"
    if (difference < 0) return "text-red-600"
    return "text-foreground"
  }

  // Sort records - newest first
  const sortedRecords = useMemo(() => {
    return [...reconciliationRecords].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [reconciliationRecords])

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Form Card - Left */}
      <Card>
        <CardHeader>
          <CardTitle>Create Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <DatePicker
                  date={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  placeholder="Select date"
                />
              </div>

              {/* Account */}
              <div className="space-y-2">
                <Label htmlFor="account">Account *</Label>
                <Select 
                  value={formData.account} 
                  onValueChange={(value) => setFormData({ ...formData, account: value })}
                >
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
            </div>

            {/* Book Balance and Bank Balance on same row */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Book Balance (Always visible, populated when account selected) */}
              <div className="space-y-2">
                <Label>Book Balance</Label>
                <Input
                  value={selectedAccount ? formatCurrency(selectedAccount.balance, organization?.currency || "USD") : ""}
                  disabled
                  className="bg-muted"
                  placeholder="Select account to see balance"
                />
                {selectedAccount && (
                  <p className="text-xs text-muted-foreground">
                    Current system balance for {selectedAccount.name}
                  </p>
                )}
              </div>

              {/* Bank Balance */}
              <div className="space-y-2">
                <Label htmlFor="bankBalance">Bank Balance (Actual) *</Label>
                <Input
                  id="bankBalance"
                  type="number"
                  step="0.01"
                  value={formData.bankBalance}
                  onChange={(e) => setFormData({ ...formData, bankBalance: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Difference (Auto-calculated) */}
            {formData.bankBalance && selectedAccount && (
              <div className="space-y-2">
                <Label>Difference</Label>
                <Input
                  value={(() => {
                    const bankBal = parseFloat(formData.bankBalance) || 0
                    const diff = bankBal - selectedAccount.balance
                    return formatCurrency(diff, organization?.currency || "USD")
                  })()}
                  disabled
                  className={cn(
                    "bg-muted font-semibold",
                    getDifferenceColor(
                      (parseFloat(formData.bankBalance) || 0) - selectedAccount.balance
                    )
                  )}
                />
                <p className={cn(
                  "text-xs",
                  (() => {
                    const bankBal = parseFloat(formData.bankBalance) || 0
                    const diff = bankBal - selectedAccount.balance
                    if (diff > 0) return "text-green-600"
                    if (diff < 0) return "text-red-600"
                    return "text-muted-foreground"
                  })()
                )}>
                  {(() => {
                    const bankBal = parseFloat(formData.bankBalance) || 0
                    const diff = bankBal - selectedAccount.balance
                    if (diff > 0) return "Bank has more money than books show"
                    if (diff < 0) return "Bank has less money than books show"
                    return "Balanced"
                  })()}
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Description</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter notes (optional)"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={createReconciliation.isPending}>
              {createReconciliation.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reconciliation Record
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Records Table - Right */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 [&_tr]:bg-background [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="bg-background/95 backdrop-blur">Date</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Account Name</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Book Balance</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Bank Balance</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Difference</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Status</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationLoading || accountsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Spinner size="md" />
                          <p className="text-sm text-muted-foreground">Loading reconciliation records...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sortedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No reconciliation records found. Create one above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell className="font-medium">{record.accountName}</TableCell>
                        <TableCell>{formatCurrency(record.bookBalance, organization?.currency || "USD")}</TableCell>
                        <TableCell>{formatCurrency(record.bankBalance, organization?.currency || "USD")}</TableCell>
                        <TableCell className={cn("font-semibold", getDifferenceColor(record.difference))}>
                          {record.difference > 0 ? "+" : ""}
                          {formatCurrency(record.difference, organization?.currency || "USD")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === "Reconciled" ? "default" : "secondary"}
                            className={record.status === "Reconciled" ? "bg-green-600" : "bg-yellow-500"}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleReconcile(record)}
                              title="Reconcile"
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteClick(record.id)}
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteReconciliation.isPending}
                            >
                              {deleteReconciliation.isPending ? (
                                <Spinner size="sm" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
        </CardContent>
      </Card>

      {/* Reconciliation Drawer - Use stable key and ref to prevent remounting during refetches */}
      {(selectedReconciliation || stableReconciliationRef.current) && selectedAccount && selectedReconciliationId && (
        <ReconciliationDrawer
          key={`reconciliation-${selectedReconciliationId}`} // Stable key prevents remounting
          isOpen={isDrawerOpen}
          onOpenChange={(open) => {
            // Only allow closing if explicitly requested (not during refetches)
            if (!open) {
              setIsDrawerOpen(false)
              // Clear selections only when drawer is explicitly closed by user
              setSelectedReconciliation(null)
              setSelectedReconciliationId(null)
              setSelectedAccount(null)
              stableReconciliationRef.current = null
            } else {
              setIsDrawerOpen(true)
            }
          }}
          reconciliation={selectedReconciliation || stableReconciliationRef.current!}
          account={selectedAccount}
          onUpdate={handleUpdateReconciliation}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Reconciliation"
        description={reconciliationToDelete ? `Are you sure you want to delete this reconciliation?\n\nAccount: ${reconciliationToDelete.accountName}\nDate: ${reconciliationToDelete.date ? new Date(reconciliationToDelete.date).toLocaleDateString() : "N/A"}\n\nThis will unmark all reconciled entries. This action cannot be undone.` : ""}
        confirmText="Delete"
        isLoading={deleteReconciliation.isPending}
      />
    </div>
  )
}
