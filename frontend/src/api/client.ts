export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = localStorage.getItem('projection_auth_token');
  return window.fetch(input, {
    ...init,
    headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
};

export const getErrorText = async (response: Response) => {
  try {
    const text = await response.text();
    return text || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};
