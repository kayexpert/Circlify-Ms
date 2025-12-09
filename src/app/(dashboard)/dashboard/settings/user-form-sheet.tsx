"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUser: any
  formData: {
    name: string
    email: string
    password: string
    role: string
  }
  onFormDataChange: (data: UserFormSheetProps["formData"]) => void
  onSubmit: (e: React.FormEvent) => void
  isSaving: boolean
}

export function UserFormSheet({
  open,
  onOpenChange,
  selectedUser,
  formData,
  onFormDataChange,
  onSubmit,
  isSaving,
}: UserFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold">
            {selectedUser ? "Edit User" : "Add New User"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-150px)]">
          <form onSubmit={onSubmit} className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
                placeholder="e.g., john@example.com"
                required
                disabled={!!selectedUser}
              />
              {selectedUser && (
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              )}
            </div>
            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => onFormDataChange({ ...formData, password: e.target.value })}
                  placeholder="Enter password (min 8 characters)"
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => onFormDataChange({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser ? (
                    // When editing, show all roles
                    <>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </>
                  ) : (
                    // When creating, only show roles allowed by API
                    <>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {!selectedUser && (
                <p className="text-xs text-muted-foreground">
                  Note: Only super admins can create users
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1" disabled={isSaving}>
                {isSaving ? "Saving..." : selectedUser ? "Update User" : "Add User"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
