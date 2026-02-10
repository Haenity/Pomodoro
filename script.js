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

// 알람 소리 재생 (반복 가능하도록 수정)
function playAlarmSound() {
    initAudio();
    if (alarmInterval) return;

    const playTone = () => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.6);
    };

    playTone();
    alarmInterval = setInterval(playTone, 1000);
}

function stopAlarmSound() {
    if (alarmInterval) {
        clearInterval(alarmInterval);
        alarmInterval = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0); // 진동 중지
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
    stopAlarmSound();
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
            vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
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
    initAudio();

    if (isRunning) {
        clearInterval(timerId);
        startBtn.textContent = '다시 시작';
        startBtn.style.background = '#fb7185';
        isRunning = false;
        expectedEndTime = null;
        releaseWakeLock();
        saveTimerState(); // 일시정지 상태 저장
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

    playAlarmSound();
    if ('vibrate' in navigator) {
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }

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
            if (confirm(msg + '\n알람을 끄시겠습니까?')) {
                stopAlarmSound();
                resetTimer();
            }
        }, 100);
    }
}

function resetTimer() {
    clearInterval(timerId);
    stopAlarmSound();
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
    stopAlarmSound();
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



