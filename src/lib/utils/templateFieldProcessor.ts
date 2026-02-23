import { CBTemplateFieldContentIdMapping } from '@/types';

/**
 * Regular expression to match template field placeholders in the format {{field_id}}
 */
const TEMPLATE_FIELD_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Interface for the unlayer design JSON structure
 */
interface UnlayerContent {
  id: string;
  type: string;
  values: {
    text?: string;
    html?: string;
    _meta?: {
      htmlID?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface UnlayerColumn {
  id: string;
  contents: UnlayerContent[];
  values: any;
}

interface UnlayerRow {
  id: string;
  columns: UnlayerColumn[];
  values: any;
}

interface UnlayerDesign {
  counters: Record<string, number>;
  body: {
    id: string;
    rows: UnlayerRow[];
    headers: any[];
    footers: any[];
    values: any;
  };
  schemaVersion: number;
}

/**
 * Creates a lookup map from template fields array for O(1) access
 */
function createTemplateFieldsMap(templateFields: CBTemplateFieldContentIdMapping[]): Map<string, CBTemplateFieldContentIdMapping> {
  return new Map(templateFields.map(field => [field.field_id, field]));
}

/**
 * Processes text content to replace template field placeholders with actual values
 * and inject id attributes into HTML elements
 */
function processTextContent(
  text: string,
  templateFieldsMap: Map<string, CBTemplateFieldContentIdMapping>
): { processedText: string; foundFieldIds: string[] } {
  const foundFieldIds: string[] = [];


  const processedText = text.replace(TEMPLATE_FIELD_REGEX, (match, fieldId) => {
    const templateField = templateFieldsMap.get(fieldId);
    if (templateField) {
      foundFieldIds.push(fieldId);

      // Replace the placeholder with the default value and inject id attribute
      return injectIdIntoElement(templateField.default_field_value, fieldId);
    } else {
      console.warn(`[TemplateProcessor] No template field found for: ${fieldId}`);
    }
    // Return the original placeholder if no matching field is found
    return match;
  });

  return { processedText, foundFieldIds };
}

/**
 * Injects id attribute into HTML element or wraps content with a span if no HTML element exists
 */
function injectIdIntoElement(content: string, fieldId: string): string {
  // Check if content contains HTML tags
  const htmlTagRegex = /<(\w+)([^>]*)>/;
  const match = content.match(htmlTagRegex);

  if (match) {
    // Content has HTML tags, inject id into the first tag
    const tagName = match[1];
    const existingAttributes = match[2];

    // Check if id attribute already exists
    const idRegex = /\bid\s*=\s*["']([^"']*)["']/;
    const existingId = existingAttributes.match(idRegex);

    if (existingId) {
      // Replace existing id with field_id (don't append, replace completely)
      const updatedAttributes = existingAttributes.replace(
        idRegex,
        `id="${fieldId}"`
      );
      return content.replace(htmlTagRegex, `<${tagName}${updatedAttributes}>`);
    } else {
      // Add new id attribute
      const updatedAttributes = existingAttributes ? `${existingAttributes} id="${fieldId}"` : ` id="${fieldId}"`;
      return content.replace(htmlTagRegex, `<${tagName}${updatedAttributes}>`);
    }
  } else {
    // No HTML tags, wrap content with span and add id
    return `<span id="${fieldId}">${content}</span>`;
  }
}

/**
 * Updates the htmlID field in the content's _meta object with found field IDs
 */
function updateHtmlId(content: UnlayerContent, foundFieldIds: string[]): void {
  if (foundFieldIds.length === 0) return;

  // Ensure _meta object exists
  if (!content.values._meta) {
    content.values._meta = {};
  }

  // Get existing htmlID or use empty string
  const existingHtmlId = content.values._meta.htmlID || '';
  
  // Create a set to avoid duplicate field IDs
  const existingIds = new Set(existingHtmlId.split(' ').filter(id => id.trim()));
  foundFieldIds.forEach(id => existingIds.add(id));
  
  // Update htmlID with comma-separated field IDs
  content.values._meta.htmlID = Array.from(existingIds).join(' ');
}

/**
 * Processes a single content item for template field replacements
 */
function processContent(
  content: UnlayerContent,
  templateFieldsMap: Map<string, CBTemplateFieldContentIdMapping>
): void {
  // Process text content (for headings, buttons, etc.)
  if (content.values.text) {
    const { processedText } = processTextContent(
      content.values.text,
      templateFieldsMap
    );
    content.values.text = processedText;
  }

  // Process HTML content
  if (content.values.html) {
    const { processedText } = processTextContent(
      content.values.html,
      templateFieldsMap
    );
    content.values.html = processedText;
  }

  // When a merge tag is inserted via Unlayer's merge tag picker, it is stored in
  // textJson (Lexical editor state) as a merge_tag node — the `text` field is left
  // absent entirely. processTextContent never sees it, so no id-annotated span is
  // ever written, and the client preview can't find the element.
  // Fix: if `text` is absent but textJson contains {{field_id}}, synthesise the
  // `text` field with the default value and injected ID so Unlayer exports the
  // correct span. textJson is left untouched so the editor continues to show the
  // merge tag placeholder when the admin reopens the template.
  if (!content.values.text && content.values.textJson) {
    try {
      const textJsonStr =
        typeof content.values.textJson === 'string'
          ? content.values.textJson
          : JSON.stringify(content.values.textJson);

      const mergeTagMatch = /\{\{([^}]+)\}\}/.exec(textJsonStr);
      if (mergeTagMatch) {
        const fieldId = mergeTagMatch[1];
        const templateField = templateFieldsMap.get(fieldId);
        if (templateField) {
          content.values.text = injectIdIntoElement(
            templateField.default_field_value,
            fieldId
          );
        }
      }
    } catch {
      // Silently skip — textJson parse failure should not block the save
    }
  }
}

/**
 * Recursively processes all content in the design JSON
 */
function processDesignContent(
  design: UnlayerDesign,
  templateFieldsMap: Map<string, CBTemplateFieldContentIdMapping>
): void {
  // Process rows
  design.body.rows.forEach(row => {
    // Process columns in each row
    row.columns.forEach(column => {
      // Process contents in each column
      column.contents.forEach(content => {
        processContent(content, templateFieldsMap);
      });
    });
  });

  // Process headers if they exist
  if (design.body.headers && Array.isArray(design.body.headers)) {
    design.body.headers.forEach(header => {
      if (header.columns) {
        header.columns.forEach((column: UnlayerColumn) => {
          column.contents.forEach(content => {
            processContent(content, templateFieldsMap);
          });
        });
      }
    });
  }

  // Process footers if they exist
  if (design.body.footers && Array.isArray(design.body.footers)) {
    design.body.footers.forEach(footer => {
      if (footer.columns) {
        footer.columns.forEach((column: UnlayerColumn) => {
          column.contents.forEach(content => {
            processContent(content, templateFieldsMap);
          });
        });
      }
    });
  }
}

/**
 * Main function to process template fields in unlayer design JSON
 * This function replaces {{field_id}} placeholders with actual default values and injects id attributes
 *
 * During template SAVE (admin flow):
 * - Finds merge tags like {{template__heading-main}}
 * - Replaces with default field value
 * - Injects ID attribute: <span id="template__heading-main">Default Text</span>
 *
 * During CLIENT PREVIEW:
 * - template-content-parser.ts finds elements by ID
 * - Replaces default text with client-specific content
 *
 * @param design - The unlayer design JSON object
 * @param templateFields - Array of template field mappings from the store
 * @returns The processed design JSON with replaced values and ID attributes
 */
export function processTemplateFields(
  design: UnlayerDesign,
  templateFields: CBTemplateFieldContentIdMapping[]
): UnlayerDesign {
  // Create a deep copy to avoid mutating the original object
  const processedDesign = JSON.parse(JSON.stringify(design)) as UnlayerDesign;

  // Create lookup map for efficient field access
  const templateFieldsMap = createTemplateFieldsMap(templateFields);

  // Process all content in the design
  processDesignContent(processedDesign, templateFieldsMap);

  return processedDesign;
}

/**
 * Utility function to extract all template field IDs from a design JSON
 * Useful for debugging or validation purposes
 */
export function extractTemplateFieldIds(design: UnlayerDesign): string[] {
  const fieldIds: Set<string> = new Set();
  
  const extractFromText = (text: string) => {
    const matches = text.match(TEMPLATE_FIELD_REGEX);
    if (matches) {
      matches.forEach(match => {
        const fieldId = match.replace(/[{}]/g, '');
        fieldIds.add(fieldId);
      });
    }
  };

  const processContentForExtraction = (content: UnlayerContent) => {
    if (content.values.text) {
      extractFromText(content.values.text);
    }
    if (content.values.html) {
      extractFromText(content.values.html);
    }
  };

  // Extract from rows
  design.body.rows.forEach(row => {
    row.columns.forEach(column => {
      column.contents.forEach(content => {
        processContentForExtraction(content);
      });
    });
  });

  // Extract from headers and footers
  [...(design.body.headers || []), ...(design.body.footers || [])].forEach(section => {
    if (section.columns) {
      section.columns.forEach((column: UnlayerColumn) => {
        column.contents.forEach(content => {
          processContentForExtraction(content);
        });
      });
    }
  });

  return Array.from(fieldIds);
}
