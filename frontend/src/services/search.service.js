import api from "./api";

export const searchService = {
  globalSearch: async (query) => {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};
