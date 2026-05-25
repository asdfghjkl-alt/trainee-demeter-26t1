export default function PrivacyPage() {
  return (
    <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-8 sm:p-12 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Privacy & Data Handling
        </h1>
        
        <div className="prose prose-cyan dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
          <p className="text-lg">
            Because Rendezvous deals with real-time geolocation data, privacy is a core architectural consideration. We have designed this application to respect your location data and limit what we store.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">
              Ephemeral Rooms
            </h2>
            <p>
              Meeting rooms and the associated location data are designed to be ephemeral and session-based. The data only exists to serve the active planning session for you and your group.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">
              No Persistent Tracking
            </h2>
            <p>
              Participant live GPS locations are only broadcasted to the active room lobby to facilitate the meeting. This information is <strong>never permanently logged</strong> or tracked after the meeting is finalized or the session expires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">
              API Data Sharing
            </h2>
            <p>
              To accurately calculate travel times and route matrices, coordinates are strictly sent to our trusted routing partners (Mapbox, Targomo, TfNSW, HERE). 
              <strong> No personally identifiable information (PII)</strong> is attached to these external API requests. They only receive the raw geographic coordinates necessary to calculate travel durations and shapes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8 mb-4">
              Third-Party APIs
            </h2>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Mapbox:</strong> Used for map rendering, search, and driving/walking isochrones.</li>
              <li><strong>TfNSW:</strong> Used for real-time public transit routing within NSW, Australia.</li>
              <li><strong>HERE:</strong> Used as a global transit routing fallback.</li>
              <li><strong>Targomo:</strong> Used for generating accurate public transit boundary polygons.</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
