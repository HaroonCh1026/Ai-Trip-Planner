import { useState } from "react";
import { C } from "../../styles/colors";

/**
 * PDF export — captures a target DOM node into a multi-page PDF using
 * html2canvas + jsPDF, both lazy-loaded so they don't bloat the initial
 * bundle for free users who can't use this feature anyway.
 *
 * Pro-only. Free users see a locked button with a small "PRO" badge that
 * routes to the upgrade flow.
 *
 * Multi-page strategy: render the target as one tall image, then add it to
 * the PDF at progressively negative Y offsets across multiple A4 pages.
 * Far simpler than per-element pagination, and good enough for itineraries
 * which are mostly continuous content.
 */
export default function PdfExportButton({ trip, isPro, targetId, onUpgradeClick }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!isPro) {
      onUpgradeClick?.();
      return;
    }
    setError("");
    setBusy(true);
    try {
      // Lazy-load both libraries on first click. Webpack/Vite will create
      // a separate chunk for them.
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const node = document.getElementById(targetId);
      if (!node) {
        setError("Could not find itinerary content. Please refresh and try again.");
        setBusy(false);
        return;
      }

      // Rasterize. backgroundColor matters — without it, transparent areas
      // would render white in the PDF and clash with the dark UI design.
      // useCORS allows Cloudinary/Unsplash images. scale=2 gives crisper text.
      const canvas = await html2canvas(node, {
        backgroundColor: "#0d0d0d",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      const pdfWidthMm = pdf.internal.pageSize.getWidth();
      const pdfHeightMm = pdf.internal.pageSize.getHeight();

      // Compute image height in mm assuming we fit width to page width.
      const imgHeightMm = (canvas.height * pdfWidthMm) / canvas.width;

      // Slice into pdfHeightMm-sized chunks. We add the same image multiple
      // times with progressively negative Y offsets — each page only shows
      // the slice that lands within the page bounds.
      let remainingHeightMm = imgHeightMm;
      let positionMm = 0;
      pdf.addImage(imgData, "JPEG", 0, positionMm, pdfWidthMm, imgHeightMm);
      remainingHeightMm -= pdfHeightMm;
      while (remainingHeightMm > 0) {
        positionMm = positionMm - pdfHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, positionMm, pdfWidthMm, imgHeightMm);
        remainingHeightMm -= pdfHeightMm;
      }

      // Filename: "VoyageurAI-Hunza-Valley-2026-04-27.pdf"
      const safeDest = (trip?.destination || "trip").replace(/[^a-z0-9]+/gi, "-");
      const today = new Date().toISOString().slice(0, 10);
      pdf.save(`AI-Tour-Planner-${safeDest}-${today}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      setError("PDF export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label={isPro ? "Download itinerary as PDF" : "Download as PDF — Pro feature"}
        title={isPro ? "Download as PDF" : "PDF export is a Pro feature"}
        style={{
          padding: "10px 16px",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          borderRadius: 6,
          cursor: busy ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: isPro ? "transparent" : "rgba(255,180,0,0.08)",
          border: isPro ? `1px solid ${C.midGray}` : "1px solid #FFB400",
          color: isPro ? C.offWhite : "#FFB400",
          opacity: busy ? 0.6 : 1,
          transition: "all 0.15s",
        }}
      >
        <span aria-hidden="true">📄</span>
        <span>{busy ? "Generating PDF…" : "Download PDF"}</span>
        {!isPro && (
          <span
            style={{
              padding: "2px 6px",
              background: "#FFB400",
              color: "#000",
              borderRadius: 3,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.05em",
              marginLeft: 4,
            }}
          >
            PRO
          </span>
        )}
      </button>
      {error && (
        <div role="alert" style={{ fontSize: 12, color: C.crimson }}>
          {error}
        </div>
      )}
    </div>
  );
}