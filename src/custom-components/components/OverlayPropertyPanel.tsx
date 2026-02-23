import React, { useState, useEffect, useCallback } from 'react';
import type { DetectedComponent } from '../utils/detection';
import type { ComponentPropSchema } from '../registry';

export interface OverlayPropertyPanelProps {
  component: DetectedComponent;
  onPropsChange: (componentId: string, htmlBlockId: string, newProps: Record<string, unknown>) => void;
  onClose: () => void;
  userRole: 'admin' | 'client';
  editorContainerRef?: React.RefObject<HTMLDivElement | null>;
  /** 'overlay' = right-side overlay; 'left' = left-side overlay; 'inline' = card in flow below header */
  placement?: 'overlay' | 'left' | 'inline';
  /** Width in px to match the underlying Unlayer property panel. Defaults to 300 (Unlayer default). */
  panelWidth?: number;
}

export const OverlayPropertyPanel: React.FC<OverlayPropertyPanelProps> = ({
  component,
  onPropsChange,
  onClose,
  userRole,
  placement = 'overlay',
  panelWidth = 300,
}) => {
  const [localProps, setLocalProps] = useState<Record<string, unknown>>(component.currentProps);

  useEffect(() => {
    setLocalProps(component.currentProps);
  }, [component.htmlBlockId, component.currentProps]);

  const handlePropChange = useCallback(
    (propName: string, value: unknown) => {
      const newProps = { ...localProps, [propName]: value };
      setLocalProps(newProps);
      onPropsChange(component.componentId, component.htmlBlockId, newProps);
    },
    [localProps, component, onPropsChange]
  );

  const renderPropEditor = (schema: ComponentPropSchema) => {
    const value = (localProps[schema.name] ?? schema.defaultValue) as string | number | boolean;

    switch (schema.type) {
      case 'number':
        return (
          <input
            type="number"
            value={Number(value)}
            min={schema.min}
            max={schema.max}
            step={schema.step ?? 1}
            onChange={(e) => handlePropChange(schema.name, Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        );

      case 'text':
        return (
          <input
            type="text"
            value={String(value)}
            onChange={(e) => handlePropChange(schema.name, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          />
        );

      case 'color':
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={String(value)}
              onChange={(e) => handlePropChange(schema.name, e.target.value)}
              style={{ width: '36px', height: '30px', border: 'none', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={String(value)}
              onChange={(e) => handlePropChange(schema.name, e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => handlePropChange(schema.name, e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
            }}
          >
            {schema.options?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'toggle':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handlePropChange(schema.name, e.target.checked)}
            />
            <span style={{ fontSize: '13px' }}>{value ? 'Enabled' : 'Disabled'}</span>
          </label>
        );

      case 'range':
        return (
          <div>
            <input
              type="range"
              value={Number(value)}
              min={schema.min ?? 0}
              max={schema.max ?? 100}
              step={schema.step ?? 1}
              onChange={(e) => handlePropChange(schema.name, Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{value}</span>
          </div>
        );

      default:
        return null;
    }
  };

  const isInline = placement === 'inline';
  const isLeft = placement === 'left';
  return (
    <div
      style={{
        ...(isInline
          ? {
              width: '100%',
              maxWidth: '720px',
              maxHeight: '70vh',
              minHeight: '280px',
              marginBottom: '16px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }
          : {
              position: 'absolute',
              top: 0,
              ...(isLeft ? { left: 0 } : { right: 0 }),
              width: `${panelWidth}px`,
              height: '100%',
              background: '#FFFFFF',
              zIndex: 20,
              ...(isLeft
                ? { borderRight: '1px solid #E5E7EB', boxShadow: '4px 0 16px rgba(0,0,0,0.08)' }
                : { borderLeft: '1px solid #E5E7EB', boxShadow: '-4px 0 16px rgba(0,0,0,0.08)' }),
              display: 'flex',
              flexDirection: 'column',
            }),
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#F9FAFB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{component.componentDef.icon}</span>
          <strong style={{ fontSize: '14px' }}>{component.componentDef.name}</strong>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6B7280',
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          background: '#F9FAFB',
        }}
      >
        <div
          style={{
            transform: 'scale(0.75)',
            transformOrigin: 'top center',
            maxHeight: '120px',
            overflow: 'hidden',
          }}
          dangerouslySetInnerHTML={{
            __html: component.componentDef.render(localProps),
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px',
          }}
        >
          Properties
        </div>

        {component.componentDef.props.map((propSchema) => (
          <div key={propSchema.name} style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '4px',
              }}
            >
              {propSchema.label}
            </label>
            {renderPropEditor(propSchema)}
          </div>
        ))}
      </div>

      {userRole === 'admin' && (
        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid #E5E7EB',
            background: '#F9FAFB',
          }}
        >
          <details>
            <summary style={{ fontSize: '11px', color: '#9CA3AF', cursor: 'pointer' }}>
              View Generated HTML
            </summary>
            <pre
              style={{
                fontSize: '10px',
                background: '#1F2937',
                color: '#10B981',
                padding: '8px',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '150px',
                marginTop: '4px',
              }}
            >
              {component.componentDef.render(localProps)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
