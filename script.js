let timeLeft = 25 * 60;
let timerId = null;
let isRunning = false;
let currentTotalTime = 25 * 60;

const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('status');
const progressBar = document.getElementById('progress');

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.textContent = timeString;

    document.title = `${timeString} - Haenity Pomodoro`;

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

function startTimer() {
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

                // 진동 알림 추가 (스마트폰 지원 시)
                if ('vibrate' in navigator) {
                    navigator.vibrate([200, 100, 200]); // 200ms 진동, 100ms 쉬고, 200ms 진동
                }

                alert(currentTotalTime === 300 ? '휴식이 끝났습니다! 다시 시작해볼까요?' : '설정하신 시간이 지났습니다! 잠시 쉬어 가세요.');
                resetTimer();
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
