// Kidz Church Module Hooks - Barrel Export

export {
    useChildren,
    useChildrenPaginated,
    useChildrenByStatus,
    useChild,
    useCreateChild,
    useUpdateChild,
    useDeleteChild,
    useChildStatistics,
} from "./useChildren"

export {
    useChildAttendance,
    useAttendanceByDate,
    useAllAttendanceRecords,
    useCheckInChild,
    useCheckOutChild,
    useUpdateAttendance,
    useDeleteChildAttendance,
    useTodayAttendanceSummary,
    useBulkUpsertAttendance,
    useBulkDeleteAttendance,
    useDeleteAttendanceSession,
} from "./useChildAttendance"

// Child Attendance Summary hooks
export {
    useChildAttendanceSummaries,
    useCreateChildAttendanceSummary,
    useUpdateChildAttendanceSummary,
    useDeleteChildAttendanceSummary,
    useUpsertChildAttendanceSummary,
} from "./useChildAttendanceSummary"

export {
    useChildClassGroups,
    useCreateChildClassGroup,
    useUpdateChildClassGroup,
    useDeleteChildClassGroup,
    useClassGroupOptions,
} from "./useChildClassGroups"
