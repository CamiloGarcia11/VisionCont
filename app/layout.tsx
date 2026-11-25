import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Gestión Gerencial | Control Ejecutivo y Administrativo",
  description:
    "Plataforma ejecutiva para control de pagos, facturas, impuestos, vencimientos documentales, agenda y directorio con sincronización automática a Google Calendar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="w-full max-w-full overflow-x-hidden">
      <body className="min-h-dvh w-full max-w-full overflow-x-hidden flex flex-col antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
