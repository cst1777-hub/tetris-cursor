// 게임 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;

// DOM 요소
const boardElement = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const startButton = document.getElementById('start-btn');

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

// 빈 보드 데이터 (0 = 빈 칸, 이후 고정된 블록 색상 클래스명이 들어감)
let board = [];
let currentPiece = null;

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
  board = createEmptyBoard();
  currentPiece = createPiece();
  scoreElement.textContent = '0';
  renderBoard();
}

// 시작 / 재시작 버튼
startButton.addEventListener('click', function () {
  resetGame();
  startButton.textContent = '재시작';
});

// 페이지가 열리면 빈 보드와 블록 하나를 먼저 보여줍니다.
resetGame();
