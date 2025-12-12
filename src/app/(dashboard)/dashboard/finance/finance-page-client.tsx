"use client"

import React, { useState, lazy, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { CompactLoader } from "@/components/ui/loader"

// Lazy load tab components - only load when needed
const OverviewContent = lazy(() => import("./OverviewContent").then(m => ({ default: m.default })))
const IncomeContent = lazy(() => import("./IncomeContent").then(m => ({ default: m.default })))
const ExpenditureContent = lazy(() => import("./ExpenditureContent").then(m => ({ default: m.default })))
const AccountsContent = lazy(() => import("./AccountsContent").then(m => ({ default: m.default })))
const ReconciliationContent = lazy(() => import("./ReconciliationContent").then(m => ({ default: m.default })))
const LiabilitiesContent = lazy(() => import("./LiabilitiesContent").then(m => ({ default: m.default })))
const CategoriesContent = lazy(() => import("./CategoriesContent").then(m => ({ default: m.default })))
const FinanceFormSheet = lazy(() => import("./FinanceFormSheet").then(m => ({ default: m.default })))

// Dummy data
const dummyIncomeRecords = [
  { id: 1, date: new Date("2024-01-15"), source: "Tithes", category: "Regular", amount: 12500, method: "Cash", reference: "INC-001" },
  { id: 2, date: new Date("2024-01-20"), source: "Offerings", category: "Regular", amount: 8500, method: "Mobile Money", reference: "INC-002" },
  { id: 3, date: new Date("2024-01-25"), source: "Donations", category: "Special", amount: 15000, method: "Bank Transfer", reference: "INC-003" },
  { id: 4, date: new Date("2024-02-01"), source: "Tithes", category: "Regular", amount: 13200, method: "Cash", reference: "INC-004" },
  { id: 5, date: new Date("2024-02-05"), source: "Offerings", category: "Regular", amount: 9200, method: "Mobile Money", reference: "INC-005" },
]

const dummyExpenditureRecords = [
  { id: 1, date: new Date("2024-01-10"), description: "Electricity Bill", category: "Utilities", amount: 2500, method: "Main Account", reference: "EXP-001" },
  { id: 2, date: new Date("2024-01-15"), description: "Pastor Salary", category: "Salaries", amount: 5000, method: "Main Account", reference: "EXP-002" },
  { id: 3, date: new Date("2024-01-20"), description: "Sound System Repair", category: "Equipment", amount: 1200, method: "Main Account", reference: "EXP-003" },
  { id: 4, date: new Date("2024-02-01"), description: "Water Bill", category: "Utilities", amount: 800, method: "Savings Account", reference: "EXP-004" },
]


const dummyAccounts = [
  { 
    id: 1, 
    name: "Main Account", 
    accountType: "Bank" as const,
    bankName: "ABC Bank",
    accountNumber: "1234567890",
    bankAccountType: "Current Account" as const,
    balance: 125000, 
    createdAt: new Date("2024-01-01")
  },
  { 
    id: 2, 
    name: "Savings Account", 
    accountType: "Bank" as const,
    bankName: "XYZ Bank",
    accountNumber: "0987654321",
    bankAccountType: "Savings" as const,
    balance: 50000, 
    createdAt: new Date("2024-01-01")
  },
]

const dummyLiabilities = [
  { 
    id: 1, 
    date: new Date("2024-01-01"), 
    category: "Loans", 
    description: "Building Loan", 
    creditor: "ABC Bank", 
    originalAmount: 500000, 
    amountPaid: 150000, 
    balance: 350000,
    status: "Partially Paid",
    createdAt: new Date("2024-01-01")
  },
  { 
    id: 2, 
    date: new Date("2024-01-15"), 
    category: "Equipment", 
    description: "Equipment Financing", 
    creditor: "XYZ Finance", 
    originalAmount: 25000, 
    amountPaid: 10000, 
    balance: 15000,
    status: "Partially Paid",
    createdAt: new Date("2024-01-15")
  },
]

// Dummy income categories
const dummyIncomeCategories = [
  { id: 1, name: "Tithes", description: "Regular tithes from members", type: "income" as const, trackMembers: true, createdAt: new Date() },
  { id: 2, name: "Offerings", description: "Sunday and special offerings", type: "income" as const, trackMembers: true, createdAt: new Date() },
  { id: 3, name: "Donations", description: "General donations", type: "income" as const, trackMembers: false, createdAt: new Date() },
  { id: 4, name: "Special Collections", description: "Special fundraising collections", type: "income" as const, trackMembers: false, createdAt: new Date() },
  { id: 5, name: "Fundraising", description: "Fundraising events", type: "income" as const, trackMembers: false, createdAt: new Date() },
]

// Dummy members
const dummyMembers = [
  { id: 1, first_name: "Kwame", last_name: "Mensah", email: "kwame.mensah@example.com", phone_number: "+233 24 123 4567", membership_status: "active" },
  { id: 2, first_name: "Ama", last_name: "Asante", email: "ama.asante@example.com", phone_number: "+233 24 234 5678", membership_status: "active" },
  { id: 3, first_name: "Kofi", last_name: "Owusu", email: "kofi.owusu@example.com", phone_number: "+233 24 345 6789", membership_status: "active" },
  { id: 4, first_name: "John", last_name: "Doe", email: "john.doe@example.com", phone_number: "+233 24 567 8901", membership_status: "active" },
  { id: 5, first_name: "Mary", last_name: "Smith", email: "mary.smith@example.com", phone_number: "+233 24 678 9012", membership_status: "active" },
]

export function FinancePageClient() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [sheetType, setSheetType] = useState<"income" | "expenditure" | "account" | "liability">("income")
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  // Note: Income records are now managed by IncomeContent component using database hooks
  // This file uses dummy data for legacy compatibility
  const [incomeRecords, setIncomeRecords] = useState(dummyIncomeRecords)
  const [expenditureRecords, setExpenditureRecords] = useState(dummyExpenditureRecords)
  const [accounts, setAccounts] = useState(dummyAccounts)
  const [liabilities, setLiabilities] = useState(dummyLiabilities)
  const [incomeCategories, setIncomeCategories] = useState(dummyIncomeCategories)
  const [members] = useState(dummyMembers)

  const [formData, setFormData] = useState({
    date: undefined as Date | undefined,
    source: "",
    category: "",
    amount: "",
    method: "",
    reference: "",
      description: "",
      status: "Pending",
      budgeted: "",
      period: "",
      accountName: "",
    bank: "",
    accountNumber: "",
    balance: "",
    accountType: "Checking",
    creditor: "",
    totalAmount: "",
    paidAmount: "",
    dueDate: undefined as Date | undefined,
    liabilityStatus: "Active",
  })


  const resetForm = () => {
    setFormData({
      date: undefined,
      source: "",
      category: "",
      amount: "",
      method: "",
      reference: "",
      description: "",
      status: "Pending",
      budgeted: "",
      period: "",
      accountName: "",
      bank: "",
      accountNumber: "",
      balance: "",
      accountType: "Checking",
      creditor: "",
      totalAmount: "",
      paidAmount: "",
      dueDate: undefined,
      liabilityStatus: "Active",
    })
    setSelectedRecord(null)
  }

  const handleEditIncome = (record: any) => {
    if (record && record.id) {
      setSelectedRecord(record)
      setFormData({
        ...formData,
        date: record.date,
        source: record.source,
        category: record.category,
        amount: record.amount.toString(),
        method: record.method,
        reference: record.reference,
      })
    } else {
      resetForm()
    }
    setSheetType("income")
    setIsSheetOpen(true)
  }

  const handleEditExpenditure = (record: any) => {
    if (record && record.id) {
      setSelectedRecord(record)
      setFormData({
        ...formData,
        date: record.date,
        description: record.description,
        category: record.category,
        amount: record.amount.toString(),
        method: record.method,
        reference: record.reference,
        status: record.status,
      })
    } else {
      resetForm()
    }
    setSheetType("expenditure")
    setIsSheetOpen(true)
  }


  const handleEditAccount = (account: any) => {
    if (account && account.id) {
      setSelectedRecord(account)
      setFormData({
        ...formData,
        accountName: account.name,
        bank: account.bank,
        accountNumber: account.accountNumber,
        balance: account.balance.toString(),
        accountType: account.type,
      })
    } else {
      resetForm()
    }
    setSheetType("account")
    setIsSheetOpen(true)
  }

  const handleEditLiability = (liability: any) => {
    if (liability && liability.id) {
      setSelectedRecord(liability)
      setFormData({
        ...formData,
        description: liability.description,
        creditor: liability.creditor,
        totalAmount: liability.amount.toString(),
        paidAmount: liability.paid.toString(),
        dueDate: liability.dueDate,
        liabilityStatus: liability.status,
      })
    } else {
      resetForm()
    }
    setSheetType("liability")
    setIsSheetOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (sheetType === "income") {
      const newRecord = {
        id: selectedRecord ? selectedRecord.id : incomeRecords.length + 1,
        date: formData.date || new Date(),
        source: formData.source,
        category: formData.category,
        amount: parseFloat(formData.amount),
        method: formData.method,
        reference: formData.reference,
      }
      
      if (selectedRecord) {
        setIncomeRecords(incomeRecords.map(r => r.id === selectedRecord.id ? newRecord : r))
        toast.success("Income record updated successfully")
      } else {
        setIncomeRecords([...incomeRecords, newRecord])
        toast.success("Income record added successfully")
      }
    } else if (sheetType === "expenditure") {
      const newRecord = {
        id: selectedRecord ? selectedRecord.id : expenditureRecords.length + 1,
        date: formData.date || new Date(),
        description: formData.description,
        category: formData.category,
        amount: parseFloat(formData.amount),
        method: formData.method,
        reference: formData.reference,
        status: formData.status,
      }
      
      if (selectedRecord) {
        setExpenditureRecords(expenditureRecords.map(r => r.id === selectedRecord.id ? newRecord : r))
        toast.success("Expenditure record updated successfully")
      } else {
        setExpenditureRecords([...expenditureRecords, newRecord])
        toast.success("Expenditure record added successfully")
      }
    } else if (sheetType === "account") {
      const newRecord = {
        id: selectedRecord ? selectedRecord.id : accounts.length + 1,
        name: formData.accountName,
        accountType: formData.accountType as "Cash" | "Bank" | "Mobile Money",
        bankName: formData.bank,
        accountNumber: formData.accountNumber,
        bankAccountType: "Current Account" as const,
        balance: parseFloat(formData.balance),
        createdAt: selectedRecord ? selectedRecord.createdAt : new Date(),
      }
      
      if (selectedRecord) {
        setAccounts(accounts.map(a => a.id === selectedRecord.id ? newRecord : a) as typeof accounts)
        toast.success("Account updated successfully")
      } else {
        setAccounts([...accounts, newRecord] as typeof accounts)
        toast.success("Account added successfully")
      }
    } else if (sheetType === "liability") {
      const originalAmount = parseFloat(formData.totalAmount)
      const amountPaid = parseFloat(formData.paidAmount || "0")
      const balance = originalAmount - amountPaid
      
      // Calculate status
      let status = "Not Paid"
      if (balance === 0) {
        status = "Paid"
      } else if (balance > 0 && balance < originalAmount) {
        status = "Partially Paid"
      }
      
      const newRecord = {
        id: selectedRecord ? selectedRecord.id : liabilities.length > 0 ? Math.max(...liabilities.map(l => l.id)) + 1 : 1,
        date: formData.date || new Date(),
        category: formData.category,
        description: formData.description,
        creditor: formData.creditor,
        originalAmount: originalAmount,
        amountPaid: amountPaid,
        balance: balance,
        status: status,
        createdAt: selectedRecord ? selectedRecord.createdAt : new Date(),
      }
      
      if (selectedRecord) {
        setLiabilities(liabilities.map(l => l.id === selectedRecord.id ? newRecord : l))
        toast.success("Liability updated successfully")
      } else {
        setLiabilities([newRecord, ...liabilities])
        toast.success("Liability added successfully")
      }
    }
    
    setIsSheetOpen(false)
    resetForm()
  }

  return (
    <div className="space-y-6">

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenditure">Expenditure</TabsTrigger>
          <TabsTrigger value="liabilities">Liabilities</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <OverviewContent />
          </Suspense>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <IncomeContent />
          </Suspense>
        </TabsContent>

        {/* Expenditure Tab */}
        <TabsContent value="expenditure" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <ExpenditureContent />
          </Suspense>
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="liabilities" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <LiabilitiesContent />
          </Suspense>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <AccountsContent />
          </Suspense>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <ReconciliationContent />
          </Suspense>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <CategoriesContent />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Finance Forms Sheet */}
      {isSheetOpen && (
        <Suspense fallback={null}>
          <FinanceFormSheet
            isOpen={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            sheetType={sheetType}
            formData={formData}
            setFormData={setFormData}
            selectedRecord={selectedRecord}
            onSubmit={handleSubmit}
          />
        </Suspense>
      )}
    </div>
  )
}
