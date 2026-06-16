// 게임 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;
const DROP_INTERVAL = 600;
const BASE_LINE_SCORE = 10;

// DOM 요소
const boardElement = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-btn');
const gameStatusElement = document.getElementById('game-status');
const nextPieceElement = document.getElementById('next-piece');

// 테트로미노 블록 정의 (1 = 블록이 있는 칸)
const PIECES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: 'piece-i',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: 'piece-o',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: 'piece-t',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: 'piece-s',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: 'piece-z',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: 'piece-j',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: 'piece-l',
  },
};

const PREVIEW_SIZE = 4;

// 빈 보드 데이터 (0 = 빈 칸, 이후 고정된 블록 색상 클래스명이 들어감)
let board = [];
let currentPiece = null;
let nextPieceType = null;
let dropTimer = null;
let keyboardBound = false;
let touchBound = false;
let score = 0;
let isGameOver = false;

/**
 * 빈 보드를 만듭니다.
 */
function createEmptyBoard() {
  const newBoard = [];
  for (let row = 0; row < ROWS; row++) {
    newBoard[row] = [];
    for (let col = 0; col < COLS; col++) {
      newBoard[row][col] = 0;
    }
  }
  return newBoard;
}

/**
 * 새 블록을 만듭니다.
 * @param {string} [type] - 블록 종류 (I, O, T, S, Z, J, L). 생략 시 무작위.
 */
function createPiece(type) {
  const types = Object.keys(PIECES);

  if (!type) {
    type = types[Math.floor(Math.random() * types.length)];
  }

  const pieceDef = PIECES[type];
  const shapeWidth = pieceDef.shape[0].length;

  return {
    type: type,
    shape: pieceDef.shape.map(function (row) {
      return row.slice();
    }),
    color: pieceDef.color,
    row: 0,
    col: Math.floor((COLS - shapeWidth) / 2),
  };
}

/**
 * 무작위 블록 종류를 반환합니다.
 */
function randomPieceType() {
  const types = Object.keys(PIECES);
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * 다음 블록과 현재 블록을 준비합니다.
 */
function initPieces() {
  if (!nextPieceType) {
    nextPieceType = randomPieceType();
  }

  currentPiece = createPiece(nextPieceType);
  nextPieceType = randomPieceType();
}

/**
 * 블록이 (dx, dy)만큼 이동할 수 있는지 검사합니다.
 * @param {object} piece - 현재 블록
 * @param {number} dx - 가로 이동량
 * @param {number} dy - 세로 이동량
 * @param {Array[]} matrix - 고정된 블록이 있는 보드
 */
function canMove(piece, dx, dy, matrix) {
  const shape = piece.shape;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const boardRow = piece.row + r + dy;
      const boardCol = piece.col + c + dx;

      if (boardCol < 0 || boardCol >= COLS) {
        return false;
      }

      if (boardRow < 0 || boardRow >= ROWS) {
        return false;
      }

      if (matrix[boardRow][boardCol]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * shape 배열을 시계 방향으로 90도 회전합니다.
 */
function rotateClockwise(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = [];

  for (let c = 0; c < cols; c++) {
    rotated.push([]);
    for (let r = rows - 1; r >= 0; r--) {
      rotated[c].push(shape[r][c]);
    }
  }

  return rotated;
}

/**
 * shape 배열을 시계 반대 방향으로 90도 회전합니다.
 */
function rotateCounterClockwise(shape) {
  let rotated = shape;
  rotated = rotateClockwise(rotated);
  rotated = rotateClockwise(rotated);
  rotated = rotateClockwise(rotated);
  return rotated;
}

/**
 * 충돌 검사를 통과할 때만 블록을 이동합니다.
 */
function tryMove(dx, dy) {
  if (!currentPiece || isGameOver) {
    return;
  }

  if (canMove(currentPiece, dx, dy, board)) {
    currentPiece.col += dx;
    currentPiece.row += dy;
    renderBoard();
  }
}

/**
 * 충돌 검사를 통과할 때만 블록을 회전합니다.
 * @param {boolean} clockwise - true면 시계 방향, false면 시계 반대 방향
 */
function tryRotate(clockwise) {
  if (!currentPiece || isGameOver) {
    return;
  }

  const newShape = clockwise
    ? rotateClockwise(currentPiece.shape)
    : rotateCounterClockwise(currentPiece.shape);

  const testPiece = {
    row: currentPiece.row,
    col: currentPiece.col,
    shape: newShape,
  };

  if (canMove(testPiece, 0, 0, board)) {
    currentPiece.shape = newShape;
    renderBoard();
  }
}

/**
 * 현재 블록을 보드에 고정합니다.
 */
function lockPiece() {
  if (!currentPiece) {
    return;
  }

  const shape = currentPiece.shape;
  const color = currentPiece.color;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const boardRow = currentPiece.row + r;
      const boardCol = currentPiece.col + c;

      if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
        board[boardRow][boardCol] = color;
      }
    }
  }
}

/**
 * 채워진 줄을 삭제하고 위 줄을 내립니다.
 * @returns {number} 삭제된 줄 수
 */
function clearLines() {
  let linesCleared = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    let isFull = true;

    for (let col = 0; col < COLS; col++) {
      if (!board[row][col]) {
        isFull = false;
        break;
      }
    }

    if (isFull) {
      board.splice(row, 1);
      board.unshift(new Array(COLS).fill(0));
      linesCleared += 1;
      row += 1;
    }
  }

  return linesCleared;
}

/**
 * 삭제된 줄 수에 따라 점수를 더합니다.
 * @param {number} linesCleared
 */
function addScore(linesCleared) {
  if (linesCleared <= 0) {
    return;
  }

  score += BASE_LINE_SCORE * linesCleared * linesCleared;
  scoreElement.textContent = String(score);
}

