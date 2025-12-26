import * as XLSX from 'xlsx'

/**
 * Generate a sample Excel file for member import
 */
export function generateMemberSampleExcel(): void {
  const headers = [
    'first_name',
    'last_name',
    'middle_name',
    'email',
    'phone_number',
    'secondary_phone',
    'gender',
    'date_of_birth',
    'marital_status',
    'spouse_name',
    'number_of_children',
    'occupation',
    'address',
    'city',
    'town',
    'region',
    'digital_address',
    'join_date',
    'membership_status',
    'notes'
  ]

  // Create sample data row
  const sampleData = [
    [
      'John',
      'Doe',
      'Michael',
      'john.doe@example.com',
      '0244123456',
      '0201234567',
      'Male',
      '1990-01-15',
      'Married',
      'Jane Doe',
      '2',
      'Engineer',
      '123 Main Street',
      'Accra',
      'East Legon',
      'Greater Accra',
      'GA-123-4567',
      '2024-01-01',
      'active',
      'Sample member notes'
    ]
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }))
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Members')

  // Generate file and download
  XLSX.writeFile(wb, 'member-import-template.xlsx')
}

/**
 * Generate a sample Excel file for visitor import
 */
export function generateVisitorSampleExcel(): void {
  const headers = [
    'first_name',
    'last_name',
    'middle_name',
    'email',
    'phone_number',
    'secondary_phone',
    'gender',
    'date_of_birth',
    'marital_status',
    'spouse_name',
    'number_of_children',
    'occupation',
    'address',
    'city',
    'town',
    'region',
    'digital_address',
    'visit_date',
    'source',
    'status',
    'invited_by',
    'interests',
    'notes',
    'follow_up_required',
    'follow_up_date'
  ]

  // Create sample data row
  const sampleData = [
    [
      'Jane',
      'Smith',
      'Elizabeth',
      'jane.smith@example.com',
      '0244987654',
      '0209876543',
      'Female',
      '1992-05-20',
      'Single',
      '',
      '0',
      'Teacher',
      '456 Oak Avenue',
      'Kumasi',
      'Asokwa',
      'Ashanti',
      'AS-456-7890',
      '2024-01-15',
      'Walk-in',
      'New',
      'John Doe',
      'Youth Ministry, Music',
      'Sample visitor notes',
      'true',
      '2024-01-22'
    ]
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }))
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Visitors')

  // Generate file and download
  XLSX.writeFile(wb, 'visitor-import-template.xlsx')
}

/**
 * Parse Excel file and return data as array of objects
 */
export function parseExcelFile(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as Record<string, any>[]
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Failed to parse Excel file: ' + (error instanceof Error ? error.message : 'Unknown error')))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Generate a sample Excel file for child import
 */
export function generateChildSampleExcel(): void {
  const headers = [
    'first_name',
    'last_name',
    'phone_number',
    'gender',
    'date_of_birth',
    'photo',
    'mother_name',
    'father_name',
    'guardian_name',
    'guardian_relationship',
    'medical_info',
    'allergies',
    'special_needs',
    'emergency_contact_name',
    'emergency_contact_phone',
    'enrolled_date',
    'status',
    'class_group',
    'notes'
  ]

  // Create sample data row
  const sampleData = [
    [
      'Sam',
      'Doe',
      '0244123456',
      'Male',
      '2015-05-10',
      '',
      'Jane Doe',
      'John Doe',
      '',
      '',
      'None',
      'Peanuts',
      'None',
      'Jane Doe',
      '0201234567',
      '2024-01-01',
      'active',
      'Elementary',
      'Sample child notes'
    ]
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

  // Set column widths
  const colWidths = headers.map(() => ({ wch: 20 }))
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Children')

  // Generate file and download
  XLSX.writeFile(wb, 'child-import-template.xlsx')
}

