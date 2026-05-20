// ================================
// DAILY CHECK-IN SYSTEM (FIXED)
// ================================

import {
  getUserProfile,
  claimDailyCheckin
} from "./firebase.js";

let isClaiming = false;
let hasClaimedToday = false;

function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ================================
// REWARD MAPPING
// ================================
const rewards = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 0, 6: 1, 7: 5
};

// ================================
// HELPERS
// ================================
function getTodayAds(profile) {
  const today = new Date().toISOString().split("T")[0];

const adsDate = profile.daily_ads_date
  ? profile.daily_ads_date.toDate().toISOString().split("T")[0]
  : null;
  return adsDate === today ? (profile.daily_ads_watched || 0) : 0;
}

function isClaimedToday(profile) {
  if (!profile?.lastCheckinDate || !profile.lastCheckinDate.toDate) return false;
  try {
    const last = profile.lastCheckinDate.toDate();
    return last.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
  } catch (e) {
    return false;
  }
}

function getNextDay(profile) {
  let next = (profile.checkinDay || 0) + 1;
  return next > 7 ? 1 : next;
}

// ================================
// RENDER UI
// ================================
export function renderCheckin(profile) {
  const claimed = isClaimedToday(profile);
  hasClaimedToday = claimed;

  const currentDay = profile.checkinDay || 0;
  const nextDay = getNextDay(profile);
  const ads = getTodayAds(profile);

  document.querySelectorAll(".checkin-day").forEach(el => {
    const day = Number(el.dataset.day);
    const circle = el.querySelector(".day-circle");
    const rewardEl = el.querySelector(".day-reward");

    el.classList.remove("completed", "current", "locked");

    if (claimed) {
      if (day <= currentDay) {
        el.classList.add("completed");
        circle.textContent = "✓";
        rewardEl.textContent = rewards[day] ? `+${rewards[day]}` : "+0";
      } else {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
      }
      return;
    }

    if (day < nextDay) {
      el.classList.add("completed");
      circle.textContent = "✓";
      rewardEl.textContent = rewards[day] ? `+${rewards[day]}` : "+0";
      return;
    }

    if (day === nextDay) {
      if ((day === 4 && ads < 5) || (day === 7 && ads < 10)) {
        el.classList.add("locked");
        circle.textContent = "🔒";
        rewardEl.textContent = "+?";
        return;
      }
      el.classList.add("current");
      circle.textContent = (day === 7) ? "🎁" : "";
      rewardEl.textContent = "+?";
      return;
    }

    el.classList.add("locked");
    circle.textContent = "🔒";
    rewardEl.textContent = "+?";
  });

  const btn = document.getElementById("btn-checkin");
  if (!btn) return;

  if (claimed) {
    btn.disabled = false;
    btn.innerHTML = '✅ Claimed!';
    btn.classList.add("claimed");
  } else {
    btn.disabled = false;
    btn.innerHTML = '🎁 CLAIM';
    btn.classList.remove("claimed");
  }

  updateAdProgress(profile, nextDay);   // ← called with correct nextDay
}

// ================================
// AD PROGRESS — FIXED (only shows on Day 4 & Day 7)
// ================================
export function updateAdProgress(profile, nextDay) {
  const container = document.querySelector(".ad-progress-container");
  const fill = document.getElementById("ad-progress-fill");
  const text = document.getElementById("ad-progress-text");

  if (!container || !fill || !text) return;

  let required = 0;
  if (nextDay === 4) required = 5;
  if (nextDay === 7) required = 10;

  if (required === 0) {
    // Completely hide + clean state (no flicker, no leftover UI)
    container.style.display = "none";
    fill.style.width = "0%";
    text.textContent = "Watch ads to unlock rewards";
    return;
  }

  // Only show when required (Day 4 or Day 7)
  container.style.display = "block";
  const ads = getTodayAds(profile);
  const percent = Math.min((ads / required) * 100, 100);
  fill.style.width = percent + "%";
  text.textContent = `${ads}/${required} ads`;
}

// ================================
// INIT
// ================================
window.addEventListener("userReady", async (e) => {
  const { uid } = e.detail;
  const profile = await getUserProfile(uid);
  if (!profile) return;
  renderCheckin(profile);
});

// ================================
// CLAIM BUTTON
// ================================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-checkin");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const user = window.cashTreasureUser;
    if (!user) return;

    if (isClaiming) return;
    isClaiming = true;

    if (hasClaimedToday) {
      showToast("Already Checked In😅!", "error");
      btn.innerHTML = '✅ Claimed!';
      btn.classList.add("claimed");
      isClaiming = false;
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Claiming...';
    btn.classList.add("loading");

    try {
   window.__ALLOW_CHECKIN__ = true;

let res;
try {
  res = await claimDailyCheckin(user.uid);
} finally {
  window.__ALLOW_CHECKIN__ = false;
}
      if (!res.success) {
        showToast(res.message, "error");
        btn.innerHTML = '🎁 CLAIM';
        btn.disabled = false;
        return;
      }

      const profile = await getUserProfile(user.uid);
      hasClaimedToday = true;
      renderCheckin(profile);

      window.cashTreasureUser.credits = profile.credits;
      const creditEl = document.getElementById("credit-count");
      if (creditEl) creditEl.textContent = profile.credits;

      if (res.reward > 0) {
        showToast(`+${res.reward} Credits Added 🎉`);
      } else if (res.isOops) {
        showToast("😅 Oops Day! No Credit Today");
      } else if (res.isGift) {
        showToast(`🎁 You got ${res.reward} Credits!`);
      }

    } catch (err) {
      console.error('Check-in error:', err);
      showToast('Something went wrong. Try again.', "error");
      btn.innerHTML = '🎁 CLAIM';
      btn.disabled = false;
    } finally {
      isClaiming = false;
    }
  });
});