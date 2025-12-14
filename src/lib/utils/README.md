# Utility Libraries

This directory contains reusable utility functions and helpers used across the application.

## Error Handling (`error-handler.ts`)

Provides consistent error handling and logging with optional Sentry integration.

### Usage

```typescript
import { logError, handleApiError, createError } from "@/lib/utils/error-handler";

// Log an error with context
logError(error, {
  userId: "user-123",
  organizationId: "org-456",
  action: "create_record",
}, "high");

// Handle API errors consistently
const message = handleApiError(error, "Operation failed");

// Create a standardized error
const error = createError("Something went wrong", context, "critical");
```

## Logging (`logger.ts`)

Structured logging utilities with severity levels and context support.

### Usage

```typescript
import { logger } from "@/lib/utils/logger";

// Log with different levels
logger.debug("Debug message", { userId: "123" });
logger.info("Info message", { organizationId: "456" });
logger.warn("Warning message");
logger.error("Error message", error, { context });

// Log performance
logger.performance("Database query", 150, { table: "users" });

// Log API requests/responses
logger.apiRequest("POST", "/api/users");
logger.apiResponse("POST", "/api/users", 200, 150);
```

## Transactions (`transactions.ts`)

Utilities for handling multi-step database operations with rollback support.

### Usage

```typescript
import { executeWithRollback, createDeleteRollback } from "@/lib/utils/transactions";

const result = await executeWithRollback([
  {
    name: "Create record",
    execute: async () => {
      const { data, error } = await supabase.from("table").insert({...});
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    },
    rollback: createDeleteRollback(supabase, "table", createdRecord),
  },
]);
```

## Performance Monitoring (`../middleware/performance-monitor.ts`)

Middleware for tracking API route performance.

### Usage

```typescript
import { withPerformanceMonitoring } from "@/lib/middleware/performance-monitor";

export const POST = withPerformanceMonitoring(async (request) => {
  // Your route handler
}, {
  slowThreshold: 1000, // Log warning if > 1s
});
```

### Measure Function Performance

```typescript
import { measurePerformance } from "@/lib/middleware/performance-monitor";

const result = await measurePerformance(
  "Database query",
  async () => {
    return await supabase.from("table").select("*");
  },
  { table: "users" }
);
```

