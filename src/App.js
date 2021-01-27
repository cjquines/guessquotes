import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./App.scss";
import * as data from "./data.json";

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
    this.quotes = data.quotes.flatMap(({ term, quotes }) =>
      quotes.map((quote) => ({ term, quote }))
    );
    this.kerberoi = new RegExp(data.kerberoi.join("|"), "g");
  }

  get(i) {
    const { term, quote } = this.quotes[i];
    const matches = Array.from(quote.matchAll(this.kerberoi));
    const answers = matches.map((match) => match[0]);
    const bounds = matches.flatMap((match) => [
      match.index,
      match.index + match[0].length,
    ]);
    const bits = pairwise(bounds, (cur, next) => quote.slice(cur, next));
    return { term, answers, bits };
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

const Blank = ({ content, id }) => (
  <Droppable droppableId={id}>
    {(provided, snapshot) => (
      <span className="blank" ref={provided.innerRef}>
        {content && <Kerb kerb={content} index={0} />}
        {provided.placeholder}
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
        content={blanks[`blank-${i}`]?.[0]}
        id={`blank-${i}`}
        key={`blank-${i}`}
      />
    );
    if (rest[0] === ":") {
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

const App = () => {
  const qg = new QuoteGen();
  const quote = qg.get(21);
  const [blanks, setBlanks] = useState({});
  const [choices, setChoices] = useState(quote.answers);

  const getList = (id) => (id === "choices" ? choices : blanks[id]);

  const updateList = (id, list) =>
    id === "choices"
      ? setChoices(list)
      : setBlanks((blanks) => ({ ...blanks, [id]: list }));

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId) {
      return;
    } else {
      const srcClone = Array.from(getList(source.droppableId));
      const destClone = Array.from(getList(destination.droppableId) ?? []);
      const [removed] = srcClone.splice(source.index, 1);
      destClone.splice(destination.index, 0, removed);
      console.log(srcClone, destClone);
      updateList(source.droppableId, srcClone);
      updateList(destination.droppableId, destClone);
    }
  };

  return (
    <div className="app">
      <DragDropContext onDragEnd={onDragEnd}>
        <Quote bits={quote.bits} blanks={blanks} />
        <Droppable droppableId="choices">
          {(provided, snapshot) => (
            <div className="choices" ref={provided.innerRef}>
              {choices.map((a, i) => (
                <Kerb kerb={a} key={i} index={i} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default App;
