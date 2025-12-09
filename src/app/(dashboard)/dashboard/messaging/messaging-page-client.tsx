"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  MessageSquare, Send, Eye, Trash2, Edit, Plus, X, 
  DollarSign, TrendingUp, Clock, Settings, Bell,
  Users, Building, ChevronDown, Search, EyeOff
} from "lucide-react"
import { toast } from "sonner"
import { Pagination } from "@/components/ui/pagination"
import { formatDate, formatPhoneNumber, personalizeMessage, calculateSMSCost, truncateText, validateMessageLength } from "./utils"
import type { 
  Message, Template, APIConfiguration, NotificationSettings,
  IndividualMessageForm, GroupMessageForm, TemplateForm, APIConfigurationForm
} from "./types"
import {
  useMessagingTemplates,
  useCreateMessagingTemplate,
  useUpdateMessagingTemplate,
  useDeleteMessagingTemplate,
  useAPIConfigurations,
  useActiveAPIConfiguration,
  useCreateAPIConfiguration,
  useUpdateAPIConfiguration,
  useDeleteAPIConfiguration,
  useTestAPIConnection,
  useMessagesPaginated,
  useDeleteMessage,
  useSendMessage,
  useNotificationSettings,
  useUpdateNotificationSettings,
  useMessagingBalance,
  useMessagingAnalytics,
} from "@/hooks/messaging"
import { useMembers } from "@/hooks/members/useMembers"
import { useGroups } from "@/hooks/members/useGroups"
import { useDepartments } from "@/hooks/members/useDepartments"

