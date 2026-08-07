import { useState } from "react";
import { getCategoriesApi } from "../api/category";
import { useAuth } from ".";

export function useCategory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState(null);
  const { auth } = useAuth();

  const getCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategoriesApi(auth.token);
      setLoading(false);
      setCategories(response);
      return response;
    } catch (error) {
      setLoading(false);
      setError(error);
    }
  };
  return {
    loading,
    error,
    categories,
    getCategories,
  };
}
