/**
 * expenses.js
 * Pure business-logic utilities for expenses.
 * No React, no UI — safe to use anywhere.
 */
import { getCategoryById } from './categories';
import { friendlyDate } from './formatters';

export { formatAmount, friendlyDate, expenseDateLabel } from './formatters';

/** Filter expenses by period, type, and optionally currency */
export function applyFilters(expenses, period, typeFilter, currencyFilter = 'all', locationFilter = 'Todos') {
  const now = new Date();
  return expenses.filter(e => {
    const d = new Date(e.date);
    let okPeriod = true;

    if (period && typeof period === 'object') {
      if (period.type === 'month') {
        okPeriod = d.getMonth() === period.month && d.getFullYear() === period.year;
      } else if (period.type === 'year') {
        okPeriod = d.getFullYear() === period.year;
      } else if (period.type === 'custom') {
        const from = new Date(period.from); from.setHours(0, 0, 0, 0);
        const to   = new Date(period.to);   to.setHours(23, 59, 59, 999);
        okPeriod = d >= from && d <= to;
      }
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      const dow = now.getDay();
      const daysSinceMonday = dow === 0 ? 6 : dow - 1;
      startOfWeek.setDate(now.getDate() - daysSinceMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      okPeriod = d >= startOfWeek;
    } else if (period === 'month') {
      okPeriod = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (period === 'year') {
      okPeriod = d.getFullYear() === now.getFullYear();
    }

    const okType     = typeFilter     === 'all' || e.type     === typeFilter;
    const okCurrency = currencyFilter === 'all' || e.currency === currencyFilter;
    const okLocation = locationFilter === 'Todos' || (e.location?.trim() || 'Sin especificar') === locationFilter;
    
    return okPeriod && okType && okCurrency && okLocation;
  });
}

/**
 * Aggregate expenses into ONE entry per category (sum amounts).
 * Subcategories are grouped under their parent general category.
 * Color always comes from the CATEGORIES definition — never from the stored DB field.
 */
export function groupByCategory(expenses, userCategories = []) {
  const map = {};
  expenses.forEach(e => {
    // Resolve the "bucket" category ID — subcategories roll up to their parent
    let bucketId = e.category;
    const sub = userCategories.find(s => s.id === e.category);
    if (sub) bucketId = sub.parent_id ?? sub.id;

    // Get label/color — user override takes precedence over static definition
    const catDef     = getCategoryById(bucketId);
    const override   = userCategories.find(c => c.parent_id === '__override__' && c.name === bucketId);
    const customCat  = !catDef ? userCategories.find(c => c.id === bucketId) : null;
    const catColor   = override?.color ?? catDef?.color ?? customCat?.color ?? '#8e8e93';
    const catBg      = override?.color ?? catDef?.bg    ?? customCat?.color ?? '#E0E0E0';
    const catLabel   = catDef?.label ?? customCat?.name  ?? bucketId;

    if (!map[bucketId]) {
      map[bucketId] = {
        id:         bucketId,
        category:   bucketId,
        label:      catLabel,
        amount:     0,
        color:      catColor,
        bg:         catBg,
        currency:   e.currency ?? 'MXN',
        latestDate: e.date,
      };
    }
    map[bucketId].amount += e.amount;
    if (new Date(e.date) >= new Date(map[bucketId].latestDate)) {
      map[bucketId].latestDate = e.date;
    }
  });
  return Object.values(map);
}

/**
 * Given a parent category ID, returns only the expenses that belong to it
 * directly OR through one of its subcategories.
 */
export function filterByDrillCategory(expenses, parentCategoryId, userCategories = []) {
  const subcatIds = userCategories
    .filter(s => s.parent_id === parentCategoryId)
    .map(s => s.id);

  return expenses.filter(e =>
    e.category === parentCategoryId || subcatIds.includes(e.category)
  );
}

/**
 * Aggregate expenses keeping each subcategory as its own bar (drill-down mode).
 * Color comes from the parent CATEGORIES definition.
 */
export function groupBySubcategory(expenses, userCategories = []) {
  const map = {};

  expenses.forEach(e => {
    const key        = e.category;
    const sub        = userCategories.find(s => s.id === key);
    const parentId   = sub ? (sub.parent_id ?? sub.id) : key;
    const catDef     = getCategoryById(parentId);
    const override   = userCategories.find(c => c.parent_id === '__override__' && c.name === parentId);
    const customCat  = !catDef ? userCategories.find(c => c.id === parentId) : null;
    const label      = sub ? sub.name : (catDef?.label ?? customCat?.name ?? key);
    const color      = override?.color ?? catDef?.color ?? customCat?.color ?? '#8e8e93';
    const bg         = override?.color ?? catDef?.bg    ?? customCat?.color ?? '#E0E0E0';

    if (!map[key]) {
      map[key] = {
        id:         key,
        category:   key,
        amount:     0,
        color,
        bg,
        label,
        currency:   e.currency ?? 'MXN',
        latestDate: e.date,
      };
    }
    map[key].amount += e.amount;
    if (new Date(e.date) >= new Date(map[key].latestDate)) {
      map[key].latestDate = e.date;
    }
  });

  return Object.values(map);
}

/** Returns the accountId and location of the most recent expense for a given category.
 *  Assumes expenses is sorted by date descending. */
export function getLastByCategory(expenses, categoryId) {
  if (!categoryId) return { accountId: null, location: null };
  const match = expenses.find(e => e.category === categoryId && e.type !== 'ingreso');
  return {
    accountId: match?.accountId ?? null,
    location:  match?.location  ?? null,
  };
}

/** Group sorted expenses by friendly date key */
export function groupExpensesByDate(expenses) {
  const map = {};
  [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(e => {
      const key = friendlyDate(e.date);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
  return map;
}

/** Sum the amounts of an expense array.
 *  When a shared expense is marked as paid, the effective cost
 *  is amount − sharedOwes (the other person reimbursed their part). */
export function sumExpenses(expenses) {
  return expenses.reduce((s, e) => {
    const effective = (e.sharedPaid && e.sharedOwes > 0)
      ? e.amount - e.sharedOwes
      : e.amount;
    return s + effective;
  }, 0);
}

/** Match a single expense against a search tag (category, subcategory, description, or date) */
function matchesTag(exp, tag, userCategories) {
  if (tag.type === 'category') {
    if (exp.category === tag.id) return true;
    const sub = userCategories.find(s => s.id === exp.category);
    return sub?.parent_id === tag.id;
  }
  if (tag.type === 'subcategory') return exp.category === tag.id;
  if (tag.type === 'description') return exp.description?.toLowerCase().includes(tag.id.toLowerCase());
  if (tag.type === 'date') {
    const d = new Date(exp.date);
    const [y, m, day] = tag.id.split('-').map(Number);
    return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === day;
  }
  return true;
}

/** Filter an array of expenses by search tags (supports date range when 2 date tags are given) */
export function applySearchTags(expenses, searchTags = [], userCategories = []) {
  if (!searchTags.length) return expenses;
  const dateTags  = searchTags.filter(t => t.type === 'date');
  const otherTags = searchTags.filter(t => t.type !== 'date');
  const dateRange = dateTags.length === 2 ? [...dateTags].map(t => t.id).sort() : null;
  return expenses.filter(exp => {
    if (otherTags.length && !otherTags.every(tag => matchesTag(exp, tag, userCategories))) return false;
    if (!dateTags.length) return true;
    if (dateRange) {
      const d = exp.date?.slice(0, 10) ?? '';
      return d >= dateRange[0] && d <= dateRange[1];
    }
    return matchesTag(exp, dateTags[0], userCategories);
  });
}
