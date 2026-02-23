import { useState, useCallback } from 'react';
import { message } from 'antd';
import { createAPI } from '@/api';
import { BaseTemplate, Category, CreateCategoryInput, UpdateCategoryInput } from '../types';
import { useBaseTemplateStore, useCategoryStore } from '../stores';
import { useGenericStore } from '@/stores/generic.store';
import { useLoadingStore } from '@/stores/common/loading.store';

export const useBaseTemplateActions = () => {
  const apiClient = useGenericStore((s) => s.apiClient);
  const { actions: loadingActions } = useLoadingStore();
  const [loading, setLoading] = useState(false);
  const { actions: templateActions } = useBaseTemplateStore();
  const { actions: categoryActions } = useCategoryStore();

  const loadCategories = async () => {
    setLoading(true);
    try {
      if (!apiClient) {
        categoryActions.setCategories([]);
        message.error('API client is required to load base template categories');
        return;
      }

      const api = createAPI(apiClient);
      const response = await api.baseTemplateCategories.getCategories({
        limit: 200,
        page: 1,
        sortColumn: 'display_order',
        sortDirection: 'ascend',
      });
      categoryActions.setCategories(response.results || []);
    } catch (error) {
      console.error('Load categories error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryById = async (id: number): Promise<Category | null> => {
    setLoading(true);
    try {
      if (!apiClient) {
        message.error('API client is required to load base template category');
        return null;
      }

      const api = createAPI(apiClient);
      const category = await api.baseTemplateCategories.getCategoryById(id);
      return category;
    } catch (error) {
      console.error('Get category by id error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: number) => {
    setLoading(true);
    try {
      if (!apiClient) {
        message.error('API client is required to delete base template category');
        return;
      }

      const api = createAPI(apiClient);
      await api.baseTemplateCategories.deleteCategory(id);
      message.success('Category deleted successfully');
      await loadCategories();
    } catch (error: any) {
      console.error('Delete category error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = useCallback(async (filters?: {
    categoryId?: number | null;
    status?: string | null;
    nameSearch?: string | null;
  }) => {
    setLoading(true);
    try {
      if (!apiClient) {
        templateActions.setTemplates([]);
        message.error('API client is required to load base templates');
        return;
      }

      const api = createAPI(apiClient);
      const response = await api.templates.getBaseTemplates({
        limit: 200,
        page: 1,
        sortColumn: 'bt.display_order',
        sortDirection: 'ascend',
        categoryId: filters?.categoryId || undefined,
        status: filters?.status || undefined,
        search: filters?.nameSearch || undefined,
      });

      // Transform base template response to BaseTemplate type
      const templates: BaseTemplate[] = (response.results || []).map((item: any) => ({
        id: item.id,
        name: item.template_name,
        description: item.template_description || null,
        category_id: item.category_id || null,
        category: item.category_id
          ? {
              id: item.category_id,
              name: item.category_name,
              description: null,
              display_order: 0,
            }
          : undefined,
        thumbnail_url: item.thumbnail_url || null,
        builder_state_json: item.builder_state_json || {},
        is_featured: item.is_featured || false,
        display_order: item.display_order || 0,
        status: item.status || 'active',
        created_at: item.created_at,
        updated_at: item.updated_at || item.created_at,
        template_id: item.template_id,
      }));

      templateActions.setTemplates(templates);
    } catch (error) {
      console.error('Load templates error:', error);
    } finally {
      setLoading(false);
    }
  }, [apiClient, templateActions]);

  const createCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    setLoading(true);
    try {
      if (!apiClient) {
        message.error('API client is required to create/update base template category');
        return;
      }

      const api = createAPI(apiClient);
      if ('id' in data) {
        await api.baseTemplateCategories.updateCategory(data.id, data);
        message.success('Category updated successfully');
      } else {
        await api.baseTemplateCategories.createCategory(data);
        message.success('Category created successfully');
      }

      await loadCategories();
    } catch (error: any) {
      console.error('Create category error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (template: BaseTemplate) => {
    setLoading(true);
    try {
      if (!apiClient) {
        message.error('API client is required to delete base template');
        return;
      }

      const api = createAPI(apiClient);
      await api.templates.deleteBaseTemplate(template.id);
      message.success('Template deleted successfully');
      await loadTemplates();
    } catch (error: any) {
      console.error('Delete template error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const editTemplate = (template: BaseTemplate, navigate?: (path: string) => void) => {
    if (navigate) {
      navigate(`/popup-builder/base-templates/${template.template_id}/edit`);
    } else {
      message.info(`Edit template: ${template.name}`);
    }
  };

  const previewTemplate = (template: BaseTemplate) => {
    message.info(`Preview template: ${template.name}`);
  };

  const saveTemplate = async (data: {
    name: string;
    description?: string;
    category_id?: number;
    design_json: any;
  }) => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      message.success('Base template created successfully!');
      
      await loadTemplates();
      return true;
    } catch (error) {
      console.error('Save template error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTemplateStatus = async (template: BaseTemplate, status: 'archive' | 'active' | 'deleted') => {
    loadingActions.setBaseTemplateStatusUpdate(true);
    try {
      if (!apiClient) {
        message.error('API client is required to update base template status');
        return;
      }

      const api = createAPI(apiClient);
      await api.templates.updateBaseTemplateStatus(template.template_id, status);
      message.success(`Template status updated to ${status} successfully`);
      await loadTemplates();
    } catch (error: any) {
      console.error('Update template status error:', error);
      throw error;
    } finally {
      loadingActions.setBaseTemplateStatusUpdate(false);
    }
  };

  return {
    loading,
    loadCategories,
    loadTemplates,
    createCategory,
    getCategoryById,
    deleteCategory,
    deleteTemplate,
    updateTemplateStatus,
    editTemplate,
    previewTemplate,
    saveTemplate,
  };
};
