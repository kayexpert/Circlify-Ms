"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, CheckCircle2, Circle, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Account, IncomeRecord, ExpenditureRecord, ReconciliationRecord } from "./types"
import { formatDate } from "./utils"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useExpenditureRecords } from "@/hooks/finance/useExpenditureRecords"
import { useAccounts } from "@/hooks/finance/useAccounts"
import { useCategoriesByType } from "@/hooks/finance/useCategories"
import { useMembersByStatus } from "@/hooks/members"
import { useUpdateReconciliation } from "@/hooks/finance/useReconciliation"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { useQueryClient } from "@tanstack/react-query"

interface ReconciliationDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  reconciliation: ReconciliationRecord
  account: Account
  onUpdate?: (reconciliation: ReconciliationRecord) => void
}

export default function ReconciliationDrawer({
  isOpen,
  onOpenChange,
  reconciliation,
  account,
  onUpdate,
}: ReconciliationDrawerProps) {
  // Hooks - Only fetch data when drawer is open
  const { organization } = useOrganization()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: incomeRecords = [], isLoading: incomeLoading } = useIncomeRecords(isOpen) // Only fetch when open
  const { data: expenditureRecords = [], isLoading: expenditureLoading } = useExpenditureRecords()
  const { data: incomeCategories = [] } = useCategoriesByType("income")
  const { data: members = [] } = useMembersByStatus("active")
  const updateReconciliation = useUpdateReconciliation()

  const [activeTab, setActiveTab] = useState<"income" | "expenditure">("income")
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showExpenditureForm, setShowExpenditureForm] = useState(false)
  const [currentReconciliation, setCurrentReconciliation] = useState<ReconciliationRecord>(reconciliation)
  const [currentAccount, setCurrentAccount] = useState<Account>(account)
  const [reconciliationUUID, setReconciliationUUID] = useState<string | null>(null)
  const [accountUUID, setAccountUUID] = useState<string | null>(null)
  const lastUpdateRef = useRef<{ bookBalance: number; difference: number; status: string } | null>(null) // Track last update to prevent loop
  const isSubmittingRef = useRef(false) // Track if we're currently submitting to prevent drawer from closing

  const [incomeFormData, setIncomeFormData] = useState({
    date: undefined as Date | undefined,
    category: "",
    description: "",
    amount: "",
  })

  const [expenditureFormData, setExpenditureFormData] = useState({
    date: undefined as Date | undefined,
    category: "",
    description: "",
    amount: "",
  })

  const expenditureCategories = ["Utilities", "Salaries", "Equipment", "Administrative", "Maintenance", "Outreach", "Liabilities", "Other"]

  // UUID lookup helpers - optimized to use account name instead of fetching all records
  const getAccountUUID = async (accountId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      // Use the account from props if available
      const account = accounts.find(a => a.id === accountId)
      if (account) {
        const { data, error } = await supabase
          .from("finance_accounts")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("name", account.name)
          .maybeSingle()

        if (error) {
          console.error("Error fetching account UUID:", error)
          return null
        }

        return (data as { id: string } | null)?.id || null
      }
      return null
    } catch (error) {
      console.error("Error in getAccountUUID:", error)
      return null
    }
  }

  const getReconciliationUUID = async (reconciliationId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      // Use account name and date to find reconciliation more efficiently
      const { data, error } = await supabase
        .from("finance_reconciliation_records")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("account_name", reconciliation.accountName)
        .order("created_at", { ascending: false })
        .limit(100) // Limit to recent reconciliations for this account

      if (error) {
        console.error("Error fetching reconciliation UUID:", error)
        return null
      }

      if (!data || data.length === 0) return null

      // Find by matching converted ID
      const matchingReconciliation = data.find((rec: { id: string }) => {
        const convertedId = parseInt(rec.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === reconciliationId
      })

      return (matchingReconciliation as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getReconciliationUUID:", error)
      return null
    }
  }

  const getIncomeRecordUUID = async (recordId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      // Use the record from incomeRecords if available
      const record = incomeRecords.find(r => r.id === recordId)
      if (record) {
        // Query by account name and date for efficiency
        const { data, error } = await supabase
          .from("finance_income_records")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("method", record.method)
          .eq("date", record.date instanceof Date ? record.date.toISOString().split("T")[0] : record.date)
          .eq("amount", record.amount.toString())
          .maybeSingle()

        if (error) {
          // Silently fail - this is expected for newly created records that haven't synced yet
          return null
        }

        return (data as { id: string } | null)?.id || null
      }
      return null
    } catch (error) {
      // Silently fail - this is expected for newly created records that haven't synced yet
      return null
    }
  }

  const getExpenditureRecordUUID = async (recordId: number): Promise<string | null> => {
    if (!organization?.id) return null
    try {
      // Use the record from expenditureRecords if available
      const record = expenditureRecords.find(r => r.id === recordId)
      if (record) {
        // Query by account name, date, and amount for efficiency
        const { data, error } = await supabase
          .from("finance_expenditure_records")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("method", record.method)
          .eq("date", record.date instanceof Date ? record.date.toISOString().split("T")[0] : record.date)
          .eq("amount", record.amount.toString())
          .maybeSingle()

        if (error) {
          // Silently fail - this is expected for newly created records that haven't synced yet
          return null
        }

        return (data as { id: string } | null)?.id || null
      }
      return null
    } catch (error) {
      // Silently fail - this is expected for newly created records that haven't synced yet
      return null
    }
  }

  // Initialize UUIDs when reconciliation or account changes - only when drawer opens
  // Use refs to track if drawer was just opened to prevent resetting form states
  const isInitialMountRef = useRef(true)
  const previousReconciliationIdRef = useRef<number | null>(null)
  const formVisibilityRef = useRef({ income: false, expenditure: false }) // Persist form visibility across prop changes
  
  // Restore form visibility on mount/reconciliation change (if same reconciliation)
  useEffect(() => {
    if (isOpen && previousReconciliationIdRef.current === reconciliation.id) {
      // Same reconciliation - restore form visibility state
      setShowIncomeForm(formVisibilityRef.current.income)
      setShowExpenditureForm(formVisibilityRef.current.expenditure)
    }
  }, [isOpen, reconciliation.id])
  
  useEffect(() => {
    if (!isOpen) {
      // Reset update tracking when drawer closes
      lastUpdateRef.current = null
      isInitialMountRef.current = true
      previousReconciliationIdRef.current = null
      formVisibilityRef.current = { income: false, expenditure: false }
      return
    }
    
    // Only reset form states if this is a new reconciliation (not just a data refresh)
    const isNewReconciliation = previousReconciliationIdRef.current !== reconciliation.id
    
    // Update reconciliation and account (always update to get latest data)
    setCurrentReconciliation(reconciliation)
    setCurrentAccount(account)
    
    // Only reset update tracking if it's a new reconciliation
    if (isNewReconciliation) {
      lastUpdateRef.current = null
      previousReconciliationIdRef.current = reconciliation.id
      // Reset form visibility for new reconciliation
      setShowIncomeForm(false)
      setShowExpenditureForm(false)
      formVisibilityRef.current = { income: false, expenditure: false }
    }
    
    // Fetch UUIDs asynchronously (only on initial mount or if reconciliation ID changed)
    if (isInitialMountRef.current || isNewReconciliation) {
      Promise.all([
        getReconciliationUUID(reconciliation.id),
        getAccountUUID(account.id)
      ]).then(([recUUID, accUUID]) => {
        setReconciliationUUID(recUUID)
        setAccountUUID(accUUID)
      })
      isInitialMountRef.current = false
    }
  }, [reconciliation, account, isOpen])
  
  // Track form visibility changes
  useEffect(() => {
    if (isOpen) {
      formVisibilityRef.current.income = showIncomeForm
    }
  }, [showIncomeForm, isOpen])
  
  useEffect(() => {
    if (isOpen) {
      formVisibilityRef.current.expenditure = showExpenditureForm
    }
  }, [showExpenditureForm, isOpen])

  // Get all income entries for this account
  const accountIncomeEntries = useMemo(() => {
    return incomeRecords
      .filter(r => r.method === currentReconciliation.accountName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [incomeRecords, currentReconciliation.accountName])

  // Get all expenditure entries for this account
  const accountExpenditureEntries = useMemo(() => {
    return expenditureRecords
      .filter(r => r.method === currentReconciliation.accountName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenditureRecords, currentReconciliation.accountName])

  // Update current account from accounts list (for updated balance)
  useEffect(() => {
    const updatedAccount = accounts.find(a => a.id === reconciliation.accountId)
    if (updatedAccount) {
      setCurrentAccount(updatedAccount)
    }
  }, [accounts, reconciliation.accountId])

  // Recalculate book balance and difference when income/expenditure records change
  // Memoize expensive calculations
  const reconciliationCalculations = useMemo(() => {
    if (!isOpen || !reconciliationUUID) return null
    
    const updatedAccount = accounts.find(a => a.id === reconciliation.accountId)
    if (!updatedAccount) return null
    
    const newBookBalance = updatedAccount.balance
    const newDifference = reconciliation.bankBalance - newBookBalance
    
    // Get current entries for this account
    const currentIncomeEntries = incomeRecords.filter(r => r.method === reconciliation.accountName)
    const currentExpenditureEntries = expenditureRecords.filter(r => r.method === reconciliation.accountName)
    
    // Check if all entries are reconciled (use reconciliation prop, not currentReconciliation state)
    const allIncomeReconciled = currentIncomeEntries.length === 0 || 
      currentIncomeEntries.every(e => (reconciliation.reconciledIncomeEntries || []).includes(e.id))
    const allExpenditureReconciled = currentExpenditureEntries.length === 0 || 
      currentExpenditureEntries.every(e => (reconciliation.reconciledExpenditureEntries || []).includes(e.id))
    
    // Status is Reconciled only if difference is 0 AND all entries are reconciled
    const newStatus: "Reconciled" | "Pending" = 
      (newDifference === 0 && allIncomeReconciled && allExpenditureReconciled) ? "Reconciled" : "Pending"

    return {
      newBookBalance,
      newDifference,
      newStatus,
      updatedAccount,
    }
  }, [isOpen, reconciliationUUID, accounts, incomeRecords, expenditureRecords, reconciliation.bankBalance, reconciliation.accountId, reconciliation.reconciledIncomeEntries, reconciliation.reconciledExpenditureEntries, reconciliation.accountName])

  // Update reconciliation when calculations change
  useEffect(() => {
    if (!reconciliationCalculations || !reconciliationUUID) return
    
    const { newBookBalance, newDifference, newStatus } = reconciliationCalculations
    
    // Check if this is the same update we just made (prevent infinite loop)
    const lastUpdate = lastUpdateRef.current
    if (lastUpdate && 
        lastUpdate.bookBalance === newBookBalance && 
        lastUpdate.difference === newDifference && 
        lastUpdate.status === newStatus) {
      return // Already updated with these values
    }
    
    // Only update if values actually changed (compare against currentReconciliation to avoid loop)
    if (newBookBalance !== currentReconciliation.bookBalance || 
        newDifference !== currentReconciliation.difference || 
        newStatus !== currentReconciliation.status) {
      
      // Track this update
      lastUpdateRef.current = {
        bookBalance: newBookBalance,
        difference: newDifference,
        status: newStatus,
      }
      
      const updated = {
        ...currentReconciliation,
        bookBalance: newBookBalance,
        difference: newDifference,
        status: newStatus,
      }
      setCurrentReconciliation(updated)
      
      // Update reconciliation in database
      // Note: mutate() doesn't return a promise, errors are handled by the hook's onError callback
      updateReconciliation.mutate({
        id: reconciliationUUID,
        reconciliationData: {
          bookBalance: newBookBalance,
          difference: newDifference,
          status: newStatus,
        },
      })
    }
  }, [reconciliationCalculations, reconciliationUUID, currentReconciliation, updateReconciliation])

  // Get reconciled income entries
  const reconciledIncomeIds = currentReconciliation.reconciledIncomeEntries || []
  const reconciledExpenditureIds = currentReconciliation.reconciledExpenditureEntries || []

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!incomeFormData.date || !incomeFormData.category || !incomeFormData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(incomeFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    if (!accountUUID || !reconciliationUUID || !organization?.id) {
      toast.error("Missing account or reconciliation information")
      return
    }

    // Mark that we're submitting to prevent drawer from closing
    isSubmittingRef.current = true

    try {
      // Create income record directly to get UUID immediately
      const dateStr = incomeFormData.date!.toISOString().split("T")[0]
      const { data: createdRecord, error: createError } = await supabase
        .from("finance_income_records")
        .insert({
          organization_id: organization.id,
          account_id: accountUUID,
          date: dateStr,
          source: incomeFormData.category,
          category: incomeFormData.category,
          amount: amount,
          method: currentReconciliation.accountName,
          reference: incomeFormData.description || null,
          is_reconciled: false,
          reconciled_in_reconciliation: null,
        } as any)
        .select("id")
        .single()

      if (createError) {
        throw createError
      }

      if (!(createdRecord as { id: string } | null)?.id) {
        throw new Error("Failed to create income record")
      }

      // Update account balance
      const { data: accountData } = await supabase
        .from("finance_accounts")
        .select("balance")
        .eq("id", accountUUID)
        .single()

      if (accountData) {
        await (supabase
          .from("finance_accounts") as any)
          .update({ balance: ((accountData as { balance: number }).balance || 0) + amount })
          .eq("id", accountUUID)
      }

      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_income_records", organization.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_accounts", organization.id] })

      // Update reconciliation to add this entry to added_income_entries
      // Wrap in try-catch so errors don't prevent form from staying open
      try {
        // Get existing UUIDs (if any) - handle gracefully if lookup fails
        const currentAddedEntries = currentReconciliation.addedIncomeEntries || []
        let validAddedUUIDs: string[] = []
        
        if (currentAddedEntries.length > 0) {
          // Try to get UUIDs for existing entries, but don't fail if lookup fails
          const addedEntryUUIDs = await Promise.allSettled(
            currentAddedEntries.map(id => getIncomeRecordUUID(id))
          )
          validAddedUUIDs = addedEntryUUIDs
            .filter((result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled")
            .map(result => result.value)
            .filter((uuid): uuid is string => uuid !== null)
        }
        
        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          addedIncomeEntryUUIDs: [...validAddedUUIDs, (createdRecord as { id: string }).id],
          markEntriesAsReconciled: false, // Don't mark as reconciled, it's a new entry
        })
      } catch (reconciliationError) {
        // Log error but don't fail the submission - entry was already created
        console.warn("Failed to update reconciliation record:", reconciliationError)
      }

      toast.success("Income entry added successfully")
      
      // Reset form but keep it open for adding more entries
      setIncomeFormData({
        date: undefined,
        category: "",
        description: "",
        amount: "",
      })
      // Form stays open - don't hide it
    } catch (error: any) {
      console.error("Error adding income entry:", error)
      toast.error(error.message || "Failed to add income entry")
    } finally {
      // Clear submission flag - allows drawer to be closed via ESC/outside click after submission
      isSubmittingRef.current = false
    }
  }

  const handleExpenditureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!expenditureFormData.date || !expenditureFormData.category || !expenditureFormData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(expenditureFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    if (!accountUUID || !reconciliationUUID || !organization?.id) {
      toast.error("Missing account or reconciliation information")
      return
    }

    // Validation: Check account balance
    const currentAccountData = accounts.find(a => a.id === reconciliation.accountId)
    if (currentAccountData && amount > currentAccountData.balance) {
      toast.error(`Insufficient balance. Available balance: GH₵ ${currentAccountData.balance.toLocaleString()}`)
      return
    }

    // Mark that we're submitting to prevent drawer from closing
    isSubmittingRef.current = true

    try {
      // Create expenditure record directly to get UUID immediately
      const dateStr = expenditureFormData.date!.toISOString().split("T")[0]
      const { data: createdRecord, error: createError } = await supabase
        .from("finance_expenditure_records")
        .insert({
          organization_id: organization.id,
          account_id: accountUUID,
          date: dateStr,
          description: expenditureFormData.description || "",
          category: expenditureFormData.category,
          amount: amount,
          method: currentReconciliation.accountName,
          reference: expenditureFormData.description || null,
          is_reconciled: false,
          reconciled_in_reconciliation: null,
          linked_liability_id: null,
          linked_liability_name: null,
        } as any)
        .select("id")
        .single()

      if (createError) {
        throw createError
      }

      if (!(createdRecord as { id: string } | null)?.id) {
        throw new Error("Failed to create expenditure record")
      }

      // Update account balance (subtract)
      const { data: accountData } = await supabase
        .from("finance_accounts")
        .select("balance")
        .eq("id", accountUUID)
        .single()

      if (accountData) {
        await (supabase
          .from("finance_accounts") as any)
          .update({ balance: Math.max(0, ((accountData as { balance: number }).balance || 0) - amount) })
          .eq("id", accountUUID)
      }

      // Invalidate and refetch queries to refresh data immediately
      await queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_accounts", organization.id] })

      // Update reconciliation to add this entry to added_expenditure_entries
      // Wrap in try-catch so errors don't prevent form from staying open
      try {
        // Get existing UUIDs (if any) - handle gracefully if lookup fails
        const currentAddedEntries = currentReconciliation.addedExpenditureEntries || []
        let validAddedUUIDs: string[] = []
        
        if (currentAddedEntries.length > 0) {
          // Try to get UUIDs for existing entries, but don't fail if lookup fails
          const addedEntryUUIDs = await Promise.allSettled(
            currentAddedEntries.map(id => getExpenditureRecordUUID(id))
          )
          validAddedUUIDs = addedEntryUUIDs
            .filter((result): result is PromiseFulfilledResult<string | null> => result.status === "fulfilled")
            .map(result => result.value)
            .filter((uuid): uuid is string => uuid !== null)
        }
        
        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          addedExpenditureEntryUUIDs: [...validAddedUUIDs, (createdRecord as { id: string }).id],
          markEntriesAsReconciled: false, // Don't mark as reconciled, it's a new entry
        })
      } catch (reconciliationError) {
        // Log error but don't fail the submission - entry was already created
        console.warn("Failed to update reconciliation record:", reconciliationError)
      }

      toast.success("Expenditure entry added successfully")
      
      // Reset form but keep it open for adding more entries
      setExpenditureFormData({
        date: undefined,
        category: "",
        description: "",
        amount: "",
      })
      // Form stays open - don't hide it
    } catch (error: any) {
      console.error("Error adding expenditure entry:", error)
      toast.error(error.message || "Failed to add expenditure entry")
    } finally {
      // Clear submission flag
      isSubmittingRef.current = false
    }
  }

  const handleToggleIncomeReconciled = async (entryId: number) => {
    if (!reconciliationUUID) {
      toast.error("Reconciliation not found")
      return
    }

    const isReconciled = reconciledIncomeIds.includes(entryId)
    let newReconciledIds: number[]

    if (isReconciled) {
      // Unmark
      newReconciledIds = reconciledIncomeIds.filter(id => id !== entryId)
    } else {
      // Mark as reconciled
      newReconciledIds = [...reconciledIncomeIds, entryId]
    }

    try {
      // Convert all number IDs to UUIDs
      const reconciledUUIDs = await Promise.all(
        newReconciledIds.map(id => getIncomeRecordUUID(id))
      )
      const validReconciledUUIDs = reconciledUUIDs.filter((uuid): uuid is string => uuid !== null)

      // Update reconciliation with new UUID array
      await updateReconciliation.mutateAsync({
        id: reconciliationUUID,
        reconciledIncomeEntryUUIDs: validReconciledUUIDs,
        markEntriesAsReconciled: true, // Hook will mark/unmark entries
      })

      // Update local state
      const updated = {
        ...currentReconciliation,
        reconciledIncomeEntries: newReconciledIds,
      }
      setCurrentReconciliation(updated)
      if (onUpdate) onUpdate(updated)
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error toggling income reconciled:", error)
    }
  }

  const handleToggleExpenditureReconciled = async (entryId: number) => {
    if (!reconciliationUUID) {
      toast.error("Reconciliation not found")
      return
    }

    const isReconciled = reconciledExpenditureIds.includes(entryId)
    let newReconciledIds: number[]

    if (isReconciled) {
      // Unmark
      newReconciledIds = reconciledExpenditureIds.filter(id => id !== entryId)
    } else {
      // Mark as reconciled
      newReconciledIds = [...reconciledExpenditureIds, entryId]
    }

    try {
      // Convert all number IDs to UUIDs
      const reconciledUUIDs = await Promise.all(
        newReconciledIds.map(id => getExpenditureRecordUUID(id))
      )
      const validReconciledUUIDs = reconciledUUIDs.filter((uuid): uuid is string => uuid !== null)

      // Update reconciliation with new UUID array
      await updateReconciliation.mutateAsync({
        id: reconciliationUUID,
        reconciledExpenditureEntryUUIDs: validReconciledUUIDs,
        markEntriesAsReconciled: true, // Hook will mark/unmark entries
      })

      // Update local state
      const updated = {
        ...currentReconciliation,
        reconciledExpenditureEntries: newReconciledIds,
      }
      setCurrentReconciliation(updated)
      if (onUpdate) onUpdate(updated)
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error toggling expenditure reconciled:", error)
    }
  }

  const handleSelectAllIncome = async (checked: boolean) => {
    if (!reconciliationUUID) {
      toast.error("Reconciliation not found")
      return
    }

    try {
      if (checked) {
        const allIds = accountIncomeEntries.map(e => e.id)
        // Convert all IDs to UUIDs
        const allUUIDs = await Promise.all(
          allIds.map(id => getIncomeRecordUUID(id))
        )
        const validUUIDs = allUUIDs.filter((uuid): uuid is string => uuid !== null)

        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          reconciledIncomeEntryUUIDs: validUUIDs,
          markEntriesAsReconciled: true,
        })

        const updated = {
          ...currentReconciliation,
          reconciledIncomeEntries: allIds,
        }
        setCurrentReconciliation(updated)
        if (onUpdate) onUpdate(updated)
      } else {
        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          reconciledIncomeEntryUUIDs: [],
          markEntriesAsReconciled: true,
        })

        const updated = {
          ...currentReconciliation,
          reconciledIncomeEntries: [],
        }
        setCurrentReconciliation(updated)
        if (onUpdate) onUpdate(updated)
      }
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error selecting all income:", error)
    }
  }

  const handleSelectAllExpenditure = async (checked: boolean) => {
    if (!reconciliationUUID) {
      toast.error("Reconciliation not found")
      return
    }

    try {
      if (checked) {
        const allIds = accountExpenditureEntries.map(e => e.id)
        // Convert all IDs to UUIDs
        const allUUIDs = await Promise.all(
          allIds.map(id => getExpenditureRecordUUID(id))
        )
        const validUUIDs = allUUIDs.filter((uuid): uuid is string => uuid !== null)

        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          reconciledExpenditureEntryUUIDs: validUUIDs,
          markEntriesAsReconciled: true,
        })

        const updated = {
          ...currentReconciliation,
          reconciledExpenditureEntries: allIds,
        }
        setCurrentReconciliation(updated)
        if (onUpdate) onUpdate(updated)
      } else {
        await updateReconciliation.mutateAsync({
          id: reconciliationUUID,
          reconciledExpenditureEntryUUIDs: [],
          markEntriesAsReconciled: true,
        })

        const updated = {
          ...currentReconciliation,
          reconciledExpenditureEntries: [],
        }
        setCurrentReconciliation(updated)
        if (onUpdate) onUpdate(updated)
      }
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error selecting all expenditure:", error)
    }
  }


  const getDifferenceColor = (difference: number) => {
    if (difference > 0) return "text-green-600"
    if (difference < 0) return "text-red-600"
    return "text-foreground"
  }

  const allIncomeSelected = accountIncomeEntries.length > 0 && 
    accountIncomeEntries.every(e => reconciledIncomeIds.includes(e.id))
  const allExpenditureSelected = accountExpenditureEntries.length > 0 && 
    accountExpenditureEntries.every(e => reconciledExpenditureIds.includes(e.id))

  const incomeCategoriesList = incomeCategories.length > 0 
    ? incomeCategories.map(c => c.name)
    : ["Tithes", "Offerings", "Donations", "Special Collections", "Fundraising"]

  // Show loading state if data is still loading or UUIDs are not ready
  const isLoading = (isOpen && (incomeLoading || expenditureLoading || !reconciliationUUID || !accountUUID))

  // Custom handler - allow normal closing behavior (close button, ESC, outside click)
  // but prevent closing during active submissions to avoid losing data
  const handleOpenChange = useCallback((open: boolean) => {
    // Always allow opening
    if (open) {
      onOpenChange(open)
      return
    }
    
    // For closing: only prevent if actively submitting, otherwise allow
    if (!isSubmittingRef.current) {
      onOpenChange(open)
    }
    // If trying to close during submission, ignore it to prevent data loss
  }, [onOpenChange])

  return (
    <Sheet 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      modal={true}
    >
      <SheetContent 
        className="w-full sm:max-w-4xl overflow-y-auto"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading reconciliation data...</p>
            </div>
          </div>
        )}
        <SheetHeader className="sticky top-0 bg-background z-20 pb-4 border-b space-y-4 pr-10">
          <div className="flex items-start justify-between">
            <SheetTitle className="flex-1">Reconciliation for: {currentReconciliation.accountName}</SheetTitle>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Book Balance</p>
                <p className="text-lg font-semibold">GH₵ {currentReconciliation.bookBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Bank Balance</p>
                <p className="text-lg font-semibold">GH₵ {currentReconciliation.bankBalance.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Difference</p>
                <p className={cn("text-lg font-semibold", getDifferenceColor(currentReconciliation.difference))}>
                  {currentReconciliation.difference > 0 ? "+" : ""}
                  GH₵ {currentReconciliation.difference.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "income" | "expenditure")} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Income Entries</TabsTrigger>
            <TabsTrigger value="expenditure">Expenditure Entries</TabsTrigger>
          </TabsList>

          {/* Income Entries Tab */}
          <TabsContent value="income" className="space-y-4 mt-4">
            {/* Add Entry Button */}
            {!showIncomeForm && (
              <Button 
                onClick={() => setShowIncomeForm(true)} 
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Income Entry
              </Button>
            )}

            {/* Income Entry Form */}
            {showIncomeForm && (
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Add Income Entry</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowIncomeForm(false)
                        setIncomeFormData({
                          date: undefined,
                          category: "",
                          description: "",
                          amount: "",
                        })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleIncomeSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="income-date">Date *</Label>
                        <DatePicker
                          date={incomeFormData.date}
                          onSelect={(date) => setIncomeFormData({ ...incomeFormData, date })}
                          placeholder="Select date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="income-category">Category *</Label>
                        <Select 
                          value={incomeFormData.category} 
                          onValueChange={(value) => setIncomeFormData({ ...incomeFormData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {incomeCategoriesList.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-description">Description</Label>
                      <Textarea
                        id="income-description"
                        value={incomeFormData.description}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                        placeholder="Enter description (optional)"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="income-account">Account</Label>
                        <Input
                          id="income-account"
                          value={currentReconciliation.accountName}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="income-amount">Amount (GH₵) *</Label>
                        <Input
                          id="income-amount"
                          type="number"
                          step="0.01"
                          value={incomeFormData.amount}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Add Income Entry
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowIncomeForm(false)
                          setIncomeFormData({
                            date: undefined,
                            category: "",
                            description: "",
                            amount: "",
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Income Entries Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Income Entries ({accountIncomeEntries.length} total, {reconciledIncomeIds.length} reconciled)
                  </CardTitle>
                  {accountIncomeEntries.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allIncomeSelected}
                        onCheckedChange={handleSelectAllIncome}
                      />
                      <Label className="text-sm">Select All</Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountIncomeEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No income entries found for this account.
                          </TableCell>
                        </TableRow>
                      ) : (
                        accountIncomeEntries.map((entry) => {
                          const isReconciled = reconciledIncomeIds.includes(entry.id)
                          return (
                            <TableRow 
                              key={entry.id}
                              className={cn(
                                "cursor-pointer",
                                isReconciled && "bg-green-50 dark:bg-green-950/20"
                              )}
                              onClick={() => handleToggleIncomeReconciled(entry.id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isReconciled}
                                  onCheckedChange={() => handleToggleIncomeReconciled(entry.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                              <TableCell>{formatDate(entry.date)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{entry.category}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={entry.reference}>
                                {entry.reference || "-"}
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                GH₵ {entry.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {isReconciled ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Reconciled
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Circle className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenditure Entries Tab */}
          <TabsContent value="expenditure" className="space-y-4 mt-4">
            {/* Add Entry Button */}
            {!showExpenditureForm && (
              <Button 
                onClick={() => {
                  setExpenditureFormData({
                    date: new Date(),
                    category: "",
                    description: "",
                    amount: "",
                  })
                  setShowExpenditureForm(true)
                }} 
                className="w-full"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expenditure Entry
              </Button>
            )}

            {/* Expenditure Entry Form */}
            {showExpenditureForm && (
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Add Expenditure Entry</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowExpenditureForm(false)
                        setExpenditureFormData({
                          date: undefined,
                          category: "",
                          description: "",
                          amount: "",
                        })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleExpenditureSubmit} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="expenditure-date">Date *</Label>
                        <DatePicker
                          date={expenditureFormData.date}
                          onSelect={(date) => setExpenditureFormData({ ...expenditureFormData, date })}
                          placeholder="Select date"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expenditure-category">Category *</Label>
                        <Select 
                          value={expenditureFormData.category} 
                          onValueChange={(value) => setExpenditureFormData({ ...expenditureFormData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenditureCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenditure-description">Description</Label>
                      <Textarea
                        id="expenditure-description"
                        value={expenditureFormData.description}
                        onChange={(e) => setExpenditureFormData({ ...expenditureFormData, description: e.target.value })}
                        placeholder="Enter description (optional)"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="expenditure-account">Account</Label>
                        <Input
                          id="expenditure-account"
                          value={currentReconciliation.accountName}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expenditure-amount">Amount (GH₵) *</Label>
                        <Input
                          id="expenditure-amount"
                          type="number"
                          step="0.01"
                          value={expenditureFormData.amount}
                          onChange={(e) => setExpenditureFormData({ ...expenditureFormData, amount: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Add Expenditure Entry
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowExpenditureForm(false)
                          setExpenditureFormData({
                            date: undefined,
                            category: "",
                            description: "",
                            amount: "",
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Expenditure Entries Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Expenditure Entries ({accountExpenditureEntries.length} total, {reconciledExpenditureIds.length} reconciled)
                  </CardTitle>
                  {accountExpenditureEntries.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allExpenditureSelected}
                        onCheckedChange={handleSelectAllExpenditure}
                      />
                      <Label className="text-sm">Select All</Label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountExpenditureEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No expenditure entries found for this account.
                          </TableCell>
                        </TableRow>
                      ) : (
                        accountExpenditureEntries.map((entry) => {
                          const isReconciled = reconciledExpenditureIds.includes(entry.id)
                          return (
                            <TableRow 
                              key={entry.id}
                              className={cn(
                                "cursor-pointer",
                                isReconciled && "bg-green-50 dark:bg-green-950/20"
                              )}
                              onClick={() => handleToggleExpenditureReconciled(entry.id)}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isReconciled}
                                  onCheckedChange={() => handleToggleExpenditureReconciled(entry.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                              <TableCell>{formatDate(entry.date)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{entry.category}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={entry.description}>
                                {entry.description || "-"}
                              </TableCell>
                              <TableCell className="font-semibold text-red-600">
                                GH₵ {entry.amount.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {isReconciled ? (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Reconciled
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Circle className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
