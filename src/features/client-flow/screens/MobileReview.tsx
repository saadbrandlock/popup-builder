import React, { useEffect, useMemo } from 'react';
import { Spin, Row, Col } from 'antd';

import { PopupOnlyView, BrowserPreviewModal } from '../../../components/common';
import { useClientFlowStore } from '../../../stores/clientFlowStore';
import FeedbackForm from '../components/feedback-form';
import { useGenericStore } from '@/stores/generic.store';
import { getTemplatesForDevice, getTemplateOptionLabels } from '../utils/template-filters';
import { TemplateTabsHeader } from '../components/template-tabs-header';
import { Eye as EyeIcon } from 'lucide-react';
import { StepInfoBanner } from '../components/StepInfoBanner';

/**
 * MobileReview - Step 2 - Mobile review screen
 * Shows popup preview in mobile viewport. When multiple templates exist (as grouped by admin), user selects which template to review.
 */
export const MobileReview: React.FC = () => {
  const { accountDetails, navigate, browserPreviewModalOpen, actions: genericActions } = useGenericStore();
  const { clientData, actions, selectedReviewTemplateId, stepStatuses } = useClientFlowStore();

  const mobileTemplates = useMemo(() => getTemplatesForDevice(clientData, 'mobile'), [clientData]);
  const showTemplateSelector = mobileTemplates.length > 1;
  const selectedTemplateId =
    mobileTemplates.some((t) => t.template_id === selectedReviewTemplateId)
      ? selectedReviewTemplateId
      : (mobileTemplates[0]?.template_id ?? null);

  const template = useMemo(() => {
    if (!mobileTemplates.length) return null;
    return mobileTemplates.find((t) => t.template_id === selectedTemplateId) ?? mobileTemplates[0];
  }, [mobileTemplates, selectedTemplateId]);

  useEffect(() => {
    if (template) actions.setSelectedTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const onTemplateChange = (value: string) => {
    actions.setSelectedReviewTemplateId(value)
  };

  return (
    <>
      <section className="center-content">
        <StepInfoBanner
          message={<>Review how your popup appears on <strong>mobile devices</strong>. Ensure text is readable and buttons are easy to tap.</>}
        />

        {/* Template tabs + header (driven by current mobile templates) */}
        {showTemplateSelector && (
          <TemplateTabsHeader
            templates={mobileTemplates}
            selectedTemplateId={selectedTemplateId}
            onChange={onTemplateChange}
            stepStatuses={stepStatuses}
            designStepKey="mobileDesign"
          />
        )}

        <div className="template-header">
          <div className="template-info">
            <h4>{template ? getTemplateOptionLabels(template).name : 'Base Template'}</h4>
            <p>
              {template
                ? getTemplateOptionLabels(template).descriptionFull ||
                  'Mobile preview — how your popup appears on phones'
                : 'Mobile preview — how your popup appears on phones'}
            </p>
          </div>
          <div className="template-actions">
            <button
              type="button"
              className="cf-btn cf-btn-secondary"
              onClick={() => genericActions.setBrowserPreviewModalOpen(true)}
            >
              <EyeIcon size={16} />
              Preview Template
            </button>
          </div>
        </div>

        <Row gutter={[20, 20]} align="stretch">
          {/* Feedback column */}
          <Col xs={24} lg={8}>
            <div className="card h-min">
              <div className="card-header !block">
                <div className="flex justify-between w-full">
                  <h3>Mobile Feedback</h3>
                  {template && (
                    <span className="info-badge info">
                      Mobile · {getTemplateOptionLabels(template).name}
                    </span>
                  )}
                </div>
                <p className='!text-xs !text-gray-500 mt-2'>
                  Share your thoughts on the mobile template design.
                </p>
              </div>
              <div className="card-body">
                <FeedbackForm
                type="mobile"
                templateAvailable={!!template}
                templateId={template?.template_id}
              />
              </div>
            </div>
          </Col>

          {/* Preview column */}
          <Col xs={24} lg={16}>
            <div className="card h-full">
              <div
                className="card-header"
                style={{ background: 'linear-gradient(135deg,#F8FAFC,#F0F4FF)' }}
              >
                <h3>Mobile Preview</h3>
              </div>
              <div className="card-body !p-0">
                <div className="preview-container-dark">
                  {accountDetails && template ? (
                    <PopupOnlyView
                      viewport="mobile"
                      popupTemplate={[template]}
                      className="shadow-md"
                    />
                  ) : (
                    <Spin size="large" />
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {accountDetails && template && (
        <BrowserPreviewModal
          open={browserPreviewModalOpen}
          onClose={() => genericActions.setBrowserPreviewModalOpen(false)}
          viewport="mobile"
          websiteBackground={{
            backgroundImage: {
              desktop: '',
              mobile: 'https://i.ibb.co/QvbTbdPT/Screenshot-2026-01-12-162559.png',
            },
            websiteUrl: accountDetails.domain,
            companyName: accountDetails.name,
            category: accountDetails.category,
            clientId: accountDetails.id.toString(),
            id: accountDetails.id.toString(),
          }}
          popupTemplate={[template]}
        />
      )}
    </>
  );
};
