import { apiClient } from './client'
import type { BaseResponse } from '../types/baseResponse'
import type { LoginRequest, LoginResponse } from '../types/auth'

export async function login(credenciales: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<BaseResponse<LoginResponse>>('/Auth/login', credenciales)

  if (!data.success || !data.data) {
    throw new Error(data.message)
  }

  return data.data
}
