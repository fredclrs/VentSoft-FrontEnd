import { makeCrudApi } from './crud'
import type { Promocion, PromocionFormValues } from '../types/promocion'

export const promocionesApi = makeCrudApi<Promocion, PromocionFormValues>('/Promocion')
