import React, { useEffect, useRef, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./App.scss";
import * as data from "./data.json";

const ADDITIONAL_CHOICES = 3;

const pairwise = (arr, func) => {
  let res = [];
  for (let i = 0; i < arr.length; i++) {
    res.push(func(arr[i], arr[i + 1], i));
  }
  return res;
};

class QuoteGen {
  constructor() {
    this.kerberoi = new RegExp(`\\b${data.kerberoi.join("\\b|\\b")}\\b`, "gi");
    this.quotes = data.quotes.flatMap(({ term, quotes }) =>
      quotes
        .filter((quote) => quote.search(this.kerberoi) !== -1)
        .map((quote) => ({ term, quote }))
    );
  }

  choices(answers) {
    let res = [...answers];
    const choice = () =>
      data.kerberoi[Math.floor(Math.random() * data.kerberoi.length)];
    for (let i = 0; i < ADDITIONAL_CHOICES; i++) {
      let ch = undefined;
      while (!ch || res.includes(ch)) ch = choice();
      res.push(ch);
    }
    res.sort();
    return res;
  }

  kerbify(s) {
    const matches = Array.from(s.matchAll(this.kerberoi));
    const kerbs = matches.map((match) => match[0].toLowerCase());
    const bounds = matches.flatMap((match) => [
      match.index,
      match.index + match[0].length,
    ]);
    let bits = [];
    if (bounds[0] !== 0) {
      bits.push({
        type: "rest",
        content: s.slice(0, bounds[0]),
      });
    }
    pairwise(bounds, (cur, next, i) =>
      bits.push({
        type: i % 2 === 0 ? "kerb" : "rest",
        content: s.slice(cur, next),
      })
    );
    console.log(s, kerbs, bits);
    return { kerbs, bits };
  }

  get(i) {
    const { term, quote } = this.quotes[i];
    const matches = Array.from(quote.matchAll(/[^"*]+:/g));
    const bounds = matches.flatMap((match) => [
      match.index,
      match.index + match[0].length,
    ]);
    let answers = [];
    let pieces = [];
    pairwise(bounds, (cur, next) => {
      const { kerbs, bits } = this.kerbify(quote.slice(cur, next));
      answers.push(...kerbs);
      pieces.push(bits);
    });
    return { term, choices: this.choices(answers), pieces };
  }
}

const Kerb = ({ kerb, index }) => (
  <Draggable key={kerb} draggableId={kerb} index={index}>
    {(provided, snapshot) => (
      <span
        className="kerb"
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
      >
        {kerb}
      </span>
    )}
  </Draggable>
);

const Blank = ({ answer, content, id, revealed }) => {
  const judgment = answer.toLowerCase() === content ? "correct" : "wrong";
  const status = content ? judgment : revealed ? "wrong" : "";
  return (
    <Droppable droppableId={id}>
      {(provided, snapshot) => (
        <span className={`blank ${status} ${snapshot.isDraggingOver ? "active" : ""}`} ref={provided.innerRef}>
          {revealed ? (
            <Kerb kerb={answer.toLowerCase()} index={0} />
          ) : (
            content && <Kerb kerb={content} index={0} />
          )}
          <span style={{ display: "none" }}>{provided.placeholder}</span>
        </span>
      )}
    </Droppable>
  );
};

const Quote = ({ blanks, pieces, revealed }) => {
  const renderBit = (bit) =>
    bit.map(({ type, content }, i) =>
      type === "rest" ? (
        <span key={`rest-${i}`}>{content}</span>
      ) : (
        <Blank
          answer={content}
          content={blanks[`blank-${i}`]?.[0]}
          id={`blank-${i}`}
          key={`blank-${i}`}
          revealed={revealed}
        />
      )
    );
  return (
    <div className="quote">
      {pieces.map((bit, i) => (
        <div className={i % 2 === 0 ? "speaker" : "saying"} key={i}>
          {renderBit(bit)}
        </div>
      ))}
    </div>
  );
};

const Choices = ({ choices }) => {
  return (
    <Droppable droppableId="choices" direction="horizontal">
      {(provided, snapshot) => (
        <div className="choices" ref={provided.innerRef}>
          {choices.map((kerb, i) => (
            <Kerb kerb={kerb} key={i} index={i} />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const Question = (props) => {
  const [blanks, setBlanks] = useState({});
  const [choices, setChoices] = useState(props.choices);

  useEffect(() => {
    setChoices(props.choices);
    setBlanks({});
  }, [props.choices, props.pieces]);

  const getList = (id) => (id === "choices" ? choices : blanks[id]) ?? [];

  const updateList = (id, list) =>
    id === "choices"
      ? setChoices(list)
      : setBlanks((blanks) => ({ ...blanks, [id]: list }));

  const onDragEnd = ({ source: src, destination: dest }) => {
    if (!dest) return;
    if (src.droppableId === dest.droppableId) {
      const clone = Array.from(getList(src.droppableId));
      const [removed] = clone.splice(src.index, 1);
      clone.splice(dest.index, 0, removed);
      updateList(src.droppableId, clone);
    } else {
      const srcClone = Array.from(getList(src.droppableId));
      const destClone = Array.from(getList(dest.droppableId));
      const swap = dest.droppableId !== "choices" && destClone.length;
      const [removed] = srcClone.splice(src.index, 1);
      const [removed2] = swap ? destClone.splice(0, 1) : [];
      destClone.splice(dest.index, 0, removed);
      swap && srcClone.splice(0, 0, removed2);
      updateList(src.droppableId, srcClone);
      updateList(dest.droppableId, destClone);
    }
  };

  const isDone =
    props.revealed ||
    props.pieces.every((bit) =>
      bit.every(
        ({ type, content }, i) =>
          type === "rest" || blanks[`blank-${i}`]?.[0] === content
      )
    );

  console.log(
    props.pieces.flatMap((bit) => bit.filter(({ type }) => type === "kerb"))
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="quote-wrapper">
        <Quote
          blanks={blanks}
          pieces={props.pieces}
          revealed={props.revealed}
        />
        {isDone && <div className="info">from {props.term}</div>}
      </div>
      <Choices choices={choices} />
    </DragDropContext>
  );
};

const App = () => {
  const qg = useRef(null);
  if (!qg.current) qg.current = new QuoteGen();

  const [quoteN, setQuoteN] = useState(0);
  const [quote, setQuote] = useState(qg.current.get(quoteN));
  const [revealed, setRevealed] = useState(false);

  const next = () => {
    setQuote(qg.current.get(quoteN + 1));
    setQuoteN(quoteN + 1);
    setRevealed(false);
  };

  return (
    <div className="app">
      <Question {...quote} revealed={revealed} />
      <div className="button-wrapper">
        <button onClick={(e) => setRevealed(true)}>reveal</button>
        <button onClick={(e) => next()}>new quote</button>
      </div>
    </div>
  );
};

export default App;
