// ================================
// Firebase Shared Module
// Cash Treasure - Shared Firebase config + Firestore helpers
// ================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──
const firebaseConfig = {
  apiKey: "AIzaSyBLlnJt8cdlf6s6nfVSdwW3AexieZe9q6I",
  authDomain: "prime-follower.firebaseapp.com",
  projectId: "prime-follower",
  storageBucket: "prime-follower.firebasestorage.app",
  messagingSenderId: "407872287170",
  appId: "1:407872287170:web:3cb424d204914bd50d265b",
  measurementId: "G-765QSVVHTJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Exports ──
export { auth, db, onAuthStateChanged, signOut, Timestamp, serverTimestamp, increment };

// ── Helper: Get or create user profile ──
export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
if (snap.exists()) {
  return snap.data();
}

// 🔥 AUTO CREATE USER (CRITICAL FIX)
await createUserProfile(uid, {});
const newSnap = await getDoc(userRef);
return newSnap.data();
}

export async function createUserProfile(uid, data) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
 await setDoc(userRef, {

  avatar: "user1.jpg",
  uid,
  email: data.email || "",
  username: data.username || "",

  credits: 0,

  created_at: serverTimestamp(),
  last_login: serverTimestamp(),

  

 daily_ads_watched: 0,
daily_ads_date: null,
daily_credits_earned: 0, // 🔥 ADD THIS

  // ✅ FORCE SAFE DEFAULT
  lastCheckinDate: null,
  checkinDay: 0,
  checkinCycle: 0,

  last_checkin: null,
  checkin_streak: 0,

  total_followers_ordered: 0

});
  } else {
    await updateDoc(userRef, { last_login: serverTimestamp() });
  }
}


// ── Helper: Log transaction ──
export async function logTransaction(uid, action, amount) {
  await addDoc(collection(db, "transactions"), {
    user_id: uid,
    action,
    amount,
    date: serverTimestamp()
  });
}
// ── Helper: Get daily ads count ──
export async function getDailyAdsCount(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return 0;

  const data = snap.data();
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

const adsDate = data.daily_ads_date
  ? data.daily_ads_date.toDate().toISOString().split("T")[0]
  : null;
  // Reset at midnight every calendar day
  if (adsDate !== today) {
    await updateDoc(userRef, { 
  daily_ads_watched: 0,
  daily_credits_earned: 0, // 🔥 ADD THIS
  daily_ads_date: Timestamp.now()
});
    return 0;
  }
  return data.daily_ads_watched || 0;
}


// ── Weighted random helper ──
function weightedRandom(weights) {
  // weights: [ { value, weight } ]
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * total;
  for (const w of weights) {
    rand -= w.weight;
    if (rand <= 0) return w.value;
  }
  return weights[weights.length - 1].value;
}

