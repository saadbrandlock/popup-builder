import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Form, Input, Select, Row, Col, Typography, Button, Divider, Modal, message } from 'antd';
import { CheckCircle } from 'lucide-react';
import { useClientFlowStore } from '@/stores/clientFlowStore';
import { useDevicesStore } from '@/stores/common/devices.store';
import { useGenericStore } from '@/stores/generic.store';
import { CBTemplateFieldContentIdMappingWithContent, CBCannedContentGroup, CBCannedContentWithShoppers } from '@/types';
import { useLoadingStore } from '@/stores/common/loading.store';
import { AssignCouponsSection } from './assign-coupons-section';
import { createAPI } from '@/api';
import { useClientFlow } from '../hooks/use-client-flow';

const { Title, Text } = Typography;

interface ContentFormData {
  [key: string]: string;
}

const ContentForm = () => {
  const {
    contentFields,
    activeContentShopper,
    contentFormData,
    selectedDeviceId,
    availablePresets,
    selectedPreset,
    clientData,
    actions
  } = useClientFlowStore();

  // Lock form when published or admin-rejected; leave unlocked for admin-changes-request (client must re-edit)
  const isPublished = (clientData?.length ?? 0) > 0 &&
    (clientData ?? []).every(t => t.template_status === 'published');
  const isRejected = (clientData?.length ?? 0) > 0 &&
    (clientData ?? []).every(t => t.template_status === 'admin-rejected');
  const isInAdminReview = (clientData?.length ?? 0) > 0 &&
    (clientData ?? []).every(t => t.template_status === 'admin-review');
  const isFormLocked = isPublished || isRejected || isInAdminReview;
  const { devices } = useDevicesStore();
  const { apiClient, accountDetails } = useGenericStore();
  const { contentSubDataLoading } = useLoadingStore();
  const { upsertStepApprovalForAllTemplates, refreshClientTemplatesData } = useClientFlow();
  const [form] = Form.useForm<ContentFormData>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentFormDataRef = useRef(contentFormData);
  contentFormDataRef.current = contentFormData;
  const [isLoading, setIsLoading] = useState(false);
  const [customInputs, setCustomInputs] = useState<{ [key: string]: boolean }>({});
  const [selectedCoupons, setSelectedCoupons] = useState<number[]>([]);

  const activeShopperId =
    activeContentShopper?.content?.id != null
      ? Number(activeContentShopper.content.id)
      : null;

  // Shopper from clientData (has content + coupons from API)
  const activeShopperFromClient = useMemo(() => {
    if (!activeShopperId || !clientData?.length) return null;
    for (const t of clientData) {
      const s = t.shoppers?.find((sh) => sh.id === activeShopperId);
      if (s) return s;
    }
    return null;
  }, [activeShopperId, clientData]);

  const initialCouponIdsFromClient = useMemo(() => {
    const s = activeShopperFromClient;
    if (!s) return undefined;
    if (s.coupons?.length) return s.coupons.map((c) => c.promo_code_id);
    if (s.coupon_ids?.length) return s.coupon_ids;
    return undefined;
  }, [activeShopperFromClient]);

  const handleSelectionChange = useCallback((couponIds: number[]) => {
    setSelectedCoupons(couponIds);
  }, []);

  // Filter fields based on selected device
  const filteredFields = useMemo(() => {
    if (!selectedDeviceId || !devices.length) return contentFields;

    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    if (!selectedDevice) return contentFields;

    return contentFields.filter(field => {
      // Check if field supports the selected device
      const deviceSupport = field.supported_devices?.[selectedDevice.device_type];
      return deviceSupport !== undefined && deviceSupport > 0;
    });
  }, [contentFields, selectedDeviceId, devices]);

  // Compute initial form values — contentFormDataRef used instead of contentFormData
  // to read latest value without adding it as a dep (avoids update loop).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialValues = useMemo<ContentFormData | null>(() => {
    if (!filteredFields?.length) return null;

    const shopperContent = activeShopperFromClient?.content;
    const values: ContentFormData = {};

    const findFormFieldId = (numericFieldId: string | null): string | null => {
      if (!numericFieldId) return null;
      const field = contentFields.find((f) => String(f.id) === String(numericFieldId));
      return field ? field.field_id : null;
    };

    filteredFields.forEach((field) => {
      if (shopperContent) {
        const parentFieldId =
          shopperContent.parent?.field_id ?? findFormFieldId(shopperContent.parent?.field);
        if (parentFieldId && shopperContent.parent?.content && field.field_id === parentFieldId) {
          values[field.field_id] = shopperContent.parent.content;
        }
        const childMatch = shopperContent.children?.find((c) => {
          const childFieldId = c.field_id ?? findFormFieldId(c.field);
          return childFieldId === field.field_id;
        });
        if (childMatch?.content) {
          values[field.field_id] = childMatch.content;
        }
      }
      if (!(field.field_id in values) && contentFormDataRef.current[field.field_id]) {
        values[field.field_id] = contentFormDataRef.current[field.field_id];
      }
      if (!(field.field_id in values)) {
        const match = field.content.find(
          (c) => c.industry === activeContentShopper?.content?.name
        );
        values[field.field_id] = match?.content || field.default_field_value;
      }
    });

    return values;
  }, [filteredFields, activeContentShopper, activeShopperFromClient, contentFields]);

  // Apply computed initial values to form — form and actions are stable references, excluded from deps.
  useEffect(() => {
    if (!initialValues) return;
    form.setFieldsValue(initialValues);
    actions.setContentFormData(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // Clear selectedPreset when shopper has API content (not in preset list) or when switching shoppers
  useEffect(() => {
    if (activeShopperFromClient) {
      actions.setSelectedPreset(null);
    }
  }, [activeShopperFromClient, actions]);

  // Presets are loaded by ClientFlow.tsx when shopper changes — no need to duplicate here

  const handleSubmit = async (values: ContentFormData) => {
    if (!activeShopperId) {
      message.warning('No active shopper selected.');
      return;
    }
    if (!apiClient) {
      message.error('API client not available.');
      return;
    }

    // Use content_preset_id from API when shopper has content, else selected preset
    const presetId =
      activeShopperFromClient?.content_preset_id ?? selectedPreset?.parent.id;
    if (!presetId) {
      message.warning('Please select a preset to load content from, or ensure this shopper has content assigned.');
      return;
    }

    const templateIds =
      clientData
        ?.filter((t) => t.shoppers?.some((s) => s.id === activeShopperId))
        .map((t) => t.template_id) ?? [];

    // Map form values (keyed by field_id) to contentByFieldId keyed by numeric field id for backend
    const contentByFieldId: Record<string, string> = {};
    contentFields.forEach((field) => {
      const val = values[field.field_id];
      if (val != null && val !== '') {
        contentByFieldId[String(field.id)] = val;
      }
    });

    setIsLoading(true);
    try {
      const api = createAPI(apiClient);
      await api.content.confirmContentChanges({
        presetId,
        contentByFieldId,
        shopperId: activeShopperId,
        templateIds,
        couponIds: selectedCoupons,
      });
      message.success('Content changes confirmed successfully.');

      // Refresh client data so the latest shopper content is in the store before we check it.
      // Use getState() for accountId to avoid stale closure from last render.
      const accountId = useGenericStore.getState().accountDetails?.id;
      if (accountId) {
        await refreshClientTemplatesData(accountId);
      }

      // Read fresh clientData from the store (not the stale closure value) to decide
      // whether all shoppers now have content and step 3 should be auto-approved.
      const freshClientData = useClientFlowStore.getState().clientData;
      const allHaveContent =
        !!freshClientData?.length &&
        freshClientData.every((t) => t.shoppers?.every((s) => s.content != null) ?? false);

      if (allHaveContent) {
        await upsertStepApprovalForAllTemplates('templateCopy', 'approved');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm content changes';
      message.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Populate form from preset
  const populateFromPreset = (preset: CBCannedContentGroup) => {
    const formValues: ContentFormData = {};

    // Clear custom input modes so all fields show as dropdowns
    setCustomInputs({});

    // Helper to find form field_id by numeric field id
    const findFormFieldId = (numericFieldId: string | null): string | null => {
      if (!numericFieldId) return null;
      // Find the contentField where id matches the numeric field id
      const field = contentFields.find(f => String(f.id) === String(numericFieldId));
      return field ? field.field_id : null;
    };

    // Map parent (heading) content - parent.field contains numeric field_id from DB
    if (preset.parent.field && preset.parent.content) {
      const formFieldId = findFormFieldId(preset.parent.field);
      if (formFieldId) {
        formValues[formFieldId] = preset.parent.content;
      }
    }

    // Map children content - child.field contains numeric field_id from DB
    preset.children.forEach(child => {
      if (child.field && child.content) {
        const formFieldId = findFormFieldId(child.field);
        if (formFieldId) {
          formValues[formFieldId] = child.content;
        }
      }
    });

    // Update form and store
    form.setFieldsValue(formValues);
    actions.setContentFormData(formValues);
    actions.setSelectedPreset(preset);
  };

  // Handle preset selection
  const handlePresetChange = (presetId: number | null) => {
    if (!presetId) {
      actions.setSelectedPreset(null);
      return;
    }

    const preset = availablePresets.find(p => p.parent.id === presetId);
    if (!preset) return;

    // Check for unsaved changes
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: 'Replace current content?',
        content: 'This will replace your unsaved changes. Continue?',
        okText: 'Replace',
        cancelText: 'Cancel',
        onOk: () => populateFromPreset(preset),
      });
    } else {
      populateFromPreset(preset);
    }
  };

  // Handle field focus for highlighting
  const handleFieldFocus = (fieldId: string, fieldName: string) => {
    actions.setHighlightedField(fieldId, fieldName);
  };

  // Handle field blur - clear immediately
  const handleFieldBlur = () => {
    actions.setHighlightedField(null);
  };

  // Handle input change - clear highlight when user starts typing
  const handleInputChange = () => {
    actions.setHighlightedField(null);
  };

  const renderFormField = (field: CBTemplateFieldContentIdMappingWithContent) => {
    const hasOptions = field.content && field.content.length > 0;
    const isRequired = true; // You can adjust based on validation rules

    if (hasOptions) {
      // Render Select dropdown when content options are available
      return (
        <Form.Item
          key={field.field_id}
          name={field.field_id}
          label={
            <span className="content-field-label">
              {field.field}{isRequired && ' *'}
            </span>
          }
          rules={[
            { required: true, message: `Please select or enter ${field.field.toLowerCase()}` }
          ]}
          help={<span className="field-helper-text">Choose from preset or enter custom text</span>}
        >
          {customInputs[field.field_id] ? (
            <Input
              placeholder={`Enter custom ${field.field.toLowerCase()}`}
              size="large"
              onFocus={() => handleFieldFocus(field.field_id, field.field)}
              onBlur={handleFieldBlur}
              onChange={handleInputChange}
              suffix={
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setCustomInputs(prev => ({ ...prev, [field.field_id]: false }));
                    form.setFieldValue(field.field_id, field.default_field_value);
                  }}
                >
                  Back to options
                </Button>
              }
            />
          ) : (
            <Select
              placeholder={`Select ${field.field.toLowerCase()}`}
              allowClear
              size="large"
              value={form.getFieldValue(field.field_id)}
              onFocus={() => handleFieldFocus(field.field_id, field.field)}
              onBlur={handleFieldBlur}
              onChange={(value) => {
                handleInputChange();
                if (value === '__CUSTOM__') {
                  setCustomInputs(prev => ({ ...prev, [field.field_id]: true }));
                  form.setFieldValue(field.field_id, '');
                } else {
                  form.setFieldValue(field.field_id, value);
                }
              }}
            >
              {/* Default option */}
              <Select.Option value={field.default_field_value}>
                {field.default_field_value} (Default)
              </Select.Option>

              {/* Content options */}
              {field.content.map((content) => (
                <Select.Option key={content.id} value={content.content}>
                  {content.content}
                </Select.Option>
              ))}

              {/* Custom input option */}
              <Select.Option value="__CUSTOM__" style={{ borderTop: '1px solid #f0f0f0' }}>
                <Text type="secondary">✏️ Enter custom content</Text>
              </Select.Option>
            </Select>
          )}
        </Form.Item>
      );
    } else {
      // Render Input when no content options are available
      return (
        <Form.Item
          key={field.field_id}
          name={field.field_id}
          label={
            <span className="content-field-label">
              {field.field}{isRequired && ' *'}
            </span>
          }
          rules={[
            { required: true, message: `Please enter ${field.field.toLowerCase()}` }
          ]}
          help={<span className="field-helper-text">Enter custom text for this field</span>}
        >
          <Input
            placeholder={field.default_field_value}
            size="large"
            onFocus={() => handleFieldFocus(field.field_id, field.field)}
            onBlur={handleFieldBlur}
            onChange={handleInputChange}
          />
        </Form.Item>
      );
    }
  };

  if (!filteredFields || filteredFields.length === 0) {
    const selectedDevice = devices.find(d => d.id === selectedDeviceId);
    const deviceName = selectedDevice?.device_type || 'this device'

    return (
      <Row justify="center">
        <Col span={24}>
          <div className="text-center py-8">
            <Text type="secondary">
              No content fields available for {deviceName}
            </Text>
          </div>
        </Col>
      </Row>
    );
  }

  return (
    <>
      {/* Enhanced card header with preset selector */}
      <Row gutter={[0, 16]} className='mb-6'>
        <Col span={24}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <Title level={5} className="mb-0">
                  Content Configuration
                </Title>
                <Text type="secondary" className="text-xs">
                  Edit messaging for {activeContentShopper?.content?.name || 'this group'}
                </Text>
              </div>
            </div>
          </div>
          <Divider className='!my-2' />
        </Col>
        <Col xs={24}>
          <div className="preset-selector">
            <span className='block mb-1'>LOAD FROM PRESET:</span>
            <Select
            className='w-full'
              value={selectedPreset?.parent.id ?? undefined}
              onChange={handlePresetChange}
              size="small"
              placeholder={
                activeShopperFromClient?.content
                  ? 'Use Preset'
                  : availablePresets.length
                    ? 'Select a preset...'
                    : 'No presets available'
              }
              allowClear
              loading={contentSubDataLoading}
              disabled={isFormLocked || !availablePresets.length}
              options={availablePresets.map(preset => ({
                label: preset.parent.group_label || `Preset ${preset.parent.id}`,
                value: preset.parent.id,
              }))}
              notFoundContent={
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <Text type="secondary">No content presets for this shopper</Text>
                </div>
              }
            />
          </div>
        </Col>
      </Row>

      <Form
        form={form}
        onFinish={handleSubmit}
        onValuesChange={(_changedValues, allValues) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => actions.setContentFormData(allValues), 300);
        }}
        layout="vertical"
        disabled={isLoading || isFormLocked}
      >
        <Row gutter={[16, 16]}>
          {filteredFields.map((field) => (
            <Col xs={24} key={field.field_id}>
              {renderFormField(field)}
            </Col>
          ))}
        </Row>

        <AssignCouponsSection
          activeShopperId={activeShopperId}
          selectedCoupons={selectedCoupons}
          onSelectionChange={handleSelectionChange}
          initialCouponIdsFromClient={initialCouponIdsFromClient}
          couponsFromApi={activeShopperFromClient?.coupons ?? undefined}
        />

        {/* Confirm Changes Button */}
        <button
          type="submit"
          disabled={isLoading || isFormLocked}
          className="cf-btn-confirm mt-6"
        >
          <CheckCircle size={18} />
          <span>{isLoading ? 'Confirming Changes...' : 'Confirm Changes'}</span>
        </button>
      </Form>
    </>
  );
};

export default ContentForm;
