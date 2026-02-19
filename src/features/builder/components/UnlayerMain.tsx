import { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Space, Typography, Card, Row, Col, Alert, Badge, Tooltip } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import EmailEditor, { UnlayerOptions } from 'react-email-editor';
import { useUnlayerEditor } from '../hooks/useUnlayerEditor';
import { useUnlayerDeviceOptions } from '../hooks/useUnlayerDeviceOptions';
import { useBuilderStore } from '@/stores/builder.store';
import { useGenericStore } from '@/stores/generic.store';
import { useLoadingStore } from '@/stores/common/loading.store';
import { manageEditorMode, manageMergeTags } from '../utils';
import StepNavigation, { createPreviousButton, createNextButton } from './common/StepNavigation';
import { getAllComponents, getComponent } from '@/custom-components';
import { detectCustomComponent, findAllCustomComponentsInDesign, type DetectedComponent } from '@/custom-components/utils/detection';
import { updateComponentInDesign, injectComponentRow } from '@/custom-components/utils/designUpdater';
import { ActiveComponentsList } from '@/custom-components/components/ActiveComponentsList';
import { ComponentGallery } from '@/custom-components/components/ComponentGallery';
import { useClientFlowStore } from '@/stores/clientFlowStore';

const { Title, Text } = Typography;

interface UnlayerMainProps {
  unlayerConfig: UnlayerOptions;
  initialDesign?: any;
  onSave?: (design: any) => Promise<void>;
  onError?: (error: Error) => void;
  enableCustomImageUpload?: boolean;
  clientTemplateId?: string;
  saveMode?: 'staging' | 'base';
}

