let timeLeft = 25 * 60;
let timerId = null;
let isRunning = false;
let currentTotalTime = 25 * 60;

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress');

// 알림 권한 요청
if ('Notification' in window) {
    Notification.requestPermission();
}

// 오디오 컨텍스트 설정 (사용자 상호작용 시 활성화)
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// 비프음 재생 함수 (Web Audio API 사용으로 파일 없이도 소리 재생)
function playAlarmSound() {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1);
}

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.textContent = timeString;

    document.title = `${timeString} - 집중의시간`;

    const progress = ((currentTotalTime - timeLeft) / currentTotalTime) * 100;
    progressBar.style.width = `${progress}%`;
}

function setPreset(minutes, isBreak = false) {
    clearInterval(timerId);
    isRunning = false;
    currentTotalTime = minutes * 60;
    timeLeft = currentTotalTime;

    // 상태 텍스트 변경
    statusText.textContent = isBreak ? "잠시 쉬어 가세요!" : "집중할 시간입니다!";
    startBtn.textContent = '시작하기';
    startBtn.style.background = '#fb7185';

    // 배경 테마 변경
    document.body.className = `theme-${minutes}`;

    updateDisplay();
}

function sendNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('집중의시간', {
            body: message,
            icon: 'https://cdn-icons-png.flaticon.com/512/3232/3232711.png'
        });
    }
}

function startTimer() {
    initAudio(); // 첫 클릭 시 오디오 활성화

    if (isRunning) {
        clearInterval(timerId);
        startBtn.textContent = '다시 시작';
        startBtn.style.background = '#fb7185';
        isRunning = false;
    } else {
        isRunning = true;
        startBtn.textContent = '일시 정지';
        startBtn.style.background = '#94a3b8';
        timerId = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft === 0) {
                clearInterval(timerId);

                // 소리와 진동 동시 실행
                playAlarmSound();
                if ('vibrate' in navigator) {
                    navigator.vibrate([1000, 500, 1000, 500, 1000]);
                }

                const msg = currentTotalTime === 300 ? '휴식이 끝났습니다! 다시 시작해볼까요?' : '설정하신 시간이 지났습니다! 잠시 쉬어 가세요.';
                sendNotification(msg);

                setTimeout(() => {
                    alert(msg);
                    resetTimer();
                }, 100);
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerId);
    timeLeft = currentTotalTime;
    isRunning = false;
    startBtn.textContent = '시작하기';
    startBtn.style.background = '#fb7185';
    updateDisplay();
}

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);

// 초기 테마 설정 (25분 테마)
document.body.className = 'theme-25';
updateDisplay();
