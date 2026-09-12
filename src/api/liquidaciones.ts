import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { Liquidacion, RegistrarLiquidacion } from '../types/liquidacion'

export async function registrarLiquidacion(liquidacion: RegistrarLiquidacion): Promise<Liquidacion> {
  const { data } = await apiClient.post<BaseResponse<Liquidacion>>('/Liquidacion', liquidacion)
  return unwrap(data)
}

export async function getLiquidacionesByCliente(idCliente: number): Promise<Liquidacion[]> {
  const { data } = await apiClient.get<BaseResponse<Liquidacion[]>>('/Liquidacion/byCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}