export const UnlayerMain = ({
  unlayerConfig,
  initialDesign,
  onSave,
  onError,
  enableCustomImageUpload = true,
  clientTemplateId = '',
  saveMode = 'staging',
}: UnlayerMainProps) => {
  const [autoSaveInterval] = useState(30);
  const [designMode, setDesignMode] = useState(false);
  const [showStepsNavigation, setShowStepsNavigation] = useState(true);

  const userRole = 'admin' as const;
  const [selectedComponent, setSelectedComponent] = useState<DetectedComponent | null>(null);
  const [allCustomComponents, setAllCustomComponents] = useState<DetectedComponent[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const lastDesignRef = useRef<unknown>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingRef = useRef(false);

  const {
    currentTemplateId,
    actions: builderActions,
  } = useBuilderStore();
  const authProvider = useGenericStore((s) => s.authProvider);
  const apiClient = useGenericStore((s) => s.apiClient);

  const { builderAutosaving } = useLoadingStore();
  const { devices, defaultDevice } = useUnlayerDeviceOptions();
  const componentsPanelOpen = useClientFlowStore((s) => s.componentsPanelOpen);
  const setComponentsPanelOpen = useClientFlowStore((s) => s.actions.setComponentsPanelOpen);

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

    const syncComponentsList = () => {
      unlayer.exportHtml((exportData: any) => {
        lastDesignRef.current = exportData.design;
        const found = findAllCustomComponentsInDesign(exportData.design);
        setAllCustomComponents(found);
      });
    };

    unlayer.addEventListener('design:updated', (data: any) => {
      syncComponentsList();
      setTimeout(syncComponentsList, 350);
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
    lastExportedHtml,
    lastExportedJson,
    saveDesign,
    loadDesign,
    lastAutoSave,
    onEditorReady,
    clearError,
  } = useUnlayerEditor({
    projectId: unlayerConfig.projectId as number,
    autoSave: true,
    autoSaveInterval: autoSaveInterval * 1000,
    onSave,
    onError,
    apiClient,
    templateId: clientTemplateId || currentTemplateId || undefined,
    accountId: authProvider.accountId,
    enableCustomImageUpload,
    saveMode,
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
          setAllCustomComponents(findAllCustomComponentsInDesign(updatedDesign));
          setTimeout(() => {
            isUpdatingRef.current = false;
            setIsReloading(false);
          }, 600);
        }
      }, 800);
    },
    [editorRef]
  );

  const injectComponentById = useCallback(
    (componentId: string) => {
      const unlayer = editorRef.current?.editor;
      if (!unlayer) return;
      unlayer.exportHtml((data: any) => {
        const updatedDesign = injectComponentRow(data.design, componentId);
        unlayer.loadDesign(updatedDesign as any);
        lastDesignRef.current = updatedDesign;
        setAllCustomComponents(findAllCustomComponentsInDesign(updatedDesign));
      });
    },
    [editorRef]
  );

  useEffect(() => {
    if (initialDesign && isReady) {
      loadDesign(initialDesign);
    }
  }, [initialDesign, isReady, loadDesign]);

  useEffect(() => {
    if (!isReady || !editorRef.current?.editor) return;
    const unlayer = editorRef.current.editor;
    unlayer.exportHtml((data: any) => {
      lastDesignRef.current = data.design;
      const found = findAllCustomComponentsInDesign(data.design);
      setAllCustomComponents(found);
    });
  }, [isReady]);

  useEffect(() => {
    setDesignMode(window.location.href.includes('user-template-editor'));
    setShowStepsNavigation(!window.location.href.includes('base-templates'));
  }, []);

  const handleManualSave = async () => {
    try {
      await saveDesign();
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header Controls */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col xs={24} sm={12}>
            <Title level={4} style={{ margin: 0 }}>
              Popup Builder
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
          <Col xs={24} sm={12} className='text-right'>
            <Space>
              {userRole === 'admin' && (
                <Button
                  icon={<span style={{ fontSize: '14px' }}>🧩</span>}
                  onClick={() => setGalleryOpen(!galleryOpen)}
                  style={{ fontWeight: 600 }}
                >
                  Components
                </Button>
              )}
              <Button
                type="primary"
                onClick={handleManualSave}
                loading={isSaving || builderAutosaving}
                disabled={!isReady || !hasUnsavedChanges}
              >
                {isSaving || builderAutosaving ? 'Saving...' : 'Save Design'}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Custom Components Gallery drawer (trigger is in header; no floating button) */}
      {userRole === 'admin' && (
        <ComponentGallery
          isOpen={galleryOpen}
          onToggle={() => setGalleryOpen(!galleryOpen)}
          onUseComponent={injectComponentById}
          renderTriggerButton={false}
        />
      )}

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

      {/* ── Animated split layout: components panel + editor ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>

        {/* Components Panel — animates between expanded (272px) and collapsed (44px) */}
        {allCustomComponents.length > 0 && (
          <div
            style={{
              width: componentsPanelOpen ? 272 : 44,
              flexShrink: 0,
              transition: 'width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Expanded panel */}
            <div
              style={{
                opacity: componentsPanelOpen ? 1 : 0,
                transition: 'opacity 0.18s ease',
                pointerEvents: componentsPanelOpen ? 'auto' : 'none',
                width: 272,
              }}
            >
              <ActiveComponentsList
                components={allCustomComponents}
                selectedComponent={selectedComponent}
                onSelect={setSelectedComponent}
                onPropsChange={handlePropsChange}
                onCollapse={() => setComponentsPanelOpen(false)}
                userRole={userRole}
              />
            </div>

            {/* Collapsed strip — fades in when closed */}
            <Tooltip title="Custom Components" placement="right">
              <div
                onClick={() => setComponentsPanelOpen(true)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 44,
                  height: '100%',
                  minHeight: 200,
                  opacity: componentsPanelOpen ? 0 : 1,
                  transition: 'opacity 0.2s ease 0.08s',
                  pointerEvents: componentsPanelOpen ? 'none' : 'auto',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 14,
                  gap: 10,
                  userSelect: 'none',
                }}
                className="hover:border-blue-300 hover:shadow-sm"
              >
                <span style={{ fontSize: 18 }}>🧩</span>
                <Badge
                  count={allCustomComponents.length}
                  color="geekblue"
                  size="small"
                  style={{ fontSize: 9 }}
                />
                <div
                  style={{
                    writingMode: 'vertical-lr',
                    transform: 'rotate(180deg)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#8c8c8c',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  Components
                </div>
                <RightOutlined style={{ fontSize: 10, color: '#bbb', marginTop: 'auto', marginBottom: 12 }} />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Editor — takes all remaining space */}
        <div className="relative flex-1 min-w-0">
          <Card>
            <div
              style={{
                height: '700px',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <EmailEditor
                editorId="bl-popup-builder"
                ref={editorRef}
                onReady={onEditorReady}
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
                  tools: manageEditorMode(designMode),
                  mergeTags: manageMergeTags(),
                  devices,
                  defaultDevice,
                  features: {
                    ...unlayerConfig.features,
                    textEditor: { triggerChangeWhileEditing: true, debounce: 300 } as Record<string, unknown>,
                    ...(designMode && { audit: false }),
                  },
                  ...(designMode && {
                    tabs: {
                      content: { enabled: false },
                      blocks: { enabled: false },
                      popup: { enabled: false },
                      Popup: { enabled: false },
                      dev: { enabled: false },
                    },
                  }),
                }}
                style={{
                  height: '700px',
                  width: '100%',
                }}
              />
            </div>
          </Card>

          {isReloading && (
            <div className="absolute inset-0 bg-white/70 z-[5] flex items-center justify-center">
              <span className="text-sm text-gray-500">Updating preview...</span>
            </div>
          )}
        </div>
      </div>

      {/* Export Results Display (for debugging) */}
      {(lastExportedHtml || lastExportedJson) && (
        <Card style={{ marginTop: '16px' }}>
          <Title level={5}>Last Export Results</Title>
          {lastExportedHtml && (
            <div style={{ marginBottom: '8px' }}>
              <Text strong>HTML Length:</Text> {lastExportedHtml.length}{' '}
              characters
            </div>
          )}
          {lastExportedJson && (
            <div>
              <Text strong>JSON Keys:</Text>{' '}
              {Object.keys(lastExportedJson).join(', ')}
            </div>
          )}
        </Card>
      )}

      {/* Navigation Buttons */}
   {
    showStepsNavigation && (
      <StepNavigation
      style={{ marginTop: '24px' }}
      leftButtons={[
        createPreviousButton(
          () => builderActions.setAdminBuilderStep(0),
          'Previous: Config'
        ),
      ]}
      rightButtons={[
        createNextButton(
          () => builderActions.setAdminBuilderStep(2),
          { label: 'Next: Reminder Tab' }
        ),
      ]}
    />
    )
   }
    </div>
  );
};
