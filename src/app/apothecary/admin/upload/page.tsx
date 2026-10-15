import type { Metadata } from "next";
import { AdminUploadForm } from "./AdminUploadForm";

export const metadata: Metadata = { title: "Apothecary upload", robots: { index: false, follow: false } };

// Private, unstyled admin page. Every write still requires the admin token, which is asked for at runtime.
export default function AdminUploadPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-12 pt-6">
      <h1>Apothecary admin upload</h1>
      <AdminUploadForm />
    </main>
  );
}
