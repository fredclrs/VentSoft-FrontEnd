import { apiClient } from './client'
import type { BaseResponse } from '../types/baseResponse'

export function unwrap<T>(response: BaseResponse<T>): T {
  if (!response.success || response.data === null) {
    throw new Error(response.message)
  }
  return response.data
}

export interface CrudApi<TDto, TForm = Partial<TDto>> {
  search: (params?: Record<string, unknown>) => Promise<TDto[]>
  getById: (id: number) => Promise<TDto>
  create: (data: TForm) => Promise<TDto>
  update: (id: number, data: TForm) => Promise<TDto>
  remove: (id: number) => Promise<TDto>
}

/**
 * Fábrica de cliente API para entidades de catálogo simples que siguen la convención
 * de este backend: POST/PUT/DELETE en la raíz del controller, GET "byId" y GET "search"
 * (o el path que se indique) devolviendo siempre BaseResponse<T>.
 */
export function makeCrudApi<TDto, TForm = Partial<TDto>>(
  basePath: string,
  searchPath = 'search',
): CrudApi<TDto, TForm> {
  return {
    async search(params = {}) {
      const { data } = await apiClient.get<BaseResponse<TDto[]>>(`${basePath}/${searchPath}`, { params })
      return unwrap(data)
    },
    async getById(id) {
      const { data } = await apiClient.get<BaseResponse<TDto>>(`${basePath}/byId`, { params: { id } })
      return unwrap(data)
    },
    async create(payload) {
      const { data } = await apiClient.post<BaseResponse<TDto>>(basePath, payload)
      return unwrap(data)
    },
    async update(id, payload) {
      const { data } = await apiClient.put<BaseResponse<TDto>>(basePath, payload, { params: { id } })
      return unwrap(data)
    },
    async remove(id) {
      const { data } = await apiClient.delete<BaseResponse<TDto>>(basePath, { params: { id } })
      return unwrap(data)
    },
  }
}
