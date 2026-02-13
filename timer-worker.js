// Pomodoro Timer Worker
let timerId = null;

self.onmessage = function (e) {
    if (e.data.action === 'start') {
        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            self.postMessage({ type: 'tick' });
        }, 1000);
    } else if (e.data.action === 'stop') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }
};
