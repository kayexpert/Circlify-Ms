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
import { 
  Plus, Search, Edit, Trash2,
  Building2, Network, Loader2
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/members"
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "@/hooks/members"
import type { Group, Department } from "./types"

export default function GroupsDepartmentsContent() {
  // Fetch data using hooks
  const { data: groups = [], isLoading: groupsLoading } = useGroups()
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()

  // Mutations
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const createDepartment = useCreateDepartment()
  const updateDepartment = useUpdateDepartment()
  const deleteDepartment = useDeleteDepartment()

  const isLoading = groupsLoading || departmentsLoading

  const [activeTab, setActiveTab] = useState("groups")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<Group | Department | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

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
  }

  const handleEdit = (record: Group | Department, type: "group" | "department") => {
    setSelectedRecord(record)
    setEditingId(record.id)
    setFormData({
      name: record.name || "",
      description: record.description || "",
      leader: record.leader || "",
      status: record.status || "Active",
    })
  }

  const handleDelete = async (id: string, type: "group" | "department") => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
      return
    }

    try {
      if (type === "group") {
        await deleteGroup.mutateAsync(id)
      } else {
        await deleteDepartment.mutateAsync(id)
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
        } else {
          await updateDepartment.mutateAsync({
            id: selectedRecord.id,
            name: formData.name,
            description: formData.description || undefined,
            leader: formData.leader || undefined,
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
        } else {
          await createDepartment.mutateAsync({
            name: formData.name,
            description: formData.description || "",
            leader: formData.leader || "",
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

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">
            <Network className="h-4 w-4 mr-2" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building2 className="h-4 w-4 mr-2" />
            Departments
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
                    <Input
                      id="leader"
                      value={formData.leader}
                      onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                      disabled={createGroup.isPending || updateGroup.isPending}
                    />
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
                    <Input
                      id="dept-leader"
                      value={formData.leader}
                      onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                      disabled={createDepartment.isPending || updateDepartment.isPending}
                    />
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
      </Tabs>
    </div>
  )
}
