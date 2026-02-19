import { AxiosInstance } from 'axios';
import { BaseAPI } from './BaseAPI';
import {
  PaginatedResponse,
  CBCannedContentWithShoppers,
  ShopperDetails,
  GetShopperDetailsPayload,
  CBCannedContentGroup,
  CreateContentGroupRequest,
  GroupedContentResponse
} from '@/types';
import { useContentListingStore } from '@/stores/list/contentListing';

export class ContentAPI extends BaseAPI {
  constructor(apiClient: AxiosInstance) {
    super(apiClient);
  }

  async getIndustries(): Promise<string[]> {
    try {
      const response = await this.get<string[]>(`/content/industries`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getContent(): Promise<PaginatedResponse<CBCannedContentWithShoppers>> {
    const { pagination, filters, sorter } = useContentListingStore.getState();
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        industry: filters.industry,
        field: filters.field,
        search: filters.search,
        shopperIds: filters.shopper_ids,
        sortColumn: sorter.sortColumn,
        sortDirection: sorter.sortDirection,
      };

      const response = await this.get<PaginatedResponse<CBCannedContentWithShoppers>>(
        `/content`,
        params
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getContentById(id: number): Promise<CBCannedContentWithShoppers> {
    try {
      const response = await this.get<CBCannedContentWithShoppers>(
        `/content/${id}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createContent(data: {
    shopper_id: number;
    industry: string;
    field: string;
    content: string;
    remarks?: string;
  }): Promise<CBCannedContentWithShoppers> {
    try {
      const response = await this.post<CBCannedContentWithShoppers>(
        `/content`,
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateContent(
    id: number,
    data: {
      industry?: string;
      field?: string;
      content?: string;
      remarks?: string;
    }
  ): Promise<CBCannedContentWithShoppers> {
    try {
      const response = await this.put<CBCannedContentWithShoppers>(
        `/content/${id}`,
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteContent(id: number): Promise<void> {
    try {
      const response = await this.delete<void>(`/content/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getShopperDetails(payload: GetShopperDetailsPayload): Promise<ShopperDetails> {
    try {
      const response = await this.post<ShopperDetails[]>(`/shopper-group-details/description`, payload, true);
      return response[0];
    } catch (error) {
      throw error;
    }
  }

  // =====================
  // = Grouped Content Methods =
  // =====================

  // Get content in grouped format
  async getContentGrouped(): Promise<GroupedContentResponse> {
    const { pagination, filters, sorter } = useContentListingStore.getState();

    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      industry: filters.industry,
      field: filters.field,
      search: filters.search,
      shopperIds: filters.shopper_ids,
      sortColumn: sorter.sortColumn,
      sortDirection: sorter.sortDirection,
    };

    return this.get<GroupedContentResponse>('/content/groups', params);
  }

  // Create content group (heading + children)
  async createContentGroup(
    data: CreateContentGroupRequest
  ): Promise<CBCannedContentGroup> {
    return this.post<CBCannedContentGroup>('/content/groups', data);
  }

  // Update entire group
  async updateContentGroup(
    headingId: number,
    data: Partial<CreateContentGroupRequest>
  ): Promise<CBCannedContentGroup> {
    return this.put<CBCannedContentGroup>(
      `/content/groups/${headingId}`,
      data
    );
  }

  // Delete group (cascade deletes children)
  async deleteContentGroup(headingId: number): Promise<void> {
    return this.delete<void>(`/content/groups/${headingId}`);
  }

  /**
   * Confirm content changes: create custom canned content from preset and update shopper availability
   */
  async confirmContentChanges(payload: {
    presetId: number;
    contentByFieldId: Record<string, string>;
    shopperId: number;
    templateIds: string[];
    couponIds: number[];
  }): Promise<{ parentId: number }> {
    return this.post<{ parentId: number }>('/content/confirm-changes', payload);
  }

  /**
   * Get content group presets for dropdown selection
   * Uses existing grouped content endpoint but bypasses store filters
   */
  async getContentPresets(params: {
    shopperIds: number[];
    industry?: string;
  }): Promise<GroupedContentResponse> {
    const queryParams = {
      page: 1,
      limit: 100, // Get all available presets
      shopperIds: params.shopperIds,
      industry: params.industry || 'ecommerce', // Fallback to ecommerce
      sortColumn: 'group_label',
      sortDirection: 'ascend' as const,
    };

    return this.get<GroupedContentResponse>('/content/groups', queryParams);
  }
}
