import { isAxiosError } from 'axios'
import type { BaseResponse } from '../types/baseResponse'

/** Extrae un mensaje legible de un error de axios, priorizando el BaseResponse del backend. */
export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (isAxiosError<BaseResponse<unknown>>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}
