import { apiClient } from './client'
import type { BaseResponse } from '../types/baseResponse'
import type { Cliente, ClienteFormValues } from '../types/cliente'

function unwrap<T>(response: BaseResponse<T>): T {
  if (!response.success || response.data === null) {
    throw new Error(response.message)
  }
  return response.data
}

export interface BuscarClientesParams {
  nombre?: string
  documentoIdentidad?: string
}

export async function buscarClientes(params: BuscarClientesParams = {}): Promise<Cliente[]> {
  const { data } = await apiClient.get<BaseResponse<Cliente[]>>('/Cliente/search', { params })
  return unwrap(data)
}

/**
 * Busca clientes por nombre o por documento de identidad en un solo texto (el backend combina
 * los filtros con AND, así que acá se hacen las dos búsquedas por separado y se combinan sin
 * duplicados — mismo patrón que buscarArticulos). Es lo que hay que usar en cualquier buscador
 * de cliente en pantalla; buscarClientes queda para cuando se necesita un filtro puntual.
 */
export async function buscarClientesTexto(texto: string): Promise<Cliente[]> {
  if (!texto.trim()) return buscarClientes()

  const [porNombre, porDocumento] = await Promise.all([
    buscarClientes({ nombre: texto }),
    buscarClientes({ documentoIdentidad: texto }),
  ])

  const combinados = new Map<number, Cliente>()
  for (const cliente of [...porNombre, ...porDocumento]) {
    combinados.set(cliente.id, cliente)
  }
  return Array.from(combinados.values())
}

export async function crearCliente(cliente: ClienteFormValues): Promise<Cliente> {
  const { data } = await apiClient.post<BaseResponse<Cliente>>('/Cliente', cliente)
  return unwrap(data)
}

export async function actualizarCliente(id: number, cliente: ClienteFormValues): Promise<Cliente> {
  const { data } = await apiClient.put<BaseResponse<Cliente>>('/Cliente', cliente, { params: { id } })
  return unwrap(data)
}

export async function eliminarCliente(id: number): Promise<Cliente> {
  const { data } = await apiClient.delete<BaseResponse<Cliente>>('/Cliente', { params: { id } })
  return unwrap(data)
}
