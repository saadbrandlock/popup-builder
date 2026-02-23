import { AxiosInstance } from 'axios';
import { BaseAPI } from './BaseAPI';

export type FeedbackForStep =
  | 'desktop-review'
  | 'mobile-review'
  | 'content'
  | 'copy-review'
  | 'all';

export interface CBTemplateFeedbackThread {
  id: number;
  template_id: string;
  parent_feedback_id: number | null;
  feedback_for_step: string | null;
  feedback_text: string;
  feedback_type: string;
  is_admin_response: boolean;
  created_at: string;
  created_by: number | null;
  username: string | null;
  replies: CBTemplateFeedbackThread[];
}

export interface CreateFeedbackPayload {
  templateId: string;
  feedbackText: string;
  feedbackForStep?: FeedbackForStep | null;
  parentFeedbackId?: number | null;
  isAdminResponse?: boolean;
}

export class FeedbackAPI extends BaseAPI {
  constructor(apiClient: AxiosInstance) {
    super(apiClient);
  }

  async createFeedback(payload: CreateFeedbackPayload): Promise<unknown> {
    const body = {
      template_id: payload.templateId,
      feedback_text: payload.feedbackText,
      feedback_for_step: payload.feedbackForStep ?? null,
      parent_feedback_id: payload.parentFeedbackId ?? null,
    };
    return this.post<unknown>('/feedback', body);
  }

  async getFeedbackThreads(
    templateId: string,
    feedbackForStep: FeedbackForStep | null
  ): Promise<CBTemplateFeedbackThread[]> {
    const params: Record<string, string> = { templateId };
    if (feedbackForStep) {
      params.feedbackForStep = feedbackForStep;
    }
    return this.get<CBTemplateFeedbackThread[]>('/feedback', params);
  }
}
