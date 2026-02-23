import { CheckCircle } from 'lucide-react';
import React from 'react';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useGenericStore } from '@/stores/generic.store';
import { cn } from '@/lib/utils';
import { useClientFlow } from '../hooks/use-client-flow';
import { useLoadingStore } from '@/stores/common/loading.store';

interface ReviewActionsProps {
  type: 'desktop' | 'mobile' | 'copy-review';
  /** When true, all actions render in one row (for use inside template card). */
  inline?: boolean;
  showApprove?: boolean;
  /** When true, shows approved state and disables button */
  isApproved?: boolean;
}

const ReviewActions: React.FC<ReviewActionsProps> = ({ type, inline, showApprove = true, isApproved = false }) => {
  const { feedbackData, selectedTemplate } = useClientFlowStore();
  const { actions: genericActions } = useGenericStore();
  const { upsertStepApprovalForDesignStep } = useClientFlow();
  const { stepApprovalLoading } = useLoadingStore();

  const currentFeedback = feedbackData[type] || '';
  const countWords = (text: string) => {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  };
  const wordCount = countWords(currentFeedback);

  const handlePreview = () => {
    genericActions.setBrowserPreviewModalOpen(true);
  };

  const handleApprove = async () => {
    if (type !== 'desktop' && type !== 'mobile') return;
    const stepKey = type === 'desktop' ? 'desktopDesign' : 'mobileDesign';
    await upsertStepApprovalForDesignStep(stepKey, 'approved');
  };

  if (inline) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            'cf-btn', 'cf-btn-success' 
          )}
          onClick={handleApprove}
          disabled={stepApprovalLoading || isApproved}
        >
          <CheckCircle size={16} />
          <span>{isApproved ? 'Approved' : stepApprovalLoading ? 'Approving...' : 'Approve Design'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className=" space-y-3">
      <div className="flex items-center gap-2">
        {showApprove && (
        <button
          type="button"
          className={cn(
            'cf-btn  justify-center',
            'cf-btn-success'
          )}
          onClick={handleApprove}
          disabled={stepApprovalLoading || isApproved}
        >
          <CheckCircle size={16} />
          {isApproved ? 'Approved' : stepApprovalLoading ? 'Approving...' : 'Approve Design'}
        </button>
        )}
      </div>
    </div>
  );
};

export default ReviewActions;

