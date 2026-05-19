export default function ApiDocs() {
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
