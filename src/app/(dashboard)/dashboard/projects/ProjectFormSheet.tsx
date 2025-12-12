"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Loader2, Search, ChevronDown, Check } from "lucide-react"
import { useProjects, useCreateProject, useUpdateProject } from "@/hooks/projects"
import { useProjectCategories } from "@/hooks/projects"
import { useOrganization } from "@/hooks/use-organization"

interface ProjectFormSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string | null
}

export function ProjectFormSheet({ isOpen, onOpenChange, projectId }: ProjectFormSheetProps) {
  const { organization } = useOrganization()
  const { data: projects = [] } = useProjects()
  const { data: categories = [] } = useProjectCategories()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()

  const project = projectId ? projects.find((p) => p.id === projectId) : null

  const [categorySearchQuery, setCategorySearchQuery] = useState("")
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false)

  // Memoize filtered categories for performance
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery) return categories
    const query = categorySearchQuery.toLowerCase()
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    )
  }, [categories, categorySearchQuery])

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    estimated_budget: "",
    status: "Active" as "Active" | "Completed" | "Suspended",
    estimated_start_date: undefined as Date | undefined,
    estimated_end_date: undefined as Date | undefined,
    actual_completion_date: undefined as Date | undefined,
  })

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || "",
        category_id: project.category_id || "",
        estimated_budget: project.estimated_budget.toString(),
        status: project.status,
        estimated_start_date: project.estimated_start_date ? new Date(project.estimated_start_date) : undefined,
        estimated_end_date: project.estimated_end_date ? new Date(project.estimated_end_date) : undefined,
        actual_completion_date: project.actual_completion_date ? new Date(project.actual_completion_date) : undefined,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        category_id: "",
        estimated_budget: "",
        status: "Active",
        estimated_start_date: undefined,
        estimated_end_date: undefined,
        actual_completion_date: undefined,
      })
    }
  }, [project, isOpen])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      return
    }

    const submitData = {
      name: formData.name,
      description: formData.description || null,
      category_id: formData.category_id && formData.category_id.trim() !== "" ? formData.category_id : null,
      estimated_budget: parseFloat(formData.estimated_budget) || 0,
      status: formData.status,
      estimated_start_date: formData.estimated_start_date?.toISOString().split("T")[0] || null,
      estimated_end_date: formData.estimated_end_date?.toISOString().split("T")[0] || null,
      actual_completion_date: formData.actual_completion_date?.toISOString().split("T")[0] || null,
    }

    if (projectId) {
      updateProject.mutate(
        { id: projectId, ...submitData },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    } else {
      createProject.mutate(submitData, {
        onSuccess: () => {
          onOpenChange(false)
        },
      })
    }
  }, [formData, projectId, updateProject, createProject, onOpenChange])

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{projectId ? "Edit Project" : "New Project"}</SheetTitle>
          <SheetDescription>
            {projectId ? "Update the project details." : "Create a new project to track income and expenditure."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Church Building Project"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryPopoverOpen}
                  className="w-full justify-between"
                >
                  {formData.category_id
                    ? categories.find((cat) => cat.id === formData.category_id)?.name || "Select a category..."
                    : "Select a category..."}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search categories..."
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                    className="h-9"
                  />
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1">
                    {filteredCategories.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No categories found.
                        </div>
                      ) : (
                        <>
                          <div
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              !formData.category_id && "bg-accent"
                            )}
                            onClick={() => {
                              setFormData({ ...formData, category_id: "" })
                              setCategoryPopoverOpen(false)
                              setCategorySearchQuery("")
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.category_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span>None</span>
                          </div>
                          {filteredCategories.map((cat) => (
                            <div
                              key={cat.id}
                              className={cn(
                                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                formData.category_id === cat.id && "bg-accent"
                              )}
                              onClick={() => {
                                setFormData({ ...formData, category_id: cat.id })
                                setCategoryPopoverOpen(false)
                                setCategorySearchQuery("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.category_id === cat.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{cat.name}</span>
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
            <Label htmlFor="estimated_budget">Estimated Budget *</Label>
            <Input
              id="estimated_budget"
              type="number"
              step="0.01"
              min="0"
              value={formData.estimated_budget}
              onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "Active" | "Completed" | "Suspended") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimated_start_date">Estimated Start Date</Label>
              <DatePicker
                date={formData.estimated_start_date}
                onSelect={(date) => setFormData({ ...formData, estimated_start_date: date })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_end_date">Estimated End Date</Label>
              <DatePicker
                date={formData.estimated_end_date}
                onSelect={(date) => setFormData({ ...formData, estimated_end_date: date })}
              />
            </div>
          </div>

          {formData.status === "Completed" && (
            <div className="space-y-2">
              <Label htmlFor="actual_completion_date">Actual Completion Date</Label>
              <DatePicker
                date={formData.actual_completion_date}
                onSelect={(date) => setFormData({ ...formData, actual_completion_date: date })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
              {createProject.isPending || updateProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                projectId ? "Update" : "Create"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

