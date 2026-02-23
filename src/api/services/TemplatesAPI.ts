import { AxiosInstance } from 'axios';
import { BaseAPI } from './BaseAPI';
import type {
  AdminReviewQueueItem,
  ClientFlowData,
  PaginatedResponse,
  TCBTemplateStaging,
} from '../../types/api';
import { useTemplateListingStore } from '@/stores/list/templateListing.store';
import { FetchParams } from '../types/main.types';
import { TablePaginationConfig } from 'antd';
import { CleanTemplateResponse, TCBTemplate } from '@/types';
import { useClientFlowStore } from '@/features';
import { removeNullUndefinedKeys } from '@/lib/utils/helper';

export class TemplatesAPI extends BaseAPI {
  constructor(apiClient: AxiosInstance) {
    super(apiClient);
  }

  async createBaseTemplate(template: {
    name: string;
    category_id: number;
    description?: string;
    is_custom_coded: boolean;
    canvas_type: string;
    is_generic: boolean;
    status: string;
    remarks?: string | null;
    child_templates?: any;
    is_featured?: boolean;
    display_order?: number;
  }): Promise<{ template_id: string }> {
    try {
      const payload = removeNullUndefinedKeys(template);
      const data = await this.post<{ template_id: string }>(
        `/base-templates/create`,
        payload
      );
      return data;
    } catch (error) {
      this.handleError(error, 'create basic template');
    }
  }

  async updateBaseTemplate(
    templateId: string,
    template: {
      name?: string;
      description?: string;
      is_custom_coded?: boolean;
      canvas_type?: string;
      is_generic?: boolean;
      status?: string;
      remarks?: string | null;
      child_templates?: any;
      is_featured?: boolean;
      display_order?: number;
      builder_state_json?: any;
    }
  ): Promise<TCBTemplate> {
    try {
      const payload = removeNullUndefinedKeys(template);

      const response = await this.put<TCBTemplate>(
        `/base-templates/${templateId}`,
        payload
      );
      return response;
    } catch (error) {
      this.handleError(error, 'update basic template');
    }
  }

  async getBaseTemplateById(id: string): Promise<any> {
    try {
      return this.get<any>(`/base-templates/${id}`);
    } catch (error) {
      this.handleError(error, 'get base template by id');
    }
  }

  async getBaseTemplates(params?: {
    categoryId?: number;
    isFeatured?: boolean;
    status?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortColumn?: string;
    sortDirection?: 'ascend' | 'descend';
  }): Promise<PaginatedResponse<any>> {
    try {
      const queryParams: any = {};
      if (params) {
        if (params.categoryId) queryParams.categoryId = params.categoryId;
        if (params.isFeatured !== undefined) queryParams.isFeatured = params.isFeatured;
        if (params.status) queryParams.status = params.status;
        if (params.search) queryParams.search = params.search;
        if (params.limit) queryParams.limit = params.limit;
        if (params.page) queryParams.page = params.page;
        if (params.sortColumn) queryParams.sortColumn = params.sortColumn;
        if (params.sortDirection) queryParams.sortDirection = params.sortDirection;
      }

      return this.get<PaginatedResponse<any>>(`/base-templates/`, queryParams);
    } catch (error) {
      this.handleError(error, 'get base templates');
    }
  }

  async copyBaseTemplateToAccount(
    baseTemplateId: string,
    accountId: number
  ): Promise<{ template_id: string }> {
    try {
      const data = await this.post<{ template_id: string }>(
        `/base-templates/${baseTemplateId}/copy-to-account`,
        { account_id: accountId }
      );
      return data;
    } catch (error) {
      this.handleError(error, 'copy base template to account');
    }
  }

  async deleteBaseTemplate(baseTemplateId: string): Promise<{ message: string }> {
    try {
      return this.delete<{ message: string }>(`/base-templates/${baseTemplateId}`);
    } catch (error) {
      this.handleError(error, 'delete base template');
    }
  }

