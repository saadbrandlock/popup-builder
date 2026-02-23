import React, { useEffect, useMemo, useState } from 'react';
import { Select, Collapse } from 'antd';
import type { CollapseProps } from 'antd';
import { Eye, Users, Monitor, CheckCircle2, Pencil } from 'lucide-react';
import { BrowserPreview, BrowserPreviewSkeleton, PopupOnlyView, DeviceToggle } from '@/components/common';
import { useGenericStore } from '@/stores/generic.store';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { ClientFlowData } from '@/types';
import {
  getTemplatesForDevice,
  getTemplatesForDeviceAndShopper,
  getUniqueShoppersFromTemplates,
} from '@/features/client-flow/utils/template-filters';
import { buildContentMappingFromShopper } from '@/features/client-flow/utils/content-mapping';

export interface DesignReviewPanelProps {
  clientData: ClientFlowData[];
  selectedTemplateId: string | null;
  onTemplateChange: (templateId: string) => void;
  activeShopperId: number | null;
  onShopperChange: (shopperId: number) => void;
  /** When true, shows side-by-side desktop+mobile view. When false, shows BrowserPreview (Live Preview tab). Default: false */
  sideByMode?: boolean;
}

/**
 * Design Review Panel - Same Live Preview build as client flow ReviewScreen (step 4).
 * Supports multiple templates via TemplateTabsHeader, shopper group selector, and device toggle.
 * When sideByMode=true: shows side-by-side desktop + mobile popup previews (Submission Review tab).
 * When sideByMode=false: shows the standard BrowserPreview (Live Preview tab).
 */
