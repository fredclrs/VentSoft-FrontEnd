import { makeCrudApi } from './crud'
import type { Caracteristica, CaracteristicaFormValues } from '../types/caracteristica'

export const caracteristicasApi = makeCrudApi<Caracteristica, CaracteristicaFormValues>('/Caracteristica')
