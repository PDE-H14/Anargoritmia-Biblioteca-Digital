import { useState } from "react";
import {
  getMeApi,
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
} from "../api/user";
import { useAuth } from ".";

export function useUser() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState(null);
  const { auth } = useAuth();

  const getMe = async (token) => {
    try {
      const response = await getMeApi(token);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const getUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsersApi(auth.token);
      setLoading(false);
      setUsers(response);
      return response;
    } catch (error) {
      setLoading(false);
      setError(error);
    }
  };

  const createUser = async (formValues) => {
    try {
      setLoading(true);
      await createUserApi(formValues, auth.token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError(error);
    }
  };

  const updateUser = async (id, formValues) => {
    try {
      setLoading(true);
      await updateUserApi(id, formValues, auth.token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError(error);
    }
  };

  const deleteUser = async (id) => {
    try {
      setLoading(true);
      await deleteUserApi(id, auth.token);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setError(error);
    }
  };
  return {
    loading,
    error,
    users,
    getMe,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
