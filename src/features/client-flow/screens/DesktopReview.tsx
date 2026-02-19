import React, { useEffect, useMemo } from 'react';
import { Spin, Row, Col } from 'antd';
import FeedbackForm from '../components/feedback-form';
import { PopupOnlyView, BrowserPreviewModal } from '../../../components/common';
import { useGenericStore } from '@/stores/generic.store';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { getTemplatesForDevice, getTemplateOptionLabels } from '../utils/template-filters';
import { TemplateTabsHeader } from '../components/template-tabs-header';
import { Eye as EyeIcon } from 'lucide-react';

/**
 * DesktopReview - Step 1 - Desktop review screen
 * Shows popup preview in desktop viewport. When multiple templates exist (as grouped by admin), user selects which template to review.
 */
export const DesktopReview: React.FC = () => {
  const { accountDetails, navigate, browserPreviewModalOpen, actions: genericActions } = useGenericStore();
  const { clientData, actions, selectedReviewTemplateId, stepStatuses } = useClientFlowStore();

  const desktopTemplates = useMemo(() => getTemplatesForDevice(clientData, 'desktop'), [clientData]);
  const showTemplateSelector = desktopTemplates.length > 1;
  const selectedTemplateId =
    desktopTemplates.some((t) => t.template_id === selectedReviewTemplateId)
      ? selectedReviewTemplateId
      : (desktopTemplates[0]?.template_id ?? null);

  const template = useMemo(() => {
    if (!desktopTemplates.length) return null;
    return desktopTemplates.find((t) => t.template_id === selectedTemplateId) ?? desktopTemplates[0];
  }, [desktopTemplates, selectedTemplateId]);

  useEffect(() => {
    if (template) actions.setSelectedTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  const onTemplateChange = (value: string) => {
    actions.setSelectedReviewTemplateId(value);
  };

  return (
    <>
      <section className="center-content">
        <div className="info-banner info">
          <span>
            Review the <strong>desktop</strong> version of your popup. Use tabs to switch templates.
            Provide feedback on the left.
          </span>
        </div>

        {/* Template tabs + header (driven by current desktop templates) */}
        {showTemplateSelector && (
          <TemplateTabsHeader
            templates={desktopTemplates}
            selectedTemplateId={selectedTemplateId}
            onChange={onTemplateChange}
            stepStatuses={stepStatuses}
            designStepKey="desktopDesign"
          />
        )}

        <div className="template-header">
          <div className="template-info">
            <h4>{template ? getTemplateOptionLabels(template).name : 'Base Template'}</h4>
            <p>
              {template
                ? getTemplateOptionLabels(template).descriptionFull ||
                  'Desktop preview — base template for your popup'
                : 'Desktop preview — base template for your popup'}
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
            <div className="card !h-min">
              <div className="card-header !block">
                <div>
                  <div className="flex justify-between w-full">
                    <h3>Desktop Feedback</h3>
                    {template && (
                      <span className="info-badge info">
                        Desktop · {getTemplateOptionLabels(template).name}
                      </span>
                    )}
                  </div>
                  <p className='!text-xs !text-gray-500 mt-2'>
                    Share your thoughts on the desktop template design.
                  </p>
                </div>
              </div>
              <div className="card-body">
                <FeedbackForm
                  type="desktop"
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
                <h3>Desktop Preview</h3>
              </div>
              <div className="card-body !p-0">
                <div className="preview-container-dark">
                  {accountDetails && template ? (
                    <PopupOnlyView
                      viewport="desktop"
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
          viewport="desktop"
          websiteBackground={{
            backgroundImage: {
              desktop: 'https://i.ibb.co/XxDK49Hh/image-6.png',
              mobile: '',
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
