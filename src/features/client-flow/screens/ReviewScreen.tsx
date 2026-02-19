import React, { useEffect, useState, useMemo } from 'react';
import { Typography, Radio, Space, Select, Row, Col, Spin } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, MobileOutlined } from '@ant-design/icons';
import { Clock, Computer, Users, Eye, CheckCircle2 } from 'lucide-react';
import { BrowserPreview, BrowserPreviewSkeleton } from '../../../components/common';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { ClientFlowData } from '@/types';
import { getTemplatesForDevice, getTemplatesForDeviceAndShopper, getUniqueShoppersFromTemplates } from '../utils/template-filters';
import { useClientFlow } from '../hooks/use-client-flow';

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

  // All 3 steps approved across all templates → enable Finalize button
  const allStepsApproved = useMemo(() => {
    if (!clientData?.length) return false;
    return clientData.every((t) => {
      const ts = stepStatuses[t.template_id];
      return (
        ts?.stepStatus?.desktopDesign?.status === 'approved' &&
        ts?.stepStatus?.mobileDesign?.status === 'approved' &&
        ts?.stepStatus?.templateCopy?.status === 'approved'
      );
    });
  }, [clientData, stepStatuses]);

  // Already sent for admin review — show success state instead of button
  const alreadyFinalized = useMemo(() => {
    if (!clientData?.length) return false;
    return clientData.every((t) => stepStatuses[t.template_id]?.templateStatus === 'admin-review');
  }, [clientData, stepStatuses]);

  const handleFinalizeApproval = async () => {
    setIsFinalizing(true);
    try {
      await finalizeClientApproval();
    } finally {
      setIsFinalizing(false);
    }
  };

  // Individual step approval states (all templates must have each step approved)
  const desktopApproved = useMemo(() =>
    !!clientData?.length && clientData.every((t) => stepStatuses[t.template_id]?.stepStatus?.desktopDesign?.status === 'approved'),
  [clientData, stepStatuses]);

  const mobileApproved = useMemo(() =>
    !!clientData?.length && clientData.every((t) => stepStatuses[t.template_id]?.stepStatus?.mobileDesign?.status === 'approved'),
  [clientData, stepStatuses]);

  const copyApproved = useMemo(() =>
    !!clientData?.length && clientData.every((t) => stepStatuses[t.template_id]?.stepStatus?.templateCopy?.status === 'approved'),
  [clientData, stepStatuses]);

  return (
    <>
      <section className="center-content">
        {/* Info banner */}
        <div className="info-banner info">
          <span>
            Your popup customization is under <strong>review</strong>. Preview how it will look once approved.
            Use the shopper dropdown to view content for each group.
          </span>
        </div>

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

                  {/* Step 5: Sent for admin review */}
                  <ProgressItem done={alreadyFinalized} active={allStepsApproved && !alreadyFinalized} label="Sent for Admin Review" />

                  {/* Step 6: Approved */}
                  <ProgressItem done={false} label="Approved by Admin" />
                </div>

                {/* Estimated time — hide once sent to admin */}
                {!alreadyFinalized && (
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
              <div className={`rounded-xl border overflow-hidden shadow-sm mt-4 ${alreadyFinalized ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-white'}`}>
                <div className={`px-4 py-3.5 border-b ${alreadyFinalized ? 'border-green-100 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${alreadyFinalized ? 'bg-green-500' : 'bg-blue-500'}`}>
                      <CheckCircleOutlined className="text-white text-xs" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {alreadyFinalized ? 'Sent for Admin Review' : 'All Steps Approved!'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-600 mb-4">
                    {alreadyFinalized
                      ? 'Your template has been submitted for admin review. You will be notified once it is approved.'
                      : 'All design and content steps have been reviewed and approved. Finalize to submit your template for admin review.'}
                  </p>
                  {!alreadyFinalized && (
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
                    <Radio.Group
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      size="small"
                    >
                      <Radio.Button value="desktop">
                        <Space>
                          <Computer size={13} />
                          Desktop
                        </Space>
                      </Radio.Button>
                      <Radio.Button value="mobile">
                        <Space>
                          <MobileOutlined />
                          Mobile
                        </Space>
                      </Radio.Button>
                    </Radio.Group>
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