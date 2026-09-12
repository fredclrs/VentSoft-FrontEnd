import { apiClient } from './client'
import { makeCrudApi, unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { Articulo, ArticuloFormValues } from '../types/articulo'
import type { ArticuloStock } from '../types/reportes'

export const articulosApi = makeCrudApi<Articulo, ArticuloFormValues>('/Articulo')

/**
 * Busca artículos por código o por descripción (el backend combina los filtros con AND,
 * así que acá se hacen las dos búsquedas por separado y se combinan sin duplicados).
 */
export async function buscarArticulos(texto: string): Promise<Articulo[]> {
  if (!texto.trim()) return articulosApi.search()

  const [porCodigo, porDescripcion] = await Promise.all([
    articulosApi.search({ codigo: texto }),
    articulosApi.search({ descripcion: texto }),
  ])

  const combinados = new Map<number, Articulo>()
  for (const articulo of [...porCodigo, ...porDescripcion]) {
    combinados.set(articulo.id, articulo)
  }
  return Array.from(combinados.values())
}

export async function getStockBajo(): Promise<ArticuloStock[]> {
  const { data } = await apiClient.get<BaseResponse<ArticuloStock[]>>('/Articulo/stockBajo')
  return unwrap(data)
}

export async function getStockArticulo(idArticulo: number): Promise<ArticuloStock> {
  const { data } = await apiClient.get<BaseResponse<ArticuloStock>>('/Articulo/stock', {
    params: { idArticulo },
  })
  return unwrap(data)
}

/** Stock de todos los artículos activos de una sola vez (para no consultar uno por uno). */
export async function getStockTodos(): Promise<ArticuloStock[]> {
  const { data } = await apiClient.get<BaseResponse<ArticuloStock[]>>('/Articulo/stockTodos')
  return unwrap(data)
}

/** Aplica un precio sugerido por margen de ganancia (confirmado por el cajero después de una
 * Compra) — toca únicamente el precio, nada más del artículo. */
export async function actualizarPrecioArticulo(idArticulo: number, precio: number): Promise<Articulo> {
  const { data } = await apiClient.put<BaseResponse<Articulo>>(
    '/Articulo/precio',
    { precio },
    { params: { idArticulo } },
  )
  return unwrap(data)
}
