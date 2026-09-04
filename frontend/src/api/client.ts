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
    if (!text) return `HTTP ${response.status}`;
    try {
      const body = JSON.parse(text);
      if (Array.isArray(body?.message)) return body.message.join(' ');
      if (typeof body?.message === 'string') return body.message;
    } catch {
      // The endpoint returned plain text rather than a JSON error envelope.
    }
    return text;
  } catch {
    return `HTTP ${response.status}`;
  }
};
