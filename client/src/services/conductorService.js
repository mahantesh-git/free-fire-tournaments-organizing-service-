
import api, { handleAPIError } from './api';

export const getConductors = async (query = '', role = '') => {
    try {
        const params = new URLSearchParams();
        if (query) params.append('search', query);
        if (role) params.append('role', role);

        const response = await api.get(`/conductors?${params.toString()}`);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

export const addConductor = async (conductorData) => {
    try {
        const response = await api.post('/conductors', conductorData);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

export const updateConductor = async (id, conductorData) => {
    try {
        const response = await api.put(`/conductors/${id}`, conductorData);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

export const deleteConductor = async (id) => {
    try {
        const response = await api.delete(`/conductors/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

export const importConductors = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/conductors/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        throw new Error(handleAPIError(error));
    }
};

export const getExportUrl = () => {
    return `${api.defaults.baseURL}/conductors/export`;
};