// ── Helper: Daily Check-in (7-day repeating cycle) ──
export async function claimDailyCheckin(uid) {
  // 🚨 SAFETY: prevent auto-call without user action
if (!window.__ALLOW_CHECKIN__) {
  console.warn("Blocked unauthorized check-in call");
  return { success: false, message: "Unauthorized trigger" };
}
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return { success: false, message: "User not found" };

const data = snap.data();
const nowTimestamp = Timestamp.now();
const now = nowTimestamp.toDate();

if (!data.lastCheckinDate) {
  // ...
} else {
  const data = snap.data();
  const now = new Date();

  if (data.lastCheckinDate) {
    const last = data.lastCheckinDate.toDate();

   const today = new Date().toISOString().split("T")[0];
const lastDate = last.toISOString().split("T")[0];

if (lastDate === today){
      return { success: false, message: "Already claimed today😅!" };
    }
  }
}


// ✅ NEW: Ad requirement logic
const today = new Date().toISOString().split("T")[0];

const adsDate = data.daily_ads_date
  ? data.daily_ads_date.toDate().toISOString().split("T")[0]
  : null;
const adsWatchedToday =
  adsDate === today ? (data.daily_ads_watched || 0) : 0;
// ===============================
// DEV MODE (TEMPORARY)
// Disable streak reset for testing
// REMOVE BEFORE PRODUCTION
// ===============================

// if (lastCheckinDate) {
//   const yesterday = new Date(now);
//   yesterday.setDate(yesterday.getDate() - 1);
//
//   if (lastCheckinDate.toDateString() !== yesterday.toDateString()) {
//     checkinDay = 0;
//   }
// }

// ✅ GET CURRENT VALUES
let checkinDay = data.checkinDay || 0;
let checkinCycle = data.checkinCycle || 0;

// Move to next day
checkinDay += 1;

// ✅ BLOCK DAY 4 & DAY 7 if ads not enough
if (checkinDay === 4 && adsWatchedToday < 5) {
  return {
    success: false,
    message: `Watch ${5 - adsWatchedToday} more ads to unlock Day 4`
  };
}

if (checkinDay === 7 && adsWatchedToday < 10) {
  return {
    success: false,
    message: `Watch ${10 - adsWatchedToday} more ads to unlock Day 7`
  };
}

// Handle cycle reset
if (checkinDay > 7) {
  checkinDay = 1;
  checkinCycle += 1;
}

  // Determine reward based on day
  let reward = 0;
  let isOops = false;
  let isGift = false;

  switch (checkinDay) {
    case 1: reward = 1; break;
    case 2: reward = 2; break;
    case 3: reward = 2; break;
    case 4:
      reward = (checkinCycle === 0) ? 3 : 2;
      break;
    case 5:
      reward = 0;
      isOops = true;
      break;
    case 6: reward = 1; break;
    case 7:
      isGift = true;
      if (checkinCycle === 0) {
        // First time reaching day 7 → guaranteed 5 credits
        reward = 5;
      } else {
        // Weighted random: 5% → 5cr, 60% → 3cr, 35% → 4cr
        reward = weightedRandom([
          { value: 5, weight: 5 },
          { value: 3, weight: 60 },
          { value: 4, weight: 35 }
        ]);
      }
      break;
  }

  // Update cycle if day 7 completed
  let newCycle = checkinCycle;
  if (checkinDay === 7) {
    newCycle = checkinCycle + 1;
  }

  const updateData = {
    lastCheckinDate: Timestamp.now(),
    checkinDay: checkinDay,
    checkinCycle: newCycle,
    last_checkin: Timestamp.now(),
    checkin_streak: checkinDay
  };

  if (reward > 0) {
    updateData.credits = increment(reward);
    updateData.total_earned = increment(reward);
}

  await updateDoc(userRef, updateData);

  if (reward > 0) {
    await logTransaction(uid, `Daily Check-In (Day ${checkinDay})`, reward);
  }

  return { success: true, reward, day: checkinDay, cycle: newCycle, isOops, isGift };
}

// ── Helper: Create order ──
export async function createOrder(uid, orderData) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return { success: false, message: "User not found" };

  const data = snap.data();

  let checkinDay = data.checkinDay || 0;
let checkinCycle = data.checkinCycle || 0;


  const currentCredits = data.credits || 0;
  const totalOrdered = data.total_followers_ordered || 0;

  // Validate credits
  if (currentCredits < orderData.credits_spent) {
    return { success: false, message: "Not enough credits!" };
  }

  // Validate follower limit
  if (totalOrdered + orderData.followers >= 1000) {
    return { success: false, message: "Maximum 1000 followers per account reached!" };
  }

  const orderTime = Timestamp.now();
  const completionTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const cost = Number(orderData.credits_spent);

const orderRef = await addDoc(collection(db, "orders"), {
  user_id: uid,
  instagram_username: orderData.instagram_username,
  instagram_link: orderData.instagram_link || "",
followers: orderData.followers,
  credits_spent: cost,
  order_time: orderTime,
  status: "processing",
  completion_time: Timestamp.fromDate(completionTime)
});

  // Deduct credits
await updateDoc(userRef, {
  uid: uid, // 🔥 REQUIRED FOR RULE
  credits: increment(-orderData.credits_spent),
  total_followers_ordered: increment(orderData.followers)
});
  
  // Log transaction
  await logTransaction(uid, `Order ${orderData.followers} followers`, -orderData.credits_spent);

  return { success: true, orderId: orderRef.id, completionTime };
}

// ── Helper: Get transactions ──
export async function getTransactions(uid, limitCount = 50) {
  const q = query(
    collection(db, "transactions"),
    where("user_id", "==", uid),
    orderBy("date", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Helper: Get active orders ──
export async function getActiveOrders(uid) {
  const q = query(
    collection(db, "orders"),
    where("user_id", "==", uid),
    where("status", "==", "processing"),
    orderBy("order_time", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Helper: Submit contact message ──
export async function submitContactMessage(uid, data) {
  await addDoc(collection(db, "contact_messages"), {
    user_id: uid,
    subject: data.subject,
    message: data.message,
    date: serverTimestamp(),
    status: "pending"
  });
  return { success: true };
}

console.log("✅ Firebase shared module loaded.");
