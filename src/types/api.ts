import type { AuditMetadata } from './common';

export interface ErrorResponse {
  statuscode?: number;
  message: string;
  code?: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  count: number;
  results: T[];
  columns?: any[];
}

export interface ApiClient {
  get: (url: string, options?: any) => Promise<any>;
  post: (url: string, data?: any, options?: any) => Promise<any>;
  put: (url: string, data?: any, options?: any) => Promise<any>;
  delete: (url: string, options?: any) => Promise<any>;
}

export interface AuthProvider {
  userId: number;
  accountId: number;
}

export interface Device extends AuditMetadata {
  id: number;
  device_type: string;
}

export interface PublishedTemplatesCouponDesigner {
  template_id: string;
  template_name: string;
  template_description: string;
  canvas_type: string;
  published_template_id: string;
  s3_url: string;
  s3_bucket: string;
  s3_key: string;
  version: number;
  builder_state_snapshot_json: any;
  published_at: string;
  published_status: string;
  device_type_ids: number[];
  device_types: string[];
  is_custom_coded: boolean;
  is_generic: boolean;
}

// API method parameter types
export interface TemplateListParams {
  shopperId?: number;
  deviceId?: number;
  limit?: number;
  page?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc' | 'ascend' | 'descend';
  nameSearch?: string;
  status?: string;
}

export interface TemplateConfig {
  name: string;
  device_type_id: number;
  device_ids: number[];
  shopper_ids: number[];
  description: string;
  status?: string;
  is_generic?: boolean;
  account_ids?: number[];
  base_template_id?: string; // Optional base template selection
}

// Component Category Types
export interface ComponentCategory extends Partial<AuditMetadata> {
  id: number;
  category_code: string;
  category_name: string;
  display_name: string;
  description?: string;
  icon_name?: string;
  display_order: number;
  is_active: boolean;
  parent_category_id?: number;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
}

// Component Definition Types - Updated to match API response exactly
export interface ComponentDefinition {
  id: number;
  type: string;
  name: string;
  icon_name: string;
  default_config_json: Record<string, any>;
  allowed_in_zones: string[];
  client_customizable_props: Record<string, any>; // Can be nested object structure
  can_contain_children: boolean;
  allowed_children_types: string[] | null; // Can be null
  min_instances: number;
  max_instances: number | null; // Can be null for unlimited
  properties: Record<string, any>;
  preview_thumbnail: string | null; // Can be null
  category_code: string;
  category_name: string;
  category_display_name: string;
  category_icon: string;
  category_color: string;
  component_order: number;
  category_order: number;
}

// Components API Response
export interface ComponentsApiResponse {
  code: number;
  message: string;
  data: ComponentDefinition[];
}

// Client Customization Types
export interface ComponentClientCustomization {
  id: number;
  type: string;
  name: string;
  client_customizable_props: Record<string, boolean>;
}

// Query Parameters
export interface ComponentsQueryParams {
  search?: string;
  categoryCode?: string;
  componentType?: string;
}

// Asset Types
export interface Asset {
  id: number;
  image_component_id: number;
  template_id: string;
  account_id: number;
  s3_bucket: string;
  s3_key: string;
  s3_url: string;
  template_name?: string; // Only available in account assets endpoint
  status: string;
}

export interface AssetUploadRequest {
  file: File;
  image_component_id: string;
  template_id: string;
  account_id: string;
  remarks?: string;
}

export interface AssetsByAccountQueryParams {
  limit?: number;
  page?: number;
  sortColumn?:
    | 'id'
    | 'template_id'
    | 'account_id'
    | 'image_component_id'
    | 'created_at'
    | 'updated_at';
  sortDirection?: 'asc' | 'desc';
}

export interface AssetsByAccountResponse extends PaginatedResponse<Asset> {
  // Inherits page, limit, count, results from PaginatedResponse
  // results will be Asset[] with template_name included
}

export interface CBCannedContent {
  industry: string | null;
  field: string | null;
  id: number;
  content: string | null;
  created_at: string;
  created_by: number | null;
  status: string;
  parent_group_id?: number | null; // NULL = parent (heading), number = child
  group_label?: string | null; // Only populated on parent records
  display_order?: number; // Order within group
  field_name?: string; // Display name for field (from field definitions)
  remarks?: string; // Already used in UI but missing from type
  updated_at?: string; // Already used in UI but missing from type
}

export type CBCannedContentWithShoppers = CBCannedContent & {
  shopper_ids: number[];
};

// Grouped representation for UI
export interface CBCannedContentGroup {
  parent: CBCannedContentWithShoppers; // Heading record with group_label
  children: CBCannedContentWithShoppers[]; // Child records (sub_heading, dismiss_text, etc.)
}

