"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { formatCurrency, formatDateShort } from "@/lib/format";

interface SearchResultPayload {
  payments: {
    id: string;
    title: string;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
  }[];
  agenda: {
    id: string;
    title: string;
    item_type: string;
    start_at: string;
    status: string;
  }[];
  entities: {
    id: string;
    name: string;
    type: string;
    color: string | null;
  }[];
  contacts: {
    id: string;
    name: string;
    category: string | null;
    tax_id: string | null;
  }[];
}

const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/pagos", label: "Pagos y Obligaciones", icon: CreditCard },
  { href: "/agenda", label: "Agenda y Trámites", icon: CalendarDays },
  { href: "/entidades", label: "Jefes y Empresa", icon: Building2 },
  { href: "/directorio", label: "Proveedores y Bancos", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppShell({
  user,
  children,
}: {
  user: {
    name?: string | null;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultPayload | null>(
    null
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!cancelled && res.ok) {
          const data = (await res.json()) as SearchResultPayload;
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch {
        // Silencioso en búsqueda rápida
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const hasAnySearchResults =
    searchResults &&
    (searchResults.payments.length > 0 ||
      searchResults.agenda.length > 0 ||
      searchResults.entities.length > 0 ||
      searchResults.contacts.length > 0);

  const initials = (user.name || user.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const renderSidebarLinks = () => (
    <nav className="flex-1 space-y-1 py-4 pl-3 pr-0">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchOpen(false);
            }}
            className={`flex min-h-[44px] items-center gap-3 rounded-l-lg px-3.5 py-2.5 text-sm transition-all duration-200 ${
              isActive
                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600 font-semibold"
                : "text-slate-600 hover:bg-blue-50/50 hover:text-blue-700 font-medium"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${
                isActive ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh w-full max-w-full overflow-x-hidden flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Sidebar fijo en desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
            GG
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#0F172A]">
              Gestión Gerencial
            </p>
            <p className="truncate text-[11px] font-medium text-blue-600">
              Control Ejecutivo
            </p>
          </div>
        </div>

        {renderSidebarLinks()}

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 px-2.5 py-2 border border-slate-100">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || user.email}
                className="h-8 w-8 shrink-0 rounded-full border border-blue-200 object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#0F172A]">
                {user.name || "Asistente Gerencial"}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Drawer móvil suave */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${
          mobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                GG
              </div>
              <span className="truncate text-sm font-semibold text-[#0F172A]">
                Gestión Gerencial
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {renderSidebarLinks()}

          <div className="border-t border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || user.email}
                  className="h-8 w-8 shrink-0 rounded-full border border-blue-200 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#0F172A]">
                  {user.name || "Asistente Gerencial"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Contenedor principal flex-1 */}
      <div className="lg:pl-64 flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Buscador rápido */}
            <div ref={searchBoxRef} className="relative w-full max-w-md min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setSearchOpen(true);
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  setSearchQuery(next);
                  if (next.trim().length < 2) {
                    setSearchResults(null);
                    setSearchLoading(false);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Buscar pagos, trámites, jefes..."
                className="w-full min-h-[40px] rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200"
              />

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-blue-100 bg-white p-2 shadow-[var(--shadow-modal)] z-40">
                  {searchLoading ? (
                    <p className="px-3 py-4 text-center text-xs text-blue-600">
                      Buscando...
                    </p>
                  ) : !hasAnySearchResults ? (
                    <p className="px-3 py-4 text-center text-xs text-slate-500">
                      Sin coincidencias para &ldquo;{searchQuery}&rdquo;
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {searchResults.payments.length > 0 && (
                        <div>
                          <p className="px-2 py-1 font-semibold uppercase tracking-wider text-[10px] text-blue-600">
                            Pagos
                          </p>
                          {searchResults.payments.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                router.push(
                                  `/pagos?search=${encodeURIComponent(p.title)}`
                                );
                              }}
                              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-blue-50 transition-colors"
                            >
                              <span className="font-medium text-[#0F172A] truncate">
                                {p.title}
                              </span>
                              <span className="shrink-0 text-slate-600">
                                {formatCurrency(p.amount, p.currency)} ·{" "}
                                {formatDateShort(p.due_date)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.agenda.length > 0 && (
                        <div>
                          <p className="px-2 py-1 font-semibold uppercase tracking-wider text-[10px] text-blue-600">
                            Agenda y Trámites
                          </p>
                          {searchResults.agenda.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                router.push(
                                  `/agenda?search=${encodeURIComponent(a.title)}`
                                );
                              }}
                              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-blue-50 transition-colors"
                            >
                              <span className="font-medium text-[#0F172A] truncate">
                                {a.title}
                              </span>
                              <span className="shrink-0 text-slate-500">
                                {formatDateShort(a.start_at)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.entities.length > 0 && (
                        <div>
                          <p className="px-2 py-1 font-semibold uppercase tracking-wider text-[10px] text-blue-600">
                            Jefes y Empresa
                          </p>
                          {searchResults.entities.map((ent) => (
                            <button
                              key={ent.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                router.push(`/entidades?selected=${ent.id}`);
                              }}
                              className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-blue-50 transition-colors"
                            >
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: ent.color || "#2563EB",
                                }}
                              />
                              <span className="font-medium text-[#0F172A] truncate">
                                {ent.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchResults.contacts.length > 0 && (
                        <div>
                          <p className="px-2 py-1 font-semibold uppercase tracking-wider text-[10px] text-blue-600">
                            Proveedores y Bancos
                          </p>
                          {searchResults.contacts.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                router.push(
                                  `/directorio?search=${encodeURIComponent(
                                    c.name
                                  )}`
                                );
                              }}
                              className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-blue-50 transition-colors"
                            >
                              <span className="font-medium text-[#0F172A] truncate">
                                {c.name}
                              </span>
                              <span className="shrink-0 text-slate-500">
                                {c.tax_id || c.category || ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/configuracion"
              className="hidden sm:inline-flex min-h-[38px] items-center gap-2 rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs font-medium text-[#1E3A8A] hover:bg-blue-100 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="max-w-[180px] truncate">{user.email}</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-full px-3 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
