import { makeCrudApi } from './crud'
import type { Familia, FamiliaFormValues } from '../types/familia'

export const familiasApi = makeCrudApi<Familia, FamiliaFormValues>('/Familia')
