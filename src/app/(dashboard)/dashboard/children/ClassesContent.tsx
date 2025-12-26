"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Users, Loader2, Search, ChevronDown, Check } from "lucide-react"
import { useChildClassGroups, useCreateChildClassGroup, useUpdateChildClassGroup, useDeleteChildClassGroup } from "@/hooks/children"
import { useMembers } from "@/hooks/members/useMembers"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { cn } from "@/lib/utils"
import type { ChildClassGroup } from "./types"

export default function ClassesContent() {
    const { data: classGroups = [], isLoading: classGroupsLoading } = useChildClassGroups()
    const { data: members = [] } = useMembers()
    const createGroup = useCreateChildClassGroup()
    const updateGroup = useUpdateChildClassGroup()
    const deleteGroup = useDeleteChildClassGroup()

    const isLoading = classGroupsLoading

    const [searchQuery, setSearchQuery] = useState("")
    const [selectedGroup, setSelectedGroup] = useState<ChildClassGroup | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [leaderSearchQuery, setLeaderSearchQuery] = useState("")
    const [leaderOpen, setLeaderOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        min_age: "",
        max_age: "",
        leader: "",
        leader_id: "",
        status: "Active" as "Active" | "Inactive",
    })

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            min_age: "",
            max_age: "",
            leader: "",
            leader_id: "",
            status: "Active",
        })
        setSelectedGroup(null)
        setLeaderSearchQuery("")
        setLeaderOpen(false)
    }

    const handleEdit = (group: ChildClassGroup) => {
        setSelectedGroup(group)
        setEditingId(group.id)
        setFormData({
            name: group.name || "",
            description: group.description || "",
            min_age: group.min_age?.toString() || "",
            max_age: group.max_age?.toString() || "",
            leader: group.leader || "",
            leader_id: (group as any).leader_id || "",
            status: group.status || "Active",
        })
    }

    const handleDeleteClick = (id: string, name: string) => {
        setGroupToDelete({ id, name })
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!groupToDelete) return

        try {
            await deleteGroup.mutateAsync(groupToDelete.id)
            setDeleteDialogOpen(false)
            setGroupToDelete(null)
        } catch (error) {
            console.error("Error deleting class group:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            return
        }

        try {
            const groupData = {
                name: formData.name.trim(),
                description: formData.description || undefined,
                min_age: formData.min_age ? parseInt(formData.min_age) : undefined,
                max_age: formData.max_age ? parseInt(formData.max_age) : undefined,
                leader: formData.leader || undefined,
                leader_id: formData.leader_id || undefined,
                status: formData.status,
            }

            if (selectedGroup && editingId) {
                await updateGroup.mutateAsync({ id: selectedGroup.id, ...groupData } as any)
            } else {
                await createGroup.mutateAsync(groupData as any)
            }

            resetForm()
            setEditingId(null)
        } catch (error) {
            console.error("Error submitting class group:", error)
        }
    }

    // Filter class groups by search query
    const searchQueryLower = useMemo(() => searchQuery.toLowerCase(), [searchQuery])
    const filteredClassGroups = useMemo(() => {
        if (!searchQueryLower) return classGroups

        const results: typeof classGroups = []
        for (let i = 0; i < classGroups.length; i++) {
            const group = classGroups[i]
            if (group.name?.toLowerCase().includes(searchQueryLower) ||
                group.description?.toLowerCase().includes(searchQueryLower)) {
                results.push(group)
            }
        }
        return results
    }, [classGroups, searchQueryLower])

    // Filter members for leader search
    const leaderSearchQueryLower = useMemo(() => leaderSearchQuery.trim().toLowerCase(), [leaderSearchQuery])
    const filteredMembers = useMemo(() => {
        if (!leaderSearchQueryLower) return members

        const results: typeof members = []
        for (let i = 0; i < members.length; i++) {
            const member = members[i] as any
            const firstNameLower = member.first_name?.toLowerCase() || ""
            const lastNameLower = member.last_name?.toLowerCase() || ""
            const fullNameLower = `${firstNameLower} ${lastNameLower}`

            if (firstNameLower.includes(leaderSearchQueryLower) ||
                lastNameLower.includes(leaderSearchQueryLower) ||
                fullNameLower.includes(leaderSearchQueryLower)) {
                results.push(member)
            }
        }
        return results
    }, [members, leaderSearchQueryLower])

    return (
        <div className="space-y-6">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
                {/* Form on Left */}
                <Card>
                    <CardHeader>
                        <CardTitle>{editingId ? "Edit Class Group" : "Add Class Group"}</CardTitle>
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
                                    placeholder="e.g., Toddlers, Pre-K"
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
                                    placeholder="Describe this class group..."
                                    disabled={createGroup.isPending || updateGroup.isPending}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="min_age">Min Age</Label>
                                    <Input
                                        id="min_age"
                                        type="number"
                                        min="0"
                                        max="18"
                                        value={formData.min_age}
                                        onChange={(e) => setFormData({ ...formData, min_age: e.target.value })}
                                        placeholder="e.g., 3"
                                        disabled={createGroup.isPending || updateGroup.isPending}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="max_age">Max Age</Label>
                                    <Input
                                        id="max_age"
                                        type="number"
                                        min="0"
                                        max="18"
                                        value={formData.max_age}
                                        onChange={(e) => setFormData({ ...formData, max_age: e.target.value })}
                                        placeholder="e.g., 5"
                                        disabled={createGroup.isPending || updateGroup.isPending}
                                    />
                                </div>
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
                                                            setFormData({ ...formData, leader: "", leader_id: "" })
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
                                                                    setFormData({ ...formData, leader: memberName, leader_id: member.uuid })
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
                                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
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
                            <CardTitle>Class Groups</CardTitle>
                            <div className="relative max-w-xs">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search class groups..."
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
                                <p className="text-muted-foreground">Loading class groups...</p>
                            </div>
                        ) : filteredClassGroups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">
                                    {searchQuery ? "No class groups found matching your search." : "No class groups found."}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Leader</TableHead>
                                        <TableHead>Age Range</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClassGroups.map((group: ChildClassGroup) => (
                                        <TableRow key={group.id}>
                                            <TableCell className="font-medium">{group.name}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{group.description || 'N/A'}</TableCell>
                                            <TableCell>{group.leader || 'N/A'}</TableCell>
                                            <TableCell>
                                                {group.min_age !== undefined && group.max_age !== undefined
                                                    ? `${group.min_age} - ${group.max_age}`
                                                    : group.min_age !== undefined
                                                        ? `${group.min_age}+`
                                                        : group.max_age !== undefined
                                                            ? `Up to ${group.max_age}`
                                                            : 'N/A'}
                                            </TableCell>
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
                                                        onClick={() => handleEdit(group)}
                                                        disabled={createGroup.isPending || updateGroup.isPending || deleteGroup.isPending}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(group.id, group.name)}
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

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Class Group"
                description={`Are you sure you want to delete "${groupToDelete?.name}"? This action cannot be undone.`}
            />
        </div>
    )
}
