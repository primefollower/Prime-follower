// ================================
// Cash Treasure - Order Page Module
// Order flow, progress bar, countdown timer
// ================================

import {
  auth,
  getUserProfile,
  createOrder,
  getActiveOrders
} from './firebase.js';



// Rules checkbox control
const rulesCheckbox = document.getElementById("rules-agree");
const rulesNextBtn = document.getElementById("rules-agree-btn");

if (rulesCheckbox && rulesNextBtn) {

  rulesNextBtn.disabled = true;
  rulesNextBtn.style.opacity = "0.6";

  rulesCheckbox.addEventListener("change", () => {

    if (rulesCheckbox.checked) {
      rulesNextBtn.disabled = false;
      rulesNextBtn.style.opacity = "1";
    } else {
      rulesNextBtn.disabled = true;
      rulesNextBtn.style.opacity = "0.6";
    }

  });

}



// ── Toast helper ──
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ── Update credits display ──
function updateCreditsDisplay(credits) {
  const el = document.getElementById('credit-count');
  if (el) {
    el.textContent = credits;
    const container = document.getElementById('floating-credits');
    container.classList.add('credit-bump');
    setTimeout(() => container.classList.remove('credit-bump'), 500);
  }
}

// ── Order state ──
let selectedOrder = null;
let countdownInterval = null;

// ── Init when user ready ──
window.addEventListener('userReady', async (e) => {
  const { uid } = e.detail;
  await checkActiveOrders(uid);
});

// ── Order cards click handler ──
document.querySelectorAll('.order-card .btn-order').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const card = e.target.closest('.order-card');
    const followers = parseInt(card.dataset.followers);
    const cost = parseInt(card.dataset.cost);

  const user = window.cashTreasureUser;

if (!user) {
  showToast("Please login first.", "error");
  return;
}

if (user.credits < cost) {
  showToast("❌ Not enough credits!", "error");
  return;
}
selectedOrder = { followers, credits_spent: cost };

// Show rules modal
document.getElementById('rules-modal').classList.add('visible');

  });
});

// ── Rules Agree ──
document.getElementById('rules-agree-btn').addEventListener('click', () => {
  document.getElementById('rules-modal').classList.remove('visible');
  // Show username modal
  document.getElementById('order-ig-username').value = '';
  document.getElementById('order-ig-link').value = '';
  document.getElementById('username-modal').classList.add('visible');
});

// ── Cancel Order ──
document.getElementById('cancel-order-btn').addEventListener('click', () => {
  document.getElementById('username-modal').classList.remove('visible');
  selectedOrder = null;
});

// Close modals on backdrop click
document.getElementById('rules-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('visible');
    selectedOrder = null;
  }
});
document.getElementById('username-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove('visible');
    selectedOrder = null;
  }
});

