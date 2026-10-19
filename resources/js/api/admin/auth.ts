import axios from '../axios';

export const login = async (username: string, password: string, turnstileToken?: string) => {
  const response = await axios.post('/auth/login', {
    username,
    password,
    turnstile_token: turnstileToken,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axios.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await axios.get('/auth/me');
  return response.data;
};
