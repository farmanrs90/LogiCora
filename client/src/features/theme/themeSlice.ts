import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isCompanionVisible } from '../../lib/companion'

interface ThemeState {
  darkMode: boolean
  avatarColor: string
  companionVisible: boolean
}

const initialState: ThemeState = {
  darkMode: true,
  avatarColor: '#9333EA',
  companionVisible: isCompanionVisible(),   // ilkin dəyər localStorage-dan
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload
    },
    setAvatarColor(state, action: PayloadAction<string>) {
      state.avatarColor = action.payload
    },
    setCompanionVisible(state, action: PayloadAction<boolean>) {
      state.companionVisible = action.payload
    },
  },
})

export const { setDarkMode, setAvatarColor, setCompanionVisible } = themeSlice.actions
export default themeSlice.reducer
