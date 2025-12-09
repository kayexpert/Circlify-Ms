import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()

  // Redirect to signin page
  return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}

export async function GET() {
  const supabase = await createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()

  // Redirect to signin page
  return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}

