/**
 * Transaction Utilities
 * Provides helper functions for handling multi-step database operations
 * with proper rollback mechanisms
 */

import { SupabaseClient } from "@supabase/supabase-js"

export interface TransactionResult<T> {
  success: boolean
  data?: T
  error?: string
  rollbackActions?: Array<() => Promise<void>>
}

/**
 * Execute a transaction-like operation with rollback support
 * Since Supabase client doesn't support true transactions,
 * this provides a manual rollback mechanism for multi-step operations
 */
export async function executeWithRollback<T>(
  operations: Array<{
    name: string
    execute: () => Promise<{ success: boolean; data?: any; error?: string }>
    rollback?: () => Promise<void>
  }>
): Promise<TransactionResult<T>> {
  const executedOperations: Array<{ name: string; rollback?: () => Promise<void> }> = []

  try {
    for (const operation of operations) {
      const result = await operation.execute()

      if (!result.success) {
        // Rollback executed operations in reverse order
        for (let i = executedOperations.length - 1; i >= 0; i--) {
          const op = executedOperations[i]
          if (op.rollback) {
            try {
              await op.rollback()
              console.log(`Rolled back operation: ${op.name}`)
            } catch (rollbackError) {
              console.error(`Error rolling back operation ${op.name}:`, rollbackError)
            }
          }
        }

        return {
          success: false,
          error: result.error || `Operation ${operation.name} failed`,
        }
      }

      // Track this operation for potential rollback
      executedOperations.push({
        name: operation.name,
        rollback: operation.rollback,
      })
    }

    // All operations succeeded
    const lastResult = operations[operations.length - 1]
    return {
      success: true,
      data: (lastResult as any).data,
      rollbackActions: executedOperations
        .map((op) => op.rollback)
        .filter((r): r is () => Promise<void> => !!r)
        .reverse(),
    }
  } catch (error) {
    // Rollback executed operations in reverse order
    for (let i = executedOperations.length - 1; i >= 0; i--) {
      const op = executedOperations[i]
      if (op.rollback) {
        try {
          await op.rollback()
          console.log(`Rolled back operation: ${op.name}`)
        } catch (rollbackError) {
          console.error(`Error rolling back operation ${op.name}:`, rollbackError)
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Helper to create a rollback function for deleting a record
 */
export function createDeleteRollback<T extends { id: string }>(
  supabase: SupabaseClient,
  tableName: string,
  record: T | null
): (() => Promise<void>) | undefined {
  if (!record?.id) return undefined

  return async () => {
    const { error } = await supabase.from(tableName).delete().eq("id", record.id)
    if (error) {
      console.error(`Error during rollback delete from ${tableName}:`, error)
      throw error
    }
  }
}

/**
 * Helper to create a rollback function for updating a record
 */
export function createUpdateRollback<T extends { id: string }>(
  supabase: SupabaseClient,
  tableName: string,
  record: T | null,
  previousValues: Partial<T>
): (() => Promise<void>) | undefined {
  if (!record?.id || !previousValues) return undefined

  return async () => {
    const { error } = await supabase
      .from(tableName)
      .update(previousValues)
      .eq("id", record.id)
    if (error) {
      console.error(`Error during rollback update in ${tableName}:`, error)
      throw error
    }
  }
}

