import React, { useState, useEffect, useRef } from 'react';

const THEMES = {
  light: {
    background: '#f8f9fa',
    color: '#212529',
    highlight: '#d4edda',
    border: '#6c757d',
    winnerBorder: '#28a745',
  },
  dark: {
    background: '#212529',
    color: '#f8f9fa',
    highlight: '#155724',
    border: '#adb5bd',
    winnerBorder: '#28a745',
  },
};

function Square({ value, onClick, highlight, theme }) {
  const styles = {
    width: '80px',
    height: '80px',
    fontSize: '32px',
    margin: '5px',
    cursor: 'pointer',
    backgroundColor: highlight ? theme.highlight : theme.background,
    border: highlight ? `3px solid ${theme.winnerBorder}` : `2px solid ${theme.border}`,
    borderRadius: '12px',
    transition: 'all 0.2s ease-in-out',
    boxShadow: value ? `0 4px 8px rgba(0, 0, 0, 0.1)` : 'none',
    transform: value ? 'scale(1.05)' : 'scale(1)',
    color: theme.color,
  };
  return (
    <button style={styles} onClick={onClick}>
      {value}
    </button>
  );
}
function calculateWinner(squares) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (let [a,b,c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a,b,c] };
    }
  }
  return { winner: null, line: [] };
}

