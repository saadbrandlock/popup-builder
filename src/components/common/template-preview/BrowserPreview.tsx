import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { BrowserPreviewProps } from '../../../features/client-flow/types/clientFlow';
import { Safari } from '@/components/magicui/safari';
import Android from '@/components/magicui/android';
import { safeDecodeAndSanitizeHtml } from '@/lib/utils/helper';
import { useOptimizedHTMLMerger } from '@/lib/hooks';
import { ReminderTabConfig } from '@/features/builder/types';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { templateContentParser, ContentMapping } from '@/lib/utils/template-content-parser';

/**
 * BrowserPreview - Enhanced wrapper that combines existing PopupPreview with website background
 * Provides realistic browser context for popup previews
 */
export const BrowserPreview: React.FC<BrowserPreviewProps> = ({
  viewport,
  websiteBackground,
  popupTemplate,
  interactive = false,
  scale = 1,
  onPopupInteraction,
  className = '',
}) => {
  const [baseHtml, setBaseHtml] = useState<string>('');
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  // iframeEl as state (not just ref) so the write-effect re-runs whenever a new
  // iframe DOM node is mounted (e.g. when viewport switches Safari ↔ Android).
  const [iframeEl, setIframeEl] = useState<HTMLIFrameElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeCallbackRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    setIframeEl(el);
  }, []);
  const { mergeFromRecord } = useOptimizedHTMLMerger();

  const { contentFormData, selectedCouponsData, hasCouponSelectionChanged } = useClientFlowStore();

  const contentMapping: ContentMapping = useMemo(() => {
    const mapping: ContentMapping = {};
    Object.entries(contentFormData).forEach(([fieldId, value]) => {
      if (value && typeof value === 'string') mapping[fieldId] = value;
    });
    return mapping;
  }, [contentFormData]);

  // Process popup template HTML when it changes
  useEffect(() => {
    const processPopupHtml = async () => {
      if (
        !popupTemplate ||
        !Array.isArray(popupTemplate) ||
        popupTemplate.length === 0
      ) {
        setBaseHtml('');
        return;
      }

      setBaseHtml(''); // Clear stale content immediately so the iframe unmounts cleanly
      setIsProcessing(true);
      try {
        // Get the first template that matches the current viewport
        const template = popupTemplate[0]; // Fallback to first template

        if (template && template.template_html) {
          const processedHtml = await safeDecodeAndSanitizeHtml(
            template.template_html
          );

          const mergedHtml = mergeFromRecord(
            {
              reminder_tab_state_json:
                template.reminder_tab_state_json as ReminderTabConfig,
              template_html: processedHtml,
            },
            {
              enableAnimations: true,
              animationDuration: '0.4s',
              autoOpenPopup: true, // Auto-open popup in preview mode
            }
          );

          setBaseHtml(mergedHtml);
        } else {
          setBaseHtml('');
        }
      } catch (error) {
        console.error('Error processing popup template HTML:', error);
        setBaseHtml('');
      } finally {
        setIsProcessing(false);
      }
    };

    processPopupHtml();
  }, [popupTemplate, viewport]);

  // Apply content replacements (field values + coupons) on top of the base HTML
  useEffect(() => {
    if (!baseHtml) { setSanitizedHtml(''); return; }
    try {
      let updatedHtml = templateContentParser.updateContent(baseHtml, contentMapping);
      const shouldUpdateCoupons = (selectedCouponsData?.length ?? 0) > 0 || hasCouponSelectionChanged;
      if (shouldUpdateCoupons) {
        updatedHtml = templateContentParser.updateCouponList(updatedHtml, selectedCouponsData ?? []);
      }
      setSanitizedHtml(updatedHtml);
    } catch {
      setSanitizedHtml(baseHtml);
    }
  }, [baseHtml, contentMapping, selectedCouponsData, hasCouponSelectionChanged]);

  // Write content whenever sanitizedHtml changes OR whenever a new iframe DOM element
  // is mounted (iframeEl changes). The second case covers viewport switches where
  // Safari ↔ Android swap destroys the old iframe and creates a fresh empty one —
  // sanitizedHtml doesn't change so [sanitizedHtml] alone would never re-fire.
  useEffect(() => {
    if (!iframeEl || !sanitizedHtml) return;
    const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;

    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(sanitizedHtml);
      iframeDoc.close();

      if (interactive) {
        iframeEl.contentWindow?.addEventListener('popupInteraction', (e: any) => {
          onPopupInteraction?.(e.detail?.type || 'popup-interaction');
        });
      }
    }
  }, [sanitizedHtml, iframeEl, interactive, onPopupInteraction]);

  // Inline the iframe directly — never define components inside render functions,
  // as React creates a new type each render which unmounts/remounts the iframe and
  // breaks the write-to-iframe effect (iframeRef.current becomes null at the wrong time).
  const popupIframe = sanitizedHtml ? (
    <iframe
      ref={iframeCallbackRef}
      className="w-full h-full border-0 bg-transparent"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
        overflow: 'hidden',
      }}
      title="Interactive Popup Preview"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  ) : null;

  return (
    <div className="w-full flex justify-center">
      {viewport === 'desktop' ? (
        <Safari
          url={websiteBackground.websiteUrl}
          imageSrc={websiteBackground.backgroundImage.desktop}
          fit="contain"
          align="top"
          className="w-full"
        >
          {popupIframe}
        </Safari>
      ) : (
        <Android
          className="inline-block"
          url={websiteBackground.websiteUrl}
          imageSrc={websiteBackground.backgroundImage.mobile}
          fit="contain"
          align="top"
        >
          {popupIframe}
        </Android>
      )}
    </div>
  );
};

/**
 * BrowserPreviewSkeleton - Loading state component
 */
export const BrowserPreviewSkeleton: React.FC<{
  viewport: 'desktop' | 'mobile';
}> = ({ viewport }) => {
  return (
    <div
      className="browser-preview-skeleton bg-gray-200 rounded-lg shadow-lg overflow-hidden animate-pulse"
      // style={{
      //   width: `${width}px`,
      //   height: `${height + (viewport === 'desktop' ? 80 : 50)}px`,
      // }}
    >
      {/* Chrome Skeleton */}
      <div
        className={`bg-gray-300 ${viewport === 'desktop' ? 'h-20' : 'h-12'}`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          </div>
          <div className="flex-1 mx-4">
            <div className="h-6 bg-gray-400 rounded"></div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-8 space-y-4">
        <div className="h-8 bg-gray-300 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-2">
              <div className="h-32 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
