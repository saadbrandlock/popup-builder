/**
 * useFieldHighlight Hook
 * Manages field highlighting for template iframes
 */

import { useEffect, useMemo, useCallback, RefObject } from 'react';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { FieldHighlightEngine } from '@/lib/utils/field-highlight-engine';
import { HighlightConfig, DEFAULT_HIGHLIGHT_CONFIG } from '@/lib/utils/highlight-styles';

interface UseFieldHighlightOptions {
  config?: Partial<HighlightConfig>;
  enableBidirectional?: boolean;
}

interface UseFieldHighlightReturn {
  highlightField: (fieldId: string, fieldName?: string) => void;
  clearHighlight: () => void;
  activeFieldId: string | null;
}

/**
 * Custom hook for managing field highlighting in iframes
 * @param iframeRef - Reference to the iframe element
 * @param options - Configuration options
 * @returns Highlighting control methods
 */
export function useFieldHighlight(
  iframeRef: RefObject<HTMLIFrameElement>,
  options: UseFieldHighlightOptions = {}
): UseFieldHighlightReturn {
  const { config, enableBidirectional = false } = options;
  
  const { 
    activeHighlightedField, 
    highlightedFieldName,
    actions 
  } = useClientFlowStore();

  // Create highlight engine instance
  const highlightEngine = useMemo(() => {
    const engine = new FieldHighlightEngine({
      ...DEFAULT_HIGHLIGHT_CONFIG,
      ...config,
    });
    return engine;
  }, [config]);

  // Inject styles when iframe loads
  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      
      const injectStyles = () => {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.readyState === 'complete') {
          highlightEngine.injectStyles(iframe);
        }
      };

      // Inject immediately if already loaded
      injectStyles();

      // Listen for load event
      iframe.addEventListener('load', injectStyles);

      return () => {
        iframe.removeEventListener('load', injectStyles);
      };
    }
  }, [iframeRef, highlightEngine]);

  // Setup bidirectional sync (template clicks → form focus)
  useEffect(() => {
    if (!enableBidirectional || !iframeRef.current) return;

    const cleanup = highlightEngine.setupBidirectionalSync(
      iframeRef.current,
      (fieldId: string) => {
        // When template element is clicked, focus the corresponding form field
        actions.setHighlightedField(fieldId);
        
        // Try to focus the actual form field
        const formField = document.querySelector(`[name="${fieldId}"]`) as HTMLElement;
        if (formField) {
          formField.focus();
          formField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    );

    return cleanup;
  }, [iframeRef, enableBidirectional, highlightEngine, actions]);

  // Auto-highlight when activeHighlightedField changes
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    // Wait for iframe to be fully loaded
    const performHighlight = () => {
      if (iframeDoc.readyState !== 'complete') {
        // If not ready, wait for load event
        iframe.addEventListener('load', performHighlight, { once: true });
        return;
      }

      if (activeHighlightedField) {
        // Re-inject styles first to ensure they exist
        highlightEngine.injectStyles(iframe);

        // Then highlight - use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          highlightEngine.highlightField(
            iframe,
            activeHighlightedField,
            highlightedFieldName || undefined
          );
        });
      } else {
        highlightEngine.clearHighlight(iframe);
      }
    };

    performHighlight();

    // Cleanup - remove event listener if component unmounts
    return () => {
      iframe.removeEventListener('load', performHighlight);
    };
  }, [activeHighlightedField, highlightedFieldName, highlightEngine]);

  // Manual control methods
  const highlightField = useCallback((fieldId: string, fieldName?: string) => {
    actions.setHighlightedField(fieldId, fieldName);
  }, [actions]);

  const clearHighlight = useCallback(() => {
    actions.setHighlightedField(null);
  }, [actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      highlightEngine.cleanup();
    };
  }, [highlightEngine]);

  return {
    highlightField,
    clearHighlight,
    activeFieldId: activeHighlightedField,
  };
}
