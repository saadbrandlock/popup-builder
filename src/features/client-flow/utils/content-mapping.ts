import type { ClientFlowData } from '@/types';

/**
 * Builds a {field_id → value} content mapping from the selected shopper's
 * content preset. Passed to templateContentParser.updateContent() via the store.
 *
 * Uses field_id (populated by backend join with cb_template_field_content_id_mapping).
 * Falls back to numeric field string if field_id is absent.
 */
export function buildContentMappingFromShopper(
  clientData: ClientFlowData[],
  shopperId: number
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const template of clientData) {
    const shopper = template.shoppers?.find((s) => s.id === shopperId);
    if (!shopper?.content) continue;

    const { parent, children } = shopper.content;

    const parentKey = parent?.field_id ?? parent?.field;
    if (parentKey && parent.content) mapping[String(parentKey)] = parent.content;

    children?.forEach((c) => {
      const key = c.field_id ?? c.field;
      if (key && c.content) mapping[String(key)] = c.content;
    });

    break; // Shopper content is the same across all templates — first match is sufficient
  }

  return mapping;
}
