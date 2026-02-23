import { Avatar, Input, Spin, message } from 'antd';
import { MessageCircle, Send } from 'lucide-react';
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useGenericStore } from '@/stores/generic.store';
import { createAPI } from '@/api';
import type { FeedbackForStep, CBTemplateFeedbackThread } from '@/api/services/FeedbackAPI';
import { splitByAndCapitalize } from '@/lib/utils/helper';

export interface FeedbackThreadContentProps {
  templateId: string | null;
  feedbackForStep: FeedbackForStep | null;
  /** Increment to trigger a refetch (e.g. after new feedback submitted) */
  refreshTrigger?: number;
  /** When true, render as inline panel (no drawer chrome) */
  variant?: 'drawer' | 'panel';
}

/** Get initials from a name string (max 2 chars) */
export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

/** Format date like "Dec 15, 3:40 PM" */
export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
};

interface ThreadMessageProps {
  thread: CBTemplateFeedbackThread;
  clientName: string;
  isReply?: boolean;
}

export const ThreadMessage: React.FC<ThreadMessageProps> = ({
  thread,
  clientName,
  isReply = false,
}) => {
  const isAdmin = thread.is_admin_response;
  const senderName = isAdmin ? 'Admin' : (thread.username || clientName);
  const initials = getInitials(senderName);

  return (
    <>
      <div
        className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''} ${isReply ? 'ml-4' : ''}`}
      >
        <Avatar
          size={36}
          style={{
            backgroundColor: isAdmin ? '#a855f7' : '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '12px',
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>

        <div
          className={`flex flex-col max-w-[80%] ${isAdmin ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`flex items-center gap-2 mb-1 ${isAdmin ? 'flex-row-reverse' : ''}`}
          >
            <span className="text-[13px] font-semibold text-gray-800">
              {senderName}
            </span>
            <span className="text-[11px] text-gray-400">
              {formatDate(thread.created_at)}
            </span>
          </div>

          <div
            className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed break-words whitespace-pre-wrap
              ${
                isAdmin
                  ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
                  : 'bg-blue-50 text-gray-800 rounded-tl-sm border border-blue-100'
              }`}
          >
            {thread.feedback_text}
          </div>
        </div>
      </div>

      {thread.replies?.length > 0 && (
        <div className="flex flex-col gap-5 mt-5">
          {thread.replies.map((r) => (
            <ThreadMessage key={r.id} thread={r} clientName={clientName} isReply />
          ))}
        </div>
      )}
    </>
  );
};

export const FeedbackThreadContent: React.FC<FeedbackThreadContentProps> = ({
  templateId,
  feedbackForStep,
  refreshTrigger = 0,
}) => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const accountDetails = useGenericStore((s) => s.accountDetails);
  const [threads, setThreads] = useState<CBTemplateFeedbackThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('User');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    if (!apiClient || !templateId || !feedbackForStep) return;
    setLoading(true);
    try {
      const api = createAPI(apiClient);
      const data = await api.feedback.getFeedbackThreads(templateId, feedbackForStep);
      const arr = Array.isArray(data) ? data : [];
      setThreads(arr);
      const first = arr[0];
      const domainPart = splitByAndCapitalize(accountDetails?.domain || '', '.', 0);
      setClientName(
        first && typeof first === 'object' && first.username
          ? `${first.username} (${domainPart})`
          : domainPart || 'User'
      );
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [apiClient, templateId, feedbackForStep, accountDetails?.domain]);

  useEffect(() => {
    if (templateId && feedbackForStep) {
      fetchThreads();
    }
  }, [templateId, feedbackForStep, refreshTrigger, fetchThreads]);

  useEffect(() => {
    if (scrollRef.current && threads.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [threads]);

  const handleReply = async () => {
    if (!replyText.trim() || !apiClient || !templateId) return;
    setSending(true);
    try {
      const api = createAPI(apiClient);
      await api.feedback.createFeedback({
        templateId,
        feedbackText: replyText.trim(),
        feedbackForStep,
      });
      setReplyText('');
      fetchThreads();
    } catch (err: unknown) {
      message.error((err as { message?: string })?.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-16 text-gray-400 text-xs">
            <Spin size="small" />
            <span>Loading conversation...</span>
          </div>
        ) : threads.length > 0 ? (
          <div className="flex flex-col gap-6">
            {threads.map((t) => (
              <ThreadMessage key={t.id} thread={t} clientName={clientName} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">No feedback yet</p>
            <span className="text-xs text-gray-400">
              Be the first to share your thoughts
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type your reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="!rounded-full !border-gray-200 !bg-gray-50 hover:!border-blue-300 focus:!border-blue-400 !py-2 !px-4 !text-[13px]"
          />
          <button
            type="button"
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
            className={`w-10 h-10 rounded-full border-none flex items-center justify-center cursor-pointer
                        transition-all duration-200 flex-shrink-0
                        ${
                          replyText.trim()
                            ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
          >
            <Send size={16} className={replyText.trim() ? '' : 'opacity-50'} />
          </button>
        </div>
      </div>
    </div>
  );
};
