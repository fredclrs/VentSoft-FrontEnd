import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { AjusteStock, RegistrarAjusteStock } from '../types/ajusteStock'

export async function registrarAjusteStock(ajuste: RegistrarAjusteStock): Promise<AjusteStock> {
  const { data } = await apiClient.post<BaseResponse<AjusteStock>>('/AjusteStock', ajuste)
  return unwrap(data)
}

export async function getAjustesByArticulo(idArticulo: number): Promise<AjusteStock[]> {
  const { data } = await apiClient.get<BaseResponse<AjusteStock[]>>('/AjusteStock/byArticulo', { params: { idArticulo } })
  return unwrap(data)
}

export async function eliminarAjusteStock(id: number): Promise<AjusteStock> {
  const { data } = await apiClient.delete<BaseResponse<AjusteStock>>('/AjusteStock', { params: { id } })
  return unwrap(data)
}
