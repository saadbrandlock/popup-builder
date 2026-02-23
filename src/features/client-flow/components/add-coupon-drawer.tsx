import { useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  DatePicker,
  Switch,
  Row,
  Col,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { TimezoneSelect } from '@/components/common/TimezoneSelect';
import { useGenericStore } from '@/stores/generic.store';
import { createAPI } from '@/api';
import type { AddCouponPayload } from '@/api/services/CouponAPI';

export interface AddCouponDrawerProps {
  open: boolean;
  onClose: () => void;
  activeShopperId: number | null;
  onSuccess: (newCouponId: number) => void;
}

interface AddCouponFormValues {
  offer_heading: string;
  offer_sub_heading?: string;
  code: string;
  valid_from: Dayjs;
  valid_to: Dayjs;
  valid_from_timezone: string;
  remarks?: string;
  is_active: boolean;
  one_time_coupon: boolean;
}

export const AddCouponDrawer = ({
  open,
  onClose,
  activeShopperId,
  onSuccess,
}: AddCouponDrawerProps) => {
  const [form] = Form.useForm<AddCouponFormValues>();
  const [validFromValue, setValidFromValue] = useState<Dayjs | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const accountDetails = useGenericStore((s) => s.accountDetails);
  const apiClient = useGenericStore((s) => s.apiClient);

  const handleValidFromChange = (value: Dayjs | null) => {
    setValidFromValue(value ?? null);
    if (value) {
      const minValidTo = value.add(1, 'hour');
      const currentValidTo = form.getFieldValue('valid_to');
      if (
        !currentValidTo ||
        (dayjs.isDayjs(currentValidTo) && currentValidTo.isBefore(minValidTo))
      ) {
        form.setFieldsValue({ valid_to: minValidTo });
      }
    }
  };

  const disableValidToDate = (current: Dayjs) => {
    if (!validFromValue) return false;
    return current.isBefore(validFromValue, 'date');
  };

  const handleSubmit = async (values: AddCouponFormValues) => {
    if (!activeShopperId) {
      message.error('Please select a shopper group first');
      return;
    }
    if (!accountDetails || !apiClient) {
      message.error('Account details not available');
      return;
    }

    const siteId = accountDetails.legacy_account_id || accountDetails.id;
    const domain = accountDetails.domain;

    const payload: AddCouponPayload = {
      offer_heading: values.offer_heading,
      offer_sub_heading: values.offer_sub_heading ?? '',
      code: values.code,
      valid_from: dayjs(values.valid_from).format('MM/DD/YYYY hh:mm A'),
      valid_from_timezone: values.valid_from_timezone,
      valid_to: dayjs(values.valid_to).format('MM/DD/YYYY hh:mm A'),
      valid_to_timezone: values.valid_from_timezone,
      is_active: values.is_active,
      one_time_coupon: values.one_time_coupon,
      site_id: siteId,
      personas: String(activeShopperId),
      reported_status: 'queue',
      remarks: values.remarks ?? null,
      dummy_coupon: false,
      domain,
    };

    setSubmitting(true);
    try {
      const api = createAPI(apiClient);
      const result = await api.coupons.addCoupon(payload);
      message.success('Coupon added successfully');
      form.resetFields();
      setValidFromValue(null);
      onSuccess(result.coupon_id);
      onClose();
    } catch (error) {
      message.error(
        (error as Error)?.message ?? 'Failed to add coupon'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setValidFromValue(null);
    onClose();
  };

  return (
    <Drawer
      title={
        <div className='flex justify-between w-full'>
          <span>Add New Coupon</span>
          <button
            className="feedback-sidebar-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
      }
      placement="right"
      width={480}
      onClose={handleClose}
      open={open}
      className="client-flow-root"
      closable={false}
      footer={
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="cf-btn cf-btn-secondary"
            disabled={submitting}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cf-btn-confirm"
            disabled={submitting}
            onClick={() => form.submit()}
          >
            {submitting ? 'Adding...' : 'Add Coupon'}
          </button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          is_active: true,
          one_time_coupon: false,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">COUPON TITLE *</span>}
              name="offer_heading"
              rules={[{ required: true, message: 'Required' }]}
              help={<span className="field-helper-text">e.g. 15% Off</span>}
            >
              <Input placeholder="e.g. 15% Off" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">COUPON SUBTITLE</span>}
              name="offer_sub_heading"
              help={<span className="field-helper-text">e.g. Limited Time</span>}
            >
              <Input placeholder="e.g. Limited Time" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">COUPON CODE *</span>}
              name="code"
              rules={[{ required: true, message: 'Required' }]}
              help={<span className="field-helper-text">e.g. SAVE15</span>}
            >
              <Input placeholder="e.g. SAVE15" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">VALID FROM *</span>}
              name="valid_from"
              rules={[{ required: true, message: 'Required' }]}
            >
              <DatePicker
                className="w-full !rounded-[8px]"
                showTime
                format="MM/DD/YYYY hh:mm A"
                onChange={handleValidFromChange}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">VALID TO</span>}
              name="valid_to"
              rules={[
                { required: true, message: 'Required' },
                {
                  validator: (_, value) => {
                    if (validFromValue && value && dayjs.isDayjs(value)) {
                      const minValidTo = validFromValue.add(1, 'hour');
                      if (value.isBefore(minValidTo)) {
                        return Promise.reject(
                          'End date must be at least 1 hour after start date'
                        );
                      }
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <DatePicker
                className="w-full !rounded-[8px]"
                showTime
                format="MM/DD/YYYY hh:mm A"
                disabledDate={disableValidToDate}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">TIMEZONE *</span>}
              name="valid_from_timezone"
              rules={[{ required: true, message: 'Required' }]}
            >
              <TimezoneSelect placeholder="Select timezone" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label={<span className="content-field-label">REMARKS</span>}
              name="remarks"
              help={
                <span className="field-helper-text">
                  Optional notes about this coupon...
                </span>
              }
            >
              <Input.TextArea
                placeholder="Optional notes about this coupon..."
                rows={3}
                size="large"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">ACTIVATE COUPON</span>}
              name="is_active"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={<span className="content-field-label">ONE TIME COUPON</span>}
              name="one_time_coupon"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
};
