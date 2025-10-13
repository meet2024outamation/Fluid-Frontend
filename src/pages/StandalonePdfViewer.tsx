import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const StandalonePdfViewer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [viewerUrl, setViewerUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const pdfUrl = searchParams.get("pdfUrl");

    if (!pdfUrl) {
      setError("No PDF URL provided");
      return;
    }

    try {
      // Construct the enhanced viewer URL
      const encodedUrl = encodeURIComponent(pdfUrl);
      const enhancedViewerUrl = `/assets/pdf-viewer/enhanced-viewer.html?file=${encodedUrl}`;

      console.log("Standalone PDF Viewer:");
      console.log("- PDF URL:", pdfUrl);
      console.log("- Viewer URL:", enhancedViewerUrl);

      setViewerUrl(enhancedViewerUrl);
    } catch (err) {
      console.error("Error setting up PDF viewer:", err);
      setError("Failed to load PDF viewer");
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!viewerUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <iframe
        src={viewerUrl}
        className="w-full h-full border-none"
        title="PDF Viewer"
        allow="same-origin"
      />
    </div>
  );
};

export default StandalonePdfViewer;
