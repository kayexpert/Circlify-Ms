"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Search, ChevronDown, Check, Edit } from "lucide-react"
import { useProjects } from "@/hooks/projects"
import { useProjectIncome, useCreateProjectIncome, useUpdateProjectIncome, useDeleteProjectIncome } from "@/hooks/projects"
import { useProjectExpenditure, useCreateProjectExpenditure, useUpdateProjectExpenditure, useDeleteProjectExpenditure } from "@/hooks/projects"
import { useAccounts } from "@/hooks/finance"
import { useMembersByStatus } from "@/hooks/members"
import { useOrganization } from "@/hooks/use-organization"
import { formatCurrency, formatDate, validateAndConvertToUUID, isValidUUID } from "./utils"
import { cn } from "@/lib/utils"

interface ProjectDetailsDrawerProps {
  projectId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectDetailsDrawer({ projectId, isOpen, onOpenChange }: ProjectDetailsDrawerProps) {
  const { organization } = useOrganization()
  const { data: projects = [] } = useProjects()
  const { data: incomeRecords = [] } = useProjectIncome(isOpen ? projectId : null)
  const { data: expenditureRecords = [] } = useProjectExpenditure(isOpen ? projectId : null)
  const { data: accounts = [] } = useAccounts()
  const { data: members = [] } = useMembersByStatus("active")
  
  const createIncome = useCreateProjectIncome()
  const updateIncome = useUpdateProjectIncome()
  const deleteIncome = useDeleteProjectIncome()
  const createExpenditure = useCreateProjectExpenditure()
  const updateExpenditure = useUpdateProjectExpenditure()
  const deleteExpenditure = useDeleteProjectExpenditure()

  const project = projects.find((p) => p.id === projectId)
  const [activeTab, setActiveTab] = useState<"income" | "expenditure">("income")
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [showExpenditureForm, setShowExpenditureForm] = useState(false)
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null)
  const [editingExpenditureId, setEditingExpenditureId] = useState<string | null>(null)

  const [incomeFormData, setIncomeFormData] = useState({
    date: undefined as Date | undefined,
    amount: "",
    member_id: "",
    account_id: "",
    description: "",
  })

  const [expenditureFormData, setExpenditureFormData] = useState({
    date: undefined as Date | undefined,
    amount: "",
    account_id: "",
    description: "",
  })

