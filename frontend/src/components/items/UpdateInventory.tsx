import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../features/backend/api";

type InventoryOption = {
  product_id: string;
  fixed_sku: string;
  product_name: string;
  quantity: number;
  cost_per_unit: number;
  mrp: number;
  gst_hsn_code: string;
  gst_rate: number;
};

type InventoryResponse = {
  data?: {
    data?: InventoryOption[];
  } | InventoryOption[];
};

type AddStockResponse = {
  status?: string;
  message?: string;
};

const formatOption = (item: InventoryOption) =>
  `${item.fixed_sku} - ${item.product_name} (${item.product_id})`;

const UpdateInventory: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<InventoryOption[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<InventoryOption | null>(null);
  const [quantityAdded, setQuantityAdded] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [remark, setRemark] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoadingOptions(true);
        const response = await apiRequest<InventoryResponse>(
          `/inventory?per_page=100&search=${encodeURIComponent(searchTerm.trim())}`
        );
        const payload = response.data;
        if (Array.isArray(payload)) {
          setOptions(payload);
        } else {
          setOptions(payload?.data || []);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load inventory list.");
      } finally {
        setLoadingOptions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;
    return options.filter((item) =>
      formatOption(item).toLowerCase().includes(query)
    );
  }, [options, searchTerm]);

  const canSubmit = useMemo(() => {
    return Boolean(selectedInventory)
      && Number(quantityAdded) > 0
      && Number(costPerUnit) > 0
      && !isSubmitting;
  }, [selectedInventory, quantityAdded, costPerUnit, isSubmitting]);

  const handleSelect = (item: InventoryOption) => {
    setSelectedInventory(item);
    setSearchTerm(formatOption(item));
    setDropdownOpen(false);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedInventory) {
      setError("Please select an inventory item.");
      return;
    }

    if (Number(quantityAdded) <= 0) {
      setError("Quantity added must be greater than 0.");
      return;
    }

    if (Number(costPerUnit) <= 0) {
      setError("Cost per unit must be greater than 0.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiRequest<AddStockResponse>("/inventory/add-stock", {
        method: "POST",
        body: JSON.stringify({
          product_id: selectedInventory.product_id,
          sku_fixed: selectedInventory.fixed_sku,
          quantity: Number(quantityAdded),
          cost_per_unit: Number(costPerUnit),
          notes: remark.trim() || null,
        }),
      });

      setSuccess(response.message || "Inventory updated successfully.");
      setQuantityAdded("");
      setCostPerUnit("");
      setRemark("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update inventory.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-8 px-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="app-page-title text-text-primary">Update Inventory</h2>
            <p className="mt-1 app-body-normal text-text-secondary">
              Search an existing inventory item, then add stock with cost per unit and optional notes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-border px-4 py-2 app-body-small text-text-primary hover:bg-gray-50"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 app-body-normal text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 app-body-normal text-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 relative">
            <label className="mb-1 block app-label text-text-primary">Search Inventory Item</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setDropdownOpen(true);
                setSelectedInventory(null);
                setError("");
                setSuccess("");
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search by fixed sku, product id, or name"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
            />
            {dropdownOpen && (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg">
                {loadingOptions ? (
                  <div className="px-4 py-3 app-body-normal text-text-secondary">Loading inventory...</div>
                ) : filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 app-body-normal text-text-secondary">No inventory items found.</div>
                ) : (
                  filteredOptions.map((item) => (
                    <button
                      type="button"
                      key={`${item.product_id}-${item.fixed_sku}`}
                      onClick={() => handleSelect(item)}
                      className="block w-full border-b border-gray-100 px-4 py-3 text-left app-body-normal text-text-primary hover:bg-gray-50 last:border-b-0"
                    >
                      <div className="font-semibold">{formatOption(item)}</div>
                      <div className="mt-1 text-sm text-text-secondary">
                        Stock: {item.quantity} | Cost: {item.cost_per_unit} | MRP: {item.mrp}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedInventory && (
              <div className="mt-2 rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
                Selected by SKU Fixed: {formatOption(selectedInventory)}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Quantity Added</label>
            <input
              type="number"
              value={quantityAdded}
              onChange={(event) => setQuantityAdded(event.target.value)}
              min={1}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter quantity added"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Cost Per Unit</label>
            <input
              type="number"
              value={costPerUnit}
              onChange={(event) => setCostPerUnit(event.target.value)}
              min={0.01}
              step="0.01"
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter cost per unit"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block app-label text-text-primary">Remarks</label>
            <textarea
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Optional notes"
            />
          </div>

          <div className="md:col-span-2 mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand-500 px-6 py-3 app-button text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateInventory;
