import { xytok, ktoxy } from "../lib/utils"
import { TYPE_MODE, TYPE_MODE_GROUP, TYPE_DIGITS, TYPE_CORNER_MARKS,
  TYPE_CENTRE_MARKS, TYPE_COLOURS, TYPE_PENLINES, TYPE_SELECTION, TYPE_UNDO,
  TYPE_REDO, TYPE_INIT, TYPE_CHECK, TYPE_PAUSE, ACTION_ALL, ACTION_SET,
  ACTION_PUSH, ACTION_CLEAR, ACTION_REMOVE, ACTION_ROTATE, ACTION_RIGHT,
  ACTION_LEFT, ACTION_UP, ACTION_DOWN, TYPE_AUTOFILL_MARKS, TYPE_SET_GIVEN,
  TYPE_PAINT_MODE, ACTION_TOGGLE } from "../lib/Actions"
import { MODE_NORMAL, MODE_CORNER, MODE_CENTRE, MODE_FIXED, MODE_COLOUR, MODE_PEN,
  MODE_CHAIN, MARKS_PLACEMENT_FIXED, getModeGroup } from "../lib/Modes"
import { createContext, useReducer } from "react"
import produce from "immer"
import { isEqual } from "lodash"

const State = createContext()
const Dispatch = createContext()

function makeGiven(data, srcAttr, generator) {
  if (data === undefined || data.cells === undefined) {
    return new Map()
  }

  let r = new Map()
  data.cells.forEach((row, y) => {
    row.forEach((col, x) => {
      if (col[srcAttr] !== undefined && (!Array.isArray(col[srcAttr]) || col[srcAttr].length > 0)) {
        r.set(xytok(x, y), generator(col[srcAttr]))
      }
    })
  })
  return r
}

function makeGivenDigits(data) {
  return makeGiven(data, "value", n => {
    n = /^\d+$/.test(n) ? +n : n
    return {
      digit: n,
      given: true
    }
  })
}

function makeGivenMarks(data, srcAttr) {
  return makeGiven(data, srcAttr, cms => {
    let digits = new Set()
    for (let cm of cms) {
      let n = /^\d+$/.test(cm) ? +cm : cm
      digits.add(n)
    }
    return digits
  })
}

function makeEmptyState(data) {
  let givenDigits = makeGivenDigits(data)
  return {
    data,
    mode: MODE_NORMAL,
    modeGroup: 0,
    enabledModes0: [MODE_NORMAL],
    enabledModes1: [MODE_PEN],
    digits: givenDigits,
    givenDigitsCount: givenDigits.size,
    cornerMarks: makeGivenMarks(data, "cornermarks"),
    centreMarks: makeGivenMarks(data, "centremarks"),
    fixedMarks: makeGivenMarks(data, "cornermarks"),
    colours: new Map(),
    penLines: new Set(),
    selection: new Set(),
    highlightDigit: 0,
    paintMode: { active: false, digit: 0 },
    errors: new Set(),
    undoStates: [],
    nextUndoState: 0,
    solved: (data || {}).solved || false,
    paused: false,
    checkCounter: 0
  }
}

function filterGivens(digits, selection) {
  let r = []
  for (let sc of selection) {
    let cell = digits.get(sc)
    if (cell === undefined || !cell.given) {
      r.push(sc)
    }
  }
  return r
}

function cellsImpactedByDigit(selection) {
  let impactedCells = new Set()
  for (let sc of selection) {
    let [x, y] = ktoxy(sc)
    let rx = Math.floor(x / 3) * 3
    let ry = Math.floor(y / 3) * 3
    let regionOffsets = [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2]
    ]
    for (let offset of regionOffsets) {
      impactedCells.add(xytok(rx + offset[0], ry + offset[1]))
    }
    for (let i = 0; i < 9; i++) {
      impactedCells.add(xytok(x, i))
      impactedCells.add(xytok(i, y))
    }
  }
  return impactedCells
}

