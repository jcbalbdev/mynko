/**
 * useUserCategories.js
 * Manages custom subcategories per user stored in Supabase.
 * Subcategories inherit the color of their parent general category.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase }        from '../lib/supabase';
import { getCategoryById } from '../utils/categories';

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

    const parent = getCategoryById(parentId);
    const newCat = {
      user_id:   userId,
      name:      name.trim(),
      parent_id: parentId,
      color:     parent.color,
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

  return { userCategories, loading, createSubcategory, deleteSubcategory };
}
