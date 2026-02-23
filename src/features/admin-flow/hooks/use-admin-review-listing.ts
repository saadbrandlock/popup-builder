import { message } from 'antd';
import { createAPI } from '@/api';
import { useAdminReviewQueueStore } from '@/stores/list/adminReviewQueue.store';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useGenericStore } from '@/stores/generic.store';

export const useAdminReviewListing = () => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const navigate = useGenericStore((s) => s.navigate);

  const api = apiClient ? createAPI(apiClient) : null;

  const { devices, actions: deviceActions } = useDevicesStore();
  const { actions: loadingActions } = useLoadingStore();
  const { actions } = useAdminReviewQueueStore();

  const getQueueItems = async () => {
    if (!api) {
      message.error('API client is required');
      return;
    }
    loadingActions.setTemplateListingLoading(true);
    try {
      const { filters: f, pagination: p, sorter: s } = useAdminReviewQueueStore.getState();
      const response = await api.templates.getAdminReviewQueue({
        page: p.current,
        limit: p.pageSize,
        nameSearch: f.nameSearch ?? undefined,
        deviceId: f.deviceId ?? undefined,
        sortColumn: s.sortColumn,
        sortDirection: s.sortDirection,
      });
      actions.setQueueItems(response.results);
      actions.setPagination({
        current: response.page,
        pageSize: response.limit,
        total: response.count,
      });
    } catch (error) {
      console.error('Error loading admin review queue:', error);
    } finally {
      loadingActions.setTemplateListingLoading(false);
    }
  };

  const getDevices = async () => {
    if (!api) {
      message.error('API client is required');
      return;
    }
    if (devices.length > 0) return;

    loadingActions.setDevicesLoading(true);
    try {
      const response = await api.devices.getDevices();
      deviceActions.setDevices(response);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      loadingActions.setDevicesLoading(false);
    }
  };

  const handleReview = (accountId: number) => {
    navigate?.(`/popup-builder/admin-review/account/${accountId}`);
  };

  return { getQueueItems, getDevices, handleReview };
};
