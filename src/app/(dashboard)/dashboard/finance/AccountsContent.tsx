"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, FileText, Trash2, Loader2, Building2, Wallet, Edit, RefreshCw } from "lucide-react"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useRecalculateAccountBalances } from "@/hooks/finance"
import { useIncomeRecords, useCreateIncomeRecord } from "@/hooks/finance"
import { useExpenditureRecords } from "@/hooks/finance"
import { useTransfers, useCreateTransfer } from "@/hooks/finance"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import type { FinanceAccount } from "@/types/database-extension"
import type { Account, TransferRecord } from "./types"

export default function AccountsContent() {
  const [activeTab, setActiveTab] = useState<"overview" | "transfer">("overview")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditFormOpen, setIsEditFormOpen] = useState(false)
  const [isStatementOpen, setIsStatementOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  
  const { organization } = useOrganization()
  const supabase = createClient()

  // Fetch data using hooks
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: incomeRecords = [] } = useIncomeRecords()
  const { data: expenditureRecords = [] } = useExpenditureRecords()
  const { data: transfers = [] } = useTransfers()

  // Mutations
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()
  const createIncomeRecord = useCreateIncomeRecord()
  const recalculateBalances = useRecalculateAccountBalances()
  
  const [formData, setFormData] = useState({
    name: "",
    accountType: "Cash" as "Cash" | "Bank" | "Mobile Money",
    description: "",
    openingBalance: "",
    // Bank fields
    bankName: "",
    bankBranch: "",
    accountNumber: "",
    bankAccountType: "Savings" as "Savings" | "Current Account" | "Foreign Account",
    // Mobile Money fields
    network: "MTN" as "MTN" | "Telecel" | "Airtel Tigo",
    number: "",
  })

  // Helper to get account UUID by name - query full record for proper typing
  const getAccountUUIDByName = async (accountName: string): Promise<string | null> => {
    if (!organization?.id) return null
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("id, name, account_type, balance, opening_balance, description, bank_name, bank_branch, bank_account_type, account_number, network, number, organization_id")
      .eq("organization_id", organization.id)
      .eq("name", accountName)
      .maybeSingle()
    
    if (error || !data) return null
    return (data as FinanceAccount).id || null
  }

  // Helper to get account UUID by number ID
  const getAccountUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const account = accounts.find((a: Account) => a.id === numberId)
    if (!account) return null
    return getAccountUUIDByName(account.name)
  }

  const handleAddAccount = () => {
    setSelectedAccount(null)
    setFormData({
      name: "",
      accountType: "Cash",
      description: "",
      openingBalance: "",
      bankName: "",
      bankBranch: "",
      accountNumber: "",
      bankAccountType: "Savings",
      network: "MTN",
      number: "",
    })
    setIsFormOpen(true)
  }

  const handleEditClick = (account: Account) => {
    setAccountToEdit(account)
    setFormData({
      name: account.name,
      accountType: account.accountType,
      description: account.description || "",
      openingBalance: "", // Not editable
      bankName: account.bankName || "",
      bankBranch: account.bankBranch || "",
      accountNumber: account.accountNumber || "",
      bankAccountType: account.bankAccountType || "Savings",
      network: account.network || "MTN",
      number: account.number || "",
    })
    setIsEditFormOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!accountToEdit || !formData.name.trim()) {
      toast.error("Please enter an account name")
      return
    }

    // Validate required fields based on account type
    if (formData.accountType === "Bank") {
      if (!formData.bankName.trim() || !formData.accountNumber.trim()) {
        toast.error("Please fill in all required bank fields")
        return
      }
    }

    if (formData.accountType === "Mobile Money") {
      if (!formData.number.trim()) {
        toast.error("Please enter a phone number")
        return
      }
    }

    try {
      const accountUUID = await getAccountUUID(accountToEdit.id)
      if (!accountUUID) {
        toast.error("Account not found")
        return
      }

      // Prepare update data - only editable fields, NO balance or opening_balance
      const updateData: {
        name: string
        description?: string | null
        bank_name?: string | null
        bank_branch?: string | null
        account_number?: string | null
        bank_account_type?: "Savings" | "Current Account" | "Foreign Account" | null
        network?: "MTN" | "Telecel" | "Airtel Tigo" | null
        number?: string | null
      } = {
        name: formData.name,
        description: formData.description || null,
      }

      // Add bank-specific fields
      if (formData.accountType === "Bank") {
        updateData.bank_name = formData.bankName || null
        updateData.bank_branch = formData.bankBranch || null
        updateData.account_number = formData.accountNumber || null
        updateData.bank_account_type = formData.bankAccountType || null
        // Clear mobile money fields
        updateData.network = null
        updateData.number = null
      }

      // Add mobile money-specific fields
      if (formData.accountType === "Mobile Money") {
        updateData.network = formData.network || null
        updateData.number = formData.number || null
        // Clear bank fields
        updateData.bank_name = null
        updateData.bank_branch = null
        updateData.account_number = null
        updateData.bank_account_type = null
      }

      // Clear fields for Cash accounts
      if (formData.accountType === "Cash") {
        updateData.bank_name = null
        updateData.bank_branch = null
        updateData.account_number = null
        updateData.bank_account_type = null
        updateData.network = null
        updateData.number = null
      }

      await updateAccount.mutateAsync({
        id: accountUUID,
        ...updateData,
      })

      setIsEditFormOpen(false)
      setAccountToEdit(null)
      setFormData({
        name: "",
        accountType: "Cash",
        description: "",
        openingBalance: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        bankAccountType: "Savings",
        network: "MTN",
        number: "",
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDeleteClick = (account: Account) => {
    setAccountToDelete(account)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return

    try {
      const accountUUID = await getAccountUUID(accountToDelete.id)
      if (!accountUUID) {
        toast.error("Account not found")
        return
      }

      // Check if account has any transactions
      const hasIncomeRecords = incomeRecords.some(r => r.method === accountToDelete.name)
      const hasExpenditureRecords = expenditureRecords.some(r => r.method === accountToDelete.name)
      const hasTransfers = transfers.some(t => 
        t.fromAccountId === accountToDelete.id || t.toAccountId === accountToDelete.id
      )

      if (hasIncomeRecords || hasExpenditureRecords || hasTransfers) {
        toast.error("Cannot delete account with transaction history. Please delete all related records first.")
        return
      }

      await deleteAccount.mutateAsync(accountUUID)
      setIsDeleteDialogOpen(false)
      setAccountToDelete(null)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Please enter an account name")
      return
    }

    // Validate required fields based on account type
    if (formData.accountType === "Bank") {
      if (!formData.bankName.trim() || !formData.accountNumber.trim()) {
        toast.error("Please fill in all required bank fields")
        return
      }
    }

    if (formData.accountType === "Mobile Money") {
      if (!formData.number.trim()) {
        toast.error("Please enter a phone number")
        return
      }
    }

    const openingBalance = parseFloat(formData.openingBalance) || 0

    try {
      // Create account
      const newAccount = await createAccount.mutateAsync({
        name: formData.name,
        accountType: formData.accountType,
        description: formData.description || undefined,
        openingBalance: openingBalance > 0 ? openingBalance : undefined,
        balance: openingBalance,
        ...(formData.accountType === "Bank" && {
          bankName: formData.bankName,
          bankBranch: formData.bankBranch,
          accountNumber: formData.accountNumber,
          bankAccountType: formData.bankAccountType,
        }),
        ...(formData.accountType === "Mobile Money" && {
          network: formData.network,
          number: formData.number,
        }),
      })

      // Create opening balance income record if needed
      if (openingBalance > 0 && newAccount.name) {
        const accountUUID = await getAccountUUIDByName(newAccount.name)
        if (accountUUID) {
          await createIncomeRecord.mutateAsync({
            recordData: {
              date: new Date(),
              source: "Opening Balance",
              category: "Opening Balance",
              amount: openingBalance,
              method: newAccount.name,
              reference: `Opening balance for ${newAccount.name}`,
            },
            accountId: accountUUID,
          })
          toast.success(`Account created and opening balance of GH₵ ${openingBalance.toLocaleString()} recorded`)
        }
      }

      setIsFormOpen(false)
      setFormData({
        name: "",
        accountType: "Cash",
        description: "",
        openingBalance: "",
        bankName: "",
        bankBranch: "",
        accountNumber: "",
        bankAccountType: "Savings",
        network: "MTN",
        number: "",
      })
    } catch (error) {
      // Error handled by hooks
    }
  }

  const handleViewStatement = (account: Account) => {
    setSelectedAccount(account)
    setIsStatementOpen(true)
  }

  const getAccountTransactions = useMemo(() => {
    if (!selectedAccount) return []

    const accountTransactions: Array<{
      id: number
      date: Date
      type: "income" | "expenditure" | "transfer_out" | "transfer_in"
      description: string
      amount: number
      category?: string
    }> = []

    // Income records
    incomeRecords
      .filter(r => r.method === selectedAccount.name)
      .forEach(r => {
        accountTransactions.push({
          id: r.id,
          date: r.date,
          type: "income",
          description: r.reference || r.category,
          amount: r.amount,
          category: r.category,
        })
      })

    // Expenditure records
    expenditureRecords
      .filter(r => r.method === selectedAccount.name)
      .forEach(r => {
        accountTransactions.push({
          id: r.id,
          date: r.date,
          type: "expenditure",
          description: r.description || r.category,
          amount: r.amount,
          category: r.category,
        })
      })

    // Transfer records
    transfers
      .filter(t => t.fromAccountId === selectedAccount.id || t.toAccountId === selectedAccount.id)
      .forEach(t => {
        if (t.fromAccountId === selectedAccount.id) {
          accountTransactions.push({
            id: t.id,
            date: t.date,
            type: "transfer_out",
            description: `Transfer to ${t.toAccountName}`,
            amount: t.amount,
          })
        } else {
          accountTransactions.push({
            id: t.id,
            date: t.date,
            type: "transfer_in",
            description: `Transfer from ${t.fromAccountName}`,
            amount: t.amount,
          })
        }
      })

    return accountTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [selectedAccount, incomeRecords, expenditureRecords, transfers])

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('default', { month: 'short' })
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${capitalizedMonth}-${year}`
  }

  if (accountsLoading) {
    return <Loader text="Loading accounts..." size="lg" />
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "transfer")}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transfer">Transfer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Account Management</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => recalculateBalances.mutate()}
                    disabled={recalculateBalances.isPending}
                    className="cursor-pointer"
                  >
                    {recalculateBalances.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button onClick={handleAddAccount} className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No accounts found. Click "Add Account" to create one.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => (
                    <Card key={account.id} className="relative">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {account.accountType === "Bank" ? (
                              <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Wallet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold truncate">{account.name}</h3>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {account.accountType}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Balance</p>
                            <p className="text-2xl font-bold">
                              GH₵{(account.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className="border-t pt-4">
                            {account.accountType === "Bank" && account.bankName && account.accountNumber && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Bank Details</p>
                                <p className="text-sm">
                                  <span className="font-medium">{account.bankName}</span> - {account.accountNumber}
                                </p>
                              </div>
                            )}
                          
                            {account.accountType === "Cash" && account.description && (
                              <div>
                                <p className="text-sm text-muted-foreground">{account.description}</p>
                              </div>
                            )}
                          
                          {account.accountType === "Mobile Money" && account.network && account.number && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Mobile Money Details</p>
                              <p className="text-sm">
                                <span className="font-medium">{account.network}</span> - {account.number}
                              </p>
                            </div>
                          )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 cursor-pointer"
                              onClick={() => handleEditClick(account)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 cursor-pointer"
                              onClick={() => handleViewStatement(account)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Statement
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(account)}
                              className="px-3 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <TransferTab />
        </TabsContent>
      </Tabs>

      {/* Add Account Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Account</SheetTitle>
            <SheetDescription>
              Create a new account to track your finances
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            {/* Row 1: Account Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter account name"
                required
              />
            </div>

            {/* Row 2: Account Type */}
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select 
                value={formData.accountType} 
                onValueChange={(value) => setFormData({ ...formData, accountType: value as "Cash" | "Bank" | "Mobile Money" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Fields Based on Account Type */}
            {formData.accountType === "Cash" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {formData.accountType === "Bank" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Enter bank name"
                    required={formData.accountType === "Bank"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankBranch">Bank Branch</Label>
                  <Input
                    id="bankBranch"
                    value={formData.bankBranch}
                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                    placeholder="Enter bank branch (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    required={formData.accountType === "Bank"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountType">Account Type *</Label>
                  <Select 
                    value={formData.bankAccountType} 
                    onValueChange={(value) => setFormData({ ...formData, bankAccountType: value as "Savings" | "Current Account" | "Foreign Account" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current Account">Current Account</SelectItem>
                      <SelectItem value="Foreign Account">Foreign Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            {formData.accountType === "Mobile Money" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="network">Network *</Label>
                  <Select 
                    value={formData.network} 
                    onValueChange={(value) => setFormData({ ...formData, network: value as "MTN" | "Telecel" | "Airtel Tigo" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="Telecel">Telecel</SelectItem>
                      <SelectItem value="Airtel Tigo">Airtel Tigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Phone Number *</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create Account
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Account Form Sheet */}
      <Sheet open={isEditFormOpen} onOpenChange={setIsEditFormOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Account</SheetTitle>
            <SheetDescription>
              Update account details. Balance and opening balance cannot be edited.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-6">
            {/* Row 1: Account Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Account Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter account name"
                required
              />
            </div>

            {/* Account Type - Display only (not editable) */}
            <div className="space-y-2">
              <Label htmlFor="edit-accountType">Account Type</Label>
              <Input
                id="edit-accountType"
                value={formData.accountType}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Conditional Fields Based on Account Type */}
            {formData.accountType === "Cash" && (
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description (optional)"
                />
              </div>
            )}

            {formData.accountType === "Bank" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankName">Bank Name *</Label>
                  <Input
                    id="edit-bankName"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Enter bank name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankBranch">Bank Branch</Label>
                  <Input
                    id="edit-bankBranch"
                    value={formData.bankBranch}
                    onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                    placeholder="Enter bank branch (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-accountNumber">Account Number *</Label>
                  <Input
                    id="edit-accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-bankAccountType">Account Type *</Label>
                  <Select 
                    value={formData.bankAccountType} 
                    onValueChange={(value) => setFormData({ ...formData, bankAccountType: value as "Savings" | "Current Account" | "Foreign Account" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Current Account">Current Account</SelectItem>
                      <SelectItem value="Foreign Account">Foreign Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
              </>
            )}

            {formData.accountType === "Mobile Money" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-network">Network *</Label>
                  <Select 
                    value={formData.network} 
                    onValueChange={(value) => setFormData({ ...formData, network: value as "MTN" | "Telecel" | "Airtel Tigo" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN</SelectItem>
                      <SelectItem value="Telecel">Telecel</SelectItem>
                      <SelectItem value="Airtel Tigo">Airtel Tigo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-number">Phone Number *</Label>
                  <Input
                    id="edit-number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditFormOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateAccount.isPending}>
                {updateAccount.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Account"
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Statement Sheet */}
      <Sheet open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedAccount?.name} - Account Statement</SheetTitle>
            <SheetDescription>
              All transactions for this account
            </SheetDescription>
          </SheetHeader>
          {selectedAccount && (
            <div className="mt-6">
              <ScrollArea className="max-h-[calc(100vh-200px)]">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 [&_tr]:bg-background [&_tr]:border-b">
                      <TableRow>
                        <TableHead className="bg-background/95 backdrop-blur">Date</TableHead>
                        <TableHead className="bg-background/95 backdrop-blur">Type</TableHead>
                        <TableHead className="bg-background/95 backdrop-blur">Description</TableHead>
                        <TableHead className="bg-background/95 backdrop-blur">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAccountTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No transactions found for this account.
                          </TableCell>
                        </TableRow>
                      ) : (
                        getAccountTransactions.map((transaction) => (
                          <TableRow key={`${transaction.type}-${transaction.id}`}>
                            <TableCell>{formatDate(transaction.date)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  transaction.type === "income" || transaction.type === "transfer_in" 
                                    ? "default" 
                                    : "destructive"
                                }
                              >
                                {transaction.type === "income" && "Income"}
                                {transaction.type === "expenditure" && "Expenditure"}
                                {transaction.type === "transfer_out" && "Transfer Out"}
                                {transaction.type === "transfer_in" && "Transfer In"}
                              </Badge>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell className={`font-bold ${
                              transaction.type === "income" || transaction.type === "transfer_in"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                              {transaction.type === "expenditure" || transaction.type === "transfer_out" ? "-" : "+"}
                              GH₵ {transaction.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{accountToDelete?.name}"? This action cannot be undone.
              <br /><br />
              <strong className="text-destructive">Warning:</strong> This will permanently delete all income and expenditure records associated with this account, as well as any transfer records involving this account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Transfer Tab Component
function TransferTab() {
  const { organization } = useOrganization()
  const supabase = createClient()
  
  // Fetch data using hooks
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: transfers = [] } = useTransfers()
  const createTransfer = useCreateTransfer()
  
  // Import FinanceAccount type for UUID helper
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type FinanceAccountType = FinanceAccount

  // Helper to get account UUID by number ID
  const getAccountUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const account = accounts.find((a: Account) => a.id === numberId)
    if (!account) return null
    
    const { data, error } = await supabase
      .from("finance_accounts")
      .select("id, name, account_type, balance, opening_balance, description, bank_name, bank_branch, bank_account_type, account_number, network, number, organization_id")
      .eq("organization_id", organization.id)
      .eq("name", account.name)
      .maybeSingle()
    
    if (error || !data) return null
    return (data as FinanceAccount).id || null
  }
  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    date: undefined as Date | undefined,
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fromAccount || !formData.toAccount || !formData.amount || !formData.date) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.fromAccount === formData.toAccount) {
      toast.error("Cannot transfer to the same account")
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    const fromAccount = accounts.find(a => a.id.toString() === formData.fromAccount)
    const toAccount = accounts.find(a => a.id.toString() === formData.toAccount)

    if (!fromAccount || !toAccount) {
      toast.error("Invalid account selection")
      return
    }

    if (fromAccount.balance < amount) {
      toast.error(`Insufficient balance. Available: GH₵ ${fromAccount.balance.toLocaleString()}`)
      return
    }

    try {
      // Get UUIDs for accounts
      const fromAccountUUID = await getAccountUUID(fromAccount.id)
      const toAccountUUID = await getAccountUUID(toAccount.id)

      if (!fromAccountUUID || !toAccountUUID) {
        toast.error("Failed to find account details")
        return
      }

      // Create transfer (balance updates handled automatically by hook)
      await createTransfer.mutateAsync({
        transferData: {
          date: formData.date!,
          amount: amount,
          description: formData.description || `Transfer from ${fromAccount.name} to ${toAccount.name}`,
        },
        fromAccountId: fromAccountUUID,
        toAccountId: toAccountUUID,
        fromAccountName: fromAccount.name,
        toAccountName: toAccount.name,
      })

      // Reset form
      setFormData({
        fromAccount: "",
        toAccount: "",
        amount: "",
        date: undefined,
        description: "",
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('default', { month: 'short' })
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${capitalizedMonth}-${year}`
  }

  const filteredTransfers = useMemo(() => {
    return transfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transfers])

  if (accountsLoading) {
    return <Loader text="Loading accounts..." size="lg" />
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Form on Left */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Funds</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* From Account */}
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account *</Label>
              <Select 
                value={formData.fromAccount} 
                onValueChange={(value) => setFormData({ ...formData, fromAccount: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} (GH₵ {account.balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account *</Label>
              <Select 
                value={formData.toAccount} 
                onValueChange={(value) => setFormData({ ...formData, toAccount: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter(acc => acc.id.toString() !== formData.fromAccount)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name} (GH₵ {account.balance.toLocaleString()})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GH₵) *</Label>
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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <DatePicker
                date={formData.date}
                onSelect={(date) => setFormData({ ...formData, date })}
                placeholder="Select date"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description/Notes</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={createTransfer.isPending}
            >
              {createTransfer.isPending && (
                <Spinner size="sm" className="mr-2" />
              )}
              Transfer Funds
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table on Right */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 [&_tr]:bg-background [&_tr]:border-b">
                  <TableRow>
                    <TableHead className="bg-background/95 backdrop-blur">Date</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">From</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">To</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Amount</TableHead>
                    <TableHead className="bg-background/95 backdrop-blur">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No transfer records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>{formatDate(transfer.date)}</TableCell>
                        <TableCell>{transfer.fromAccountName}</TableCell>
                        <TableCell>{transfer.toAccountName}</TableCell>
                        <TableCell className="font-bold">GH₵ {transfer.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {transfer.description}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
