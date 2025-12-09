export const APP_NAME = 'Circlify Management System'
export const APP_DESCRIPTION = 'Comprehensive management platform for churches, associations, and clubs'

export const ORGANIZATION_TYPES = [
  { value: 'church', label: 'Church' },
  { value: 'association', label: 'Association' },
  { value: 'club', label: 'Club' },
  { value: 'nonprofit', label: 'Non-profit Organization' },
  { value: 'other', label: 'Other' },
]

export const ORGANIZATION_SIZES = [
  { value: '1-50', label: '1-50 members' },
  { value: '51-100', label: '51-100 members' },
  { value: '101-250', label: '101-250 members' },
  { value: '251-500', label: '251-500 members' },
  { value: '501-1000', label: '501-1,000 members' },
  { value: '1001-2000', label: '1,001-2,000 members' },
  { value: '2000+', label: '2,000+ members' },
]

export const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'EUR', label: 'EUR - Euro (€)' },
  { value: 'GBP', label: 'GBP - British Pound (£)' },
  { value: 'CAD', label: 'CAD - Canadian Dollar (C$)' },
  { value: 'AUD', label: 'AUD - Australian Dollar (A$)' },
  { value: 'NGN', label: 'NGN - Nigerian Naira (₦)' },
  { value: 'GHS', label: 'GHS - Ghanaian Cedi (GH₵)' },
  { value: 'ZAR', label: 'ZAR - South African Rand (R)' },
  { value: 'KES', label: 'KES - Kenyan Shilling (KSh)' },
  { value: 'INR', label: 'INR - Indian Rupee (₹)' },
  { value: 'JPY', label: 'JPY - Japanese Yen (¥)' },
  { value: 'CNY', label: 'CNY - Chinese Yuan (¥)' },
]

export const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Members',
    href: '/dashboard/members',
    icon: 'Users',
  },
  {
    title: 'Finance',
    href: '/dashboard/finance',
    icon: 'DollarSign',
  },
  {
    title: 'Assets',
    href: '/dashboard/assets',
    icon: 'Package',
  },
  {
    title: 'Messaging',
    href: '/dashboard/messaging',
    icon: 'MessageSquare',
  },
  {
    title: 'Events',
    href: '/dashboard/events',
    icon: 'Calendar',
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: 'FileText',
  },
]

