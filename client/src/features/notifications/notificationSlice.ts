import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface AppNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'achievement' | 'challenge'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<AppNotification>) {
      state.notifications.unshift(action.payload)
      if (!action.payload.isRead) {
        state.unreadCount += 1
      }
    },
    setNotifications(state, action: PayloadAction<AppNotification[]>) {
      state.notifications = action.payload
      state.unreadCount = action.payload.filter((n) => !n.isRead).length
    },
    markAsRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.find((n) => n.id === action.payload)
      if (notification && !notification.isRead) {
        notification.isRead = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllAsRead(state) {
      state.notifications.forEach((n) => {
        n.isRead = true
      })
      state.unreadCount = 0
    },
    clearNotifications(state) {
      state.notifications = []
      state.unreadCount = 0
    },
  },
})

export const {
  addNotification,
  setNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationSlice.actions
export default notificationSlice.reducer
