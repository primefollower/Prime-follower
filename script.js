

window.addEventListener("load", () => {
  setTimeout(() => {
    const loader = document.getElementById("load2s-overlay");
    if (loader) {
      loader.style.opacity = "0";
      loader.style.transition = "opacity 0.5s ease";

      setTimeout(() => {
        loader.remove();
      }, 500);
    }
  }, 2200);
});



function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ================================
// Prime-Follower - Main App Script
// Persistent Login + Mobile Security
// ================================

import { auth, getUserProfile, createUserProfile, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── FORCE PERSISTENT LOGIN (fixes auto-logout on refresh / close) ──
await setPersistence(auth, browserLocalPersistence);


let selectedAvatar = null;

document.addEventListener("click", (e) => {






  const item = e.target.closest(".avatar-item");
  if (!item) return;

  // store selected avatar globally
  selectedAvatar = item.dataset.avatar;

  // remove old selection
  document.querySelectorAll(".avatar-item")
    .forEach(el => el.classList.remove("active"));

  // highlight new selection
  item.classList.add("active");
});





const closeBtn = document.getElementById("avatar-close-btn");

if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// ================================
// MOBILE DEVICE PROTECTION SYSTEM
// ================================

function isRealMobile() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  const mobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const touchSupport = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = window.innerWidth <= 768 && window.innerHeight <= 1024;
  return mobileUA && touchSupport && coarsePointer && smallScreen;
}

function detectDevTools() {
  const threshold = 160;
  return (
    window.outerWidth - window.innerWidth > threshold ||
    window.outerHeight - window.innerHeight > threshold
  );
}

function enforceMobileOnly() {
  const overlay = document.getElementById("desktop-overlay");
  if (!overlay) return;

  const realMobile = isRealMobile();
  const devtoolsOpen = detectDevTools();

 if (!realMobile)  {
    overlay.style.display = "flex";
    document.documentElement.style.overflow = "hidden";
  } else {
    overlay.style.display = "none";
  }
}

// Run security checks
enforceMobileOnly();
window.addEventListener("resize", enforceMobileOnly);
window.addEventListener("orientationchange", enforceMobileOnly);
setInterval(enforceMobileOnly, 1500);

// Disable right click + devtools shortcuts
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", function(e) {
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["I","J","C"].includes(e.key)) ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
  }
});

// ═════════════════════════════════════
// QR Code Modal
// ═════════════════════════════════════
const siteUrl = window.location.href;
document.getElementById("qr-site-link").value = siteUrl;

document.getElementById("btn-show-qr").addEventListener("click", () => {
  const qrModal = document.getElementById("qr-modal");
  qrModal.classList.add("visible");

  const container = document.getElementById("qr-code-container");
  if (!container.hasChildNodes()) {
    new QRCode(container, {
      text: siteUrl,
      width: 200,
      height: 200,
      colorDark: "#1a1a2e",
      colorLight: "#ffffff"
    });
  }
});

document.getElementById("qr-modal-close").addEventListener("click", () => {
  document.getElementById("qr-modal").classList.remove("visible");
});

document.getElementById("btn-copy-link").addEventListener("click", () => {
  navigator.clipboard.writeText(siteUrl).then(() => {
    const btn = document.getElementById("btn-copy-link");
    btn.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 2000);
  });
});

// ═════════════════════════════════════
// Firebase Auth Listener (now fully persistent)
// ═════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  const logoutBtn = document.getElementById("btn-logout");

  // USER NOT LOGGED IN
  if (!user) {
    document.getElementById("profile-username").textContent = "Guest";
    document.getElementById("profile-email").textContent = "Please sign in to start earning credits";
    document.getElementById("profile-credits").textContent = "0";
    document.getElementById("profile-total-earned").textContent = "0";
    document.getElementById("profile-joined").textContent = "-";

    logoutBtn.innerHTML = '<span class="signin-text">🚀 SIGN IN</span>';
    logoutBtn.classList.add("signin-btn");
    logoutBtn.onclick = null;
    logoutBtn.addEventListener("click", () => {
      window.location.href = "FIXSIGNIN/index.html";
    });
    return;
  }

  // Create / update profile
  await createUserProfile(user.uid, {
    email: user.email,
    username: user.displayName || ""
  });

  const profile = await getUserProfile(user.uid);

  // ✅ LOAD USER AVATAR
