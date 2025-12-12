import { ORGANIZATION_TYPES } from "@/lib/constants"

/**
 * Get the display label for an organization type
 * @param type - The organization type value (e.g., 'church', 'association', 'nonprofit', 'other')
 * @returns The display label (e.g., 'Church', 'Association', 'Non-profit Organization', 'Other')
 */
export function getOrganizationTypeLabel(type: string | null | undefined): string {
  if (!type) return "Organization"
  
  const orgType = ORGANIZATION_TYPES.find((ot) => ot.value === type)
  return orgType?.label || "Organization"
}

/**
 * Get the lowercase version of the organization type for use in sentences
 * @param type - The organization type value
 * @returns The lowercase display label (e.g., 'church', 'association', 'non-profit organization', 'other')
 */
export function getOrganizationTypeLabelLowercase(type: string | null | undefined): string {
  return getOrganizationTypeLabel(type).toLowerCase()
}

