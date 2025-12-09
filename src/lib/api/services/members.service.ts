/**
 * Members API Service
 * Handles all member-related API calls
 * Prepared for backend integration
 */

import { api } from "@/lib/api";

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  photo?: string;
  membership_status: "active" | "inactive";
  join_date?: string;
  city?: string;
  region?: string;
  [key: string]: unknown;
}

export interface CreateMemberRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  membership_status?: "active" | "inactive";
  [key: string]: unknown;
}

export interface UpdateMemberRequest extends Partial<CreateMemberRequest> {
  id: string;
}

export interface MembersResponse {
  data: Member[];
  total: number;
  page?: number;
  limit?: number;
}

class MembersService {
  private basePath = "/members";

  /**
   * Get all members with optional filters
   */
  async getMembers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: "active" | "inactive" | "all";
  }): Promise<MembersResponse> {
    const response = await api.get<MembersResponse>(this.basePath, { params });
    return response.data;
  }

  /**
   * Get a single member by ID
   */
  async getMember(id: string): Promise<Member> {
    const response = await api.get<Member>(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new member
   */
  async createMember(data: CreateMemberRequest): Promise<Member> {
    const response = await api.post<Member>(this.basePath, data);
    return response.data;
  }

  /**
   * Update an existing member
   */
  async updateMember(data: UpdateMemberRequest): Promise<Member> {
    const { id, ...updateData } = data;
    const response = await api.patch<Member>(`${this.basePath}/${id}`, updateData);
    return response.data;
  }

  /**
   * Delete a member
   */
  async deleteMember(id: string): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }
}

export const membersService = new MembersService();




