"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Users, UserPlus, UserMinus, ChevronDown } from "lucide-react"
import { useMembers } from "@/hooks/members/useMembers"
import { useGroups } from "@/hooks/members/useGroups"
import { useDepartments } from "@/hooks/members/useDepartments"
import type { PeriodType, DateRange } from "./types"
import { getDateRangeForPeriod, formatDate, formatNumber, getAgeGroup, generateCSV, downloadCSV } from "./utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import type { Member, Group, Department } from "@/app/(dashboard)/dashboard/members/types"

type MemberReportType = "all-members" | "groups" | "departments"

export default function MemberReportsContent() {
  const [reportType, setReportType] = useState<MemberReportType>("all-members")
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Fetch data
  const { data: members = [] } = useMembers()
  const { data: groups = [] } = useGroups()
  const { data: departments = [] } = useDepartments()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter members based on report type and selections
  const filteredMembers = useMemo(() => {
    let filtered = [...members]

    // Filter by report type
    if (reportType === "groups" && selectedGroups.length > 0) {
      filtered = filtered.filter((member: Member) => {
        return member.groups && member.groups.some((group) => selectedGroups.includes(group))
      })
    } else if (reportType === "departments" && selectedDepartments.length > 0) {
      filtered = filtered.filter((member: Member) => {
        return member.departments && member.departments.some((dept) => selectedDepartments.includes(dept))
      })
    }

    // Filter by gender
    if (genderFilter !== "all") {
      filtered = filtered.filter((member: Member) => {
        const gender = member.gender?.toLowerCase() || ""
        return genderFilter === "male" ? gender === "male" || gender === "m" : gender === "female" || gender === "f"
      })
    }

    return filtered
  }, [members, reportType, selectedGroups, selectedDepartments, genderFilter])

  // Calculate summary
  const summary = useMemo(() => {
    const totalMembers = filteredMembers.length
    const activeMembers = filteredMembers.filter((m: Member) => m.membership_status === "active").length
    const inactiveMembers = filteredMembers.filter((m: Member) => m.membership_status === "inactive").length

    // Gender distribution
    const maleCount = filteredMembers.filter((m: Member) => {
      const gender = m.gender?.toLowerCase() || ""
      return gender === "male" || gender === "m"
    }).length
    const femaleCount = filteredMembers.filter((m: Member) => {
      const gender = m.gender?.toLowerCase() || ""
      return gender === "female" || gender === "f"
    }).length

    // Groups and departments count
    const uniqueGroups = new Set<string>()
    const uniqueDepartments = new Set<string>()
    filteredMembers.forEach((member: Member) => {
      if (member.groups) {
        member.groups.forEach((group) => uniqueGroups.add(group))
      }
      if (member.departments) {
        member.departments.forEach((dept) => uniqueDepartments.add(dept))
      }
    })

    // Age distribution
    const ageGroupMap = new Map<string, number>()
    filteredMembers.forEach((member: Member) => {
      const ageGroup = getAgeGroup(member.date_of_birth)
      ageGroupMap.set(ageGroup, (ageGroupMap.get(ageGroup) || 0) + 1)
    })
    const ageDistribution = Array.from(ageGroupMap.entries())
      .map(([ageGroup, count]) => ({ ageGroup, count }))
      .sort((a, b) => {
        // Sort age groups logically
        const order = ["0-12", "13-17", "18-25", "26-35", "36-50", "51-65", "65+"]
        return order.indexOf(a.ageGroup) - order.indexOf(b.ageGroup)
      })

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      maleCount,
      femaleCount,
      groupsCount: uniqueGroups.size,
      departmentsCount: uniqueDepartments.size,
      ageDistribution,
    }
  }, [filteredMembers])

  // Paginate members
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredMembers.slice(start, end)
  }, [filteredMembers, currentPage])

  const totalPages = Math.ceil(filteredMembers.length / pageSize)

  // Handle Generate Report
  const handleGenerateReport = () => {
    setReportGenerated(true)
    setCurrentPage(1) // Reset to first page
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Gender", "Age Group", "Groups", "Departments"]
    const rows: (string | number)[][] = []

    filteredMembers.forEach((member: Member) => {
      rows.push([
        member.first_name || "",
        member.last_name || "",
        member.email || "",
        member.phone_number || "",
        member.membership_status || "",
        member.gender || "Unknown",
        getAgeGroup(member.date_of_birth),
        (member.groups || []).join("; "),
        (member.departments || []).join("; "),
      ])
    })

    const csv = generateCSV(headers, rows)
    const reportTitle = reportType === "all-members" ? "all-members" : reportType === "groups" ? "groups" : "departments"
    downloadCSV(csv, `member-report-${reportTitle}-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
  }

  // Multi-select component for groups/departments
  const MultiSelect = ({
    options,
    selected,
    onSelectionChange,
    placeholder,
    label,
  }: {
    options: { value: string; label: string }[]
    selected: string[]
    onSelectionChange: (selected: string[]) => void
    placeholder: string
    label: string
  }) => {
    const [open, setOpen] = useState(false)

    const handleToggle = (value: string) => {
      if (selected.includes(value)) {
        onSelectionChange(selected.filter((s) => s !== value))
      } else {
        onSelectionChange([...selected, value])
      }
    }

    return (
      <div>
        <label className="text-sm font-medium mb-2 block">{label}</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between">
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto p-2">
              {options.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No options available</div>
              ) : (
                options.map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => handleToggle(option.value)}
                  >
                    <Checkbox
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => {}}
                    />
                    <span className="text-sm flex-1">{option.label}</span>
                  </div>
                ))
              )}
            </div>
            {selected.length > 0 && (
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => onSelectionChange([])}>
                  Clear all
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selected.slice(0, 3).map((value) => {
              const option = options.find((o) => o.value === value)
              return (
                <Badge key={value} variant="secondary" className="text-xs">
                  {option?.label || value}
                </Badge>
              )
            })}
            {selected.length > 3 && <Badge variant="secondary" className="text-xs">+{selected.length - 3} more</Badge>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Report Form Section - Left Side (3 columns) */}
      <div className="col-span-12 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Configure and generate your member report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select
                  value={reportType}
                  onValueChange={(v) => {
                    setReportType(v as MemberReportType)
                    setReportGenerated(false)
                    setSelectedGroups([])
                    setSelectedDepartments([])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-members">All Members</SelectItem>
                    <SelectItem value="groups">Groups</SelectItem>
                    <SelectItem value="departments">Departments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "groups" && (
                <MultiSelect
                  options={groups.map((g: Group) => ({ value: g.name, label: g.name }))}
                  selected={selectedGroups}
                  onSelectionChange={(selected) => {
                    setSelectedGroups(selected)
                    setReportGenerated(false)
                  }}
                  placeholder="Select groups"
                  label="Select Groups"
                />
              )}

              {reportType === "departments" && (
                <MultiSelect
                  options={departments.map((d: Department) => ({ value: d.name, label: d.name }))}
                  selected={selectedDepartments}
                  onSelectionChange={(selected) => {
                    setSelectedDepartments(selected)
                    setReportGenerated(false)
                  }}
                  placeholder="Select departments"
                  label="Select Departments"
                />
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <Select
                  value={period}
                  onValueChange={(v) => {
                    setPeriod(v as PeriodType)
                    setReportGenerated(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === "custom" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <DatePicker
                      date={customRange?.startDate}
                      onSelect={(date) => {
                        setCustomRange((prev) => ({ ...prev, startDate: date || new Date(), endDate: prev?.endDate || new Date() }))
                        setReportGenerated(false)
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <DatePicker
                      date={customRange?.endDate}
                      onSelect={(date) => {
                        setCustomRange((prev) => ({ ...prev, startDate: prev?.startDate || new Date(), endDate: date || new Date() }))
                        setReportGenerated(false)
                      }}
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button onClick={handleGenerateReport} className="w-full">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Display Section - Right Side (9 columns) */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        {reportGenerated ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {reportType === "all-members"
                    ? "All Members Report"
                    : reportType === "groups"
                    ? "Groups Report"
                    : "Departments Report"}
                </CardTitle>
                <CardDescription>
                  Period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                </CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Total Members Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                    <Users className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(summary.totalMembers)}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserPlus className="h-3 w-3 text-green-600" />
                        {summary.activeMembers} active
                      </span>
                      <span className="flex items-center gap-1">
                        <UserMinus className="h-3 w-3 text-red-600" />
                        {summary.inactiveMembers} inactive
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Gender Distribution Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
                    <Users className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(summary.maleCount + summary.femaleCount)}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Male: {summary.maleCount}</span>
                      <span>Female: {summary.femaleCount}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Groups & Departments Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Groups & Departments</CardTitle>
                    <Users className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(summary.groupsCount + summary.departmentsCount)}</div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Groups: {summary.groupsCount}</span>
                      <span>Departments: {summary.departmentsCount}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Age Distribution Graph */}
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                  <CardDescription>Distribution of members by age groups</CardDescription>
                </CardHeader>
                <CardContent>
                  {summary.ageDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={summary.ageDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ageGroup" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      <p>No age data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Members Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Members List</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={genderFilter} onValueChange={(v) => { setGenderFilter(v as typeof genderFilter); setCurrentPage(1) }}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {paginatedMembers.length > 0 ? (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Photo</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Primary Contact</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedMembers.map((member: Member) => (
                              <TableRow key={member.id}>
                                <TableCell>
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={member.photo} alt={`${member.first_name} ${member.last_name}`} />
                                    <AvatarFallback>
                                      {member.first_name?.[0]?.toUpperCase()}
                                      {member.last_name?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {member.first_name} {member.last_name}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {member.email && <div className="text-sm">{member.email}</div>}
                                    {member.phone_number && <div className="text-sm text-muted-foreground">{member.phone_number}</div>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {totalPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredMembers.length}
                            pageSize={pageSize}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <p>No members found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Member Report</CardTitle>
              <CardDescription>Select report type and duration, then click Generate Report to view your member report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No report generated yet</p>
                  <p className="text-sm mt-2">Use the form on the left to generate a report</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
