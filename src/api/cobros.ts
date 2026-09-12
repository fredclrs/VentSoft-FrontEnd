import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { Cobro, RegistrarCobro } from '../types/cobro'
import type { ClienteDeuda } from '../types/reportes'

export async function registrarCobro(cobro: RegistrarCobro): Promise<Cobro> {
  const { data } = await apiClient.post<BaseResponse<Cobro>>('/Cobro', cobro)
  return unwrap(data)
}

export async function getDeudaCliente(idCliente: number): Promise<ClienteDeuda> {
  const { data } = await apiClient.get<BaseResponse<ClienteDeuda>>('/Cobro/deuda', {
    params: { idCliente },
  })
  return unwrap(data)
}

export async function getCobrosByCliente(idCliente: number): Promise<Cobro[]> {
  const { data } = await apiClient.get<BaseResponse<Cobro[]>>('/Cobro/byCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}
