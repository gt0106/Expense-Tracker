import api from "./api";

export const getExpenses = async () => {
  const response = await api.get("/expenses");
  return response.data;
};

export const addExpense = async (expense: {
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
}) => {
  const response = await api.post("/expenses", expense);
  return response.data;
};

export const updateExpense = async (
  id: string,
  expense: {
    title?: string;
    amount?: number;
    category?: string;
    date?: string;
    description?: string;
  }
) => {
  const response = await api.put(`/expenses/${id}`, expense);
  return response.data;
};

export const deleteExpense = async (id: string) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};
