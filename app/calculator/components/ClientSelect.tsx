"use client";

import { useEffect, useState } from "react";

type Client = {
  id: number;
  name: string;
};

export function ClientSelect({
  value,
  onChange
}: {
  value: number | null;
  onChange: (clientId: number | null) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then(res => res.json())
      .then(data => {
        setClients(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">
        Клиент:
      </label>

      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v ? Number(v) : null);
        }}
        disabled={loading}
        className="
          px-3 py-2 border rounded
          bg-white text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500
          min-w-[220px]
        "
      >
        <option value="">
          Стандартный тариф
        </option>

        {clients.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
