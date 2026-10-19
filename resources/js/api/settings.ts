import axios from './axios';

export interface HeaderSettings {
  header_telepon: string;
  header_jam_layanan: string;
  header_link_portal_bogor?: string;
  header_link_portal_ekabo?: string;
  min_hari_kunjungan?: number | string;
}

export const getPublicSettings = async () => {
  const response = await axios.get('/settings/public');
  return response.data;
};

export const getAdminSettings = async () => {
  const response = await axios.get('/admin/settings');
  return response.data;
};

export const updateAdminSettings = async (data: Partial<HeaderSettings>) => {
  const response = await axios.put('/admin/settings', data);
  return response.data;
};
