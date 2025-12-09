"use client"

import { useState, useEffect } from "react"

export interface IncomeRecord {
  id: number
  date: Date
  source: string
  category: string
  amount: number
  method: string
  reference: string
  memberId?: number
  memberName?: string
  linkedAssetId?: number // For tracking asset disposal income records
}

const STORAGE_KEY = "incomeRecords"

// Helper to convert date strings back to Date objects
function parseIncomeRecords(data: any[]): IncomeRecord[] {
  return data.map((record) => ({
    ...record,
    date: new Date(record.date),
  }))
}

export function useIncomeRecords() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setIncomeRecords(parseIncomeRecords(parsed))
        } catch (error) {
          console.error("Error parsing income records from localStorage:", error)
        }
      }
    }
  }, [])

  // Save to localStorage whenever incomeRecords changes
  useEffect(() => {
    if (typeof window !== "undefined" && incomeRecords.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(incomeRecords))
    }
  }, [incomeRecords])

  return { incomeRecords, setIncomeRecords }
}
