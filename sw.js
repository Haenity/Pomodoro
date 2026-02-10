const CACHE_NAME = 'pomodoro-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// 설치 시 리소스 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting(); // 즉시 활성화를 위해 추가
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // 즉시 제어권을 갖기 위해 추가
});

// 네트워크 요청 가로채기 (오프라인 대응)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
