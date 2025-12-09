/**
 * Attendance API Service
 * Handles all attendance-related API calls
 * Prepared for backend integration
 */

import { api } from "@/lib/api";

export interface AttendanceRecord {
  id: string;
  date: string;
  service_type: string;
  total_attendance: number;
  men?: number;
  women?: number;
  children?: number;
  first_timers?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface CreateAttendanceRequest {
  date: string;
  service_type: string;
  total_attendance: number;
  men?: number;
  women?: number;
  children?: number;
  first_timers?: number;
  notes?: string;
}

export interface UpdateAttendanceRequest extends Partial<CreateAttendanceRequest> {
  id: string;
}

export interface AttendanceResponse {
  data: AttendanceRecord[];
  total: number;
  page?: number;
  limit?: number;
}

class AttendanceService {
  private basePath = "/attendance";

  /**
   * Get all attendance records with optional filters
   */
  async getAttendanceRecords(params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    service_type?: string;
  }): Promise<AttendanceResponse> {
    const response = await api.get<AttendanceResponse>(this.basePath, { params });
    return response.data;
  }

  /**
   * Get a single attendance record by ID
   */
  async getAttendanceRecord(id: string): Promise<AttendanceRecord> {
    const response = await api.get<AttendanceRecord>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new attendance record
   */
  async createAttendanceRecord(data: CreateAttendanceRequest): Promise<AttendanceRecord> {
    const response = await api.post<AttendanceRecord>(this.basePath, data);
    return response.data;
  }

  /**
   * Update an existing attendance record
   */
  async updateAttendanceRecord(data: UpdateAttendanceRequest): Promise<AttendanceRecord> {
    const { id, ...updateData } = data;
    const response = await api.patch<AttendanceRecord>(`${this.basePath}/${id}`, updateData);
    return response.data;
  }

  /**
   * Delete an attendance record
   */
  async deleteAttendanceRecord(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get attendance statistics
   */
  async getStatistics(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_records: number;
    total_attendance: number;
    average_attendance: number;
    first_timers: number;
  }> {
    const response = await api.get(`${this.basePath}/statistics`, { params });
    return response.data;
  }
}

export const attendanceService = new AttendanceService();




