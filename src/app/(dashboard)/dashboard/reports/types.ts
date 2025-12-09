// Reports Module Types

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface FinancialSummary {
  totalIncome: number
  totalExpenditure: number
  netBalance: number
  incomeByCategory: { category: string; amount: number }[]
  expenditureByCategory: { category: string; amount: number }[]
  incomeByMonth: { month: string; amount: number }[]
  expenditureByMonth: { month: string; amount: number }[]
  topIncomeSources: { source: string; amount: number }[]
  topExpenditureCategories: { category: string; amount: number }[]
}

export interface MemberSummary {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  visitors: number
  newMembersThisPeriod: number
  membersByGender: { gender: string; count: number }[]
  membersByStatus: { status: string; count: number }[]
  membersByAgeGroup: { ageGroup: string; count: number }[]
  membersByGroup: { group: string; count: number }[]
  membersByDepartment: { department: string; count: number }[]
}

export interface AttendanceSummary {
  totalAttendance: number
  averageAttendance: number
  attendanceByService: { serviceType: string; total: number; average: number }[]
  attendanceByMonth: { month: string; total: number; men: number; women: number; children: number }[]
  attendanceTrend: { date: string; total: number }[]
  peakAttendance: { date: string; total: number }
  firstTimers: number
}

export interface AssetSummary {
  totalAssets: number
  totalAssetValue: number
  assetsByCategory: { category: string; count: number; value: number }[]
  assetsByStatus: { status: string; count: number; value: number }[]
  assetsByCondition: { condition: string; count: number }[]
  disposalsThisPeriod: number
  disposalValue: number
  averageAssetValue: number
}

export interface ComprehensiveReport {
  period: string
  financial: FinancialSummary
  members: MemberSummary
  attendance: AttendanceSummary
  assets: AssetSummary
  keyMetrics: {
    memberGrowthRate: number
    attendanceGrowthRate: number
    financialHealth: "Excellent" | "Good" | "Fair" | "Poor"
    assetUtilization: number
  }
}

export type ReportType = "financial" | "members" | "attendance" | "assets" | "comprehensive"
export type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom"
