import api from "./api";

export const getDashboardAnalytics = async () => {
  const response = await api.get("/analytics/dashboard");

  return response.data;
};
