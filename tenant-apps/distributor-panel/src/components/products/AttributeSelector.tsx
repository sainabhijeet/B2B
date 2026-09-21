import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import type { AttrDef } from "@/components/products/variantUtils";

type Props = {
  attributes: AttrDef[];
  onChange: (next: AttrDef[]) => void;
  disabled?: boolean;
};

export function AttributeSelector({ attributes, onChange, disabled }: Props) {
  function addRow() {
    onChange([...attributes, { name: "", values: [] }]);
  }

  function updateRow(index: number, patch: Partial<AttrDef>) {
    onChange(attributes.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  function removeRow(index: number) {
    onChange(attributes.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-slate-800">Attributes</legend>
      <p className="text-xs text-slate-600">
        Example: Color → values <span className="font-mono">Red, Blue</span>; Size →{" "}
        <span className="font-mono">S, M, L</span>. Use <strong>Generate variants</strong> in the variants section to
        expand combinations.
      </p>
      <div className="space-y-3">
        {attributes.map((row, i) => (
          <div
            key={i}
            className="grid gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_1.5fr_auto]"
          >
            <FormInput
              id={`attr-name-${i}`}
              label="Attribute name"
              placeholder="Color"
              value={row.name}
              disabled={disabled}
              onChange={(e) => updateRow(i, { name: e.target.value })}
            />
            <FormInput
              id={`attr-values-${i}`}
              label="Values (comma-separated)"
              placeholder="Red, Blue, Green"
              value={row.values.join(", ")}
              disabled={disabled}
              onChange={(e) =>
                updateRow(i, {
                  values: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <div className="flex items-end">
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeRow(i)}
                className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                aria-label="Remove attribute"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" disabled={disabled} onClick={addRow}>
        <Plus className="h-4 w-4" aria-hidden />
        Add attribute
      </Button>
    </fieldset>
  );
}