function modeReducer(draft, action) {
  let newEnabledModes
  if (draft.modeGroup === 0) {
    newEnabledModes = [...draft.enabledModes0]
  } else {
    newEnabledModes = [...draft.enabledModes1]
  }

  switch (action.action) {
    case ACTION_SET:
      newEnabledModes = [action.mode]
      draft.modeGroup = getModeGroup(action.mode)
      break

    case ACTION_PUSH:
      if (newEnabledModes.indexOf(action.mode) === -1) {
        newEnabledModes.push(action.mode)
      }
      break

    case ACTION_REMOVE: {
      let i = newEnabledModes.indexOf(action.mode)
      // Never remove the mode at position 0! It represents the previous one
      if (i >= 1) {
        newEnabledModes.splice(i, 1)
      }
      break
    }
  }

  let newMode
  if (draft.modeGroup === 0) {
    newMode = MODE_NORMAL
  } else {
    newMode = MODE_PEN
  }
  if (newEnabledModes.length > 0) {
    newMode = newEnabledModes[newEnabledModes.length - 1]
  }

  if (action.action === ACTION_ROTATE) {
    let fixed = action.mode === MARKS_PLACEMENT_FIXED
    switch (newMode) {
      case MODE_NORMAL:
        newMode = fixed ? MODE_FIXED : MODE_CORNER
        break
      case MODE_CORNER:
        newMode = MODE_CENTRE
        break
      case MODE_CENTRE:
        newMode = MODE_COLOUR
        break
      case MODE_FIXED:
        newMode = MODE_CHAIN
        break
      case MODE_CHAIN:
        newMode = MODE_COLOUR
        break
      case MODE_COLOUR:
        newMode = MODE_NORMAL
        break
      case MODE_PEN:
        newMode = MODE_PEN
        break
    }
    newEnabledModes = [newMode]
  }

  draft.mode = newMode
  if (draft.modeGroup === 0) {
    draft.enabledModes0 = newEnabledModes
  } else {
    draft.enabledModes1 = newEnabledModes
  }
}

function modeGroupReducer(draft, action) {
  switch (action.action) {
    case ACTION_ROTATE:
      draft.modeGroup = (draft.modeGroup + 1) % 2
      if (draft.modeGroup === 0) {
        draft.mode = draft.enabledModes0[draft.enabledModes0.length - 1]
      } else {
        draft.mode = draft.enabledModes1[draft.enabledModes1.length - 1]
      }
      break
  }
}

function autofillMarksReducer(marks, digits, selection, cells = []) {
  let regions = []
  let rows = []
  let cols = []
  for (let i = 0; i < 9; i++) {
    regions[i] = new Set()
    rows[i] = new Set()
    cols[i] = new Set()
  }
  for (let [k, d] of digits) {
    let [x, y] = ktoxy(k)
    let r = Math.floor(y / 3) + Math.floor(x / 3) * 3
    regions[r].add(d.digit)
    rows[y].add(d.digit)
    cols[x].add(d.digit)
  }

  if (selection.length === 0) {
    cells.forEach((row, y) => {
      row.forEach((col, x) => {
        let k = xytok(x, y)
        if (! (marks.has(k) || digits.has(k))) {
          selection.push(k)
        }
      })
    })
  }

  for (let sc of selection) {
    let [x, y] = ktoxy(sc)
    let r = Math.floor(y / 3) + Math.floor(x / 3) * 3
    let autoDigits = new Set()
    for (let d = 1; d <= 9; d++) {
      if (! (regions[r].has(d) || rows[y].has(d) || cols[x].has(d))) {
        autoDigits.add(d)
      }
    }
    marks.set(sc, autoDigits)
  }
}

function marksReducer(marks, action, selection) {
  switch (action.action) {
    case ACTION_SET: {
      for (let sc of selection) {
        let digits = marks.get(sc)
        if (digits === undefined) {
          digits = new Set()
          marks.set(sc, digits)
        }
        if (digits.has(action.digit)) {
          digits.delete(action.digit)
        } else {
          digits.add(action.digit)
        }
        if (digits.size === 0) {
          marks.delete(sc)
        }
      }
      break
    }

    case ACTION_REMOVE: {
      if (action.digit !== undefined) {
        for (let sc of selection) {
          let digits = marks.get(sc)
          if (digits !== undefined && digits.has(action.digit)) {
            digits.delete(action.digit)
          }
        }
      } else {
        for (let sc of selection) {
          marks.delete(sc)
        }
      }
      break
    }
  }
}

function digitsReducer(digits, marks, action, selection) {
  switch (action.action) {
    case ACTION_SET: {
      for (let sc of selection) {
        digits.set(sc, {
          digit: action.digit
        })
      }
      marksReducer(marks, {
        action: ACTION_REMOVE,
        digit: action.digit
      }, cellsImpactedByDigit(selection))
      break
    }

    case ACTION_REMOVE: {
      for (let sc of selection) {
        digits.delete(sc)
      }
      break
    }
  }
}

