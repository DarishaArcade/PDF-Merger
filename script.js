document.addEventListener("DOMContentLoaded", function() {
  // DOM elements
  const mergeBtn = document.getElementById("mergeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const dropZone = document.getElementById("dropZone");
  const pdfInput = document.getElementById("pdfInput");
  const statusMessage = document.getElementById("statusMessage");
  const downloadLink = document.getElementById("downloadLink");

  let files = [];
  let PDFDocument;

  // Initialize PDF library
  async function initializePDFLibrary() {
    try {
      const pdfLib = window.pdfLib || window.PDFLib;
      if (!pdfLib) throw new Error("PDF library not loaded");
      
      const testDoc = await pdfLib.PDFDocument.create();
      await testDoc.save();
      
      PDFDocument = pdfLib.PDFDocument;
      showStatus("Ready to merge PDFs", "success");
    } catch (error) {
      console.error("PDF library error:", error);
      showStatus("PDF tools unavailable. Please refresh the page.", "error");
      mergeBtn.disabled = true;
      resetBtn.disabled = true;
    }
  }

  // Reset function
  function resetApp() {
    files = [];
    pdfInput.value = "";
    downloadLink.style.display = "none";
    downloadLink.href = "#";
    updateUI();
    showStatus("Ready to merge PDFs", "info");
  }

  // Show status messages
  function showStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = type;
  }

  // Update UI state
  function updateUI() {
    mergeBtn.disabled = files.length === 0 || !PDFDocument;
    resetBtn.disabled = files.length === 0;
    dropZone.querySelector("p").textContent = files.length > 0 
      ? `${files.length} PDF(s) selected` 
      : "Drag & Drop PDFs here or click to upload";
  }

  // File input handler
  pdfInput.addEventListener("change", () => {
    files = Array.from(pdfInput.files);
    updateUI();
    showStatus(`${files.length} PDF(s) selected`, "info");
  });

  // Drag and drop handlers
  dropZone.addEventListener("click", () => pdfInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    
    files = Array.from(e.dataTransfer.files).filter(
      file => file.type === "application/pdf"
    );
    
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    pdfInput.files = dataTransfer.files;
    
    updateUI();
    showStatus(`${files.length} PDF(s) selected`, "info");
  });

  // Reset button handler
  resetBtn.addEventListener("click", resetApp);

  // PDF merging function
  mergeBtn.addEventListener("click", async function() {
    if (files.length === 0 || !PDFDocument) return;
    
    const originalText = mergeBtn.textContent;
    mergeBtn.disabled = true;
    resetBtn.disabled = true;
    mergeBtn.textContent = "Merging...";
    showStatus("Merging PDFs...", "info");
    
    try {
      const mergedPdfDoc = await PDFDocument.create();
      let totalPages = 0;
      
      for (const [index, file] of files.entries()) {
        try {
          showStatus(`Processing ${index + 1} of ${files.length}: ${file.name}`, "info");
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const pageCount = pdfDoc.getPageCount();
          totalPages += pageCount;
          
          const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
          const copiedPages = await mergedPdfDoc.copyPages(pdfDoc, pageIndices);
          copiedPages.forEach(page => mergedPdfDoc.addPage(page));
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          throw new Error(`Failed to process "${file.name}". It may be corrupted.`);
        }
      }

      const mergedPdfBytes = await mergedPdfDoc.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = `merged_${new Date().toISOString().slice(0,10)}.pdf`;
      downloadLink.style.display = "inline-block";
      
      showStatus(`Success! Merged ${files.length} files (${totalPages} pages)`, "success");
      
    } catch (error) {
      console.error("Merge failed:", error);
      showStatus(`Error: ${error.message}`, "error");
    } finally {
      mergeBtn.disabled = files.length === 0;
      resetBtn.disabled = files.length === 0;
      mergeBtn.textContent = originalText;
    }
  });

  // Initialize the app
  initializePDFLibrary();
});