import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Card, Collapse, Divider, Form, Input, InputNumber, Select, Slider, Space, Switch, Tooltip, Typography } from 'antd';
import type { CollapseProps } from 'antd';
import type { DetectedComponent } from '../utils/detection';
import type { ComponentPropSchema } from '../registry';
import { X } from 'lucide-react';

const { Text } = Typography;

// ── Prop control renderer ────────────────────────────────────────────────────

function renderPropControl(
  schema: ComponentPropSchema,
  value: string | number | boolean,
  onChange: (name: string, value: unknown) => void,
) {
  switch (schema.type) {
    case 'number':
      return (
        <InputNumber
          value={Number(value)}
          min={schema.min}
          max={schema.max}
          step={schema.step ?? 1}
          onChange={(v) => onChange(schema.name, v ?? 0)}
          className="w-full"
          size="small"
        />
      );
    case 'text':
      return (
        <Input
          value={String(value)}
          onChange={(e) => onChange(schema.name, e.target.value)}
          size="small"
        />
      );
    case 'color':
      return (
        <Space.Compact className="w-full">
          <input
            type="color"
            value={String(value)}
            onChange={(e) => onChange(schema.name, e.target.value)}
            className="w-8 h-6 border border-[#d9d9d9] rounded-l cursor-pointer p-0.5 bg-transparent shrink-0"
          />
          <Input
            value={String(value)}
            onChange={(e) => onChange(schema.name, e.target.value)}
            size="small"
            className="font-mono"
          />
        </Space.Compact>
      );
    case 'select':
      return (
        <Select
          value={String(value)}
          options={schema.options?.map((o) => ({ label: o.label, value: String(o.value) }))}
          onChange={(v) => onChange(schema.name, v)}
          size="small"
          className="w-full"
        />
      );
    case 'toggle':
      return <Switch checked={!!value} onChange={(v) => onChange(schema.name, v)} size="small" />;
    case 'range':
      return (
        <Slider
          value={Number(value)}
          min={schema.min ?? 0}
          max={schema.max ?? 100}
          step={schema.step ?? 1}
          onChange={(v) => onChange(schema.name, v)}
          className="mt-1"
        />
      );
    default:
      return null;
  }
}

// ── Inline prop editor (local state for perf) ────────────────────────────────

interface InlinePropEditorProps {
  component: DetectedComponent;
  onPropsChange: (componentId: string, htmlBlockId: string, newProps: Record<string, unknown>) => void;
  userRole: 'admin' | 'client';
}

