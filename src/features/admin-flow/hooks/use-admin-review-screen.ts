import { useCallback } from 'react';
import { createAPI } from '@/api';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useGenericStore } from '@/stores/generic.store';
import { ClientFlowData } from '@/types';

export const useAdminReviewScreen = () => {
  const apiClient = useGenericStore((s) => s.apiClient);

  // useCallback so the function reference is stable across renders.
  // Without this, every render produces a new reference → AdminReviewScreen's
  // loadData useCallback sees a changed dep → useEffect re-runs → infinite loop.
  const loadClientDataByAccount = useCallback(async (
    accountId: number
  ): Promise<ClientFlowData[]> => {
    if (!apiClient) return [];
    const api = createAPI(apiClient);
    // Access loading actions imperatively to avoid adding them as a dep
    const loadingActions = useLoadingStore.getState().actions;

    loadingActions.setClientTemplateDetailsLoading(true);
    try {
      const clientDataRaw = await api.templates.getClientTemplatesData(accountId);

      const REVIEWABLE_STATUSES = new Set([
        'admin-review', 'published', 'admin-changes-request', 'admin-rejected',
      ]);
      const clientData = Array.isArray(clientDataRaw)
        ? clientDataRaw.filter((t: ClientFlowData) => REVIEWABLE_STATUSES.has(t.staging_status))
        : [];

      return clientData;
    } catch (error) {
      console.error('Error loading admin review data:', error);
      return [];
    } finally {
      loadingActions.setClientTemplateDetailsLoading(false);
    }
  }, [apiClient]); // only re-creates when the axios client changes

  return { loadClientDataByAccount };
};
