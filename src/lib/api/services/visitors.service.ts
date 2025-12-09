/**
 * Visitors API Service
 * Handles all visitor-related API calls
 * Prepared for backend integration
 */

import { api } from "@/lib/api";

export interface Visitor {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  photo?: string;
  status: "New" | "Returning";
  visit_date?: string;
  source?: string;
  follow_up_required?: boolean;
  [key: string]: unknown;
}

export interface CreateVisitorRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  visit_date?: string;
  source?: string;
  status?: "New" | "Returning";
  [key: string]: unknown;
}

export interface UpdateVisitorRequest extends Partial<CreateVisitorRequest> {
  id: string;
}

export interface VisitorsResponse {
  data: Visitor[];
  total: number;
  page?: number;
  limit?: number;
}

class VisitorsService {
  private basePath = "/visitors";

  async getVisitors(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "New" | "Returning" | "all";
  }): Promise<VisitorsResponse> {
    const response = await api.get<VisitorsResponse>(this.basePath, { params });
    return response.data;
  }

  async getVisitor(id: string): Promise<Visitor> {
    const response = await api.get<Visitor>(`${this.basePath}/${id}`);
    return response.data;
  }

  async createVisitor(data: CreateVisitorRequest): Promise<Visitor> {
    const response = await api.post<Visitor>(this.basePath, data);
    return response.data;
  }

  async updateVisitor(data: UpdateVisitorRequest): Promise<Visitor> {
    const { id, ...updateData } = data;
    const response = await api.patch<Visitor>(`${this.basePath}/${id}`, updateData);
    return response.data;
  }

  async deleteVisitor(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }
}

export const visitorsService = new VisitorsService();