const avatarPath = "avatars/" + (profile?.avatar || "user1.jpg");

// HOME AVATAR
const avatarEl = document.getElementById("user-avatar");
if (avatarEl) {
  avatarEl.src = avatarPath;
}

// PROFILE AVATAR (🔥 FIX)
const profileAvatar = document.getElementById("profile-avatar-img");
if (profileAvatar) {
  profileAvatar.src = avatarPath;
}


  const credits = profile ? profile.credits || 0 : 0;
  const username = profile?.username || user.displayName || "User";
  const email = user.email || "";

  // Update UI
  document.getElementById("credit-count").textContent = credits;
  document.getElementById("profile-username").textContent = username;
  document.getElementById("profile-email").textContent = email;
  document.getElementById("profile-credits").textContent = credits;
  document.getElementById("profile-total-earned").textContent = profile?.total_earned || 0;

  if (profile?.created_at) {
    const joinDate = profile.created_at.toDate();
    document.getElementById("profile-joined").textContent =
      joinDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  // Global user state (restored on every load)
window.cashTreasureUser = {
  uid: user.uid,
  email,
  username,
  credits,
  avatar: profile.avatar   // 🔥 ADD THIS
};

  // Live credits sync
  onSnapshot(doc(db, "users", user.uid), (snap) => {
    const data = snap.data();
    if (!data) return;
    const liveCredits = data.credits || 0;

    const adCountEl = document.getElementById("ad-count");
if (adCountEl && data.daily_ads_watched !== undefined) {
  adCountEl.textContent = `${data.daily_ads_watched} / 20 ads today`;
}
    document.getElementById("credit-count").textContent = liveCredits;

    const profileCredits = document.getElementById("profile-credits");
if (profileCredits) profileCredits.textContent = liveCredits;

    window.cashTreasureUser.credits = liveCredits;
  });

  // Notify all modules
  window.dispatchEvent(
    new CustomEvent("userReady", {
      detail: window.cashTreasureUser
    })
  );
});

// ═════════════════════════════════════
// Bottom Navigation
// ═════════════════════════════════════
const navItems = document.querySelectorAll(".nav-item[data-page]");

// ═════════════════════════════════════
// REWARDED AD CALLBACK SYSTEM
// ═════════════════════════════════════

window.pendingRewardType = null;

// Called AFTER user fully watches rewarded ad
window.onAdRewarded = async function () {

  const user = window.cashTreasureUser;

  if (!user) return;

if (window.pendingRewardType === "watch_ad") {

  const user = window.cashTreasureUser;

  if (!user) return;

  import("./firebase.js").then(async ({ db }) => {

    const {
      doc,
      updateDoc,
      increment,
      getDoc
    } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );

    await updateDoc(doc(db, "users", user.uid), {

      credits: increment(1),
      daily_ads_watched: increment(1),
      daily_credits_earned: increment(1),
      total_earned: increment(1)

    });

    const freshDoc = await getDoc(doc(db, "users", user.uid));

    const profile = freshDoc.data();

    user.credits = profile.credits || 0;

    const creditEl = document.getElementById("credit-count");

    if (creditEl) {

      creditEl.textContent = user.credits;
    }

    const adCountEl = document.getElementById("ad-count");

    if (adCountEl) {

      adCountEl.textContent =
        `${profile.daily_ads_watched || 0} / 20 ads today`;
    }

    showToast("+1 Credit Added 🎉");

    if (window.renderCheckin) {

      window.renderCheckin(profile);
    }
  });
}

// DAILY CHECKIN reward handled in dailycheckin.js
if (window.pendingRewardType === "daily_checkin") {

  if (window.onDailyCheckinRewarded) {

    await window.onDailyCheckinRewarded();
  }
}

  

  window.pendingRewardType = null;
};

