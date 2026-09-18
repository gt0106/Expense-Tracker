import api from "./api";

export const createBudget = async (
  month: number,
  year: number,
  amount: number
) => {
  const response = await api.post("/budget", {
    month,
    year,
    amount,
  });

  return response.data;
};

export const getBudget = async (
  month: number,
  year: number
) => {
  const response = await api.get("/budget", {
    params: {
      month,
      year,
    },
  });

  return response.data;
};
