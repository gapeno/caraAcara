import { useState } from 'react';
import './DotsAndBoxes.css';

const CELL = 60;
const PAD  = 24;
const DOT_R = 5;
const LINE_W = 4;
const HIT_THICK = 18;

const PLAYER_COLORS = { p1: '#7c4dff', p2: '#00bcd4' };
const BOX_FILLS     = { p1: 'rgba(124,77,255,0.18)', p2: 'rgba(0,188,212,0.18)' };

export default function DotsAndBoxes({ state, players, onMove, onRestart }) {
  const [hovered, setHovered] = useState(null);

  const { rows, cols, h_lines, v_lines, boxes, current_player, status, winner, scores } = state;

  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const winnerName = winner ? (playerMap[winner]?.name ?? winner) : null;
  const currentName = playerMap[current_player]?.name ?? current_player;

  const svgW = PAD * 2 + (cols - 1) * CELL;
  const svgH = PAD * 2 + (rows - 1) * CELL;
  const x = (c) => PAD + c * CELL;
  const y = (r) => PAD + r * CELL;

  function handleEdge(type, row, col) {
    if (status !== 'in_progress') return;
    onMove({ type, row, col });
  }

  function isHovered(type, row, col) {
    return hovered?.type === type && hovered.row === row && hovered.col === col;
  }

  return (
    <div className="dab-container">
      {/* Players */}
      <div className="dab-players">
        {players.map((p) => (
          <div
            key={p.id}
            className={`dab-player ${current_player === p.id && status === 'in_progress' ? 'active' : ''} ${winner === p.id ? 'winner' : ''}`}
            style={{ '--pc': PLAYER_COLORS[p.id] }}
          >
            <span className="dab-dot" style={{ background: PLAYER_COLORS[p.id] }} />
            <span className="dab-player-name">{p.name}</span>
            <span className="dab-player-score">{scores?.[p.id] ?? 0}</span>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className={`dab-status ${status !== 'in_progress' ? 'game-over' : ''}`}>
        {status === 'win'  && `${winnerName} wins!`}
        {status === 'draw' && "It's a draw!"}
        {status === 'in_progress' && `${currentName}'s turn`}
      </div>

      {/* Board */}
      <svg
        width={svgW}
        height={svgH}
        className="dab-svg"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Box fills */}
        {Array.from({ length: rows - 1 }, (_, r) =>
          Array.from({ length: cols - 1 }, (_, c) => {
            const owner = boxes[r][c];
            if (!owner) return null;
            const p = playerMap[owner];
            return (
              <g key={`box-${r}-${c}`}>
                <rect
                  x={x(c)} y={y(r)}
                  width={CELL} height={CELL}
                  fill={BOX_FILLS[owner]}
                />
                <text
                  x={x(c) + CELL / 2} y={y(r) + CELL / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={PLAYER_COLORS[owner]}
                  fontSize={13} fontWeight={700}
                >
                  {p?.name?.[0]?.toUpperCase() ?? owner}
                </text>
              </g>
            );
          })
        )}

        {/* Horizontal edges */}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols - 1 }, (_, c) => {
            const drawn = h_lines[r][c];
            const hov   = isHovered('h', r, c);
            const x1 = x(c) + DOT_R, x2 = x(c + 1) - DOT_R;
            const yy = y(r);
            return (
              <g key={`h-${r}-${c}`}>
                <line
                  x1={x1} y1={yy} x2={x2} y2={yy}
                  stroke={
                    drawn ? '#666'
                    : hov  ? PLAYER_COLORS[current_player]
                    : 'transparent'
                  }
                  strokeWidth={LINE_W}
                  strokeLinecap="round"
                  opacity={drawn ? 1 : 0.55}
                />
                {!drawn && (
                  <rect
                    x={x1} y={yy - HIT_THICK / 2}
                    width={x2 - x1} height={HIT_THICK}
                    fill="transparent"
                    style={{ cursor: status === 'in_progress' ? 'pointer' : 'default' }}
                    onClick={() => handleEdge('h', r, c)}
                    onMouseEnter={() => setHovered({ type: 'h', row: r, col: c })}
                    onMouseLeave={() => setHovered(null)}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Vertical edges */}
        {Array.from({ length: rows - 1 }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const drawn = v_lines[r][c];
            const hov   = isHovered('v', r, c);
            const xx = x(c);
            const y1 = y(r) + DOT_R, y2 = y(r + 1) - DOT_R;
            return (
              <g key={`v-${r}-${c}`}>
                <line
                  x1={xx} y1={y1} x2={xx} y2={y2}
                  stroke={
                    drawn ? '#666'
                    : hov  ? PLAYER_COLORS[current_player]
                    : 'transparent'
                  }
                  strokeWidth={LINE_W}
                  strokeLinecap="round"
                  opacity={drawn ? 1 : 0.55}
                />
                {!drawn && (
                  <rect
                    x={xx - HIT_THICK / 2} y={y1}
                    width={HIT_THICK} height={y2 - y1}
                    fill="transparent"
                    style={{ cursor: status === 'in_progress' ? 'pointer' : 'default' }}
                    onClick={() => handleEdge('v', r, c)}
                    onMouseEnter={() => setHovered({ type: 'v', row: r, col: c })}
                    onMouseLeave={() => setHovered(null)}
                  />
                )}
              </g>
            );
          })
        )}

        {/* Dots (rendered last so they sit on top) */}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <circle
              key={`dot-${r}-${c}`}
              cx={x(c)} cy={y(r)} r={DOT_R}
              fill="var(--text)"
            />
          ))
        )}
      </svg>

      {status !== 'in_progress' && (
        <button className="btn btn-primary dab-restart" onClick={onRestart}>
          Play Again
        </button>
      )}
    </div>
  );
}
