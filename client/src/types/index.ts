
export interface LoginInput {
    email: string
    password: string
}

export interface RegisterInput {
    name: string
    email: string
    password: string
    role: 'student' | 'teacher' | 'parent'
}

export interface AuthResponse {
    token: string
    user: User
}


export interface User {
    _id: string
    name: string
    email: string
    role: 'student' | 'teacher' | 'parent' | 'admin'
    xp: number
    level: number
    createdAt: string
}

export interface ApiError {
    message: string
    status: number
}
