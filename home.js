// ================================
// Prime-Follower - Home Page Module (FIXED)
// ================================



import {
  getUserProfile
} from './firebase.js';

import { db, serverTimestamp } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { renderCheckin } from "./dailycheckin.js";

import { logTransaction } from "./firebase.js";

// ================================
// GLOBAL HELPERS
// ================================
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function updateCreditsDisplay(credits) {
  const el = document.getElementById('credit-count');
  const container = document.getElementById('floating-credits');
  if (!el || !container) return;

  el.textContent = credits;
  container.classList.add('credit-bump');
  setTimeout(() => container.classList.remove('credit-bump'), 400);
}

// ================================
// INIT
// ================================
window.addEventListener('userReady', async (e) => {
  const { uid } = e.detail;
  await initHome(uid);
});

import { getDailyAdsCount } from "./firebase.js";

async function initHome(uid) {
  // 🔥 STEP 1: trigger reset logic
  const count = await getDailyAdsCount(uid);

  // 🔥 STEP 2: get fresh profile
  const profile = await getUserProfile(uid);
  if (!profile) return;

  // 🔥 STEP 3: force correct ad count after reset
profile.daily_ads_watched = count || 0;

  // 🔥 STEP 4: update UI
  updateAdCount(profile);
  renderCheckin(profile);
}

// ================================
// UTIL
// ================================
function getTodayAds(profile) {
 const today = new Date().toISOString().split("T")[0];
 const adsDate = profile.daily_ads_date
  ? profile.daily_ads_date.toDate().toISOString().split("T")[0]
  : null;
  return adsDate === today ? (profile.daily_ads_watched || 0) : 0;
}

// ================================
// AD COUNT (FIXED — now forces fresh sync)
// ================================
function updateAdCount(profile) {
  const count = getTodayAds(profile);
  const el = document.getElementById('ad-count');
  const btn = document.getElementById('btn-watch-ad');

  if (!el || !btn) return;

  el.textContent = `${count} / 20 ads today`;

  if (count >= 20) {
    btn.disabled = true;
    btn.textContent = "🚫 Limit Reached";
  } else {
    btn.disabled = false;
    btn.textContent = "▶ WATCH AD";
  }
}

// ================================
// WATCH AD (FIXED — immediate UI sync)
// ================================
const watchBtn = document.getElementById("btn-watch-ad");

if (watchBtn) {
 watchBtn.addEventListener("click", async () => {
  const user = window.cashTreasureUser;

  if (!user) return showToast("Login first", "error");

  // 🔥 FIX: reset check first
  await getDailyAdsCount(user.uid);

  if (watchBtn.dataset.locked === "true") return;

  watchBtn.disabled = true;
  watchBtn.dataset.locked = "true";
  watchBtn.textContent = "⏳ Watching...";

  try {
    let profile = await getUserProfile(user.uid);

  // 🔒 CREDIT LIMIT (25/day)
if ((profile.daily_credits_earned || 0) >= 25) {
  showToast("You can't earn more than 25 credits in a day", "error");
  return;
}

// 🔒 AD LIMIT (20/day)
if ((profile.daily_ads_watched || 0) >= 20) {
  showToast("Daily ad limit reached (20)", "error");
  return;
}
    // rest of your code...


      await addDoc(collection(db, "ad_requests"), {
        user_id: user.uid,
        created_at: serverTimestamp(),
        device_time: Date.now()
      });

    await updateDoc(doc(db, "users", user.uid), {

     
  credits: increment(1),
  daily_ads_watched: increment(1),
  daily_credits_earned: increment(1), // 🔥 ADD THIS
  total_earned: increment(1),
  daily_ads_date: serverTimestamp()
});

await logTransaction(user.uid, "Watched Ad", 1);

      // FORCE fresh profile read so daily_ads_date + count are in sync
profile = await getUserProfile(user.uid);

// 🔥 FORCE MANUAL SYNC (IMPORTANT)



window.cashTreasureUser.credits = profile.credits;

updateCreditsDisplay(profile.credits);
updateAdCount(profile);
renderCheckin(profile);

      showToast("+1 Credit Added 🎉");

    } catch (err) {
      console.error(err);
      showToast("Action blocked 🚫", "error");
      } finally {
      watchBtn.disabled = false;
      watchBtn.dataset.locked = "false";
      watchBtn.textContent = "▶ WATCH AD";
    }


    
  });
  
}



// ================================
// ANIMATIONS + REFER (unchanged)
// ================================
function showUnlockAnimation(count) {
  const overlay = document.createElement("div");
  overlay.className = "unlock-overlay";
  overlay.innerHTML = `<div class="unlock-box">🎉 Day ${count === 5 ? 4 : 7} Unlocked</div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2000);
}

const referCard = document.getElementById("refer-card");
if (referCard) {
  referCard.addEventListener("click", () => {
    document.getElementById("coming-soon-overlay")?.classList.add("visible");
  });
}

document.getElementById('coming-soon-close')?.addEventListener('click', () => {
  document.getElementById('coming-soon-overlay')?.classList.remove("visible");
});

console.log("✅ HOME FIXED & LOADED");