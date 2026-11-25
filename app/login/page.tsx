import { redirect } from "next/navigation";
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
        color="#27295E"
        colorTwo="#D5DD54"
        speed={1.2}
        ringCount={8}
        opacity={0.95}
        followMouse
      />

      <section className="relative z-10 w-full max-w-[400px] rounded-2xl border border-[#141534]/12 bg-[#FAF8F2]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-200">
        {/* 1. Cabecera con identidad VisionWeb */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#141534] border border-[#D5DD54]/50 shadow-md">
            <span className="font-heading font-black text-base tracking-tight text-white">
              V<span className="text-[#D5DD54]">W</span>
            </span>
          </div>
          <h1 className="mt-4 font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#141534]">
            Vision<span className="text-[#585A74]">Cont</span>
          </h1>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[#D5DD54]/80 bg-[#D5DD54]/30 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141534]">
            Desarrollado por VisionWeb
          </span>
          <p className="mt-2 text-sm leading-relaxed text-[#585A74]">
            Control ejecutivo de pagos, vencimientos y agenda en un solo lugar
          </p>
        </div>

        {/* 2. Formulario de usuario y contraseña */}
        <CredentialsAuthForm initialError={initialError} />

        {/* 3. Nota al pie sutil */}
        <p className="mt-5 text-center text-xs leading-relaxed text-[#585A74]">
          Tus pagos, anotaciones y estadísticas se guardan de forma segura en tu
          calendario ejecutivo.
        </p>
      </section>
    </main>
  );
}
