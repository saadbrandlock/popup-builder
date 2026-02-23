import { useGenericStore } from '@/stores/generic.store';
import { BaseProps } from '@/types/props';
import { message, Steps } from 'antd';
import React, { useEffect, useState } from 'react';
import ConfigStep from './ConfigStep';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useBuilderStore } from '@/stores/builder.store';
import { UnlayerMain } from './UnlayerMain';
import ReminderTabStep from './ReminderTabStep';
import { TemplateConfig } from '@/types';
import { checkObjectDiff } from '@/lib/utils/helper';
import { useBuilderMain } from '../hooks/useBuilderMain';
import { useTemplateListing } from '@/features/template-builder/hooks/use-template-listing';
import { UnlayerOptions } from 'react-email-editor';
import { useSyncGenericContext } from '@/lib/hooks/use-sync-generic-context';
import { createAPI } from '@/api';

interface BuilderMainProps extends BaseProps {
  unlayerConfig: UnlayerOptions;
  templateId?: string;
}

const BuilderMain: React.FC<BuilderMainProps> = ({
  apiClient,
  navigate,
  shoppers,
  accountDetails,
  accounts,
  authProvider,
  templateId,
  unlayerConfig,
}) => {
  // Sync first so apiClient and context are in store before useBuilderMain etc.
  useSyncGenericContext({
    accountDetails,
    authProvider,
    shoppers,
    navigate,
    accounts,
    apiClient,
  });

  const {
    createTemplate,
    updateTemplate,
    assignTemplateToShoppers,
    getTemplateFields,
    loadTemplate,
  } = useBuilderMain();
  const { getDevices } = useTemplateListing();

  const { adminBuilderStep, templateState, actions } = useBuilderStore();
  const { actions: loadingActions } = useLoadingStore();

  const handleConfigSubmit = async (data: TemplateConfig) => {
    loadingActions.setConfigSaving(true);
    try {
      if (templateId) {
        // Edit mode - just store config and proceed to next step
        actions.setTemplateConfig(data);

        if (checkObjectDiff(templateState, data, true, ['device_type_id'])) {
          loadingActions.setTemplateByIdLoading(true);
          await updateTemplate(templateId, data);
          actions.setTemplateState((prevState: any) => ({
            ...prevState,
            name: data.name,
            description: data.description,
            device_ids: data.device_ids,
            status: data.status,
            shopper_ids: data.shopper_ids,
            account_ids: Array.isArray(data.account_ids) ? data.account_ids : [],
            is_generic: data.is_generic,
          }));
        }

        loadingActions.setTemplateByIdLoading(false);
        actions.setAdminBuilderStep(1);
      } else {
        // Create mode - create new template
        const deviceIds =
          data.device_ids && data.device_ids.length > 0
            ? data.device_ids
            : data.device_type_id
              ? [data.device_type_id]
              : [];

        if (deviceIds.length === 0) {
          message.error('Please select at least one device type');
          return;
        }

        let newTemplateId: string;

        // Check if base template is selected
        if (data.base_template_id) {
          // Copy base template first
          const client = useGenericStore.getState().apiClient;
          if (!client) {
            message.error('API client is required');
            return;
          }
          const api = createAPI(client);
          const copyResponse = await api.templates.copyBaseTemplateToAccount(
            data.base_template_id,
            accountDetails?.id ??  0
          );
          newTemplateId = copyResponse.template_id;

          // Update the copied template with user's config
          await updateTemplate(newTemplateId, {
            name: data.name,
            description: data.description,
            device_ids: deviceIds,
            is_generic: data.is_generic || false,
            account_ids: Array.isArray(data.account_ids) ? data.account_ids : [],
            shopper_ids: data.shopper_ids,
            device_type_id: data.device_type_id,
          } as any);
        } else {
          // Create blank template from scratch (shopper_ids sent for duplicate check)
          const shopperIdsForCreate = data.is_generic ? shoppers.map((s) => s.id) : data.shopper_ids;
          const newTemplate = await createTemplate({
            name: data.name,
            description: data.description,
            device_ids: deviceIds,
            builder_state_json: {},
            canvas_type: 'single-row',
            is_generic: data.is_generic || false,
            account_ids: Array.isArray(data.account_ids) ? data.account_ids : [],
            device_type_id: data.device_type_id,
            shopper_ids: shopperIdsForCreate,
          });
          newTemplateId = newTemplate.id;
        }

        // MIGRATED: Update the template ID in Zustand store
        actions.setCurrentTemplateId(newTemplateId);

        const shopperIds = data.is_generic ? shoppers.map((s) => s.id) : data.shopper_ids;

        await assignTemplateToShoppers(newTemplateId, shopperIds);

        // Store config data for later use
        actions.setTemplateConfig(data);
        message.success('Template created successfully!');

        navigate(`/popup-builder/build/${newTemplateId}/edit`);
      }
    } catch (error: any) {
      console.error('Config submit error:', error);
      loadingActions.setTemplateByIdLoading(false);
    } finally {
      loadingActions.setConfigSaving(false);
    }
  };

  useEffect(() => {
    getDevices();
    getTemplateFields();
  }, []);

  useEffect(() => {
    if (!!templateId && adminBuilderStep === 0) {
      // Templates with ID go to builder step
      actions.setAdminBuilderStep(1);
    } else if (!templateId && adminBuilderStep > 0) {
      // Templates without ID go to config step
      actions.setAdminBuilderStep(0);
    }
    if (templateId) {
      actions.setCurrentTemplateId(templateId);
      // Load template data including reminder tab config
      // TODO: This is called twice in here cause its already handled in on ready
      loadTemplate(templateId).catch((error) => {
        console.error('Failed to load template:', error);
      });
    }
  }, [templateId]);

  // Clear persisted store data when component unmounts
  useEffect(() => {
    return () => {
      actions.clearPersistedStore();
    };
  }, []);

  return (
    <>
      <div className="mb-6">
        <Steps current={adminBuilderStep} style={{ margin: 0 }}>
          <Steps.Step title="Config" />
          <Steps.Step title="Builder" />
          <Steps.Step title="Reminder Tab" />
        </Steps>
      </div>

      {adminBuilderStep === 0 && (
        <ConfigStep
          handleFinalSave={handleConfigSubmit}
          isEditMode={!!templateId}
          templateEditState={templateState}
        />
      )}
      {adminBuilderStep === 1 && (
        <UnlayerMain
          unlayerConfig={unlayerConfig}
          enableCustomImageUpload={true}
        />
      )}
      {adminBuilderStep === 2 && (
        <ReminderTabStep
          onNext={() => {
            message.success('Reminder tab setup completed!');
            // Could navigate to a different page or show completion message
          }}
          onBack={() => actions.setAdminBuilderStep(1)}
          onSave={async (config) => {
            // Save reminder tab config to template
            // TODO: Add API call to save config to template
          }}
        />
      )}
    </>
  );
};

export default BuilderMain;
