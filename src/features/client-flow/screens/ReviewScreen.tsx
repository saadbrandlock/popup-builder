import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Radio, Space, Select, Row, Col, Spin } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Clock, Users, Eye, CheckCircle2 } from 'lucide-react';
import { BrowserPreview, BrowserPreviewSkeleton, DeviceToggle } from '../../../components/common';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { ClientFlowData } from '@/types';
import { getTemplatesForDevice, getTemplatesForDeviceAndShopper, getUniqueShoppersFromTemplates } from '../utils/template-filters';
import { useClientFlow } from '../hooks/use-client-flow';
import { buildContentMappingFromShopper } from '../utils/content-mapping';
import { StepInfoBanner } from '../components/StepInfoBanner';

const { Text } = Typography;

/** Single row in the Template Review Progress card */
const ProgressItem: React.FC<{ done: boolean; active?: boolean; label: string }> = ({ done, active, label }) => {
  if (done) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-green-50/60 rounded-lg border border-green-200/80">
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircleOutlined className="text-white" style={{ fontSize: 10 }} />
        </div>
        <span className="text-green-700 font-medium text-xs">{label}</span>
      </div>
    );
  }
  if (active) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-orange-50/60 rounded-lg border border-orange-200/80">
        <div className="w-5 h-5 bg-orange-400 rounded-full flex items-center justify-center animate-pulse flex-shrink-0">
          <ClockCircleOutlined className="text-white" style={{ fontSize: 10 }} />
        </div>
        <span className="text-orange-700 font-medium text-xs">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
      <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
        <ClockCircleOutlined className="text-gray-400" style={{ fontSize: 10 }} />
      </div>
      <span className="text-gray-400 font-medium text-xs">{label}</span>
    </div>
  );
};

/**
 * ReviewScreen - Step 4 - Final review screen
 * Shows review status and browser preview with shopper group dropdown
 * for content switching. Follows the same UI pattern as Steps 1, 2, 3.
 */
