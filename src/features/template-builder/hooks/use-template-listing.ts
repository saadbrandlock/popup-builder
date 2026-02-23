import { message } from 'antd';
import { createAPI } from '@/api';
import { useTemplateListingStore } from '@/stores/list/templateListing.store';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useGenericStore } from '@/stores/generic.store';
import { CleanTemplateResponse, TemplateAction } from '@/types';
import { convertMultipleUnlayerDesignsToHtml, validateUnlayerDesign, type BatchConversionItem } from '@/lib/utils/batchUnlayerConverter';

export const useTemplateListing = () => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const navigate = useGenericStore((s) => s.navigate);

  const api = apiClient ? createAPI(apiClient) : null;

  const { devices, actions: deviceActions } = useDevicesStore();
  const { actions: loadingActions } = useLoadingStore();
  const { actions } = useTemplateListingStore();

  const handleAction = async (
    action: TemplateAction,
    template: CleanTemplateResponse,
    options?: { targetStatus?: 'draft' | 'published' }
  ) => {
    if (!api && action !== 'edit' && action !== 'preview') {
      message.error('API client is required');
      return;
    }
    try {
      switch (action) {
        case 'edit':
          navigate?.(`/popup-builder/build/${template.id}/edit`);
          break;
        case 'preview':
          navigate?.(`/popup-builder/build/${template.id}/preview`);
          break;
        case 'client-review':
          await pushTemplateToClientReview(template);
          message.success('Template pushed to client review successfully');
          getTemplates();
          break;
        case 'archive':
          loadingActions.setTemplateListActionLoading(true);
          try {
            await api!.templates.archiveTemplate(template.id);
            message.success('Template archived successfully');
            getTemplates();
          } finally {
            loadingActions.setTemplateListActionLoading(false);
          }
          break;
        case 'unarchive':
          loadingActions.setTemplateListActionLoading(true);
          try {
            await api!.templates.unarchiveTemplate(template.id, options?.targetStatus);
            message.success('Template unarchived successfully');
            getTemplates();
          } finally {
            loadingActions.setTemplateListActionLoading(false);
          }
          break;
        case 'delete':
          loadingActions.setTemplateListActionLoading(true);
          try {
            await api!.templates.deleteTemplate(template.id);
            message.success('Template deleted successfully');
            getTemplates();
          } finally {
            loadingActions.setTemplateListActionLoading(false);
          }
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    }
  };

  const getTemplates = async () => {
    if (!api) {
      message.error('API client is required');
      return;
    }
    loadingActions.setTemplateListingLoading(true);
    try {
      // Read fresh state at call time so filters/search/sort applied just before fetch are used
      const { filters: f, pagination: p, sorter: s } = useTemplateListingStore.getState();
      const response = await api.templates.getTemplatesForUI({
        filters: f,
        pagination: p,
        sorter: s,
      });
      actions.setTemplates(response.templates);
      actions.setPagination({
        current: response.pagination.page,
        pageSize: response.pagination.limit,
        total: response.pagination.total,
      });
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      loadingActions.setTemplateListingLoading(false);
    }
  };

  const pushTemplateToClientReview = async (
    template: CleanTemplateResponse
  ) => {
    if (!api) {
      message.error('API client is required');
      return;
    }

    loadingActions.setTemplateListActionLoading(true);
    try {
      // Prepare batch conversion items
      const conversionItems: BatchConversionItem[] = [];

      // Helper function to prepare template for batch conversion
      const prepareTemplateForConversion = (templateData: any, templateId: string) => {
        if (!templateData.builder_state_json) return null;

        // Parse JSON if it's a string
        let designData = templateData.builder_state_json;
        if (typeof designData === 'string') {
          try {
            designData = JSON.parse(designData);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse builder_state_json for template ${templateId}:`, parseError);
            return null;
          }
        }

        // Validate design data
        if (designData && validateUnlayerDesign(designData)) {
          return {
            id: templateId,
            designJson: designData
          };
        } else {
          console.warn(`⚠️ Invalid or missing Unlayer design data for template ${templateId}`);
          return null;
        }
      };

      // Add parent template to batch
      if(template.status === 'draft') {
        const parentItem = prepareTemplateForConversion(template, template.id);
        if (parentItem) {
          conversionItems.push(parentItem);
        }
      }

      // Add child templates to batch
      if (template.child_templates && template.child_templates.length > 0) {
        for (const childTemplate of template.child_templates) {
          if (childTemplate.status === 'draft') {
            const childItem = prepareTemplateForConversion(childTemplate, childTemplate.id);
            if (childItem) {
              conversionItems.push(childItem);
            }
          }
        }
      }

      if (conversionItems.length === 0) {
        message.error(
          'No valid templates found for conversion. Please ensure templates have valid design data.'
        );
        return;
      }

      // Batch convert all templates using single editor instance
      const conversionResults = await convertMultipleUnlayerDesignsToHtml(conversionItems, {
        projectId: 123,
        timeout: 30000, // 30 second total timeout
        delayBetweenConversions: 1500 // 1.5 second delay between conversions
      });

      // Prepare templates data for API
      const templatesData = conversionResults
        .filter(result => result.html && !result.error)
        .map(result => ({
          template_id: result.id,
          html_content: result.html!
        }));

      // Log any conversion failures
      const failedConversions = conversionResults.filter(result => result.error);
      if (failedConversions.length > 0) {
        console.warn('⚠️ Some templates failed to convert:', failedConversions);
      }

      // Push to client review with templates array
      if (templatesData.length > 0) {
        await api.templates.pushTemplateToClientReview(templatesData);

        const childCount = templatesData.length - 1;
        const failedCount = conversionResults.length - templatesData.length;

        let successMessage = childCount > 0
          ? `Template and ${childCount} child template(s) published successfully`
          : 'Template published successfully';

        if (failedCount > 0) {
          successMessage += ` (${failedCount} template(s) failed conversion)`;
        }

        message.success(successMessage);
      } else {
        message.error(
          'Pushing template to client review failed. No templates could be converted to HTML. Please try again later!'
        );
      }
    } catch (error) {
      console.error('❌ Error publishing template:', error);
    } finally {
      loadingActions.setTemplateListActionLoading(false);
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

  return { handleAction, getTemplates, getDevices };
};
