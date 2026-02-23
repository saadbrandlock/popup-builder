import React from 'react';
import { ClientFlowData } from '@/types';
import { getTemplateOptionLabels } from '../utils/template-filters';
import { LayoutTemplate, Check, CheckCircle2Icon } from 'lucide-react';
import type { StepStatusMetadata } from '../types/clientFlow';

export type DesignStepKey = 'desktopDesign' | 'mobileDesign';

interface TemplateTabsHeaderProps {
  templates: ClientFlowData[];
  selectedTemplateId: string | null;
  onChange: (templateId: string) => void;
  /** Step statuses from API, keyed by template_id */
  stepStatuses?: Record<string, StepStatusMetadata | null>;
  /** Which design step to check for approval (desktop or mobile) */
  designStepKey?: DesignStepKey;
}

/**
 * TemplateTabsHeader
 * Shared top-level template tab bar for Desktop/Mobile review steps.
 * Custom pill-style tabs that match the client-flow design system.
 * Shows a small checkmark inside the tab when the template design is approved for the current step.
 */
export const TemplateTabsHeader: React.FC<TemplateTabsHeaderProps> = ({
  templates,
  selectedTemplateId,
  onChange,
  stepStatuses = {},
  designStepKey,
}) => {
  if (!templates.length) return null;

  const activeId = selectedTemplateId ?? templates[0].template_id;

  const isApproved = (templateId: string): boolean => {
    if (!designStepKey) return false;
    const meta = stepStatuses[templateId];
    return meta?.stepStatus?.[designStepKey]?.status === 'approved';
  };

  return (
    <div className="template-tabs-bar">
      <div className="template-tabs-label">
        <LayoutTemplate size={14} />
        <span>Template</span>
      </div>
      <div className="template-tabs-list">
        {templates.map((t) => {
          const { name } = getTemplateOptionLabels(t);
          const isActive = t.template_id === activeId;
          const approved = isApproved(t.template_id);

          return (
            <button
              key={t.template_id}
              type="button"
              className={`template-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onChange(t.template_id)}
            >
              {name}
              {approved && (
                <CheckCircle2Icon size={12} className="template-tab-approved-icon" aria-label="Approved" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
