export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  PLAYER = 'PLAYER'
}

export type AccountStatus = 'ACTIVE' | 'PENDING' | 'REJECTED';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status?: AccountStatus;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}
