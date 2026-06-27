(() => {
  "use strict";

  const partyRows = document.querySelector("#party-rows");
  const monsterRows = document.querySelector("#monster-rows");
  const partyCount = document.querySelector("#party-count");
  const monsterCount = document.querySelector("#monster-count");
  const partyTemplate = document.querySelector("#party-row-template");
  const monsterTemplate = document.querySelector("#monster-row-template");

  const CR_ALIASES = new Map([
    [".125", "1/8"],
    ["0.125", "1/8"],
    ["⅛", "1/8"],
    [".25", "1/4"],
    ["0.25", "1/4"],
    ["¼", "1/4"],
    [".5", "1/2"],
    ["0.5", "1/2"],
    ["½", "1/2"]
  ]);

  function updateCounts() {
    partyCount.textContent = partyRows.children.length;
    monsterCount.textContent = monsterRows.children.length;
  }

  function addPartyRow({ focus = false } = {}) {
    const row = partyTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".delete-button").addEventListener("click", () => {
      row.remove();
      updateCounts();
    });
    partyRows.append(row);
    updateCounts();

    if (focus) {
      row.querySelector(".level-input").focus();
    }
  }

  function normalizeCr(value) {
    const cleaned = value.trim().toLowerCase().replace(/^cr\s*/, "").replace(/\s+/g, "");
    return CR_ALIASES.get(cleaned) ?? cleaned;
  }

  function setSelectPrompt(select, label) {
    select.replaceChildren(new Option(label, ""));
    select.disabled = true;
  }

  function updateMonsterOptions(row) {
    const input = row.querySelector(".cr-input");
    const select = row.querySelector(".monster-select");
    const message = row.querySelector(".cr-message");
    const cr = normalizeCr(input.value);

    row.classList.remove("is-invalid");
    message.textContent = "";

    if (!cr) {
      setSelectPrompt(select, "Enter CR first");
      return;
    }

    const monsters = window.MONSTERS_BY_CR[cr];
    if (!monsters) {
      setSelectPrompt(select, "No matching monsters");
      message.textContent = "Try 0, 1/8, 1/4, 1/2, or a whole-number CR through 25 (plus 30).";
      row.classList.add("is-invalid");
      return;
    }

    const previousSelection = select.value;
    const options = [new Option(`Choose a monster · ${monsters.length} available`, "")];
    for (const monster of monsters) {
      options.push(new Option(monster, monster));
    }
    select.replaceChildren(...options);
    select.disabled = false;

    if (monsters.includes(previousSelection)) {
      select.value = previousSelection;
    }
  }

  function setQuantity(row, nextValue) {
    const quantity = row.querySelector(".quantity");
    const decrement = row.querySelector(".decrement");
    const safeValue = Math.min(99, Math.max(1, nextValue));
    quantity.value = safeValue;
    quantity.textContent = safeValue;
    decrement.disabled = safeValue === 1;
  }

  function addMonsterRow({ focus = false } = {}) {
    const row = monsterTemplate.content.firstElementChild.cloneNode(true);
    const crInput = row.querySelector(".cr-input");

    crInput.addEventListener("input", () => updateMonsterOptions(row));
    crInput.addEventListener("change", () => {
      const normalized = normalizeCr(crInput.value);
      if (window.MONSTERS_BY_CR[normalized]) {
        crInput.value = normalized;
      }
    });

    row.querySelector(".decrement").addEventListener("click", () => {
      setQuantity(row, Number(row.querySelector(".quantity").value) - 1);
    });
    row.querySelector(".increment").addEventListener("click", () => {
      setQuantity(row, Number(row.querySelector(".quantity").value) + 1);
    });
    row.querySelector(".delete-button").addEventListener("click", () => {
      row.remove();
      updateCounts();
    });

    monsterRows.append(row);
    setQuantity(row, 1);
    updateCounts();

    if (focus) {
      crInput.focus();
    }
  }

  document.querySelector("#add-party").addEventListener("click", () => addPartyRow({ focus: true }));
  document.querySelector("#add-monster").addEventListener("click", () => addMonsterRow({ focus: true }));

  for (let index = 0; index < 4; index += 1) {
    addPartyRow();
  }
  addMonsterRow();
})();
