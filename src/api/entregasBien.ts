import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { EntregaBien, RegistrarEntregaBien } from '../types/entregaBien'

export async function registrarEntregaBien(entrega: RegistrarEntregaBien): Promise<EntregaBien> {
  const { data } = await apiClient.post<BaseResponse<EntregaBien>>('/EntregaBien', entrega)
  return unwrap(data)
}

export async function getEntregasPendientesByCliente(idCliente: number): Promise<EntregaBien[]> {
  const { data } = await apiClient.get<BaseResponse<EntregaBien[]>>('/EntregaBien/pendientesByCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}

export async function getEntregasByCliente(idCliente: number): Promise<EntregaBien[]> {
  const { data } = await apiClient.get<BaseResponse<EntregaBien[]>>('/EntregaBien/byCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}
