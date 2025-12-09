"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Budget } from "./types"

interface BudgetingContentProps {
  budgets: Budget[]
  setBudgets: React.Dispatch<React.SetStateAction<Budget[]>>
  onEdit: (budget: Budget) => void
}

export default function BudgetingContent({ budgets, setBudgets, onEdit }: BudgetingContentProps) {
  const handleDelete = (id: number) => {
    setBudgets(budgets.filter(b => b.id !== id))
    toast.success("Budget deleted successfully")
  }

  const totalBudget = budgets.reduce((sum, b) => sum + (b.budgeted || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0)
  const remaining = totalBudget - totalSpent

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Budget Overview</CardTitle>
          <Button onClick={() => onEdit({} as Budget)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Budget
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">GH₵{totalBudget.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-orange-600">GH₵{totalSpent.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-green-600">GH₵{remaining.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Budgeted</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No budgets found. Click "Add Budget" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...budgets].sort((a, b) => b.id - a.id).map((budget) => {
                      const percentage = ((budget.spent || 0) / (budget.budgeted || 1)) * 100
                      const remaining = (budget.budgeted || 0) - (budget.spent || 0)
                      return (
                        <TableRow key={budget.id}>
                          <TableCell className="font-medium">{budget.category}</TableCell>
                          <TableCell>{budget.period}</TableCell>
                          <TableCell>GH₵{budget.budgeted?.toLocaleString() || 0}</TableCell>
                          <TableCell className="text-orange-600">GH₵{budget.spent?.toLocaleString() || 0}</TableCell>
                          <TableCell className={remaining >= 0 ? "text-green-600" : "text-red-600"}>
                            GH₵{remaining.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${percentage > 100 ? "bg-red-500" : percentage > 80 ? "bg-orange-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{percentage.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => onEdit(budget)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(budget.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
