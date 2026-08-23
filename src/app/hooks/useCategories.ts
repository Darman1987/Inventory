import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { defaultCategories } from '../lib/demo-data';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface CategoryRow {
  id: string;
  name: string;
}

export function useCategories() {
  const { currentOrg, canManageOrganization } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const useDemoMode = !isSupabaseConfigured || !supabase;

  const getStorageKey = () => {
    return currentOrg ? `categories_${currentOrg.id}` : 'categories';
  };

  const loadSupabaseCategories = async () => {
    if (!supabase || !currentOrg) return;

    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .eq('organization_id', currentOrg.id)
      .order('name', { ascending: true });

    if (error) {
      setCategories([]);
      setCategoryRows([]);
      return;
    }

    if (data && data.length > 0) {
      setCategoryRows(data);
      setCategories(data.map((row) => row.name));
      return;
    }

    const seedResult = await supabase
      .from('categories')
      .insert(defaultCategories.map((name) => ({ organization_id: currentOrg.id, name })))
      .select('id, name');

    if (seedResult.data) {
      setCategoryRows(seedResult.data);
      setCategories(seedResult.data.map((row) => row.name));
    }
  };

  useEffect(() => {
    if (!currentOrg) {
      setCategories([]);
      setCategoryRows([]);
      setIsLoading(false);
      return;
    }

    const loadCategories = async () => {
      setIsLoading(true);

      if (useDemoMode) {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setCategories(parsed);
          setCategoryRows(parsed.map((name) => ({ id: name, name })));
        } else {
          setCategories(defaultCategories);
          setCategoryRows(defaultCategories.map((name) => ({ id: name, name })));
          localStorage.setItem(getStorageKey(), JSON.stringify(defaultCategories));
        }

        setIsLoading(false);
        return;
      }

      await loadSupabaseCategories();
      setIsLoading(false);
    };

    void loadCategories();
  }, [currentOrg?.id, useDemoMode]);

  const persistCategories = (newCategories: string[]) => {
    localStorage.setItem(getStorageKey(), JSON.stringify(newCategories));
    setCategories(newCategories);
    setCategoryRows(newCategories.map((name) => ({ id: name, name })));
  };

  const addCategory = async (category: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory || !currentOrg || !canManageOrganization(currentOrg.id)) return false;
    if (categories.includes(trimmedCategory)) return false;

    if (useDemoMode || !supabase) {
      persistCategories([...categories, trimmedCategory]);
      return true;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: currentOrg.id,
        name: trimmedCategory,
      })
      .select('id, name')
      .single();

    if (error || !data) {
      return false;
    }

    setCategoryRows((currentRows) => [...currentRows, data].sort((a, b) => a.name.localeCompare(b.name)));
    setCategories((currentCategories) => [...currentCategories, data.name].sort((a, b) => a.localeCompare(b)));
    return true;
  };

  const updateCategory = async (oldCategory: string, newCategory: string) => {
    const trimmedNewCategory = newCategory.trim();
    if (!trimmedNewCategory || !currentOrg || !canManageOrganization(currentOrg.id)) return false;
    if (categories.includes(trimmedNewCategory) && oldCategory !== trimmedNewCategory) return false;

    if (useDemoMode || !supabase) {
      persistCategories(categories.map((entry) => (entry === oldCategory ? trimmedNewCategory : entry)));
      return true;
    }

    const existingRow = categoryRows.find((row) => row.name === oldCategory);
    if (!existingRow) {
      return false;
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ name: trimmedNewCategory })
      .eq('id', existingRow.id)
      .select('id, name')
      .single();

    if (error || !data) {
      return false;
    }

    setCategoryRows((currentRows) =>
      currentRows
        .map((row) => (row.id === data.id ? data : row))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setCategories((currentCategories) =>
      currentCategories
        .map((entry) => (entry === oldCategory ? trimmedNewCategory : entry))
        .sort((a, b) => a.localeCompare(b)),
    );
    return true;
  };

  const deleteCategory = async (category: string) => {
    if (!currentOrg || !canManageOrganization(currentOrg.id)) return false;

    if (useDemoMode || !supabase) {
      persistCategories(categories.filter((entry) => entry !== category));
      return true;
    }

    const existingRow = categoryRows.find((row) => row.name === category);
    if (!existingRow) return false;

    const { error } = await supabase.from('categories').delete().eq('id', existingRow.id);
    if (!error) {
      setCategoryRows((currentRows) => currentRows.filter((row) => row.id !== existingRow.id));
      setCategories((currentCategories) => currentCategories.filter((entry) => entry !== category));
      return true;
    }

    return false;
  };

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
