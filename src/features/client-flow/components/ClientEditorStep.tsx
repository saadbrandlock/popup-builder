import React, { useEffect, useState, useRef, useCallback } from 'react';
import { message, Alert, Button, Card, Row, Col, Space, Typography, Badge, Spin, Popover, Modal } from 'antd';
import { ArrowRightOutlined, SaveOutlined, InfoCircleOutlined, LogoutOutlined } from '@ant-design/icons';
import EmailEditor, { UnlayerOptions } from 'react-email-editor';
import { useBuilderStore } from '@/stores/builder.store';
import { useGenericStore } from '@/stores/generic.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { useUnlayerEditor } from '../../builder/hooks/useUnlayerEditor';
import { useUnlayerDeviceOptions } from '../../builder/hooks/useUnlayerDeviceOptions';
import { manageEditorMode, manageMergeTags } from '../../builder/utils';
import { selectFirstBlockWhenReady, hidePopupTabInEditor } from '../../builder/utils/unlayerDefaultSelection';
import { getAllComponents, getComponent } from '@/custom-components';
import { detectCustomComponent, findAllCustomComponentsInDesign, type DetectedComponent } from '@/custom-components/utils/detection';
import { updateComponentInDesign } from '@/custom-components/utils/designUpdater';
import { ActiveComponentsList } from '@/custom-components/components/ActiveComponentsList';

const { Title, Text } = Typography;

const EDIT_INFO_POINTS = [
  'Click on template items below to edit their properties (text, images, colors, etc.) in the left panel.',
  'You don\'t have to continue to the next step if you\'re done with your design.',
];

const editInfoPopoverContent = (
  <div style={{ maxWidth: 320 }}>
    <Text strong style={{ display: 'block', marginBottom: 8 }}>Editing tips</Text>
    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
      {EDIT_INFO_POINTS.map((point, i) => (
        <li key={i} style={{ marginBottom: 4 }}>
          <Text type="secondary">{point}</Text>
        </li>
      ))}
    </ul>
  </div>
);

export interface ClientEditorStepProps {
  unlayerConfig: UnlayerOptions;
  templateId: string;
  onNext: () => void;
  onExit?: () => void;
}

/**
 * ClientEditorStep - Editor step for client flow
 * Simplified version of UnlayerMain without admin navigation (apiClient from generic store)
 */
