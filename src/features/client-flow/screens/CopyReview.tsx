import React, { useEffect, useMemo } from 'react';
import { Card, Row, Col } from 'antd';
import ContentForm from '../components/content-form';
import ShopperDetails from '../components/shopper-details';
import { PopupPreviewTabs } from '../../../components/common';
import FeedbackForm from '../components/feedback-form';
import { useClientFlow } from '../hooks/use-client-flow';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import ShopperSegmentSelector from '../components/shopper-segment-selector';

export const CopyReview: React.FC = () => {
  const { devices } = useDevicesStore();
  const { getDevices } = useClientFlow();
  const { clientData, activeContentShopper } = useClientFlowStore();
  const activeShopperId = activeContentShopper?.content?.id != null ? Number(activeContentShopper.content.id) : null;

  const templateIdForCopyReview = useMemo(() => {
    if (!activeContentShopper?.content?.id || !clientData?.length) return null;
    const shopperId = Number(activeContentShopper.content.id);
    const template = clientData.find((t) => t.shoppers?.some((s) => s.id === shopperId));
    return template?.template_id ?? null;
  }, [activeContentShopper?.content?.id, clientData]);

  useEffect(() => {
    if (devices.length > 0) return;
    getDevices();
  }, []);

  return (
    <>
      {/* LEFT: Shopper groups sidebar with vertical card list */}
      <aside className="right-panel">
        <h4>Shopper Groups</h4>
        <p>Configure copy for each group. Select one to begin.</p>
        <ShopperSegmentSelector listStyle />
      </aside>

      {/* CENTER: Content configuration + live preview + shopper details */}
      <section className="center-content">
        {/* Info banner */}
        <div className="info-banner info">
          <span>
            Review and customize the <strong>copy</strong> for this shopper group. Changes sync to the live preview below.
          </span>
        </div>

        {/* Shopper details at the top */}
        <div className="mt-5">
          <ShopperDetails displayMode="full" />
        </div>

        <Row gutter={[20, 20]} className="mt-5">
          {/* Content configuration with enhanced features */}
          <Col xs={24} lg={8}>
            <div className="card">
              <div className="card-body">
                <ContentForm />
              </div>
            </div>
          </Col>

          {/* Live preview with sync indicator and dark background */}
          <Col xs={24} lg={16}>
            <div className="card">
              <div className="card-body">
                <PopupPreviewTabs
                  clientData={clientData}
                  activeShopperId={activeShopperId}
                  enhanced
                />
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {/* Feedback sidebar - collapsible drawer */}
      <FeedbackForm
        type="copy-review"
        templateAvailable={!!templateIdForCopyReview}
        templateId={templateIdForCopyReview}
        mode="sidebar"
        placement="right"
        showApprove={false}
      />
    </>
  );
};