// Request type for creating a group
export interface CreateContentGroupRequest {
  group_label: string; // Name for the content set
  industry: string;
  shopper_ids: number[];
  remarks?: string;
  fields: Array<{
    field_id: string;
    content: string;
    /** When updating, existing child row id so backend can update only this row's updated_at/updated_by */
    child_id?: number;
  }>;
}

// Paginated response for grouped listing
export interface GroupedContentResponse
  extends PaginatedResponse<CBCannedContentGroup> {
  // Inherits: page, limit, count, results
}

export interface TCBTemplateStaging extends AuditMetadata {
  id: string;
  template_id: string;
  builder_state_json: Record<string, any>;
  review_status: string;
  reviewed_by: number;
  review_notes: string;
  template_html: string;
  template_html_client: string;
  builder_state_json_client: Record<string, any>;
  reminder_tab_state_json: Record<string, any>;
  reminder_tab_html: string;
  reminder_tab_state_json_client: Record<string, any>;
  reminder_tab_html_client: string;
}

export interface CBTemplateFieldContentIdMapping extends AuditMetadata {
  id: string;
  field: string;
  field_id: string;
  default_field_value: string;
}
export interface CBTemplateFieldContentIdMappingWithContent extends AuditMetadata {
  id: string;
  field: string;
  field_id: string;
  default_field_value: string;
  supported_devices: Record<string, number>;
  content: CBCannedContent[];
}

// =====================
// = Shopper Details =
// =====================
export interface ShopperDetails {
  data_id: string;
  ui_template: UiTemplate;
  comp_id: string;
  parent: string;
  layout_config: LayoutConfig;
}

export interface UiTemplate {
  id: string;
  grid: Grid;
  props: Props;
  style: Style;
  gutter: any;
}

export interface Grid {
  xs: number;
}

export interface Props {
  data: Data;
  primaryBtnText: string;
  outlinedBtnText: string;
}

export interface Data {
  overview: Overview[];
  problemSS: ProblemSs[];
  solutionSS: SolutionSs[];
  shopper_icon: string;
}

export interface Overview {
  header: string;
  description: string;
}

export interface ProblemSs {
  url: string;
  title: string;
}

export interface SolutionSs {
  url: string;
  title: any;
}

export interface Style {}

export interface LayoutConfig {
  order: number;
  visible: boolean;
}

export interface GetShopperDetailsPayload {
  end_date: string;
  start_date: string;
  shopper_id: number;
  account_id: number;
  currency: string;
  company_id: number;
  phase: string;
  split: number;
  layout_type: string;
  mf_id: string;
  shopper_mode: any;
  shopper_mode_date_range: any[];
  data_incomplete_flag: boolean;
  shopper_name: string;
}
// =====================
// = Shopper Details =
// =====================

// =====================
// = client flow data =
// =====================

/** Content preset structure (parent + children from cb_canned_content) */
export interface ShopperContentPreset {
  parent: {
    id: number;
    group_label: string | null;
    content: string | null;
    field: string | null;
    /** Template field_id (e.g. template__heading-main) for form binding */
    field_id?: string | null;
  };
  children: Array<{
    id: number;
    content: string | null;
    field: string | null;
    /** Template field_id for form binding */
    field_id?: string | null;
  }>;
}

/** Coupon item from v2_promocode */
export interface ShopperCouponItem {
  promo_code_id: number;
  code: string;
  offer_heading: string;
  offer_sub_heading: string | null;
  is_active: boolean;
}

export interface ClientFlowShopper {
  id: number;
  name: string;
  content_preset_id?: number | null;
  coupon_ids?: number[] | null;
  content?: ShopperContentPreset | null;
  coupons?: ShopperCouponItem[] | null;
}

export interface ClientFlowData {
  template_id: string;
  template_name: string;
  template_description: string;
  canvas_type: string;
  is_custom_coded: boolean;
  is_generic: boolean;
  template_status: string;
  template_created_at: string;
  template_updated_at: string;
  template_created_by: number;
  template_updated_by: number;
  template_remarks: any;
  staging_id: string;
  builder_state_json: Record<string, any>;
  template_html: string;
  builder_state_json_client: Record<string, any>;
  template_html_client: string;
  reminder_tab_html: string;
  reminder_tab_state_json: Record<string, any>;
  reminder_tab_html_client: string;
  reminder_tab_state_json_client: Record<string, any>;
  review_status: string;
  reviewed_by: any;
  review_notes: any;
  staging_status: string;
  staging_created_at: string;
  staging_updated_at: string;
  account_mapping_id: number;
  account_id: number;
  account_mapping_created_at: string;
  shoppers: ClientFlowShopper[];
  device_type_ids: number[];
  devices: { id: number; device_type: string }[];
}
// =====================
// = client flow data =
// =====================