  async updateBaseTemplateStatus(
    baseTemplateId: string,
    status: 'archive' | 'active' | 'deleted'
  ): Promise<{ success: boolean }> {
    try {
      return this.patch<{ success: boolean }>(`/base-templates/${baseTemplateId}/status`, {
        status,
      });
    } catch (error) {
      this.handleError(error, 'update base template status');
    }
  }

  async getTemplates(
    currentPagination: TablePaginationConfig,
    currentFilters: Pick<FetchParams, 'deviceId' | 'status' | 'nameSearch'>,
    currentSorter: Pick<FetchParams, 'sortColumn' | 'sortDirection'>
  ): Promise<PaginatedResponse<TCBTemplate>> {
    const queryParams = {
      page: currentPagination.current,
      limit: currentPagination.pageSize,
      deviceId: currentFilters.deviceId,
      status: currentFilters.status,
      nameSearch: currentFilters.nameSearch,
      sortColumn: currentSorter.sortColumn,
      sortDirection: currentSorter.sortDirection,
    };

    Object.keys(queryParams).forEach((key) => {
      const k = key as keyof FetchParams;
      if (queryParams[k] === undefined) {
        delete queryParams[k];
      }
    });

    return this.get<PaginatedResponse<TCBTemplate>>(
      `/admin/templates`,
      queryParams
    );
  }

  /**
   * Get templates transformed for UI consumption.
   * When params are passed, they are used; otherwise state is read from the store.
   */
  async getTemplatesForUI(params?: {
    filters?: Pick<FetchParams, 'deviceId' | 'status' | 'nameSearch'>;
    pagination?: TablePaginationConfig;
    sorter?: Pick<FetchParams, 'sortColumn' | 'sortDirection'>;
  }): Promise<{
    templates: CleanTemplateResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  }> {
    const filters = params?.filters ?? useTemplateListingStore.getState().filters;
    const pagination = params?.pagination ?? useTemplateListingStore.getState().pagination;
    const sorter = params?.sorter ?? useTemplateListingStore.getState().sorter;
    const response = await this.getTemplates(pagination, filters, sorter);
    return {
      templates: response.results.map((template) =>
        this.transformTemplate(template)
      ),
      pagination: {
        page: response.page,
        limit: response.limit,
        total: response.count,
      },
    };
  }

  /**
   * Get popup template by ID
   * @param templateId - The template ID to fetch
   * @returns Promise<CleanTemplateResponse>
   */
  async getTemplateById(templateId: string): Promise<CleanTemplateResponse> {
    try {
      const response = await this.get<TCBTemplate>(
        `/admin/templates/${templateId}`
      );
      return this.transformTemplate(response);
    } catch (error) {
      this.handleError(error, `get popup template ${templateId}`);
    }
  }

  /**
   * Publish a template
   */
  async publishTemplate(
    templateId: string,
    htmlContent?: string
  ): Promise<{ message: string }> {
    const payload: { action: string; html_content?: string } = {
      action: 'publish',
    };

    // Only include html_content if provided
    if (htmlContent) {
      payload.html_content = htmlContent;
    }

    return this.post<{ message: string }>(
      `/admin/templates/${templateId}/actions`,
      payload
    );
  }

  /**
   * Archive a template
   */
  async archiveTemplate(templateId: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(
      `/admin/templates/${templateId}/actions`,
      {
        action: 'archive',
      }
    );
  }

  async pushTemplateToClientReview(
    templatesData: {
      template_id: string;
      html_content: string;
    }[]
  ): Promise<TCBTemplateStaging> {
    return this.patch<TCBTemplateStaging>(
      `/staging-template/push-client-review`,
      {
        templatesData,
      }
    );
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(
      `/admin/templates/${templateId}/actions`,
      {
        action: 'delete',
      }
    );
  }

