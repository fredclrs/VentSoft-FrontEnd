import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { RegistrarVenta, Venta } from '../types/venta'

export async function registrarVenta(venta: RegistrarVenta): Promise<Venta> {
  const { data } = await apiClient.post<BaseResponse<Venta>>('/Venta', venta)
  return unwrap(data)
}

export async function getVentaById(id: number): Promise<Venta> {
  const { data } = await apiClient.get<BaseResponse<Venta>>('/Venta/byId', { params: { id } })
  return unwrap(data)
}

export async function getVentasByCliente(idCliente: number): Promise<Venta[]> {
  const { data } = await apiClient.get<BaseResponse<Venta[]>>('/Venta/byCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}

/** Todas las ventas (de cualquier cliente) de una fecha puntual — requiere el permiso "ventas_dia". */
export async function getVentasDelDia(fecha: string): Promise<Venta[]> {
  const { data } = await apiClient.get<BaseResponse<Venta[]>>('/Venta/delDia', { params: { fecha } })
  return unwrap(data)
}

/** Todas las ventas activas, de cualquier cliente/vendedor — requiere el permiso "ventas_vendedor"
 * (independiente de "ventas"): para Ventas por vendedor y Ventas por artículo. */
export async function getVentasTodas(): Promise<Venta[]> {
  const { data } = await apiClient.get<BaseResponse<Venta[]>>('/Venta/todas')
  return unwrap(data)
}
