import { db } from './firebase-config.js';
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

let _postId = getPostId();
let _visitorId = localStorage.getItem('visitorId');
let _liked = false;
let likeElement = document.getElementById('like-button');

function getPostId() {
  const path = window.location.pathname;
  const match = path.match(/^(?:\/([a-z]{2,3}))?\/posts\/([a-zA-Z0-9_-]+)\/$/);
  if (!match) return '';

  let lang = match[1];
  if (lang === undefined)
    lang = '';

  const postId = '__' + lang + '__' + match[2];
  return postId;
}

function recordPostView() {
  const postVisitorRef = ref(db, `posts/${_postId}/visitors/${_visitorId}`);
  get(postVisitorRef).then((snapshot) => {
    if (!snapshot.exists()) {
      // not visited, record and increment view count
      set(postVisitorRef, {
        timestamp: Date.now(),
        liked: false
      }).then(() => {
        const viewCountRef = ref(db, `posts/${_postId}/viewcount`);
        get(viewCountRef).then((countSnapshot) => {
          const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
          set(viewCountRef, currentCount + 1).catch(error => {
            console.error('Failed to increment view count:', error);
          });
          likeElement.disabled = false;
        }).catch(error => {
          console.error('Failed to fetch view count:', error);
        });
      }).catch(error => {
        console.error('Failed to record post view:', error);
      });
    } else {
      const data = snapshot.val();
      _liked = data.liked;
      // visited, only update timestamp
      set(postVisitorRef, {
        timestamp: Date.now(),
        liked: _liked
      }).catch(error => {
        console.error('Failed to update post timestamp:', error);
      });

      if (_liked) {
        likeElement.classList.add('active');
      }
      likeElement.disabled = false;
    }
  }).catch(error => {
    console.error('Failed to check post visitor:', error);
  });
}

if (_postId.length > 0) {
  let viewsElement = document.getElementById('post-view-count');
  if (viewsElement) {
    const postViewRef = ref(db, `posts/${_postId}/viewcount`);
    onValue(postViewRef, (snapshot) => {
      const viewCount = snapshot.exists() ? snapshot.val() : 0;
      document.getElementById('post-view-count').textContent = viewCount;
    }, (error) => {
      console.error('Failed to fetch post view count:', error);
      document.getElementById('post-view-count').textContent = '錯誤';
    });

    recordPostView();
  }

  if (likeElement) {
    likeElement.disabled = true;

    const postLikeRef = ref(db, `posts/${_postId}/likecount`);
    onValue(postLikeRef, (snapshot) => {
      const viewCount = snapshot.exists() ? snapshot.val() : 0;
      document.getElementById('post-like-count').textContent = viewCount;
    }, (error) => {
      console.error('Failed to fetch post like count:', error);
      document.getElementById('post-like-count').textContent = '錯誤';
    });

    likeElement.addEventListener('click', () => {
      likeElement.disabled = true;
      const postVisitorRef = ref(db, `posts/${_postId}/visitors/${_visitorId}`);
      get(postVisitorRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          _liked = data.liked ? false : true;
          set(postVisitorRef, {
            timestamp: Date.now(),
            liked: _liked
          }).then(() => {
            const likeCountRef = ref(db, `posts/${_postId}/likecount`);
            get(likeCountRef).then((countSnapshot) => {
              const currentCount = countSnapshot.exists() ? countSnapshot.val() : 0;
              set(likeCountRef, currentCount + (_liked ? 1 : -1)).catch(error => {
                console.error('Failed to update like count:', error);
              });
            }).catch(error => {
              console.error('Failed to fetch like count:', error);
            });
            if (_liked) {
              likeElement.classList.add('active');
            } else {
              likeElement.classList.remove('active');
            }
            likeElement.disabled = false;
          }).catch(error => {
            console.error('Failed to record like count:', error);
          });
        }
      }).catch(error => {
        console.error('Failed to check post visitor:', error);
      });
    });
  }
  
  let dislikeElement = document.getElementById('dislike-button');
  if (dislikeElement) {
    dislikeElement.addEventListener('click', () => {
      alert(`不可以不喜歡!!! ٩(๑\`^´๑)۶\nYou can't dislike it!!! `);
    });
  }
}