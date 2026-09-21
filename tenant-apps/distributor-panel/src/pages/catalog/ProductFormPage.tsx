import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ProductForm } from "@/components/products/ProductForm";
import { useAuth } from "@/hooks/useAuth";

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { staffReadOnly } = useAuth();

  const isCreate = pathname.includes("/create");
  const mode = isCreate ? "create" : "edit";
  const productId = isCreate ? undefined : id;

  return (
    <ProductForm
      mode={mode}
      productId={productId}
      staffReadOnly={staffReadOnly}
      onSaved={() => navigate(isCreate ? "/catalog/products" : `/catalog/products/${productId}`)}
    />
  );
}
