import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { act } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  useSearchParams,
  createBrowserRouter,
  useBlocker,
  RouterProvider,
  useLocation,
} from "../../index";

describe("useSearchParams", () => {
  let node: HTMLDivElement;
  beforeEach(() => {
    node = document.createElement("div");
    document.body.appendChild(node);
  });

  afterEach(() => {
    document.body.removeChild(node);
    node = null!;
  });

  it("reads and writes the search string", () => {
    function SearchPage() {
      let queryRef = React.useRef<HTMLInputElement>(null);
      let [searchParams, setSearchParams] = useSearchParams({ q: "" });
      let query = searchParams.get("q")!;

      function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (queryRef.current) {
          setSearchParams({ q: queryRef.current.value });
        }
      }

      return (
        <div>
          <p>The current query is "{query}".</p>
          <form onSubmit={handleSubmit}>
            <input name="q" defaultValue={query} ref={queryRef} />
          </form>
        </div>
      );
    }

    act(() => {
      ReactDOM.createRoot(node).render(
        <MemoryRouter initialEntries={["/search?q=Michael+Jackson"]}>
          <Routes>
            <Route path="search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    let form = node.querySelector("form")!;
    expect(form).toBeDefined();

    let queryInput = node.querySelector<HTMLInputElement>("input[name=q]")!;
    expect(queryInput).toBeDefined();

    expect(node.innerHTML).toMatch(/The current query is "Michael Jackson"/);

    act(() => {
      queryInput.value = "Ryan Florence";
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(node.innerHTML).toMatch(/The current query is "Ryan Florence"/);
  });

  it("updates searchParams when a function is provided to setSearchParams (functional updates)", () => {
    function SearchPage() {
      let queryRef = React.useRef<HTMLInputElement>(null);
      let [searchParams, setSearchParams] = useSearchParams({ q: "" });
      let query = searchParams.get("q")!;
      let queryNew = searchParams.get("new")!;

      function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (queryRef.current) {
          setSearchParams((cur) => {
            cur.set("q", `${cur.get("q")} - appended`);
            cur.set("new", "Ryan Florence");
            return cur;
          });
        }
      }

      return (
        <div>
          <p>The current query is "{query}".</p>
          <p>The new query is "{queryNew}"</p>
          <form onSubmit={handleSubmit}>
            <input name="q" defaultValue={query} ref={queryRef} />
          </form>
        </div>
      );
    }

    act(() => {
      ReactDOM.createRoot(node).render(
        <MemoryRouter initialEntries={["/search?q=Michael+Jackson"]}>
          <Routes>
            <Route path="search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    let form = node.querySelector("form")!;
    expect(form).toBeDefined();

    let queryInput = node.querySelector<HTMLInputElement>("input[name=q]")!;
    expect(queryInput).toBeDefined();

    expect(node.innerHTML).toMatch(/The current query is "Michael Jackson"/);
    expect(node.innerHTML).toMatch(/The new query is ""/);

    act(() => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    expect(node.innerHTML).toMatch(
      /The current query is "Michael Jackson - appended"/,
    );
    expect(node.innerHTML).toMatch(/The new query is "Ryan Florence"/);
  });

  it("allows removal of search params when a default is provided", () => {
    function SearchPage() {
      let [searchParams, setSearchParams] = useSearchParams({
        value: "initial",
      });

      return (
        <div>
          <p>The current value is "{searchParams.get("value")}".</p>
          <button onClick={() => setSearchParams({})}>Click</button>
        </div>
      );
    }

    act(() => {
      ReactDOM.createRoot(node).render(
        <MemoryRouter initialEntries={["/search?value=initial"]}>
          <Routes>
            <Route path="search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    let button = node.querySelector<HTMLInputElement>("button")!;
    expect(button).toBeDefined();

    expect(node.innerHTML).toMatch(/The current value is "initial"/);

    act(() => {
      button.dispatchEvent(new Event("click", { bubbles: true }));
    });

    expect(node.innerHTML).toMatch(/The current value is ""/);
  });

  it("returns initial default values in search params", () => {
    function SearchPage() {
      let [searchParams] = useSearchParams({ a: "1", b: "2" });
      return <p>{searchParams.toString()}</p>;
    }

    act(() => {
      ReactDOM.createRoot(node).render(
        <MemoryRouter initialEntries={["/search?value=initial"]}>
          <Routes>
            <Route path="search" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(node.innerHTML).toMatchInlineSnapshot(
      `"<p>value=initial&amp;a=1&amp;b=2</p>"`,
    );
  });

  it("does not reflect functional update mutation when navigation is blocked", () => {
    let router = createBrowserRouter([
      {
        path: "/",
        Component() {
          let location = useLocation();
          let [searchParams, setSearchParams] = useSearchParams();
          let [shouldBlock, setShouldBlock] = React.useState(false);
          let b = useBlocker(shouldBlock);
          return (
            <>
              <pre id="output">
                {`location.search=${location.search}`}
                {`searchParams=${searchParams.toString()}`}
                {`blocked=${b.state}`}
              </pre>
              <button
                id="toggle-blocking"
                onClick={() => setShouldBlock(!shouldBlock)}
              >
                Toggle Blocking
              </button>
              <button
                id="navigate1"
                onClick={() => {
                  setSearchParams((prev) => {
                    prev.set("foo", "bar");
                    return prev;
                  });
                }}
              >
                Navigate 1
              </button>
              <button
                id="navigate2"
                onClick={() => {
                  setSearchParams((prev) => {
                    prev.set("foo", "baz");
                    return prev;
                  });
                }}
              >
                Navigate 2
              </button>
            </>
          );
        },
      },
    ]);

    act(() => {
      ReactDOM.createRoot(node).render(<RouterProvider router={router} />);
    });

    expect(node.querySelector("#output")).toMatchInlineSnapshot(`
      <pre
        id="output"
      >
        location.search=
        searchParams=
        blocked=unblocked
      </pre>
    `);

    act(() => {
      node
        .querySelector("#navigate1")!
        .dispatchEvent(new Event("click", { bubbles: true }));
    });

    expect(node.querySelector("#output")).toMatchInlineSnapshot(`
      <pre
        id="output"
      >
        location.search=?foo=bar
        searchParams=foo=bar
        blocked=unblocked
      </pre>
    `);

    act(() => {
      node
        .querySelector("#toggle-blocking")!
        .dispatchEvent(new Event("click", { bubbles: true }));
    });

    act(() => {
      node
        .querySelector("#navigate2")!
        .dispatchEvent(new Event("click", { bubbles: true }));
    });

    expect(node.querySelector("#output")).toMatchInlineSnapshot(`
      <pre
        id="output"
      >
        location.search=?foo=bar
        searchParams=foo=bar
        blocked=blocked
      </pre>
    `);
  });
});
