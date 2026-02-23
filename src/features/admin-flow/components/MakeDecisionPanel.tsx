import React, { useState } from 'react';
import { CheckCircle2, XCircle, Pencil, Target, Send } from 'lucide-react';
import { Spin, Button, Input, Typography, notification, Alert } from 'antd';
import { createAPI } from '@/api';
import { useGenericStore } from '@/stores/generic.store';
import type { ClientFlowData } from '@/types';

const { Text } = Typography;

interface MakeDecisionPanelProps {
  clientData: ClientFlowData[];
  accountId: number;
  onDecisionMade?: () => void;
  viewOnly?: boolean;
}

type DecisionKey = 'published' | 'admin-changes-request' | 'reject';

const DECISION_STATUS_MAP: Record<DecisionKey, string> = {
  'published':             'published',
  'admin-changes-request': 'admin-changes-request',
  'reject':                'admin-rejected',
};

/** Decisions that require admin notes (min 5 words) before submitting */
const NOTES_REQUIRED = new Set<DecisionKey>(['admin-changes-request', 'reject']);

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const decisionCards = [
  {
    key: 'published' as DecisionKey,
    label: 'Approve',
    description: 'Push to production',
    icon: <CheckCircle2 size={26} />,
    color: { icon: '#22c55e', border: '#bbf7d0', borderSelected: '#16a34a', bg: '#f0fdf4', bgSelected: '#dcfce7', label: '#15803d' },
  },
  {
    key: 'admin-changes-request' as DecisionKey,
    label: 'Request Changes',
    description: 'Send back to client',
    icon: <Pencil size={26} />,
    color: { icon: '#f97316', border: '#fed7aa', borderSelected: '#ea580c', bg: '#fff7ed', bgSelected: '#ffedd5', label: '#c2410c' },
  },
  {
    key: 'reject' as DecisionKey,
    label: 'Reject',
    description: 'Decline submission',
    icon: <XCircle size={26} />,
    color: { icon: '#ef4444', border: '#fecaca', borderSelected: '#dc2626', bg: '#fef2f2', bgSelected: '#fee2e2', label: '#b91c1c' },
  },
] as const;

