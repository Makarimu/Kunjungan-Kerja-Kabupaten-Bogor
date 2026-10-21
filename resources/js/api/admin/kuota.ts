import axios from '../axios';

export interface DinasKuotaItem {
  id: number;
  nama: string;
  singkatan: string;
  kuota_per_hari: number;
}

export const getDinasKuotaList = async () => {
  const response = await axios.get('/admin/dinas/kuota');
  return response.data;
};

export const updateDinasKuotaBulk = async (payload: {
  default_all?: number;
  items?: { id: number; kuota_per_hari: number }[];
}) => {
  const response = await axios.put('/admin/dinas/kuota', payload);
  return response.data;
};

export const updateDinasKuotaSingle = async (id: number, kuota_per_hari: number) => {
  const response = await axios.put(`/admin/dinas/${id}/kuota`, { kuota_per_hari });
  return response.data;
};
