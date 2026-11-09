import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { Workspace } from "./Workspace";

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setReady(true);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") setRecovery(false);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (!supabase)
    return (
      <main className="auth">
        <h1>Meu financeiro</h1>
        <p>Configure seu ambiente Supabase para começar.</p>
        <p>
          Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo
          .env.local. Consulte o guia de instalação no README.
        </p>
      </main>
    );
  if (!ready)
    return (
      <main className="auth" aria-busy="true">
        Verificando sessão…
      </main>
    );
  if (!session || recovery)
    return <Auth recovery={recovery} onRecovered={() => setRecovery(false)} />;
  return <Workspace key={session.user.id} userId={session.user.id} />;
}

function Auth({
  recovery,
  onRecovered,
}: {
  recovery: boolean;
  onRecovered: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    try {
      if (recovery) {
        const { error } = await supabase!.auth.updateUser({ password });
        if (error) throw error;
        onRecovered();
      } else if (mode === "signup") {
        const { error } = await supabase!.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (error) throw error;
        setMessage("Confira seu e-mail para confirmar o cadastro.");
      } else if (mode === "reset") {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta para este e-mail, você receberá as instruções.",
        );
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch {
      setMessage(
        "Não foi possível concluir. Confira os dados, a confirmação de e-mail e tente novamente em alguns instantes.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <span className="eyebrow">FINANÇAS PESSOAIS</span>
      <h1>
        Mais clareza.
        <br />
        Mais tranquilidade.
      </h1>
      <p>Seu dinheiro organizado em um espaço só seu.</p>
      <form onSubmit={submit}>
        <h2>
          {recovery
            ? "Definir nova senha"
            : mode === "signup"
              ? "Criar minha conta"
              : mode === "reset"
                ? "Recuperar acesso"
                : "Entrar no meu espaço"}
        </h2>
        {!recovery && (
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>
        )}
        {(recovery || mode !== "reset") && (
          <label>
            Senha
            <input
              name="password"
              type="password"
              minLength={mode === "signup" || recovery ? 12 : 1}
              autoComplete={
                mode === "login" && !recovery
                  ? "current-password"
                  : "new-password"
              }
              required
            />
            <small>Para uma nova senha, use pelo menos 12 caracteres.</small>
          </label>
        )}
        <button disabled={busy}>
          {busy
            ? "Aguarde…"
            : recovery
              ? "Salvar nova senha"
              : mode === "signup"
                ? "Cadastrar"
                : mode === "reset"
                  ? "Enviar instruções"
                  : "Entrar"}
        </button>
        <p role="status">{message}</p>
      </form>
      {!recovery && (
        <div className="actions">
          <button
            className="secondary"
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          >
            {mode === "signup" ? "Já tenho conta" : "Criar conta"}
          </button>
          <button
            className="secondary"
            onClick={() => setMode(mode === "reset" ? "login" : "reset")}
          >
            {mode === "reset" ? "Voltar à entrada" : "Esqueci minha senha"}
          </button>
        </div>
      )}
      <small>
        Seus dados financeiros são privados. Nenhum histórico é compartilhado
        entre usuários.
      </small>
    </main>
  );
}
