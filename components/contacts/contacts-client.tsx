"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Landmark,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ListRowsSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CONTACT_CATEGORIES } from "@/lib/constants";
import type { ContactRow } from "@/types/database";

function buildWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  const normalized =
    digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function ContactsClient({
  initialContacts,
  initialSearch = "",
}: {
  initialContacts: ContactRow[];
  initialSearch?: string;
}) {
  const { showToast } = useToast();

  const [contacts, setContacts] = useState<ContactRow[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("todos");

  // Modal CRUD
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Proveedor");
  const [taxId, setTaxId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingContact, setDeletingContact] = useState<ContactRow | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchText.trim()) params.set("search", searchText.trim());
      if (categoryFilter !== "todos") params.set("category", categoryFilter);

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { contacts: ContactRow[] };
        setContacts(json.contacts);
      }
    } finally {
      setLoading(false);
    }
  }, [searchText, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchContacts();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const openCreateModal = () => {
    setEditingContact(null);
    setName("");
    setCategory("Proveedor");
    setTaxId("");
    setPhone("");
    setEmail("");
    setBankInfo("");
    setNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (c: ContactRow) => {
    setEditingContact(c);
    setName(c.name);
    setCategory(c.category || "Proveedor");
    setTaxId(c.tax_id ?? "");
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setBankInfo(c.bank_info ?? "");
    setNotes(c.notes ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(
        editingContact
          ? `/api/contacts/${editingContact.id}`
          : "/api/contacts",
        {
          method: editingContact ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            category: category || null,
            tax_id: taxId || null,
            phone: phone || null,
            email: email || null,
            bank_info: bankInfo || null,
            notes: notes || null,
          }),
        }
      );

      const json = (await res.json()) as {
        contact?: ContactRow;
        error?: string;
      };
      if (!res.ok) {
        setFormError(json.error || "No se pudo guardar el contacto");
        return;
      }

      showToast({
        variant: "success",
        title: editingContact ? "Contacto actualizado" : "Contacto guardado",
      });
      setFormOpen(false);
      await fetchContacts();
    } catch {
      setFormError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingContact) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deletingContact.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showToast({ variant: "error", title: "No se pudo eliminar" });
        return;
      }
      showToast({ variant: "success", title: "Contacto eliminado" });
      setDeletingContact(null);
      await fetchContacts();
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyBank = async (c: ContactRow) => {
    if (!c.bank_info) return;
    const textToCopy = c.tax_id
      ? `${c.name} (${c.tax_id})\n${c.bank_info}`
      : `${c.name}\n${c.bank_info}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast({
        variant: "success",
        title: "Datos bancarios copiados",
        description: `Información de ${c.name} copiada al portapapeles.`,
      });
    } catch {
      showToast({
        variant: "error",
        title: "No se pudo copiar al portapapeles",
      });
    }
  };

  const inputClass =
    "min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Directorio de Proveedores y Bancos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Proveedores, arrendadores, contadores, bancos y contactos clave con
            copia en 1 clic
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Contacto</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-xs)] sm:grid-cols-3">
        <div className="relative sm:col-span-2 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar por nombre, NIT/cédula, cuenta bancaria..."
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={inputClass}
          aria-label="Filtrar por categoría"
        >
          <option value="todos">Todas las categorías</option>
          {CONTACT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading && contacts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ListRowsSkeleton rows={4} />
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No hay contactos registrados"
          description="Guarda tus proveedores, arrendadores, contadores o bancos para acceder rápido a sus cuentas y WhatsApp."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar contacto</span>
            </button>
          }
        />
      ) : (
        <>
          {/* Tarjetas apiladas en móvil (< md) */}
          <div className="space-y-3 md:hidden">
            {contacts.map((c) => {
              const waUrl = c.phone ? buildWhatsAppUrl(c.phone) : null;
              return (
                <article
                  key={c.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-xs)] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#0F172A] break-words">
                        {c.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {c.category && (
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                            {c.category}
                          </span>
                        )}
                        {c.tax_id && <span>NIT/CC: {c.tax_id}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        aria-label="Editar contacto"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingContact(c)}
                        aria-label="Eliminar contacto"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {c.bank_info && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700">
                        <Landmark className="h-3.5 w-3.5" />
                        <span>Datos bancarios</span>
                      </div>
                      <pre className="mt-1.5 whitespace-pre-wrap break-words font-sans text-xs text-[#0F172A]">
                        {c.bank_info}
                      </pre>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-slate-600">
                    {c.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span>{c.phone}</span>
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-1.5 min-w-0">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {c.bank_info && (
                      <button
                        type="button"
                        onClick={() => void handleCopyBank(c)}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar cuenta</span>
                      </button>
                    )}

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Correo</span>
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Tabla limpia de ancho completo en escritorio (md+) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-blue-50/50 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
                    <th className="px-4 py-3.5">Proveedor / Contacto</th>
                    <th className="px-4 py-3.5">NIT / Cédula</th>
                    <th className="px-4 py-3.5">Datos bancarios</th>
                    <th className="px-4 py-3.5">Contacto directo</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contacts.map((c) => {
                    const waUrl = c.phone ? buildWhatsAppUrl(c.phone) : null;
                    return (
                      <tr
                        key={c.id}
                        className="transition-colors hover:bg-blue-50/40"
                      >
                        <td className="px-4 py-3.5 align-top max-w-[240px]">
                          <div className="space-y-1 min-w-0">
                            <p className="font-semibold text-[#0F172A] break-words">
                              {c.name}
                            </p>
                            {c.category && (
                              <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                                {c.category}
                              </span>
                            )}
                            {c.notes && (
                              <p className="text-xs text-slate-500 line-clamp-2 break-words">
                                {c.notes}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs font-medium text-slate-700 whitespace-nowrap">
                          {c.tax_id || "—"}
                        </td>

                        <td className="px-4 py-3.5 align-top max-w-[300px]">
                          {c.bank_info ? (
                            <div className="space-y-2">
                              <pre className="whitespace-pre-wrap break-words font-sans text-xs text-[#0F172A]">
                                {c.bank_info}
                              </pre>
                              <button
                                type="button"
                                onClick={() => void handleCopyBank(c)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copiar datos bancarios</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Sin datos bancarios
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-col gap-1.5 text-xs">
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-fit items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 hover:bg-emerald-100"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>{c.phone}</span>
                              </a>
                            )}
                            {!waUrl && c.phone && (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <Phone className="h-3.5 w-3.5 text-blue-600" />
                                {c.phone}
                              </span>
                            )}
                            {c.email && (
                              <a
                                href={`mailto:${c.email}`}
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline max-w-[200px]"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              title="Editar"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingContact(c)}
                              title="Eliminar"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drawer CRUD Contacto */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        variant="drawer"
        title={editingContact ? "Editar contacto" : "Nuevo proveedor / contacto"}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nombre o Razón Social *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Inmobiliaria Central, Bancolombia, Juan Pérez..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                NIT / Cédula
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="900.123.456-1"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="300 123 4567"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="facturacion@proveedor.com"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Datos bancarios (Banco, tipo y número de cuenta, titular)
            </label>
            <textarea
              rows={3}
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              placeholder={`Banco: Bancolombia\nCuenta Ahorros: 001-234567-89\nTitular: Razón Social`}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notas adicionales
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contacto de cartera, horario de atención..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingContact)}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar contacto"
        description={`¿Deseas eliminar "${deletingContact?.name}" del directorio?`}
      />
    </div>
  );
}
