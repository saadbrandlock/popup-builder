import { createAPI } from '@/api';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useGenericStore } from '@/stores/generic.store';
import { message } from 'antd';

export const useClientFlow = () => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const api = apiClient ? createAPI(apiClient) : null;
  const { actions: loadingActions } = useLoadingStore();
  const { actions: clientFlowActions, clientData } = useClientFlowStore();
  const { devices, actions: deviceActions } = useDevicesStore();

  const getShopperDetails = async ({
    account_id,
    company_id,
    shopper_id,
    shopper_name,
  }: {
    account_id: number;
    company_id: number;
    shopper_id: number;
    shopper_name: string;
  }) => {
    if (!api) return;
    // Skip fetch if already cached
    const cached = useClientFlowStore.getState().shopperDetailsCache[String(shopper_id)];
    if (cached) return;
    loadingActions.setShopperDetailsLoading(true);
    try {
      const response = await api.content.getShopperDetails({
        account_id,
        company_id,
        shopper_id,
        shopper_name,
        end_date: '2025-07-31',
        start_date: '2025-07-01',
        currency: 'USD',
        phase: 'LISTENING_PHASE',
        split: 0,
        layout_type: 'SHOPPER',
        mf_id: 'sectionD',
        shopper_mode: null,
        shopper_mode_date_range: [],
        data_incomplete_flag: false,
      });
      clientFlowActions.setShopperDetails(String(shopper_id), response);
    } catch (error) {
      console.error('Error fetching shopper details:', error);
    } finally {
      loadingActions.setShopperDetailsLoading(false);
    }
  };

  const getClientTemplatesData = async (accountId: number) => {
    if (!api) return;
    if (clientData && clientData.length) {
      return;
    }

    loadingActions.setClientTemplateDetailsLoading(true);
    try {
      const response = await api.templates.getClientTemplatesData(accountId);
      clientFlowActions.setClientData(response);
    } catch (error) {
    } finally {
      loadingActions.setClientTemplateDetailsLoading(false);
    }
  };

  /** Force-refresh client templates from client-review/account API (e.g. after step 3 content confirmation) */
  const refreshClientTemplatesData = async (accountId: number) => {
    if (!api) return;
    loadingActions.setClientTemplateDetailsLoading(true);
    try {
      const response = await api.templates.getClientTemplatesData(accountId);
      clientFlowActions.setClientData(response);
    } catch (error) {
      console.error('Error refreshing client templates:', error);
    } finally {
      loadingActions.setClientTemplateDetailsLoading(false);
    }
  };

  const getContentFieldsWithContent = async (accountId: number) => {
    if (!api) return;

    // Check if content fields are already loaded
    const { contentFields } = useClientFlowStore.getState();
    if (contentFields && contentFields.length > 0) {
      return;
    }

    loadingActions.setContentSubDataLoading(true);
    try {
      const response =
        await api.templateFields.getTemplateFieldsWithContent(accountId);
      clientFlowActions.setContentFields(response);
    } catch (error) {
    } finally {
      loadingActions.setContentSubDataLoading(false);
    }
  };

  const loadContentPresets = async (shopperIds: number[], industry?: string) => {
    if (!api || !shopperIds.length) return;

    loadingActions.setContentSubDataLoading(true);
    try {
      const response = await api.content.getContentPresets({
        shopperIds,
        industry: industry || 'ecommerce', // Fallback as per user requirement
      });
      clientFlowActions.setAvailablePresets(response.results);
    } catch (error) {
      console.error('Error loading content presets:', error);
      message.error('Failed to load content presets');
      clientFlowActions.setAvailablePresets([]);
    } finally {
      loadingActions.setContentSubDataLoading(false);
    }
  };

  const getDevices = async () => {
    if (!api) return;
    if (devices.length > 0) return;

    loadingActions.setDevicesLoading(true);
    try {
      const response = await api.devices.getDevices();
      deviceActions.setDevices(response);
    } catch (error) {
    } finally {
      loadingActions.setDevicesLoading(false);
    }
  };

  const upsertStepApproval = async (templateId: string, stepKey: string, status: string) => {
    if (!api) return;
    loadingActions.setClientTemplateDetailsLoading(true);
    try {
      await api.templates.upsertStepApproval(templateId, stepKey, status);
      // Refresh all statuses via the single account call
      await fetchAllStepStatuses();
      message.success('Step approval updated successfully');
    } catch (error) {
      console.error('Error upserting step approval:', error);
      message.error('Failed to update step approval');
    } finally {
      loadingActions.setClientTemplateDetailsLoading(false);
    }
  };

  /** Fetches step statuses for ALL templates in one API call using accountId */
  const fetchAllStepStatuses = async () => {
    if (!api) return;
    const accountId = useGenericStore.getState().accountDetails?.id;
    if (!accountId) return;
    try {
      const response = await api.templates.getStepStatusByAccountId(accountId);
      // extractResponseData already unwraps response.data.data, so response IS the map
      const statusMap: Record<string, any> = response ?? {};
      clientFlowActions.setStepStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching step statuses:', error);
    }
  };

  /** Finalizes client approval for ALL templates — sets both cb_template_staging and cb_templates to 'admin-review' */
  const finalizeClientApproval = async () => {
    if (!api) return;
    const { clientData: data } = useClientFlowStore.getState();
    if (!data?.length) return;
    loadingActions.setClientTemplateDetailsLoading(true);
    try {
      await Promise.all(
        data.map((t) => api.templates.updateStagingStatus(t.template_id, 'admin-review'))
      );
      message.success('Changes finalized! Template sent for admin review.');
      await fetchAllStepStatuses();
    } catch (error) {
      console.error('Error finalizing client approval:', error);
      message.error('Failed to finalize approval. Please try again.');
    } finally {
      loadingActions.setClientTemplateDetailsLoading(false);
    }
  };

  /** Upserts step approval for ALL templates in a single batch request */
  const upsertStepApprovalForAllTemplates = async (stepKey: string, status: string) => {
    if (!api) return;
    const { clientData: data } = useClientFlowStore.getState();
    if (!data?.length) return;
    try {
      const templateIds = data.map((t) => t.template_id);
      await api.templates.batchUpsertStepApproval(templateIds, stepKey, status);
      // Refresh all statuses via the single account call
      await fetchAllStepStatuses();
    } catch (error) {
      console.error('Error upserting step approval for all templates:', error);
    }
  };

  return {
    getShopperDetails,
    getClientTemplatesData,
    refreshClientTemplatesData,
    getContentFieldsWithContent,
    loadContentPresets,
    getDevices,
    upsertStepApproval,
    fetchAllStepStatuses,
    upsertStepApprovalForAllTemplates,
    finalizeClientApproval,
  };
};
