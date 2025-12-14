import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') // email confirmation type
  const origin = requestUrl.origin

  if (!code) {
    // No code provided, redirect to signin
    return NextResponse.redirect(new URL('/signin', origin))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Auth callback error:', error)
      }
      // Redirect to signin with error message
      const signInUrl = new URL('/signin', origin)
      signInUrl.searchParams.set('error', 'auth_failed')
      return NextResponse.redirect(signInUrl)
    }

    if (!data?.user) {
      // No user data, redirect to signin
      const signInUrl = new URL('/signin', origin)
      return NextResponse.redirect(signInUrl)
    }

    // Check if this is an email confirmation by checking if user just confirmed email
    // or if type parameter indicates email confirmation
    const isEmailConfirmation = type === 'signup' || type === 'email' || type === 'recovery'
    
    // Also check if user has an organization_users link
    // If they don't, they likely just confirmed email and should set up organization
    const { data: orgUsers } = await supabase
      .from('organization_users')
      .select('id')
      .eq('user_id', data.user.id)
      .limit(1)

    const hasOrganization = orgUsers && orgUsers.length > 0

    // For signup email confirmations, redirect to setup-organization if they don't have one
    if (type === 'signup' && !hasOrganization) {
      return NextResponse.redirect(new URL('/setup-organization', origin))
    }

    // For password recovery, always redirect to signin
    if (type === 'recovery') {
      const signInUrl = new URL('/signin', origin)
      signInUrl.searchParams.set('confirmed', 'true')
      return NextResponse.redirect(signInUrl)
    }

    // For other email confirmations without organization, redirect to setup-organization
    if (isEmailConfirmation && !hasOrganization && type !== 'recovery') {
      return NextResponse.redirect(new URL('/setup-organization', origin))
    }

    // For OAuth flows where user has organization, redirect to dashboard
    if (hasOrganization) {
      return NextResponse.redirect(new URL('/dashboard', origin))
    }

    // Default: redirect to signin
    const signInUrl = new URL('/signin', origin)
    return NextResponse.redirect(signInUrl)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Unexpected error in auth callback:', error)
    }
    // Redirect to signin on unexpected errors
    const signInUrl = new URL('/signin', origin)
    signInUrl.searchParams.set('error', 'unexpected_error')
    return NextResponse.redirect(signInUrl)
  }
}

