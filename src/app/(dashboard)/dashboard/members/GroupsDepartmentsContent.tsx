"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Plus, Search, Edit, Trash2,
  Building2, Network, Loader2, Users, ChevronDown, Check
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/members"
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/members"
import { useRolesPositions, useCreateRolePosition, useUpdateRolePosition, useDeleteRolePosition } from "@/hooks/members"
import { useMembers } from "@/hooks/members/useMembers"
import type { Group, Department, RolePosition } from "./types"
import { cn } from "@/lib/utils"

export default function GroupsDepartmentsContent() {
  // Fetch data using hooks
  const { data: groups = [], isLoading: groupsLoading } = useGroups()
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  const { data: rolesPositions = [], isLoading: rolesPositionsLoading } = useRolesPositions()
  const { data: members = [] } = useMembers()

  // Mutations
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()
  const createRolePosition = useCreateRolePosition()
  const updateRolePosition = useUpdateRolePosition()
  const deleteRolePosition = useDeleteRolePosition()

  const isLoading = groupsLoading || departmentsLoading || rolesPositionsLoading

  const [activeTab, setActiveTab] = useState("groups")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<Group | Department | RolePosition | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("")
  const [leaderOpen, setLeaderOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader: "",
    status: "Active",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      leader: "",
      status: "Active",
    })
    setSelectedRecord(null)
    setLeaderSearchQuery("")
    setLeaderOpen(false)
  }

  const handleEdit = (record: Group | Department | RolePosition, type: "group" | "department" | "role") => {
    setSelectedRecord(record)
    setEditingId(record.id)
    setFormData({
      name: record.name || "",
      description: record.description || "",
      leader: "leader" in record ? record.leader || "" : "",
      status: record.status || "Active",
    })
  }

  const handleDelete = async (id: string, type: "group" | "department" | "role") => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
      return
    }

    try {
      if (type === "group") {
        await deleteGroup.mutateAsync(id)
      } else if (type === "department") {
        await deleteDepartment.mutateAsync(id)
      } else {
        await deleteRolePosition.mutateAsync(id)
      }
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error(`Error deleting ${type}:`, error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    try {
      if (selectedRecord && editingId) {
        // Update existing
        if (activeTab === "groups") {
          await updateGroup.mutateAsync({
            id: selectedRecord.id,
            name: formData.name,
            description: formData.description || undefined,
            leader: formData.leader || undefined,
            status: formData.status as "Active" | "Inactive",
          })
        } else if (activeTab === "departments") {
          await updateDepartment.mutateAsync({
            id: selectedRecord.id,
            name: formData.name,
            description: formData.description || undefined,
            leader: formData.leader || undefined,
            status: formData.status as "Active" | "Inactive",
          })
        } else {
          await updateRolePosition.mutateAsync({
            id: selectedRecord.id,
            name: formData.name,
            description: formData.description || undefined,
            status: formData.status as "Active" | "Inactive",
          })
        }
      } else {
        // Create new
        if (activeTab === "groups") {
          await createGroup.mutateAsync({
            name: formData.name,
            description: formData.description || "",
            leader: formData.leader || "",
            status: formData.status as "Active" | "Inactive",
          })
        } else if (activeTab === "departments") {
          await createDepartment.mutateAsync({
            name: formData.name,
            description: formData.description || "",
            leader: formData.leader || "",
            status: formData.status as "Active" | "Inactive",
          })
        } else {
          await createRolePosition.mutateAsync({
            name: formData.name,
            description: formData.description || "",
            status: formData.status as "Active" | "Inactive",
          })
        }
      }

      resetForm()
      setEditingId(null)
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error(`Error submitting ${activeTab}:`, error)
    }
  }

  const filteredGroups = useMemo(() => {
    return groups.filter((group) =>
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [groups, searchQuery])

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) =>
      department.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      department.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [departments, searchQuery])

  const filteredRolesPositions = useMemo(() => {
    return rolesPositions.filter((role) =>
      role.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [rolesPositions, searchQuery])

  // Filter members for leader search
  const filteredMembers = useMemo(() => {
    if (!leaderSearchQuery.trim()) return members
    const query = leaderSearchQuery.toLowerCase()
    return members.filter((member: any) =>
      member.first_name?.toLowerCase().includes(query) ||
      member.last_name?.toLowerCase().includes(query) ||
      `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(query)
    )
  }, [members, leaderSearchQuery])

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value)
        setLeaderOpen(false)
        setLeaderSearchQuery("")
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">
            <Network className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building2 className="h-4 w-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Users className="h-4 w-4 mr-2" />
            Roles/Positions
          </TabsTrigger>
        </TabsList>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Group" : "Add Group"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={createGroup.isPending || updateGroup.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      disabled={createGroup.isPending || updateGroup.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leader">Leader</Label>
                    <Popover open={leaderOpen} onOpenChange={setLeaderOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          disabled={createGroup.isPending || updateGroup.isPending}
                        >
                          {formData.leader || "Select a leader"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="flex flex-col">
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <Input
                              placeholder="Search members..."
                              value={leaderSearchQuery}
                              onChange={(e) => setLeaderSearchQuery(e.target.value)}
                              className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <ScrollArea className="h-[300px]">
                            <div className="p-1">
                              <div
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  setFormData({ ...formData, leader: "" })
                                  setLeaderOpen(false)
                                  setLeaderSearchQuery("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !formData.leader ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                None
                              </div>
                              {filteredMembers.map((member: any) => {
                                const memberName = `${member.first_name} ${member.last_name}`
                                const isSelected = formData.leader === memberName
                                return (
                                  <div
                                    key={member.uuid}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      setFormData({ ...formData, leader: memberName })
                                      setLeaderOpen(false)
                                      setLeaderSearchQuery("")
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {memberName}
                                  </div>
                                )
                              })}
                              {filteredMembers.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No members found
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                      disabled={createGroup.isPending || updateGroup.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createGroup.isPending || updateGroup.isPending}
                    >
                      {createGroup.isPending || updateGroup.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingId ? 'Update' : 'Create'
                      )}
                    </Button>
                    {editingId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          resetForm()
                          setEditingId(null)
                        }}
                        disabled={createGroup.isPending || updateGroup.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Groups</CardTitle>
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading groups...</p>
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No groups found matching your search." : "No groups found."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{group.description || 'N/A'}</TableCell>
                          <TableCell>{group.leader || 'N/A'}</TableCell>
                          <TableCell>{group.members || 0}</TableCell>
                          <TableCell>
                            <Badge variant={group.status === "Active" ? "default" : "secondary"}>
                              {group.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(group, "group")}
                                disabled={createGroup.isPending || updateGroup.isPending || deleteGroup.isPending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(group.id, "group")}
                                disabled={createGroup.isPending || updateGroup.isPending || deleteGroup.isPending}
                              >
                                {deleteGroup.isPending ? (
                                  <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Department" : "Add Department"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dept-name">Name *</Label>
                    <Input
                      id="dept-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-description">Description</Label>
                    <Textarea
                      id="dept-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-leader">Leader</Label>
                    <Popover open={leaderOpen} onOpenChange={setLeaderOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          disabled={createDepartment.isPending || updateDepartment.isPending}
                        >
                          {formData.leader || "Select a leader"}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <div className="flex flex-col">
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <Input
                              placeholder="Search members..."
                              value={leaderSearchQuery}
                              onChange={(e) => setLeaderSearchQuery(e.target.value)}
                              className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                          <ScrollArea className="h-[300px]">
                            <div className="p-1">
                              <div
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  setFormData({ ...formData, leader: "" })
                                  setLeaderOpen(false)
                                  setLeaderSearchQuery("")
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !formData.leader ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                None
                              </div>
                              {filteredMembers.map((member: any) => {
                                const memberName = `${member.first_name} ${member.last_name}`
                                const isSelected = formData.leader === memberName
                                return (
                                  <div
                                    key={member.uuid}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                      setFormData({ ...formData, leader: memberName })
                                      setLeaderOpen(false)
                                      setLeaderSearchQuery("")
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {memberName}
                                  </div>
                                )
                              })}
                              {filteredMembers.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  No members found
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dept-status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    >
                      {createDepartment.isPending || updateDepartment.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingId ? 'Update' : 'Create'
                      )}
                    </Button>
                    {editingId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          resetForm()
                          setEditingId(null)
                        }}
                        disabled={createDepartment.isPending || updateDepartment.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Departments</CardTitle>
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search departments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading departments...</p>
                  </div>
                ) : filteredDepartments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No departments found matching your search." : "No departments found."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Leader</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepartments.map((department) => (
                        <TableRow key={department.id}>
                          <TableCell className="font-medium">{department.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{department.description || 'N/A'}</TableCell>
                          <TableCell>{department.leader || 'N/A'}</TableCell>
                          <TableCell>{department.members || 0}</TableCell>
                          <TableCell>
                            <Badge variant={department.status === "Active" ? "default" : "secondary"}>
                              {department.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(department, "department")}
                                disabled={createDepartment.isPending || updateDepartment.isPending || deleteDepartment.isPending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(department.id, "department")}
                                disabled={createDepartment.isPending || updateDepartment.isPending || deleteDepartment.isPending}
                              >
                                {deleteDepartment.isPending ? (
                                  <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Roles/Positions Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Role/Position" : "Add Role/Position"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Name *</Label>
                    <Input
                      id="role-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={createRolePosition.isPending || updateRolePosition.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-description">Description</Label>
                    <Textarea
                      id="role-description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      disabled={createRolePosition.isPending || updateRolePosition.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role-status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value as "Active" | "Inactive" })}
                      disabled={createRolePosition.isPending || updateRolePosition.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createRolePosition.isPending || updateRolePosition.isPending}
                    >
                      {createRolePosition.isPending || updateRolePosition.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {editingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingId ? 'Update' : 'Create'
                      )}
                    </Button>
                    {editingId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          resetForm()
                          setEditingId(null)
                        }}
                        disabled={createRolePosition.isPending || updateRolePosition.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Roles/Positions</CardTitle>
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search roles/positions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                    <p className="text-muted-foreground">Loading roles/positions...</p>
                  </div>
                ) : filteredRolesPositions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No roles/positions found matching your search." : "No roles/positions found."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRolesPositions.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{role.description || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={role.status === "Active" ? "default" : "secondary"}>
                              {role.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(role, "role")}
                                disabled={createRolePosition.isPending || updateRolePosition.isPending || deleteRolePosition.isPending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDelete(role.id, "role")}
                                disabled={createRolePosition.isPending || updateRolePosition.isPending || deleteRolePosition.isPending}
                              >
                                {deleteRolePosition.isPending ? (
                                  <Loader2 className="h-4 w-4 text-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