// Minimax algorithm for AI
function minimax(squares, isMaximizing, aiSymbol, playerSymbol) {
  const { winner } = calculateWinner(squares);
  if (winner === aiSymbol) return { score: 10 };
  if (winner === playerSymbol) return { score: -10 };
  if (!squares.includes(null)) return { score: 0 };

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = null;
    for (let i = 0; i < squares.length; i++) {
      if (squares[i] === null) {
        squares[i] = aiSymbol;
        const result = minimax(squares, false, aiSymbol, playerSymbol);
        squares[i] = null;
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = i;
        }
      }
    }
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove = null;
    for (let i = 0; i < squares.length; i++) {
      if (squares[i] === null) {
        squares[i] = playerSymbol;
        const result = minimax(squares, true, aiSymbol, playerSymbol);
        squares[i] = null;
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = i;
        }
      }
    }
    return { score: bestScore, move: bestMove };
  }
}
function Board({
  playerSymbol, 
  vsAI, 
  theme,
  addHistoryEntry,
  scores, setScores,
  ties, setTies,
  onGameEnd,
  timePerTurn = 30,
}) {
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [stepNumber, setStepNumber] = useState(0);
  const [xIsNext, setXIsNext] = useState(true);
  const [timer, setTimer] = useState(timePerTurn);
  const timerRef = useRef(null);

  const currentSquares = history[stepNumber];

  // Reset timer on step change
  useEffect(() => {
    setTimer(timePerTurn);
    if(timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [stepNumber]);

  function handleTimeout() {
    if(calculateWinner(currentSquares).winner) return; // game ended
    // Skip turn without move
    setXIsNext(!xIsNext);
    setStepNumber(prev => prev + 1);
    setHistory(prev => prev.concat([currentSquares.slice()]));
  }

  function handleClick(i) {
    if (calculateWinner(currentSquares).winner || currentSquares[i]) return;
    if (vsAI && !xIsNext) return; // prevent click on AI's turn

    const squares = currentSquares.slice();
    squares[i] = xIsNext ? 'X' : 'O';
    const newHistory = history.slice(0, stepNumber + 1).concat([squares]);
    setHistory(newHistory);
    setStepNumber(newHistory.length - 1);
    setXIsNext(!xIsNext);
  }

  // AI plays automatically on its turn using Minimax
  useEffect(() => {
    if (vsAI && !xIsNext) {
      const timerAI = setTimeout(() => {
        const squares = currentSquares.slice();
        if(calculateWinner(squares).winner) return;

        const aiSymbol = xIsNext ? 'O' : 'O'; // AI is always O here, can be improved later
        const playerSym = playerSymbol;
        const { move } = minimax(squares, true, aiSymbol, playerSym);
        if(move !== null && squares[move] === null) {
          squares[move] = aiSymbol;
          const newHistory = history.slice(0, stepNumber + 1).concat([squares]);
          setHistory(newHistory);
          setStepNumber(newHistory.length - 1);
          setXIsNext(true);
        }
      }, 1000);
      return () => clearTimeout(timerAI);
    }
  }, [xIsNext, history, stepNumber, vsAI, currentSquares, playerSymbol]);

  // Update scores and history when game ends or tie
  useEffect(() => {
    const { winner } = calculateWinner(currentSquares);
    if(winner) {
      setScores(prev => ({
        ...prev,
        [winner]: prev[winner] + 1,
      }));
      addHistoryEntry(winner);
      onGameEnd();
    } else if(!currentSquares.includes(null)) {
      setTies(ties + 1);
      addHistoryEntry('Tie');
      onGameEnd();
    }
  }, [currentSquares]);

  const { winner, line } = calculateWinner(currentSquares);
  let status;
  if (winner) {
    status = `Winner: ${winner}`;
  } else if (!currentSquares.includes(null)) {
    status = "It's a Tie!";
  } else {
    status = `Next turn: ${xIsNext ? 'X' : 'O'} (${timer}s left)`;
  }

  function renderSquare(i) {
    return (
      <Square 
        key={i}
        value={currentSquares[i]}
        onClick={() => handleClick(i)}
        highlight={line.includes(i)}
        theme={theme}
      />
    );
  }

  function resetGame() {
    setHistory([Array(9).fill(null)]);
    setStepNumber(0);
    setXIsNext(true);
  }

  return (
    <div style={{ textAlign: 'center', color: theme.color }}>
      <h2>{status}</h2>
      <div style={{ display: 'inline-block' }}>
        {[0,1,2].map(row => (
          <div key={row} style={{ display: 'flex', justifyContent: 'center' }}>
            {[0,1,2].map(col => renderSquare(row*3+col))}
          </div>
        ))}
      </div>
      <br />
      <button
        onClick={resetGame}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: theme.background,
          color: theme.color,
          border: `2px solid ${theme.border}`,
          borderRadius: '8px',
        }}
      >
        Restart
      </button>
    </div>
  );
}
function HistoryTable({ history, theme }) {
  if(history.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', color: theme.color }}>
      <h3>Game History</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: theme.color }}>
        <thead>
          <tr>
            <th style={{borderBottom: `2px solid ${theme.border}`, padding: '8px'}}>Date</th>
            <th style={{borderBottom: `2px solid ${theme.border}`, padding: '8px'}}>Result</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, idx) => (
            <tr key={idx} style={{borderBottom: `1px solid ${theme.border}`}}>
              <td style={{padding: '8px'}}>{new Date(entry.date).toLocaleString()}</td>
              <td style={{padding: '8px'}}>
                {entry.result === 'Tie' ? 'Tie' : `Winner: ${entry.result}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function App() {
  const [playerSymbol, setPlayerSymbol] = useState(null); // null means no choice yet
  const [vsAI, setVsAI] = useState(true);
  const [scores, setScores] = useState({X: 0, O: 0});
  const [ties, setTies] = useState(0);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('ticTacToeHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [themeName, setThemeName] = useState('light');
  const theme = THEMES[themeName];

  function addHistoryEntry(result) {
    const newEntry = { date: new Date().toISOString(), result };
    setHistory(prev => {
      const updated = [...prev, newEntry];
      localStorage.setItem('ticTacToeHistory', JSON.stringify(updated));
      return updated;
    });
  }

  function resetAll() {
    setScores({ X: 0, O: 0 });
    setTies(0);
    setHistory([]);
    localStorage.removeItem('ticTacToeHistory');
    setPlayerSymbol(null);
  }

  const totalGames = scores.X + scores.O + ties;
  const winPercentX = totalGames ? Math.round((scores.X / totalGames) * 100) : 0;
  const winPercentO = totalGames ? Math.round((scores.O / totalGames) * 100) : 0;
  const tiePercent = totalGames ? Math.round((ties / totalGames) * 100) : 0;

  if (playerSymbol === null) {
    return (
      <div
        style={{
          backgroundColor: theme.background,
          color: theme.color,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <h1>Tic Tac Toe</h1>
        <p>Choose your symbol to start:</p>
        <div>
          <button
            onClick={() => setPlayerSymbol('X')}
            style={{
              margin: '10px',
              padding: '15px 30px',
              fontSize: '20px',
              cursor: 'pointer',
              borderRadius: '10px',
              border: `2px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.color,
            }}
          >
            X
          </button>
          <button
            onClick={() => setPlayerSymbol('O')}
            style={{
              margin: '10px',
              padding: '15px 30px',
              fontSize: '20px',
              cursor: 'pointer',
              borderRadius: '10px',
              border: `2px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.color,
            }}
          >
            O
          </button>
        </div>
        <div style={{ marginTop: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={vsAI}
              onChange={() => setVsAI(!vsAI)}
              style={{ marginRight: '8px' }}
            />
            Play against AI
          </label>
        </div>
        <div style={{ marginTop: '30px' }}>
          <button
            onClick={() => setThemeName(themeName === 'light' ? 'dark' : 'light')}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer',
              borderRadius: '10px',
              border: `2px solid ${theme.border}`,
              backgroundColor: theme.background,
              color: theme.color,
            }}
          >
            Switch to {themeName === 'light' ? 'Dark' : 'Light'} Theme
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: theme.background,
        minHeight: '100vh',
        padding: '20px',
        color: theme.color,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center' }}>Tic Tac Toe</h1>
        <Board
          playerSymbol={playerSymbol}
          vsAI={vsAI}
          theme={theme}
          addHistoryEntry={addHistoryEntry}
          scores={scores}
          setScores={setScores}
          ties={ties}
          setTies={setTies}
          onGameEnd={() => { /* Optionnel : actions à la fin d’une partie */ }}
          />
  
          {/* Affichage des scores */}
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <h3>Scores</h3>
            <p>
              X : {scores.X} ({winPercentX}%)
              {' '}|{' '}
              O : {scores.O} ({winPercentO}%)
              {' '}|{' '}
              Ties : {ties} ({tiePercent}%)
            </p>
          </div>
  
          {/* Tableau de l'historique */}
          <HistoryTable history={history} theme={theme} />
  
          {/* Boutons de contrôle */}
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button
              onClick={resetAll}
              style={{
                padding: '10px 25px',
                fontSize: '16px',
                cursor: 'pointer',
                borderRadius: '8px',
                border: `2px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.color,
                marginRight: '15px',
              }}
            >
              Reset All (Scores & History)
            </button>
  
            <button
              onClick={() => setPlayerSymbol(null)}
              style={{
                padding: '10px 25px',
                fontSize: '16px',
                cursor: 'pointer',
                borderRadius: '8px',
                border: `2px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.color,
              }}
            >
              Change Symbol / Settings
            </button>
          </div>
  
          {/* Bouton pour changer le thème */}
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button
              onClick={() => setThemeName(themeName === 'light' ? 'dark' : 'light')}
              style={{
                padding: '10px 25px',
                fontSize: '16px',
                cursor: 'pointer',
                borderRadius: '8px',
                border: `2px solid ${theme.border}`,
                backgroundColor: theme.background,
                color: theme.color,
              }}
            >
              Switch to {themeName === 'light' ? 'Dark' : 'Light'} Theme
            </button>
          </div>
        </div>
      </div>
    );
  }
  