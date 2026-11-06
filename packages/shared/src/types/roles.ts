export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  PLAYER = 'PLAYER'
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
