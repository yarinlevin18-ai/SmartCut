import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductsPageClient } from "@/components/sections/ProductsPageClient";
import { getProducts } from "@/lib/actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "מוצרים",
  description:
    "הקולקציה שלנו: שמני זקן, ווקסים ואביזרי טיפוח שאנחנו עובדים איתם בסטודיו.",
};

export default async function ProductsPage() {
  const result = await getProducts();
  const products = result.success && result.data ? result.data : [];

  return (
    <>
      <Navbar />
      <ProductsPageClient products={products} />
      <Footer />
    </>
  );
}
