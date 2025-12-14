import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refreshing the auth token
  // Wrap in try-catch to handle Edge Runtime fetch failures gracefully
  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    // Edge Runtime fetch failures are common - log but don't block
    // The page-level auth checks will handle authentication
    if (process.env.NODE_ENV === 'development') {
      console.error('Middleware auth check failed (Edge Runtime):', error)
    }
    // Continue without user - let page handle auth
  }

  // Protected routes - require authentication
  const protectedRoutes = ['/dashboard', '/setup-organization']
  const authRoutes = ['/signin', '/signup', '/forgot-password', '/reset-password']
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    // Redirect to signin if not authenticated
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    // Preserve the intended destination for redirect after login
    if (request.nextUrl.pathname !== '/signin') {
      url.searchParams.set('redirect', request.nextUrl.pathname)
    }
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    // Redirect authenticated users away from auth pages
    // Check if they have an organization first
    try {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if ((session as any)?.organization_id) {
        // User has an organization, redirect to dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      } else {
        // User doesn't have an organization, redirect to setup
        const url = request.nextUrl.clone()
        url.pathname = '/setup-organization'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If we can't check, redirect to setup organization
      // The dashboard layout will handle organization checks
      const url = request.nextUrl.clone()
      url.pathname = '/setup-organization'
      return NextResponse.redirect(url)
    }
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // If user is authenticated and trying to access setup-organization, check if they already have an org
  // Optimized: Use exists check instead of full select for better performance
  if (user && request.nextUrl.pathname === '/setup-organization') {
    try {
      const { count } = await supabase
        .from('organization_users')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .limit(1)
      
      // If user already has an organization, redirect to dashboard
      if (count && count > 0) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If check fails (Edge Runtime issue), let them proceed - dashboard will handle it
      console.error('Middleware setup check failed:', error)
    }
  }

  return supabaseResponse
}

