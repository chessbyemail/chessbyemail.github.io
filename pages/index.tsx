import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import { ReactHTMLElement, useEffect, useMemo, useRef, useState } from "react";
import { twCascade } from "@mariusmarais/tailwind-cascade";
import { useRouter } from "next/router";
import Link from "next/link";
import getConfig from "next/config";
import BlackKing from "../images/Chess_kdt45.svg";
import BlackQueen from "../images/Chess_qdt45.svg";
import BlackBishop from "../images/Chess_bdt45.svg";
import BlackKnight from "../images/Chess_ndt45.svg";
import BlackRook from "../images/Chess_rdt45.svg";
import BlackPawn from "../images/Chess_pdt45.svg";
import WhiteKing from "../images/Chess_klt45.svg";
import WhiteQueen from "../images/Chess_qlt45.svg";
import WhiteBishop from "../images/Chess_blt45.svg";
import WhiteKnight from "../images/Chess_nlt45.svg";
import WhiteRook from "../images/Chess_rlt45.svg";
import WhitePawn from "../images/Chess_plt45.svg";

const { publicRuntimeConfig } = getConfig();

const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;
const BLACK = 8;
const WHITE = 0;

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export default function Home() {
  const router = useRouter();
  const { state: inputHistory } = router.query;

  const history = useMemo(() => {
    const dest = [];
    const src = inputHistory || [];
    for (let i = 0; i < src.length; i += 2) {
      let from = BASE64.indexOf(src[i + 0]);
      let to = BASE64.indexOf(src[i + 1]);

      dest.push([from, to]);
    }
    return dest;
  }, [inputHistory]);

  const [hideWelcome, setHideWelcome] = useState(false);
  const [hideLink, setHideLink] = useState(false);
  const [hideOpponentsMove, setHideOpponentsMove] = useState(false);

  const [cursorPos, setCursorPos] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number | null>(null);

  const initialBoard = useMemo(() => parseFen(FEN).board, [FEN]);

  const [move, setMove] = useState<number[] | null>(null);

  const {
    board,
    check,
    mate,
    lostPieces,
    castling,
  }: {
    board: number[];
    lostPieces: number[];
    check: boolean;
    mate: boolean;
    castling: {};
  } = useMemo(() => {
    const board = [...initialBoard];
    const lostPieces = [];
    const castling = { K: true, Q: true, k: true, q: true };

    let lastPos: number | null = null;

    for (const [from, to] of history.concat(move ? [move] : [])) {
      if (board[to]) {
        lostPieces.push(board[to]);
      }
      board[to] = board[from];
      board[from] = 0;

      if (from === 0) {
        castling.q = false;
      } else if (from === 4) {
        castling.q = false;
        castling.k = false;
      } else if (from === 7) {
        castling.k = false;
      } else if (from === 56) {
        castling.Q = false;
      } else if (from === 60) {
        castling.Q = false;
        castling.K = false;
      } else if (from === 63) {
        castling.K = false;
      }

      lastPos = to;
    }

    const check =
      lastPos !== null &&
      getPossibleMoves(board, lastPos)
        .map((i) => board[i])
        .includes(board[lastPos] >= BLACK ? WHITE + KING : BLACK + KING);

    let mate = false;
    if (check) {
      const checkedPlayerPositions = board
        .map((_, pos) => pos)
        .filter((pos) =>
          lastPos !== null && board[lastPos] >= BLACK
            ? board[pos] < BLACK
            : board[pos] >= BLACK
        );

      mate = true;
      for (const from of checkedPlayerPositions) {
        const { possibleMoves } = getMoveRestrictions(board, from);
        if (possibleMoves.length > 0) {
          mate = false;
          break;
        }
      }
    }

    return { board, lostPieces, check, mate, castling };
  }, [FEN, history, move]);

  useEffect(() => void console.log(castling), [castling]);

  const blacksMove = history.length % 2 != 0;

  const newStateLink = useMemo(() => {
    if (move === null) {
      return null;
    }

    const newEncodedHistory = history
      .concat([move || []])
      .flat()
      .map((x) => BASE64[x])
      .join("");

    return `${
      typeof window !== "undefined" ? window.location.origin : ""
    }/?state=${newEncodedHistory}`;
  }, [history, move, check]);

  const { x0, y0, dx, dy } = useMemo(() => {
    if (Array.isArray(move)) {
      const from = rowcol(move[0], blacksMove);
      const to = rowcol(move[1], blacksMove);

      const x0 = 1 + 2 * from[1];
      const y0 = 1 + 2 * from[0];

      const x1 = 1 + 2 * to[1];
      const y1 = 1 + 2 * to[0];

      const dx = x1 - x0;
      const dy = y1 - y0;

      const norm = Math.sqrt(dx * dx + dy * dy);

      const ndx = dx / norm;
      const ndy = dy / norm;

      return { x0, y0, dx: ndx * (norm - 0.71), dy: ndy * (norm - 0.71) };
    } else {
      return {};
    }
  }, [move]);

  const [showLink, setShowLink] = useState(false);

  const linkInputRef = useRef<HTMLInputElement | null>(null);

  // useEffect(() => {
  //   // TODO: use input onChange event instead?
  //   if (Array.isArray(move)) {
  //     linkInputRef.current?.focus();
  //   }
  // }, [move]);

  // http://localhost:3000/?state=zjKS0sMU5oDn
  const { possibleMoves, forbiddenMoves } = useMemo(
    () => getMoveRestrictions(board, cursorPos),
    [board, cursorPos]
  );

  return (
    <div className="w-full min-h-full flex flex-col items-center justify-center gap-4 md:py-4">
      <h1 className="text-3xl font-black text-black dark:text-slate-300">
        chess<span className="text-slate-400 dark:text-slate-500">by</span>email
        <span className="text-2xl">.com</span>
      </h1>
      <div className="flex flex-col w-full md:w-auto gap-1 md:gap-0">
        <AspectBox
          outerClassName="md:px-8 w-full"
          aspect="6.25%"
          innerClassName="flex flex-row"
        >
          {lostPieces
            .filter((piece) => (blacksMove ? piece < BLACK : piece >= BLACK))
            .map((piece, i) => (
              <RawPiece key={i} className="" piece={piece} />
            ))}
        </AspectBox>
        <div className="md:w-auto w-full flex flex-col gap-0">
          <div className="hidden md:flex flex-row w-full justify-center text-slate-500 font-bold">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="w-16 text-center rotate-180">
                  {"ABCDEFGH"[blacksMove ? 7 - i : i]}
                </div>
              ))}
          </div>

          <div className="md:w-auto w-full flex flex-row gap-0">
            <div className="md:flex hidden flex-col h-full justify-center items-center w-6 text-slate-500 font-bold py-2">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-16 flex items-center">
                    {blacksMove ? 1 + i : 8 - i}
                  </div>
                ))}
            </div>

            <div className="w-full md:w-auto border-slate-300 md:border-8 border-double border-y-8 box-content">
              <AspectBox outerClassName="md:w-128 w-full" aspect="100%">
                {/* <div className="w-full h-0 pb-[100%] relative md:w-[512px]">
                <div className="absolute inset-0"> */}
                <div className="flex flex-row md:h-auto md:w-auto h-full w-full">
                  <div className="relative w-full">
                    <div className="flex flex-col md:h-auto h-full">
                      {Array(8)
                        .fill(0)
                        .map((_, row) => (
                          <div
                            key={row}
                            className="md:h-16 h-1/8 flex flex-row"
                          >
                            {Array(8)
                              .fill(0)
                              .map((_, col) => [
                                row ^ (blacksMove ? 7 : 0),
                                col ^ (blacksMove ? 7 : 0),
                                (row * 8 + col) ^ (blacksMove ? 63 : 0),
                              ])
                              .map(([row, col, i]) => (
                                <button
                                  disabled={
                                    !(
                                      (cursorPos === null &&
                                        move === null &&
                                        board[i] !== 0 &&
                                        (blacksMove
                                          ? board[i] >= BLACK
                                          : board[i] < BLACK)) ||
                                      (cursorPos !== null &&
                                        move === null &&
                                        possibleMoves.includes(i)) ||
                                      (cursorPos !== null &&
                                        board[i] !== 0 &&
                                        (blacksMove
                                          ? board[i] >= BLACK
                                          : board[i] < BLACK)) ||
                                      (cursorPos === null &&
                                        move !== null &&
                                        i === move[0])
                                    )
                                  }
                                  key={col}
                                  className={twCascade(
                                    "h-full md:w-16 w-1/8 relative",
                                    {
                                      "bg-white dark:bg-slate-300":
                                        ((row + col) & 1) === 0,
                                      "bg-slate-300 dark:bg-slate-400":
                                        ((row + col) & 1) === 1,
                                    }
                                  )}
                                  onClick={(ev) => {
                                    if (move === null) {
                                      setHideOpponentsMove(true);

                                      const p = board[i];

                                      if (cursorPos === i) {
                                        setCursorPos(null);
                                      } else if (
                                        p != 0 &&
                                        ((p >= BLACK && blacksMove) ||
                                          (p < BLACK && !blacksMove))
                                      ) {
                                        setCursorPos(i);
                                      } else if (cursorPos !== null) {
                                        if (possibleMoves.includes(i)) {
                                          setHideLink(false);
                                          setMove([cursorPos, i]);
                                          setCursorPos(null);
                                        }
                                      }
                                    } else if (i === move[0]) {
                                      setMove(null);
                                      setCursorPos(i);
                                    }
                                  }}
                                  onMouseOver={() => void setHoverPos(i)}
                                  onMouseOut={() => void setHoverPos(null)}
                                >
                                  {board[i] !== 0 && (
                                    <Piece
                                      className="h-full w-full"
                                      piece={board[i]}
                                    />
                                  )}
                                  {possibleMoves.includes(i) && (
                                    <div
                                      key={i}
                                      className="absolute h-[87.5%] w-[87.5%] border-dotted border-4 border-slate-500 dark:border-slate-800 rounded-full -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
                                    ></div>
                                  )}
                                  {forbiddenMoves.includes(i) && (
                                    <div className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 text-4xl leading-none top-1/2 left-1/2">
                                      🞬
                                    </div>
                                  )}
                                  {(cursorPos === i ||
                                    (!hideOpponentsMove &&
                                      cursorPos === null &&
                                      move === null &&
                                      history.length > 0 &&
                                      history[history.length - 1].includes(
                                        i
                                      )) ||
                                    move?.includes(i)) && (
                                    <div className="absolute pointer-events-none inset-0 border-solid md:border-4 border-[3px] border-slate-600 dark:border-slate-800"></div>
                                  )}
                                </button>
                              ))}
                          </div>
                        ))}
                    </div>
                    {check && (
                      <svg
                        viewBox="0 0 400 100"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:h-32 h-28 pointer-events-none"
                      >
                        <text
                          className={twCascade(
                            "text-4xl stroke-black fill-white font-black font-serif",
                            {
                              "fill-black stroke-white":
                                history.length % 2 === (move === null ? 0 : 1),
                            }
                          )}
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="central"
                          strokeWidth="3"
                          paintOrder="stroke"
                        >
                          {mate ? "CHECKMATE" : "CHECK"}
                        </text>
                      </svg>
                    )}
                    {history.length === 0 && !hideWelcome && (
                      <Requester onClose={() => void setHideWelcome(true)}>
                        <p>
                          Welcome to <i>chessbyemail</i>, a web app for playing
                          correspondance chess.
                        </p>
                        <p>
                          When you've made your first move, a link is generated.
                          You send this link to your opponent who continues the
                          game.
                        </p>
                        <p>
                          The state of the game is not stored on this server, it
                          is encoded in the links you send when playing.
                        </p>
                        <div className="self-center">
                          <button
                            style={{ all: "revert" }}
                            onClick={() => void setHideWelcome(true)}
                          >
                            Start
                          </button>
                        </div>
                      </Requester>
                    )}
                    {newStateLink && !hideLink && (
                      <Requester
                        className="items-center"
                        onClose={() => void setHideLink(true)}
                      >
                        <p className="text-center">
                          Send the following link to your opponent
                        </p>
                        <div className="flex flex-row gap-4">
                          <input
                            ref={linkInputRef}
                            style={{ all: "revert" }}
                            type="text"
                            value={newStateLink}
                            readOnly
                            onFocus={(ev) => void ev.target.select()}
                          />
                        </div>
                        {navigator && (
                          <div className="flex flex-row gap-4">
                            {navigator.clipboard && (
                              <button
                                style={{ all: "revert" }}
                                onClick={() =>
                                  void navigator.clipboard.writeText(
                                    newStateLink
                                  )
                                }
                              >
                                Copy to clipboard
                              </button>
                            )}
                            {navigator.share && (
                              <button
                                style={{ all: "revert" }}
                                onClick={() =>
                                  void navigator
                                    .share({
                                      title: "chessbyemail.com",
                                      url: newStateLink,
                                    })
                                    .then(() => {})
                                    .catch((err) => void console.error(err))
                                }
                              >
                                Share
                              </button>
                            )}
                          </div>
                        )}
                      </Requester>
                    )}
                  </div>
                </div>
                {/* </div>
              </div> */}
              </AspectBox>
            </div>

            <div className="hidden md:flex flex-col h-full justify-center items-center w-6 text-slate-500 font-bold py-2">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-16 flex items-center rotate-180">
                    {blacksMove ? 1 + i : 8 - i}
                  </div>
                ))}
            </div>
          </div>

          <div className="hidden md:flex flex-row w-full justify-center text-slate-500 font-bold">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="w-16 text-center">
                  {"ABCDEFGH"[blacksMove ? 7 - i : i]}
                </div>
              ))}
          </div>
        </div>

        <AspectBox
          outerClassName="md:px-8 w-full"
          aspect="6.25%"
          innerClassName="flex flex-row"
        >
          {lostPieces
            .filter((piece) => (blacksMove ? piece >= BLACK : piece < BLACK))
            .map((piece, i) => (
              <RawPiece key={i} className="" piece={piece} />
            ))}
        </AspectBox>
      </div>
      <div className="flex flex-row w-full justify-evenly text-xs opacity-50">
        <p>Copyright 2022, D. Revelj</p>
        <p>Version {publicRuntimeConfig?.version}</p>
        <a
          className="hover:underline"
          href="https://github.com/chessbyemail/chessbyemail.github.io/issues"
        >
          Report an issue
        </a>
      </div>
    </div>
  );
}

