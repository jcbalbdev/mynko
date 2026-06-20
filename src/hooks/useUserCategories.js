/**
 * useUserCategories.js
 * Manages custom subcategories per user stored in Supabase.
 * Subcategories inherit the color of their parent general category.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase }        from '../lib/supabase';
import { getCategoryById } from '../utils/categories';

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export function useUserCategories(userId) {
  const [userCategories, setUserCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (!error && data) setUserCategories(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  /**
   * Creates a new subcategory linked to a parent general category.
   * Color is inherited from the parent.
   */
  const createSubcategory = async (name, parentId) => {
    if (!userId || !name?.trim() || !parentId) return { error: 'Datos inválidos' };

    const parent = getCategoryById(parentId)
      ?? userCategories.find(c => c.id === parentId);
    const newCat = {
      user_id:   userId,
      name:      capitalize(name.trim()),
      parent_id: parentId,
      color:     parent?.color ?? '#8e8e93',
    };

    const { data, error } = await supabase
      .from('user_categories')
      .insert(newCat)
      .select()
      .single();

    if (!error && data) {
      setUserCategories(prev => [...prev, data]);
    }
    return { data, error };
  };

  /**
   * Creates a top-level custom category (no parent).
   * Color is user-chosen.
   */
  const createParentCategory = async (name, color) => {
    if (!userId || !name?.trim()) return { error: 'Datos inválidos' };

    const newCat = {
      user_id:   userId,
      name:      capitalize(name.trim()),
      parent_id: null,
      color,
    };

    const { data, error } = await supabase
      .from('user_categories')
      .insert(newCat)
      .select()
      .single();

    if (!error && data) {
      setUserCategories(prev => [...prev, data]);
    }
    return { data, error };
  };

  /**
   * Deletes a subcategory by ID.
   */
  const deleteSubcategory = async (id) => {
    const { error } = await supabase
      .from('user_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      setUserCategories(prev => prev.filter(c => c.id !== id));
    }
    return { error };
  };

  /**
   * Updates the color of a custom parent category.
   */
  const updateCategoryColor = async (id, color) => {
    const { error } = await supabase
      .from('user_categories')
      .update({ color })
      .eq('id', id)
      .eq('user_id', userId);

    if (!error) {
      setUserCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    }
    return { error };
  };

  /**
   * Stores or updates a color override for a system category.
   * Uses parent_id='__override__' as a sentinel value.
   */
  const upsertSystemColorOverride = async (catId, color) => {
    const existing = userCategories.find(c => c.parent_id === '__override__' && c.name === catId);
    if (existing) {
      const { error } = await supabase
        .from('user_categories')
        .update({ color })
        .eq('id', existing.id)
        .eq('user_id', userId);
      if (!error) setUserCategories(prev => prev.map(c => c.id === existing.id ? { ...c, color } : c));
      return { error };
    }
    const { data, error } = await supabase
      .from('user_categories')
      .insert({ user_id: userId, name: catId, parent_id: '__override__', color })
      .select().single();
    if (!error && data) setUserCategories(prev => [...prev, data]);
    return { data, error };
  };

  return { userCategories, loading, createSubcategory, createParentCategory, deleteSubcategory, updateCategoryColor, upsertSystemColorOverride };
}
