"use client";

import { useCallback, useEffect, useState } from "react";

interface Producer {
  id: string;
  displayName: string;
  rfc: string;
  zona: string;
}

interface ProducerAccount {
  id: string;
  name: string;
  email: string;
  producerId?: string;
}

interface AccountResponse {
  users: ProducerAccount[];
  producers: Producer[];
}

export default function ProducerAccountsPage() {
  const [accounts, setAccounts] = useState<ProducerAccount[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/producer-accounts", { cache: "no-store" });
      const data = (await response.json()) as AccountResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las cuentas");

      setAccounts(data.users);
      setProducers(data.producers);
      setSelections(
        Object.fromEntries(data.users.map((account) => [account.id, account.producerId ?? ""])),
      );
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudieron cargar las cuentas",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const saveAssociation = async (account: ProducerAccount) => {
    const producerId = selections[account.id] || "";
    if (!producerId) {
      setMessage({ text: "Selecciona un expediente antes de guardar.", error: true });
      return;
    }

    setSaving(account.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/producer-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ producerId }),
      });
      const data = (await response.json()) as ProducerAccount & { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el vínculo");

      setAccounts((current) =>
        current.map((item) => (item.id === account.id ? { ...item, producerId: data.producerId } : item)),
      );
      setMessage({ text: `Vínculo actualizado para ${account.name}.`, error: false });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "No se pudo guardar el vínculo",
        error: true,
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cuentas de productores</h1>
        <p className="text-gray-600 mt-1">
          Vincula cada cuenta con el expediente del productor que puede consultar.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        Una cuenta sin vínculo no puede consultar productores, alertas ni información del
        expediente. Selecciona el expediente correcto y guarda el cambio para habilitar el acceso.
      </div>

      {message && (
        <div
          role="alert"
          className={`rounded-lg p-4 text-sm ${
            message.error
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-green-50 border border-green-200 text-green-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
          Cargando cuentas de productor...
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-600">
          No hay cuentas con rol PRODUCTOR para vincular.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Cuenta
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Expediente asociado
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => {
                  const hasAssociation = Boolean(account.producerId);
                  return (
                    <tr key={account.id} className="align-top">
                      <td className="px-6 py-5">
                        <p className="font-semibold text-gray-900">{account.name}</p>
                        <p className="text-sm text-gray-500">{account.email}</p>
                        {!hasAssociation && (
                          <span className="inline-flex mt-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Pendiente de vínculo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 min-w-[20rem]">
                        <label htmlFor={`producer-${account.id}`} className="sr-only">
                          Expediente para {account.name}
                        </label>
                        <select
                          id={`producer-${account.id}`}
                          value={selections[account.id] ?? ""}
                          onChange={(event) =>
                            setSelections((current) => ({
                              ...current,
                              [account.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-driscoll-green focus:outline-none focus:ring-2 focus:ring-driscoll-green"
                        >
                          <option value="">Selecciona un expediente</option>
                          {producers.map((producer) => (
                            <option key={producer.id} value={producer.id}>
                              {producer.displayName} · {producer.rfc} · {producer.zona}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => void saveAssociation(account)}
                          disabled={saving === account.id}
                          className="rounded-md bg-driscoll-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-driscoll-darkgreen disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving === account.id ? "Guardando..." : "Guardar vínculo"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}