import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { normalizeSearchQuery } from "../utils/inputSanitizers";

const SearchPage = () => {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const query = normalizeSearchQuery(params.get("q") || "");

  if (!query) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/?q=${encodeURIComponent(query)}`} replace />;
};

export default SearchPage;
