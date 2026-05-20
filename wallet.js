// ================================
// Cash Treasure - Wallet Page Module (LIVE HISTORY FIXED)
// ================================

import {
  auth,
  getUserProfile,
  getTransactions
} from './firebase.js';

// ── State ──
let allTransactions = [];
let currentTab = 'redeem';

// ── Init when user ready ──
window.addEventListener('userReady', async (e) => {
  const { uid } = e.detail;
  await loadWallet(uid);

  // Auto refresh when switching to wallet tab
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', async () => {
      if (item.dataset.page === 'wallet') {
        const user = window.cashTreasureUser;
        if (user) await loadWallet(user.uid);
      }
    });
  });

  // LIVE AUTO-REFRESH every 5 seconds while on wallet page
setInterval(async () => {
  if (document.getElementById('page-wallet')?.classList.contains('active')) {
    const user = window.cashTreasureUser;
    if (user) await loadWallet(user.uid);
  }
}, 5000);
});

async function loadWallet(uid) {
  try {
    const profile = await getUserProfile(uid);
    if (profile) {
      const balanceEl = document.getElementById('wallet-balance');
      balanceEl.innerHTML = `${profile.credits || 0}<span class="balance-unit">Credits</span>`;
    }

    allTransactions = await getTransactions(uid);
    renderTransactions();

  } catch (err) {
    console.error('Wallet load error:', err);
  }
}

// ── Tab switching ──
document.querySelectorAll('.wallet-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.wallet-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderTransactions();
  });
});

// ── Render transactions ──
function renderTransactions() {
  const listEl = document.getElementById('transaction-list');

  let filtered = allTransactions;
  if (currentTab === 'redeem') {
    filtered = allTransactions.filter(tx => Number(tx.amount || 0) < 0);
  } else {
    filtered = allTransactions.filter(tx => Number(tx.amount || 0) > 0);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-receipt"></i>
        <p>No ${currentTab === 'redeem' ? 'order' : 'point'} history yet</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(tx => {
    const date = tx.date && tx.date.toDate ? tx.date.toDate() : new Date();
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const isPositive = Number(tx.amount) > 0;
    const amountStr = isPositive ? `+${tx.amount}` : `${tx.amount}`;
    const amountClass = isPositive ? 'positive' : 'negative';

    return `
<div class="transaction-item order-item"
 data-action="${tx.action}"
 data-amount="${tx.amount}"
 data-date="${tx.date ? tx.date.toDate() : new Date()}">

  <div class="tx-info">
    <div class="tx-action">${tx.action || 'Transaction'}</div>
    <div class="tx-date">${dateStr}</div>
  </div>

  <div class="tx-amount ${amountClass}">
    ${amountStr}
  </div>
</div>`;
  }).join('');
}

document.addEventListener("click", (e) => {
  const item = e.target.closest(".order-item");
  if (!item) return;
  if (!item.dataset.action.includes("Order")) return;

  const creditsUsed = item.dataset.amount;
  document.getElementById("detail-credit-used").textContent = creditsUsed;
  document.getElementById("detail-followers").textContent = item.dataset.action.replace(/\D/g,"");

  const txDate = new Date(item.dataset.date || Date.now());
  document.getElementById("detail-date").textContent = txDate.toLocaleDateString();
  document.getElementById("detail-time").textContent = txDate.toLocaleTimeString();

  const statusEl = document.getElementById("detail-status");
  const now = new Date();
  const diffHours = (now - txDate) / (1000 * 60 * 60);

  if (diffHours < 1) {
    statusEl.textContent = "Pending";
    statusEl.style.color = "red";
  } else if (diffHours < 24) {
    statusEl.textContent = "Working";
    statusEl.style.color = "orange";
  } else {
    statusEl.textContent = "Delivered Successfully";
    statusEl.style.color = "green";
  }

  document.getElementById("order-detail-modal").classList.add("visible");
});

console.log('✅ Wallet module loaded with LIVE history.');