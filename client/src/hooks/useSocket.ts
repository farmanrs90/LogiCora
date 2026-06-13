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

    // Valid token yoxdursa ümumiyyətlə qoşulma — server auth middleware onsuz da rədd edər.
    const token = localStorage.getItem('accessToken')
    if (!token) return

    // Bu effekt instansiyası hələ aktivdirmi? StrictMode (dev) effekti iki dəfə
    // mount/unmount edir; bu bayraq köhnə bağlantının state yeniləməsinin/erkən
    // bağlanmasının qarşısını alır.
    let active = true

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
      // Effekt artıq təmizlənibsə (StrictMode throwaway mount): indi bağlantı AÇIQ
      // olduğu üçün təmiz bağlayırıq — mid-handshake close olmadığından brauzer
      // "WebSocket is closed before the connection is established" warning-i verməz.
      if (!active) {
        socket.disconnect()
        return
      }
      setIsConnectedState(true)
      dispatch(setConnected(true))
      socket.emit('room:join', { roomId })
    })

    socket.on('disconnect', () => {
      if (!active) return
      setIsConnectedState(false)
      dispatch(setConnected(false))
    })

    // Qoşulma xətası console-u spam etməsin — reconnection məntiqi onsuz da idarə edir.
    socket.on('connect_error', () => { /* səssiz */ })

    return () => {
      active = false
      // Yalnız tam qoşulmuş socket dərhal bağlanır (təmiz). Hələ CONNECTING-dirsə
      // bağlamırıq — yuxarıdakı 'connect' handler açıldıqdan sonra təmiz bağlayacaq.
      if (socket.connected) {
        socket.emit('room:leave', { roomId })
        socket.disconnect()
      }
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