const InlinePropEditor: React.FC<InlinePropEditorProps> = ({ component, onPropsChange, userRole }) => {
  const [localProps, setLocalProps] = useState<Record<string, unknown>>(component.currentProps);

  useEffect(() => {
    setLocalProps(component.currentProps);
  }, [component.htmlBlockId, component.currentProps]);

  const handleChange = useCallback(
    (propName: string, value: unknown) => {
      const newProps = { ...localProps, [propName]: value };
      setLocalProps(newProps);
      onPropsChange(component.componentId, component.htmlBlockId, newProps);
    },
    [localProps, component, onPropsChange],
  );

  const hasProps = component.componentDef.props.length > 0;

  return (
    <div className="py-1">
      {/* ── Preview ── */}
      <div className="shrink-0">
        <div className="text-[10px] font-bold text-[#aaa] uppercase tracking-[0.6px] mb-1.5">
          Preview
        </div>
        {/*
          Inner div is 200% wide and scaled 0.5 from top-left.
          Net visual width = 200% * 0.5 = 100% of the 240px container — no horizontal clip.
          Height is clipped at 160px by the outer overflow:hidden.
        */}
        <div className="w-60 h-40 overflow-hidden bg-[#f8f9fa] border border-[#ebebeb] rounded-lg relative">
          <div
            className="absolute top-1/2 left-1/2 w-[200%] -translate-x-1/2 -translate-y-1/2 scale-50 origin-center pointer-events-none px-2"
            dangerouslySetInnerHTML={{ __html: component.componentDef.render(localProps) }}
          />
        </div>
      </div>

      <Divider />

      {/* ── Properties ── */}
      <div className="flex-1 min-w-0">
        {hasProps ? (
          <>
            <div className="text-[10px] font-bold text-[#aaa] uppercase tracking-[0.6px] mb-2">
              Properties
            </div>
            <Form size="small" layout="vertical">
              {component.componentDef.props.map((schema) => {
                const value = (localProps[schema.name] ?? schema.defaultValue) as string | number | boolean;
                return (
                  <Form.Item
                    key={schema.name}
                    label={<Text className="text-xs">{schema.label}</Text>}
                    className="!mb-2.5"
                  >
                    {renderPropControl(schema, value, handleChange)}
                  </Form.Item>
                );
              })}
            </Form>
          </>
        ) : (
          <Text type="secondary" className="text-xs">No configurable properties.</Text>
        )}

        {userRole === 'admin' && (
          <details className="mt-2">
            <summary className="text-[10px] text-[#bbb] cursor-pointer select-none">
              View generated HTML
            </summary>
            <pre className="text-[9px] bg-[#1a1a2e] text-[#6ee7b7] p-2 rounded overflow-auto max-h-[120px] mt-1">
              {component.componentDef.render(localProps)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

// ── Public component ─────────────────────────────────────────────────────────

export interface ActiveComponentsListProps {
  components: DetectedComponent[];
  selectedComponent: DetectedComponent | null;
  onSelect: (comp: DetectedComponent) => void;
  onPropsChange: (componentId: string, htmlBlockId: string, newProps: Record<string, unknown>) => void;
  onCollapse?: () => void;
  userRole?: 'admin' | 'client';
}

export const ActiveComponentsList: React.FC<ActiveComponentsListProps> = ({
  components,
  selectedComponent,
  onSelect,
  onPropsChange,
  onCollapse,
  userRole = 'admin',
}) => {
  const [expandedKey, setExpandedKey] = useState<string | undefined>(undefined);

  // Auto-expand when selection changes externally
  useEffect(() => {
    if (selectedComponent?.htmlBlockId) {
      setExpandedKey(selectedComponent.htmlBlockId);
    }
  }, [selectedComponent?.htmlBlockId]);

  if (components.length === 0) return null;

  const handleCollapseChange = (key: string | string[]) => {
    const active = Array.isArray(key) ? key[0] : key;
    setExpandedKey(active || undefined);
    if (active) {
      const comp = components.find((c) => c.htmlBlockId === active);
      if (comp) {
        onSelect(comp);
      }
    }
  };

  const collapseItems: CollapseProps['items'] = components.map((comp) => ({
    key: comp.htmlBlockId,
    label: (
      <Space size={8}>
        <span className="text-base leading-none">{comp.componentDef.icon}</span>
        <Text className="text-[13px] font-medium">{comp.componentDef.name}</Text>
      </Space>
    ),
    children: (
      <InlinePropEditor
        component={comp}
        onPropsChange={onPropsChange}
        userRole={userRole}
      />
    ),
  }));

  return (
    <Card
      size="small"
      className="rounded-lg h-full"
      styles={{ body: { padding: 0 } }}
      title={
        <Space size={8}>
          <Text className="text-[13px] font-semibold">Custom Components</Text>
          <Badge count={components.length} color="geekblue" style={{ fontSize: 10 }} />
        </Space>
      }
      extra={
        onCollapse && (
            <Button
              type="text"
              size="small"
              icon={<X size={14} />}
              onClick={onCollapse}
              className="!text-gray-400"
            />
        )
      }
    >
      <Collapse
        accordion
        activeKey={expandedKey}
        onChange={handleCollapseChange}
        items={collapseItems}
        className="!border-0 !rounded-none"
        size="small"
      />
    </Card>
  );
};
