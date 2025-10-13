/**
 * Utility functions for PDF viewer functionality
 */

export interface PdfViewerOptions {
  imageId: string;
  loanId: string;
  file?: string;
  useEnhancedViewer?: boolean;
}

/**
 * Opens the PDF viewer in a new window
 * @param options - Configuration options for the PDF viewer
 */
export const openPdfViewer = (options: PdfViewerOptions): Window | null => {
  const { imageId, loanId, file = "", useEnhancedViewer = true } = options;

  // Choose which viewer to use
  const viewerPath = useEnhancedViewer
    ? "/assets/pdf-viewer/viewer.html"
    : "/assets/pdf-viewer/viewer.html";

  // Construct the URL with query parameters
  const utilUrl = `${viewerPath}?imageId=${imageId}&loanID=${loanId}&File=${file}`;

  // Open in new window with specific features
  const newWindow = window.open(
    utilUrl,
    "_blank",
    "resizable=yes,scrollbars=yes,width=1200,height=800"
  );

  return newWindow;
};

/**
 * Opens the integrated PDF viewer page within the application
 * @param options - Configuration options for the PDF viewer
 */
export const navigateToPdfViewer = (options: PdfViewerOptions): string => {
  const { imageId, loanId, file = "" } = options;

  // Construct the internal route URL
  const url = `/pdf-viewer?imageId=${imageId}&loanID=${loanId}&File=${file}`;

  return url;
};

/**
 * Example usage for opening PDF viewer from a loan document
 */
export const openLoanDocumentPdf = (
  loanDoc: { imageId: string },
  loanId: string
): Window | null => {
  return openPdfViewer({
    imageId: loanDoc.imageId,
    loanId: loanId,
    useEnhancedViewer: true,
  });
};

/**
 * Communication message types for PDF viewer
 */
export interface PdfViewerMessage {
  cmd: "find-new" | "find-next" | "clear-highlights";
  query?: string;
  prev?: boolean;
  highlightAll?: boolean;
  caseSensitive?: boolean;
  entireWord?: boolean;
  phraseSearch?: boolean;
}

/**
 * Send a message to a PDF viewer window
 * @param targetWindow - The PDF viewer window
 * @param message - The message to send
 */
export const sendMessageToPdfViewer = (
  targetWindow: Window,
  message: PdfViewerMessage
): void => {
  if (targetWindow && !targetWindow.closed) {
    targetWindow.postMessage(message, "*");
  }
};

/**
 * Schema field interface for PDF highlighting
 */
export interface SchemaField {
  key: string;
  label: string;
  value: string;
  type: string;
}

/**
 * Extract search term from a form control value
 * @param value - The form control value
 * @param field - The schema field definition
 * @returns Cleaned search term
 */
export const extractSearchTerm = (
  value: string | null | undefined,
  field: SchemaField
): string => {
  const searchValue = value || field.value || "";
  return searchValue.trim();
};
