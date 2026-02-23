import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useGenericStore } from '@/stores/generic.store';
import { useAdminReviewScreen } from '../hooks/use-admin-review-screen';
import type { AccountDetails } from '@/types/common';
import { DesignReviewPanel } from './DesignReviewPanel';
import { ShopperGroupContentPanel } from './ShopperGroupContentPanel';
import { CouponsPanel } from './CouponsPanel';
import { MakeDecisionPanel } from './MakeDecisionPanel';
import { FeedbackThreadPanel } from './FeedbackThreadPanel';

export interface AdminReviewScreenProps {
  accountId: number;
  accountName?: string;
  onBackToQueue: () => void;
  viewOnly?: boolean;
}

export const AdminReviewScreen: React.FC<AdminReviewScreenProps> = ({
  accountId,
  accountName,
  onBackToQueue,
  viewOnly,
}) => {
  const navigate = useGenericStore((s) => s.navigate);
  const { loadClientDataByAccount } = useAdminReviewScreen();
  const accounts = useGenericStore((s) => s.accounts);

  const [clientData, setClientData] = useState<any[]>([]);
  const { actions: genericActions } = useGenericStore();
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [activeShopperId, setActiveShopperId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'submission-review' | 'live-preview'>('submission-review');

  const resolvedAccountName =
    accountName ??
    accounts?.find((a) => a.id === accountId)?.name ??
    '';

  // Sync accountDetails into the generic store so child panels can read it.
  useEffect(() => {
    const accountFromAccounts = accounts?.find((a) => a.id === accountId);
    if (accountFromAccounts) {
      genericActions.setAccount({
        id: accountFromAccounts.id,
        name: accountFromAccounts.name,
        domain: accountFromAccounts.domain,
        category: 'ecommerce',
        industry: 'ecommerce',
      } as AccountDetails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // When shopper changes, find the first template containing that shopper and sync selectedTemplateId.
  // Without this, FeedbackThreadPanel keeps showing the same template's thread regardless of shopper.
  useEffect(() => {
    if (activeShopperId == null || !clientData.length) return;
    const match = clientData.find(t => t.shoppers?.some((s: any) => s.id === activeShopperId));
    if (match && match.template_id !== selectedTemplateId) {
      setSelectedTemplateId(match.template_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopperId, clientData]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cd = await loadClientDataByAccount(accountId);
      setClientData(cd || []);
      if (cd?.length) {
        setSelectedTemplateId(cd[0].template_id);
      }
    } finally {
      setLoading(false);
    }
  }, [accountId, loadClientDataByAccount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackToQueue = () => {
    if (navigate) {
      navigate('/popup-builder/admin-review');
    } else {
      onBackToQueue();
    }
  };

  const latestUpdated =
    clientData.length > 0
      ? new Date(clientData[0].staging_updated_at || clientData[0].template_updated_at).toLocaleDateString(
          'en-US',
          { month: 'short', day: 'numeric', year: 'numeric' }
        )
      : '';

  // Derive a single display status from clientData (all templates share the same staging status)
  const stagingStatus = clientData[0]?.staging_status ?? 'admin-review';
  const STATUS_BADGE: Record<string, { label: string; classes: string; dot: string; animate: boolean }> = {
    'admin-review':          { label: 'Pending Review',      classes: 'bg-amber-50 border-amber-200 text-amber-700',   dot: 'bg-amber-400',  animate: true  },
    'admin-changes-request': { label: 'Changes Requested',   classes: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-400', animate: false },
    'admin-rejected':        { label: 'Rejected',            classes: 'bg-red-50 border-red-200 text-red-700',          dot: 'bg-red-500',    animate: false },
    'published':             { label: 'Published',           classes: 'bg-green-50 border-green-200 text-green-700',    dot: 'bg-green-500',  animate: false },
    'client-review':         { label: 'Client Review',       classes: 'bg-blue-50 border-blue-200 text-blue-700',       dot: 'bg-blue-400',   animate: false },
  };
  const badge = STATUS_BADGE[stagingStatus] ?? STATUS_BADGE['admin-review'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        {/* Row 1: Title + badges + back button */}
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-gray-900 font-bold text-base leading-none">
              Admin Review Panel
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 uppercase tracking-wider border border-violet-200">
              ADMIN
            </span>
          </div>
          <button
            type="button"
            onClick={handleBackToQueue}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 transition-colors"
          >
            <ArrowLeft size={13} />
            Back to Queue
          </button>
        </div>

        {/* Row 2: Metadata */}
        <div className="border-t border-gray-100 px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <span className="text-[11px] text-gray-500">
              Client:{' '}
              <span className="text-gray-800 font-semibold">
                {resolvedAccountName || '—'}
              </span>
            </span>
            <span className="text-gray-300 select-none">·</span>
            <span className="text-[11px] text-gray-500">
              Submitted:{' '}
              <span className="text-gray-800 font-semibold">
                {latestUpdated || '—'}
              </span>
            </span>
            <span className="text-gray-300 select-none">·</span>
            <span className="text-[11px] text-gray-500">
              Templates:{' '}
              <span className="text-gray-800 font-semibold">
                {clientData.length}
              </span>
            </span>
          </div>
          {/* Dynamic status badge derived from clientData */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${badge.classes}`}>
            <span className="relative flex h-1.5 w-1.5">
              {badge.animate && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${badge.dot}`} />
              )}
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${badge.dot}`} />
            </span>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Body: left content + right sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Left scrollable column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Underline tabs */}
          <div className="flex border-b border-gray-200 bg-white px-6 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('submission-review')}
              className={`flex items-center gap-2 py-3.5 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'submission-review'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Submission Review
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'submission-review'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {clientData.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('live-preview')}
              className={`py-3.5 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'live-preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Preview
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'submission-review' ? (
              <div className="space-y-5">
                <DesignReviewPanel
                  clientData={clientData}
                  selectedTemplateId={selectedTemplateId}
                  onTemplateChange={setSelectedTemplateId}
                  activeShopperId={activeShopperId}
                  onShopperChange={setActiveShopperId}
                  sideByMode={true}
                />
                <ShopperGroupContentPanel clientData={clientData} />
                <CouponsPanel clientData={clientData} />
              </div>
            ) : (
              <DesignReviewPanel
                clientData={clientData}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
                activeShopperId={activeShopperId}
                onShopperChange={setActiveShopperId}
                sideByMode={false}
              />
            )}
          </div>
        </div>

        {/* Right sidebar — Feedback Thread (600px) + Make Decision below */}
   <div className='space-y-8'>
   <div className="h-[600px] flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
          <FeedbackThreadPanel templateId={selectedTemplateId} />
        </div>
          <div className="border-t border-gray-200">
            <MakeDecisionPanel clientData={clientData} accountId={accountId} onDecisionMade={loadData} viewOnly={viewOnly} />
          </div>
   </div>
      </div>
    </div>
  );
};
