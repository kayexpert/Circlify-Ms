"use client"

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
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
import { Edit, Trash2, Search, CreditCard, Eye, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Liability, Account } from "./types"
import { useLiabilitiesPaginated, useCreateLiability, useUpdateLiability, useDeleteLiability, useLiabilityPayments, useCategoriesByType, useCreateLoan } from "@/hooks/finance"
import { useAccounts } from "@/hooks/finance/useAccounts"
import { useCreateExpenditureRecord } from "@/hooks/finance/useExpenditureRecords"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { getCurrencySymbol, formatCurrency } from "@/app/(dashboard)/dashboard/projects/utils"
import { useQueryClient } from "@tanstack/react-query"
import { Pagination } from "@/components/ui/pagination"
import type { FinanceLiability } from "@/types/database-extension"

// UUID lookup cache to avoid repeated queries
const uuidCache = new Map<string, string>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cacheTimestamps = new Map<string, number>()

// Helper to convert UUID to numeric ID (for backward compatibility)
function uuidToNumericId(uuid: string): number {
  return parseInt(uuid.replace(/-/g, "").substring(0, 8), 16) || 0
}

// Helper to check if cache entry is still valid
function isCacheValid(key: string): boolean {
  const timestamp = cacheTimestamps.get(key)
  if (!timestamp) return false
  return Date.now() - timestamp < CACHE_TTL
}

