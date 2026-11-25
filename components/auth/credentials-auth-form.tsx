"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";

export function CredentialsAuthForm({
  initialError,
}: {
  initialError?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError ?? null);

  const switchMode = (nextMode: "login" | "register") => {
    setMode(nextMode);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg(null);

    if (mode === "register") {
      if (password.length < 6) {
        setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Las contraseñas no coinciden.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const regJson = (await regRes.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!regRes.ok) {
          setErrorMsg(regJson.error || "No se pudo crear la cuenta.");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setErrorMsg("Correo o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg("Error de conexión. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const inputClass =
    "min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-10 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200";

  return (
    <div className="space-y-4">
      {/* Selector Iniciar sesión / Crear cuenta */}
      <div className="grid grid-cols-2 rounded-xl border border-blue-100 bg-blue-50/70 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
            mode === "login"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-blue-700"
          }`}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          onClick={() => switchMode("register")}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
            mode === "register"
              ? "bg-white text-blue-700 shadow-xs"
              : "text-slate-600 hover:text-blue-700"
          }`}
        >
          Crear cuenta
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === "register" && (
          <div>
            <label
              htmlFor="auth-name"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Nombre completo
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. María González"
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="auth-email"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="asistente@empresa.com"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="auth-password"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword ? "Ocultar contraseña" : "Ver contraseña"
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {mode === "register" && (
          <div>
            <label
              htmlFor="auth-confirm-password"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="auth-confirm-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>
            {loading
              ? mode === "login"
                ? "Ingresando..."
                : "Creando cuenta..."
              : mode === "login"
              ? "Ingresar"
              : "Crear cuenta e ingresar"}
          </span>
        </button>
      </form>
    </div>
  );
}
