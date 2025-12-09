"use client"

import React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"

interface FormData {
  date: Date | undefined
  source: string
  category: string
  amount: string
  method: string
  reference: string
  description: string
  status: string
  budgeted: string
  period: string
  accountName: string
  bank: string
  accountNumber: string
  balance: string
  accountType: string
  creditor: string
  totalAmount: string
  paidAmount: string
  dueDate: Date | undefined
  liabilityStatus: string
}

interface FinanceFormSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  sheetType: "income" | "expenditure" | "budget" | "account" | "liability"
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  selectedRecord: any
  onSubmit: (e: React.FormEvent) => void
}

export default function FinanceFormSheet({
  isOpen,
  onOpenChange,
  sheetType,
  formData,
  setFormData,
  selectedRecord,
  onSubmit
}: FinanceFormSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold">
            {selectedRecord ? "Edit" : "Add"} {
              sheetType === "income" ? "Income" : 
              sheetType === "expenditure" ? "Expenditure" : 
              sheetType === "budget" ? "Budget" : 
              sheetType === "account" ? "Account" : 
              "Liability"
            }
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)]">
          <form onSubmit={onSubmit} className="space-y-4 px-2">
            {/* Income Form */}
            {sheetType === "income" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <DatePicker
                    date={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date })}
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source *</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Tithes, Offerings, Donations"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Project">Project</SelectItem>
                      <SelectItem value="Special">Special</SelectItem>
                      <SelectItem value="Missions">Missions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method *</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., INC-001"
                  />
                </div>
              </>
            )}

            {/* Expenditure Form */}
            {sheetType === "expenditure" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <DatePicker
                    date={formData.date}
                    onSelect={(date) => setFormData({ ...formData, date })}
                    placeholder="Select date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Electricity Bill"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Salaries">Salaries</SelectItem>
                      <SelectItem value="Equipment">Equipment</SelectItem>
                      <SelectItem value="Administrative">Administrative</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Outreach">Outreach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method *</Label>
                  <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., EXP-001"
                  />
                </div>
              </>
            )}

            {/* Budget Form */}
            {sheetType === "budget" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Utilities, Salaries"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgeted">Budgeted Amount (GH₵) *</Label>
                  <Input
                    id="budgeted"
                    type="number"
                    step="0.01"
                    value={formData.budgeted}
                    onChange={(e) => setFormData({ ...formData, budgeted: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Input
                    id="period"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    placeholder="e.g., January 2024"
                    required
                  />
                </div>
              </>
            )}

            {/* Account Form */}
            {sheetType === "account" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name *</Label>
                  <Input
                    id="accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="e.g., Main Account"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank *</Label>
                  <Input
                    id="bank"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    placeholder="e.g., ABC Bank"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g., 1234567890"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Balance (GH₵) *</Label>
                  <Input
                    id="balance"
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountType">Account Type *</Label>
                  <Select value={formData.accountType} onValueChange={(value) => setFormData({ ...formData, accountType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checking">Checking</SelectItem>
                      <SelectItem value="Savings">Savings</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Liability Form */}
            {sheetType === "liability" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Church Building Loan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditor">Creditor *</Label>
                  <Input
                    id="creditor"
                    value={formData.creditor}
                    onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                    placeholder="e.g., ABC Bank"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount (GH₵) *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Paid Amount (GH₵)</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <DatePicker
                    date={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    placeholder="Select due date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="liabilityStatus">Status *</Label>
                  <Select value={formData.liabilityStatus} onValueChange={(value) => setFormData({ ...formData, liabilityStatus: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Paid Off">Paid Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {selectedRecord ? "Update" : "Add"} {
                  sheetType === "income" ? "Income" : 
                  sheetType === "expenditure" ? "Expenditure" : 
                  sheetType === "budget" ? "Budget" : 
                  sheetType === "account" ? "Account" : 
                  "Liability"
                }
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
