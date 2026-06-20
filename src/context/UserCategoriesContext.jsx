/**
 * UserCategoriesContext.jsx
 * Provides userCategories globally via React Context.
 * Eliminates props-drilling of userCategories to 8+ components.
 *
 * Usage:
 *   const { userCategories } = useUserCategoriesCtx();
 */
import React, { createContext, useContext } from 'react';

const UserCategoriesContext = createContext({ userCategories: [], activeCategories: null });

export function UserCategoriesProvider({ userCategories, activeCategories = null, children }) {
  return (
    <UserCategoriesContext.Provider value={{ userCategories, activeCategories }}>
      {children}
    </UserCategoriesContext.Provider>
  );
}

export function useUserCategoriesCtx() {
  const { userCategories } = useContext(UserCategoriesContext);
  return userCategories;
}

export function useActiveCategoriesCtx() {
  const { activeCategories } = useContext(UserCategoriesContext);
  return activeCategories;
}
