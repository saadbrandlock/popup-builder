import { AxiosInstance } from 'axios';
import { BaseAPI } from './BaseAPI';

export interface CouponListItem {
  promo_code_id: number;
  offer_heading: string;
  offer_sub_heading: string | null;
  code: string;
  persona_ids: string;
  persona_names?: string;
  is_active: boolean;
  [key: string]: unknown;
}

export interface AddCouponPayload {
  offer_heading: string;
  offer_sub_heading?: string;
  code: string;
  valid_from: string;
  valid_from_timezone: string;
  valid_to: string;
  valid_to_timezone: string;
  is_active: boolean;
  one_time_coupon: boolean;
  site_id: number;
  personas: string;
  reported_status: string;
  remarks?: string | null;
  dummy_coupon: boolean;
  domain: string;
}

export class CouponAPI extends BaseAPI {
  constructor(apiClient: AxiosInstance) {
    super(apiClient);
  }

  async getCouponsList(
    siteId: number,
    params?: {
      is_active?: string;
      limit?: number;
      offset?: number;
      persona_ids?: string;
    }
  ): Promise<CouponListItem[]> {
    const queryParams: Record<string, string> = {
      is_active: params?.is_active ?? 'true',
      limit: String(params?.limit ?? 500),
      offset: String(params?.offset ?? 0),
    };
    if (params?.persona_ids) {
      queryParams.persona_ids = params.persona_ids;
    }
    const response = await this.get<CouponListItem[]>(
      `/coupon-management/coupons-list/${siteId}`,
      queryParams,
      true
    );
    return Array.isArray(response) ? response : [];
  }

  async addCoupon(data: AddCouponPayload): Promise<{ coupon_id: number }> {
    const response = await this.post<{ coupon_id: number }>(
      '/coupon-management/add-coupon',
      data,
      true
    );
    return response;
  }
}
