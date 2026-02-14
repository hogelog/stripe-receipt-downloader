const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');

function setStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = type;
}

function hideStatus() {
  statusDiv.className = 'hidden';
}

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isStripeInvoicePage(url) {
  return url && url.includes('invoice.stripe.com');
}

downloadBtn.addEventListener('click', async () => {
  try {
    hideStatus();
    downloadBtn.disabled = true;

    const tab = await getCurrentTab();

    if (!isStripeInvoicePage(tab.url)) {
      setStatus('Stripe Invoiceページで開いてください', 'warning');
      downloadBtn.disabled = false;
      return;
    }

    setStatus('ベンダーを検出中...', 'info');

    // Send message to content script to download receipt
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'downloadReceipt'
    });

    if (response && response.success) {
      const vendor = response.vendor || 'stripe';
      const vendorName = {
        'cursor': 'Cursor',
        'openai': 'OpenAI',
        'stripe': 'Stripe'
      }[vendor] || vendor;

      setStatus(`✓ ${vendorName}の領収書を ${vendor}-[ファイル名].pdf でダウンロード開始`, 'success');
      setTimeout(() => {
        downloadBtn.disabled = false;
      }, 2000);
    } else {
      setStatus(response?.error || 'ダウンロードに失敗しました', 'error');
      downloadBtn.disabled = false;
    }

  } catch (error) {
    console.error('Error:', error);
    setStatus(`エラー: ${error.message}`, 'error');
    downloadBtn.disabled = false;
  }
});

// Initialize
(async () => {
  const tab = await getCurrentTab();

  if (!isStripeInvoicePage(tab.url)) {
    setStatus('Stripe Invoiceページで開いてください', 'warning');
    downloadBtn.disabled = true;
  }
})();
