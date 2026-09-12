import { makeCrudApi } from './crud'
import type { Proveedor, ProveedorFormValues } from '../types/proveedor'

export const proveedoresApi = makeCrudApi<Proveedor, ProveedorFormValues>('/Proveedor')

/**
 * Busca proveedores por nombre o por NIT en un solo texto (el backend combina los filtros con
 * AND, así que acá se hacen las dos búsquedas por separado y se combinan sin duplicados — mismo
 * patrón que buscarArticulos/buscarClientesTexto). Es lo que hay que usar en cualquier buscador
 * de proveedor en pantalla.
 */
export async function buscarProveedoresTexto(texto: string): Promise<Proveedor[]> {
  if (!texto.trim()) return proveedoresApi.search()

  const [porNombre, porNit] = await Promise.all([
    proveedoresApi.search({ nombre: texto }),
    proveedoresApi.search({ nit: texto }),
  ])

  const combinados = new Map<number, Proveedor>()
  for (const proveedor of [...porNombre, ...porNit]) {
    combinados.set(proveedor.id, proveedor)
  }
  return Array.from(combinados.values())
}
