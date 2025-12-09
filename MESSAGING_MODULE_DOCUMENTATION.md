# Messaging Module - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [UI Structure & Layout](#ui-structure--layout)
3. [Component Specifications](#component-specifications)
4. [Business Logic](#business-logic)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [State Management](#state-management)
8. [User Flows](#user-flows)
9. [Styling & Design System](#styling--design-system)
10. [Functionalities](#functionalities)

---

## Overview

The Messaging Module is a comprehensive SMS messaging system integrated with the Wigal SMS API. It allows organizations to send SMS messages to individual members or groups, manage message templates, configure API settings, and set up automated notifications.

**Key Features:**
- Send SMS messages to individuals or groups
- Message template management
- API configuration management
- Automated notification settings (birthday messages, contribution notifications)
- Message history tracking
- Real-time balance monitoring
- Analytics and reporting

---

## UI Structure & Layout

### Page Layout

The messaging module uses a **single-page application** structure with the following hierarchy:

```
MessagingPageClient (Root Component)
├── Header Section
│   ├── Title: "Messaging" (text-3xl font-bold tracking-tight)
│   └── Description: "Send SMS messages to members and manage templates" (text-muted-foreground)
│
├── Stats Cards Section (grid gap-4 md:grid-cols-3)
│   ├── Balance Card
│   ├── Total Messages Sent Card
│   └── Average Cost Card
│
└── Main Tabs Section (Tabs component)
    ├── Messages Tab
    ├── Templates Tab
    └── Configuration Tab
```

### Main Tabs Structure

**Tab Navigation:**
- Container: `Tabs` component with `value={activeTab}` and `onValueChange={setActiveTab}`
- Tab List: `TabsList` with `className="grid w-full grid-cols-3"`
- Tab Triggers:
  - "Messages" (value: "messages")
  - "Templates" (value: "templates")
  - "Configuration" (value: "configuration")

---

## Component Specifications

### 1. Stats Cards Section

**Layout:** Grid with 3 columns on medium+ screens, 1 column on mobile

**Card Structure:**
```tsx
<Card>
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
```

**Stats Data:**
1. **Balance Card:**
   - Label: "Total Balance Left" (or "Balance (Error)" if error, or "Balance (Configure API)" if no config)
   - Value: 
     - Loading: "Loading..."
     - Error: "Error loading"
     - Success: "GH₵ {balance.cashbalance.toFixed(2)}" or "~GH₵ {estimatedCash} ({bundles.SMS} SMS)"
     - No config: "Not configured"
   - Icon: `DollarSign` (lucide-react)
   - Colors: `text-green-600`, `bg-green-50 dark:bg-green-950`

2. **Total Messages Sent Card:**
   - Label: "Total Messages Sent"
   - Value: Number of messages with status "Sent"
   - Icon: `MessageSquare` (lucide-react)
   - Colors: `text-blue-600`, `bg-blue-50 dark:bg-blue-950`

3. **Average Cost Card:**
   - Label: "Average Cost"
   - Value: "GH₵ {avgCost.toFixed(2)}"
   - Icon: `TrendingUp` (lucide-react)
   - Colors: `text-purple-600`, `bg-purple-50 dark:bg-purple-950`

### 2. Messages Tab

**Layout Structure:**
```
TabsContent value="messages"
├── Send SMS Card
│   ├── CardHeader
│   │   ├── CardTitle: "Send SMS Message"
│   │   └── Button: "Send SMS" (with Send icon)
│   └── CardContent
│       └── Info text or configuration prompt
│
└── Message History Card
    ├── CardHeader
    │   └── CardTitle: "Message History"
    └── CardContent
        └── Table with message history
```

**Send SMS Card:**
- **Header:**
  - Title: "Send SMS Message" (CardTitle)
  - Button: 
    - Text: "Send SMS"
    - Icon: `Send` (h-4 w-4 mr-2)
    - Disabled if no active API config
    - onClick: Opens send message drawer

- **Content:**
  - If no active API config:
    - Warning text: "Please configure your Wigal API settings before sending messages."
    - Button: "Go to Configuration" (outline variant, Settings icon)
  - If active API config exists:
    - Info text: "Click 'Send SMS' to compose and send a new message to members."

**Message History Table:**
- **Columns:**
  1. Date (whitespace-nowrap)
  2. Message Name (font-medium)
  3. Recipient(s) - Shows first 3 recipients or count if > 3
  4. Message (max-w-xs, truncated to 50 chars)
  5. Status (Badge component)
  6. Actions (Eye and Trash icons)

- **Status Badge Colors:**
  - Sent: `bg-green-500 hover:bg-green-600`
  - Failed: `bg-red-500 hover:bg-red-600`

- **Empty State:**
  - Colspan 6, centered
  - Text: "No messages yet"

### 3. Templates Tab

**Layout:** Two-column grid (400px left, 1fr right on large screens)

**Left Column - Template Form:**
```
Card
├── CardHeader
│   └── CardTitle: "Add Template" or "Edit Template"
└── CardContent
    └── Form
        ├── Name Input (required, maxLength 100)
        ├── Message Textarea (required, rows 6, maxLength 160)
        ├── Character Counter: "{length}/160 characters"
        ├── Placeholders Info Box
        └── Action Buttons
```

**Form Fields:**
- **Name Input:**
  - Label: "Name *"
  - Placeholder: "e.g., Service Reminder"
  - Required, maxLength: 100
  - Disabled during create/update operations

- **Message Textarea:**
  - Label: "Message *"
  - Placeholder: "Type your message template here..."
  - Rows: 6
  - Required, maxLength: 160
  - Character counter below: "{length}/160 characters"
  - Disabled during create/update operations

- **Placeholders Info Box:**
  - Background: `bg-muted`
  - Padding: `p-4`
  - Rounded: `rounded-lg`
  - Content:
    - Title: "Available Placeholders:" (text-sm font-semibold)
    - List:
      - `{firstName}` - Member's first name
      - `{lastName}` - Member's last name
      - `{fullName}` - Member's full name

- **Action Buttons:**
  - Primary: "Create" or "Update" (flex-1)
  - Secondary: "Cancel" (only shown when editing, outline variant)

**Right Column - Templates Table:**
```
Card
├── CardHeader
│   └── CardTitle: "Message Templates"
└── CardContent
    └── Loading/Empty/Templates Table
```

**Table Columns:**
1. Name (font-medium)
2. Message (max-w-[300px] truncate)
3. Actions (Use, Edit, Delete buttons)

**Action Buttons:**
- **Use Button:**
  - Variant: outline
  - Size: sm
  - Text: "Use"
  - onClick: Populates template in send message form and opens drawer

- **Edit Button:**
  - Variant: outline
  - Size: sm
  - Icon: `Edit` (h-4 w-4)
  - onClick: Loads template into form

- **Delete Button:**
  - Variant: outline
  - Size: sm
  - Icon: `Trash2` (h-4 w-4 text-red-500)
  - Shows spinner when deleting

**Empty State:**
- Icon: `MessageSquare` (h-12 w-12 text-muted-foreground)
- Text: "No templates yet. Create your first template!"

**Loading State:**
- Icon: `Loader2` (h-12 w-12 animate-spin)
- Text: "Loading templates..."

### 4. Configuration Tab

**Sub-tabs Structure:**
```
TabsContent value="configuration"
└── Tabs (nested)
    ├── TabsList
    │   ├── "API Settings"
    │   └── "Notifications"
    └── TabsContent
```

#### API Settings Sub-tab

**Layout:** Two-column grid (400px left, 1fr right)

**Left Column - API Configuration Form:**
```
Card
├── CardHeader
│   └── CardTitle: "Add API Configuration" or "Edit API Configuration"
└── CardContent
    └── Form
        ├── Name Input
        ├── Username Input
        ├── API Key Input (type="password")
        ├── Sender ID Input
        ├── Active Checkbox
        └── Action Buttons
```

**Form Fields:**
- **Name:** Required, placeholder: "e.g., Production API"
- **Username:** Required, placeholder: "Enter username"
- **API Key:** Required, type="password", placeholder: "Enter API key"
- **Sender ID:** Required, placeholder: "Enter sender ID"
- **Active Checkbox:**
  - Label: "Set as active configuration"
  - Cursor: pointer
  - When checked, deactivates all other configs

**Right Column - API Configurations Table:**
```
Card
├── CardHeader
│   └── CardTitle: "API Configurations"
└── CardContent
    └── Loading/Empty/Configurations Table
```

**Table Columns:**
1. Name (font-medium)
2. Sender ID
3. API Key (masked: first 4 chars as bullets, last 4 visible)
4. Status (Badge: Active = green-500, Inactive = gray-500)
5. Actions (Edit, Delete)

**Table Row Styling:**
- Active configs: `bg-green-50 dark:bg-green-950`

**Empty State:**
- Icon: `Settings` (h-12 w-12)
- Text: "No API configurations yet. Add your first configuration to start sending messages."

#### Notifications Sub-tab

**Layout:** Vertical stack of cards

**Birthday Messages Card:**
```
Card
├── CardHeader
│   └── CardTitle: "Birthday Messages"
└── CardContent
    ├── Toggle Switch
    │   ├── Label: "Enable Birthday Messages"
    │   └── Description: "Automatically send birthday messages to members"
    └── Template Select (shown when enabled)
        ├── Label: "Select Template"
        └── Select dropdown with templates
```

**Contribution Notifications Card:**
```
Card
├── CardHeader
│   └── CardTitle: "Contribution Notifications"
└── CardContent
    ├── Toggle Switch
    │   ├── Label: "Enable Contribution Notifications"
    │   └── Description: "Automatically notify members when contributions are recorded"
    └── Template Select (shown when enabled)
        ├── Label: "Select Template (Optional)"
        └── Select dropdown with templates
        └── Info text about default template and placeholders
```

**Event Notifications Card:**
```
Card
├── CardHeader
│   ├── Bell icon
│   ├── CardTitle: "Event Notifications"
│   └── Toggle Switch (in header)
└── CardContent
    ├── Info text
    └── Template Select (shown when enabled)
```

### 5. Send Message Drawer (Sheet)

**Trigger:** "Send SMS" button in Messages tab

**Sheet Properties:**
- Width: `w-full sm:max-w-2xl`
- Overflow: `overflow-y-auto`
- Open state: `sendMessageDrawerOpen`

**Structure:**
```
SheetContent
├── SheetHeader
│   ├── SheetTitle: "Send SMS Message"
│   └── Warning Banner (if no active API config)
└── Tabs (nested)
    ├── TabsList (grid-cols-2)
    │   ├── "Individual Messages"
    │   └── "Group Messages"
    └── TabsContent
```

#### Individual Messages Tab

**Form Fields:**
1. **Message Name:**
   - Label: "Message Name *"
   - Placeholder: "e.g., Sunday Service Reminder"
   - maxLength: 100

2. **Recipient Selection:**
   - Label: "Select Recipient *"
   - Component: Popover with searchable member list
   - Popover trigger: Button with selected member name or "Search and select a member"
   - Popover content:
     - Search input with Search icon
     - Scrollable list (h-[200px])
     - Each item shows: name and phone number
     - Click to select

3. **Template Selection:**
   - Label: "Template (Optional)"
   - Select dropdown with "None" and template list
   - When selected, populates message field

4. **Message:**
   - Label: "Message *"
   - Textarea, rows: 4, maxLength: 160
   - Character counter: "{length}/160 characters"
   - Placeholder info: Available placeholders listed

5. **Action Buttons:**
   - Primary: "Send Now" or "Configure API First" (disabled if no API config)
   - Secondary: "Cancel"

#### Group Messages Tab

**Form Fields:**
1. **Message Name:** Same as individual

2. **Message Type:**
   - Label: "Message Type *"
   - Select: "Simple: Send to specific members" or "Group: Send to predefined groups/departments"

3. **Recipients (Simple Type):**
   - Label: "Select Recipients *"
   - Popover with:
     - "All Members" checkbox option
     - Searchable member list with checkboxes
     - Selected members shown as badges with X to remove

4. **Group/Department Selection (Group Type):**
   - Label: "Select Group/Department *"
   - Select with grouped options:
     - Groups section (Users icon)
     - Departments section (Building icon)

5. **Template Selection:** Same as individual

6. **Message:** Same as individual

7. **Action Buttons:** Same as individual

### 6. View Message Dialog

**Trigger:** Eye icon in message history table

**Dialog Structure:**
```
DialogContent (max-w-2xl)
├── DialogHeader
│   └── DialogTitle: {messageName}
└── Content
    ├── Date
    ├── Recipient(s)
    ├── Message (whitespace-pre-wrap)
    ├── Status (Badge)
    └── Cost (if available)
```

### 7. Delete Confirmation Dialog

**Trigger:** Trash icon in message history table

**Dialog Structure:**
```
DialogContent
├── DialogHeader
│   ├── DialogTitle: "Delete Message"
│   └── DialogDescription: "Are you sure you want to delete this message? This action cannot be undone."
└── DialogFooter
    ├── Cancel Button (outline)
    └── Delete Button (destructive)
```

---

## Business Logic

### 1. Message Sending Flow

**Process:**
1. User fills out message form (individual or group)
2. Validation:
   - Message name required
   - Recipient(s) required
   - Message required
   - Message length ≤ 160 characters
   - Active API config must exist

3. If validation passes:
   - Create message record in database (status: "Draft")
   - Create recipient records for each recipient
   - If not scheduled, update status to "Sending"
   - Batch recipients into groups of 100
   - For each batch:
     - Personalize messages if placeholders exist
     - Format phone numbers for Wigal API
     - Send via `/api/messaging/send-sms`
     - Update recipient status (Sent/Failed)
   - Update message status based on batch results
   - Show success/error toast

**Personalization Logic:**
- Checks if message contains placeholders: `/\{[a-zA-Z_]+\}/gi`
- If placeholders exist, fetches member data
- Replaces placeholders:
  - `{FirstName}` or `{first_name}` → member first name
  - `{LastName}` or `{last_name}` → member last name
  - `{PhoneNumber}` → formatted phone number
  - `{Amount}` → contribution amount
  - `{Currency}` → organization currency
  - `{Category}` → contribution category
  - `{Date}` → formatted date

**Phone Number Formatting:**
- Remove whitespace
- Remove "+" prefix
- If starts with "0", replace with "233"
- If doesn't start with "233", add it
- Final format: `233XXXXXXXXX`

**Cost Calculation:**
- Formula: `recipientCount * Math.ceil(messageLength / 160) * 0.10`
- Assumes GH₵0.10 per SMS, 160 characters per SMS

### 2. Template Management

**Create Template:**
- Name must be unique per organization
- Message max 160 characters
- Creates record in `messaging_templates` table

**Update Template:**
- Updates name and/or message
- Maintains same ID

**Delete Template:**
- Soft delete (cascade handled by database)
- Cannot delete if used in notification settings

**Use Template:**
- Populates message field in send form
- Opens send message drawer if not already open

### 3. API Configuration Management

**Create Configuration:**
- If set as active, deactivates all other configs
- Stores API key (should be encrypted in production)
- Creates record in `messaging_api_configurations` table

**Update Configuration:**
- If setting as active, deactivates all others
- Can update any field

**Delete Configuration:**
- Cannot delete if it's the only active config (should show warning)
- Deletes record from database

**Active Configuration:**
- Only one active config per organization
- Used for all message sending
- Required before sending messages

### 4. Notification Settings

**Birthday Messages:**
- Toggle to enable/disable
- When enabled, shows template selector
- Messages sent automatically at 6:00 AM on birthdays
- Uses selected template or default

**Contribution Notifications:**
- Toggle to enable/disable
- When enabled, shows template selector
- Default template: "Hello {FirstName}, Thank you for your contribution of {Amount} {Currency} for {Category}."
- Available placeholders: FirstName, LastName, Amount, Currency, Category, Date

**Event Notifications:**
- Toggle to enable/disable
- Configuration coming soon (placeholder)

### 5. Message History

**Display:**
- Shows last 500 messages (ordered by created_at DESC)
- Displays: Date, Name, Recipients, Message (truncated), Status, Actions
- Recipient display:
  - If array and count > 3: Shows first 3 + "... (X total)"
  - Otherwise: Shows all recipients

**View Message:**
- Opens dialog with full message details
- Shows all recipients
- Shows cost if available

**Delete Message:**
- Confirmation dialog required
- Deletes message and all recipient records (cascade)

### 6. Balance & Analytics

**Balance:**
- Fetched from Wigal API via `/api/messaging/balance`
- Updates every 5 minutes
- Shows:
  - Cash balance (if available)
  - SMS bundle count (if available, converted to estimated cash)
  - Error state if API call fails
  - "Not configured" if no active API config

**Analytics:**
- Calculated from message records
- Metrics:
  - Total messages
  - Sent messages
  - Scheduled messages
  - Failed messages
  - Total cost
  - Average cost per message
  - Messages by status
  - Messages by month
  - Top templates

---

## Database Schema

### Tables

#### 1. messaging_templates
```sql
CREATE TABLE messaging_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_templates_org_name_unique UNIQUE (organization_id, name)
);
```

**Indexes:**
- `idx_messaging_templates_org` on `organization_id`
- `idx_messaging_templates_name` on `name`

#### 2. messaging_api_configurations
```sql
CREATE TABLE messaging_api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL,
  username VARCHAR(255),
  sender_id VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_api_configs_org_name_unique UNIQUE (organization_id, name)
);
```

**Indexes:**
- `idx_messaging_api_configs_org` on `organization_id`
- `idx_messaging_api_configs_active` on `is_active` WHERE `is_active = true`

#### 3. messaging_messages
```sql
CREATE TABLE messaging_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_name VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('individual', 'group', 'department', 'all_members')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Sent', 'Failed', 'Cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_frequency VARCHAR(50) CHECK (recurrence_frequency IN ('Weekly', 'Monthly', 'Yearly')),
  recurrence_end_date DATE,
  template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  api_configuration_id UUID REFERENCES messaging_api_configurations(id) ON DELETE SET NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_messaging_messages_org` on `organization_id`
- `idx_messaging_messages_status` on `status`
- `idx_messaging_messages_scheduled` on `scheduled_at` WHERE `scheduled_at IS NOT NULL`
- `idx_messaging_messages_sent` on `sent_at DESC`
- `idx_messaging_messages_created` on `created_at DESC`
- `idx_messaging_messages_recurring` on `is_recurring, recurrence_frequency` WHERE `is_recurring = true`

#### 4. messaging_message_recipients
```sql
CREATE TABLE messaging_message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('member', 'group', 'department', 'phone_number')),
  recipient_id UUID,
  phone_number VARCHAR(50),
  recipient_name VARCHAR(255),
  personalized_message TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'Sending', 'Sent', 'Failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_messaging_recipients_message` on `message_id`
- `idx_messaging_recipients_status` on `status`
- `idx_messaging_recipients_phone` on `phone_number` WHERE `phone_number IS NOT NULL`
- `idx_messaging_recipients_recipient_id` on `recipient_id` WHERE `recipient_id IS NOT NULL`

#### 5. messaging_notification_settings
```sql
CREATE TABLE messaging_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  birthday_messages_enabled BOOLEAN DEFAULT FALSE,
  birthday_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  contribution_notifications_enabled BOOLEAN DEFAULT FALSE,
  contribution_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  event_notifications_enabled BOOLEAN DEFAULT FALSE,
  event_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_notification_settings_org_unique UNIQUE (organization_id)
);
```

**Indexes:**
- `idx_messaging_notification_settings_org` on `organization_id`

### Triggers

All tables have `updated_at` triggers that automatically update the timestamp on row updates.

---

## API Endpoints

### 1. POST /api/messaging/send-sms

**Purpose:** Send SMS messages via Wigal API

**Request Body:**
```typescript
{
  apiKey: string
  username: string
  senderId: string
  destinations: Array<{
    phone: string
    message: string
    msgid?: string
  }>
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  error?: string
  data?: any
}
```

**Process:**
1. Authenticate user
2. Validate input
3. Format phone numbers for Wigal
4. Call Wigal SMS service
5. Return result

### 2. GET /api/messaging/balance

**Purpose:** Fetch balance from Wigal API

**Query Parameters:**
- `apiConfigId`: UUID of API configuration

**Response:**
```typescript
{
  success: boolean
  data?: {
    cashbalance?: number
    bundles?: {
      SMS?: number
    }
  }
  error?: string
}
```

### 3. POST /api/messaging/test-connection

**Purpose:** Test API connection with Wigal

**Request Body:**
```typescript
{
  apiKey: string
  username: string
  senderId: string
  testPhoneNumber: string
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  error?: string
}
```

---

## State Management

### React Query Hooks

**Query Keys:**
- `["messaging_messages", organizationId]` - All messages
- `["messaging_templates", organizationId]` - All templates
- `["messaging_api_configurations", organizationId]` - All API configs
- `["messaging_api_configurations", organizationId, "active"]` - Active API config
- `["messaging_notification_settings", organizationId]` - Notification settings
- `["messaging_analytics", organizationId]` - Analytics data
- `["messaging_balance", organizationId]` - Balance data

**Mutations:**
- `useSendMessage()` - Send SMS
- `useCreateMessagingTemplate()` - Create template
- `useUpdateMessagingTemplate()` - Update template
- `useDeleteMessagingTemplate()` - Delete template
- `useCreateAPIConfiguration()` - Create API config
- `useUpdateAPIConfiguration()` - Update API config
- `useDeleteAPIConfiguration()` - Delete API config
- `useTestAPIConnection()` - Test connection
- `useDeleteMessage()` - Delete message
- `useUpdateNotificationSettings()` - Update notification settings

### Local State

**Component State:**
- `activeTab`: "messages" | "templates" | "configuration"
- `configSubTab`: "api" | "notifications"
- `sendMessageDrawerOpen`: boolean
- `sendMessageTab`: "individual" | "group"
- `editingTemplate`: Template | null
- `editingTemplateId`: string | null
- `editingApiConfig`: APIConfiguration | null
- `editingApiConfigId`: string | null
- `viewingMessage`: Message | null
- `deleteDialogOpen`: boolean
- `messageToDelete`: Message | null
- `memberSearchQuery`: string
- `individualRecipientSearch`: string
- `showApiKey`: boolean
- `recipientPopoverOpen`: boolean
- `groupRecipientsPopoverOpen`: boolean

**Form State:**
- `individualForm`: IndividualMessageForm
- `groupForm`: GroupMessageForm
- `templateForm`: TemplateForm
- `apiConfigForm`: APIConfigurationForm

---

## User Flows

### Flow 1: Send Individual Message

1. User navigates to Messaging → Messages tab
2. Clicks "Send SMS" button
3. Drawer opens with "Individual Messages" tab active
4. User fills:
   - Message Name
   - Selects recipient from searchable dropdown
   - (Optional) Selects template
   - Types or edits message
5. System validates:
   - All required fields filled
   - Message ≤ 160 characters
   - Active API config exists
6. User clicks "Send Now"
7. System:
   - Creates message record
   - Personalizes message if placeholders exist
   - Formats phone number
   - Sends via Wigal API
   - Updates status
8. Success toast shown
9. Drawer closes
10. Message appears in history table

### Flow 2: Send Group Message

1. User navigates to Messaging → Messages tab
2. Clicks "Send SMS" button
3. Drawer opens, user switches to "Group Messages" tab
4. User selects message type:
   - Simple: Select specific members
   - Group: Select group/department
5. If Simple:
   - User can select "All Members" or individual members
   - Selected members shown as removable badges
6. If Group:
   - User selects group or department from dropdown
7. User fills message name and message
8. User clicks "Send Now"
9. System processes same as individual, but for multiple recipients
10. Success toast shows recipient count

### Flow 3: Create Template

1. User navigates to Messaging → Templates tab
2. User fills template form:
   - Name (unique per organization)
   - Message (max 160 chars)
3. Character counter updates in real-time
4. User clicks "Create"
5. Template saved and appears in table
6. Success toast shown

### Flow 4: Configure API

1. User navigates to Messaging → Configuration tab
2. User fills API configuration form:
   - Name
   - Username
   - API Key
   - Sender ID
   - (Optional) Check "Set as active"
3. User clicks "Save Configuration"
4. If set as active, other configs deactivated
5. Configuration appears in table
6. Success toast shown

### Flow 5: Enable Birthday Messages

1. User navigates to Messaging → Configuration → Notifications tab
2. User toggles "Enable Birthday Messages" switch
3. Template selector appears
4. User selects template (or leaves as "No template")
5. Settings saved automatically
6. Birthday messages will be sent at 6:00 AM on member birthdays

---

## Styling & Design System

### Color Scheme

**Primary Colors:**
- Primary: `#465fff` (brand-500)
- Success: Green shades (green-50 to green-950)
- Error: Red shades (red-50 to red-950)
- Warning: Yellow shades (yellow-50 to yellow-950)

**Status Colors:**
- Sent: `bg-green-500 hover:bg-green-600`
- Failed: `bg-red-500 hover:bg-red-600`
- Scheduled: `bg-orange-500`
- Active: `bg-green-500`
- Inactive: `bg-gray-500`

**Card Backgrounds:**
- Balance: `bg-green-50 dark:bg-green-950`
- Messages: `bg-blue-50 dark:bg-blue-950`
- Cost: `bg-purple-50 dark:bg-purple-950`

### Typography

**Headings:**
- Page Title: `text-3xl font-bold tracking-tight`
- Card Title: `CardTitle` component (default styling)
- Section Label: `text-sm font-semibold`

**Body Text:**
- Default: Base font size
- Muted: `text-muted-foreground`
- Small: `text-sm`
- Extra Small: `text-xs`

### Spacing

**Grid Gaps:**
- Stats cards: `gap-4`
- Form fields: `space-y-4`
- Button groups: `gap-2`
- Action buttons: `gap-2`

**Padding:**
- Card content: `p-6` (stats), default (forms)
- Form sections: `space-y-4`
- Input groups: `space-y-2`

### Components

**Buttons:**
- Primary: Default variant
- Secondary: Outline variant
- Destructive: Destructive variant
- Icon buttons: Ghost variant, size="icon" or size="sm"

**Inputs:**
- Standard: `Input` component
- Textarea: `Textarea` component, rows vary
- Select: `Select` component with trigger and content

**Badges:**
- Status: Color-coded based on status
- Selected items: Secondary variant

**Icons:**
- Size: `h-4 w-4` (small), `h-5 w-5` (medium), `h-6 w-6` (large)
- Spacing: `mr-2` when with text

### Responsive Design

**Breakpoints:**
- Mobile: Default (single column)
- Medium (`md:`): 2-3 columns for grids
- Large (`lg:`): Full layout with sidebars

**Grid Layouts:**
- Stats: `grid gap-4 md:grid-cols-3`
- Templates/Config: `grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]`
- Tabs: `grid w-full grid-cols-3` or `grid-cols-2`

### Dark Mode

All components support dark mode via:
- `dark:` prefix classes
- CSS variables for colors
- Automatic theme detection

---

## Functionalities

### Core Features

1. **Send SMS Messages**
   - Individual messages
   - Group messages (simple selection or group/department)
   - Message personalization
   - Character limit enforcement (160)
   - Real-time validation

2. **Template Management**
   - Create, edit, delete templates
   - Use templates in messages
   - Character counter
   - Placeholder support

3. **API Configuration**
   - Multiple API configurations
   - Active configuration management
   - Test connection
   - Secure API key storage

4. **Message History**
   - View all sent messages
   - View message details
   - Delete messages
   - Status tracking

5. **Notification Settings**
   - Birthday message automation
   - Contribution notification automation
   - Event notification (placeholder)
   - Template selection for each type

6. **Analytics & Balance**
   - Real-time balance from Wigal API
   - Message statistics
   - Cost tracking
   - Template usage analytics

### Validation Rules

**Message:**
- Name: Required, max 100 characters
- Recipient: Required
- Message: Required, max 160 characters
- Active API config: Required

**Template:**
- Name: Required, unique per organization, max 100 characters
- Message: Required, max 160 characters

**API Configuration:**
- Name: Required, unique per organization
- Username: Required
- API Key: Required
- Sender ID: Required

### Error Handling

**User-Facing Errors:**
- Toast notifications for all errors
- Inline validation messages
- Disabled states for invalid actions
- Clear error messages

**API Errors:**
- Graceful degradation
- Error messages logged to console
- User-friendly error messages
- Retry mechanisms where appropriate

### Performance Optimizations

1. **Query Optimization:**
   - Selective field fetching
   - Query result limits (500 messages)
   - Stale time configuration
   - Garbage collection time

2. **Batch Processing:**
   - Messages sent in batches of 100
   - Sequential batch processing
   - Delay between batches (500ms)

3. **Caching:**
   - React Query caching
   - Stale time: 30s-5min depending on data
   - Automatic refetch on mutations

4. **UI Optimization:**
   - Lazy loading
   - Virtual scrolling for long lists
   - Debounced search
   - Optimistic updates

---

## Implementation Notes

### Phone Number Formatting

The system uses a specific phone number format for Wigal API:
- Input formats accepted: `0XXXXXXXXX`, `+233XXXXXXXXX`, `233XXXXXXXXX`
- Output format: `233XXXXXXXXX` (no spaces, no +, starts with 233)

### Message Personalization

Placeholders are case-insensitive and support multiple formats:
- `{FirstName}`, `{first_name}`, `{firstname}` all work
- Personalization happens at send time
- Member data fetched only if placeholders detected

### Cost Calculation

Current formula: `recipientCount * Math.ceil(messageLength / 160) * 0.10`
- Assumes GH₵0.10 per SMS
- 160 characters per SMS
- Multi-part messages cost more

### API Configuration Security

- API keys stored in database (should be encrypted in production)
- Keys masked in UI (first 4 and last 4 visible)
- Only one active configuration per organization

### Status Flow

Message Status Flow:
1. Draft → Created but not sent
2. Sending → Currently being sent
3. Sent → Successfully sent
4. Failed → Send failed
5. Scheduled → Scheduled for future
6. Cancelled → User cancelled

Recipient Status Flow:
1. Pending → Created but not sent
2. Sending → Currently being sent
3. Sent → Successfully sent
4. Failed → Send failed

---

## Pixel-Perfect UI Specifications

### Exact Measurements

**Stats Cards:**
- Padding: `p-6` (24px)
- Icon container: `p-3` (12px), `rounded-lg`
- Icon size: `h-6 w-6` (24px)
- Label: `text-sm` (14px)
- Value: `text-2xl font-bold` (24px, bold)
- Gap between label and value: `mt-1` (4px)

**Tables:**
- Border: `rounded-md border`
- Cell padding: Default table cell padding
- Action buttons: `gap-2` (8px)
- Badge padding: Default badge padding

**Forms:**
- Field spacing: `space-y-4` (16px between fields)
- Label spacing: `space-y-2` (8px between label and input)
- Input height: Default (h-9 for standard, h-8 for sm)
- Textarea rows: 6 for templates, 4 for messages
- Button spacing: `gap-2` (8px)

**Drawer/Sheet:**
- Width: `w-full sm:max-w-2xl` (full on mobile, 672px on desktop)
- Padding: Default sheet padding
- Header spacing: `mt-4` (16px) for tabs

**Popovers:**
- Width: `w-[var(--radix-popover-trigger-width)]`
- Max height: `h-[200px]` for scrollable content
- Search input: `pl-8` (32px left padding for icon)
- Item padding: `p-2` (8px)

**Badges:**
- Selected members: `text-xs px-2 py-0.5 h-6`
- Status badges: Default badge styling with color variants

### Icon Sizes

- Small: `h-4 w-4` (16px) - Used in buttons, table actions
- Medium: `h-5 w-5` (20px) - Used in headers, form fields
- Large: `h-6 w-6` (24px) - Used in stats cards, empty states
- Extra Large: `h-12 w-12` (48px) - Used in loading/empty states

### Border Radius

- Cards: Default card radius
- Buttons: `rounded-md` (6px) or `rounded-lg` (8px)
- Inputs: Default input radius
- Badges: Default badge radius
- Popovers: Default popover radius

### Shadows

- Cards: Default card shadow
- Buttons: Default button shadow
- Popovers: Default popover shadow
- Dialogs: Default dialog shadow

---

## Conclusion

This documentation provides a complete specification for replicating the Messaging Module. All UI components, business logic, database schema, API endpoints, and user flows are detailed to enable pixel-perfect replication.

For any additional details or clarifications, refer to the source code in:
- `src/app/(dashboard)/dashboard/messaging/messaging-page-client.tsx`
- `src/hooks/messaging/`
- `src/app/api/messaging/`
- `supabase/migrations/20240201000008_create_messaging_tables.sql`

