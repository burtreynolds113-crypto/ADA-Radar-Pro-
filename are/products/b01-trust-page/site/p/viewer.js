import { decode, renderPage, pageId, track } from "../app.js";

async function show() {
  const main = document.getElementById("main");
  const token = location.hash.slice(1);
  try {
    const data = await decode(token);
    main.innerHTML = renderPage(data);
    document.title = `${data.company} security overview`;
    const id = await pageId(token);
    let own = false;
    try { own = localStorage.getItem(`tp-own:${id}`) === "1"; } catch { /* private mode */ }
    // Distinct page ids with visitor views = pages actually shared (the product-led loop).
    track(own ? "view_by_creator" : "view_by_visitor", `view/${own ? "creator" : "visitor"}/${id}`);
  } catch (e) {
    main.innerHTML = "";
    const h = document.createElement("h1");
    h.textContent = "This trust page link can't be displayed";
    const p = document.createElement("p");
    p.textContent = `${e.message} Ask the company for a fresh link.`;
    main.append(h, p);
    track("view_error");
  }
}

window.addEventListener("hashchange", show);
show();