function digitsModeReducer(state, mode, action) {
  switch (mode) {
    case MODE_CORNER:
      marksReducer(state.cornerMarks, action,
        filterGivens(state.digits, state.selection))
      return
    case MODE_CENTRE:
      marksReducer(state.centreMarks, action,
        filterGivens(state.digits, state.selection))
      return
    case MODE_FIXED:
      marksReducer(state.fixedMarks, action,
        filterGivens(state.digits, state.selection))
      return
    case MODE_COLOUR:
      return
  }
  digitsReducer(state.digits, state.fixedMarks, action,
    filterGivens(state.digits, state.selection))
  highlightSelectedDigit(state)
}

function coloursReducer(digits, action, selection) {
  switch (action.action) {
    case ACTION_SET: {
      for (let sc of selection) {
        digits.set(sc, {
          colour: action.digit
        })
      }
      break
    }

    case ACTION_REMOVE: {
      for (let sc of selection) {
        digits.delete(sc)
      }
      break
    }
  }
}

function penLinesReducer(penLines, action) {
  switch (action.action) {
    case ACTION_PUSH: {
      if (Array.isArray(action.k)) {
        for (let k of action.k) {
          penLines.add(k)
        }
      } else {
        penLines.add(action.k)
      }
      return
    }

    case ACTION_REMOVE: {
      if (Array.isArray(action.k)) {
        for (let k of action.k) {
          penLines.delete(k)
        }
      } else {
        penLines.delete(action.k)
      }
      return
    }
  }
}

function highlightSelectedDigit(state) {
  if (state.selection.size === 1) {
    let [sc] = state.selection
    let digits = state.digits.get(sc)
    if (digits !== undefined) {
      state.highlightDigit = digits.digit
      return
    }
  }
  state.highlightDigit = 0
}

function paintModeReducer(state, action) {
  switch (action.action) {
    case ACTION_TOGGLE:
      state.paintMode.active = !state.paintMode.active
      break
    case ACTION_SET:
      state.paintMode.digit = action.digit
      break
  }
  if (state.paintMode.active) {
    state.highlightDigit = state.paintMode.digit
    state.selection.clear()
  }
}

function selectionReducer(selection, action, cells = []) {
  switch (action.action) {
    case ACTION_ALL:
      selection.clear()
      cells.forEach((row, y) => {
        row.forEach((col, x) => {
          selection.add(xytok(x, y))
        })
      })
      return
    case ACTION_CLEAR:
      selection.clear()
      return
    case ACTION_SET: {
      selection.clear()
      if (Array.isArray(action.k)) {
        for (let k of action.k) {
          selection.add(k)
        }
      } else {
        selection.add(action.k)
      }
      return
    }
    case ACTION_PUSH: {
      if (Array.isArray(action.k)) {
        for (let k of action.k) {
          selection.add(k)
        }
      } else {
        selection.add(action.k)
      }
      return
    }
    case ACTION_REMOVE: {
      if (Array.isArray(action.k)) {
        for (let k of action.k) {
          selection.delete(k)
        }
      } else {
        selection.delete(action.k)
      }
      return
    }
  }

  if (selection.size > 0 && (action.action === ACTION_RIGHT ||
      action.action === ACTION_LEFT || action.action === ACTION_UP ||
      action.action === ACTION_DOWN)) {
    let last = [...selection].pop()
    if (!action.append) {
      selection.clear()
    }

    let [lastX, lastY] = ktoxy(last)
    let rowLength = cells[lastY]?.length || 1
    let colLength = cells.length

    let newK
    switch (action.action) {
      case ACTION_RIGHT:
        newK = xytok((lastX + 1) % rowLength, lastY)
        break
      case ACTION_LEFT:
        newK = xytok((lastX - 1 + rowLength) % rowLength, lastY)
        break
      case ACTION_UP:
        newK = xytok(lastX, (lastY - 1 + colLength) % colLength)
        break
      case ACTION_DOWN:
        newK = xytok(lastX, (lastY + 1) % colLength)
        break
    }

    if (newK !== undefined) {
      // re-add key so element becomes last in set
      selection.delete(newK)
      selection.add(newK)
    }
  }
}

