import { redirect } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import { auth } from "@/auth";
import { CredentialsAuthForm } from "@/components/auth/credentials-auth-form";
import { MagicRings } from "@/components/ui/magic-rings";

function getLoginErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "CredentialsSignin":
      return "Correo o contraseña incorrectos.";
    case "AccessDenied":
      return "Acceso denegado. Verifica tus credenciales.";
    default:
      return "No se pudo iniciar sesión. Intenta nuevamente.";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  const sp = await searchParams;
  const initialError = getLoginErrorMessage(sp.error);

  return (
    <main className="relative min-h-dvh w-full max-w-full overflow-x-hidden flex flex-col items-center justify-center px-4 py-8 sm:px-6">
      <MagicRings
        color="#1D4ED8"
        colorTwo="#60A5FA"
        speed={1.2}
        ringCount={8}
        opacity={0.95}
        followMouse
      />

      <section className="relative z-10 w-full max-w-[400px] rounded-2xl border border-blue-100 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-200">
        {/* 1. Cabecera minimalista */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600 shadow-xs">
            <CalendarCheck2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Gestión Gerencial
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Administra pagos, vencimientos y agenda ejecutiva en un solo lugar
          </p>
        </div>

        {/* 2. Formulario de usuario y contraseña */}
        <CredentialsAuthForm initialError={initialError} />

        {/* 3. Nota al pie sutil */}
        <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
          Tus pagos, anotaciones y estadísticas se guardan de forma segura en tu
          calendario ejecutivo.
        </p>
      </section>
    </main>
  );
}
