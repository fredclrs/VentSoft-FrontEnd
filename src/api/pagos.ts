import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { Pago, RegistrarPago } from '../types/pago'
import type { ProveedorDeuda } from '../types/reportes'

export async function registrarPago(pago: RegistrarPago): Promise<Pago> {
  const { data } = await apiClient.post<BaseResponse<Pago>>('/Pago', pago)
  return unwrap(data)
}

export async function getDeudaProveedor(idProveedor: number): Promise<ProveedorDeuda> {
  const { data } = await apiClient.get<BaseResponse<ProveedorDeuda>>('/Pago/deuda', {
    params: { idProveedor },
  })
  return unwrap(data)
}

export async function getPagosByProveedor(idProveedor: number): Promise<Pago[]> {
  const { data } = await apiClient.get<BaseResponse<Pago[]>>('/Pago/byProveedor', {
    params: { idProveedor },
  })
  return unwrap(data)
}
