// Content script for Stripe invoice pages

// Detect vendor from page content
function detectVendor() {
  const bodyText = document.body.textContent.toLowerCase();

  // Check for vendor-specific keywords
  if (bodyText.includes('cursor') || bodyText.includes('anysphere')) {
    return 'cursor';
  } else if (bodyText.includes('openai')) {
    return 'openai';
  }

  // Fallback to stripe
  return 'stripe';
}

// Date parsing and extraction functions

/**
 * Validate YYYYMMDD date string
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidYYYYMMDD(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length !== 8) {
    return false;
  }

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);

  // Validate ranges
  if (year < 2020 || year > 2050) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Check if date is valid
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
}

/**
 * Parse various date formats to YYYYMMDD
 * @param {string} dateString - Date string to parse
 * @returns {string|null} YYYYMMDD string or null
 */
function parseDateToYYYYMMDD(dateString) {
  if (!dateString) return null;

  try {
    // Clean up the string
    const cleaned = dateString.trim();

    // Try Japanese format first: 2026年2月12日
    const japaneseMatch = cleaned.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (japaneseMatch) {
      const year = japaneseMatch[1];
      const month = japaneseMatch[2].padStart(2, '0');
      const day = japaneseMatch[3].padStart(2, '0');
      const result = `${year}${month}${day}`;

      if (isValidYYYYMMDD(result)) {
        return result;
      }
    }

    // Try parsing with Date object for other formats
    const date = new Date(cleaned);

    if (isNaN(date.getTime())) {
      return null;
    }

    // Format as YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const result = `${year}${month}${day}`;

    // Validate the result
    if (isValidYYYYMMDD(result)) {
      return result;
    }

    return null;
  } catch (error) {
    console.error('[Stripe Receipt] Error parsing date:', error);
    return null;
  }
}

/**
 * Strategy 1: Find date by data-testid attribute
 * @returns {string|null} YYYYMMDD string or null
 */
function findDateByTestId() {
  const selectors = [
    '[data-testid*="invoice-date"]',
    '[data-testid*="issued"]',
    '[data-testid*="date"]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.trim();
      const parsed = parseDateToYYYYMMDD(text);
      if (parsed) {
        console.log('[Stripe Receipt] Date found by testid:', parsed);
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Strategy 2: Find date by text label
 * @returns {string|null} YYYYMMDD string or null
 */
function findDateByTextLabel() {
  // English and Japanese labels
  const labels = [
    'Invoice date:', 'Issued:', 'Date:', 'Invoice Date', 'Issued',
    '支払い日', '請求日', '発行日', '日付'  // Japanese labels
  ];
  const bodyText = document.body.innerText;
  const lines = bodyText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const label of labels) {
      if (line.toLowerCase().includes(label.toLowerCase())) {
        // Check current line after the label
        const afterLabel = line.substring(line.toLowerCase().indexOf(label.toLowerCase()) + label.length).trim();
        if (afterLabel) {
          const parsed = parseDateToYYYYMMDD(afterLabel);
          if (parsed) {
            console.log('[Stripe Receipt] Date found by label:', parsed);
            return parsed;
          }
        }

        // Check next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const parsed = parseDateToYYYYMMDD(nextLine);
          if (parsed) {
            console.log('[Stripe Receipt] Date found by label:', parsed);
            return parsed;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Strategy 3: Find date by time element
 * @returns {string|null} YYYYMMDD string or null
 */
function findDateByTimeElement() {
  const timeElements = document.querySelectorAll('time[datetime]');

  for (const element of timeElements) {
    const datetime = element.getAttribute('datetime');
    const parsed = parseDateToYYYYMMDD(datetime);
    if (parsed) {
      console.log('[Stripe Receipt] Date found by time element:', parsed);
      return parsed;
    }
  }

  return null;
}

/**
 * Strategy 4: Find date by regex pattern
 * @returns {string|null} YYYYMMDD string or null
 */
function findDateByPattern() {
  const bodyText = document.body.innerText;

  // Common date patterns (English and Japanese)
  const patterns = [
    /\d{4}年\d{1,2}月\d{1,2}日/,  // Japanese: 2026年2月12日
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/,
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}/,
    /\d{4}-\d{2}-\d{2}/,
    /\d{2}\/\d{2}\/\d{4}/
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const parsed = parseDateToYYYYMMDD(match[0]);
      if (parsed) {
        console.log('[Stripe Receipt] Date found by pattern:', parsed);
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extract invoice date from page using multiple strategies
 * @returns {string|null} YYYYMMDD string or null if not found
 */
function extractInvoiceDate() {
  try {
    // Try strategies in priority order
    let date = findDateByTestId();
    if (date) return date;

    date = findDateByTextLabel();
    if (date) return date;

    date = findDateByTimeElement();
    if (date) return date;

    date = findDateByPattern();
    if (date) return date;

    console.log('[Stripe Receipt] No invoice date found, will use current date');
    return null;
  } catch (error) {
    console.error('[Stripe Receipt] Error extracting invoice date:', error);
    return null;
  }
}

// Listen for download command from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadReceipt') {
    (async () => {
      try {
        // Detect vendor from page content
        const vendor = detectVendor();

        // Extract invoice date from page
        const invoiceDate = extractInvoiceDate();

        // Validate invoice date
        if (invoiceDate && !isValidYYYYMMDD(invoiceDate)) {
          console.warn('[Stripe Receipt] Invalid date format, using null:', invoiceDate);
          invoiceDate = null;
        }

        console.log('[Stripe Receipt] Vendor:', vendor, '| Invoice date:', invoiceDate || 'not found');

        // Send metadata to background script and wait for confirmation
        await chrome.runtime.sendMessage({
          action: 'setDownloadMetadata',
          metadata: {
            vendor: vendor,
            invoiceDate: invoiceDate
          }
        });

        // Wait a bit to ensure background script has processed the message
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find the receipt download button
        const receiptButton = document.querySelector('button[data-testid="download-invoice-receipt-pdf-button"]');

        if (!receiptButton) {
          console.error('Receipt button not found');
          sendResponse({ success: false, error: '領収書ダウンロードボタンが見つかりません' });
          return;
        }

        console.log('Receipt button found, clicking...');

        // Click the button
        receiptButton.click();

        // Success response with detected vendor
        sendResponse({ success: true, vendor: vendor });

      } catch (error) {
        console.error('Error downloading receipt:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep channel open for async response
  }
});
