import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
  darkMode: boolean
  avatarColor: string
}

const initialState: ThemeState = {
  darkMode: true,
  avatarColor: '#9333EA',
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
  },
})

export const { setDarkMode, setAvatarColor } = themeSlice.actions
export default themeSlice.reducer
