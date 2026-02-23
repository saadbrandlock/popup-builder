import React, { useState } from 'react';
import { Badge } from 'antd';
import type { FeedbackForStep } from '@/api/services/FeedbackAPI';
import { FeedbackThreadContent } from '@/components/common/feedback-thread/FeedbackThreadContent';

export interface FeedbackThreadPanelProps {
  templateId: string | null;
}

type TabKey = FeedbackForStep;

const FEEDBACK_TABS: { key: TabKey; label: string; title: string }[] = [
  { key: 'desktop-review', label: 'Desktop',      title: 'Desktop design feedback' },
  { key: 'mobile-review',  label: 'Mobile',       title: 'Mobile design feedback' },
  { key: 'copy-review',    label: 'Content',      title: 'Content / copy feedback' },
  { key: 'all',            label: 'Admin Notes',  title: 'Global notes left by admin on decisions (Request Changes / Reject / Approve)' },
];

export const FeedbackThreadPanel: React.FC<FeedbackThreadPanelProps> = ({
  templateId,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('desktop-review');

  return (
    <div className="flex flex-col h-[600px] bg-white">
      {/* Panel header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3.5 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">Feedback Thread</span>
      </div>

      {/* Underline tabs */}
      <div className="flex border-b border-gray-200 px-4 flex-shrink-0 bg-white overflow-x-auto overflow-y-hidden">
        {FEEDBACK_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const isAdminNotes = tab.key === 'all';
          return (
            <button
              key={tab.key}
              type="button"
              title={tab.title}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-3 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {isAdminNotes && (
                <Badge
                  count="ADM"
                  style={{
                    backgroundColor: isActive ? '#7c3aed' : '#e5e7eb',
                    color: isActive ? '#fff' : '#6b7280',
                    fontSize: 9,
                    fontWeight: 700,
                    height: 16,
                    lineHeight: '16px',
                    padding: '0 4px',
                    borderRadius: 4,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <FeedbackThreadContent
          key={`${templateId}-${activeTab}`}
          templateId={templateId}
          feedbackForStep={activeTab}
        />
      </div>
    </div>
  );
};
