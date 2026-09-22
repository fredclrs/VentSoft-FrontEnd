import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { AgregarEtiquetaPendiente, EtiquetaPendiente } from '../types/etiquetaPendiente'

/** La cola de etiquetas pendientes de imprimir — ver EtiquetaPendiente.cs para el detalle. */
export async function getEtiquetasPendientes(): Promise<EtiquetaPendiente[]> {
  const { data } = await apiClient.get<BaseResponse<EtiquetaPendiente[]>>('/EtiquetaPendiente')
  return unwrap(data)
}

/** Si el artículo ya estaba en la cola, el backend suma la cantidad en vez de duplicar la fila. */
export async function agregarEtiquetaPendiente(etiqueta: AgregarEtiquetaPendiente): Promise<EtiquetaPendiente> {
  const { data } = await apiClient.post<BaseResponse<EtiquetaPendiente>>('/EtiquetaPendiente', etiqueta)
  return unwrap(data)
}

export async function actualizarCantidadEtiquetaPendiente(id: number, cantidad: number): Promise<EtiquetaPendiente> {
  const { data } = await apiClient.put<BaseResponse<EtiquetaPendiente>>(
    '/EtiquetaPendiente',
    null,
    { params: { id, cantidad } },
  )
  return unwrap(data)
}

export async function eliminarEtiquetaPendiente(id: number): Promise<boolean> {
  const { data } = await apiClient.delete<BaseResponse<boolean>>('/EtiquetaPendiente', { params: { id } })
  return unwrap(data)
}

/** Vacía toda la cola de una vez — se usa después de mandar a imprimir todo. */
export async function vaciarEtiquetasPendientes(): Promise<number> {
  const { data } = await apiClient.delete<BaseResponse<number>>('/EtiquetaPendiente/vaciar')
  return unwrap(data)
}
