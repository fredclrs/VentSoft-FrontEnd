/** Espejo de Application.BaseResponse<T> del backend. */
export interface BaseResponse<T> {
  success: boolean
  message: string
  data: T | null
}
