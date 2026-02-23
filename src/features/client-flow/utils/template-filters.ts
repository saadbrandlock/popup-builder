import { ClientFlowData } from '@/types';

const deviceTypeMatches = (devices: { id: number; device_type: string }[] | undefined, deviceType: 'desktop' | 'mobile'): boolean => {
  if (!devices?.length) return false;
  const lower = deviceType.toLowerCase();
  return devices.some((d) => String(d.device_type).toLowerCase() === lower);
};

const templateHasShopper = (template: ClientFlowData, shopperId: number): boolean => {
  const shoppers = template.shoppers ?? [];
  return shoppers.some((s) => s.id === shopperId);
};

/**
 * Returns templates that have the given device type (desktop or mobile).
 */
export function getTemplatesForDevice(
  clientData: ClientFlowData[] | null,
  deviceType: 'desktop' | 'mobile'
): ClientFlowData[] {
  if (!clientData?.length) return [];
  const VISIBLE_STATUSES = new Set(['client-review', 'admin-review', 'admin-changes-request', 'admin-rejected', 'published']);
  return clientData.filter((t) => VISIBLE_STATUSES.has(t.staging_status) && deviceTypeMatches(t.devices, deviceType));
}

/**
 * Returns templates that have the given device type and the given shopper in their shoppers list.
 * If shopperId is null/undefined, returns templates for the device only (no shopper filter).
 */
export function getTemplatesForDeviceAndShopper(
  clientData: ClientFlowData[] | null,
  deviceType: 'desktop' | 'mobile',
  shopperId: number | null | undefined
): ClientFlowData[] {
  const byDevice = getTemplatesForDevice(clientData, deviceType);
  if (shopperId == null) return byDevice;
  const withShopper = byDevice.filter((t) => templateHasShopper(t, shopperId));
  if (withShopper.length > 0) return withShopper;
  return byDevice;
}

/**
 * Returns unique shopper groups from the given templates (dedupe by id).
 */
export function getUniqueShoppersFromTemplates(templates: ClientFlowData[]): { id: number; name: string }[] {
  const map = new Map<number, { id: number; name: string }>();
  for (const t of templates) {
    for (const s of t.shoppers ?? []) {
      if (s.id != null && !map.has(s.id)) map.set(s.id, { id: s.id, name: s.name });
    }
  }
  return Array.from(map.values());
}

/** Max length for description preview in dropdown options; longer text is truncated with tooltip. */
export const MAX_DESCRIPTION_PREVIEW_LENGTH = 80;

/**
 * Display label for a template in the review selector (template-based, as admin grouped it).
 * Uses template name when set; otherwise "For: [shopper names]".
 * When includeDescription is true, appends " – [description]" (not used by shared selector; kept for backward compat).
 */
export function getTemplateDisplayLabel(
  template: ClientFlowData,
  options?: { includeDescription?: boolean }
): string {
  const name = template.template_name?.trim();
  const base =
    name || (template.shoppers?.length
      ? `For: ${template.shoppers.map((s) => s.name).join(', ')}`
      : 'Template');
  if (options?.includeDescription && template.template_description?.trim()) {
    return `${base} – ${template.template_description.trim()}`;
  }
  return base;
}

/**
 * Name and description for template dropdown options. Description is truncated for preview;
 * use descriptionFull for tooltip. Centralized so selector UI is consistent.
 */
export function getTemplateOptionLabels(template: ClientFlowData): {
  name: string;
  description: string | null;
  descriptionFull: string | null;
} {
  const name = getTemplateDisplayLabel(template);
  const raw = template.template_description?.trim() || null;
  if (!raw) return { name, description: null, descriptionFull: null };
  const descriptionFull = raw;
  const description =
    raw.length <= MAX_DESCRIPTION_PREVIEW_LENGTH
      ? raw
      : `${raw.slice(0, MAX_DESCRIPTION_PREVIEW_LENGTH).trim()}…`;
  return { name, description, descriptionFull };
}
