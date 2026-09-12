import { makeCrudApi } from './crud'
import type { Usuario, UsuarioFormValues } from '../types/usuario'

export const usuariosApi = makeCrudApi<Usuario, UsuarioFormValues>('/Usuario', 'searchUser')