function checkDuplicates(grid, errors, flip = false) {
  for (let y = 0; y < grid.length; ++y) {
    let cells = grid[y]
    if (cells !== undefined) {
      for (let x = 0; x < cells.length; ++x) {
        for (let x2 = x + 1; x2 < cells.length; ++x2) {
          if (cells[x] !== undefined && cells[x2] !== undefined &&
              cells[x] === cells[x2]) {
            if (flip) {
              errors.add(xytok(y, x))
              errors.add(xytok(y, x2))
            } else {
              errors.add(xytok(x, y))
              errors.add(xytok(x2, y))
            }
          }
        }
      }
    }
  }
}

function checkReducer(digits, cells = []) {
  let errors = new Set()
  let gridByRow = []
  let gridByCol = []

  // check for empty cells
  cells.forEach((row, y) => {
    row.forEach((col, x) => {
      let k = xytok(x, y)
      let d = digits.get(k)
      if (d === undefined) {
        errors.add(k)
      } else {
        gridByRow[y] = gridByRow[y] || []
        gridByRow[y][x] = d.digit
        gridByCol[x] = gridByCol[x] || []
        gridByCol[x][y] = d.digit
      }
    })
  })

  // check for duplicate digits in rows
  checkDuplicates(gridByRow, errors)

  // check for duplicate digits in cols
  checkDuplicates(gridByCol, errors, true)

  return errors
}

function gameReducerNoUndo(state, mode, action) {
  switch (action.type) {
    case TYPE_MODE:
      modeReducer(state, action)
      return

    case TYPE_MODE_GROUP:
      modeGroupReducer(state, action)
      return

    case TYPE_PAINT_MODE:
      paintModeReducer(state, action)
      return

    case TYPE_AUTOFILL_MARKS:
      if (action.mode !== undefined) {
        mode = action.mode
      }
      switch (mode) {
        case MODE_CORNER:
          autofillMarksReducer(state.cornerMarks, state.digits,
            filterGivens(state.digits, state.selection),
              state.data?.cells)
          return
        case MODE_CENTRE:
          autofillMarksReducer(state.centreMarks, state.digits,
            filterGivens(state.digits, state.selection),
              state.data?.cells)
          return
        case MODE_FIXED:
          autofillMarksReducer(state.fixedMarks, state.digits,
            filterGivens(state.digits, state.selection),
              state.data?.cells)
          return
      }
    case TYPE_DIGITS:
      if (state.paintMode.active && action.action === ACTION_SET) {
        paintModeReducer(state, action)
      } else {
        digitsModeReducer(state, mode, action)
      }
      return

    case TYPE_COLOURS:
      coloursReducer(state.colours, action, state.selection)
      return

    case TYPE_PENLINES:
      penLinesReducer(state.penLines, action)
      return

    case TYPE_SELECTION:
      selectionReducer(state.selection, action, state.data?.cells)
      if (state.paintMode.active && state.paintMode.digit !== 0 && action.action === ACTION_SET) {
        digitsModeReducer(state, mode, { digit: state.paintMode.digit, ...action })
      } else {
        highlightSelectedDigit(state)
      }
      return
  }
}

function makeUndoState(state) {
  return {
    digits: state.digits,
    cornerMarks: state.cornerMarks,
    centreMarks: state.centreMarks,
    fixedMarks: state.fixedMarks,
    colours: state.colours,
    penLines: state.penLines
  }
}

