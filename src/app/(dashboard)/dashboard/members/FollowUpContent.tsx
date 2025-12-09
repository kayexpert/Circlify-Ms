"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Trash2, Check, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useMembers } from "@/hooks/members/useMembers"
import { useVisitors } from "@/hooks/members/useVisitors"
import { 
  useMemberFollowUps, 
  useCreateMemberFollowUp, 
  useDeleteMemberFollowUp 
} from "@/hooks/members/useMemberFollowUps"
import { 
  useVisitorFollowUps, 
  useCreateVisitorFollowUp, 
  useDeleteVisitorFollowUp 
} from "@/hooks/members/useVisitorFollowUps"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import { formatDate } from "./utils"

export default function FollowUpContent() {
  const [activeSubTab, setActiveSubTab] = useState<"members" | "visitors">("members")
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [visitorSearchQuery, setVisitorSearchQuery] = useState("")
  const [memberPopoverOpen, setMemberPopoverOpen] = useState(false)
  const [visitorPopoverOpen, setVisitorPopoverOpen] = useState(false)
  const [memberUUID, setMemberUUID] = useState<string | null>(null)
  const [visitorUUID, setVisitorUUID] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    date: undefined as Date | undefined,
    method: "",
    notes: "",
    memberId: "",
    visitorId: "",
  })

  const { organization } = useOrganization()
  const supabase = createClient()

  // Fetch members and visitors
  const { data: members = [] } = useMembers()
  const { data: visitors = [] } = useVisitors()

  // Get selected member/visitor
  const selectedMember = members.find((m: any) => m.id.toString() === formData.memberId)
  const selectedVisitor = visitors.find((v: any) => v.id.toString() === formData.visitorId)

  // Helper to get member UUID
  const getMemberUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const member = members.find((m: any) => m.id === numberId)
    if (!member) return null

    const { data, error } = await supabase
      .from("members")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("first_name", member.first_name)
      .eq("last_name", member.last_name)
      .maybeSingle()

    if (error || !data) return null
    return (data as { id: string } | null)?.id || null
  }

  // Helper to get visitor UUID
  const getVisitorUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    const visitor = visitors.find((v: any) => v.id === numberId)
    if (!visitor) return null

    const { data, error } = await supabase
      .from("visitors")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("first_name", visitor.first_name)
      .eq("last_name", visitor.last_name)
      .maybeSingle()

    if (error || !data) return null
    return (data as { id: string } | null)?.id || null
  }

  // Fetch UUIDs when member/visitor selection changes
  useEffect(() => {
    if (activeSubTab === "members" && selectedMember) {
      getMemberUUID(selectedMember.id).then(setMemberUUID)
    } else {
      setMemberUUID(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, formData.memberId, organization?.id])

  useEffect(() => {
    if (activeSubTab === "visitors" && selectedVisitor) {
      getVisitorUUID(selectedVisitor.id).then(setVisitorUUID)
    } else {
      setVisitorUUID(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, formData.visitorId, organization?.id])

  // Fetch follow-ups
  const { data: memberFollowUps = [], isLoading: memberFollowUpsLoading } = useMemberFollowUps(
    activeSubTab === "members" ? memberUUID : null
  )
  const { data: visitorFollowUps = [], isLoading: visitorFollowUpsLoading } = useVisitorFollowUps(
    activeSubTab === "visitors" ? visitorUUID : null
  )

  // Mutations
  const createMemberFollowUp = useCreateMemberFollowUp()
  const deleteMemberFollowUp = useDeleteMemberFollowUp()
  const createVisitorFollowUp = useCreateVisitorFollowUp()
  const deleteVisitorFollowUp = useDeleteVisitorFollowUp()

  // Filter members and visitors
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery) return members
    const query = memberSearchQuery.toLowerCase()
    return members.filter(
      (member: any) =>
        member.first_name.toLowerCase().includes(query) ||
        member.last_name.toLowerCase().includes(query) ||
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(query)
    )
  }, [members, memberSearchQuery])

  const filteredVisitors = useMemo(() => {
    if (!visitorSearchQuery) return visitors
    const query = visitorSearchQuery.toLowerCase()
    return visitors.filter(
      (visitor: any) =>
        visitor.first_name.toLowerCase().includes(query) ||
        visitor.last_name.toLowerCase().includes(query) ||
        `${visitor.first_name} ${visitor.last_name}`.toLowerCase().includes(query)
    )
  }, [visitors, visitorSearchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.method || !formData.notes) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (activeSubTab === "members") {
        if (!formData.memberId) {
          toast.error("Please select a member")
          return
        }

        const memberUUID = await getMemberUUID(parseInt(formData.memberId))
        if (!memberUUID) {
          toast.error("Member not found")
          return
        }

        await createMemberFollowUp.mutateAsync({
          member_id: memberUUID,
          date: formData.date.toISOString().split('T')[0],
          method: formData.method,
          notes: formData.notes,
        })
      } else {
        if (!formData.visitorId) {
          toast.error("Please select a visitor")
          return
        }

        const visitorUUID = await getVisitorUUID(parseInt(formData.visitorId))
        if (!visitorUUID) {
          toast.error("Visitor not found")
          return
        }

        await createVisitorFollowUp.mutateAsync({
          visitorId: visitorUUID,
          date: formData.date.toISOString().split('T')[0],
          method: formData.method,
          notes: formData.notes,
        })
      }

      // Reset form
      setFormData({
        date: undefined,
        method: "",
        notes: "",
        memberId: "",
        visitorId: "",
      })
      setMemberSearchQuery("")
      setVisitorSearchQuery("")
      setMemberPopoverOpen(false)
      setVisitorPopoverOpen(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDeleteMemberFollowUp = async (followUpId: string, memberId: string) => {
    try {
      await deleteMemberFollowUp.mutateAsync({
        id: followUpId,
        memberId: memberId,
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  const handleDeleteVisitorFollowUp = async (followUpId: string, visitorId: string) => {
    try {
      await deleteVisitorFollowUp.mutateAsync({
        id: followUpId,
        visitorId: visitorId,
      })
    } catch (error) {
      // Error handled by hook
    }
  }

  // Get current follow-ups based on active tab
  const currentFollowUps = activeSubTab === "members" ? memberFollowUps : visitorFollowUps
  const isLoadingFollowUps = activeSubTab === "members" ? memberFollowUpsLoading : visitorFollowUpsLoading
  const selectedPersonName = activeSubTab === "members" 
    ? (selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "")
    : (selectedVisitor ? `${selectedVisitor.first_name} ${selectedVisitor.last_name}` : "")

  return (
    <div className="space-y-4">
      <Tabs value={activeSubTab} onValueChange={(value) => {
        setActiveSubTab(value as "members" | "visitors")
        setFormData({
          date: undefined,
          method: "",
          notes: "",
          memberId: "",
          visitorId: "",
        })
        setMemberSearchQuery("")
        setVisitorSearchQuery("")
        setMemberPopoverOpen(false)
        setVisitorPopoverOpen(false)
      }}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>Add Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="member">Member *</Label>
                    <Popover open={memberPopoverOpen} onOpenChange={setMemberPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={memberPopoverOpen}
                          className="w-full justify-between"
                        >
                          {selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : "Select member..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search members..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-1">
                            {filteredMembers.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No members found.
                              </div>
                            ) : (
                              filteredMembers.map((member: any) => (
                                <div
                                  key={member.id}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    formData.memberId === member.id.toString() && "bg-accent"
                                  )}
                                  onClick={() => {
                                    setFormData({ ...formData, memberId: member.id.toString() })
                                    setMemberPopoverOpen(false)
                                    setMemberSearchQuery("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.memberId === member.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>{member.first_name} {member.last_name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <DatePicker
                      date={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      placeholder="Select date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="method">Method *</Label>
                    <Select 
                      value={formData.method} 
                      onValueChange={(value) => setFormData({ ...formData, method: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Visit">Visit</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes *</Label>
                    <Textarea 
                      id="notes" 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      rows={4} 
                      placeholder="Enter follow-up notes..."
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!formData.memberId || !formData.date || !formData.method || !formData.notes || createMemberFollowUp.isPending}
                  >
                    {createMemberFollowUp.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Follow-up"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <CardTitle>Follow-up History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingFollowUps ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : !formData.memberId ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Select a member to view follow-ups
                          </TableCell>
                        </TableRow>
                      ) : currentFollowUps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No follow-ups recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentFollowUps.map((followUp: any) => (
                          <TableRow key={followUp.id}>
                            <TableCell className="font-medium whitespace-nowrap">{formatDate(followUp.date)}</TableCell>
                            <TableCell className="whitespace-nowrap">{followUp.method}</TableCell>
                            <TableCell className="!whitespace-normal !break-words pr-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' } as React.CSSProperties}>
                              {followUp.notes}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (memberUUID) {
                                    handleDeleteMemberFollowUp(followUp.id, memberUUID)
                                  }
                                }}
                                disabled={deleteMemberFollowUp.isPending}
                                title="Delete follow-up"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="mt-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>Add Follow-up</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitor">Visitor *</Label>
                    <Popover open={visitorPopoverOpen} onOpenChange={setVisitorPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={visitorPopoverOpen}
                          className="w-full justify-between"
                        >
                          {selectedVisitor ? `${selectedVisitor.first_name} ${selectedVisitor.last_name}` : "Select visitor..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Search visitors..."
                            value={visitorSearchQuery}
                            onChange={(e) => setVisitorSearchQuery(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <ScrollArea className="h-[200px]">
                          <div className="p-1">
                            {filteredVisitors.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No visitors found.
                              </div>
                            ) : (
                              filteredVisitors.map((visitor: any) => (
                                <div
                                  key={visitor.id}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    formData.visitorId === visitor.id.toString() && "bg-accent"
                                  )}
                                  onClick={() => {
                                    setFormData({ ...formData, visitorId: visitor.id.toString() })
                                    setVisitorPopoverOpen(false)
                                    setVisitorSearchQuery("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.visitorId === visitor.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span>{visitor.first_name} {visitor.last_name}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <DatePicker
                      date={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      placeholder="Select date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="method">Method *</Label>
                    <Select 
                      value={formData.method} 
                      onValueChange={(value) => setFormData({ ...formData, method: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Call">Call</SelectItem>
                        <SelectItem value="In-person">In-person</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes *</Label>
                    <Textarea 
                      id="notes" 
                      value={formData.notes} 
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                      rows={4} 
                      placeholder="Enter follow-up notes..."
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!formData.visitorId || !formData.date || !formData.method || !formData.notes || createVisitorFollowUp.isPending}
                  >
                    {createVisitorFollowUp.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Follow-up"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <CardTitle>Follow-up History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingFollowUps ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : !formData.visitorId ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            Select a visitor to view follow-ups
                          </TableCell>
                        </TableRow>
                      ) : currentFollowUps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No follow-ups recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentFollowUps.map((followUp: any) => (
                          <TableRow key={followUp.id}>
                            <TableCell className="font-medium whitespace-nowrap">{formatDate(followUp.date)}</TableCell>
                            <TableCell className="whitespace-nowrap">{followUp.method}</TableCell>
                            <TableCell className="!whitespace-normal !break-words pr-4" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' } as React.CSSProperties}>
                              {followUp.notes}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (visitorUUID) {
                                    handleDeleteVisitorFollowUp(followUp.id, visitorUUID)
                                  }
                                }}
                                disabled={deleteVisitorFollowUp.isPending}
                                title="Delete follow-up"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

