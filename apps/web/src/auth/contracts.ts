export type AuthUser = {
  id: string;
  email: string;
};

export type AuthEvent = 'signed_in' | 'signed_out' | 'password_recovery';
export type AuthListener = (event: AuthEvent, user: AuthUser | null) => void;

export interface AuthGateway {
  currentUser(): Promise<AuthUser | null>;
  subscribe(listener: AuthListener): () => void;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  isOwner(userId: string): Promise<boolean>;
}
