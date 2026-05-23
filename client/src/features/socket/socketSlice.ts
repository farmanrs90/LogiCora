import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface SocketState {
  isConnected: boolean
  roomId: string | null
}

const initialState: SocketState = {
  isConnected: false,
  roomId: null,
}

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload
    },
    setRoomId(state, action: PayloadAction<string | null>) {
      state.roomId = action.payload
    },
    resetSocket(state) {
      state.isConnected = false
      state.roomId = null
    },
  },
})

export const { setConnected, setRoomId, resetSocket } = socketSlice.actions
export default socketSlice.reducer
