import React, { useRef, useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Download,
} from "lucide-react";
import { Button } from "../ui/button";
import type { FieldCoordinate } from "../../services/orderSchemaService";

declare global {
  interface Window {
    PDFViewerApplication?: any;
  }
}

export interface PdfViewerProps {
  documentUrl: string;
  onDocumentLoad?: (totalPages: number) => void;
  onPageChange?: (currentPage: number) => void;
  highlightCoordinates?: FieldCoordinate | null;
  className?: string;
}

export interface PdfViewerHandle {
  highlightRegion: (coordinates: FieldCoordinate) => void;
  clearHighlights: () => void;
  goToPage: (pageNumber: number) => void;
  getCurrentPage: () => number;
  getTotalPages: () => number;
}

export const PdfViewer = React.forwardRef<PdfViewerHandle, PdfViewerProps>(
  (
    {
      documentUrl,
      onDocumentLoad,
      onPageChange,
      highlightCoordinates,
      className,
    },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [error, setError] = useState<string | null>(null);

    // Expose methods through ref
    React.useImperativeHandle(ref, () => ({
      highlightRegion: (coordinates: FieldCoordinate) => {
        highlightRegionInPdf(coordinates);
      },
      clearHighlights: () => {
        clearPdfHighlights();
      },
      goToPage: (pageNumber: number) => {
        goToPage(pageNumber);
      },
      getCurrentPage: () => currentPage,
      getTotalPages: () => totalPages,
    }));

    useEffect(() => {
      if (!documentUrl) return;

      loadPdfDocument();
    }, [documentUrl]);

    useEffect(() => {
      if (highlightCoordinates) {
        highlightRegionInPdf(highlightCoordinates);
      }
    }, [highlightCoordinates]);

    const loadPdfDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (iframeRef.current) {
          // Construct PDF viewer URL with the document
          const encodedUrl = encodeURIComponent(documentUrl);
          const viewerUrl = `/assets/pdf-viewer/viewer.html?file=${encodedUrl}`;

          iframeRef.current.src = viewerUrl;

          // Listen for messages from the PDF viewer
          const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "pdf-loaded") {
              setTotalPages(event.data.totalPages);
              setIsLoading(false);
              onDocumentLoad?.(event.data.totalPages);
            } else if (event.data?.type === "page-changed") {
              setCurrentPage(event.data.pageNumber);
              onPageChange?.(event.data.pageNumber);
            } else if (event.data?.type === "pdf-error") {
              setError(event.data.message || "Failed to load PDF");
              setIsLoading(false);
            }
          };

          window.addEventListener("message", handleMessage);

          // Cleanup listener
          return () => {
            window.removeEventListener("message", handleMessage);
          };
        }
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setError("Failed to load PDF document");
        setIsLoading(false);
      }
    };

    const sendMessageToViewer = (message: any) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(message, "*");
      }
    };

    const highlightRegionInPdf = (coordinates: FieldCoordinate) => {
      sendMessageToViewer({
        type: "highlight-region",
        coordinates: {
          x: coordinates.x,
          y: coordinates.y,
          width: coordinates.width,
          height: coordinates.height,
          page: coordinates.page,
        },
      });
    };

    const clearPdfHighlights = () => {
      sendMessageToViewer({
        type: "clear-highlights",
      });
    };

    const goToPage = (pageNumber: number) => {
      if (pageNumber >= 1 && pageNumber <= totalPages) {
        sendMessageToViewer({
          type: "go-to-page",
          pageNumber,
        });
      }
    };

    const handleZoomIn = () => {
      const newZoom = Math.min(zoomLevel + 25, 300);
      setZoomLevel(newZoom);
      sendMessageToViewer({
        type: "zoom",
        level: newZoom,
      });
    };

    const handleZoomOut = () => {
      const newZoom = Math.max(zoomLevel - 25, 50);
      setZoomLevel(newZoom);
      sendMessageToViewer({
        type: "zoom",
        level: newZoom,
      });
    };

    const handlePreviousPage = () => {
      if (currentPage > 1) {
        goToPage(currentPage - 1);
      }
    };

    const handleNextPage = () => {
      if (currentPage < totalPages) {
        goToPage(currentPage + 1);
      }
    };

    const handleRotate = () => {
      sendMessageToViewer({
        type: "rotate",
      });
    };

    const handleDownload = () => {
      if (documentUrl) {
        const link = document.createElement("a");
        link.href = documentUrl;
        link.download = "document.pdf";
        link.click();
      }
    };

    return (
      <div className={`flex flex-col bg-gray-100 ${className}`}>
        {/* PDF Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            {/* Page Navigation */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm font-medium px-3">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <span className="text-sm font-medium px-2 min-w-[60px] text-center">
              {zoomLevel}%
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 300}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            {/* Additional Controls */}
            <div className="w-px h-6 bg-gray-300 mx-2" />

            <Button variant="outline" size="sm" onClick={handleRotate}>
              <RotateCw className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Viewer Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF document...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center text-red-600">
                <p className="text-lg font-semibold mb-2">Error loading PDF</p>
                <p className="text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPdfDocument}
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            title="PDF Viewer"
            sandbox="allow-scripts allow-same-origin allow-downloads"
            style={{ display: isLoading || error ? "none" : "block" }}
          />
        </div>
      </div>
    );
  }
);

PdfViewer.displayName = "PdfViewer";

export default PdfViewer;
