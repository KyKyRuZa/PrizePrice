import React from "react";
import { AuthProvider } from "./AuthContext";
import { NotificationsProvider } from "./NotificationsContext";
import { PriceWatchProvider } from "./PriceWatchContext";
import { FavoritesProvider } from "./FavoritesContext";
import { SearchHistoryProvider } from "./SearchHistoryContext";
import { BrowsingHistoryProvider } from "./BrowsingHistoryContext";
import { CartProvider } from "./CartContext";

export const AppProviders = ({ children }) => (
  <AuthProvider>
    <NotificationsProvider>
      <PriceWatchProvider>
        <FavoritesProvider>
          <SearchHistoryProvider>
            <BrowsingHistoryProvider>
              <CartProvider>{children}</CartProvider>
            </BrowsingHistoryProvider>
          </SearchHistoryProvider>
        </FavoritesProvider>
      </PriceWatchProvider>
    </NotificationsProvider>
  </AuthProvider>
);

export default AppProviders;
