import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { MovimientoCaja, RegistrarMovimientoCaja } from '../types/movimientoCaja'

export async function registrarMovimientoCaja(movimiento: RegistrarMovimientoCaja): Promise<MovimientoCaja> {
  const { data } = await apiClient.post<BaseResponse<MovimientoCaja>>('/MovimientoCaja', movimiento)
  return unwrap(data)
}

export async function getMovimientosCajaDelDia(fecha: string): Promise<MovimientoCaja[]> {
  const { data } = await apiClient.get<BaseResponse<MovimientoCaja[]>>('/MovimientoCaja/delDia', { params: { fecha } })
  return unwrap(data)
}

export async function eliminarMovimientoCaja(id: number): Promise<MovimientoCaja> {
  const { data } = await apiClient.delete<BaseResponse<MovimientoCaja>>('/MovimientoCaja', { params: { id } })
  return unwrap(data)
}
