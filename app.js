(() => {
  "use strict";

  const partyRows = document.querySelector("#party-rows");
  const monsterRows = document.querySelector("#monster-rows");
  const partyCount = document.querySelector("#party-count");
  const monsterCount = document.querySelector("#monster-count");
  const partyTemplate = document.querySelector("#party-row-template");
  const monsterTemplate = document.querySelector("#monster-row-template");

  const encounterMatchup = document.querySelector("#encounter-matchup");
  const difficultyTrack = document.querySelector(".difficulty-track");
  const difficultyMarker = document.querySelector("#difficulty-marker");
  const difficultyXp = document.querySelector("#difficulty-xp");
  const lowSegment = document.querySelector("#low-segment");
  const mediumSegment = document.querySelector("#medium-segment");
  const highSegment = document.querySelector("#high-segment");
  const lowThreshold = document.querySelector("#low-threshold");
  const mediumThreshold = document.querySelector("#medium-threshold");
  const highThreshold = document.querySelector("#high-threshold");
  const difficultyLabels = [...document.querySelectorAll("[data-difficulty]")];
  const xpSummary = document.querySelector("#xp-summary");
  const treasureResults = document.querySelector("#treasure-results");
  const calculationNote = document.querySelector("#calculation-note");

  const NUMBER_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

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

  const XP_BY_CR = Object.freeze({
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "30": 155000
  });

  const XP_BUDGET_BY_LEVEL = Object.freeze({
    1: [50, 75, 100],
    2: [100, 150, 200],
    3: [150, 225, 400],
    4: [250, 375, 500],
    5: [500, 750, 1100],
    6: [600, 1000, 1400],
    7: [750, 1300, 1700],
    8: [1000, 1700, 2100],
    9: [1300, 2000, 2600],
    10: [1600, 2300, 3100],
    11: [1900, 2900, 4100],
    12: [2200, 3700, 4700],
    13: [2600, 4200, 5400],
    14: [2900, 4900, 6200],
    15: [3300, 5400, 7800],
    16: [3800, 6100, 9800],
    17: [4500, 7200, 11700],
    18: [5000, 8700, 14200],
    19: [5500, 10700, 17200],
    20: [6400, 13200, 22000]
  });

  const MONSTER_TREASURE_BY_NAME = Object.freeze(
    Object.fromEntries(
      Object.entries(window.MONSTER_TREASURE_GROUPS ?? {}).flatMap(([tag, names]) =>
        names.map((name) => [name, tag])
      )
    )
  );

  let calculationQueued = false;

  function formatNumber(value) {
    return NUMBER_FORMAT.format(value);
  }

  function pluralize(value, singular, plural = `${singular}s`) {
    return value === 1 ? singular : plural;
  }

  function scheduleCalculation() {
    if (calculationQueued) return;
    calculationQueued = true;
    queueMicrotask(() => {
      calculationQueued = false;
      renderCalculations();
    });
  }

  function updateCounts() {
    partyCount.textContent = partyRows.children.length;
    monsterCount.textContent = monsterRows.children.length;
  }

  function addPartyRow({ focus = false } = {}) {
    const row = partyTemplate.content.firstElementChild.cloneNode(true);
    const levelInput = row.querySelector(".level-input");

    levelInput.addEventListener("input", scheduleCalculation);
    row.querySelector(".delete-button").addEventListener("click", () => {
      row.remove();
      updateCounts();
      scheduleCalculation();
    });

    partyRows.append(row);
    updateCounts();
    scheduleCalculation();

    if (focus) {
      levelInput.focus();
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

  function resetTreasureState(row) {
    row.treasureState = { key: "", rolls: [] };
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
      resetTreasureState(row);
      scheduleCalculation();
      return;
    }

    const monsters = window.MONSTERS_BY_CR[cr];
    if (!monsters) {
      setSelectPrompt(select, "No matching monsters");
      message.textContent = "Try 0, 1/8, 1/4, 1/2, or a whole-number CR through 25 (plus 30).";
      row.classList.add("is-invalid");
      resetTreasureState(row);
      scheduleCalculation();
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
    } else {
      resetTreasureState(row);
    }
    scheduleCalculation();
  }

  function setQuantity(row, nextValue) {
    const quantity = row.querySelector(".quantity");
    const decrement = row.querySelector(".decrement");
    const safeValue = Math.min(99, Math.max(1, nextValue));
    quantity.value = safeValue;
    quantity.textContent = safeValue;
    decrement.disabled = safeValue === 1;
    scheduleCalculation();
  }

  function addMonsterRow({ focus = false } = {}) {
    const row = monsterTemplate.content.firstElementChild.cloneNode(true);
    const crInput = row.querySelector(".cr-input");
    const select = row.querySelector(".monster-select");
    resetTreasureState(row);

    crInput.addEventListener("input", () => updateMonsterOptions(row));
    crInput.addEventListener("change", () => {
      const normalized = normalizeCr(crInput.value);
      if (window.MONSTERS_BY_CR[normalized]) {
        crInput.value = normalized;
      }
    });
    select.addEventListener("change", () => {
      resetTreasureState(row);
      scheduleCalculation();
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
      scheduleCalculation();
    });

    monsterRows.append(row);
    setQuantity(row, 1);
    updateCounts();

    if (focus) {
      crInput.focus();
    }
  }

  function getPartyState() {
    const inputs = [...partyRows.querySelectorAll(".level-input")];
    const levels = inputs
      .map((input) => Number(input.value))
      .filter((level) => Number.isInteger(level) && level >= 1 && level <= 20);

    return {
      count: inputs.length,
      levels,
      isValid: inputs.length > 0 && levels.length === inputs.length
    };
  }

  function getMonsterGroups() {
    return [...monsterRows.querySelectorAll(".monster-row")]
      .map((row) => {
        const cr = normalizeCr(row.querySelector(".cr-input").value);
        const name = row.querySelector(".monster-select").value;
        const quantity = Number(row.querySelector(".quantity").value) || 1;
        return { row, cr, name, quantity, xp: XP_BY_CR[cr] ?? 0 };
      })
      .filter((group) => group.name && window.MONSTERS_BY_CR[group.cr]?.includes(group.name));
  }

  function getThresholds(levels) {
    return levels.reduce(
      (totals, level) => {
        const budget = XP_BUDGET_BY_LEVEL[level];
        totals.low += budget[0];
        totals.medium += budget[1];
        totals.high += budget[2];
        return totals;
      },
      { low: 0, medium: 0, high: 0 }
    );
  }

  function getDifficulty(totalXp, thresholds, partyIsValid) {
    if (!partyIsValid || totalXp === 0) return "too-low";
    if (totalXp <= thresholds.low) return "low";
    if (totalXp <= thresholds.medium) return "medium";
    if (totalXp <= thresholds.high) return "high";
    return "too-high";
  }

  function rollDice(count, sides) {
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }

  function rollIndividualTreasure(cr) {
    const numericCr = cr.includes("/")
      ? cr.split("/").reduce((numerator, denominator) => Number(numerator) / Number(denominator))
      : Number(cr);

    if (numericCr <= 4) return { amount: rollDice(3, 6), currency: "gp" };
    if (numericCr <= 10) return { amount: rollDice(2, 8) * 10, currency: "gp" };
    if (numericCr <= 16) return { amount: rollDice(2, 10) * 10, currency: "pp" };
    return { amount: rollDice(2, 8) * 100, currency: "pp" };
  }

  function treasureTagAllowsIndividual(tag) {
    return tag === "Any" || tag.split(",").some((part) => part.trim() === "Individual");
  }

  function getTreasureRolls(group, tag, forceReroll) {
    const key = `${group.name}|${group.cr}`;
    const state = group.row.treasureState ?? { key: "", rolls: [] };

    if (forceReroll || state.key !== key) {
      state.key = key;
      state.rolls = [];
    }

    if (treasureTagAllowsIndividual(tag)) {
      while (state.rolls.length < group.quantity) {
        state.rolls.push(rollIndividualTreasure(group.cr));
      }
      state.rolls = state.rolls.slice(0, group.quantity);
    } else {
      state.rolls = [];
    }

    group.row.treasureState = state;
    return state.rolls;
  }

  function renderTreasure(groups, forceReroll) {
    treasureResults.replaceChildren();

    if (groups.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-result";
      empty.textContent = "Choose at least one monster to generate treasure.";
      treasureResults.append(empty);
      return;
    }

    for (const group of groups) {
      const tag = MONSTER_TREASURE_BY_NAME[group.name] ?? "None";
      const rolls = getTreasureRolls(group, tag, forceReroll);
      const wrapper = document.createElement("section");
      wrapper.className = "treasure-group";

      const heading = document.createElement("h3");
      heading.textContent = `${group.name} (CR ${group.cr}):`;
      wrapper.append(heading);

      if (rolls.length > 0) {
        const list = document.createElement("ol");
        list.className = "treasure-rolls";
        rolls.forEach((roll, index) => {
          const item = document.createElement("li");
          const number = document.createElement("span");
          number.textContent = `#${index + 1}:`;
          item.append(number, ` ${formatNumber(roll.amount)} ${roll.currency}`);
          list.append(item);
        });
        wrapper.append(list);
      } else {
        const note = document.createElement("p");
        note.className = "treasure-tag";
        note.textContent = tag === "None"
          ? "No treasure is listed for this creature."
          : `No Individual roll · Monster Manual treasure: ${tag}.`;
        wrapper.append(note);
      }

      treasureResults.append(wrapper);
    }
  }

  function renderCalculations({ forceReroll = false } = {}) {
    const party = getPartyState();
    const groups = getMonsterGroups();
    const totalMonsters = groups.reduce((total, group) => total + group.quantity, 0);
    const totalXp = groups.reduce((total, group) => total + group.xp * group.quantity, 0);
    const thresholds = getThresholds(party.levels);
    const difficulty = getDifficulty(totalXp, thresholds, party.isValid);

    encounterMatchup.textContent = `(${party.count} ${pluralize(party.count, "PC")} vs ${totalMonsters} ${pluralize(totalMonsters, "Monster")})`;

    lowThreshold.textContent = formatNumber(thresholds.low);
    mediumThreshold.textContent = formatNumber(thresholds.medium);
    highThreshold.textContent = formatNumber(thresholds.high);

    const scaleMaximum = thresholds.high || 1;
    lowSegment.style.width = `${(thresholds.low / scaleMaximum) * 100}%`;
    mediumSegment.style.width = `${((thresholds.medium - thresholds.low) / scaleMaximum) * 100}%`;
    highSegment.style.width = `${((thresholds.high - thresholds.medium) / scaleMaximum) * 100}%`;

    const markerPosition = Math.min(99, Math.max(1, (totalXp / scaleMaximum) * 100));
    difficultyMarker.style.left = `${markerPosition}%`;
    difficultyMarker.classList.toggle("is-overflow", totalXp > thresholds.high && thresholds.high > 0);
    difficultyXp.textContent = `${formatNumber(totalXp)} XP`;
    difficultyTrack.setAttribute(
      "aria-label",
      `${formatNumber(totalXp)} XP. ${difficulty.replace("-", " ")} difficulty. Low threshold ${formatNumber(thresholds.low)}, moderate ${formatNumber(thresholds.medium)}, high ${formatNumber(thresholds.high)}.`
    );

    difficultyLabels.forEach((label) => {
      label.classList.toggle("is-active", label.dataset.difficulty === difficulty);
    });

    const xpPerPc = party.count > 0 ? totalXp / party.count : 0;
    xpSummary.innerHTML = `The amount of XP to be shared between all PCs is <strong>${formatNumber(totalXp)} XP</strong> (<strong>${formatNumber(xpPerPc)} XP per PC</strong>).`;

    if (!party.isValid) {
      calculationNote.textContent = party.count === 0
        ? "Add at least one PC to calculate encounter thresholds."
        : "Enter a level from 1 to 20 for every PC to calculate accurate thresholds.";
    } else if (forceReroll) {
      calculationNote.textContent = "Treasure rerolled. Difficulty and XP continue to update automatically.";
    } else {
      calculationNote.textContent = "Difficulty and XP update automatically. Calculate rerolls treasure.";
    }

    renderTreasure(groups, forceReroll);
  }

  document.querySelector("#add-party").addEventListener("click", () => addPartyRow({ focus: true }));
  document.querySelector("#add-monster").addEventListener("click", () => addMonsterRow({ focus: true }));
  document.querySelector("#calculate").addEventListener("click", () => renderCalculations({ forceReroll: true }));

  for (let index = 0; index < 4; index += 1) {
    addPartyRow();
  }
  addMonsterRow();
})();
