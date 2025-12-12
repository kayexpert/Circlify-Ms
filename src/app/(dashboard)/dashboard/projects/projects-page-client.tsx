"use client"

import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectsContent } from "./ProjectsContent"
import { CategoriesContent } from "./CategoriesContent"

export function ProjectsPageClient() {
  const [activeTab, setActiveTab] = useState("projects")

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground">
          Manage projects, track income and expenditure
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="categories">Category Types</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          <ProjectsContent />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