// ═════════════════════════════════════
// WATCH AD BUTTON → ANDROID INTERSTITIAL
// ═════════════════════════════════════

const watchAdButton = document.getElementById("btn-watch-ad");

if (watchAdButton) {

  watchAdButton.addEventListener("click", () => {

    // Trigger Android fullscreen ad
    if (window.Android) {
     window.pendingRewardType = "watch_ad";

Android.showAd();
    }

  });

}

const pageSections = document.querySelectorAll(".page-section");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    pageSections.forEach((s) => s.classList.remove("active"));

    const target = document.getElementById(`page-${item.dataset.page}`);
    if (target) target.classList.add("active");
  });
});

// ═════════════════════════════════════
// Profile Modal
// ═════════════════════════════════════
document.getElementById("floating-profile").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.add("visible");
});

document.getElementById("profile-close").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.remove("visible");
});

document.getElementById("profile-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.classList.remove("visible");
  }
});

window.closeOrderDetails = function() {
  const modal = document.getElementById("order-detail-modal");
  if (modal) modal.classList.remove("visible");
};

// ═════════════════════════════════════
// ORDER BUTTON LOGO ANIMATION
// ═════════════════════════════════════
const orderLogo = document.getElementById("order-logo");
if (orderLogo) {
  const logos = ["icons/insta.png", "icons/instagram.png"];
  let index = 0;
  setInterval(() => {
    index = (index + 1) % logos.length;
    orderLogo.style.transform = "scale(1.15)";
    orderLogo.src = logos[index];
    setTimeout(() => orderLogo.style.transform = "scale(1)", 200);
  }, 1300);
}



function loadAvatars() {
  const grid = document.getElementById("avatar-grid");
  if (!grid) return;

  let html = "";

  for (let i = 1; i <= 10; i++) {
    html += `
      <div class="avatar-item" data-avatar="user${i}.jpg">
        <img src="avatars/user${i}.jpg">
      </div>
    `;
  }

grid.innerHTML = html;

// highlight selected avatar
const user = window.cashTreasureUser;
if (!user) return;

import("./firebase.js").then(async ({ getUserProfile }) => {
  const profile = await getUserProfile(user.uid);
  document.querySelectorAll(".avatar-item").forEach(el => {
    if (el.dataset.avatar === profile.avatar) {
      el.classList.add("active");
    }
  });
});
}

loadAvatars();


document.getElementById("confirm-avatar-btn").addEventListener("click", async () => {
  const user = window.cashTreasureUser;
  if (!user || !selectedAvatar) {
  showToast("Please select an avatar first", "error");
    return;
    
  }


  const profileAvatar = document.getElementById("profile-avatar-img");
if (profileAvatar) {
  profileAvatar.src = "avatars/" + selectedAvatar;
}


  try {
    await updateDoc(doc(db, "users", user.uid), {
      avatar: selectedAvatar
    });

    // update UI instantly
    const avatarEl = document.getElementById("user-avatar");
    if (avatarEl) {
      avatarEl.src = "avatars/" + selectedAvatar;
    }

  showToast("Avatar updated successfully", "success");

    // go back to home
    document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
    document.getElementById("page-home").classList.add("active");

  } catch (err) {
    console.error(err);
showToast("Error updating avatar", "error");
  }
});



document.getElementById("profile-avatar-click").addEventListener("click", () => {
  document.getElementById("profile-modal").classList.remove("visible");

  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.getElementById("page-avatar").classList.add("active");
});





// GLOBAL DARK MODE APPLY
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}


// AFTER RELOAD REDIRECT TO HOME
if (localStorage.getItem("goHomeAfterReload") === "true") {
  localStorage.removeItem("goHomeAfterReload");

  setTimeout(() => {
    // Activate home tab
    document.querySelectorAll(".page-section").forEach(p => p.classList.remove("active"));
    document.getElementById("page-home")?.classList.add("active");
  }, 100);
}

console.log("✅ Persistent Login Activated + Main Script Loaded");