/**
 * 게임 오버 상태를 표시합니다.
 */
function gameOver() {
  isGameOver = true;
  stopDropLoop();
  currentPiece = null;
  gameStatusElement.hidden = false;
  gameStatusElement.textContent = '게임 오버';
  renderBoard();
}

/**
 * 블록을 고정하고 새 블록을 생성합니다.
 */
function lockAndSpawn() {
  lockPiece();
  addScore(clearLines());
  currentPiece = createPiece(nextPieceType);
  nextPieceType = randomPieceType();

  if (!canMove(currentPiece, 0, 0, board)) {
    gameOver();
  }
}

/**
 * 블록을 한 칸 아래로 내립니다.
 * 더 이상 내릴 수 없으면 고정 후 새 블록을 생성합니다.
 */
function dropPiece() {
  if (!currentPiece || isGameOver) {
    return;
  }

  if (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  } else {
    lockAndSpawn();
  }

  renderBoard();
}

/**
 * 블록을 바닥까지 즉시 내린 뒤 고정합니다.
 */
function hardDrop() {
  if (!currentPiece || isGameOver) {
    return;
  }

  while (canMove(currentPiece, 0, 1, board)) {
    currentPiece.row += 1;
  }

  lockAndSpawn();
  renderBoard();
}

/**
 * 자동 낙하 타이머를 시작합니다.
 */
function startDropLoop() {
  stopDropLoop();
  dropTimer = setInterval(dropPiece, DROP_INTERVAL);
}

/**
 * 자동 낙하 타이머를 멈춥니다.
 */
function stopDropLoop() {
  if (dropTimer !== null) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

/**
 * 보드 그리드를 화면에 그립니다.
 */
function renderBoard() {
  boardElement.innerHTML = '';

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      if (board[row][col]) {
        cell.classList.add('filled', board[row][col]);
      }

      cell.dataset.row = row;
      cell.dataset.col = col;
      boardElement.appendChild(cell);
    }
  }

  drawPiece();
  renderNextPiece();
}

/**
 * 다음 블록 미리보기를 그립니다.
 */
function renderNextPiece() {
  nextPieceElement.innerHTML = '';

  for (let row = 0; row < PREVIEW_SIZE; row++) {
    for (let col = 0; col < PREVIEW_SIZE; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      nextPieceElement.appendChild(cell);
    }
  }

  if (!nextPieceType) {
    return;
  }

  const pieceDef = PIECES[nextPieceType];
  const shape = pieceDef.shape;
  const color = pieceDef.color;
  const offsetRow = Math.floor((PREVIEW_SIZE - shape.length) / 2);
  const offsetCol = Math.floor((PREVIEW_SIZE - shape[0].length) / 2);
  const cells = nextPieceElement.children;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const index = (offsetRow + r) * PREVIEW_SIZE + (offsetCol + c);
      cells[index].classList.add('filled', color);
    }
  }
}

/**
 * 현재 블록을 보드 위에 그립니다.
 */
function drawPiece() {
  if (!currentPiece) {
    return;
  }

  const shape = currentPiece.shape;
  const color = currentPiece.color;
  const pieceRow = currentPiece.row;
  const pieceCol = currentPiece.col;

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) {
        continue;
      }

      const boardRow = pieceRow + r;
      const boardCol = pieceCol + c;
      const cell = boardElement.querySelector(
        '[data-row="' + boardRow + '"][data-col="' + boardCol + '"]'
      );

      if (cell) {
        cell.classList.add('filled', color);
      }
    }
  }
}

/**
 * 게임을 초기 상태로 되돌립니다.
 */
function resetGame() {
  stopDropLoop();
  isGameOver = false;
  score = 0;
  board = createEmptyBoard();
  nextPieceType = null;
  initPieces();
  scoreElement.textContent = '0';
  gameStatusElement.hidden = true;
  gameStatusElement.textContent = '';
  renderBoard();
  startDropLoop();
}

/**
 * 키보드 조작을 처리합니다.
 */
function handleKeyDown(event) {
  if (!currentPiece || isGameOver) {
    return;
  }

  switch (event.code) {
    case 'ArrowLeft':
      event.preventDefault();
      tryMove(-1, 0);
      break;
    case 'ArrowRight':
      event.preventDefault();
      tryMove(1, 0);
      break;
    case 'ArrowDown':
      event.preventDefault();
      tryRotate(true);
      break;
    case 'ArrowUp':
      event.preventDefault();
      tryRotate(false);
      break;
    case 'Space':
      event.preventDefault();
      hardDrop();
      break;
  }
}

/**
 * 터치 버튼 조작을 한 번만 등록합니다.
 */
function bindTouchControls() {
  if (touchBound) {
    return;
  }

  const buttons = [
    { id: 'btn-left', action: function () { tryMove(-1, 0); } },
    { id: 'btn-right', action: function () { tryMove(1, 0); } },
    { id: 'btn-rotate-cw', action: function () { tryRotate(true); } },
    { id: 'btn-rotate-ccw', action: function () { tryRotate(false); } },
    { id: 'btn-drop', action: hardDrop },
  ];

  buttons.forEach(function (buttonConfig) {
    const button = document.getElementById(buttonConfig.id);

    if (!button) {
      return;
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      buttonConfig.action();
    });
  });

  touchBound = true;
}

/**
 * 키보드 이벤트를 한 번만 등록합니다.
 */
function bindKeyboard() {
  if (keyboardBound) {
    return;
  }

  document.addEventListener('keydown', handleKeyDown);
  keyboardBound = true;
}

// 시작 / 재시작 버튼
startButton.addEventListener('click', function () {
  resetGame();
  startButton.textContent = '재시작';
});

bindKeyboard();
bindTouchControls();
resetGame();
