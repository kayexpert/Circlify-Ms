"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import { useProjects, useDeleteProject } from "@/hooks/projects"
import { useProjectCategories } from "@/hooks/projects"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { useQuery } from "@tanstack/react-query"
import { ProjectDetailsDrawer } from "./ProjectDetailsDrawer"
import { ProjectFormSheet } from "./ProjectFormSheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency } from "./utils"

export function ProjectsContent() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const { data: projects = [], isLoading } = useProjects()
  const { data: categories = [] } = useProjectCategories()
  const deleteProject = useDeleteProject()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  // Fetch income and expenditure totals for all projects (optimized single query)
  const { data: projectTotals = { income: {}, expenditure: {} } } = useQuery({
    queryKey: ["project_totals", organization?.id, projects.length],
    queryFn: async () => {
      if (!organization?.id || projects.length === 0) return { income: {}, expenditure: {} }
      
      const projectIds = projects.map((p) => p.id)
      
      // Fetch income and expenditure in parallel
      const [incomeResult, expenditureResult] = await Promise.all([
        supabase
          .from("project_income")
          .select("project_id, amount")
          .in("project_id", projectIds)
          .eq("organization_id", organization.id),
        supabase
          .from("project_expenditure")
          .select("project_id, amount")
          .in("project_id", projectIds)
          .eq("organization_id", organization.id)
      ])

      const incomeTotals: Record<string, number> = {}
      incomeResult.data?.forEach((record) => {
        incomeTotals[record.project_id] = (incomeTotals[record.project_id] || 0) + Number(record.amount)
      })

      const expenditureTotals: Record<string, number> = {}
      expenditureResult.data?.forEach((record) => {
        expenditureTotals[record.project_id] = (expenditureTotals[record.project_id] || 0) + Number(record.amount)
      })

      return { income: incomeTotals, expenditure: expenditureTotals }
    },
    enabled: !!organization?.id && projects.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute - refresh more frequently for real-time updates
  })

  // Calculate totals and metrics for each project
  const projectsWithTotals = useMemo(() => {
    return projects.map((project) => {
      const totalIncome = projectTotals.income[project.id] || 0
      const totalExpenditure = projectTotals.expenditure[project.id] || 0
      const budgetVariance = project.estimated_budget - totalIncome // Budget variance = estimated budget - amount raised
      
      return {
        ...project,
        totalIncome,
        totalExpenditure,
        budgetVariance,
      }
    })
  }, [projects, projectTotals])

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projectsWithTotals
    const query = searchQuery.toLowerCase()
    return projectsWithTotals.filter((project) => {
      const category = project.category_id ? categories.find((c) => c.id === project.category_id) : null
      return (
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        category?.name.toLowerCase().includes(query)
      )
    })
  }, [projectsWithTotals, searchQuery, categories])

  const handleProjectClick = useCallback((projectId: string) => {
    setSelectedProject(projectId)
    setIsDrawerOpen(true)
  }, [])

  const handleEditProject = useCallback((e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setEditingProject(projectId)
    setIsFormSheetOpen(true)
  }, [])

  const handleDeleteProject = useCallback((e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setProjectToDelete(projectId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProject.mutate(projectToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setProjectToDelete(null)
        },
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default"
      case "Completed":
        return "secondary"
      case "Suspended":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => {
            setEditingProject(null)
            setIsFormSheetOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                {searchQuery ? "No projects found matching your search." : "No projects yet. Create your first project to get started."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProjectClick(project.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold line-clamp-2">
                      {project.name}
                    </CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  {project.category_id && (() => {
                    const category = categories.find((c) => c.id === project.category_id)
                    return category ? (
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.name}
                      </p>
                    ) : null
                  })()}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Estimated Budget</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(project.estimated_budget, organization?.currency || "GHS")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount Raised</span>
                      <span className="text-sm font-semibold text-green-600">
                        {formatCurrency(project.totalIncome || 0, organization?.currency || "GHS")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Budget Variance</span>
                      <span className={`text-sm font-semibold ${project.budgetVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(project.budgetVariance || 0, organization?.currency || "GHS")}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => handleEditProject(e, project.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteProject(e, project.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectDetailsDrawer
          projectId={selectedProject}
          isOpen={isDrawerOpen}
          onOpenChange={(open) => {
            setIsDrawerOpen(open)
            if (!open) {
              setSelectedProject(null)
            }
          }}
        />
      )}

      <ProjectFormSheet
        isOpen={isFormSheetOpen}
        onOpenChange={(open) => {
          setIsFormSheetOpen(open)
          if (!open) {
            setEditingProject(null)
          }
        }}
        projectId={editingProject}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone and will also delete all associated income and expenditure records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

