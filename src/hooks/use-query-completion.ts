"use client"

import { useMemo } from "react"
import type { UseQueryResult } from "@tanstack/react-query"

/**
 * Determines if a React Query query has completed (success or error)
 * A query is complete when it has finished fetching, regardless of success/error
 * Uses React Query v5 status properties
 */
export function isQueryComplete<TData, TError>(
  query: UseQueryResult<TData, TError>
): boolean {
  // Query is complete if:
  // 1. It has succeeded (isSuccess) - query completed successfully
  // 2. It has errored (isError) - query completed with error
  // 3. It has data AND fetchStatus is idle - query completed and has data
  // 4. fetchStatus is 'idle' AND not loading/pending - query finished fetching
  
  // If query is explicitly success or error, it's complete
  if (query.isSuccess || query.isError) {
    return true
  }
  
  // If query has data and fetchStatus is idle, it's complete
  // This handles cached data and completed queries
  if (query.data !== undefined && query.fetchStatus === 'idle') {
    return true
  }
  
  // If fetchStatus is idle and not loading/pending, query is complete
  // This handles queries that finished but returned undefined/null/empty
  // BUT: if query is disabled (never started), fetchStatus might be idle but query isn't complete
  // So we also check that it's not pending (which means it's waiting to start)
  if (query.fetchStatus === 'idle' && !query.isLoading && !query.isPending) {
    // If query has never been attempted (disabled), it's not complete
    // Check if query has been attempted by checking status
    // In React Query v5, status can be 'pending', 'error', or 'success'
    // If status is 'pending' and fetchStatus is 'idle', query is disabled
    const status = (query as any).status
    if (status === 'pending' && query.fetchStatus === 'idle') {
      // Query is disabled, not complete
      return false
    }
    return true
  }
  
  // Otherwise, query is still in progress
  return false
}

/**
 * Hook to check if multiple queries have all completed
 * Returns true only when ALL queries have finished (success or error)
 */
export function useQueriesCompletion(
  queries: UseQueryResult<any, any>[]
): boolean {
  // If no queries, consider complete
  if (queries.length === 0) return true
  
  // Check if all queries are complete
  // This will re-run whenever any query state changes (React Query handles reactivity)
  const allComplete = queries.every(query => isQueryComplete(query))
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[useQueriesCompletion] Checking completion:', {
      count: queries.length,
      states: queries.map(q => ({
        isSuccess: q.isSuccess,
        isError: q.isError,
        isLoading: q.isLoading,
        isPending: q.isPending,
        fetchStatus: q.fetchStatus,
        hasData: q.data !== undefined
      })),
      allComplete
    })
  }
  
  return allComplete
}

/**
 * Hook to check if any of the queries are still loading
 */
export function useQueriesLoading(
  queries: UseQueryResult<any, any>[]
): boolean {
  return useMemo(() => {
    // If no queries, not loading
    if (queries.length === 0) return false
    
    // Check if any query is loading or pending
    return queries.some(
      query => query.isLoading || query.isPending || query.fetchStatus === 'fetching'
    )
  }, [queries])
}

