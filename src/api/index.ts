import { AxiosInstance } from 'axios';
import { TemplatesAPI } from './services/TemplatesAPI';
import { ComponentsAPI } from './services/ComponentsAPI';
import { AssetsAPI } from './services/AssetsAPI';
import { DevicesAPI } from './services/DevicesAPI';
import { ContentAPI } from './services/ContentAPI';
import { TemplateFieldsAPI } from './services/TemplateFieldsAPI';
import { BaseTemplateCategoriesAPI } from './services/BaseTemplateCategoriesAPI';
import { CouponAPI } from './services/CouponAPI';
import { FeedbackAPI } from './services/FeedbackAPI';

/**
 * API Factory - Creates API service instances with the provided apiClient
 * This is the main entry point for all API services
 */
export class APIFactory {
  private apiClient: AxiosInstance;
  private templatesAPI: TemplatesAPI | null = null;
  private devicesAPI: DevicesAPI | null = null;
  private componentsAPI: ComponentsAPI | null = null;
  private assetsAPI: AssetsAPI | null = null;
  private contentAPI: ContentAPI | null = null;
  private templateFieldsAPI: TemplateFieldsAPI | null = null;
  private baseTemplateCategoriesAPI: BaseTemplateCategoriesAPI | null = null;
  private couponAPI: CouponAPI | null = null;
  private feedbackAPI: FeedbackAPI | null = null;

  constructor(apiClient: AxiosInstance) {
    this.apiClient = apiClient;
  }

  /**
   * Get Templates API service instance (singleton pattern)
   */
  get templates(): TemplatesAPI {
    if (!this.templatesAPI) {
      this.templatesAPI = new TemplatesAPI(this.apiClient);
    }
    return this.templatesAPI;
  }

  /**
   * Get Devices API service instance (singleton pattern)
   */
  get devices(): DevicesAPI {
    if (!this.devicesAPI) {
      this.devicesAPI = new DevicesAPI(this.apiClient);
    }
    return this.devicesAPI;
  }

  get components(): ComponentsAPI {
    if (!this.componentsAPI) {
      this.componentsAPI = new ComponentsAPI(this.apiClient);
    }
    return this.componentsAPI;
  }

  get assets(): AssetsAPI {
    if (!this.assetsAPI) {
      this.assetsAPI = new AssetsAPI(this.apiClient);
    }
    return this.assetsAPI;
  }

  get content(): ContentAPI {
    if (!this.contentAPI) {
      this.contentAPI = new ContentAPI(this.apiClient);
    }
    return this.contentAPI;
  }

  get templateFields(): TemplateFieldsAPI {
    if (!this.templateFieldsAPI) {
      this.templateFieldsAPI = new TemplateFieldsAPI(this.apiClient);
    }
    return this.templateFieldsAPI;
  }

  get baseTemplateCategories(): BaseTemplateCategoriesAPI {
    if (!this.baseTemplateCategoriesAPI) {
      this.baseTemplateCategoriesAPI = new BaseTemplateCategoriesAPI(
        this.apiClient
      );
    }
    return this.baseTemplateCategoriesAPI;
  }

  get coupons(): CouponAPI {
    if (!this.couponAPI) {
      this.couponAPI = new CouponAPI(this.apiClient);
    }
    return this.couponAPI;
  }

  get feedback(): FeedbackAPI {
    if (!this.feedbackAPI) {
      this.feedbackAPI = new FeedbackAPI(this.apiClient);
    }
    return this.feedbackAPI;
  }

  // Add more API services here as needed
  // get users(): UsersAPI { ... }
  // get content(): ContentAPI { ... }
}

/**
 * Create API factory instance
 */
export const createAPI = (apiClient: AxiosInstance): APIFactory => {
  return new APIFactory(apiClient);
};

// Re-export API classes for direct usage if needed
export { BaseAPI } from './services/BaseAPI';
export { TemplatesAPI } from './services/TemplatesAPI';
export { ComponentsAPI } from './services/ComponentsAPI';
export { AssetsAPI } from './services/AssetsAPI';
export { DevicesAPI } from './services/DevicesAPI';
export { ContentAPI } from './services/ContentAPI';
export { TemplateFieldsAPI } from './services/TemplateFieldsAPI';
export { BaseTemplateCategoriesAPI } from './services/BaseTemplateCategoriesAPI';
export { CouponAPI } from './services/CouponAPI';
export { FeedbackAPI } from './services/FeedbackAPI';

// Re-export types for convenience
export type {
  PaginatedResponse, 
  TemplateListParams,
  Asset,
  AssetUploadRequest,
  AssetsByAccountQueryParams,
  AssetsByAccountResponse,
  CBCannedContentWithShoppers
} from '../types/api';