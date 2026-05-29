import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../app/store'
import { setConnected, setRoomId, resetSocket } from '../features/socket/socketSlice'

const SOCKET_URL = (import.meta as { env: Record<string, string> }).env.VITE_SOCKET_URL ?? 'http://localhost:5000'

export function useSocket(roomId: string | null) {
  const dispatch  = useDispatch<AppDispatch>()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnectedState] = useState(false)

  useEffect(() => {
    if (!roomId) return

    const token  = localStorage.getItem('accesstoken')
    const socket = io(SOCKET_URL, {
      auth:                 { token },
      transports:           ['websocket', 'polling'],
      reconnection:         true,
      reconnectionDelay:    1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket
    dispatch(setRoomId(roomId))

    socket.on('connect', () => {
      setIsConnectedState(true)
      dispatch(setConnected(true))
      socket.emit('room:join', { roomId })
    })

    socket.on('disconnect', () => {
      setIsConnectedState(false)
      dispatch(setConnected(false))
    })

    return () => {
      socket.emit('room:leave', { roomId })
      socket.disconnect()
      socketRef.current = null
      setIsConnectedState(false)
      dispatch(resetSocket())
    }
  }, [roomId, dispatch])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { socketRef, isConnected, emit }
}
