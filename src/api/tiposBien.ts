import { makeCrudApi } from './crud'
import type { TipoBien, TipoBienFormValues } from '../types/tipoBien'

export const tiposBienApi = makeCrudApi<TipoBien, TipoBienFormValues>('/TipoBien')
