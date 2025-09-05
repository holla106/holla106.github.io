import { db } from './firebase-config.js';
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

async function sha256(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

async function generateFingerprint() {
  const browser = navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1] || 'Unknown';
  const language = navigator.language || 'unknown';
  const screenWidth = window.screen.width;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const salt = Date.now().toString() + Math.random().toString();
  const input = `${browser}|${language}|${screenWidth}|${maxTouchPoints}|${salt}`;
  const hash = await sha256(input);
  return hash.substring(0, 16);
}

let visitorId = localStorage.getItem('visitorId');
if (!visitorId) {
  generateFingerprint().then(id => {
    visitorId = id;
    localStorage.setItem('visitorId', visitorId);
    checkAndRecordVisitor();
  }).catch(error => {
    console.error('Failed to generate fingerprint:', error);
    visitorId = Array(16).fill().map(() => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
    localStorage.setItem('visitorId', visitorId);
    checkAndRecordVisitor();
  });
} else {
  checkAndRecordVisitor();
}

function checkAndRecordVisitor() {
  const visitorRef = ref(db, `visitors/${visitorId}`);
  const privateVisitorRef = ref(db, `private/visitors/${visitorId}`);
  get(visitorRef).then((snapshot) => {
    if (!snapshot.exists()) {
      Promise.all([
        set(visitorRef, {
          timestamp: Date.now()
        }),
        set(privateVisitorRef, {
          userAgent: navigator.userAgent
        })
      ]).catch(error => {
        console.error('Failed to record visitor:', error);
      });
    } else {
      set(visitorRef, {
        timestamp: Date.now()
      }).catch(error => {
        console.error('Failed to update timestamp:', error);
      });
    }
  }).catch(error => {
    console.error('Failed to check visitor:', error);
  });
}

function updateOnlineVisitors(snapshot) {
  if (!snapshot.exists()) {
    return 0;
  }

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const allVisitors = snapshot.val();
  const onlineCount = Object.values(allVisitors).filter(data => data.timestamp >= fiveMinutesAgo).length;
  document.getElementById('online-visitor-count').textContent = onlineCount;

  return onlineCount;
}

let visitorsInterval;
const visitorsRef = ref(db, `visitors`);
onValue(visitorsRef, (snapshot) => {
  const visitorElement = document.getElementById('visitor-count');
  if (!visitorElement) {
    return;
  }

  const visitorCount = snapshot.exists() ? Object.keys(snapshot.val() || {}).length : 0;

  visitorElement.textContent = visitorCount;

  // clear tasks
  if (visitorsInterval != undefined) {
    clearInterval(visitorsInterval);
  }

  // visitor count > 0 ?
  if (updateOnlineVisitors(snapshot) > 1) {
    // set a interval
    visitorsInterval = setInterval(() => {
      get(visitorsRef).then((snapshot) => {
        // clear interval if 0 visitors
        if (updateOnlineVisitors(snapshot) <= 1) {
          clearInterval(visitorsInterval);
        }
      });
    }, 60 * 1000);
  }
});

setInterval(() => {
  const visitorRef = ref(db, `visitors/${visitorId}`);
  set(visitorRef, {
    timestamp: Date.now()
  }).catch(error => {
    console.error('Failed to update timestamp:', error);
  });
}, 5 * 60 * 1000);