export function MessagingPageClient() {
  // Main tab state
  const [activeTab, setActiveTab] = useState("messages")
  
  // Configuration tab sub-tabs
  const [configSubTab, setConfigSubTab] = useState("api")
  
  // Drawer states
  const [sendMessageDrawerOpen, setSendMessageDrawerOpen] = useState(false)
  const [sendMessageTab, setSendMessageTab] = useState<"individual" | "group">("individual")
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingApiConfig, setEditingApiConfig] = useState<APIConfiguration | null>(null)
  const [editingApiConfigId, setEditingApiConfigId] = useState<string | null>(null)
  const [viewingMessage, setViewingMessage] = useState<Message | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null)
  
  // Pagination state for messages
  const [messagesPage, setMessagesPage] = useState(1)
  const [messagesPageSize, setMessagesPageSize] = useState(20)

  // Data hooks
  const { data: messagesData, isLoading: messagesLoading } = useMessagesPaginated(messagesPage, messagesPageSize)
  const messages = messagesData?.data || []
  const totalMessages = messagesData?.total || 0
  const totalMessagesPages = messagesData?.totalPages || 0
  const { data: templates = [], isLoading: templatesLoading } = useMessagingTemplates()
  const { data: apiConfigurations = [], isLoading: apiConfigsLoading } = useAPIConfigurations()
  const { data: activeApiConfig } = useActiveAPIConfiguration()
  const { data: notificationSettings } = useNotificationSettings()
  const updateNotificationSettingsMutation = useUpdateNotificationSettings()
  
  // Default notification settings to prevent undefined errors
  const safeNotificationSettings = notificationSettings || {
    birthdayMessagesEnabled: false,
    contributionNotificationsEnabled: false,
  }
  const { data: members = [] } = useMembers()
  const { data: groups = [] } = useGroups()
  const { data: departments = [] } = useDepartments()
  
  // Mutations
  const createTemplate = useCreateMessagingTemplate()
  const updateTemplate = useUpdateMessagingTemplate()
  const deleteTemplate = useDeleteMessagingTemplate()
  const createAPIConfig = useCreateAPIConfiguration()
  const updateAPIConfig = useUpdateAPIConfiguration()
  const deleteAPIConfig = useDeleteAPIConfiguration()
  const testConnection = useTestAPIConnection()
  const deleteMessage = useDeleteMessage()
  const sendMessage = useSendMessage()
  const updateNotificationSettings = useUpdateNotificationSettings()
  
  // Search state for member selection
  const [memberSearchQuery, setMemberSearchQuery] = useState("")
  const [individualRecipientSearch, setIndividualRecipientSearch] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [recipientPopoverOpen, setRecipientPopoverOpen] = useState(false)
  const [groupRecipientsPopoverOpen, setGroupRecipientsPopoverOpen] = useState(false)
  
  // Form states
  const [individualForm, setIndividualForm] = useState<IndividualMessageForm>({
    messageName: "",
    recipient: "",
    templateId: "",
    message: "",
  })
  
  const [groupForm, setGroupForm] = useState<GroupMessageForm>({
    messageName: "",
    messageType: "simple",
    recipients: [],
    templateId: "",
    message: "",
  })
  
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    name: "",
    message: "",
  })
  
  const [apiConfigForm, setApiConfigForm] = useState<APIConfigurationForm>({
    name: "",
    apiKey: "",
    username: "",
    senderId: "",
    isActive: false,
  })
  
  // Fetch balance and analytics
  const { data: balance, isLoading: balanceLoading, error: balanceError } = useMessagingBalance()
  const { data: analytics } = useMessagingAnalytics()
  
  // Calculate stats
  const stats = useMemo(() => {
    // Use analytics data instead of filtering paginated messages
    const totalMessagesSent = analytics?.sentMessages || 0
    const totalCost = analytics?.totalCost || 0
    const avgCost = analytics?.averageCostPerMessage || (totalMessagesSent > 0 ? totalCost / totalMessagesSent : 0)
    
    // Use real balance from Wigal API - NO DUMMY DATA
    let balanceValue: string
    let balanceLabel = "Total Balance Left"
    
    if (balanceLoading && activeApiConfig) {
      // Loading state when API config exists
      balanceValue = "Loading..."
    } else if (balanceError) {
      // Error fetching balance
      balanceValue = "Error loading"
      balanceLabel = "Balance (Error)"
    } else if (balance?.cashbalance !== undefined && balance.cashbalance !== null) {
      // Use cash balance from API (real data)
      balanceValue = `GH₵ ${Number(balance.cashbalance).toFixed(2)}`
    } else if (balance?.bundles?.SMS !== undefined && balance.bundles.SMS !== null) {
      // Convert SMS bundle count to estimated cash value (assuming GH₵0.10 per SMS)
      const estimatedCash = Number(balance.bundles.SMS) * 0.10
      balanceValue = `~GH₵ ${estimatedCash.toFixed(2)} (${balance.bundles.SMS} SMS)`
      balanceLabel = "Estimated Balance (SMS Bundle)"
    } else if (activeApiConfig) {
      // API config exists but no balance data returned
      balanceValue = "Not available"
    } else {
      // No API config
      balanceValue = "Not configured"
      balanceLabel = "Balance (Configure API)"
    }
    
    return [
      { 
        label: balanceLabel, 
        value: balanceValue, 
        icon: DollarSign, 
        color: "text-green-600", 
        bg: "bg-green-50 dark:bg-green-950" 
      },
      { 
        label: "Total Messages Sent", 
        value: totalMessagesSent.toString(), 
        icon: MessageSquare, 
        color: "text-blue-600", 
        bg: "bg-blue-50 dark:bg-blue-950" 
      },
      { 
        label: "Average Cost", 
        value: `GH₵ ${avgCost.toFixed(2)}`, 
        icon: TrendingUp, 
        color: "text-purple-600", 
        bg: "bg-purple-50 dark:bg-purple-950" 
      },
    ]
  }, [messages, balance, analytics, balanceLoading, balanceError, activeApiConfig])
  
  // Message validation
  const messageValidation = useMemo(() => {
    const currentMessage = sendMessageTab === "individual" 
      ? individualForm.message 
      : groupForm.message
    return validateMessageLength(currentMessage)
  }, [individualForm.message, groupForm.message, sendMessageTab])
  
  // Handle individual message form changes
  const handleIndividualFormChange = (field: keyof IndividualMessageForm, value: any) => {
    setIndividualForm(prev => {
      const updated = { ...prev, [field]: value }
      
      // If template is selected, populate message
      if (field === "templateId" && value) {
        const template = templates.find(t => t.id === value)
        if (template) {
          updated.message = template.message
        }
      }
      
      // Enforce 160 character limit on message
      if (field === "message" && typeof value === "string") {
        if (value.length > 160) {
          return prev // Don't update if exceeds limit
        }
      }
      
      return updated
    })
  }
  
  // Handle group message form changes
  const handleGroupFormChange = (field: keyof GroupMessageForm, value: any) => {
    setGroupForm(prev => {
      const updated = { ...prev, [field]: value }
      
      // If template is selected, populate message
      if (field === "templateId" && value) {
        const template = templates.find(t => t.id === value)
        if (template) {
          updated.message = template.message
        }
      }
      
      // Enforce 160 character limit on message
      if (field === "message" && typeof value === "string") {
        if (value.length > 160) {
          return prev // Don't update if exceeds limit
        }
      }
      
      return updated
    })
  }
  
  // Handle send individual message
  const handleSendIndividualMessage = async () => {
    if (!individualForm.messageName || !individualForm.recipient || !individualForm.message) {
      toast.error("Please fill in all required fields")
      return
    }
    
    if (messageValidation.exceedsLimit) {
      toast.error("Message exceeds 160 character limit")
      return
    }
    
    if (!activeApiConfig) {
      toast.error("No active API configuration found. Please configure your Wigal API settings first.")
      return
    }
    
    const recipientMember = members.find((m: any) => m.id === parseInt(individualForm.recipient))
    if (!recipientMember || !recipientMember.phone_number) {
      toast.error("Recipient not found or phone number missing")
      return
    }
    
    // Personalize message
    const personalizedMessage = personalizeMessage(individualForm.message, {
      FirstName: recipientMember.first_name,
      LastName: recipientMember.last_name,
      PhoneNumber: formatPhoneNumber(recipientMember.phone_number),
    })
    
    try {
      await sendMessage.mutateAsync({
      messageName: individualForm.messageName,
      message: personalizedMessage,
        recipients: [{
          phone: recipientMember.phone_number,
          name: `${recipientMember.first_name} ${recipientMember.last_name}`,
          memberId: recipientMember.id.toString(),
        }],
        apiConfigId: activeApiConfig.id,
        templateId: individualForm.templateId || undefined,
      })
    
    // Reset form
    setIndividualForm({
      messageName: "",
      recipient: "",
      templateId: "",
      message: "",
    })
    setSendMessageDrawerOpen(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle send group message
  const handleSendGroupMessage = async () => {
    if (!groupForm.messageName || !groupForm.message) {
      toast.error("Please fill in all required fields")
      return
    }
    
    if (messageValidation.exceedsLimit) {
      toast.error("Message exceeds 160 character limit")
      return
    }
    
    if (!activeApiConfig) {
      toast.error("No active API configuration found. Please configure your Wigal API settings first.")
      return
    }
    
    let recipientList: Array<{ phone: string; name?: string; memberId?: string }> = []
    
    if (groupForm.messageType === "simple") {
      if (groupForm.recipients.length === 0) {
        toast.error("Please select at least one recipient")
        return
      }
      if (groupForm.recipients.includes("all")) {
        recipientList = members
          .filter((m: any) => m.phone_number)
          .map((m: any) => ({
            phone: m.phone_number!,
            name: `${m.first_name} ${m.last_name}`,
            memberId: m.id.toString(),
          }))
      } else {
        recipientList = groupForm.recipients
          .map((id: any) => {
            const member = members.find((m: any) => m.id === parseInt(id))
            return member && member.phone_number ? {
              phone: member.phone_number,
              name: `${member.first_name} ${member.last_name}`,
              memberId: member.id.toString(),
            } : null
          })
          .filter((r): r is { phone: string; name: string; memberId: string } => r !== null)
      }
    } else if (groupForm.messageType === "group" && groupForm.groupId) {
      // Get members in the group
      const selectedGroup = groups.find(g => g.id === groupForm.groupId)
      if (selectedGroup) {
        recipientList = members
          .filter((m: any) => m.groups?.includes(selectedGroup.name) && m.phone_number)
          .map((m: any) => ({
            phone: m.phone_number!,
            name: `${m.first_name} ${m.last_name}`,
            memberId: m.id.toString(),
          }))
      }
    } else if ((groupForm as any).messageType === "department" && (groupForm as any).departmentId) {
      // Get members in the department
      const selectedDepartment = departments.find(d => d.id === groupForm.departmentId)
      if (selectedDepartment) {
        recipientList = members
          .filter((m: any) => m.departments?.includes(selectedDepartment.name) && m.phone_number)
          .map((m: any) => ({
            phone: m.phone_number!,
            name: `${m.first_name} ${m.last_name}`,
            memberId: m.id.toString(),
          }))
      }
    }
    
    if (recipientList.length === 0) {
      toast.error("No recipients found with phone numbers")
      return
    }
    
    try {
      await sendMessage.mutateAsync({
      messageName: groupForm.messageName,
      message: groupForm.message,
        recipients: recipientList,
        apiConfigId: activeApiConfig.id,
        templateId: groupForm.templateId || undefined,
      })
    
    // Reset form
    setGroupForm({
      messageName: "",
      messageType: "simple",
      recipients: [],
      templateId: "",
      message: "",
    })
    setSendMessageDrawerOpen(false)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return
    
    try {
      await deleteMessage.mutateAsync(messageToDelete.id)
    setDeleteDialogOpen(false)
    setMessageToDelete(null)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle template save
  const handleSaveTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!templateForm.name || !templateForm.message) {
      toast.error("Please fill in all required fields")
      return
    }
    
    try {
    if (editingTemplate && editingTemplateId) {
        await updateTemplate.mutateAsync({
          id: editingTemplateId,
          name: templateForm.name,
          message: templateForm.message,
        })
    } else {
        await createTemplate.mutateAsync({
        name: templateForm.name,
        message: templateForm.message,
        })
    }
    
    setTemplateForm({ name: "", message: "" })
    setEditingTemplate(null)
    setEditingTemplateId(null)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle delete template
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync(templateId)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle API config save
  const handleSaveAPIConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!apiConfigForm.name || !apiConfigForm.apiKey || !apiConfigForm.username || !apiConfigForm.senderId) {
      toast.error("Please fill in all required fields")
      return
    }
    
    try {
    if (editingApiConfig && editingApiConfigId) {
        await updateAPIConfig.mutateAsync({
          id: editingApiConfigId,
          name: apiConfigForm.name,
          apiKey: apiConfigForm.apiKey,
          username: apiConfigForm.username,
          senderId: apiConfigForm.senderId,
          isActive: apiConfigForm.isActive,
        })
    } else {
        await createAPIConfig.mutateAsync({
          name: apiConfigForm.name,
          apiKey: apiConfigForm.apiKey,
          username: apiConfigForm.username,
          senderId: apiConfigForm.senderId,
          isActive: apiConfigForm.isActive,
        })
    }
    
    setApiConfigForm({ name: "", apiKey: "", username: "", senderId: "", isActive: false })
    setEditingApiConfig(null)
    setEditingApiConfigId(null)
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  // Handle test API connection
  const handleTestConnection = async () => {
    if (!apiConfigForm.apiKey || !apiConfigForm.username || !apiConfigForm.senderId) {
      toast.error("Please enter API key, username, and sender ID")
      return
    }

    // Get a test phone number from the form or use a default
    const testPhone = individualForm.recipient
      ? members.find((m: any) => m.id === parseInt(individualForm.recipient))?.phone_number
      : members.find((m: any) => m.phone_number)?.phone_number

    if (!testPhone) {
      toast.error("Please select a member with a phone number to test")
      return
    }

    try {
      await testConnection.mutateAsync({
        apiKey: apiConfigForm.apiKey,
        username: apiConfigForm.username,
        senderId: apiConfigForm.senderId,
        testPhoneNumber: testPhone,
      })
    } catch (error) {
      // Error is handled by the mutation
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Messaging</h1>
        <p className="text-muted-foreground">Send SMS messages to members and manage templates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Send SMS Message</CardTitle>
                <Button 
                  onClick={() => {
                    if (!activeApiConfig) {
                      toast.error("Please configure your Wigal API settings first. Go to Configuration tab to add an active API configuration.")
                      setActiveTab("configuration")
                      return
                    }
                    setSendMessageDrawerOpen(true)
                  }}
                  disabled={!activeApiConfig}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send SMS
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!activeApiConfig ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Please configure your Wigal API settings before sending messages.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("configuration")}
                    className="mt-2"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Configuration
                  </Button>
                </div>
              ) : (
              <p className="text-sm text-muted-foreground">
                Click "Send SMS" to compose and send a new message to members.
              </p>
              )}
            </CardContent>
          </Card>

          {/* Message History */}
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Message Name</TableHead>
                      <TableHead>Recipient(s)</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No messages yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(msg.date)}
                          </TableCell>
                          <TableCell className="font-medium">{msg.messageName}</TableCell>
                          <TableCell>
                            {Array.isArray(msg.recipient) 
                              ? msg.recipientCount > 3
                                ? `${msg.recipient.slice(0, 3).join(", ")}... (${msg.recipientCount} total)`
                                : msg.recipient.join(", ")
                              : msg.recipient}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {truncateText(msg.message, 50)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                msg.status === "Sent" 
                                  ? "bg-green-500 hover:bg-green-600" 
                                  : "bg-red-500 hover:bg-red-600"
                              }
                            >
                              {msg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setViewingMessage(msg)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setMessageToDelete(msg)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalMessagesPages > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={messagesPage}
                    totalPages={totalMessagesPages}
                    onPageChange={setMessagesPage}
                    pageSize={messagesPageSize}
                    totalItems={totalMessages}
                    showPageSizeSelector={true}
                    onPageSizeChange={(newSize) => {
                      setMessagesPageSize(newSize)
                      setMessagesPage(1)
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplateId ? "Edit Template" : "Add Template"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Name *</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Service Reminder"
                      maxLength={100}
                      required
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-message">Message *</Label>
                    <Textarea
                      id="template-message"
                      value={templateForm.message}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value.length <= 160) {
                          setTemplateForm(prev => ({ ...prev, message: value }))
                        }
                      }}
                      placeholder="Type your message template here..."
                      rows={6}
                      required
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    />
                    <p className="text-sm text-muted-foreground">
                      {templateForm.message.length}/160 characters
                    </p>
                  </div>

                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-semibold">Available Placeholders:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{"{firstName}"} - Member's first name</p>
                      <p>{"{lastName}"} - Member's last name</p>
                      <p>{"{fullName}"} - Member's full name</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createTemplate.isPending || updateTemplate.isPending}
                    >
                      {createTemplate.isPending || updateTemplate.isPending ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          {editingTemplateId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        editingTemplateId ? 'Update' : 'Create'
                      )}
                    </Button>
                    {editingTemplateId && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setTemplateForm({ name: "", message: "" })
                          setEditingTemplate(null)
                          setEditingTemplateId(null)
                        }}
                        disabled={createTemplate.isPending || updateTemplate.isPending}
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
                <CardTitle>Message Templates</CardTitle>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <CompactLoader />
                    <p className="text-muted-foreground">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No templates yet. Create your first template!</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate">{template.message}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (sendMessageTab === "individual") {
                                    handleIndividualFormChange("templateId", template.id)
                                  } else {
                                    handleGroupFormChange("templateId", template.id)
                                  }
                                  if (!activeApiConfig) {
                                    toast.error("Please configure your Wigal API settings first. Go to Configuration tab to add an active API configuration.")
                                    setActiveTab("configuration")
                                  } else if (!sendMessageDrawerOpen) {
                                    setSendMessageDrawerOpen(true)
                                  }
                                }}
                              >
                                Use
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setTemplateForm({ name: template.name, message: template.message })
                                  setEditingTemplate(template)
                                  setEditingTemplateId(template.id)
                                }}
                                disabled={createTemplate.isPending || updateTemplate.isPending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteTemplate(template.id)}
                                disabled={deleteTemplate.isPending}
                              >
                                {deleteTemplate.isPending ? (
                                  <Spinner size="sm" className="text-red-500" />
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

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Tabs value={configSubTab} onValueChange={setConfigSubTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            {/* API Settings Sub-tab */}
            <TabsContent value="api">
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
                {/* Form on Left */}
                <Card>
                  <CardHeader>
                    <CardTitle>{editingApiConfigId ? "Edit API Configuration" : "Add API Configuration"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveAPIConfig} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="api-name">Name *</Label>
                        <Input
                          id="api-name"
                          value={apiConfigForm.name}
                          onChange={(e) => setApiConfigForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Production API"
                          required
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="api-username">Username *</Label>
                        <Input
                          id="api-username"
                          value={apiConfigForm.username}
                          onChange={(e) => setApiConfigForm(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Enter username"
                          required
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="api-key">API Key *</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={apiConfigForm.apiKey}
                          onChange={(e) => setApiConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="Enter API key"
                          required
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sender-id">Sender ID *</Label>
                        <Input
                          id="sender-id"
                          value={apiConfigForm.senderId}
                          onChange={(e) => setApiConfigForm(prev => ({ ...prev, senderId: e.target.value }))}
                          placeholder="Enter sender ID"
                          required
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is-active"
                          checked={apiConfigForm.isActive}
                          onCheckedChange={(checked) => setApiConfigForm(prev => ({ ...prev, isActive: checked as boolean }))}
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        />
                        <Label htmlFor="is-active" className="cursor-pointer">
                          Set as active configuration
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                        >
                          {createAPIConfig.isPending || updateAPIConfig.isPending ? (
                            <>
                              <Spinner size="sm" className="mr-2" />
                              {editingApiConfigId ? 'Updating...' : 'Creating...'}
                            </>
                          ) : (
                            editingApiConfigId ? 'Update Configuration' : 'Save Configuration'
                          )}
                        </Button>
                        {editingApiConfigId && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setApiConfigForm({ name: "", apiKey: "", username: "", senderId: "", isActive: false })
                              setEditingApiConfig(null)
                              setEditingApiConfigId(null)
                            }}
                            disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
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
                    <CardTitle>API Configurations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {apiConfigsLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <CompactLoader />
                        <p className="text-muted-foreground">Loading configurations...</p>
                      </div>
                    ) : apiConfigurations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No API configurations yet. Add your first configuration to start sending messages.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Sender ID</TableHead>
                            <TableHead>API Key</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {apiConfigurations.map((config) => (
                            <TableRow key={config.id} className={config.isActive ? "bg-green-50 dark:bg-green-950" : ""}>
                              <TableCell className="font-medium">{config.name}</TableCell>
                              <TableCell>{config.senderId}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {config.apiKey.slice(0, 4).replace(/./g, "•")}
                                {config.apiKey.slice(-4)}
                              </TableCell>
                              <TableCell>
                                <Badge className={config.isActive ? "bg-green-500" : "bg-gray-500"}>
                                  {config.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setApiConfigForm({
                                        name: config.name,
                                        apiKey: config.apiKey,
                                        username: config.username,
                                        senderId: config.senderId,
                                        isActive: config.isActive,
                                      })
                                      setEditingApiConfig(config)
                                      setEditingApiConfigId(config.id)
                                    }}
                                    disabled={createAPIConfig.isPending || updateAPIConfig.isPending}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        await deleteAPIConfig.mutateAsync(config.id)
                                      } catch (error) {
                                        // Error handled by mutation
                                      }
                                    }}
                                    disabled={deleteAPIConfig.isPending}
                                  >
                                    {deleteAPIConfig.isPending ? (
                                      <Spinner size="sm" className="text-red-500" />
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

            {/* Notifications Sub-tab */}
            <TabsContent value="notifications">
              <div className="space-y-6">
                {/* Birthday Messages Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Birthday Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="birthday-enabled">Enable Birthday Messages</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically send birthday messages to members
                        </p>
                      </div>
                      <Switch
                        id="birthday-enabled"
                        checked={safeNotificationSettings.birthdayMessagesEnabled}
                        onCheckedChange={(checked) => {
                          updateNotificationSettingsMutation.mutate({
                            birthdayMessagesEnabled: checked,
                          })
                        }}
                        disabled={updateNotificationSettingsMutation.isPending}
                      />
                    </div>
                    
                    {safeNotificationSettings.birthdayMessagesEnabled && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="birthday-template">Select Template</Label>
                        <Select
                          value={safeNotificationSettings.birthdayTemplateId || "none"}
                          onValueChange={(value) => {
                            updateNotificationSettingsMutation.mutate({
                              birthdayTemplateId: value === "none" ? undefined : value,
                            })
                          }}
                          disabled={updateNotificationSettingsMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No template (use default)</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Messages will be sent automatically at 6:00 AM on each member's birthday
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contribution Notifications Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contribution Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="contribution-enabled">Enable Contribution Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically notify members when contributions are recorded
                        </p>
                      </div>
                      <Switch
                        id="contribution-enabled"
                        checked={safeNotificationSettings.contributionNotificationsEnabled}
                        onCheckedChange={(checked) => {
                          updateNotificationSettingsMutation.mutate({
                            contributionNotificationsEnabled: checked,
                          })
                        }}
                        disabled={updateNotificationSettingsMutation.isPending}
                      />
                    </div>
                    
                    {safeNotificationSettings.contributionNotificationsEnabled && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="contribution-template">Select Template (Optional)</Label>
                        <Select
                          value={safeNotificationSettings.contributionTemplateId || "default"}
                          onValueChange={(value) => {
                            updateNotificationSettingsMutation.mutate({
                              contributionTemplateId: value === "default" ? undefined : value,
                            })
                          }}
                          disabled={updateNotificationSettingsMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Use default template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Use default template</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Default template: "Hello {`{FirstName}`}, Thank you for your contribution of {`{Amount}`} {`{Currency}`} for {`{Category}`}."
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Available placeholders: {`{FirstName}`}, {`{LastName}`}, {`{Amount}`}, {`{Currency}`}, {`{Category}`}, {`{Date}`}
                          </p>
                        </div>
                    )}
                  </CardContent>
                </Card>

                {/* Event Notifications */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        <CardTitle>Event Notifications</CardTitle>
                      </div>
                      <Switch
                        checked={(safeNotificationSettings as any).eventNotificationsEnabled || false}
                        onCheckedChange={(checked) => {
                          updateNotificationSettingsMutation.mutate({
                            eventNotificationsEnabled: checked,
                          })
                        }}
                        disabled={updateNotificationSettingsMutation.isPending}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Automatically send SMS notifications for events. Configuration coming soon.
                    </p>
                    
                    {(safeNotificationSettings as any).eventNotificationsEnabled && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="event-template">Select Template (Optional)</Label>
                        <Select
                          value={(safeNotificationSettings as any).eventTemplateId || "default"}
                          onValueChange={(value) => {
                            updateNotificationSettingsMutation.mutate({
                              eventTemplateId: value === "default" ? undefined : value,
                            })
                          }}
                          disabled={updateNotificationSettingsMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Use default template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Use default template</SelectItem>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Event notification templates will be configured in the Events module.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Send Message Drawer */}
      <Sheet 
        open={sendMessageDrawerOpen} 
        onOpenChange={(open) => {
          if (open && !activeApiConfig) {
            toast.error("Please configure your Wigal API settings first. Go to Configuration tab to add an active API configuration.")
            setActiveTab("configuration")
            return
          }
          setSendMessageDrawerOpen(open)
        }}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Send SMS Message</SheetTitle>
            {!activeApiConfig && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ No active API configuration found. Please configure your Wigal API settings in the Configuration tab before sending messages.
                </p>
              </div>
            )}
          </SheetHeader>

          <Tabs value={sendMessageTab} onValueChange={(v) => setSendMessageTab(v as "individual" | "group")} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Individual Messages</TabsTrigger>
              <TabsTrigger value="group">Group Messages</TabsTrigger>
            </TabsList>

            {/* Individual Messages Tab */}
            <TabsContent value="individual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="individual-message-name">Message Name *</Label>
                <Input
                  id="individual-message-name"
                  value={individualForm.messageName}
                  onChange={(e) => handleIndividualFormChange("messageName", e.target.value)}
                  placeholder="e.g., Sunday Service Reminder"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="individual-recipient">Select Recipient *</Label>
                <Popover open={recipientPopoverOpen} onOpenChange={setRecipientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      type="button"
                    >
                      <span className="truncate">
                        {individualForm.recipient
                          ? (() => {
                              const member = members.find((m: any) => m.id === parseInt(individualForm.recipient))
                              return member && member.phone_number
                                ? `${member.first_name} ${member.last_name} (${member.phone_number})`
                                : "Select a member"
                            })()
                          : "Search and select a member"}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[110]" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search members..."
                          value={individualRecipientSearch}
                          onChange={(e) => setIndividualRecipientSearch(e.target.value)}
                          className="pl-8"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-2">
                        {members
                          .filter((member: any) => member.phone_number)
                          .filter((member: any) =>
                            individualRecipientSearch === "" ||
                            `${member.first_name} ${member.last_name} ${member.phone_number || ""}`
                              .toLowerCase()
                              .includes(individualRecipientSearch.toLowerCase())
                          )
                          .map((member: any) => (
                            <div
                              key={member.id}
                              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                              onClick={() => {
                                handleIndividualFormChange("recipient", member.id)
                                setRecipientPopoverOpen(false)
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{member.first_name} {member.last_name}</p>
                                <p className="text-xs text-muted-foreground">{member.phone_number}</p>
                              </div>
                            </div>
                          ))}
                        {members.filter((member: any) => member.phone_number).filter((member: any) =>
                          individualRecipientSearch === "" ||
                          `${member.first_name} ${member.last_name} ${member.phone_number || ""}`
                            .toLowerCase()
                            .includes(individualRecipientSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No members found
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="individual-template">Template (Optional)</Label>
                <Select
                  value={individualForm.templateId || "none"}
                  onValueChange={(value) => handleIndividualFormChange("templateId", value === "none" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="none">None</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="individual-message">Message *</Label>
                <Textarea
                  id="individual-message"
                  value={individualForm.message}
                  onChange={(e) => handleIndividualFormChange("message", e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  maxLength={160}
                />
                <div className="flex items-center justify-between text-sm">
                  <p className={`${messageValidation.exceedsLimit ? "text-red-500" : "text-muted-foreground"}`}>
                    {messageValidation.length}/160 characters
                  </p>
                  {messageValidation.exceedsLimit && (
                    <p className="text-red-500">Character limit exceeded</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Personalization placeholders: {`{FirstName}`}, {`{LastName}`}, {`{PhoneNumber}`}, {`{Amount}`}, {`{Currency}`}, {`{Category}`}, {`{Date}`}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  onClick={handleSendIndividualMessage}
                  className="flex-1"
                  disabled={messageValidation.exceedsLimit || !activeApiConfig || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                  <Send className="h-4 w-4 mr-2" />
                  )}
                  {!activeApiConfig ? "Configure API First" : "Send Now"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSendMessageDrawerOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>

            {/* Group Messages Tab */}
            <TabsContent value="group" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="group-message-name">Message Name *</Label>
                <Input
                  id="group-message-name"
                  value={groupForm.messageName}
                  onChange={(e) => handleGroupFormChange("messageName", e.target.value)}
                  placeholder="e.g., General Announcement"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-message-type">Message Type *</Label>
                <Select
                  value={groupForm.messageType}
                  onValueChange={(value) => handleGroupFormChange("messageType", value as "simple" | "group")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="simple">Simple: Send to specific members</SelectItem>
                    <SelectItem value="group">Group: Send to predefined groups/departments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {groupForm.messageType === "simple" && (
                <div className="space-y-2">
                  <Label>Select Recipients *</Label>
                  <Popover open={groupRecipientsPopoverOpen} onOpenChange={setGroupRecipientsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between min-h-10 h-auto py-2 px-3"
                        type="button"
                      >
                        <div className="flex flex-wrap gap-1 flex-1 mr-2">
                          {groupForm.recipients.includes("all") ? (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 h-6 flex items-center">  
                              All Members ({members.filter((m: any) => m.phone_number).length})
                            </Badge>
                          ) : groupForm.recipients.length > 0 ? (
                            groupForm.recipients.map((memberId: any) => {
                              const member = members.find((m: any) => m.id === parseInt(memberId))
                              return member ? (
                                <Badge
                                  key={memberId}
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5 h-6 flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{member.first_name} {member.last_name}</span>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGroupFormChange(
                                        "recipients",
                                        groupForm.recipients.filter((id) => id !== memberId)
                                      )
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleGroupFormChange(
                                          "recipients",
                                          groupForm.recipients.filter((id) => id !== memberId)
                                        )
                                      }
                                    }}
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                    onMouseDown={(e) => e.preventDefault()}
                                  >
                                    <X className="h-3 w-3" />
                        </span>
                                </Badge>
                              ) : null
                            })
                          ) : (
                            <span className="text-muted-foreground">Select recipients</span>
                          )}
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[110]" align="start">
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search members..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[200px]">
                        <div className="p-2">
                          <div
                            className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                            onClick={() => {
                              if (groupForm.recipients.includes("all")) {
                                handleGroupFormChange("recipients", [])
                                setGroupRecipientsPopoverOpen(false)
                              } else {
                                handleGroupFormChange("recipients", ["all"])
                                setGroupRecipientsPopoverOpen(false)
                              }
                            }}
                          >
                            <Checkbox
                              checked={groupForm.recipients.includes("all")}
                            />
                            <Label className="cursor-pointer flex-1">
                              All Members ({members.filter((m: any) => m.phone_number).length})
                            </Label>
                          </div>
                          {members
                            .filter((member: any) => member.phone_number)
                            .filter((member: any) =>
                              memberSearchQuery === "" ||
                              `${member.first_name} ${member.last_name}`
                                .toLowerCase()
                                .includes(memberSearchQuery.toLowerCase())
                            )
                            .map((member: any) => (
                              <div
                                key={member.id}
                                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                                onClick={() => {
                                  if (groupForm.recipients.includes("all")) {
                                    handleGroupFormChange("recipients", [member.id.toString()])
                                  } else {
                                    const newRecipients = groupForm.recipients.includes(
                                      member.id.toString()
                                    )
                                      ? groupForm.recipients.filter((id) => id !== member.id.toString())
                                      : [...groupForm.recipients, member.id.toString()]
                                    handleGroupFormChange("recipients", newRecipients)
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={
                                    groupForm.recipients.includes("all") ||
                                    groupForm.recipients.includes(member.id.toString())
                                  }
                                />
                                <Label className="cursor-pointer flex-1">
                                  {member.first_name} {member.last_name} ({member.phone_number})
                                </Label>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {groupForm.messageType === "group" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="group-selection">Select Group/Department *</Label>
                    <Select
                      value={groupForm.groupId || groupForm.departmentId || ""}
                      onValueChange={(value) => {
                        if (groups.find(g => g.id === value)) {
                          handleGroupFormChange("groupId", value)
                          handleGroupFormChange("departmentId", undefined)
                        } else {
                          handleGroupFormChange("departmentId", value)
                          handleGroupFormChange("groupId", undefined)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select group or department" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Groups</div>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <Users className="h-3 w-3 inline mr-2" />
                            {group.name}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Departments</div>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <Building className="h-3 w-3 inline mr-2" />
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="group-template">Template (Optional)</Label>
                <Select
                  value={groupForm.templateId || "none"}
                  onValueChange={(value) => handleGroupFormChange("templateId", value === "none" ? "" : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent className="z-[110]">
                    <SelectItem value="none">None</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-message">Message *</Label>
                <Textarea
                  id="group-message"
                  value={groupForm.message}
                  onChange={(e) => handleGroupFormChange("message", e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  maxLength={160}
                />
                <div className="flex items-center justify-between text-sm">
                  <p className={`${messageValidation.exceedsLimit ? "text-red-500" : "text-muted-foreground"}`}>
                    {messageValidation.length}/160 characters
                  </p>
                  {messageValidation.exceedsLimit && (
                    <p className="text-red-500">Character limit exceeded</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Personalization placeholders: {`{FirstName}`}, {`{LastName}`}, {`{PhoneNumber}`}, {`{Amount}`}, {`{Currency}`}, {`{Category}`}, {`{Date}`}
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="button"
                  onClick={handleSendGroupMessage}
                  className="flex-1"
                  disabled={messageValidation.exceedsLimit || !activeApiConfig || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                  <Send className="h-4 w-4 mr-2" />
                  )}
                  {!activeApiConfig ? "Configure API First" : "Send Now"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSendMessageDrawerOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>


      {/* View Message Dialog */}
      <Dialog open={!!viewingMessage} onOpenChange={(open) => !open && setViewingMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingMessage?.messageName}</DialogTitle>
          </DialogHeader>
          {viewingMessage && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p>{formatDate(viewingMessage.date)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Recipient(s)</Label>
                <p>
                  {Array.isArray(viewingMessage.recipient) 
                    ? `${viewingMessage.recipientCount} recipients: ${viewingMessage.recipient.slice(0, 5).join(", ")}${viewingMessage.recipientCount > 5 ? "..." : ""}`
                    : viewingMessage.recipient}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="whitespace-pre-wrap">{viewingMessage.message}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge 
                  className={
                    (viewingMessage.status === "Sent"
                      ? "bg-green-500"
                      : (viewingMessage as any).status === "Scheduled"
                      ? "bg-orange-500"
                      : "bg-red-500")
                  }
                >
                  {viewingMessage.status}
                </Badge>
              </div>
              {viewingMessage.cost && (
                <div>
                  <Label className="text-muted-foreground">Cost</Label>
                  <p>GH₵ {viewingMessage.cost.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMessage}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}