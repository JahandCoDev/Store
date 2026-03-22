"use client";

import { useEffect, useMemo, useState } from "react";

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

type Consent = {
  emailMarketingOptIn: boolean;
  smsMarketingOptIn?: boolean;
} | null;

type Customer = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  tags: string[];
  consent: Consent;
  addresses: Address[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CustomerEditor({ customerId }: { customerId: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

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
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const apiError = isRecord(data) && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || "Failed to load customer");
      }
      const data: unknown = await res.json();
      if (!isRecord(data)) throw new Error("Failed to load customer");

      const consentObj = isRecord(data.consent) ? data.consent : null;
      const consent: Consent = consentObj
        ? {
            emailMarketingOptIn: !!consentObj.emailMarketingOptIn,
            smsMarketingOptIn:
              typeof consentObj.smsMarketingOptIn === "boolean" ? consentObj.smsMarketingOptIn : undefined,
          }
        : null;

      const mapped: Customer = {
        id: typeof data.id === "string" ? data.id : "",
        email: typeof data.email === "string" ? data.email : "",
        phone: typeof data.phone === "string" ? data.phone : null,
        firstName: typeof data.firstName === "string" ? data.firstName : null,
        lastName: typeof data.lastName === "string" ? data.lastName : null,
        dateOfBirth: typeof data.dateOfBirth === "string" ? data.dateOfBirth : null,
        tags: Array.isArray(data.tags) ? (data.tags.filter((t) => typeof t === "string") as string[]) : [],
        consent,
        addresses: Array.isArray(data.addresses) ? (data.addresses as Address[]) : [],
      };

      setCustomer(mapped);
      setFirstName(mapped.firstName ?? "");
      setLastName(mapped.lastName ?? "");
      setPhone(mapped.phone ?? "");
      setDob(toDateInputValue(mapped.dateOfBirth));
      setEmailMarketingOptIn(!!mapped.consent?.emailMarketingOptIn);
      setSmsMarketingOptIn(!!mapped.consent?.smsMarketingOptIn);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const fullName = useMemo(() => {
    const base = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    return base || "—";
  }, [firstName, lastName]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          dateOfBirth: dob ? `${dob}T00:00:00.000Z` : "",
          consent: {
            emailMarketingOptIn,
            smsMarketingOptIn,
          },
        }),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const apiError = isRecord(data) && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || "Failed to save");
      }
      setSuccess("Saved.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 1500);
    }
  }

  async function createAddress(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/customers/${customerId}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const data: unknown = await res.json().catch(() => ({}));
        const apiError = isRecord(data) && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || "Failed to add address");
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
      setError(getErrorMessage(e) || "Failed to add address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 1500);
    }
  }

  async function updateAddress(addressId: string, patch: Partial<Address>) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/customers/${customerId}/addresses/${addressId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const apiError = isRecord(data) && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || "Failed to update address");
      }
      setSuccess("Address updated.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to update address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 1500);
    }
  }

  async function deleteAddress(addressId: string) {
    if (!confirm("Delete this address?")) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/customers/${customerId}/addresses/${addressId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const apiError = isRecord(data) && typeof data.error === "string" ? data.error : null;
        throw new Error(apiError || "Failed to delete address");
      }
      setSuccess("Address deleted.");
      await load();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to delete address");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(""), 1500);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400">Loading customer…</p>;
  }

  if (!customer) {
    return <p className="text-sm text-red-400">{error || "Customer not found."}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Edit Details</h2>
        <form onSubmit={saveProfile} className="mt-4 grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="+1 (555) 123-4567"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">Date of birth</span>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid gap-2">
            <div className="text-sm text-gray-200">
              <span className="text-gray-400">Email:</span> {customer.email}
            </div>
            <div className="text-sm text-gray-200">
              <span className="text-gray-400">Name:</span> {fullName}
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Marketing</div>
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={emailMarketingOptIn}
                onChange={(e) => setEmailMarketingOptIn(e.target.checked)}
              />
              Email marketing opt-in
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={smsMarketingOptIn}
                onChange={(e) => setSmsMarketingOptIn(e.target.checked)}
              />
              SMS marketing opt-in
            </label>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-green-300">{success}</p> : null}

          <div className="flex justify-end">
            <button
              disabled={saving}
              className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
              type="submit"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Addresses</h2>

        <div className="mt-4 space-y-3">
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-gray-400">No addresses yet.</p>
          ) : (
            customer.addresses.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-800 bg-gray-950 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-200">
                    {a.name || "Address"} {a.isDefault ? <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-200">Default</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.isDefault ? (
                      <button
                        type="button"
                        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700"
                        disabled={saving}
                        onClick={() => void updateAddress(a.id, { isDefault: true })}
                      >
                        Make default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-md border border-red-900/50 bg-red-900/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-900/20"
                      disabled={saving}
                      onClick={() => void deleteAddress(a.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-300">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.zip}
                  <br />
                  {a.country}
                  {a.phone ? (
                    <>
                      <br />
                      {a.phone}
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={createAddress} className="mt-6 grid gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">Add address</div>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Name / label</span>
            <input
              value={newAddress.name}
              onChange={(e) => setNewAddress((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="Home"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Address line 1</span>
            <input
              required
              value={newAddress.line1}
              onChange={(e) => setNewAddress((s) => ({ ...s, line1: e.target.value }))}
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="123 Main St"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-gray-400">Address line 2</span>
            <input
              value={newAddress.line2}
              onChange={(e) => setNewAddress((s) => ({ ...s, line2: e.target.value }))}
              className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="Apt 4B"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">City</span>
              <input
                required
                value={newAddress.city}
                onChange={(e) => setNewAddress((s) => ({ ...s, city: e.target.value }))}
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">State</span>
              <input
                required
                value={newAddress.state}
                onChange={(e) => setNewAddress((s) => ({ ...s, state: e.target.value }))}
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">ZIP</span>
              <input
                required
                value={newAddress.zip}
                onChange={(e) => setNewAddress((s) => ({ ...s, zip: e.target.value }))}
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">Country</span>
              <input
                value={newAddress.country}
                onChange={(e) => setNewAddress((s) => ({ ...s, country: e.target.value }))}
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-gray-400">Phone</span>
              <input
                value={newAddress.phone}
                onChange={(e) => setNewAddress((s) => ({ ...s, phone: e.target.value }))}
                className="w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={newAddress.isDefault}
              onChange={(e) => setNewAddress((s) => ({ ...s, isDefault: e.target.checked }))}
            />
            Set as default
          </label>

          <div className="flex justify-end">
            <button
              disabled={saving}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-60"
              type="submit"
            >
              {saving ? "Adding…" : "Add address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
