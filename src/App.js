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

const inPairs = (arr, func) => {
  let res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push(func(arr[i], arr[i + 1], i / 2));
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

  get(i) {
    const { term, quote } = this.quotes[i];
    const matches = Array.from(quote.matchAll(this.kerberoi));
    const answers = matches.map((match) => match[0].toLowerCase());
    const bounds = matches.flatMap((match) => [
      match.index,
      match.index + match[0].length,
    ]);
    const bits = pairwise(bounds, (cur, next) => quote.slice(cur, next));
    console.log(quote, bits);
    return { term, choices: this.choices(answers), bits };
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

const Blank = ({ answer, content, id }) => (
  <Droppable droppableId={id}>
    {(provided, snapshot) => (
      <span
        className={`blank ${
          !content ? "" : answer.toLowerCase() === content ? "correct" : "wrong"
        }`}
        ref={provided.innerRef}
      >
        {content && <Kerb kerb={content} index={0} />}
        <span style={{ display: "none" }}>{provided.placeholder}</span>
      </span>
    )}
  </Droppable>
);

const Quote = ({ bits, blanks }) => {
  let elts = [];
  let saying = [];
  const pushSaying = () => {
    elts.push(
      <div className="saying" key={`saying-${elts.length}`}>
        {saying}
      </div>
    );
    saying = [];
  };
  inPairs(bits, (kerb, rest, i) => {
    const blank = (
      <Blank
        answer={kerb}
        content={blanks[`blank-${i}`]?.[0]}
        id={`blank-${i}`}
        key={`blank-${i}`}
      />
    );
    if (rest.includes(":")) {
      saying.length && pushSaying();
      elts.push(
        <div className="speaker" key={`speaker-${i}`}>
          {blank}
        </div>
      );
    } else {
      saying.push(blank);
    }
    saying.push(<span key={`rest-${i}`}>{rest}</span>);
  });
  pushSaying();
  return <div className="quote">{elts}</div>;
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
  }, [props]);

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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Quote bits={props.bits} blanks={blanks} />
      <Choices choices={choices} />
    </DragDropContext>
  );
};

const App = () => {
  const qg = useRef(null);
  if (!qg.current) qg.current = new QuoteGen();

  const [quoteN, setQuoteN] = useState(0);
  const [quote, setQuote] = useState(qg.current.get(quoteN));

  const next = () => {
    setQuote(qg.current.get(quoteN + 1));
    setQuoteN(quoteN + 1);
  };

  return (
    <div className="app">
      <Question {...quote} />
      <button onClick={(e) => next()}>new quote</button>
    </div>
  );
};

export default App;
