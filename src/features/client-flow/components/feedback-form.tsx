import { Form, Input, Typography, message, Button, Drawer } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { createAPI } from '@/api';
import type { FeedbackForStep } from '@/api/services/FeedbackAPI';
import ReviewActions from './review-actions';
import { FeedbackThreadDrawer } from './feedback-thread-drawer';

const { Text } = Typography;

const TYPE_TO_FEEDBACK_STEP: Record<string, FeedbackForStep> = {
  desktop: 'desktop-review',
  mobile: 'mobile-review',
  'copy-review': 'copy-review',
};

interface FeedbackFormProps {
  type: 'desktop' | 'mobile' | 'copy-review';
  templateAvailable: boolean;
  /** Template ID for API (required for submit/fetch) */
  templateId?: string | null;
  /** Sidebar mode - collapsible drawer */
  mode?: 'normal' | 'sidebar';
  /** Sidebar placement */
  placement?: 'left' | 'right';
  showApprove?: boolean;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  type,
  templateAvailable,
  templateId,
  mode = 'normal',
  placement = 'right',
  showApprove = true,
}) => {
  const [form] = Form.useForm();
  const { feedbackData, actions, stepStatuses, selectedTemplate } = useClientFlowStore();
  const apiClient = useGenericStore((s) => s.apiClient);
  const [wordCount, setWordCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threadDrawerOpen, setThreadDrawerOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const maxChars = 500;
  const minWords = 5;

  const feedbackForStep = TYPE_TO_FEEDBACK_STEP[type];
  const currentFeedback = feedbackData[type] || '';

  const countWords = (text: string) => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  };
  const isSubmitDisabled = wordCount < minWords || isSubmitting;

  useEffect(() => {
    setWordCount(countWords(currentFeedback));
    form.setFieldsValue({ [`${type}_feedback`]: currentFeedback });
  }, [currentFeedback, form, type]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    actions.updateFeedbackData(type, value);
    setWordCount(countWords(value));
  };

  const handleSubmit = async () => {
    if (!apiClient || !templateId) {
      message.error('Template context is required to submit feedback.')
      return;
    }
    setIsSubmitting(true);
    try {
      const api = createAPI(apiClient);
      await api.feedback.createFeedback({
        templateId,
        feedbackText: currentFeedback,
        feedbackForStep,
      });
      message.success('Feedback submitted successfully.');
      actions.updateFeedbackData(type, '');
      setWordCount(0);
      form.setFieldsValue({ [`${type}_feedback`]: '' })
      setRefreshTrigger((c) => c + 1);
    } catch (err: any) {
      message.error(err?.message || 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasThreads = Boolean(templateId && feedbackForStep);

  const isApproved = useMemo(() => {
    const tid = selectedTemplate?.template_id;
    if (!tid) return false;
    const meta = stepStatuses[tid];
    if (type === 'desktop') return meta?.stepStatus?.desktopDesign?.status === 'approved';
    if (type === 'mobile') return meta?.stepStatus?.mobileDesign?.status === 'approved';
    return meta?.stepStatus?.templateCopy?.status === 'approved';
  }, [selectedTemplate?.template_id, stepStatuses, type]);

  const formContent = (
    <div className="flex flex-col">
      <div className="flex-shrink-0 pt-3">
        <Form
          layout="vertical"
          form={form}
          onFinish={handleSubmit}
          className="feedback-compose-form"
        >
          <Form.Item
            name={`${type}_feedback`}
            label={
              <span className="flex items-end gap-2 text-sm font-medium">
               <span>
               New message
               </span>
                {hasThreads && (
                  <>
                    <span className="text-gray-400 font-extrabold">·</span>
                    <Button
                      type="link"
                      className="!p-0 !h-auto !min-w-0 !text-blue-600 hover:!text-blue-800 !text-xs"
                      onClick={() => setThreadDrawerOpen(true)}
                      size='small'
                    >
                      View feedback thread
                    </Button>
                  </>
                )}
              </span>
            }
            className="!mb-2"
          >
            <Input.TextArea
              rows={3}
              placeholder="Share your thoughts, suggestions or required changes..."
              value={currentFeedback}
              onChange={handleTextChange}
              maxLength={maxChars}
              className="feedback-textarea"
            />
          </Form.Item>
          <div className="mt-2.5 space-y-2.5">
            <div className="flex justify-between mt-1 text-[10.5px]">
              <Text
                className={`${wordCount < minWords ? '!text-red-700' : wordCount >= minWords ? '!text-green-700' : '!text-[#9C958D]'}`}
              >
                Min {minWords} words ({wordCount}/{minWords})
              </Text>
            </div>
            <div className="flex gap-2 items-center justify-end client-flow-root !bg-transparent">
              {templateAvailable && (
                <ReviewActions
                  type={type}
                  showApprove={showApprove}
                  isApproved={isApproved}
                />
              )}
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={`cf-btn cf-btn-primary ${isSubmitDisabled ? 'cf-btn-disabled' : ''}`}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </div>
        </Form>
      </div>

      {hasThreads && templateId && (
        <FeedbackThreadDrawer
          open={threadDrawerOpen}
          onClose={() => setThreadDrawerOpen(false)}
          templateId={templateId}
          feedbackForStep={feedbackForStep}
          refreshTrigger={refreshTrigger}
        />
      )}
    </div>
  );

  // Sidebar mode - Ant Design Drawer
  if (mode === 'sidebar') {
    return (
      <>
        <Drawer
          open={isOpen}
          onClose={() => setIsOpen(false)}
          placement={placement}
          width={380}
          closable={false}
          styles={{
            header: { display: 'none' },
            body: { padding: 0, background: '#FAFAF8' },
          }}
          rootClassName="feedback-drawer-root"
        >
          {/* Custom header matching the original design */}
          <div className="px-4 py-4 border-b border-[#E4DFD7] flex items-start gap-2 bg-[#FAFAF8]">
            <div className="flex items-center gap-2 flex-1">
              <div>
                <div className="font-semibold text-sm text-gray-900">Content Feedback</div>
                <div className="text-xs text-gray-500 font-normal">
                  Share feedback on the popup copy and messaging
                </div>
              </div>
            </div>
            <button
              className="w-7 h-7 rounded-md border-none bg-white text-gray-500 text-2xl leading-none
                         cursor-pointer flex items-center justify-center flex-shrink-0
                         transition-all duration-200 hover:bg-[#E4DFD7] hover:text-gray-900"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto flex-1 bg-[#FAFAF8]">
            {formContent}
          </div>
        </Drawer>

        {/* Toggle button — only visible when drawer is closed */}
        {!isOpen && (
          <button
            className={`fixed top-1/2 -translate-y-1/2 z-[999]
                        bg-[#2B6CB0] text-white border-none
                        px-2 py-3 cursor-pointer
                        flex flex-col items-center gap-1
                        text-xs font-semibold
                        shadow-[-2px_2px_8px_rgba(0,0,0,0.15)]
                        transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                        [writing-mode:vertical-rl] [text-orientation:mixed]
                        ${placement === 'right'
                          ? 'right-0 rounded-l-lg hover:-translate-y-1/2 hover:-translate-x-1'
                          : 'left-0 rounded-r-lg hover:-translate-y-1/2 hover:translate-x-1'
                        }
                        hover:bg-[#1E4E8C]`}
            onClick={() => setIsOpen(true)}
            type="button"
          >
            {placement === 'right' ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
            <span>Feedback</span>
          </button>
        )}
      </>
    );
  }

  return formContent;
};

export default React.memo(FeedbackForm);
