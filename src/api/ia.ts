import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { DatosClienteExtraidos, LineaFactura, LineaTextoProducto } from '../types/ia'

export interface ImagenParaIA {
  imagenBase64: string
  mediaType: string
}

/** Lee una foto de factura de compra y devuelve sus renglones, ya comparados contra el
 * catálogo — no agrega ni crea nada, es solo una sugerencia para revisar y confirmar. */
export async function leerFactura(imagen: ImagenParaIA): Promise<LineaFactura[]> {
  const { data } = await apiClient.post<BaseResponse<LineaFactura[]>>('/Ia/leerFactura', imagen)
  return unwrap(data)
}

/** Interpreta una lista de productos escrita a mano (sin foto). */
export async function interpretarListaProductos(texto: string): Promise<LineaTextoProducto[]> {
  const { data } = await apiClient.post<BaseResponse<LineaTextoProducto[]>>('/Ia/interpretarListaProductos', { texto })
  return unwrap(data)
}

/** Lee una foto de un documento de identidad para precargar el alta de un Cliente. */
export async function leerDocumentoCliente(imagen: ImagenParaIA): Promise<DatosClienteExtraidos> {
  const { data } = await apiClient.post<BaseResponse<DatosClienteExtraidos>>('/Ia/leerDocumentoCliente', imagen)
  return unwrap(data)
}
