import React, { useEffect, useState, useRef, useMemo } from 'react';
import { safeDecodeAndSanitizeHtml } from '@/lib/utils/helper';
import { useOptimizedHTMLMerger } from '@/lib/hooks';
import { ReminderTabConfig } from '@/features/builder/types';
import { Spin } from 'antd';
import { useFieldHighlight } from '../../../features/client-flow/hooks/use-field-highlight';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { templateContentParser, ContentMapping } from '@/lib/utils/template-content-parser';

interface PopupOnlyViewProps {
  viewport: 'desktop' | 'mobile';
  popupTemplate: any | null;
  className?: string;
  showViewportLabel?: boolean;
  compact?: boolean;
}

export const PopupOnlyView: React.FC<PopupOnlyViewProps> = ({
  viewport,
  popupTemplate,
  className = '',
  showViewportLabel = true,
  compact = false,
}) => {
  const [baseHtml, setBaseHtml] = useState<string>(''); // Base HTML without content updates
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { mergeFromRecord } = useOptimizedHTMLMerger();
  const { contentFormData, selectedCouponsData, hasCouponSelectionChanged } = useClientFlowStore();

  // Initialize field highlighting - only after iframe is ready
  useFieldHighlight(iframeRef, {
    enableBidirectional: false, // Disable click-to-focus for popup-only view
  });

  // Create content mapping from form data - memoized for performance
  const contentMapping: ContentMapping = useMemo(() => {
    const mapping: ContentMapping = {};
    Object.entries(contentFormData).forEach(([fieldId, value]) => {
      if (value && typeof value === 'string') {
        mapping[fieldId] = value;
      }
    });
    return mapping;
  }, [contentFormData]);

  // Process popup template HTML (only when template changes)
  useEffect(() => {
    const processPopupHtml = async () => {
      if (!popupTemplate || !Array.isArray(popupTemplate) || popupTemplate.length === 0) {
        setBaseHtml('');
        setSanitizedHtml('');
        return;
      }

      setIsProcessing(true);
      try {
        const template = popupTemplate[0];

        if (template && template.template_html) {
          const processedHtml = await safeDecodeAndSanitizeHtml(template.template_html);

          const mergedHtml = mergeFromRecord(
            {
              reminder_tab_state_json: template.reminder_tab_state_json as ReminderTabConfig,
              template_html: processedHtml,
            },
            {
              enableAnimations: true,
              animationDuration: '0.4s',
              autoOpenPopup: true,
              disableCloseButtons: true,
              hideReminderTab: true,
            }
          );

          setBaseHtml(mergedHtml);
        }
      } catch (error) {
        setBaseHtml('');
      } finally {
        setIsProcessing(false);
      }
    };

    processPopupHtml();
  }, [popupTemplate, viewport]);

  // Apply content updates when form data or coupon selection changes
  useEffect(() => {
    if (!baseHtml) {
      setSanitizedHtml('');
      return;
    }

    try {
      // Apply content mapping to the base HTML
      let updatedHtml = templateContentParser.updateContent(baseHtml, contentMapping);
      // Only update coupon list when client has changed selection (preserve template default initially)
      const shouldUpdateCoupons =
        (selectedCouponsData?.length ?? 0) > 0 || hasCouponSelectionChanged;
      if (shouldUpdateCoupons) {
        updatedHtml = templateContentParser.updateCouponList(
          updatedHtml,
          selectedCouponsData ?? []
        );
      }
      setSanitizedHtml(updatedHtml);
    } catch (error) {
      setSanitizedHtml(baseHtml);
    }
  }, [baseHtml, contentMapping, selectedCouponsData, hasCouponSelectionChanged]);

  // Update iframe content and inject viewport-specific styles
  useEffect(() => {
    if (!iframeRef.current || !sanitizedHtml) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDoc) {
      // Write content
      iframeDoc.open();
      iframeDoc.write(sanitizedHtml);
      iframeDoc.close();

      // Wait for iframe to fully load before marking as ready
      const handleIframeLoad = () => {
        // Inject viewport-specific styles for .u-popup-container
        const existingStyle = iframeDoc.getElementById('viewport-styles');
        if (existingStyle) {
          existingStyle.remove();
        }

        const style = iframeDoc.createElement('style');
        style.id = 'viewport-styles';

        // Adjust dimensions for compact mode
        const containerWidth = viewport === 'desktop' ? '100%' : '375px';
        const scaleValue = compact ? (viewport === 'desktop' ? '0.7' : '0.85') : '1';

        style.textContent = `
          .u-popup-container {
            width: ${containerWidth} !important;
            max-width: 100%;
            margin: 0 auto;
            transform: scale(${scaleValue}) !important;
            transform-origin: center center !important;
          }

          body {
            overflow: hidden !important;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
        `;
        iframeDoc.head.appendChild(style);

        // Mark iframe as ready for highlighting
        setIframeReady(true);
      };

      // Handle load immediately if already complete, otherwise wait for load event
      if (iframeDoc.readyState === 'complete') {
        handleIframeLoad();
      } else {
        iframe.addEventListener('load', handleIframeLoad, { once: true });
      }

      // Set fixed height based on viewport and compact mode
      const fixedHeight = compact
        ? (viewport === 'desktop' ? '550px' : '600px')
        : (viewport === 'desktop' ? '600px' : '650px');
      iframe.style.height = fixedHeight;

      // Cleanup - remove event listener if component unmounts
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
      };
    }
  }, [sanitizedHtml, viewport, compact]);

  if (isProcessing) {
    return <div className="flex items-center justify-center h-96"><Spin size='large' /></div>;
  }

  const iframeHeight = compact
    ? (viewport === 'desktop' ? '500px' : '600px')
    : (viewport === 'desktop' ? '600px' : '650px');

  const iframeWidth = compact && viewport === 'desktop' ? '90%' : '100%';

  return (
    <div className="flex items-center justify-center !w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        className="border-0 bg-transparent"
        style={{
          width: iframeWidth,
          maxWidth: '100%',
          height: iframeHeight,
          border: 'none',
          background: 'transparent',
          overflow: 'hidden',
        }}
        title={`${viewport === 'desktop' ? 'Desktop' : 'Mobile'} Popup Preview`}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
};
