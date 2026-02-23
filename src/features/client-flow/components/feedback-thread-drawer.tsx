import { Drawer } from 'antd';
import React from 'react';
import type { FeedbackForStep } from '@/api/services/FeedbackAPI';
import { FeedbackThreadContent } from '@/components/common/feedback-thread/FeedbackThreadContent';

export interface FeedbackThreadDrawerProps {
  open: boolean;
  onClose: () => void;
  templateId: string | null;
  feedbackForStep: FeedbackForStep | null;
  /** Increment to trigger a refetch (e.g. after new feedback submitted) */
  refreshTrigger?: number;
}

export const FeedbackThreadDrawer: React.FC<FeedbackThreadDrawerProps> = ({
  open,
  onClose,
  templateId,
  feedbackForStep,
  refreshTrigger = 0,
}) => {
  return (
    <Drawer
      placement="right"
      width={440}
      onClose={onClose}
      open={open}
      closable={false}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
      }}
      rootClassName="feedback-thread-drawer"
    >
      <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div>
            <div className="text-sm font-semibold text-gray-900">Feedback Thread</div>
          </div>
        </div>
        <button
          className="w-8 h-8 rounded-lg border-none bg-gray-50 text-gray-400 text-xl leading-none
                     cursor-pointer flex items-center justify-center
                     transition-all duration-200 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <FeedbackThreadContent
          templateId={templateId}
          feedbackForStep={feedbackForStep}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </Drawer>
  );
};
