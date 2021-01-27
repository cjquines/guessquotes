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

const Kerb = ({ choice, kerb, revealed }) => {
  return <span className="kerb">{choice || revealed ? kerb : "?"}</span>;
};

const render = (bits) => {
  let result = [];
  let saying = [];
  const pushSaying = () => {
    result.push(
      <div className="saying" key={`saying-${result.length}`}>
        {saying}
      </div>
    );
    saying = [];
  };
  inPairs(bits, (kerb, rest, i) => {
    const wrapped = (
      <Kerb id={`kerb-${i}`} key={`kerb-${i}`} kerb={kerb} revealed={false} />
    );
    if (rest[0] === ":") {
      saying.length && pushSaying();
      result.push(
        <div className="speaker" key={`speaker-${i}`}>
          {wrapped}
        </div>
      );
    } else {
      saying.push(wrapped);
    }
    saying.push(<span key={`rest-${i}`}>{rest}</span>);
  });
  pushSaying();
  return result;
};

const App = () => {
  const qg = new QuoteGen();
  const x = qg.get(21);

  return (
    <div className="app">
      <div className="quote">{render(x.bits)}</div>
      <div className="choices">
        {x.answers.map((a, i) => (
          <Kerb choice={true} kerb={a} key={i} />
        ))}
      </div>
    </div>
  );
};

export default App;
