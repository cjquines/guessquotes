import json, re

MIN_YEAR = 2018


def read(file):
    with open(file, "r") as f:
        yield from f.readlines()


# get list of kerberoi
kerberoi = []
paren = re.compile(r"\(\S+\)")
for line in read("kerbs.txt"):
    if m := paren.search(line):
        kerberoi.append(m.group()[1:-1])

# process quoteboard
quotes_ = []
term = None
quotes = []
header = re.compile(r"===\s?(.*?(\d+))\s?===")
push_quotes = lambda: len(quotes) > 0 and quotes_.append(
    {"term": term, "quotes": quotes}
)
for line in read("quoteboard.txt"):
    if m := header.match(line):
        term_, year = m.groups()
        if int(year) >= MIN_YEAR:
            if term:
                push_quotes()
            term = term_
    if term and line.startswith("*"):
        quotes.append(line[1:].strip())
push_quotes()

with open("data.json", "w") as f:
    f.write(json.dumps({"quotes": quotes_, "kerberoi": kerberoi}))
