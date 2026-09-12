import { makeCrudApi } from './crud'
import type { FormaDePago, FormaDePagoFormValues } from '../types/formaDePago'

export const formasDePagoApi = makeCrudApi<FormaDePago, FormaDePagoFormValues>('/FormaDePago')
