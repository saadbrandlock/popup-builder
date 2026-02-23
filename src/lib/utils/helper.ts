import { ShopperType } from '@/types';
import DOMPurify from 'dompurify';

export const shopperLookup = (shoppers: ShopperType[]) => {
  return new Map<number, string>(
    shoppers.map((shopper: { id: number; name: string }) => [
      shopper.id,
      shopper.name,
    ])
  );
};

export const removeNullUndefinedKeys = <T extends Record<string, any>>(
  obj: T
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<T>;
};

export const checkObjectDiff = (
  originalObject: any,
  modifiedObject: any,
  compareOnlyModifiedKeys: boolean = false,
  ignoredKeys: string[] = []
): boolean => {
  // Handle null/undefined cases
  if (originalObject === null && modifiedObject === null) return false;
  if (originalObject === undefined && modifiedObject === undefined)
    return false;
  if (originalObject === null || originalObject === undefined) return true;
  if (modifiedObject === null || modifiedObject === undefined) return true;

  // Handle primitive types
  if (
    typeof originalObject !== 'object' ||
    typeof modifiedObject !== 'object'
  ) {
    return originalObject !== modifiedObject;
  }

  // Handle arrays
  if (Array.isArray(originalObject) !== Array.isArray(modifiedObject)) {
    return true;
  }

  if (Array.isArray(originalObject)) {
    if (originalObject.length !== modifiedObject.length) {
      return true;
    }

    for (let i = 0; i < originalObject.length; i++) {
      if (
        checkObjectDiff(
          originalObject[i],
          modifiedObject[i],
          compareOnlyModifiedKeys,
          ignoredKeys
        )
      ) {
        return true;
      }
    }
    return false;
  }

  // Handle objects
  const originalKeys = Object.keys(originalObject);
  const modifiedKeys = Object.keys(modifiedObject);

  if (compareOnlyModifiedKeys) {
    // Compare only based on keys present in modified object
    for (const key of modifiedKeys) {
      // Skip ignored keys
      if (ignoredKeys.includes(key)) {
        continue;
      }

      if (!originalKeys.includes(key)) {
        // New key added
        return true;
      }
      if (
        checkObjectDiff(
          originalObject[key],
          modifiedObject[key],
          compareOnlyModifiedKeys,
          ignoredKeys
        )
      ) {
        return true;
      }
    }
    return false;
  } else {
    // Compare all keys (same object structure)
    // Filter out ignored keys
    const filteredOriginalKeys = originalKeys.filter(
      (key) => !ignoredKeys.includes(key)
    );
    const filteredModifiedKeys = modifiedKeys.filter(
      (key) => !ignoredKeys.includes(key)
    );

    // Check for added or removed keys (excluding ignored keys)
    const addedKeys = filteredModifiedKeys.filter(
      (key) => !filteredOriginalKeys.includes(key)
    );
    const removedKeys = filteredOriginalKeys.filter(
      (key) => !filteredModifiedKeys.includes(key)
    );

    if (addedKeys.length > 0 || removedKeys.length > 0) {
      return true;
    }

    // Check for value changes in common keys (excluding ignored keys)
    for (const key of filteredOriginalKeys) {
      if (
        checkObjectDiff(
          originalObject[key],
          modifiedObject[key],
          compareOnlyModifiedKeys,
          ignoredKeys
        )
      ) {
        return true;
      }
    }

    return false;
  }
};

export const splitByAndCapitalize = (
  str: string,
  delimiter: string = '_',
  returningElementIndex?: number
): string => {
  const words = str
    .split(delimiter)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  if (returningElementIndex !== undefined) {
    return words[returningElementIndex];
  }
  return words.join(' ');
};

export const sanitizeHtml = async (dirtyHTML: string) => {
  // First sanitize
  const clean = DOMPurify.sanitize(dirtyHTML, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'div',
      'span',
      'p',
      'a',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'br',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style'],
  });

  return clean;
}

/**
 * Decode HTML entities in a string
 * Converts &lt; &gt; &amp; &quot; etc. back to < > & " etc.
 */
export const decodeHtmlEntities = (str: string): string => {
  if (typeof str !== 'string') return str;

  // Create a temporary DOM element to decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = str;
  return textarea.value;
};

/**
 * Safely decode HTML entities and sanitize HTML content for preview
 * This function combines HTML entity decoding with DOMPurify sanitization
 * for secure HTML injection in preview components
 */
export const safeDecodeAndSanitizeHtml = async (encodedHtml: string): Promise<string> => {
  if (!encodedHtml || typeof encodedHtml !== 'string') {
    return '';
  }

  try {
    // Step 1: Decode HTML entities
    const decodedHtml = decodeHtmlEntities(encodedHtml);
    // Step 2: Sanitize the decoded HTML with more permissive settings for popup templates
    const sanitizedHtml = DOMPurify.sanitize(decodedHtml, {
      USE_PROFILES: { html: true },
      ALLOWED_TAGS: [
        // Basic HTML tags
        'div', 'span', 'p', 'a', 'img', 'br', 'hr',
        // Headings
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Lists
        'ul', 'ol', 'li',
        // Text formatting
        'strong', 'b', 'em', 'i', 'u', 'small', 'sub', 'sup',
        // Tables (common in email templates)
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
        // Forms (for popup interactions)
        'form', 'input', 'button', 'label', 'select', 'option', 'textarea',
        // Semantic elements
        'header', 'footer', 'section', 'article', 'aside', 'nav', 'main',
        // Media
        'video', 'audio', 'source',
      ],
      ALLOWED_ATTR: [
        // Standard attributes
        'href', 'src', 'alt', 'class', 'id', 'style', 'title', 'aria-label',
        // Layout attributes
        'width', 'height', 'align', 'valign',
        // Form attributes
        'type', 'name', 'value', 'placeholder', 'required', 'disabled',
        // Table attributes
        'colspan', 'rowspan', 'cellpadding', 'cellspacing',
        // Event handlers (limited for popup functionality)
        'onclick', 'onsubmit', 'onchange',
        // Data attributes for popup behavior
        'data-*',
      ],
      ALLOW_DATA_ATTR: true,
      // Allow inline styles for template formatting
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
    });

    return sanitizedHtml;
  } catch (error) {
    console.error('Error decoding and sanitizing HTML:', error);
    return '';
  }


};


export const disableEditorForCleint = () => {
  return {
    rows: {
      enabled: false,
    },
    button: {
      enabled: false,
    },
    header: {
      enabled: false,
    },
    text: {
      enabled: false,
    },
    image: {
      enabled: false,
    },
    divider: {
      enabled: false,
    },
    menu: {
      enabled: false,
    },
    html: {
      enabled: false,
    },
    social: {
      enabled: false,
    },
    carousel: {
      enabled: false,
    },

  }
} 