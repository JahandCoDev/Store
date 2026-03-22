"use client";

import { useEffect, useState } from "react";

type Address = {
  id: string;
  name: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

type Customer = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  consent: {
    emailMarketingOptIn: boolean;
    smsMarketingOptIn?: boolean;
  } | null;
  addresses: Address[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asAddressArray(value: unknown): Address[] {
  if (!Array.isArray(value)) return [];
  const addresses: Address[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = asString(item.id);
    const line1 = asString(item.line1);
    const city = asString(item.city);
    const state = asString(item.state);
    const zip = asString(item.zip);
    const country = asString(item.country);
    const isDefault = asBoolean(item.isDefault);
    if (!id || !line1 || !city || !state || !zip || !country || isDefault === null) continue;

    addresses.push({
      id,
      name: asString(item.name),
      line1,
      line2: asString(item.line2),
      city,
      state,
      zip,
      country,
      phone: asString(item.phone),
      isDefault,
    });
  }
  return addresses;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AccountProfileEditor({ store }: { store: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [emailMarketingOptIn, setEmailMarketingOptIn] = useState(false);
  const [smsMarketingOptIn, setSmsMarketingOptIn] = useState(false);

  const [newAddress, setNewAddress] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
    isDefault: false,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/account/me?store=${encodeURIComponent(store)}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to load profile");
      }
      const json: unknown = await res.json();
      if (!isRecord(json)) throw new Error("Invalid profile response");

      const id = asString(json.id);
      const email = asString(json.email);
      if (!id || !email) throw new Error("Invalid profile response");

      const consent = isRecord(json.consent)
        ? {
            emailMarketingOptIn: asBoolean(json.consent.emailMarketingOptIn) ?? false,
            smsMarketingOptIn: asBoolean(json.consent.smsMarketingOptIn) ?? false,
          }
        : null;

      const mapped: Customer = {
        id,
        email,
        phone: asString(json.phone),
        firstName: asString(json.firstName),
        lastName: asString(json.lastName),
        dateOfBirth: asString(json.dateOfBirth),
        consent,
        addresses: asAddressArray(json.addresses),
      };
      setCustomer(mapped);
      setFirstName(mapped.firstName ?? "");
      setLastName(mapped.lastName ?? "");
      setPhone(mapped.phone ?? "");
      setDob(toDateInputValue(mapped.dateOfBirth));
      setEmailMarketingOptIn(!!mapped.consent?.emailMarketingOptIn);
      setSmsMarketingOptIn(!!mapped.consent?.smsMarketingOptIn);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/storefront/account/me?store=${encodeURIComponent(store)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          dateOfBirth: dob ? `${dob}T00:00:00.000Z` : "",
          consent: { emailMarketingOptIn, smsMarketingOptIn },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save profile");
      }

      setSuccess("Saved.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 1500);
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/storefront/account/me/addresses?store=${encodeURIComponent(store)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...newAddress,
          name: newAddress.name.trim(),
          line1: newAddress.line1.trim(),
          line2: newAddress.line2.trim(),
          city: newAddress.city.trim(),
          state: newAddress.state.trim(),
          zip: newAddress.zip.trim(),
          country: newAddress.country.trim() || "US",
          phone: newAddress.phone.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to add address");
      }

      setNewAddress({
        name: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        zip: "",
        country: "US",
        phone: "",
        isDefault: false,
      });

      setSuccess("Address added.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 1500);
    }
  }

  async function makeDefault(addressId: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/storefront/account/me/addresses/${addressId}?store=${encodeURIComponent(store)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isDefault: true }),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to update address");
      }
      setSuccess("Updated.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 1500);
    }
  }

  async function removeAddress(addressId: string) {
    if (!confirm("Delete this address?") ) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/storefront/account/me/addresses/${addressId}?store=${encodeURIComponent(store)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to delete address");
      }
      setSuccess("Deleted.");
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 1500);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading profile…</p>;
  }

  if (!customer) {
    return <p className="text-sm text-red-200">{error || "Failed to load profile."}</p>;
  }

  return (
    <div className="mt-8 grid gap-6 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Profile</h2>
        <p className="mt-1 text-sm text-zinc-400">Update your details and preferences.</p>
      </div>

      <form onSubmit={saveProfile} className="grid gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">First name</span>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Last name</span>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="+1 (555) 123-4567"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Date of birth</span>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
        </div>

        <div className="text-sm text-zinc-400">
          <span className="text-zinc-500">Email:</span> {customer.email}
        </div>

        <div className="grid gap-2 rounded-lg border border-white/10 bg-zinc-950/60 p-4">
          <div className="text-sm font-medium text-white">Marketing</div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={emailMarketingOptIn} onChange={(e) => setEmailMarketingOptIn(e.target.checked)} />
            Email marketing opt-in
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={smsMarketingOptIn} onChange={(e) => setSmsMarketingOptIn(e.target.checked)} />
            SMS marketing opt-in
          </label>
        </div>

        {error ? <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
        {success ? <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{success}</div> : null}

        <div className="flex justify-end">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-sm font-semibold text-white">Addresses</h3>

        <div className="mt-3 grid gap-3">
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-zinc-400">No addresses yet.</p>
          ) : (
            customer.addresses.map((a) => (
              <div key={a.id} className="rounded-lg border border-white/10 bg-zinc-950/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">
                    {a.name || "Address"}{" "}
                    {a.isDefault ? <span className="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-zinc-200">Default</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.isDefault ? (
                      <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void makeDefault(a.id)}>
                        Make default
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void removeAddress(a.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-zinc-300">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.zip}
                  <br />
                  {a.country}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={addAddress} className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-zinc-950/60 p-4">
          <div className="text-sm font-medium text-white">Add address</div>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Name / label</span>
            <input
              value={newAddress.name}
              onChange={(e) => setNewAddress((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Home"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Address line 1</span>
            <input
              required
              value={newAddress.line1}
              onChange={(e) => setNewAddress((s) => ({ ...s, line1: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Address line 2</span>
            <input
              value={newAddress.line2}
              onChange={(e) => setNewAddress((s) => ({ ...s, line2: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">City</span>
              <input
                required
                value={newAddress.city}
                onChange={(e) => setNewAddress((s) => ({ ...s, city: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">State</span>
              <input
                required
                value={newAddress.state}
                onChange={(e) => setNewAddress((s) => ({ ...s, state: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">ZIP</span>
              <input
                required
                value={newAddress.zip}
                onChange={(e) => setNewAddress((s) => ({ ...s, zip: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Country</span>
              <input
                value={newAddress.country}
                onChange={(e) => setNewAddress((s) => ({ ...s, country: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Phone</span>
              <input
                value={newAddress.phone}
                onChange={(e) => setNewAddress((s) => ({ ...s, phone: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={newAddress.isDefault}
              onChange={(e) => setNewAddress((s) => ({ ...s, isDefault: e.target.checked }))}
            />
            Set as default
          </label>

          <div className="flex justify-end">
            <button className="btn btn-secondary" type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
