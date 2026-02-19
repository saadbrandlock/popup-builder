import React, { useEffect } from 'react';
import { Drawer, Form, Input, Select, Row, Col, Button, Space } from 'antd';
import { CBCannedContentGroup, CreateContentGroupRequest } from '@/types';
import { useGenericStore } from '@/stores/generic.store';
import { useContentListingStore } from '@/stores/list/contentListing';
import { useLoadingStore } from '@/stores/common/loading.store';
import { splitByAndCapitalize } from '@/lib/utils/helper';
import { FieldMappingsSkeleton } from '@/components/skeletons';

export interface CannedContentFormProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateContentGroupRequest) => void;
  editingGroup?: CBCannedContentGroup | null;
  industries: string[];
}

const CannedContentForm: React.FC<CannedContentFormProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingGroup,
  industries,
}) => {
  const [form] = Form.useForm();

  const { shoppers } = useGenericStore();
  const { fields } = useContentListingStore();
  const { contentSubDataLoading, contentSubmitLoading } = useLoadingStore();

  const fieldsReady = !contentSubDataLoading && fields.length > 0;

  // Populate form when editing – run when visible, editingGroup, and fields are ready so keys match Form.Item names
  useEffect(() => {
    if (visible && editingGroup) {
      if (!fieldsReady) {
        return;
      }
      const fieldsData: Record<string, string> = {};

      const getContentByFieldId = (fieldId: string | null): string => {
        if (!fieldId) return '';
        if (editingGroup.parent.field === fieldId) {
          return editingGroup.parent.content || '';
        }
        const child = editingGroup.children.find((c) => c.field === fieldId);
        return child?.content ?? '';
      };

      fields.forEach((fieldDef) => {
        fieldsData[fieldDef.key] = getContentByFieldId(String(fieldDef.value));
      });

      form.setFieldsValue({
        group_label: editingGroup.parent.group_label,
        industry: editingGroup.parent.industry,
        shopper_ids: editingGroup.parent.shopper_ids || [],
        remarks: editingGroup.parent.remarks,
        fields: fieldsData,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editingGroup, form, fieldsReady, fields]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const fieldsMap = fields.reduce((acc, field) => {
        acc[field.key] = field.value;
        return acc;
      }, {} as Record<string, number>);

      // Transform form data into CreateContentGroupRequest format.
      // When editing, attach child_id so backend can update only that row's updated_at/updated_by.
      const requestData: CreateContentGroupRequest = {
        group_label: values.group_label,
        industry: values.industry,
        shopper_ids: values.shopper_ids,
        remarks: values.remarks,
        fields: Object.entries(values.fields || {}).map(([fieldName, content]) => {
          const field_id = fieldsMap[fieldName].toString();
          const isParentField = editingGroup?.parent?.field === field_id;
          const existingChild = !isParentField ? editingGroup?.children?.find((c) => c.field === field_id) : undefined;
          const childId = existingChild && typeof existingChild.id === 'number' ? existingChild.id : undefined;
          return {
            field_id,
            content: content as string,
            ...(childId != null && { child_id: childId }),
          };
        }),
      };

      onSubmit(requestData);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const drawerFooter = (
    <Space>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="primary" onClick={handleSubmit} loading={contentSubmitLoading}>
        {editingGroup ? 'Update' : 'Add'}
      </Button>
    </Space>
  );

  return (
    <Drawer
      title={editingGroup ? 'Edit Content Set' : 'Add New Content Set'}
      open={visible}
      onClose={onCancel}
      width={640}
      footer={drawerFooter}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Row gutter={[16, 0]}>
          {/* Content Set Name - full width */}
          <Col xs={24} className='mb-4'>
            <Form.Item
              name="group_label"
              label="Content Set Name"
              rules={[
                {
                  required: true,
                  message: 'Please enter a name for this content set',
                },
              ]}
              help="Give this set a descriptive name (e.g., 'Summer Sale 2024', 'Holiday Campaign')"
            >
              <Input
                placeholder="E.g., Summer Sale 2024"
                maxLength={100}
                showCount
              />
            </Form.Item>
          </Col>

          {/* Industry & Shopper Segments - side by side on larger screens */}
          <Col xs={24} md={12}>
            <Form.Item
              name="industry"
              label="Industry"
              rules={[{ required: true, message: 'Please select an industry' }]}
            >
              <Select
                showSearch
                placeholder="Select industry"
                options={[...industries, 'ecommerce'].map((i) => ({
                  label: splitByAndCapitalize(i, '_'),
                  value: i,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="shopper_ids"
              label="Shopper Segments"
              rules={[
                {
                  required: true,
                  message: 'Please select at least one shopper segment',
                },
              ]}
            >
              <Select
                allowClear
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Select Shopper Segments"
                options={shoppers.map((s) => ({ label: s.name, value: s.id }))}
              />
            </Form.Item>
          </Col>

          {/* Dynamic fields - container with light gray bg; skeleton until field-content-mappings API loads */}
          <Col xs={24}>
            <div
              style={{
                background: 'var(--ant-color-fill-quaternary, #f5f5f5)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 0,
              }}
            >
              {fieldsReady ? (
                <Row gutter={[16, 0]}>
                  {fields.map((fieldDef) => (
                    <Col xs={24} md={12} key={fieldDef.key}>
                      <Form.Item
                        name={['fields', fieldDef.key]}
                        label={splitByAndCapitalize(fieldDef.key, '_')}
                        rules={[
                          {
                            required: true,
                            message: 'Please enter content for this field',
                          },
                        ]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              ) : (
                <FieldMappingsSkeleton />
              )}
            </div>
          </Col>

          {/* Remarks - full width */}
          <Col xs={24}>
            <Form.Item name="remarks" label="Remarks">
              <Input.TextArea rows={2} placeholder="Enter remarks (optional)" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
};

export default CannedContentForm;