export const MakeDecisionPanel: React.FC<MakeDecisionPanelProps> = ({ clientData, onDecisionMade, viewOnly }) => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<DecisionKey | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isPublished = clientData.length > 0 &&
    clientData.every(t => t.template_status === 'published');

  const notesRequired = selectedDecision != null && NOTES_REQUIRED.has(selectedDecision);

  const validateNotes = (): boolean => {
    if (!notesRequired) return true;
    const words = countWords(adminNotes);
    if (!adminNotes.trim()) {
      setNotesError('Admin notes are required for this decision.');
      return false;
    }
    if (words < 5) {
      setNotesError(`Please enter at least 5 words (${words} so far).`);
      return false;
    }
    setNotesError(null);
    return true;
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdminNotes(e.target.value);
    if (notesError) {
      // Clear error as user types, re-validate silently
      const words = countWords(e.target.value);
      if (e.target.value.trim() && words >= 5) setNotesError(null);
    }
  };

  const handleDecisionSelect = (key: DecisionKey) => {
    setSelectedDecision(key)
    setNotesError(null);
  };

  const handleSubmit = async () => {
    if (!selectedDecision || !apiClient) return;
    if (!validateNotes()) return;

    setLoading(true);
    try {
      const api = createAPI(apiClient);

      if (selectedDecision === 'published') {
        await Promise.all(clientData.map(t => api.templates.publishTemplate(t.template_id)));
      } else {
        const dbStatus = DECISION_STATUS_MAP[selectedDecision];
        await Promise.all(clientData.map(t => api.templates.updateStagingStatus(t.template_id, dbStatus)));
      }

      // Save admin notes as feedback for all decisions that have notes
      if (adminNotes.trim()) {
        await Promise.all(
          clientData.map(t =>
            api.feedback.createFeedback({
              templateId: t.template_id,
              feedbackText: adminNotes.trim(),
              feedbackForStep: 'all',
            })
          )
        );
      }

      notification.success({ message: 'Decision submitted successfully' });
      setSelectedDecision(null);
      setAdminNotes('');
      setNotesError(null);
      onDecisionMade?.();
    } catch {
      notification.error({ message: 'Failed to submit decision' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableContentReview = async () => {
    if (!apiClient) return;
    setLoading(true);
    try {
      const api = createAPI(apiClient);
      await Promise.all(clientData.map(t => api.templates.updateStagingStatus(t.template_id, 'client-review')));
      notification.success({ message: 'Content review enabled for client' });
      onDecisionMade?.();
    } catch {
      notification.error({ message: 'Failed to enable content review' });
    } finally {
      setLoading(false);
    }
  };

  const wordCount = countWords(adminNotes);
  const submitDisabled = !selectedDecision || (notesRequired && wordCount < 5);

  if (viewOnly) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <Target size={16} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Decision Panel</span>
        </div>
        <div className="p-5">
          <Alert
            message="Published — No Action Required"
            description="This template has been published. No further actions are required."
            type="success"
            showIcon
            icon={<CheckCircle2 size={16} />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
        <Target size={16} className="text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">Make Your Decision</span>
      </div>

      <Spin spinning={loading}>
        <div className="p-5 space-y-4">
          {isPublished ? (
            /* Published state */
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center space-y-3">
              <CheckCircle2 size={32} className="text-green-500 mx-auto" />
              <Text strong className="block text-green-800">Templates Published</Text>
              <Text type="secondary" className="block text-xs max-w-xs mx-auto">
                Client content editing is locked. Enable content review to allow the client to make changes.
              </Text>
              <Button
                type="primary"
                icon={<Pencil size={13} />}
                onClick={handleEnableContentReview}
                loading={loading}
              >
                Enable Content Review for Client
              </Button>
            </div>
          ) : (
            <>
              {/* Decision cards */}
              <div className="grid grid-cols-3 gap-3">
                {decisionCards.map((card) => {
                  const isSelected = selectedDecision === card.key;
                  const c = card.color;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => handleDecisionSelect(card.key)}
                      style={{
                        border: `2px solid ${isSelected ? c.borderSelected : c.border}`,
                        background: isSelected ? c.bgSelected : c.bg,
                        borderRadius: 12,
                        padding: '14px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        outline: 'none',
                      }}
                    >
                      <div style={{ color: c.icon, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                        {card.icon}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.label, marginBottom: 2 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{card.description}</div>
                    </button>
                  );
                })}
              </div>

              {/* Admin Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Text className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Admin Notes{notesRequired ? <span className="text-red-500 ml-0.5">*</span> : ' (optional)'}
                  </Text>
                  {adminNotes.trim() && (
                    <Text type={wordCount >= 5 ? 'success' : 'secondary'} className="text-[11px]">
                      {wordCount} word{wordCount !== 1 ? 's' : ''}
                      {notesRequired && wordCount < 5 ? ` / 5 min` : ''}
                    </Text>
                  )}
                </div>
                <Input.TextArea
                  rows={4}
                  placeholder={
                    notesRequired
                      ? 'Required — explain what needs to change or why this was rejected (min 5 words)...'
                      : 'Add context for your approval, or leave blank...'
                  }
                  value={adminNotes}
                  onChange={handleNotesChange}
                  onBlur={validateNotes}
                  status={notesError ? 'error' : undefined}
                  style={{ resize: 'none' }}
                />
                {notesError && (
                  <Text type="danger" className="text-xs mt-1 block">
                    {notesError}
                  </Text>
                )}
              </div>

              {/* Submit */}
              <Button
                type="primary"
                block
                size="large"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                disabled={submitDisabled}
                loading={loading}
              >
                Submit Decision
              </Button>
            </>
          )}
        </div>
      </Spin>
    </div>
  );
};