export const ClientEditorStep: React.FC<ClientEditorStepProps> = ({
  unlayerConfig,
  templateId,
  onNext,
  onExit,
}) => {
  const { currentTemplateId, templateState } = useBuilderStore();
  const authProvider = useGenericStore((s) => s.authProvider);
  const apiClient = useGenericStore((s) => s.apiClient);
  const { builderAutosaving } = useLoadingStore();
  const { devices, defaultDevice } = useUnlayerDeviceOptions();

  const userRole = 'client' as const;
  const [selectedComponent, setSelectedComponent] = useState<DetectedComponent | null>(null);
  const [allCustomComponents, setAllCustomComponents] = useState<DetectedComponent[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const lastDesignRef = useRef<unknown>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingRef = useRef(false);

  const extendEditorReady = useCallback((unlayer: any) => {
    unlayer.registerProvider('blocks', (_params: any, done: (blocks: any[]) => void) => {
      const components = getAllComponents();
      const blocks = components.map((comp) => ({
        id: `custom-${comp.id}`,
        name: comp.name,
        category: 'Custom Components',
        tags: [comp.category, comp.name.toLowerCase()],
        data: {
          body: {
            rows: [
              {
                cells: [1],
                columns: [
                  {
                    contents: [
                      {
                        type: 'html',
                        values: {
                          html: comp.render(comp.defaultProps as Record<string, unknown>),
                          containerPadding: '10px',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      }));
      done(blocks);
    });

    unlayer.addEventListener('design:updated', (data: any) => {
      unlayer.exportHtml((exportData: any) => {
        lastDesignRef.current = exportData.design;
        const found = findAllCustomComponentsInDesign(exportData.design);
        setAllCustomComponents(found);
      });
      if (data?.type === 'content' && data?.item?.type === 'html') {
        const html = data.item.values?.html ?? '';
        const detected = detectCustomComponent(html);
        if (detected) {
          const compDef = getComponent(detected.componentId);
          if (compDef) {
            setSelectedComponent({
              componentId: detected.componentId,
              componentDef: compDef,
              currentProps: detected.props,
              htmlBlockId: data.item.id ?? '',
              rawHtml: html,
            });
          }
        }
      }
    });
  }, []);

  const {
    editorRef,
    isReady,
    isSaving,
    hasUnsavedChanges,
    error,
    saveDesign,
    lastAutoSave,
    onEditorReady,
    clearError,
  } = useUnlayerEditor({
    projectId: unlayerConfig.projectId as number,
    autoSave: true,
    autoSaveInterval: 30000,
    apiClient,
    templateId: templateId || currentTemplateId || undefined,
    accountId: authProvider?.accountId,
    enableCustomImageUpload: true,
    extendEditorReady,
  });

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const handlePropsChange = useCallback(
    (componentId: string, htmlBlockId: string, newProps: Record<string, unknown>) => {
      const comp = getComponent(componentId);
      const design = lastDesignRef.current;
      if (!comp || !design) return;

      const newHtml = comp.render(newProps);
      const updatedDesign = updateComponentInDesign(design, htmlBlockId, newHtml);

      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;
        const unlayer = editorRef.current?.editor;
        if (unlayer) {
          setIsReloading(true);
          unlayer.loadDesign(updatedDesign as any);
          lastDesignRef.current = updatedDesign;
          setTimeout(() => {
            isUpdatingRef.current = false;
            setIsReloading(false);
          }, 600);
        }
      }, 800);
    },
    [editorRef]
  );

  // Sync custom components list and lastDesignRef when editor is ready
  useEffect(() => {
    if (!isReady || !editorRef.current?.editor || !templateState) return;
    const unlayer = editorRef.current.editor;
    unlayer.exportHtml((data: any) => {
      lastDesignRef.current = data.design;
      const found = findAllCustomComponentsInDesign(data.design);
      setAllCustomComponents(found);
    });
  }, [isReady, templateState]);

  // Remove Unlayer branding
  useEffect(() => {
    const removebranding = () => {
      const branding = document.querySelector('a.blockbuilder-branding');
      if (branding) {
        branding.remove();
      }
    };

    if (isReady) {
      setTimeout(removebranding, 1000);
      const interval = setInterval(removebranding, 5000);
      return () => clearInterval(interval);
    }
  }, [isReady]);

  const handleManualSave = async () => {
    try {
      await saveDesign();
      message.success('Design saved successfully!');
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  const handleExitClick = () => {
    Modal.confirm({
      title: 'Exit editor?',
      content: 'Have you saved your changes? If you are done with your design, you can exit and return to the review step.',
      okText: 'Yes, exit',
      cancelText: 'Stay',
      onOk: () => onExit?.(),
    });
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Controls */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12}>
            <Title level={4} style={{ margin: 0 }}>
              Edit Popup Design
              {hasUnsavedChanges && (
                <Badge
                  dot
                  style={{ marginLeft: '8px' }}
                  title="Unsaved changes"
                />
              )}
            </Title>
            <div>
              <Text type="secondary">
                Status: {isReady ? 'Ready' : 'Loading...'}
              </Text>
              {lastAutoSave && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Last saved: {lastAutoSave.toLocaleTimeString()}
                </Text>
              )}
            </div>
          </Col>

          <Col xs={24} md={12} className='text-right'>
            <Space>
              <Popover
                content={editInfoPopoverContent}
                title={null}
                trigger="hover"
                placement="bottomRight"
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Button type='text' aria-label="Editing tips" icon={<InfoCircleOutlined className='text-blue-500' />} />
              </Popover>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleManualSave}
                loading={isSaving || builderAutosaving}
                disabled={!isReady || !hasUnsavedChanges}
              >
                {isSaving || builderAutosaving ? 'Saving...' : 'Save'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert
          message="Autosave failed — will retry"
          description={error}
          type="error"
          closable
          onClose={clearError}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Custom Components Panel — above the editor, full width */}
      {allCustomComponents.length > 0 && (
        <ActiveComponentsList
          components={allCustomComponents}
          selectedComponent={selectedComponent}
          onSelect={setSelectedComponent}
          onPropsChange={handlePropsChange}
          userRole={userRole}
        />
      )}

      {/* Editor Container */}
      <div className="relative">
        <Card>
          <div
            style={{
              height: '700px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {!templateState ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spin size="large" tip="Loading editor..." />
              </div>
            ) : (
              <EmailEditor
                key={`bl-client-editor-${templateId ?? ''}-${devices.join('-')}-${defaultDevice}`}
                editorId="bl-client-editor"
                ref={editorRef}
                onReady={(unlayer) => {
                  onEditorReady(unlayer);
                  selectFirstBlockWhenReady(unlayer, 'bl-client-editor');
                  hidePopupTabInEditor('bl-client-editor');
                }}
                options={{
                  ...unlayerConfig,
                  appearance: {
                    ...unlayerConfig.appearance,
                    panels: {
                      ...unlayerConfig.appearance?.panels,
                      tools: {
                        ...unlayerConfig.appearance?.panels?.tools,
                        dock: 'left',
                      },
                    },
                  },
                  tools: { ...manageEditorMode(true), html: { enabled: false } },
                  mergeTags: manageMergeTags(),
                  devices,
                  defaultDevice,
                  tabs: {
                    content: { enabled: false },
                    blocks: { enabled: false },
                    popup: { enabled: false },
                    Popup: { enabled: false },
                    dev: { enabled: false },
                  },
                  features: {
                    ...unlayerConfig.features,
                    textEditor: { triggerChangeWhileEditing: true, debounce: 300 } as Record<string, unknown>,
                    audit: false,
                  },
                  customCSS: [
                    `.blockbuilder-content-tool-html .blockbuilder-options-content { display: none !important; }`,
                    `.blockbuilder-content-tool-html .blockbuilder-options::after { content: 'Use the properties panel to edit this component →'; display: block; padding: 20px; text-align: center; color: #9CA3AF; font-size: 13px; }`,
                  ],
                }}
                style={{
                  height: '700px',
                  width: '100%',
                }}
              />
            )}
          </div>
        </Card>

        {isReloading && (
          <div className="absolute inset-0 bg-white/70 z-[5] flex items-center justify-center">
            <span className="text-sm text-gray-500">Updating preview...</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-end gap-2 mt-6">
        {onExit && (
          <Button
            size="large"
            icon={<LogoutOutlined />}
            onClick={handleExitClick}
          >
            Exit
          </Button>
        )}
        <Button
          type="primary"
          size="large"
          icon={<ArrowRightOutlined />}
          onClick={onNext}
        >
          Next: Reminder Tab
        </Button>
      </div>
    </div>
  );
};

export default ClientEditorStep;
