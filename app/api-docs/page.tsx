import { notFound } from "next/navigation";

export default function ApiDocs() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="w-full h-screen">
      <iframe
        src="/swagger.html"
        className="w-full h-full border-none"
        title="API Documentation"
      />
    </div>
  );
}
