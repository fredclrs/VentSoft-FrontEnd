import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { Compra, RegistrarCompra } from '../types/compra'
import type { LoteVencimiento } from '../types/reportes'

export async function registrarCompra(compra: RegistrarCompra): Promise<Compra> {
  const { data } = await apiClient.post<BaseResponse<Compra>>('/Compra', compra)
  return unwrap(data)
}

export async function getCompraById(id: number): Promise<Compra> {
  const { data } = await apiClient.get<BaseResponse<Compra>>('/Compra/byId', { params: { id } })
  return unwrap(data)
}

export async function getComprasByProveedor(idProveedor: number): Promise<Compra[]> {
  const { data } = await apiClient.get<BaseResponse<Compra[]>>('/Compra/byProveedor', {
    params: { idProveedor },
  })
  return unwrap(data)
}

/**
 * diasAnticipacion=null trae TODOS los lotes con Lote y/o vencimiento cargado, sin importar
 * cuán lejos venza — se usa junto con idArticulo para ver el historial completo de un
 * artículo puntual (si no, con el default de 30 días, un lote lejano no aparecería nunca).
 */
export async function getLotesPorVencer(
  diasAnticipacion: number | null = 30,
  idArticulo?: number,
): Promise<LoteVencimiento[]> {
  const { data } = await apiClient.get<BaseResponse<LoteVencimiento[]>>('/Compra/lotesPorVencer', {
    params: { diasAnticipacion, idArticulo },
  })
  return unwrap(data)
}
