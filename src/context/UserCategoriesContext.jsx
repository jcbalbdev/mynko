/**
 * UserCategoriesContext.jsx
 * Provides userCategories globally via React Context.
 * Eliminates props-drilling of userCategories to 8+ components.
 *
 * Usage:
 *   const { userCategories } = useUserCategoriesCtx();
 */
import React, { createContext, useContext } from 'react';

const UserCategoriesContext = createContext([]);

export function UserCategoriesProvider({ userCategories, children }) {
  return (
    <UserCategoriesContext.Provider value={userCategories}>
      {children}
    </UserCategoriesContext.Provider>
  );
}

/** Hook to consume userCategories from context */
export function useUserCategoriesCtx() {
  return useContext(UserCategoriesContext);
}
