/**
 * Template Content Parser
 * Handles real-time content replacement in HTML templates based on field IDs
 */

export interface ContentMapping {
  [fieldId: string]: string;
}

export interface CouponDisplayItem {
  offerText: string;
  subtext: string;
}

export class TemplateContentParser {
  private parser: DOMParser;
  private serializer: XMLSerializer;

  constructor() {
    this.parser = new DOMParser();
    this.serializer = new XMLSerializer();
  }

  /**
   * Parse and update template HTML with new content
   * @param templateHtml - The original template HTML
   * @param contentMapping - Object mapping field IDs to their values
   * @returns Updated HTML string
   */
  public updateContent(templateHtml: string, contentMapping: ContentMapping): string {
    try {
      // Parse the HTML
      const doc = this.parser.parseFromString(templateHtml, 'text/html');

      // Update each field in the content mapping
      Object.entries(contentMapping).forEach(([fieldId, value]) => {
        this.updateElementContent(doc, fieldId, value);
      });

      // Return the updated HTML
      return this.serializeDocument(doc);
    } catch (error) {
      return templateHtml; // Return original on error
    }
  }

  /**
   * Update the two-column-coupon-list component with assigned coupons.
   * Maps over the template's existing structure - updates data-props and in-place
   * content of coupon items to preserve the client's design/styling.
   * @param templateHtml - The template HTML
   * @param coupons - Array of { offerText, subtext } for each assigned coupon
   * @returns Updated HTML string
   */
  public updateCouponList(templateHtml: string, coupons: CouponDisplayItem[]): string {
    try {
      const doc = this.parser.parseFromString(templateHtml, 'text/html');
      const root = doc.querySelector('[data-component="two-column-coupon-list"]');
      if (!root) return templateHtml;

      let props: Record<string, unknown>;
      try {
        const propsStr = root.getAttribute('data-props');
        props = propsStr ? (JSON.parse(propsStr) as Record<string, unknown>) : {};
      } catch {
        props = {};
      }

      const items = coupons.slice(0, 12).map((c) => ({
        offerText: c.offerText,
        subtext: c.subtext,
      }));
      props.coupons = items;
      root.setAttribute('data-props', JSON.stringify(props));
      root.setAttribute('data-coupon-count', String(items.length));

      const listEl = root.querySelector('[data-slot="coupon-items"]');
      if (!listEl) return this.serializeDocument(doc);

      const existingItems = Array.from(listEl.querySelectorAll('[data-slot="coupon-item"]'));
      const templateItem = existingItems[0] as Element | undefined;

      // Update existing items in place, then add/remove to match count
      items.forEach((item, i) => {
        const offer = String(item.offerText ?? 'Offer');
        const sub = String(item.subtext ?? '');
        let el = existingItems[i] as Element | undefined;

        if (!el && templateItem) {
          el = templateItem.cloneNode(true) as Element;
          listEl.appendChild(el);
        }

        if (el) {
          el.setAttribute('id', `tcl-item-${i}`);
          el.setAttribute('data-index', String(i));
          el.setAttribute('data-offer', offer);

          const offerEl = el.querySelector('[data-field="offer"]');
          if (offerEl) offerEl.textContent = offer;

          const subEl = el.querySelector('[data-field="subtext"]');
          if (subEl) {
            subEl.textContent = sub;
            (subEl as HTMLElement).style.display = sub ? '' : 'none';
          }

          const btn = el.querySelector('[data-field="cta"]');
          if (btn) btn.setAttribute('data-coupon-index', String(i));
        }
      });

      // Remove excess items
      const currentItems = Array.from(listEl.querySelectorAll('[data-slot="coupon-item"]'));
      currentItems.slice(items.length).forEach((el) => el.remove());

      return this.serializeDocument(doc);
    } catch (error) {
      return templateHtml;
    }
  }

  /**
   * Extract merge tags from HTML (for debugging)
   */
  private extractMergeTags(html: string): string[] {
    const tags: string[] = [];
    const patterns = [
      /\{\{([^}]+)\}\}/g,        // {{fieldId}}
      /\{([^}]+)\}/g,           // {fieldId}
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        tags.push(match[0]); // Full match including braces
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Update a specific element's content by field ID
   * @param doc - The parsed document
   * @param fieldId - The field ID to search for
   * @param value - The new value to set
   */
  private updateElementContent(doc: Document, fieldId: string, value: string): void {
    // Escape fieldId for use in CSS selectors (handles IDs starting with numbers or special chars)
    const escapedFieldId = CSS.escape(fieldId);

    // Try different selectors to find the element
    const selectors = [
      `#${escapedFieldId}`,                    // Direct ID match
      `[data-field-id="${fieldId}"]`,   // Data attribute
      `[data-field="${fieldId}"]`,      // Alternative data attribute
      `[data-id="${fieldId}"]`,         // Generic data-id
      `.field-${escapedFieldId}`,              // Class-based selector
      `[name="${fieldId}"]`,            // Name attribute (for inputs)
    ];

    let element: Element | null = null;
    let matchedSelector: string | null = null;

    // Try each selector until we find an element
    for (const selector of selectors) {
      try {
        element = doc.querySelector(selector);
        if (element) {
          matchedSelector = selector;
          break;
        }
      } catch (error) {
        // Skip invalid selectors and continue
        continue;
      }
    }

    if (!element) {
      // If no direct match, try to find elements containing the fieldId in text content
      element = this.findElementByTextContent(doc, fieldId);
      if (element) {
        matchedSelector = 'text-content-match';
      }
    }

    if (element) {
      this.setElementValue(element, value, fieldId);
    }
  }

