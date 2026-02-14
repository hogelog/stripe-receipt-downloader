// Background service worker

let downloadMetadata = {
  vendor: 'stripe',  // Default vendor
  invoiceDate: null  // null = use current date
};

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setDownloadMetadata') {
    downloadMetadata = {
      vendor: request.metadata.vendor || 'stripe',
      invoiceDate: request.metadata.invoiceDate || null
    };
    console.log('[Background] Metadata set - Vendor:', downloadMetadata.vendor, '| Date:', downloadMetadata.invoiceDate || 'current');
    sendResponse({ success: true });
    return true;
  }

  // Backward compatibility: handle old setDownloadPrefix messages
  if (request.action === 'setDownloadPrefix') {
    downloadMetadata.vendor = request.prefix;
    sendResponse({ success: true });
    return true;
  }
});

// Intercept downloads and add prefix to filename
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  // Check if it's a PDF from Stripe (invoice.stripe.com or dashboard.stripe.com)
  if (downloadItem.url.includes('stripe.com') && downloadItem.filename.endsWith('.pdf')) {
    const originalFilename = downloadItem.filename;

    // Use invoice date if available, otherwise use current date (fallback)
    let dateStr;
    let dateSource;

    if (downloadMetadata.invoiceDate) {
      dateStr = downloadMetadata.invoiceDate;
      dateSource = 'invoice date';
    } else {
      const date = new Date();
      dateStr = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
      dateSource = 'current date';
    }

    const newFilename = `${downloadMetadata.vendor}-${dateStr}-${originalFilename}`;

    console.log(`[Background] ${originalFilename} -> ${newFilename} (${dateSource})`);

    // Suggest must be called synchronously
    suggest({
      filename: newFilename,
      conflictAction: 'uniquify'
    });
  }
});