export const DesignReviewPanel: React.FC<DesignReviewPanelProps> = ({
  clientData,
  selectedTemplateId,
  onTemplateChange,
  activeShopperId,
  onShopperChange,
  sideByMode = false,
}) => {
  const { accountDetails, navigate } = useGenericStore();
  const { actions: clientFlowActions } = useClientFlowStore();
  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Populate content + coupon data in the store whenever the active shopper changes.
  // PopupOnlyView already reads from the store — this is the only missing link.
  useEffect(() => {
    if (activeShopperId == null || !clientData.length) {
      clientFlowActions.setContentFormData({});
      clientFlowActions.setSelectedCouponsData([]);
      return;
    }

    // Text content (heading, sub-heading, body…)
    const mapping = buildContentMappingFromShopper(clientData, activeShopperId);
    clientFlowActions.setContentFormData(mapping);

    // Coupon data — map API shape { offer_heading, offer_sub_heading } → store shape { offerText, subtext }
    for (const template of clientData) {
      const shopper = template.shoppers?.find((s) => s.id === activeShopperId);
      if (shopper?.coupons?.length) {
        clientFlowActions.setSelectedCouponsData(
          shopper.coupons.map((c) => ({
            offerText: c.offer_heading,
            subtext: c.offer_sub_heading || '',
          }))
        );
        break;
      }
    }
  }, [activeShopperId, clientData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear on unmount so admin review doesn't leak stale content into the client flow store
  useEffect(() => {
    return () => {
      clientFlowActions.setContentFormData({});
      clientFlowActions.setSelectedCouponsData([]);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deviceTemplates = useMemo(
    () => getTemplatesForDevice(clientData, selectedDevice),
    [clientData, selectedDevice]
  );

  const shopperGroups = useMemo(
    () => getUniqueShoppersFromTemplates(deviceTemplates),
    [deviceTemplates]
  );

  const filteredTemplates = useMemo(
    () => getTemplatesForDeviceAndShopper(clientData, selectedDevice, activeShopperId),
    [clientData, selectedDevice, activeShopperId]
  );

  const resolvedTemplateId =
    filteredTemplates.some((t) => t.template_id === selectedTemplateId)
      ? selectedTemplateId
      : (filteredTemplates[0]?.template_id ?? null);

  const template = useMemo(() => {
    if (!filteredTemplates.length) return null;
    return (
      filteredTemplates.find((t) => t.template_id === resolvedTemplateId) ??
      filteredTemplates[0]
    );
  }, [filteredTemplates, resolvedTemplateId]);

  // For side-by-side mode: get desktop and mobile templates independently
  const desktopTemplates = useMemo(
    () => getTemplatesForDevice(clientData, 'desktop'),
    [clientData]
  );
  const mobileTemplates = useMemo(
    () => getTemplatesForDevice(clientData, 'mobile'),
    [clientData]
  );

  const desktopTemplate = useMemo(() => {
    const byDevice = getTemplatesForDeviceAndShopper(clientData, 'desktop', activeShopperId);
    return byDevice.find((t) => t.template_id === resolvedTemplateId) ?? byDevice[0] ?? null;
  }, [clientData, activeShopperId, resolvedTemplateId]);

  const mobileTemplate = useMemo(() => {
    const byDevice = getTemplatesForDeviceAndShopper(clientData, 'mobile', activeShopperId);
    return byDevice.find((t) => t.template_id === resolvedTemplateId) ?? byDevice[0] ?? null;
  }, [clientData, activeShopperId, resolvedTemplateId]);

  // Shopper groups for side-by-side: from all templates
  const allShopperGroups = useMemo(
    () => getUniqueShoppersFromTemplates([...desktopTemplates, ...mobileTemplates]),
    [desktopTemplates, mobileTemplates]
  );

  useEffect(() => {
    if (shopperGroups.length > 0 && activeShopperId == null) {
      onShopperChange(shopperGroups[0].id);
    }
  }, [shopperGroups, activeShopperId, onShopperChange]);

  const showTemplateSelector = deviceTemplates.length > 1;

  // ─── Side-by-Side Mode (Submission Review tab) ─────────────────────────────
  if (sideByMode) {
    const effectiveShopperGroups = allShopperGroups.length > 0 ? allShopperGroups : shopperGroups;

    const sideByItems: CollapseProps['items'] = [
      {
        key: '1',
        label: (
          <div className="flex items-center gap-3">
            <Monitor size={16} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">Design Review</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
              <CheckCircle2 size={11} />
              Desktop Approved
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
              <CheckCircle2 size={11} />
              Mobile Approved
            </span>
          </div>
        ),
        extra: resolvedTemplateId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate?.(`/popup-builder/build/${resolvedTemplateId}/edit`);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil size={12} />
            Edit Template
          </button>
        ) : undefined,
        children: (
          <>
            {/* Shopper selector + Desktop/Mobile tab toggle row */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/60">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  {effectiveShopperGroups.length > 0 && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                      <Users size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        Shopper Group
                      </span>
                      <Select
                        value={activeShopperId ?? effectiveShopperGroups[0]?.id}
                        onChange={onShopperChange}
                        size="small"
                        style={{ minWidth: 170 }}
                        options={effectiveShopperGroups.map((s) => ({
                          label: s.name,
                          value: s.id,
                        }))}
                      />
                    </div>
                  )}
                </div>

                {/* Device tab switcher */}
                <DeviceToggle value={selectedDevice} onChange={setSelectedDevice} />
              </div>
            </div>

            {/* Single preview pane — switches based on selectedDevice */}
            <div className="bg-slate-950 rounded-b-xl overflow-hidden">
              {selectedDevice === 'desktop' ? (
                accountDetails && desktopTemplate ? (
                  <PopupOnlyView
                    viewport="desktop"
                    popupTemplate={[desktopTemplate]}
                    compact={true}
                    showViewportLabel={false}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[420px] text-slate-600 text-xs">
                    No desktop template available
                  </div>
                )
              ) : accountDetails && mobileTemplate ? (
                <PopupOnlyView
                  viewport="mobile"
                  popupTemplate={[mobileTemplate]}
                  compact={true}
                  showViewportLabel={false}
                />
              ) : (
                <div className="flex items-center justify-center h-[420px] text-slate-600 text-xs">
                  No mobile template available
                </div>
              )}
            </div>
          </>
        ),
        style: { padding: 0 },
      },
    ];

    return (
      <Collapse
        defaultActiveKey={['1']}
        bordered={false}
        className="!bg-white !rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        items={sideByItems}
      />
    );
  }

  // ─── Live Preview Mode (Live Preview tab) ───────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/60">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-800">Live Preview</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {shopperGroups.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <Users size={13} className="text-gray-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  Shopper Group
                </span>
                <Select
                  value={activeShopperId ?? shopperGroups[0]?.id}
                  onChange={onShopperChange}
                  size="small"
                  style={{ minWidth: 170 }}
                  options={shopperGroups.map((s) => ({
                    label: s.name,
                    value: s.id,
                  }))}
                />
              </div>
            )}

            <DeviceToggle value={selectedDevice} onChange={setSelectedDevice} />
          </div>
        </div>
      </div>

      <div className="p-5 flex-1">
        <div
          className={
            selectedDevice === 'mobile'
              ? 'flex items-start justify-center'
              : ''
          }
        >
          <div
            className={
              selectedDevice === 'mobile' ? 'max-w-[380px] w-full' : 'w-full'
            }
          >
            {accountDetails && template ? (
              <BrowserPreview
                className="shadow-md"
                viewport={selectedDevice}
                websiteBackground={{
                  backgroundImage: {
                    desktop:
                      'https://debuficgraftb.cloudfront.net/dev-staging/KP_1739628284.604344.png',
                    mobile:
                      'https://i.ibb.co/dwfFJCCk/Screenshot-2025-08-13-180522.png',
                  },
                  websiteUrl: accountDetails.domain,
                  companyName: accountDetails.name,
                  category: accountDetails.category,
                  clientId: accountDetails.id.toString(),
                  id: accountDetails.id.toString(),
                }}
                popupTemplate={[template]}
                showBrowserChrome={true}
                interactive={false}
                scale={selectedDevice === 'mobile' ? 0.55 : 0.9}
              />
            ) : (
              <BrowserPreviewSkeleton viewport={selectedDevice} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
