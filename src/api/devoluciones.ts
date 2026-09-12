import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { DevolucionVenta, RegistrarDevolucion } from '../types/devolucion'

export async function registrarDevolucion(devolucion: RegistrarDevolucion): Promise<DevolucionVenta> {
  const { data } = await apiClient.post<BaseResponse<DevolucionVenta>>('/Devolucion', devolucion)
  return unwrap(data)
}

export async function getDevolucionesByVenta(idVenta: number): Promise<DevolucionVenta[]> {
  const { data } = await apiClient.get<BaseResponse<DevolucionVenta[]>>('/Devolucion/byVenta', {
    params: { idVenta },
  })
  return unwrap(data)
}

export async function getDevolucionesByCliente(idCliente: number): Promise<DevolucionVenta[]> {
  const { data } = await apiClient.get<BaseResponse<DevolucionVenta[]>>('/Devolucion/byCliente', {
    params: { idCliente },
  })
  return unwrap(data)
}

/** Todas las devoluciones/cambios (de cualquier cliente) de una fecha puntual — para el cierre
 * de caja de "Ventas del día". Requiere el permiso "ventas_dia". */
export async function getDevolucionesDelDia(fecha: string): Promise<DevolucionVenta[]> {
  const { data } = await apiClient.get<BaseResponse<DevolucionVenta[]>>('/Devolucion/delDia', { params: { fecha } })
  return unwrap(data)
}