  /**
   * Unarchive a template, optionally restoring to draft or published.
   */
  async unarchiveTemplate(
    templateId: string,
    targetStatus?: 'draft' | 'published'
  ): Promise<{ message: string }> {
    const body: { action: string; targetStatus?: 'draft' | 'published' } = {
      action: 'unarchive',
    };
    if (targetStatus) {
      body.targetStatus = targetStatus;
    }
    return this.post<{ message: string }>(
      `/admin/templates/${templateId}/actions`,
      body
    );
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<TCBTemplate> {
    return this.get<TCBTemplate>(`/admin/templates/${templateId}`);
  }

  /**
   * Create new popup template
   * @param template - The popup template data
   * @returns Promise<CleanTemplateResponse>
   */
  async createTemplate(
    template: Omit<
      TCBTemplate,
      | 'id'
      | 'created_at'
      | 'updated_at'
      | 'created_by'
      | 'updated_by'
      | 'deleted_by'
      | 'deleted_at'
    >
  ): Promise<TCBTemplate> {
    try {
      const data = await this.post<TCBTemplate>(`/admin/templates`, template);
      return data;
    } catch (error) {
      this.handleError(error, 'create popup template');
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    templateData: Partial<TCBTemplate>
  ): Promise<TCBTemplate> {
    try {
      const response = await this.put<TCBTemplate>(
        `/admin/templates/${templateId}`,
        templateData
      );
      return response;
    } catch (error) {
      this.handleError(error, 'update popup template');
    }
  }

  async upsertTemplate(
    templateId: string,
    templateData: Partial<TCBTemplateStaging> & { is_builder_state: boolean }
  ): Promise<TCBTemplateStaging> {
    try {
      const response = await this.put<TCBTemplateStaging>(
        `/staging-template/${templateId}`,
        templateData
      );
      return response;
    } catch (error) {
      this.handleError(error, 'upsert popup template');
    }
  }

  async assignTemplateToShoppers(templateId: string, shopperId: number[]) {
    try {
      const response = await this.post<{ data: { shopper_ids: number[] } }>(
        `/admin/templates/shopper-assignments`,
        {
          template_id: templateId,
          shopper_ids: shopperId,
        }
      );

      return response;
    } catch (error) {
      console.error('Error assigning template:', error);
      throw error;
    }
  }

  async getPotentitalChildTemplateDetails(account_id: number) {
    try {
      const response = await this.get<
        {
          id: string;
          name: string;
          description: string;
          shoppers: { id: number; name: string }[];
          devices: { id: number; device_type: string }[];
        }[]
      >(`/admin/potential-child-templates/account/${account_id}`);
      return response;
    } catch (error) {
      this.handleError(error, 'get potential child template details');
    }
  }

  async linkChildTemplates(parent_id: string, child_ids: string[]) {
    try {
      const response = await this.put<{ data: TCBTemplate }>(
        `/admin/templates/${parent_id}/link-child-templates`,
        {
          child_template_ids: child_ids,
        }
      );
      return response;
    } catch (error) {
      this.handleError(error, 'link child templates');
    }
  }

  /**
   * Get admin review queue grouped by account (lightweight endpoint)
   */
  async getAdminReviewQueue(params: {
    page?: number;
    limit?: number;
    nameSearch?: string;
    deviceId?: number;
    sortColumn?: string;
    sortDirection?: 'ascend' | 'descend';
  }): Promise<PaginatedResponse<AdminReviewQueueItem>> {
    const queryParams: Record<string, any> = {};
    if (params.page != null) queryParams.page = params.page;
    if (params.limit != null) queryParams.limit = params.limit;
    if (params.nameSearch) queryParams.nameSearch = params.nameSearch;
    if (params.deviceId != null) queryParams.deviceId = params.deviceId;
    if (params.sortColumn) queryParams.sortColumn = params.sortColumn;
    if (params.sortDirection) queryParams.sortDirection = params.sortDirection;

    return this.get<PaginatedResponse<AdminReviewQueueItem>>(
      `/admin-review/queue`,
      queryParams
    );
  }

  /**
   * Get published templates queue grouped by account (standalone endpoint)
   */
  async getPublishedTemplatesQueue(params: {
    page?: number;
    limit?: number;
    nameSearch?: string;
    deviceId?: number;
    sortColumn?: string;
    sortDirection?: 'ascend' | 'descend';
  }): Promise<PaginatedResponse<AdminReviewQueueItem>> {
    const queryParams: Record<string, any> = {};
    if (params.page != null) queryParams.page = params.page;
    if (params.limit != null) queryParams.limit = params.limit;
    if (params.nameSearch) queryParams.nameSearch = params.nameSearch;
    if (params.deviceId != null) queryParams.deviceId = params.deviceId;
    if (params.sortColumn) queryParams.sortColumn = params.sortColumn;
    if (params.sortDirection) queryParams.sortDirection = params.sortDirection;

    return this.get<PaginatedResponse<AdminReviewQueueItem>>(
      `/admin-review/published`,
      queryParams
    );
  }

  getClientTemplatesData(accountId: number) {
    try {
      const response = this.get<ClientFlowData[]>(
        `/client-review/account/${accountId}`
      );
      return response;
    } catch (error) {
      this.handleError(error, 'get client templates data');
    }
  }

  /**
   * Update client review template with new design data
   * Used when editing templates from client review flow
   */
  async updateClientReviewTemplate(
    templateId: string,
    templateData: Partial<ClientFlowData>
  ): Promise<ClientFlowData> {
    try {
      const response = await this.put<ClientFlowData>(
        `/client-review/template/${templateId}`,
        templateData
      );

      return response;
    } catch (error) {
      console.error('❌ Failed to update client review template:', error);
      this.handleError(error, 'update client review template');
    }
  }

  /**
   * Upsert step approval status for a template
   */
  async upsertStepApproval(
    templateId: string,
    stepKey: string,
    status: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const response = await this.put<{ success: boolean; data: any; message: string }>(
        `/client/templates/${templateId}/step-approval`,
        { stepKey, status }
      );
      return response;
    } catch (error) {
      this.handleError(error, 'upsert step approval');
    }
  }

  /**
   * Update staging status for a single template (also syncs cb_templates.status)
   */
  async updateStagingStatus(
    templateId: string,
    status: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const response = await this.patch<{ success: boolean; data: any; message: string }>(
        `/staging-template/${templateId}/status`,
        { status }
      );
      return response;
    } catch (error) {
      this.handleError(error, 'update staging status');
    }
  }