// ── Confirm Order ──
document.getElementById('confirm-order-btn').addEventListener('click', async () => {

  console.log("DEBUG selectedOrder:", selectedOrder);
  
  const user = window.cashTreasureUser;
  if (!user || !selectedOrder) return;

  const igUsername = document.getElementById('order-ig-username').value.trim();
  const igLink = document.getElementById('order-ig-link').value.trim();

  if (igLink && !igLink.startsWith("https://www.instagram.com")) {
  showToast("Instagram link must start with https://www.instagram.com", "error");
  return;
}

  if (!igUsername) {
    showToast('Please enter your Instagram username.', 'error');
    return;
  }

  const btn = document.getElementById('confirm-order-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Processing...';

if (user.credits < selectedOrder.credits_spent) {
  showToast("Insufficient Credits😅!", "error");
  btn.disabled = false;
  btn.textContent = 'CONFIRM ORDER';
  return;
}

  try {
    const result = await createOrder(user.uid, {
      instagram_username: igUsername,
      instagram_link: igLink,
      followers: selectedOrder.followers,
     credits_spent: selectedOrder.credits_spent
    });

    if (result.success) {
      showToast(`✅ Order placed! ${selectedOrder.followers} followers incoming!`);


      // 🔥 SEND EMAIL ON ORDER
if (typeof emailjs !== "undefined") {
  try {
await emailjs.send("service_swt79ip", "template_urw0ymr", {
  user_email: user.email,
  insta_username: igUsername,
  insta_link: igLink || "Not provided",
credits: selectedOrder.credits_spent,
 time_left: "Within 24 hours delivery",
  order_time: new Date().toLocaleString()
});
  } catch (err) {
    console.warn("Order email failed:", err);
  }
}

      // Close modal
      document.getElementById('username-modal').classList.remove('visible');

   // 🔥 TEMP FORCE CREDIT UPDATE (important)
window.cashTreasureUser.credits -= selectedOrder.credits_spent;
updateCreditsDisplay(window.cashTreasureUser.credits);

// Fetch latest from backend
const profile = await getUserProfile(user.uid);
if (profile) {
  updateCreditsDisplay(profile.credits);
  window.cashTreasureUser.credits = profile.credits;
}
      // Show progress
   if (result.completionTime) {
  startCountdown(result.completionTime);
}


const list = document.getElementById("transaction-list");

// ✅ SAVE VALUE BEFORE IT BECOMES NULL
const spentCredits = selectedOrder?.credits_spent;

if (list && spentCredits != null) {
  list.innerHTML = `
    <div class="transaction-item">
      <div class="tx-info">
        <div class="tx-action">Followers Order</div>
        <div class="tx-date">${new Date().toLocaleString()}</div>
      </div>
      <div class="tx-amount negative">
        -${spentCredits}
      </div>
    </div>
  `;
}




else {
  console.warn("No completionTime received");
}
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    console.error('Order error:', err);
console.error("🔥 FULL ERROR:", err);
console.error("🔥 ERROR CODE:", err.code);
console.error("🔥 ERROR MESSAGE:", err.message);

showToast(err.message || 'Something went wrong.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'CONFIRM ORDER';
    selectedOrder = null;
  }
});

// ── Check active orders ──
async function checkActiveOrders(uid) {
  try {
    const orders = await getActiveOrders(uid);

console.log("ACTIVE ORDERS:", orders);

    if (orders.length > 0) {
      const latestOrder = orders[0];
      const orderId = latestOrder.id;
const seenKey = `celebration_seen_${orderId}`;
   const completionTime = latestOrder.completion_time?.toDate
  ? latestOrder.completion_time.toDate()
  : new Date(latestOrder.completion_time);
      const now = new Date();

      if (completionTime > now) {
        startCountdown(completionTime);
     } else {
  // ✅ Show only once
  if (!localStorage.getItem(seenKey)) {
    showCelebration();
    localStorage.setItem(seenKey, "true");
  }
}
    }
  } catch (err) {
    console.error('Error checking orders:', err);
  }
}

// ── Countdown timer ──
function startCountdown(completionTime) {
  const progressSection = document.getElementById('order-progress');
  const timerEl = document.getElementById('countdown-timer');
  const barFill = document.getElementById('progress-bar-fill');

  progressSection.classList.add('visible');

  const endTime = completionTime instanceof Date ? completionTime : new Date(completionTime);
  const totalDuration = 24 * 60 * 60 * 1000; // 24 hours

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const now = new Date();
    const remaining = endTime.getTime() - now.getTime();

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      timerEl.textContent = '00:00:00';
      barFill.style.width = '100%';

      // Show celebration
      setTimeout(() => showCelebration(), 500);
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remaining % (1000 * 60)) / 1000);

    timerEl.textContent =
      String(hours).padStart(2, '0') + ':' +
      String(mins).padStart(2, '0') + ':' +
      String(secs).padStart(2, '0');

    // Progress bar
    const elapsed = totalDuration - remaining;
    const percent = Math.min((elapsed / totalDuration) * 100, 100);
    barFill.style.width = percent + '%';
  }, 1000);
}

// ── Celebration popup ──
function showCelebration() {
  document.getElementById('celebration-overlay').classList.add('visible');
  document.getElementById('order-progress').classList.remove('visible');
  if (countdownInterval) clearInterval(countdownInterval);
}

document.getElementById('celebration-close').addEventListener('click', () => {
  document.getElementById('celebration-overlay').classList.remove('visible');
});


window.sendOrderEmail = function(data) {
  emailjs.send("service_swt79ip", "template_urw0ymr", {
    user_email: data.email,
    insta_username: data.username,
    insta_link: data.link,
    credits: data.credits,
    time_left: data.time,
    order_time: new Date().toLocaleString()
  })
  .then(() => {
    console.log("✅ Email sent");
  })
  .catch((err) => {
    console.error("❌ Email error:", err);
  });
}
console.log('✅ Order module loaded.');
