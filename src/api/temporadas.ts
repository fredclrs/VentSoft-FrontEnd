import { makeCrudApi } from './crud'
import type { Temporada, TemporadaFormValues } from '../types/temporada'

export const temporadasApi = makeCrudApi<Temporada, TemporadaFormValues>('/Temporada')