function gameReducer(state, action) {
  return produce(state, draft => {
    if (action.type === TYPE_INIT) {
      let canonicalData = undefined
      if (action.data !== undefined) {
        canonicalData = { ...action.data }
        canonicalData.cells = canonicalData.cells || []
        canonicalData.regions = canonicalData.regions || []
        canonicalData.cages = canonicalData.cages || []
        canonicalData.lines = canonicalData.lines || []
        canonicalData.arrows = canonicalData.arrows || []
        canonicalData.underlays = canonicalData.underlays || []
        canonicalData.overlays = canonicalData.overlays || []

        // look for title, author, and rules
        for (let cage of canonicalData.cages) {
          if (cage.cells === undefined || !Array.isArray(cage.cells) ||
              cage.cells.length === 0) {
            if (typeof cage.value === "string") {
              if (cage.value.startsWith("title:")) {
                canonicalData.title = canonicalData.title || cage.value.substring(6).trim()
              } else if (cage.value.startsWith("author:")) {
                canonicalData.author = canonicalData.author || cage.value.substring(7).trim()
              } else if (cage.value.startsWith("rules:")) {
                canonicalData.rules = canonicalData.rules || cage.value.substring(6).trim()
              }
            }
          }
        }
      }

      return makeEmptyState(canonicalData)
    }

    if (action.type === TYPE_SET_GIVEN) {
      let cellDigits = new Array(81).fill(0)
      for (let [k, digits] of state.digits) {
        let [x, y] = ktoxy(k)
        let cellIndex = x + y * 9
        cellDigits[cellIndex] = digits.digit
      }
      let givenString = cellDigits.join("")
      window.location = "/?given=" + givenString
      return
    }

    if (action.type !== TYPE_PAUSE && state.paused) {
      // ignore any interaction when paused
      return
    }

    // clear errors on every interaction
    if (draft.errors.size > 0) {
      draft.errors.clear()
    }

    if (action.type === TYPE_UNDO) {
      if (draft.nextUndoState === 0) {
        return
      }
      let oldState = draft.undoStates[draft.nextUndoState - 1]
      if (draft.nextUndoState === draft.undoStates.length) {
        draft.undoStates.push(makeUndoState(draft))
      }
      Object.assign(draft, makeUndoState(oldState))
      draft.nextUndoState = draft.nextUndoState - 1
      return
    }

    if (action.type === TYPE_REDO) {
      if (draft.nextUndoState >= draft.undoStates.length - 1) {
        return
      }
      let oldState = draft.undoStates[draft.nextUndoState + 1]
      Object.assign(draft, makeUndoState(oldState))
      draft.nextUndoState = draft.nextUndoState + 1
      return
    }

    if (action.type === TYPE_CHECK) {
      draft.errors = checkReducer(draft.digits, draft.data?.cells)
      if (!draft.solved) {
        draft.solved = draft.errors.size === 0
      }
      draft.checkCounter++
      return
    }

    if (action.type === TYPE_PAUSE) {
      draft.paused = !draft.paused
      return
    }

    if ((action.type === TYPE_DIGITS || action.type === TYPE_CORNER_MARKS ||
        action.type === TYPE_CENTRE_MARKS || action.type === TYPE_COLOURS) &&
        action.action === ACTION_REMOVE) {
      let deleteColour = false
      if (draft.mode === MODE_COLOUR) {
        for (let sc of draft.selection) {
          deleteColour = draft.colours.has(sc)
          if (deleteColour) {
            break
          }
        }
      }
      let highest = MODE_COLOUR
      if (!deleteColour) {
        for (let sc of draft.selection) {
          let digit = draft.digits.get(sc)
          if (digit !== undefined && !digit.given) {
            highest = MODE_NORMAL
            break
          }
          if (highest === MODE_COLOUR && draft.centreMarks.has(sc)) {
            highest = MODE_CENTRE
          } else if (highest === MODE_COLOUR && draft.cornerMarks.has(sc)) {
            highest = MODE_CENTRE
          } else if (highest === MODE_COLOUR && draft.fixedMarks.has(sc)) {
            highest = MODE_FIXED
          }
        }
        if (highest === MODE_CENTRE) {
          gameReducerNoUndo(draft, MODE_CORNER, action)
        } else if (highest === MODE_FIXED) {
          gameReducerNoUndo(draft, MODE_FIXED, action)
        }
      }
      if (highest === MODE_COLOUR) {
        gameReducerNoUndo(draft, highest, { ...action, type: TYPE_COLOURS })
      } else {
        gameReducerNoUndo(draft, highest, action)
      }
    } else {
      gameReducerNoUndo(draft, draft.mode, action)
    }

    let us = makeUndoState(state)
    let nus = makeUndoState(draft)
    if (!isEqual(us, nus) && (draft.nextUndoState === 0 ||
        !isEqual(draft.undoStates[draft.nextUndoState - 1], us))) {
      let newUndoStates = draft.undoStates.slice(0, draft.nextUndoState)
      newUndoStates[draft.nextUndoState] = us
      draft.undoStates = newUndoStates
      draft.nextUndoState = draft.nextUndoState + 1
    }
  })
}

const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, makeEmptyState())

  return (
    <State.Provider value={state}>
      <Dispatch.Provider value={dispatch}>{children}</Dispatch.Provider>
    </State.Provider>
  )
}

const GameContext = {
  State,
  Dispatch,
  Provider
}

export default GameContext
