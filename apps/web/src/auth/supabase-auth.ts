import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { AuthEvent, AuthGateway, AuthListener, AuthUser } from './contracts';

function toAuthUser(user: User | null): AuthUser | null {
  return user?.email ? { id: user.id, email: user.email } : null;
}

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly client: SupabaseClient) {}

  async currentUser(): Promise<AuthUser | null> {
    const { data, error } = await this.client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') throw error;
    return toAuthUser(data.user);
  }

  subscribe(listener: AuthListener): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      const mapped: AuthEvent | null = event === 'PASSWORD_RECOVERY'
        ? 'password_recovery'
        : event === 'SIGNED_IN'
          ? 'signed_in'
          : event === 'SIGNED_OUT'
            ? 'signed_out'
            : null;
      if (mapped) listener(mapped, toAuthUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = toAuthUser(data.user);
    if (!user) throw new Error('authenticated user missing');
    return user;
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  }

  async isOwner(userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('is_owner', true)
      .maybeSingle();
    if (error) throw error;
    return data?.id === userId;
  }
}

export function createAuthGateway(): AuthGateway | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  return new SupabaseAuthGateway(createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }));
}