function AspectBox({
  children,
  innerClassName,
  outerClassName,
  aspect,
}: {
  children: any | undefined;
  innerClassName?: string;
  outerClassName?: string;
  aspect: string;
}) {
  return (
    <div className={twCascade("", outerClassName)}>
      <div className="h-0 relative w-full" style={{ paddingBottom: aspect }}>
        <div className={twCascade("absolute inset-0", innerClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Piece({ className, piece }: { className?: string; piece: number }) {
  return SVG_PIECES.has(piece & 15) ? (
    <div
      className={twCascade("relative w-full h-full", className)}
      title={PIECE_NAMES.get(piece)}
    >
      <Image
        src={SVG_PIECES.get(piece & 15)}
        alt={PIECE_NAMES.get(piece) || ""}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full"
      />
    </div>
  ) : (
    <></>
  );
}

function RawPiece({ className, piece }: { className: string; piece: number }) {
  return (
    <AspectBox outerClassName="w-1/16" aspect="100%">
      <Image
        src={SVG_PIECES.get(piece & 15)}
        alt={PIECE_NAMES.get(piece) || ""}
        className="h-full"
        title={PIECE_NAMES.get(piece) || ""}
      />
    </AspectBox>
  );
}

const parseFen = (fen: string) => {
  const map = new Map([
    ["p", BLACK + PAWN],
    ["n", BLACK + KNIGHT],
    ["b", BLACK + BISHOP],
    ["r", BLACK + ROOK],
    ["q", BLACK + QUEEN],
    ["k", BLACK + KING],
    ["P", WHITE + PAWN],
    ["N", WHITE + KNIGHT],
    ["B", WHITE + BISHOP],
    ["R", WHITE + ROOK],
    ["Q", WHITE + QUEEN],
    ["K", WHITE + KING],
  ]);

  const board = [];
  for (const c of fen) {
    if (board.length < 64) {
      if (map.has(c)) {
        board.push(map.get(c));
      } else if (/^[0-9]$/.test(c)) {
        board.push(...Array(parseInt(c)).fill(0));
      }
    }
  }

  return { board };
};

const WHITE_PIECES = new Map([
  [0, " "],
  [PAWN, "♙"],
  [KNIGHT, "♘"],
  [BISHOP, "♗"],
  [ROOK, "♖"],
  [QUEEN, "♕"],
  [KING, "♔"],
]);

const BLACK_PIECES = new Map([
  [0, " "],
  [PAWN, "♟︎"],
  [KNIGHT, "♞"],
  [BISHOP, "♝"],
  [ROOK, "♜"],
  [QUEEN, "♛"],
  [KING, "♚"],
]);

const PIECE_NAMES = new Map([
  [0, ""],
  [WHITE + PAWN, "white pawn"],
  [WHITE + KNIGHT, "white knight"],
  [WHITE + BISHOP, "white bishop"],
  [WHITE + ROOK, "white rook"],
  [WHITE + QUEEN, "white queen"],
  [WHITE + KING, "white king"],
  [BLACK + PAWN, "black pawn"],
  [BLACK + KNIGHT, "black knight"],
  [BLACK + BISHOP, "black bishop"],
  [BLACK + ROOK, "black rook"],
  [BLACK + QUEEN, "black queen"],
  [BLACK + KING, "black king"],
]);

function posString(pos: number) {
  if (isFinite(pos)) {
    const col = "ABCDEFGH"[pos % 8];
    const row = "87654321"[Math.floor(pos / 8)];
    return col + row;
  } else {
    return "";
  }
}

function rowcol(boardIndex: number, blacksMove: boolean) {
  let row = Math.floor(boardIndex / 8);
  let col = boardIndex % 8;

  if (blacksMove) {
    row = 7 - row;
    col = 7 - col;
  }

  return [row, col];
}

function getMoveRestrictions(board: number[], from: number | null) {
  if (from === null || board[from] === 0) {
    return { forbiddenMoves: [], possibleMoves: [] };
  }

  const possibleMoves = getPossibleMoves(board, from);

  const isBlack = board[from] >= BLACK;

  const opponentPieces = board
    .map((piece, pos) => [piece, pos])
    .filter(
      ([piece, pos]) => piece && (isBlack ? piece < BLACK : piece >= BLACK)
    );

  const forbiddenMoves: number[] = [];
  for (const to of possibleMoves) {
    const mutatedBoard = [...board];
    mutatedBoard[to] = mutatedBoard[from];
    mutatedBoard[from] = 0;

    const ourKingsPos = mutatedBoard.indexOf((isBlack ? BLACK : WHITE) + KING);

    for (const [piece, pos] of opponentPieces) {
      const opponentMoves = getPossibleMoves(mutatedBoard, pos);

      if (opponentMoves.includes(ourKingsPos)) {
        forbiddenMoves.push(to);
      }
    }
  }

  return {
    forbiddenMoves,
    possibleMoves: possibleMoves.filter((to) => !forbiddenMoves.includes(to)),
  };
}

function getPossibleMoves(board: number[], i: number | null): number[] {
  if (i === null) {
    return [];
  }

  const moves = [];
  const [row, col] = [Math.floor(i / 8), i % 8];
  const piece = board[i];
  const d = piece >= BLACK ? 1 : -1;

  switch (piece & 7) {
    case PAWN:
      if (board[(row + d) * 8 + col] === 0) {
        moves.push([row + d, col]);
        if (
          ((piece < BLACK && row === 6) || (piece >= BLACK && row === 1)) &&
          board[(row + 2 * d) * 8 + col] === 0
        ) {
          moves.push([row + 2 * d, col]);
        }
      }
      if (board[(row + d) * 8 + col - 1]) {
        moves.push([row + d, col - 1]);
      }
      if (board[(row + d) * 8 + col + 1]) {
        moves.push([row + d, col + 1]);
      }
      break;
    case KNIGHT:
      moves.push(
        ...[
          [-2, -1],
          [-2, 1],
          [2, -1],
          [2, 1],
          [-1, 2],
          [1, 2],
          [-1, -2],
          [-1, 2],
        ].map(([dr, dc]) => [row + dr, col + dc])
      );
      break;
    case BISHOP:
      for (const [dr, dc] of [
        [-1, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
      ]) {
        for (
          let [r, c] = [row + dr, col + dc];
          r >= 0 && r < 8 && c >= 0 && c < 8;
          r += dr, c += dc
        ) {
          moves.push([r, c]);
          if (board[r * 8 + c]) {
            break;
          }
        }
      }
      break;
    case ROOK:
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        for (
          let [r, c] = [row + dr, col + dc];
          r >= 0 && r < 8 && c >= 0 && c < 8;
          r += dr, c += dc
        ) {
          moves.push([r, c]);
          if (board[r * 8 + c]) {
            break;
          }
        }
      }
      break;
    case QUEEN:
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
      ]) {
        for (
          let [r, c] = [row + dr, col + dc];
          r >= 0 && r < 8 && c >= 0 && c < 8;
          r += dr, c += dc
        ) {
          moves.push([r, c]);
          if (board[r * 8 + c]) {
            break;
          }
        }
      }
      break;
    case KING:
      moves.push(
        ...[
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ].map(([dr, dc]) => [row + dr, col + dc])
      );
      break;
  }

  return moves
    .filter(
      ([r, c]) =>
        r >= 0 &&
        r < 8 &&
        c >= 0 &&
        c < 8 &&
        (board[r * 8 + c] === 0 ||
          (piece < BLACK && board[r * 8 + c] >= BLACK) ||
          (piece >= BLACK && board[r * 8 + c] < BLACK))
    )
    .map(([r, c]) => r * 8 + c);
}

function Requester({
  children,
  className,
  onClose,
  ...props
}: {
  children?: any;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={twCascade(
        "absolute inset-0 bg-black bg-opacity-50",
        "flex flex-col items-center justify-center"
      )}
    >
      <div
        className={twCascade(
          "relative rounded-md bg-slate-100 text-black w-10/12 p-6",
          "flex flex-col gap-4 items-start",
          className
        )}
      >
        {children}
        {onClose && (
          <button className="absolute top-1 right-2" onClick={onClose}>
            🗙
          </button>
        )}
      </div>
    </div>
  );
}

const SVG_PIECES = new Map([
  [WHITE + KING, WhiteKing],
  [WHITE + QUEEN, WhiteQueen],
  [WHITE + BISHOP, WhiteBishop],
  [WHITE + KNIGHT, WhiteKnight],
  [WHITE + ROOK, WhiteRook],
  [WHITE + PAWN, WhitePawn],
  [BLACK + KING, BlackKing],
  [BLACK + QUEEN, BlackQueen],
  [BLACK + BISHOP, BlackBishop],
  [BLACK + KNIGHT, BlackKnight],
  [BLACK + ROOK, BlackRook],
  [BLACK + PAWN, BlackPawn],
]);