  // Search states
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [accountSearchQuery, setAccountSearchQuery] = useState("")
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false)
  const [expenditureAccountPopoverOpen, setExpenditureAccountPopoverOpen] = useState(false)
  const [expenditureAccountSearchQuery, setExpenditureAccountSearchQuery] = useState("")

  // Filter members and accounts based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return members
    const query = memberSearchQuery.toLowerCase()
    return members.filter(
      (member: { first_name: string; last_name: string; email?: string | null }) =>
        member.first_name.toLowerCase().includes(query) ||
        member.last_name.toLowerCase().includes(query) ||
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(query) ||
        (member.email || "").toLowerCase().includes(query)
    )
  }, [members, memberSearchQuery])

  const filteredAccounts = useMemo(() => {
    if (!accountSearchQuery) return accounts
    const query = accountSearchQuery.toLowerCase()
    return accounts.filter((account) => account.name.toLowerCase().includes(query))
  }, [accounts, accountSearchQuery])

  const filteredExpenditureAccounts = useMemo(() => {
    if (!expenditureAccountSearchQuery) return accounts
    const query = expenditureAccountSearchQuery.toLowerCase()
    return accounts.filter((account) => account.name.toLowerCase().includes(query))
  }, [accounts, expenditureAccountSearchQuery])

  // Get selected member and account names
  const selectedMember = members.find((m: any) => (m.uuid || m.id) === incomeFormData.member_id)
  const selectedAccount = accounts.find((a: any) => (a.uuid || a.id) === incomeFormData.account_id)
  const selectedExpenditureAccount = accounts.find((a: any) => (a.uuid || a.id) === expenditureFormData.account_id)

  // Calculate totals
  const totals = useMemo(() => {
    const totalIncome = incomeRecords.reduce((sum, record) => sum + Number(record.amount), 0)
    const totalExpenditure = expenditureRecords.reduce((sum, record) => sum + Number(record.amount), 0)
    const budgetVariance = project ? project.estimated_budget - totalIncome : 0

    return {
      totalIncome,
      totalExpenditure,
      budgetVariance,
    }
  }, [incomeRecords, expenditureRecords, project])

  const handleIncomeSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!incomeFormData.date || !incomeFormData.amount || !incomeFormData.account_id) {
      return
    }

    const amount = parseFloat(incomeFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    // Validate account_id using shared utility
    const accountValidation = validateAndConvertToUUID(accounts, incomeFormData.account_id, "account")
    if (accountValidation.error || !accountValidation.uuid) {
      if (accountValidation.error && process.env.NODE_ENV === "development") {
        console.error(accountValidation.error)
      }
      return
    }

    // Validate member_id using shared utility (optional field)
    const memberValidation = validateAndConvertToUUID(
      members,
      incomeFormData.member_id && String(incomeFormData.member_id).trim() !== "" ? String(incomeFormData.member_id) : null,
      "member"
    )
    if (memberValidation.error) {
      if (process.env.NODE_ENV === "development") {
        console.error(memberValidation.error)
      }
      return
    }

    const submitData = {
      projectId,
      date: incomeFormData.date.toISOString().split("T")[0],
      amount: amount,
      member_id: memberValidation.uuid,
      account_id: accountValidation.uuid,
      description: incomeFormData.description && String(incomeFormData.description).trim() !== "" ? String(incomeFormData.description) : null,
    }

    if (editingIncomeId) {
      updateIncome.mutate(
        {
          id: editingIncomeId,
          date: submitData.date,
          amount: submitData.amount,
          member_id: submitData.member_id,
          account_id: submitData.account_id,
          description: submitData.description,
        },
        {
          onSuccess: () => {
            setIncomeFormData({
              date: undefined,
              amount: "",
              member_id: "",
              account_id: "",
              description: "",
            })
            setMemberSearchQuery("")
            setAccountSearchQuery("")
            setMemberPopoverOpen(false)
            setAccountPopoverOpen(false)
            setEditingIncomeId(null)
            setShowIncomeForm(false)
          },
        }
      )
    } else {
      createIncome.mutate(submitData, {
        onSuccess: () => {
          setIncomeFormData({
            date: undefined,
            amount: "",
            member_id: "",
            account_id: "",
            description: "",
          })
          setMemberSearchQuery("")
          setAccountSearchQuery("")
          setMemberPopoverOpen(false)
          setAccountPopoverOpen(false)
          setShowIncomeForm(false)
        },
      })
    }
  }, [incomeFormData, accounts, members, projectId, editingIncomeId, updateIncome, createIncome])

  const handleExpenditureSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!expenditureFormData.date || !expenditureFormData.amount || !expenditureFormData.account_id) {
      return
    }

    const amount = parseFloat(expenditureFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    // Validate account_id using shared utility
    const accountValidation = validateAndConvertToUUID(accounts, expenditureFormData.account_id, "account")
    if (accountValidation.error || !accountValidation.uuid) {
      if (accountValidation.error && process.env.NODE_ENV === "development") {
        console.error(accountValidation.error)
      }
      return
    }

    const submitData = {
      projectId,
      date: expenditureFormData.date.toISOString().split("T")[0],
      amount: amount,
      account_id: accountValidation.uuid,
      description: expenditureFormData.description && String(expenditureFormData.description).trim() !== "" ? String(expenditureFormData.description) : null,
    }

    if (editingExpenditureId) {
      updateExpenditure.mutate(
        {
          id: editingExpenditureId,
          date: submitData.date,
          amount: submitData.amount,
          account_id: submitData.account_id,
          description: submitData.description,
        },
        {
          onSuccess: () => {
            setExpenditureFormData({
              date: undefined,
              amount: "",
              account_id: "",
              description: "",
            })
            setExpenditureAccountPopoverOpen(false)
            setExpenditureAccountSearchQuery("")
            setEditingExpenditureId(null)
            setShowExpenditureForm(false)
          },
        }
      )
    } else {
      createExpenditure.mutate(submitData, {
        onSuccess: () => {
          setExpenditureFormData({
            date: undefined,
            amount: "",
            account_id: "",
            description: "",
          })
          setExpenditureAccountPopoverOpen(false)
          setExpenditureAccountSearchQuery("")
          setShowExpenditureForm(false)
        },
      })
    }
  }, [expenditureFormData, accounts, projectId, editingExpenditureId, updateExpenditure, createExpenditure])

  if (!project) {
    return null
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col h-full max-h-screen">
        <SheetHeader className="flex-shrink-0 pb-4">
          <SheetTitle className="text-2xl">{project.name}</SheetTitle>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Metrics Section */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Budget</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(project.estimated_budget, organization?.currency || "USD")}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">
                      {formatCurrency(totals.totalIncome, organization?.currency || "USD")}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Expenditure</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">
                      {formatCurrency(totals.totalExpenditure, organization?.currency || "USD")}
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Budget Variance */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Budget Variance</p>
                  <p className={`text-xl font-semibold mt-1 ${totals.budgetVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(totals.budgetVariance, organization?.currency || "USD")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals.budgetVariance >= 0 ? "Under budget" : "Over budget"}
                  </p>
                </div>
                <Badge variant={totals.budgetVariance >= 0 ? "default" : "destructive"}>
                  {project.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "income" | "expenditure")}>
            <TabsList className="w-full">
              <TabsTrigger value="income" className="flex-1">Income</TabsTrigger>
              <TabsTrigger value="expenditure" className="flex-1">Expenditure</TabsTrigger>
            </TabsList>

            {/* Income Tab */}
            <TabsContent value="income" className="mt-6 space-y-4">
              {!showIncomeForm ? (
                <Button onClick={() => {
                  setEditingIncomeId(null)
                  setShowIncomeForm(true)
                }} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Income Record
                </Button>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingIncomeId ? "Edit Income Record" : "Add Income Record"}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleIncomeSubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="income_date">Date *</Label>
                          <DatePicker
                            date={incomeFormData.date}
                            onSelect={(date) => setIncomeFormData({ ...incomeFormData, date })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="income_amount">Amount *</Label>
                          <Input
                            id="income_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={incomeFormData.amount}
                            onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="income_member">Member (Optional)</Label>
                          <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={memberPopoverOpen}
                                className="w-full justify-between"
                              >
                                {selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "Select member..."}
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
                                    <>
                                      <div
                                        className={cn(
                                          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                          !incomeFormData.member_id && "bg-accent"
                                        )}
                                        onClick={() => {
                                          setIncomeFormData({ ...incomeFormData, member_id: "" })
                                          setMemberPopoverOpen(false)
                                          setMemberSearchQuery("")
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            !incomeFormData.member_id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span>None</span>
                                      </div>
                                      {filteredMembers.map((member: any) => (
                                        <div
                                          key={member.id}
                                          className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                            incomeFormData.member_id === member.uuid && "bg-accent"
                                          )}
                                          onClick={() => {
                                            // CRITICAL: Always use UUID, never the numeric ID
                                            if (!member.uuid) {
                                              console.error("Member UUID is missing for member:", member)
                                              // Try to get UUID from member.id if it's already a UUID
                                              if (typeof member.id === 'string' && member.id.includes('-')) {
                                                console.warn("Using member.id as UUID (it appears to be a UUID):", member.id)
                                                setIncomeFormData({ ...incomeFormData, member_id: member.id })
                                              } else {
                                                console.error("Cannot proceed: member has no UUID and id is not a UUID")
                                                return
                                              }
                                            } else {
                                              setIncomeFormData({ ...incomeFormData, member_id: member.uuid })
                                            }
                                            setMemberPopoverOpen(false)
                                            setMemberSearchQuery("")
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              incomeFormData.member_id === member.uuid ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <span>{member.first_name} {member.last_name}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="income_account">Account *</Label>
                          <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={accountPopoverOpen}
                                className="w-full justify-between"
                              >
                                {selectedAccount ? selectedAccount.name : "Select account..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search accounts..."
                                  value={accountSearchQuery}
                                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <ScrollArea className="h-[200px]">
                                <div className="p-1">
                                  {filteredAccounts.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                      No accounts found.
                                    </div>
                                  ) : (
                                    filteredAccounts.map((account) => (
                                      <div
                                        key={account.id}
                                        className={cn(
                                          "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                          incomeFormData.account_id === account.uuid && "bg-accent"
                                        )}
                                        onClick={() => {
                                          // CRITICAL: Ensure we always use UUID, never the numeric ID
                                          if (!account.uuid) {
                                            if (process.env.NODE_ENV === "development") {
                                              console.error("Account UUID is missing for account:", account)
                                            }
                                            // Try to get UUID from account.id if it's already a UUID
                                            if (typeof (account as any).id === 'string' && (account as any).id.includes('-')) {
                                              if (process.env.NODE_ENV === "development") {
                                                console.warn("Using account.id as UUID (it appears to be a UUID):", (account as any).id)
                                              }
                                              setIncomeFormData({ ...incomeFormData, account_id: String((account as any).id) })
                                            } else {
                                              if (process.env.NODE_ENV === "development") {
                                                console.error("Cannot proceed: account has no UUID and id is not a UUID")
                                              }
                                              return
                                            }
                                          } else {
                                            setIncomeFormData({ ...incomeFormData, account_id: account.uuid })
                                          }
                                          setAccountPopoverOpen(false)
                                          setAccountSearchQuery("")
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            incomeFormData.account_id === account.uuid ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span>{account.name}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </ScrollArea>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="income_description">Description/Notes</Label>
                        <Textarea
                          id="income_description"
                          value={incomeFormData.description}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, description: e.target.value })}
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={createIncome.isPending}>
                          {createIncome.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Income"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowIncomeForm(false)
                            setEditingIncomeId(null)
                            setIncomeFormData({
                              date: undefined,
                              amount: "",
                              member_id: "",
                              account_id: "",
                              description: "",
                            })
                            setMemberSearchQuery("")
                            setAccountSearchQuery("")
                            setMemberPopoverOpen(false)
                            setAccountPopoverOpen(false)
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Income Table */}
              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No income records yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          incomeRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {formatCurrency(Number(record.amount), organization?.currency || "USD")}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  // First try the joined member data
                                  if (record.members) {
                                    return `${record.members.first_name} ${record.members.last_name}`
                                  }
                                  // Fallback: look up member from members list
                                  if (record.member_id) {
                                    const member = members.find((m: any) => (m.uuid || m.id) === record.member_id)
                                    if (member) {
                                      return `${member.first_name} ${member.last_name}`
                                    }
                                  }
                                  return "N/A"
                                })()}
                              </TableCell>
                              <TableCell>
                                {accounts.find((a: any) => (a.uuid || a.id) === record.account_id)?.name || "N/A"}
                              </TableCell>
                              <TableCell>{record.description || "N/A"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      const recordMember = record.member_id ? members.find((m: any) => (m.uuid || m.id) === record.member_id) : null
                                      const recordAccount = accounts.find((a: any) => (a.uuid || a.id) === record.account_id)
                                      
                                      setEditingIncomeId(record.id)
                                      setIncomeFormData({
                                        date: new Date(record.date),
                                        amount: record.amount.toString(),
                                        member_id: record.member_id || "",
                                        account_id: record.account_id,
                                        description: record.description || "",
                                      })
                                      setShowIncomeForm(true)
                                    }}
                                    disabled={updateIncome.isPending}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteIncome.mutate(record.id)}
                                    disabled={deleteIncome.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expenditure Tab */}
            <TabsContent value="expenditure" className="mt-6 space-y-4">
              {!showExpenditureForm ? (
                <Button onClick={() => setShowExpenditureForm(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expenditure Record
                </Button>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleExpenditureSubmit} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="expenditure_date">Date *</Label>
                          <DatePicker
                            date={expenditureFormData.date}
                            onSelect={(date) => setExpenditureFormData({ ...expenditureFormData, date })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expenditure_amount">Amount *</Label>
                          <Input
                            id="expenditure_amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={expenditureFormData.amount}
                            onChange={(e) => setExpenditureFormData({ ...expenditureFormData, amount: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expenditure_account">Account *</Label>
                        <Popover open={expenditureAccountPopoverOpen} onOpenChange={setExpenditureAccountPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={expenditureAccountPopoverOpen}
                              className="w-full justify-between"
                            >
                              {selectedExpenditureAccount ? selectedExpenditureAccount.name : "Select account..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search accounts..."
                                value={expenditureAccountSearchQuery}
                                onChange={(e) => setExpenditureAccountSearchQuery(e.target.value)}
                                className="h-9"
                              />
                            </div>
                            <ScrollArea className="h-[200px]">
                              <div className="p-1">
                                {filteredExpenditureAccounts.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    No accounts found.
                                  </div>
                                ) : (
                                  filteredExpenditureAccounts.map((account) => (
                                    <div
                                      key={account.id}
                                      className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        expenditureFormData.account_id === account.uuid && "bg-accent"
                                      )}
                                      onClick={() => {
                                        // CRITICAL: Ensure we always use UUID, never the numeric ID
                                        if (!account.uuid) {
                                          if (process.env.NODE_ENV === "development") {
                                            console.error("Account UUID is missing for account:", account)
                                          }
                                          // Try to get UUID from account.id if it's already a UUID
                                          if (typeof (account as any).id === 'string' && (account as any).id.includes('-')) {
                                            if (process.env.NODE_ENV === "development") {
                                              console.warn("Using account.id as UUID (it appears to be a UUID):", (account as any).id)
                                            }
                                            setExpenditureFormData({ ...expenditureFormData, account_id: String((account as any).id) })
                                          } else {
                                            if (process.env.NODE_ENV === "development") {
                                              console.error("Cannot proceed: account has no UUID and id is not a UUID")
                                            }
                                            return
                                          }
                                        } else {
                                          setExpenditureFormData({ ...expenditureFormData, account_id: account.uuid })
                                        }
                                        setExpenditureAccountPopoverOpen(false)
                                        setExpenditureAccountSearchQuery("")
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          expenditureFormData.account_id === account.uuid ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span>{account.name}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expenditure_description">Description/Notes</Label>
                        <Textarea
                          id="expenditure_description"
                          value={expenditureFormData.description}
                          onChange={(e) => setExpenditureFormData({ ...expenditureFormData, description: e.target.value })}
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={createExpenditure.isPending || updateExpenditure.isPending}>
                          {(createExpenditure.isPending || updateExpenditure.isPending) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {editingExpenditureId ? "Updating..." : "Adding..."}
                            </>
                          ) : (
                            editingExpenditureId ? "Update Expenditure" : "Add Expenditure"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowExpenditureForm(false)
                            setEditingExpenditureId(null)
                            setExpenditureFormData({
                              date: undefined,
                              amount: "",
                              account_id: "",
                              description: "",
                            })
                            setExpenditureAccountPopoverOpen(false)
                            setExpenditureAccountSearchQuery("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Expenditure Table */}
              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenditureRecords.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No expenditure records yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenditureRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{formatDate(record.date)}</TableCell>
                              <TableCell className="font-semibold text-red-600">
                                {formatCurrency(Number(record.amount), organization?.currency || "USD")}
                              </TableCell>
                              <TableCell>
                                {accounts.find((a: any) => (a.uuid || a.id) === record.account_id)?.name || "N/A"}
                              </TableCell>
                              <TableCell>{record.description || "N/A"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setEditingExpenditureId(record.id)
                                      setExpenditureFormData({
                                        date: new Date(record.date),
                                        amount: record.amount.toString(),
                                        account_id: record.account_id,
                                        description: record.description || "",
                                      })
                                      setShowExpenditureForm(true)
                                    }}
                                    disabled={updateExpenditure.isPending}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => deleteExpenditure.mutate(record.id)}
                                    disabled={deleteExpenditure.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