export const ReviewScreen: React.FC = () => {
  const { accountDetails } = useGenericStore();
  const { clientData, actions, selectedReviewTemplateId, activeContentShopper, stepStatuses } = useClientFlowStore();
  const { shoppers } = useGenericStore();
  const { finalizeClientApproval } = useClientFlow();

  const [selectedDevice, setSelectedDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // --- Shopper groups derived from all templates for the selected device ---
  const deviceTemplates = useMemo(
    () => getTemplatesForDevice(clientData, selectedDevice),
    [clientData, selectedDevice]
  );

  const shopperGroups = useMemo(
    () => getUniqueShoppersFromTemplates(deviceTemplates),
    [deviceTemplates]
  );

  const activeShopperId = activeContentShopper?.content?.id != null
    ? Number(activeContentShopper.content.id)
    : null;

  // Initialise the first shopper when shoppers load or device changes
  useEffect(() => {
    if (shopperGroups.length > 0 && activeShopperId == null) {
      const first = shopperGroups[0]
      actions.setActiveContentShopper({
        content: { name: first.name, id: first.id.toString() },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopperGroups]);

  // --- Templates filtered by device + current shopper ---
  const filteredTemplates = useMemo(
    () => getTemplatesForDeviceAndShopper(clientData, selectedDevice, activeShopperId),
    [clientData, selectedDevice, activeShopperId]
  );

  const selectedTemplateId =
    filteredTemplates.some((t) => t.template_id === selectedReviewTemplateId)
      ? selectedReviewTemplateId
      : (filteredTemplates[0]?.template_id ?? null);

  const template = useMemo(() => {
    if (!filteredTemplates.length) return null;
    return filteredTemplates.find((t) => t.template_id === selectedTemplateId) ?? filteredTemplates[0];
  }, [filteredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (template) actions.setSelectedTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const onShopperChange = (value: number) => {
    const shopper = shopperGroups.find((s) => s.id === value);
    if (shopper) {
      actions.setActiveContentShopper({
        content: { name: shopper.name, id: shopper.id.toString() },
      });
    }
  };

  // Populate content + coupon data whenever the active shopper changes
  // so BrowserPreview's content parser receives the correct field values.
  useEffect(() => {
    if (activeShopperId == null || !clientData?.length) {
      actions.setContentFormData({});
      actions.setSelectedCouponsData([]);
      return;
    }

    const mapping = buildContentMappingFromShopper(clientData, activeShopperId);
    actions.setContentFormData(mapping);

    for (const tmpl of clientData) {
      const shopper = tmpl.shoppers?.find((s) => s.id === activeShopperId);
      if (shopper?.coupons?.length) {
        actions.setSelectedCouponsData(
          shopper.coupons.map((c) => ({
            offerText: c.offer_heading,
            subtext: c.offer_sub_heading || '',
          }))
        );
        break;
      }
    }
  }, [activeShopperId, clientData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear on unmount to avoid leaking into other steps
  useEffect(() => {
    return () => {
      actions.setContentFormData({});
      actions.setSelectedCouponsData([]);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Device-aware helpers — mirrors the same logic in ClientFlow.tsx.
  // In a parent-child pair, the desktop template only has desktopDesign and the
  // mobile template only has mobileDesign, so every() across all templates always
  // returns false for each step. Filter to the relevant device first.
  const isApproved = (templateId: string, key: string) =>
    stepStatuses[templateId]?.stepStatus?.[key]?.status === 'approved';

  const desktopTemplates = useMemo(
    () => (clientData ?? []).filter(t => t.devices?.some((d: { device_type: string }) => d.device_type === 'desktop')),
    [clientData]
  );
  const mobileTemplates = useMemo(
    () => (clientData ?? []).filter(t => t.devices?.some((d: { device_type: string }) => d.device_type === 'mobile')),
    [clientData]
  );

  const desktopApproved = useMemo(() =>
    desktopTemplates.length > 0 && desktopTemplates.every(t => isApproved(t.template_id, 'desktopDesign')),
  [desktopTemplates, stepStatuses]);

  const mobileApproved = useMemo(() =>
    mobileTemplates.length > 0 && mobileTemplates.every(t => isApproved(t.template_id, 'mobileDesign')),
  [mobileTemplates, stepStatuses]);

  const copyApproved = useMemo(() =>
    !!clientData?.length && clientData.every(t => isApproved(t.template_id, 'templateCopy')),
  [clientData, stepStatuses]);

  // All 3 steps approved → enable Finalize button
  const allStepsApproved = desktopApproved && mobileApproved && copyApproved;

  // Already sent for admin review — show success state instead of button
  const alreadyFinalized = useMemo(() => {
    if (!clientData?.length) return false;
    return clientData.every((t) => stepStatuses[t.template_id]?.templateStatus === 'admin-review');
  }, [clientData, stepStatuses]);

  // Admin has approved and published — both "Sent for Admin Review" and "Approved by Admin" are complete
  const isPublished = useMemo(() => {
    if (!clientData?.length) return false;
    return clientData.every(
      (t) => t.staging_status === 'published' || t.template_status === 'published'
    );
  }, [clientData]);

  const handleFinalizeApproval = async () => {
    setIsFinalizing(true);
    try {
      await finalizeClientApproval();
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
      <section className="center-content">
        <StepInfoBanner
          message={<>Your popup customization is under <strong>review</strong>. Preview how it will look once approved. Use the shopper dropdown to view content for each group.</>}
        />

        <Row gutter={[20, 20]} align="stretch">
          {/* ========== LEFT COLUMN — Review status ========== */}
          <Col xs={24} lg={8}>
            {/* Review Progress Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
                    <ClockCircleOutlined className="text-white text-xs" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">Template Review Progress</span>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {/* Step 1: Submitted — always complete */}
                  <ProgressItem done label="Submitted to Client Review" />

                  {/* Step 2–4: Individual approval steps */}
                  <ProgressItem done={desktopApproved} active={!desktopApproved} label="Desktop Design" />
                  <ProgressItem done={mobileApproved} active={!mobileApproved && desktopApproved} label="Mobile Design" />
                  <ProgressItem done={copyApproved} active={!copyApproved && desktopApproved && mobileApproved} label="Copy Review" />

                  {/* Step 5: Sent for admin review — done when sent or when published */}
                  <ProgressItem done={alreadyFinalized || isPublished} active={allStepsApproved && !alreadyFinalized && !isPublished} label="Sent for Admin Review" />

                  {/* Step 6: Approved by admin — done when template is published */}
                  <ProgressItem done={isPublished} active={alreadyFinalized && !isPublished} label="Approved by Admin" />
                </div>

                {/* Estimated time — hide once sent to admin or published */}
                {!alreadyFinalized && !isPublished && (
                  <div className="mt-4 px-3 py-2.5 bg-blue-50/70 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <Clock size={10} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-blue-700 text-xs font-semibold block">Estimated Review Time</span>
                        <span className="text-blue-600 text-[11px] leading-relaxed">24-48 hours during business days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Finalize card — shown when all steps approved, replaces Submitted Details */}
            {allStepsApproved ? (
              <div className={`rounded-xl border overflow-hidden shadow-sm mt-4 ${alreadyFinalized || isPublished ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-white'}`}>
                <div className={`px-4 py-3.5 border-b ${alreadyFinalized || isPublished ? 'border-green-100 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${alreadyFinalized || isPublished ? 'bg-green-500' : 'bg-blue-500'}`}>
                      <CheckCircleOutlined className="text-white text-xs" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {isPublished ? 'Approved by Admin' : alreadyFinalized ? 'Sent for Admin Review' : 'All Steps Approved!'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-600 mb-4">
                    {isPublished
                      ? 'Your template has been approved and published. It is now live.'
                      : alreadyFinalized
                        ? 'Your template has been submitted for admin review. You will be notified once it is approved.'
                        : 'All design and content steps have been reviewed and approved. Finalize to submit your template for admin review.'}
                  </p>
                  {!alreadyFinalized && !isPublished && (
                    <button
                      onClick={handleFinalizeApproval}
                      disabled={isFinalizing}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                    >
                      {isFinalizing ? (
                        <><Spin size="small" /><span>Finalizing...</span></>
                      ) : (
                        <><CheckCircle2 size={15} /><span>Finalize Changes</span></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Submitted Details Card — shown while steps still pending */
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
                <div className="px-4 py-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-gray-800">Submitted Details</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Template Type:</span>
                    <span className="text-xs font-semibold text-gray-800">Coupon Module</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Steps Completed:</span>
                    <span className="text-xs font-semibold text-gray-800">
                      {[desktopApproved, mobileApproved, copyApproved].filter(Boolean).length} / 3
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Col>

          {/* ========== RIGHT COLUMN — Preview ========== */}
          <Col xs={24} lg={16}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col">
              {/* Combined header panel */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/60">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Left: Title */}
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-800">Live Preview</span>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Shopper Group */}
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

                    {/* Device toggle */}
                    <DeviceToggle value={selectedDevice} onChange={setSelectedDevice} />
                  </div>
                </div>
              </div>

              {/* Preview body */}
              <div className="p-5 flex-1">
                <div className={`${selectedDevice === 'mobile' ? 'flex items-start justify-center' : ''}`}>
                  <div className={selectedDevice === 'mobile' ? 'max-w-[380px] w-full' : 'w-full'}>
                    {accountDetails && template ? (
                      <BrowserPreview
                        className="shadow-md"
                        viewport={selectedDevice}
                        websiteBackground={{
                          backgroundImage: {
                            desktop: 'https://debuficgraftb.cloudfront.net/dev-staging/KP_1739628284.604344.png',
                            mobile: 'https://i.ibb.co/dwfFJCCk/Screenshot-2025-08-13-180522.png',
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
          </Col>
        </Row>
      </section>
    </>
  );
};