import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [empleado, setEmpleado] = useState(null)
  const [cargando, setCargando] = useState(true)

  const cargarPerfil = useCallback(async (userId) => {
    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('*, organizaciones(nombre)')
      .eq('id', userId)
      .single()

    setPerfil(perfilData ?? null)

    if (perfilData?.rol === 'empleado') {
      const { data: empleadoData } = await supabase
        .from('empleados')
        .select('*')
        .eq('perfil_id', userId)
        .single()
      setEmpleado(empleadoData ?? null)
    } else {
      setEmpleado(null)
    }
  }, [])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
      if (nuevaSesion?.user) {
        setCargando(true)
        // Se difiere la consulta para no bloquear el callback de autenticación
        setTimeout(() => {
          cargarPerfil(nuevaSesion.user.id).finally(() => setCargando(false))
        }, 0)
      } else {
        setPerfil(null)
        setEmpleado(null)
        setCargando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [cargarPerfil])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  const recargarPerfil = () => {
    if (session?.user) return cargarPerfil(session.user.id)
  }

  const value = {
    session,
    usuario: session?.user ?? null,
    perfil,
    empleado,
    rol: perfil?.rol ?? null,
    debeCambiarPassword: perfil?.debe_cambiar_password === true,
    cargando,
    cerrarSesion,
    recargarPerfil
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider')
  return ctx
}