  /**
   * Find element by searching for fieldId in text content or placeholders
   * @param doc - The parsed document
   * @param fieldId - The field ID to search for
   * @returns Found element or null
   */
  private findElementByTextContent(doc: Document, fieldId: string): Element | null {
    // Common patterns to search for (in priority order)
    const patterns = [
      `{{${fieldId}}}`,           // Handlebars style (most common)
      `{${fieldId}}`,             // Simple curly braces
      `[${fieldId}]`,             // Square brackets
      `%${fieldId}%`,             // Percentage style
      `$${fieldId}$`,             // Dollar style
    ];

    // Search through all text nodes
    const walker = doc.createTreeWalker(
      doc.body || doc.documentElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const textContent = textNode.textContent || '';

      // Check each pattern in order
      for (const pattern of patterns) {
        if (textContent.includes(pattern)) {
          // Found a match - return the parent element
          let parent = textNode.parentElement;

          // Skip if parent is script or style tag
          if (parent && !['script', 'style'].includes(parent.tagName.toLowerCase())) {
            return parent;
          }
        }
      }
    }

    return null;
  }

  /**
   * Set the value of an element based on its type
   * @param element - The element to update
   * @param value - The new value
   * @param fieldId - The field ID being updated (for specific pattern matching)
   */
  private setElementValue(element: Element, value: string, fieldId?: string): void {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input') {
      (element as HTMLInputElement).value = value;
      element.setAttribute('value', value);
    } else if (tagName === 'textarea') {
      (element as HTMLTextAreaElement).value = value;
      element.textContent = value;
    } else if (tagName === 'select') {
      (element as HTMLSelectElement).value = value;
    } else if (tagName === 'img') {
      // For images, assume value is a URL
      element.setAttribute('src', value);
      element.setAttribute('alt', value);
    } else {
      // For other elements, update text content and handle common patterns
      const currentContent = element.innerHTML;
      let updatedContent = currentContent;
      let patternReplaced = false;

      if (fieldId) {
        // Create specific patterns for this field ID
        // Escape special regex characters in fieldId
        const escapedFieldId = fieldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const specificPatterns = [
          new RegExp(`\\{\\{${escapedFieldId}\\}\\}`, 'g'),  // {{template__sub-heading-main}}
          new RegExp(`\\{${escapedFieldId}\\}`, 'g'),        // {template__sub-heading-main}
          new RegExp(`\\[${escapedFieldId}\\]`, 'g'),        // [template__sub-heading-main]
          new RegExp(`%${escapedFieldId}%`, 'g'),            // %template__sub-heading-main%
          new RegExp(`\\$${escapedFieldId}\\$`, 'g'),        // $template__sub-heading-main$
        ];

        // Try to replace specific patterns
        for (const pattern of specificPatterns) {
          if (pattern.test(currentContent)) {
            // Reset regex index after test
            pattern.lastIndex = 0;
            updatedContent = currentContent.replace(pattern, value);
            patternReplaced = true;
            break;
          }
        }
      }

      // If specific pattern not found, try generic patterns as fallback
      if (!patternReplaced) {
        const genericPatterns = [
          /\{\{[^}]*\}\}/g,           // {{anything}}
          /\{[^}]*\}/g,              // {anything}
          /\[[^\]]*\]/g,             // [anything]
          /%[^%]*%/g,                // %anything%
          /\$[^$]*\$/g,              // $anything$
        ];

        for (const pattern of genericPatterns) {
          if (currentContent.match(pattern)) {
            updatedContent = currentContent.replace(pattern, value);
            patternReplaced = true;
            break;
          }
        }
      }

      if (!patternReplaced) {
        // If no patterns found, replace the entire text content
        updatedContent = value;
      }

      element.innerHTML = updatedContent;
    }
  }

  /**
   * Serialize document back to HTML string
   * @param doc - The document to serialize
   * @returns HTML string
   */
  private serializeDocument(doc: Document): string {
    // Return just the body content for embedding
    if (doc.body) {
      return doc.body.innerHTML;
    }

    // Fallback to full document
    return this.serializer.serializeToString(doc);
  }

  /**
   * Extract all potential field IDs from template HTML
   * @param templateHtml - The template HTML to analyze
   * @returns Array of found field IDs
   */
  public extractFieldIds(templateHtml: string): string[] {
    const fieldIds = new Set<string>();

    try {
      const doc = this.parser.parseFromString(templateHtml, 'text/html');

      // Find elements with ID attributes
      doc.querySelectorAll('[id]').forEach(el => {
        const id = el.getAttribute('id');
        if (id) fieldIds.add(id);
      });

      // Find elements with data-field-id attributes
      doc.querySelectorAll('[data-field-id]').forEach(el => {
        const fieldId = el.getAttribute('data-field-id');
        if (fieldId) fieldIds.add(fieldId);
      });

      // Find template patterns in text content
      const textContent = doc.body?.textContent || '';
      const patterns = [
        /\{\{([^}]+)\}\}/g,        // {{fieldId}}
        /\{([^}]+)\}/g,           // {fieldId}
        /\[([^\]]+)\]/g,          // [fieldId]
        /%([^%]+)%/g,             // %fieldId%
        /\$([^$]+)\$/g,           // $fieldId$
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(textContent)) !== null) {
          fieldIds.add(match[1].trim());
        }
      });

    } catch (error) {
      // Silent error handling
    }

    return Array.from(fieldIds);
  }
}

// Export a singleton instance for convenience
export const templateContentParser = new TemplateContentParser();
