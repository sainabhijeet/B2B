import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/forms/FormInput";
import { FormSelect, type FormSelectOption } from "@/components/forms/FormSelect";

export type ImageDraft = {
  key: string;
  url: string;
  isThumbnail: boolean;
  /** null = product-level; number = variant row index */
  variantRowIndex: number | null;
};

type Props = {
  images: ImageDraft[];
  onChange: (next: ImageDraft[]) => void;
  variantRowLabels: string[];
  disabled?: boolean;
};

function randomKey(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `img-${Date.now()}`;
}

export function ImageUploader({ images, onChange, variantRowLabels, disabled }: Props) {
  const scopeOptions: FormSelectOption[] = [
    { value: "", label: "Product (all variants)" },
    ...variantRowLabels.map((label, i) => ({ value: String(i), label: `Variant: ${label || `#${i + 1}`}` })),
  ];

  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold text-slate-800">Images</legend>
      <p className="text-xs text-slate-600">
        Paste HTTPS URLs (CDN or storage). Size is estimated as 0.01 MB if unknown. Variant images attach after variants
        are saved (create flow maps by row order).
      </p>
      <div className="space-y-3">
        {images.map((img, i) => (
          <div key={img.key} className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <FormInput
                id={`img-url-${img.key}`}
                label="Image URL"
                placeholder="https://cdn.example.com/ring-front.jpg"
                value={img.url}
                disabled={disabled}
                onChange={(e) =>
                  onChange(images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                }
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <FormSelect
                  id={`img-scope-${img.key}`}
                  label="Attach to"
                  options={scopeOptions}
                  value={img.variantRowIndex == null ? "" : String(img.variantRowIndex)}
                  disabled={disabled}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange(
                      images.map((x, j) =>
                        j === i ? { ...x, variantRowIndex: v === "" ? null : Number(v) } : x,
                      ),
                    );
                  }}
                />
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={img.isThumbnail}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(images.map((x, j) => (j === i ? { ...x, isThumbnail: e.target.checked } : x)))
                    }
                  />
                  Thumbnail
                </label>
              </div>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(images.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
              aria-label="Remove image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          onChange([
            ...images,
            { key: randomKey(), url: "", isThumbnail: images.length === 0, variantRowIndex: null },
          ])
        }
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add image row
      </Button>
    </fieldset>
  );
}