  /**
   * Batch upsert step approval for multiple templates in a single request
   */
  async batchUpsertStepApproval(
    templateIds: string[],
    stepKey: string,
    status: string
  ): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const response = await this.put<{ success: boolean; data: any; message: string }>(
        `/client/templates/step-approval/batch`,
        { templateIds, stepKey, status }
      );
      return response;
    } catch (error) {
      this.handleError(error, 'batch upsert step approval');
    }
  }

  /**
   * Get step approval status metadata for all templates in an account
   */
  async getStepStatusByAccountId(accountId: number): Promise<any | null> {
    try {
      const response = await this.get<{ success: boolean; data: Record<string, any> }>(
        `/account/${accountId}/step-status`
      );
      return response;
    } catch (error) {
      this.handleError(error, 'get step status by account');
    }
  }

  /**
   * Transform TCBTemplate to CleanTemplateResponse for UI consumption
   */
  transformTemplate(template: TCBTemplate): CleanTemplateResponse {
    return {
      id: template.id,
      name: template.name,
      description: template.description || undefined,
      status: template.status || 'draft',
      devices: template.devices,
      shopper_ids: template.shopper_ids || [],
      type: template.is_generic ? 'generic' : 'specific',
      lastUpdated: new Date(template.updated_at || template.created_at),
      createdAt: new Date(template.created_at),
      createdBy: template.created_by?.toString() || 'Unknown',
      builder_state_json: template.builder_state_json || {},
      canvas_type: template.canvas_type,
      is_generic: template.is_generic,
      is_custom_coded: template.is_custom_coded,
      reminder_tab_state_json: template.reminder_tab_state_json || {},
      device_ids: template.device_ids,
      child_templates: template.child_templates,
      account_details: template.account_details,
    };
  }
}
