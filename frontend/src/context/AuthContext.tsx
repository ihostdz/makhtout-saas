'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('makhtout_token')
    if (token) {
      api.auth
        .me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('makhtout_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password)
    localStorage.setItem('makhtout_token', data.access_token)
    const me = await api.auth.me()
    setUser(me)
  }

  const register = async (email: string, password: string, fullName?: string) => {
    await api.auth.register(email, password, fullName)
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('makhtout_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