export default function LiabilitiesContent() {
  const [activeSubTab, setActiveSubTab] = useState<"regular" | "loans">("regular")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [editingLiabilityUUID, setEditingLiabilityUUID] = useState<string | null>(null)
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [selectedLiabilityForPayment, setSelectedLiabilityForPayment] = useState<Liability | null>(null)
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false)
  const [selectedLiabilityForHistory, setSelectedLiabilityForHistory] = useState<Liability | null>(null)
  const [selectedLiabilityUUIDForHistory, setSelectedLiabilityUUIDForHistory] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [liabilityToDelete, setLiabilityToDelete] = useState<Liability | null>(null)
  const [formData, setFormData] = useState({
    date: new Date() as Date | undefined,
    category: "",
    creditor: "",
    description: "",
    amount: "",
    paidAmount: "",
    initialPaymentAccount: "",
  })
  const [loanFormData, setLoanFormData] = useState({
    date: new Date() as Date | undefined,
    lender: "",
    description: "",
    amountReceived: "",
    amountPayable: "",
    interestRate: "",
    startDate: new Date() as Date | undefined,
    endDate: undefined as Date | undefined,
    durationDays: "",
    account: "",
  })
  const [paymentFormData, setPaymentFormData] = useState({
    account: "",
    amount: "",
    description: "",
    date: new Date() as Date | undefined,
  })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Hooks
  const { organization } = useOrganization()
  const supabase = createClient()
  const queryClient = useQueryClient()
  // Fetch liabilities based on active sub-tab
  const isLoanFilter = activeSubTab === "loans" ? true : false
  const { data: liabilitiesData, isLoading: liabilitiesLoading } = useLiabilitiesPaginated(currentPage, pageSize, true, isLoanFilter)
  const liabilities = liabilitiesData?.data || []
  const totalRecords = liabilitiesData?.total || 0
  const totalPages = liabilitiesData?.totalPages || 0
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: liabilityCategories = [] } = useCategoriesByType("liability")
  const createLiability = useCreateLiability()
  const createLoan = useCreateLoan()
  const updateLiability = useUpdateLiability()
  const deleteLiability = useDeleteLiability()
  const createExpenditureRecord = useCreateExpenditureRecord()
  const { data: liabilityPayments = [], isLoading: paymentsLoading } = useLiabilityPayments(selectedLiabilityUUIDForHistory)

  // Optimized UUID lookup helpers with caching
  const getLiabilityUUID = useCallback(async (liabilityId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    const cacheKey = `liability_${organization.id}_${liabilityId}`
    
    // Check cache first
    if (uuidCache.has(cacheKey) && isCacheValid(cacheKey)) {
      return uuidCache.get(cacheKey) || null
    }
    
    try {
      // Use the liabilities data from the hook if available (more efficient)
      const cachedLiability = liabilities.find(l => l.id === liabilityId)
      if (cachedLiability) {
        // Try to find UUID by matching with database using description, date, and creditor
        const { data, error } = await supabase
          .from("finance_liabilities")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("description", cachedLiability.description)
          .eq("creditor", cachedLiability.creditor)
          .eq("date", cachedLiability.date instanceof Date 
            ? cachedLiability.date.toISOString().split("T")[0] 
            : cachedLiability.date)
          .eq("original_amount", cachedLiability.originalAmount)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (!error && data) {
          const uuid = (data as { id: string }).id
          uuidCache.set(cacheKey, uuid)
          cacheTimestamps.set(cacheKey, Date.now())
          return uuid
        }
      }
      
      // Fallback: query by converted ID (less efficient but works)
      const { data, error } = await supabase
        .from("finance_liabilities")
        .select("id")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching liabilities for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      // Find the liability by matching the converted number ID
      const matchingLiability = data.find((liability: { id: string }) => {
        const convertedId = uuidToNumericId(liability.id)
        return convertedId === liabilityId
      })

      if (matchingLiability) {
        const uuid = (matchingLiability as { id: string }).id
        uuidCache.set(cacheKey, uuid)
        cacheTimestamps.set(cacheKey, Date.now())
        return uuid
      }

      return null
    } catch (error) {
      console.error("Error in getLiabilityUUID:", error)
      return null
    }
  }, [organization?.id, liabilities, supabase])

  const getAccountUUIDByName = useCallback(async (accountName: string): Promise<string | null> => {
    if (!organization?.id) return null
    
    const cacheKey = `account_name_${organization.id}_${accountName}`
    
    // Check cache first
    if (uuidCache.has(cacheKey) && isCacheValid(cacheKey)) {
      return uuidCache.get(cacheKey) || null
    }
    
    try {
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("name", accountName)
        .single()

      if (error || !data) return null
      
      const uuid = (data as { id: string }).id
      uuidCache.set(cacheKey, uuid)
      cacheTimestamps.set(cacheKey, Date.now())
      return uuid
    } catch (error) {
      console.error("Error in getAccountUUIDByName:", error)
      return null
    }
  }, [organization?.id, supabase])

  const getAccountUUID = useCallback(async (accountId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    const cacheKey = `account_${organization.id}_${accountId}`
    
    // Check cache first
    if (uuidCache.has(cacheKey) && isCacheValid(cacheKey)) {
      return uuidCache.get(cacheKey) || null
    }
    
    try {
      // Use the accounts data from the hook if available
      const cachedAccount = accounts.find(a => a.id === accountId)
      if (cachedAccount) {
        // Try to find UUID by matching with database using name
        const { data, error } = await supabase
          .from("finance_accounts")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("name", cachedAccount.name)
          .single()

        if (!error && data) {
          const uuid = (data as { id: string }).id
          uuidCache.set(cacheKey, uuid)
          cacheTimestamps.set(cacheKey, Date.now())
          return uuid
        }
      }
      
      // Fallback: query all and match by converted ID
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("id")
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error fetching accounts for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingAccount = data.find((account: { id: string }) => {
        const convertedId = uuidToNumericId(account.id)
        return convertedId === accountId
      })

      if (matchingAccount) {
        const uuid = (matchingAccount as { id: string }).id
        uuidCache.set(cacheKey, uuid)
        cacheTimestamps.set(cacheKey, Date.now())
        return uuid
      }

      return null
    } catch (error) {
      console.error("Error in getAccountUUID:", error)
      return null
    }
  }, [organization?.id, accounts, supabase])

  const handleDeleteClick = (id: number) => {
    const liability = liabilities.find((l: Liability) => l.id === id)
    if (!liability) return
    setLiabilityToDelete(liability)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!liabilityToDelete) return

    const liabilityUUID = await getLiabilityUUID(liabilityToDelete.id)
    if (!liabilityUUID) {
      toast.error("Could not find liability to delete")
      setDeleteDialogOpen(false)
      setLiabilityToDelete(null)
      return
    }

    try {
      await deleteLiability.mutateAsync(liabilityUUID)
      setDeleteDialogOpen(false)
      setLiabilityToDelete(null)
    } catch (error) {
      // Error is already handled by the hook (toast)
      setDeleteDialogOpen(false)
      setLiabilityToDelete(null)
    }
  }

  const handleEdit = async (liability: Liability) => {
    const liabilityUUID = await getLiabilityUUID(liability.id)
    if (!liabilityUUID) {
      toast.error("Could not find liability to edit")
      return
    }

    // Fetch all payment records to find the initial payment account
    const { data: payments } = await supabase
      .from("finance_expenditure_records")
      .select("id, method, account_id")
      .eq("linked_liability_id", liabilityUUID)
      .eq("organization_id", organization?.id || "")
      .order("created_at", { ascending: true }) // Get earliest payment first (initial payment)

    let initialPaymentAccountId = ""
    if (payments && payments.length > 0) {
      // Get the first payment (initial payment) and find the account by name
      const initialPayment = payments[0]
      const initialPaymentAccountName = (initialPayment as any)?.method
      if (initialPaymentAccountName) {
        const account = accounts.find(a => a.name === initialPaymentAccountName)
        if (account) {
          initialPaymentAccountId = account.id.toString()
        }
      }
      
      if (payments.length > 0) {
        toast.info("This liability has payment records. Paid amount is calculated from payments.")
      }
    }

    setEditingId(liability.id)
    setEditingLiabilityUUID(liabilityUUID)
    setFormData({
      date: liability.date,
      category: liability.category,
      creditor: liability.creditor,
      description: liability.description,
      amount: liability.originalAmount.toString(),
      paidAmount: liability.amountPaid.toString(),
      initialPaymentAccount: initialPaymentAccountId,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingLiabilityUUID(null)
    setFormData({
      date: new Date(),
      category: "",
      creditor: "",
      description: "",
      amount: "",
      paidAmount: "",
      initialPaymentAccount: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.date || !formData.category || !formData.creditor || !formData.description || !formData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const originalAmount = parseFloat(formData.amount)
    let amountPaid = parseFloat(formData.paidAmount || "0")
    
    // Validate initial payment account selection (only for new liabilities, not when editing)
    if (!editingId && amountPaid > 0 && !formData.initialPaymentAccount) {
      toast.error("Please select an account for the initial payment")
      return
    }

    // Validate account balance if initial payment exists
    if (amountPaid > 0 && formData.initialPaymentAccount) {
      const selectedAccount = accounts.find(a => a.id.toString() === formData.initialPaymentAccount)
      if (!selectedAccount) {
        toast.error("Selected account not found")
        return
      }
      if (amountPaid > selectedAccount.balance) {
        toast.error(`Insufficient balance. Available balance: ${formatCurrency(selectedAccount.balance, organization?.currency || "USD")}`)
        return
      }
    }
    
    // If editing and liability has payment records, use the actual paid amount from payments
    if (editingId && editingLiabilityUUID) {
      const { data: payments } = await supabase
        .from("finance_expenditure_records")
        .select("amount")
        .eq("linked_liability_id", editingLiabilityUUID)
        .eq("organization_id", organization?.id || "")

      if (payments && payments.length > 0) {
        // Calculate actual paid amount from payment records
        const actualPaidAmount = (payments as { amount: number | string }[]).reduce((sum: number, payment: { amount: number | string }) => sum + Number(payment.amount), 0)
        amountPaid = actualPaidAmount
        // Warn user if they tried to change paid amount
        if (Math.abs(parseFloat(formData.paidAmount || "0") - actualPaidAmount) > 0.01) {
          toast.warning("Paid amount is calculated from payment records and cannot be changed directly")
        }
      }
    }
    
    if (amountPaid > originalAmount) {
      toast.error("Paid amount cannot exceed original amount")
      return
    }

    try {
      if (editingId && editingLiabilityUUID) {
        // Update existing liability
        await updateLiability.mutateAsync({
          id: editingLiabilityUUID as string,
          date: formData.date!,
          category: formData.category,
          description: formData.description,
          creditor: formData.creditor,
          originalAmount: originalAmount,
          amountPaid: amountPaid,
        } as Partial<Liability> & { id: string })
        handleCancel()
      } else {
        // Create new liability (balance and status will be auto-calculated by database trigger)
        const balance = originalAmount - amountPaid
        const status: "Not Paid" | "Partially Paid" | "Paid" = balance === 0 ? "Paid" : balance < originalAmount ? "Partially Paid" : "Not Paid"
        
        const createdLiability = await createLiability.mutateAsync({
          date: formData.date!,
          category: formData.category,
          description: formData.description,
          creditor: formData.creditor,
          originalAmount: originalAmount,
          amountPaid: amountPaid,
          balance: balance,
          status: status,
        } as Omit<Liability, "id" | "createdAt">)

        // If there's an initial payment, create an expenditure record
        if (amountPaid > 0 && formData.initialPaymentAccount) {
          // Get the UUID of the newly created liability by querying with description, date, and creditor
          // This is more reliable than converting from numeric ID
          let liabilityUUID: string | null = null
          
          if (!organization?.id) {
            toast.error("Organization not found. Payment record not created.")
            return
          }

          // Query for the liability using its unique details
          const liabilityDate = formData.date instanceof Date 
            ? formData.date.toISOString().split("T")[0] 
            : formData.date
          
          const { data: liabilityData, error: liabilityError } = await supabase
            .from("finance_liabilities")
            .select("id")
            .eq("organization_id", organization.id)
            .eq("description", formData.description)
            .eq("creditor", formData.creditor)
            .eq("date", liabilityDate)
            .eq("original_amount", originalAmount)
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (liabilityError || !liabilityData) {
            // Fallback to numeric ID conversion if direct query fails
            liabilityUUID = await getLiabilityUUID(createdLiability.id)
          } else {
            liabilityUUID = (liabilityData as { id: string }).id
          }
          
          if (!liabilityUUID) {
            toast.error("Could not find created liability. Payment record not created.")
            return
          }

          // Get account UUID
          const accountUUID = await getAccountUUID(parseInt(formData.initialPaymentAccount))
          
          if (!accountUUID) {
            toast.error("Could not find selected account. Payment record not created.")
            return
          }

          const selectedAccount = accounts.find(a => a.id.toString() === formData.initialPaymentAccount)
          if (!selectedAccount) {
            toast.error("Selected account not found. Payment record not created.")
            return
          }

          // Create expenditure record for initial payment
          await createExpenditureRecord.mutateAsync({
            recordData: {
              date: formData.date!,
              description: `Initial payment for ${formData.description}`,
              category: "Liabilities",
              amount: amountPaid,
              method: selectedAccount.name,
              reference: `Initial payment for ${formData.description}`,
              linkedLiabilityId: createdLiability.id,
              linkedLiabilityName: formData.description,
            },
            accountId: accountUUID,
            linkedLiabilityId: liabilityUUID,
          })

          // Invalidate queries - balances are updated by database triggers
          // No need to force refetch, React Query will refetch when needed
          await queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
          await queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] })
          await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
          await queryClient.invalidateQueries({ queryKey: ["finance_liability_payments", organization?.id, liabilityUUID] })
        }

        handleCancel()
      }
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error in handleSubmit:", error)
      // Clear cache on error to prevent stale data
      if (organization?.id) {
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization.id] })
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization.id] })
      }
    }
  }

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!loanFormData.date || !loanFormData.lender || !loanFormData.description || 
        !loanFormData.amountReceived || !loanFormData.amountPayable || !loanFormData.account) {
      toast.error("Please fill in all required fields")
      return
    }

    const amountReceived = parseFloat(loanFormData.amountReceived)
    const amountPayable = parseFloat(loanFormData.amountPayable)
    
    if (isNaN(amountReceived) || amountReceived <= 0) {
      toast.error("Amount received must be greater than 0")
      return
    }
    
    if (isNaN(amountPayable) || amountPayable <= 0) {
      toast.error("Amount payable must be greater than 0")
      return
    }
    
    if (amountPayable < amountReceived) {
      toast.error("Amount payable should be greater than or equal to amount received")
      return
    }

    const selectedAccount = accounts.find(a => a.id.toString() === loanFormData.account)
    if (!selectedAccount) {
      toast.error("Please select a valid account")
      return
    }

    // Calculate duration if both dates are provided
    let durationDays: number | null = null
    if (loanFormData.startDate && loanFormData.endDate) {
      const start = new Date(loanFormData.startDate)
      const end = new Date(loanFormData.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (end < start) {
        toast.error("End date must be after start date")
        return
      }
    }

    try {
      // Get account UUID
      const accountUUID = await getAccountUUID(selectedAccount.id)
      if (!accountUUID) {
        toast.error("Failed to find account")
        return
      }

      // Create loan (creates both income and liability records)
      await createLoan.mutateAsync({
        loanData: {
          date: loanFormData.date!,
          category: "Loans/Overdrafts", // Default category for loans
          description: loanFormData.description,
          lender: loanFormData.lender,
          amountReceived: amountReceived,
          amountPayable: amountPayable,
          interestRate: loanFormData.interestRate ? parseFloat(loanFormData.interestRate) : null,
          startDate: loanFormData.startDate,
          endDate: loanFormData.endDate,
          durationDays: durationDays,
          accountName: selectedAccount.name,
        },
        accountId: accountUUID,
      })

      // Reset form
      setLoanFormData({
        date: new Date(),
        lender: "",
        description: "",
        amountReceived: "",
        amountPayable: "",
        interestRate: "",
        startDate: new Date(),
        endDate: undefined,
        durationDays: "",
        account: "",
      })
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error in handleLoanSubmit:", error)
    }
  }

  const handlePayClick = (liability: Liability) => {
    if (liability.status === "Paid") {
      toast.error("This liability is already fully paid")
      return
    }
    setSelectedLiabilityForPayment(liability)
    setPaymentFormData({
      account: "",
      amount: liability.balance.toString(),
      description: `Payment for ${liability.description}`,
      date: new Date(),
    })
    setPaymentDrawerOpen(true)
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedLiabilityForPayment) return
    
    if (!paymentFormData.account || !paymentFormData.amount || !paymentFormData.date) {
      toast.error("Please fill in all required fields")
      return
    }

    const selectedAccount = accounts.find(a => a.id.toString() === paymentFormData.account)
    if (!selectedAccount) {
      toast.error("Please select a valid account")
      return
    }

    const paymentAmount = parseFloat(paymentFormData.amount)
    
    // Validation: Payment amount cannot exceed account balance
    if (paymentAmount > selectedAccount.balance) {
      toast.error(`Insufficient balance. Available balance: ${formatCurrency(selectedAccount.balance, organization?.currency || "USD")}`)
      return
    }
    
    // Validation: Payment amount cannot exceed liability balance
    if (paymentAmount > selectedLiabilityForPayment.balance) {
      toast.error(`Payment cannot exceed liability balance of ${formatCurrency(selectedLiabilityForPayment.balance, organization?.currency || "USD")}`)
      return
    }
    
    // Validation: Payment amount must be greater than 0
    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than 0")
      return
    }

    try {
      // Get UUIDs
      const liabilityUUID = await getLiabilityUUID(selectedLiabilityForPayment.id)
      const accountUUID = await getAccountUUID(selectedAccount.id)

      if (!liabilityUUID) {
        toast.error("Could not find liability")
        return
      }

      if (!accountUUID) {
        toast.error("Could not find account")
        return
      }

      // Create expenditure record (payment)
      await createExpenditureRecord.mutateAsync({
        recordData: {
          date: paymentFormData.date!,
          description: paymentFormData.description || `Payment for ${selectedLiabilityForPayment.description}`,
          category: "Liabilities",
          amount: paymentAmount,
          method: selectedAccount.name,
          reference: paymentFormData.description || `Payment for ${selectedLiabilityForPayment.description}`,
          linkedLiabilityId: selectedLiabilityForPayment.id, // Component ID, but we'll pass UUID separately
          linkedLiabilityName: selectedLiabilityForPayment.description,
        },
        accountId: accountUUID,
        linkedLiabilityId: liabilityUUID, // Pass UUID for linking
      })

      // Update liability's amount_paid (add payment amount)
      // The database trigger will automatically recalculate balance and status
      const newAmountPaid = selectedLiabilityForPayment.amountPaid + paymentAmount
      await updateLiability.mutateAsync({
        id: liabilityUUID as string,
        amountPaid: newAmountPaid,
      } as Partial<Liability> & { id: string })

      // Invalidate queries - balances are updated by database triggers
      await queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      
      // Invalidate liability payments if payment history is open
      if (selectedLiabilityUUIDForHistory && paymentHistoryOpen) {
        await queryClient.invalidateQueries({ 
          queryKey: ["finance_liability_payments", organization?.id, selectedLiabilityUUIDForHistory] 
        })
      }

      // Update selectedLiabilityForHistory if payment history is open to show updated balance
      if (selectedLiabilityForHistory && selectedLiabilityForHistory.id === selectedLiabilityForPayment.id) {
        // Refetch the liability to get updated data
        const updatedLiability = liabilities.find(l => l.id === selectedLiabilityForHistory.id)
        if (updatedLiability) {
          setSelectedLiabilityForHistory(updatedLiability)
        }
      }

      // Success - close drawer and reset form
      setPaymentDrawerOpen(false)
      setSelectedLiabilityForPayment(null)
      setPaymentFormData({
        account: "",
        amount: "",
        description: "",
        date: new Date(),
      })
    } catch (error) {
      // Error is already handled by the hooks (toast)
      console.error("Error processing payment:", error)
      // Clear cache on error to prevent stale data
      if (organization?.id) {
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization.id] })
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization.id] })
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization.id] })
      }
    }
  }

  const handleViewPayments = async (liability: Liability) => {
    const liabilityUUID = await getLiabilityUUID(liability.id)
    // Use the current liability from the list to ensure we have the latest data
    const currentLiability = liabilities.find(l => l.id === liability.id) || liability
    setSelectedLiabilityForHistory(currentLiability)
    setSelectedLiabilityUUIDForHistory(liabilityUUID)
    setPaymentHistoryOpen(true)
  }

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleString('default', { month: 'short' })
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
    const year = date.getFullYear().toString().slice(-2)
    return `${day}-${capitalizedMonth}-${year}`
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  // Hook to check if editing liability has payments
  const { data: editingLiabilityPayments = [] } = useLiabilityPayments(editingLiabilityUUID)

  // Debounce search query for performance
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      // Reset to page 1 when search changes
      if (searchQuery !== debouncedSearchQuery) {
        setCurrentPage(1)
      }
    }, 300) // 300ms debounce
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, debouncedSearchQuery])

  // Update selectedLiabilityForHistory when liabilities list updates (to show current balance)
  useEffect(() => {
    if (selectedLiabilityForHistory && paymentHistoryOpen) {
      const updatedLiability = liabilities.find(l => l.id === selectedLiabilityForHistory.id)
      if (updatedLiability) {
        setSelectedLiabilityForHistory(updatedLiability)
      }
    }
  }, [liabilities, paymentHistoryOpen, selectedLiabilityForHistory?.id])

  // Optimized filtered liabilities with memoization
  const filteredLiabilities = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      // If no search query, just sort by date
      return [...liabilities].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }
    
    const queryLower = debouncedSearchQuery.toLowerCase()
    return liabilities
      .filter((liability) => {
        const categoryMatch = liability.category.toLowerCase().includes(queryLower)
        const descriptionMatch = liability.description.toLowerCase().includes(queryLower)
        const creditorMatch = liability.creditor.toLowerCase().includes(queryLower)
        return categoryMatch || descriptionMatch || creditorMatch
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [liabilities, debouncedSearchQuery])

  // Show loading state
  if (liabilitiesLoading || accountsLoading) {
    return <Loader text="Loading liabilities..." size="lg" />
  }

  return (
    <>
      <Tabs value={activeSubTab} onValueChange={(value) => {
        setActiveSubTab(value as "regular" | "loans")
        setCurrentPage(1) // Reset to first page when switching tabs
        setSearchQuery("") // Clear search when switching tabs
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="regular">Regular Liabilities</TabsTrigger>
          <TabsTrigger value="loans">Loans/Overdrafts</TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card style={{ height: 'fit-content' }}>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Liability" : "Add Liability"}</CardTitle>
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
                    {liabilityCategories.length === 0 ? (
                      <div className="px-2 py-6 text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          No liability categories available
                        </p>
                        <Link 
                          href="/dashboard/finance?tab=categories"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 underline transition-colors"
                        >
                          <span>Click here to add liability categories</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      liabilityCategories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 3: Creditor */}
              <div className="space-y-2">
                <Label htmlFor="creditor">Creditor *</Label>
                <Input
                  id="creditor"
                  value={formData.creditor}
                  onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                  placeholder="Enter creditor name"
                  required
                />
              </div>

              {/* Row 4: Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description..."
                  rows={3}
                  required
                />
              </div>

              {/* Row 5: Amount and Paid Amount */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid Amount ({getCurrencySymbol(organization?.currency || "USD")})</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value, initialPaymentAccount: parseFloat(e.target.value || "0") > 0 ? formData.initialPaymentAccount : "" })}
                    placeholder="0.00"
                    disabled={editingId && editingLiabilityUUID ? editingLiabilityPayments.length > 0 : false}
                  />
                  {editingId && editingLiabilityUUID && editingLiabilityPayments.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Paid amount is calculated from payment records
                    </p>
                  )}
                </div>
              </div>

              {/* Initial Payment Account - Show when paidAmount > 0 (always show when editing if there was an initial payment) */}
              {parseFloat(formData.paidAmount || "0") > 0 && (!editingId || formData.initialPaymentAccount) && (
                <div className="space-y-2">
                  <Label htmlFor="initialPaymentAccount">
                    Account for Initial Payment {editingId ? "(not editable)" : "*"}
                  </Label>
                  <Select 
                    value={formData.initialPaymentAccount} 
                    onValueChange={(value) => setFormData({ ...formData, initialPaymentAccount: value })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="w-full" disabled={!!editingId}>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No accounts available. Add accounts first.
                        </div>
                      ) : (
                        accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {editingId && formData.initialPaymentAccount && (
                    <p className="text-xs text-muted-foreground">
                      Initial payment account cannot be changed when editing a liability
                    </p>
                  )}
                  {formData.initialPaymentAccount && (() => {
                    const selectedAccount = accounts.find(a => a.id.toString() === formData.initialPaymentAccount)
                    const paymentAmount = parseFloat(formData.paidAmount || "0")
                    return selectedAccount ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Available Balance: {formatCurrency(selectedAccount.balance || 0, organization?.currency || "USD")}
                        </p>
                        {paymentAmount > selectedAccount.balance && (
                          <p className="text-xs text-red-600">
                            Insufficient balance. Available: {formatCurrency(selectedAccount.balance || 0, organization?.currency || "USD")}
                          </p>
                        )}
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              {/* Row 6: Submit and Cancel Buttons */}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? "Update Liability" : "Add Liability"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table on Right */}
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Liabilities Records</CardTitle>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search liabilities..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="rounded-md border">
              <div className="h-[370px] overflow-y-auto overflow-x-auto custom-scrollbar">
                <Table className="min-w-[1000px]">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Creditor</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Original Amount ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                      <TableHead>Amount Paid ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                      <TableHead>Balance ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLiabilities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No liabilities found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLiabilities.map((liability) => (
                        <TableRow key={liability.id}>
                          <TableCell>
                            {formatDate(liability.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{liability.category}</Badge>
                          </TableCell>
                          <TableCell>{liability.creditor}</TableCell>
                          <TableCell className="text-sm text-muted-foreground" title={liability.description}>
                            {truncateText(liability.description || "", 30)}
                          </TableCell>
                          <TableCell className="text-center">
                            {liability.originalAmount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-center text-green-600">
                            {liability.amountPaid?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-center text-red-600">
                            {liability.balance?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                liability.status === "Paid" 
                                  ? "bg-green-500 hover:bg-green-600" 
                                  : liability.status === "Partially Paid"
                                  ? "bg-orange-500 hover:bg-orange-600"
                                  : "bg-red-500 hover:bg-red-600"
                              }
                            >
                              {liability.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handlePayClick(liability)}
                                disabled={liability.status === "Paid"}
                                title={liability.status === "Paid" ? "Liability is fully paid" : "Make payment"}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleViewPayments(liability)}
                                title="View payment history"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(liability)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(liability.id)}>
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
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Loan Form on Left */}
            <Card style={{ height: 'fit-content' }}>
              <CardHeader>
                <CardTitle>Add Loan/Overdraft</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLoanSubmit} className="space-y-4">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-date">Date *</Label>
                    <DatePicker
                      date={loanFormData.date}
                      onSelect={(date) => setLoanFormData({ ...loanFormData, date })}
                      placeholder="Select date"
                    />
                  </div>

                  {/* Lender */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-lender">Lender *</Label>
                    <Input
                      id="loan-lender"
                      value={loanFormData.lender}
                      onChange={(e) => setLoanFormData({ ...loanFormData, lender: e.target.value })}
                      placeholder="Enter lender name"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-description">Description *</Label>
                    <Textarea
                      id="loan-description"
                      value={loanFormData.description}
                      onChange={(e) => setLoanFormData({ ...loanFormData, description: e.target.value })}
                      placeholder="Enter description..."
                      rows={3}
                      required
                    />
                  </div>

                  {/* Amount Received */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-amount-received">Amount Received ({getCurrencySymbol(organization?.currency || "USD")}) *</Label>
                    <Input
                      id="loan-amount-received"
                      type="number"
                      step="0.01"
                      value={loanFormData.amountReceived}
                      onChange={(e) => setLoanFormData({ ...loanFormData, amountReceived: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount you received from the loan (goes to income).
                    </p>
                  </div>

                  {/* Interest Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-interest-rate">Interest Rate (%)</Label>
                    <Input
                      id="loan-interest-rate"
                      type="number"
                      step="0.01"
                      value={loanFormData.interestRate}
                      onChange={(e) => setLoanFormData({ ...loanFormData, interestRate: e.target.value })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual interest rate as percentage (e.g., 10.5 for 10.5%).
                    </p>
                  </div>

                  {/* Start Date and End Date on same row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loan-start-date">Loan Start Date</Label>
                      <DatePicker
                        date={loanFormData.startDate}
                        onSelect={(date) => {
                          setLoanFormData({ ...loanFormData, startDate: date })
                          // Auto-calculate duration if end date exists
                          if (date && loanFormData.endDate) {
                            const start = new Date(date)
                            const end = new Date(loanFormData.endDate)
                            const diffTime = Math.abs(end.getTime() - start.getTime())
                            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            setLoanFormData(prev => ({ ...prev, durationDays: days.toString() }))
                          }
                        }}
                        placeholder="Select start date"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loan-end-date">Expected Payment Date</Label>
                      <DatePicker
                        date={loanFormData.endDate}
                        onSelect={(date) => {
                          setLoanFormData({ ...loanFormData, endDate: date })
                          // Auto-calculate duration if start date exists
                          if (date && loanFormData.startDate) {
                            const start = new Date(loanFormData.startDate)
                            const end = new Date(date)
                            const diffTime = Math.abs(end.getTime() - start.getTime())
                            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                            setLoanFormData(prev => ({ ...prev, durationDays: days.toString() }))
                          }
                        }}
                        placeholder="Select date"
                      />
                    </div>
                  </div>

                  {/* Duration (auto-calculated, but can be manually entered) */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-duration">Duration (Days)</Label>
                    <Input
                      id="loan-duration"
                      type="number"
                      value={loanFormData.durationDays}
                      onChange={(e) => setLoanFormData({ ...loanFormData, durationDays: e.target.value })}
                      placeholder="Auto-calculated from dates"
                      readOnly={!!(loanFormData.startDate && loanFormData.endDate)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {loanFormData.startDate && loanFormData.endDate 
                        ? "Automatically calculated from start and end dates."
                        : "Enter manually or select start and end dates to auto-calculate."}
                    </p>
                  </div>

                  {/* Amount Payable */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-amount-payable">Amount Payable ({getCurrencySymbol(organization?.currency || "USD")}) *</Label>
                    <Input
                      id="loan-amount-payable"
                      type="number"
                      step="0.01"
                      value={loanFormData.amountPayable}
                      onChange={(e) => setLoanFormData({ ...loanFormData, amountPayable: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Total amount to be paid back (including interest and fees).
                    </p>
                  </div>

                  {/* Account */}
                  <div className="space-y-2">
                    <Label htmlFor="loan-account">Account to Receive Funds *</Label>
                    <Select value={loanFormData.account} onValueChange={(value) => setLoanFormData({ ...loanFormData, account: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No accounts available. Add accounts first.
                          </div>
                        ) : (
                          accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name} - {formatCurrency(account.balance || 0, organization?.currency || "USD")}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      Add Loan
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Loans Table on Right */}
            <Card className="min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Loans/Overdrafts Records</CardTitle>
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search loans..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="pl-10" 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                <div className="rounded-md border">
                  <div className="h-[370px] overflow-y-auto overflow-x-auto custom-scrollbar">
                    <Table className="min-w-[1000px]">
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Lender</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Loan Amount ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                          <TableHead>Amount Paid ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                          <TableHead>Balance ({getCurrencySymbol(organization?.currency || "USD")})</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLiabilities.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              No loans found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLiabilities.map((liability) => (
                            <TableRow key={liability.id}>
                              <TableCell>
                                {formatDate(liability.date)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{liability.category}</Badge>
                              </TableCell>
                              <TableCell>{liability.creditor}</TableCell>
                              <TableCell className="text-sm text-muted-foreground" title={liability.description}>
                                {truncateText(liability.description || "", 30)}
                              </TableCell>
                              <TableCell className="text-center">
                                {liability.originalAmount?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell className="text-center text-green-600">
                                {liability.amountPaid?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell className="text-center text-red-600">
                                {liability.balance?.toLocaleString() || 0}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    liability.status === "Paid" 
                                      ? "bg-green-500 hover:bg-green-600" 
                                      : liability.status === "Partially Paid"
                                      ? "bg-orange-500 hover:bg-orange-600"
                                      : "bg-red-500 hover:bg-red-600"
                                  }
                                >
                                  {liability.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePayClick(liability)}
                                    disabled={liability.status === "Paid"}
                                    title="Make Payment"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewPayments(liability)}
                                    title="View Payment History"
                                  >
                                    <Eye className="h-4 w-4" />
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
                {totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
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
        </TabsContent>
      </Tabs>

      {/* Payment Drawer */}
      <Sheet open={paymentDrawerOpen} onOpenChange={setPaymentDrawerOpen}>
        <SheetContent className="sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Make Payment</SheetTitle>
            <SheetDescription>
              {selectedLiabilityForPayment && `Payment for: ${selectedLiabilityForPayment.description}`}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4 mt-6">
            {/* Category - Locked */}
            <div className="space-y-2">
              <Label htmlFor="payment-category">Category</Label>
              <Input
                id="payment-category"
                value="Liabilities"
                disabled
                className="bg-muted"
              />
            </div>

            {/* Amount - Pre-filled but editable */}
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount ({getCurrencySymbol(organization?.currency || "USD")}) *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
              {selectedLiabilityForPayment && (
                <p className="text-xs text-muted-foreground">
                  Liability balance: {formatCurrency(selectedLiabilityForPayment.balance, organization?.currency || "USD")}
                </p>
              )}
            </div>

            {/* Description - Pre-filled but editable */}
            <div className="space-y-2">
              <Label htmlFor="payment-description">Description</Label>
              <Textarea
                id="payment-description"
                value={paymentFormData.description}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                placeholder="Enter description..."
                rows={3}
              />
            </div>

            {/* Date - Can be changed */}
            <div className="space-y-2">
              <Label htmlFor="payment-date">Date *</Label>
              <DatePicker
                date={paymentFormData.date}
                onSelect={(date) => setPaymentFormData({ ...paymentFormData, date })}
                placeholder="Select date"
              />
            </div>

            {/* Account - Required */}
            <div className="space-y-2">
              <Label htmlFor="payment-account">Account *</Label>
              <Select 
                value={paymentFormData.account} 
                onValueChange={(value) => setPaymentFormData({ ...paymentFormData, account: value })}
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
              {paymentFormData.account && (() => {
                const selectedAccount = accounts.find(a => a.id.toString() === paymentFormData.account)
                return selectedAccount ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Available Balance: {formatCurrency(selectedAccount.balance || 0, organization?.currency || "USD")}
                  </p>
                ) : null
              })()}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Pay
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setPaymentDrawerOpen(false)
                  setSelectedLiabilityForPayment(null)
                  setPaymentFormData({
                    account: "",
                    amount: "",
                    description: "",
                    date: undefined,
                  })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Payment History Drawer */}
      <Sheet 
        open={paymentHistoryOpen} 
        onOpenChange={(open) => {
          setPaymentHistoryOpen(open)
          // When closing, refresh liability data if it was updated
          if (!open && selectedLiabilityForHistory) {
            queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] })
          }
        }}
      >
        <SheetContent className="sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Payment History</SheetTitle>
            <SheetDescription>
              {selectedLiabilityForHistory && `Payments for: ${selectedLiabilityForHistory.description}`}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {selectedLiabilityForHistory && (() => {
              // Get the current liability data from the list (most up-to-date)
              const currentLiability = liabilities.find(l => l.id === selectedLiabilityForHistory.id)
              const displayLiability = currentLiability || selectedLiabilityForHistory
              
              // Calculate remaining balance from payments if available (more accurate)
              const totalPaid = liabilityPayments.reduce((sum, p) => sum + p.amount, 0)
              const calculatedBalance = displayLiability.originalAmount - totalPaid
              const remainingBalance = Math.max(0, calculatedBalance)
              
              return (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Original Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(displayLiability.originalAmount, organization?.currency || "USD")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Remaining Balance</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(remainingBalance, organization?.currency || "USD")}</p>
                    </div>
                  </div>
                </div>
              )
            })()}
            {paymentsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Spinner size="md" />
                <p className="text-sm text-muted-foreground mt-3">Loading payment history...</p>
              </div>
            ) : liabilityPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payments found for this liability.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Account Used</TableHead>
                      <TableHead>Remaining Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liabilityPayments
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((payment, index) => {
                        // Get current liability data for accurate calculation
                        const currentLiability = selectedLiabilityForHistory 
                          ? liabilities.find(l => l.id === selectedLiabilityForHistory.id) || selectedLiabilityForHistory
                          : null
                        
                        if (!currentLiability) {
                          return null
                        }
                        
                        // Calculate remaining balance after this payment
                        // Sum all payments up to and including this one (sorted by date)
                        const sortedPayments = [...liabilityPayments].sort((a, b) => 
                          new Date(a.date).getTime() - new Date(b.date).getTime()
                        )
                        const currentPaymentIndex = sortedPayments.findIndex(p => p.id === payment.id)
                        const paymentsUpToThis = sortedPayments
                          .slice(0, currentPaymentIndex + 1)
                          .reduce((sum, p) => sum + p.amount, 0)
                        
                        const remainingAfterPayment = Math.max(0, currentLiability.originalAmount - paymentsUpToThis)
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell className="font-bold text-green-600">
                              {formatCurrency(payment.amount, organization?.currency || "USD")}
                            </TableCell>
                            <TableCell>{payment.account || "N/A"}</TableCell>
                            <TableCell className="text-red-600">
                              {formatCurrency(remainingAfterPayment, organization?.currency || "USD")}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Liability"
        description={liabilityToDelete ? `Are you sure you want to delete this liability?\n\nCreditor: ${liabilityToDelete.creditor}\nDescription: ${liabilityToDelete.description}\nOriginal Amount: ${getCurrencySymbol(organization?.currency || "USD")}${liabilityToDelete.originalAmount?.toLocaleString() || 0}\n\nThis will also delete all related payment records. This action cannot be undone.` : ""}
        confirmText="Delete"
        isLoading={deleteLiability.isPending}
      />
    </>
  )
}
