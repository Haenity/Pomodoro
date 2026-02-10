let timeLeft = 25 * 60;
let timerId = null;
let isRunning = false;
let currentTotalTime = 25 * 60;
let expectedEndTime = null;
let wakeLock = null;
let alarmInterval = null;

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress');
const focusCountDisplay = document.getElementById('focusCount');

// 알람 끄기 버튼 생성 및 추가
const stopAlarmBtn = document.createElement('button');
stopAlarmBtn.id = 'stopAlarmBtn';
stopAlarmBtn.textContent = '알람 끄기';
stopAlarmBtn.className = 'btn-stop-alarm';
stopAlarmBtn.style.display = 'none';
document.querySelector('.controls').appendChild(stopAlarmBtn);

// --- 상태 유지 로직 추가 (localStorage) ---
function saveTimerState() {
    const state = {
        expectedEndTime,
        currentTotalTime,
        isRunning,
        timeLeft: isRunning ? timeLeft : timeLeft // 일시정지 시점의 남은 시간 저장용
    };
    localStorage.setItem('pomodoro_state', JSON.stringify(state));
}

function clearTimerState() {
    localStorage.removeItem('pomodoro_state');
}

function loadTimerState() {
    const saved = localStorage.getItem('pomodoro_state');
    if (!saved) return null;
    return JSON.parse(saved);
}

// 일일 집중 횟수 관리
function getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function loadFocusCount() {
    const today = getTodayDateString();
    const count = localStorage.getItem(`focus_count_${today}`) || 0;
    focusCountDisplay.textContent = count;
    return parseInt(count);
}

function incrementFocusCount() {
    const today = getTodayDateString();
    let count = loadFocusCount();
    count++;
    localStorage.setItem(`focus_count_${today}`, count);
    focusCountDisplay.textContent = count;
}

// 초기 로드
loadFocusCount();

// 알림 권한 요청
if ('Notification' in window) {
    Notification.requestPermission();
}

// 오디오 컨텍스트 설정
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 화면 꺼짐 방지 (Wake Lock API)
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// 진동 패턴 정의 (기존보다 2배 더 길고 강렬하게)
const intenseVibratePattern = [2000, 500, 2000, 500, 2000, 500, 2000];

// 알람 소리 재생 로직 제거하고 진동 전용 제어로 변경
let isVibrating = false;
let vibrationInterval = null;

function startIntenseVibration() {
    if ('vibrate' in navigator) {
        isVibrating = true;
        const vibrate = () => {
            navigator.vibrate(intenseVibratePattern);
        };
        vibrate();
        // 진동 패턴이 길므로 반복 주기 설정
        vibrationInterval = setInterval(vibrate, 8000);
    }
}

function stopAlarm() {
    isVibrating = false;
    if (vibrationInterval) {
        clearInterval(vibrationInterval);
        vibrationInterval = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0); // 진동 즉시 중지
    }
    stopAlarmBtn.style.display = 'none';
    startBtn.style.display = 'block';
    resetBtn.style.display = 'block';
}

function updateDisplay() {
    const minutes = Math.floor(Math.max(0, timeLeft) / 60);
    const seconds = Math.max(0, timeLeft) % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.textContent = timeString;

    document.title = `${timeString} - 집중의시간`;

    const progress = ((currentTotalTime - timeLeft) / currentTotalTime) * 100;
    progressBar.style.width = `${Math.min(100, progress)}%`;
}

function setPreset(minutes, isBreak = false) {
    clearInterval(timerId);
    stopAlarm();
    isRunning = false;
    currentTotalTime = minutes * 60;
    timeLeft = currentTotalTime;
    expectedEndTime = null;
    releaseWakeLock();
    clearTimerState();

    statusText.textContent = isBreak ? "잠시 쉬어 가세요!" : "집중할 시간입니다!";
    startBtn.textContent = '시작하기';
    startBtn.style.background = '#fb7185';

    document.body.className = `theme-${minutes}`;
    updateDisplay();
}

function sendNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const options = {
            body: message,
            icon: 'https://cdn-icons-png.flaticon.com/512/3232/3232711.png',
            vibrate: [1000, 200, 1000, 200, 1000, 200, 1000], // 알림 진동도 강화
            tag: 'pomodoro-notification',
            requireInteraction: true
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('집중의시간', options);
            });
        } else {
            new Notification('집중의시간', options);
        }
    }
}

function startTimer() {
    initAudio(); // WakeLock 등을 위해 유지

    if (isRunning) {
        clearInterval(timerId);
        startBtn.textContent = '다시 시작';
        startBtn.style.background = '#fb7185';
        isRunning = false;
        expectedEndTime = null;
        releaseWakeLock();
        saveTimerState();
    } else {
        isRunning = true;
        startBtn.textContent = '일시 정지';
        startBtn.style.background = '#94a3b8';
        requestWakeLock();

        expectedEndTime = Date.now() + (timeLeft * 1000);
        saveTimerState();

        timerId = setInterval(() => {
            timeLeft = Math.round((expectedEndTime - Date.now()) / 1000);

            if (timeLeft <= 0) {
                finishTimer();
            } else {
                updateDisplay();
            }
        }, 1000);
    }
}

function finishTimer() {
    timeLeft = 0;
    updateDisplay();
    clearInterval(timerId);
    expectedEndTime = null;
    isRunning = false;
    releaseWakeLock();
    clearTimerState();

    // 소리 대신 강력한 진동 시작
    startIntenseVibration();

    if (currentTotalTime !== 300) {
        incrementFocusCount();
    }

    const msg = currentTotalTime === 300 ? '휴식이 끝났습니다! 다시 시작해볼까요?' : '설정하신 시간이 지났습니다! 잠시 쉬어 가세요.';
    sendNotification(msg);

    startBtn.style.display = 'none';
    resetBtn.style.display = 'none';
    stopAlarmBtn.style.display = 'block';

    if (document.visibilityState === 'visible') {
        setTimeout(() => {
            if (confirm(msg + '\n진동을 끄시겠습니까?')) {
                stopAlarm();
                resetTimer();
            }
        }, 100);
    }
}

function resetTimer() {
    clearInterval(timerId);
    stopAlarm();
    timeLeft = currentTotalTime;
    isRunning = false;
    expectedEndTime = null;
    startBtn.textContent = '시작하기';
    startBtn.style.background = '#fb7185';
    startBtn.style.display = 'block';
    resetBtn.style.display = 'block';
    releaseWakeLock();
    clearTimerState();
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
stopAlarmBtn.addEventListener('click', () => {
    stopAlarm();
    resetTimer();
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning && expectedEndTime) {
        timeLeft = Math.round((expectedEndTime - Date.now()) / 1000);
        if (timeLeft <= 0) {
            finishTimer();
        } else {
            updateDisplay();
        }
    }
});

// --- 초기 복구 로직 ---
function recoverState() {
    const saved = loadTimerState();
    if (!saved) return;

    currentTotalTime = saved.currentTotalTime || 25 * 60;
    document.body.className = `theme-${currentTotalTime / 60}`;

    if (saved.isRunning && saved.expectedEndTime) {
        expectedEndTime = saved.expectedEndTime;
        isRunning = true;
        timeLeft = Math.round((expectedEndTime - Date.now()) / 1000);

        if (timeLeft <= 0) {
            finishTimer();
        } else {
            startBtn.textContent = '일시 정지';
            startBtn.style.background = '#94a3b8';
            requestWakeLock();
            timerId = setInterval(() => {
                timeLeft = Math.round((expectedEndTime - Date.now()) / 1000);
                if (timeLeft <= 0) {
                    finishTimer();
                } else {
                    updateDisplay();
                }
            }, 1000);
        }
    } else {
        timeLeft = saved.timeLeft || currentTotalTime;
        if (timeLeft < currentTotalTime) {
            startBtn.textContent = '다시 시작';
        }
    }
    updateDisplay();
}

// 실행
recoverState();
if (!isRunning) {
    document.body.className = 'theme-25';
    updateDisplay();
}



