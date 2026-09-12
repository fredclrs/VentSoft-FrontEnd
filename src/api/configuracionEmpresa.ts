import { apiClient } from './client'
import { unwrap } from './crud'
import type { BaseResponse } from '../types/baseResponse'
import type { ConfiguracionEmpresa } from '../types/configuracionEmpresa'

export async function getConfiguracionEmpresa(): Promise<ConfiguracionEmpresa> {
  const { data } = await apiClient.get<BaseResponse<ConfiguracionEmpresa>>('/ConfiguracionEmpresa')
  return unwrap(data)
}

export interface ActualizarConfiguracionEmpresaInput {
  nombre: string
  moneda: string
  permiteVentaACredito: boolean
  permiteCompraACredito: boolean
  idClientePorDefecto?: number | null
  idProveedorPorDefecto?: number | null
}

export async function actualizarConfiguracionEmpresa(
  input: ActualizarConfiguracionEmpresaInput,
): Promise<ConfiguracionEmpresa> {
  const { data } = await apiClient.put<BaseResponse<ConfiguracionEmpresa>>('/ConfiguracionEmpresa', input)
  return unwrap(data)
}
