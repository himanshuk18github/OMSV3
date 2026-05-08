import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../features/backend/api";

type AvailabilityResponse = {
  data?: {
    product_id_available?: boolean;
    sku_fixed_available?: boolean;
  };
};

type CreateProductResponse = {
  status?: string;
  message?: string;
};

type FormDataState = {
  product_id: string;
  sku_fixed: string;
  product_name: string;
  quantity: string;
  cost_per_unit: string;
  total_cost: string;
  mrp: string;
  gst_hsn_code: string;
  gst_rate: string;
};

const GST_OPTIONS = ["0", "5", "12", "18", "28"];

const emptyForm: FormDataState = {
  product_id: "",
  sku_fixed: "",
  product_name: "",
  quantity: "",
  cost_per_unit: "",
  total_cost: "",
  mrp: "",
  gst_hsn_code: "",
  gst_rate: "",
};

const AddItem: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormDataState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [productIdAvailable, setProductIdAvailable] = useState<boolean | null>(null);
  const [skuFixedAvailable, setSkuFixedAvailable] = useState<boolean | null>(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const calculateTotalCost = (quantity: string, costPerUnit: string) => {
    const qty = Number(quantity) || 0;
    const cost = Number(costPerUnit) || 0;
    return (qty * cost).toFixed(2);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "product_id") {
      value = value.replace(/\D/g, "");
    }
    setFormError("");
    setSuccessMessage("");

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "quantity" || name === "cost_per_unit") {
        updated.total_cost = calculateTotalCost(updated.quantity, updated.cost_per_unit);
      }
      return updated;
    });
  };

  useEffect(() => {
    const productId = formData.product_id.trim();
    const skuFixed = formData.sku_fixed.trim();

    setProductIdAvailable(null);
    setSkuFixedAvailable(null);

    if (!productId || !skuFixed) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingAvailability(true);
        const response = await apiRequest<AvailabilityResponse>(
          `/inventory/availability?product_id=${encodeURIComponent(productId)}&sku_fixed=${encodeURIComponent(skuFixed)}`
        );

        setProductIdAvailable(Boolean(response.data?.product_id_available));
        setSkuFixedAvailable(Boolean(response.data?.sku_fixed_available));
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Failed to validate uniqueness.");
      } finally {
        setIsCheckingAvailability(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.product_id, formData.sku_fixed]);

  const allMandatoryFilled = useMemo(() => {
    return Object.values(formData).every((value) => String(value).trim() !== "");
  }, [formData]);

  const canSubmit = allMandatoryFilled
    && productIdAvailable === true
    && skuFixedAvailable === true
    && !isSubmitting
    && !isCheckingAvailability;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    if (!allMandatoryFilled) {
      setFormError("All fields are mandatory.");
      return;
    }

    if (productIdAvailable !== true || skuFixedAvailable !== true) {
      setFormError("Product ID and SKU Fixed must both be available before submit.");
      return;
    }

    try {
      setIsSubmitting(true);

      await apiRequest<CreateProductResponse>("/inventory/items", {
        method: "POST",
        body: JSON.stringify({
          product_id: formData.product_id.trim(),
          sku_fixed: formData.sku_fixed.trim(),
          product_name: formData.product_name.trim(),
          quantity: Number(formData.quantity),
          cost_per_unit: Number(formData.cost_per_unit),
          mrp: Number(formData.mrp),
          gst_hsn_code: formData.gst_hsn_code.trim(),
          gst_rate: Number(formData.gst_rate),
        }),
      });

      setSuccessMessage("Item added successfully.");
      setFormData(emptyForm);
      setProductIdAvailable(null);
      setSkuFixedAvailable(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to add item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="my-8 px-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="app-page-title text-text-primary">Add Product Item</h2>
            <p className="mt-1 app-body-normal text-text-secondary">
              All fields are mandatory. Submit is enabled only after Product ID and SKU Fixed are available.
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

        {formError && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 app-body-normal text-error">
            {formError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 app-body-normal text-success">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block app-label text-text-primary">Product ID</label>
            <input
              type="text"
              inputMode="numeric"
              name="product_id"
              value={formData.product_id}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter product id"
            />
            {productIdAvailable === false && <p className="mt-1 app-body-small text-error">Product ID already exists in inventory.</p>}
            {productIdAvailable === true && <p className="mt-1 app-body-small text-success">Product ID is available.</p>}
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">SKU Fixed</label>
            <input
              type="text"
              name="sku_fixed"
              value={formData.sku_fixed}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter SKU fixed"
            />
            {skuFixedAvailable === false && <p className="mt-1 app-body-small text-error">SKU Fixed already exists in inventory.</p>}
            {skuFixedAvailable === true && <p className="mt-1 app-body-small text-success">SKU Fixed is available.</p>}
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Product Name</label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Quantity</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              min={1}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter quantity"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Cost Per Unit</label>
            <input
              type="number"
              name="cost_per_unit"
              value={formData.cost_per_unit}
              onChange={handleInputChange}
              min={0.01}
              step="0.01"
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter cost per unit"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">Total Cost</label>
            <input
              type="text"
              name="total_cost"
              value={formData.total_cost}
              readOnly
              required
              className="w-full rounded-lg border border-border bg-gray-50 px-3 py-2 app-body-normal text-text-secondary"
              placeholder="Auto-calculated"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">MRP</label>
            <input
              type="number"
              name="mrp"
              value={formData.mrp}
              onChange={handleInputChange}
              min={0.01}
              step="0.01"
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter MRP"
            />
          </div>

          <div>
            <label className="mb-1 block app-label text-text-primary">GST HSN Code</label>
            <input
              type="text"
              name="gst_hsn_code"
              value={formData.gst_hsn_code}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
              placeholder="Enter HSN code"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block app-label text-text-primary">GST Rate</label>
            <select
              name="gst_rate"
              value={formData.gst_rate}
              onChange={handleInputChange}
              required
              className="w-full rounded-lg border border-border bg-white px-3 py-2 app-body-normal text-text-primary outline-none focus:border-primary"
            >
              <option value="">Select GST rate</option>
              {GST_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand-500 px-6 py-3 app-button text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Submitting..."
                : isCheckingAvailability
                  ? "Checking availability..."
                  : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItem;