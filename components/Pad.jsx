import Button from "./Button"
import SettingsContext from "./contexts/SettingsContext"
import GameContext from "./contexts/GameContext"
import { TYPE_MODE, TYPE_DIGITS, TYPE_COLOURS, TYPE_UNDO, TYPE_REDO,
  TYPE_CHECK, ACTION_SET, ACTION_REMOVE, TYPE_AUTOFILL_MARKS } from "./lib/Actions"
import { MODE_NORMAL, MODE_CORNER, MODE_CENTRE, MODE_FIXED, MODE_COLOUR, MODE_PEN,
  getModeGroup, MARKS_PLACEMENT_FIXED } from "./lib/Modes"
import { useContext, useEffect, useRef, useState } from "react"
import { Check, Delete, Redo, Undo } from "lucide-react"
import Color from "color"
import classNames from "classnames"
import styles from "./Pad.scss"

const ModeButton = ({ mode, label }) => {
  const updateGame = useContext(GameContext.Dispatch)
  const game = useContext(GameContext.State)

  function onMode(mode) {
    updateGame({
      type: TYPE_MODE,
      action: ACTION_SET,
      mode
    })
  }

  return (
    <Button active={game.mode === mode}
      noPadding onClick={() => onMode(mode)}>
      <div className="label-container">{label}<style jsx>{styles}</style></div>
    </Button>
  )
}

const Pad = () => {
  const ref = useRef()
  const settings = useContext(SettingsContext.State)
  const game = useContext(GameContext.State)
  const updateGame = useContext(GameContext.Dispatch)
  const [colours, setColours] = useState([])
  const [checkReady, setCheckReady] = useState(false)

  useEffect(() => {
    let computedStyle = getComputedStyle(ref.current)
    let nColours = +computedStyle.getPropertyValue("--colors")
    let newColours = []
    let colourPalette = settings.colourPalette
    if (colourPalette === "custom" && settings.customColours.length === 0) {
      colourPalette = "default"
    }
    if (colourPalette !== "custom") {
      for (let i = 0; i < nColours; ++i) {
        let col = computedStyle.getPropertyValue(`--color-${i + 1}`)
        let pos = +computedStyle.getPropertyValue(`--color-${i + 1}-pos`)
        newColours[pos - 1] = {
          colour: col,
          digit: i + 1,
          light: Color(col.trim()).luminosity() > 0.9
        }
      }
    } else {
      for (let i = 0; i < settings.customColours.length; ++i) {
        let col = settings.customColours[i]
        newColours[i] = {
          colour: col,
          digit: i + 1,
          light: Color(col.trim()).luminosity() > 0.9
        }
      }
    }
    setColours(newColours)
  }, [settings.colourPalette, settings.customColours])

  useEffect(() => {
    // check if all cells are filled
    if (game.data === undefined) {
      setCheckReady(false)
    } else {
      let nCells = game.data.cells.reduce((acc, v) => acc + v.length, 0)
      setCheckReady(nCells === game.digits.size)
    }
  }, [game.data, game.digits])

  function onDigit(digit) {
    updateGame({
      type: TYPE_DIGITS,
      action: ACTION_SET,
      digit
    })
  }

  function onColour(digit) {
    updateGame({
      type: TYPE_COLOURS,
      action: ACTION_SET,
      digit
    })
  }

  function onMode(mode) {
    updateGame({
      type: TYPE_MODE,
      action: ACTION_SET,
      mode
    })
  }

  function onDelete() {
    updateGame({
      type: TYPE_DIGITS,
      action: ACTION_REMOVE
    })
  }

  function onUndo() {
    updateGame({
      type: TYPE_UNDO
    })
  }

  function onRedo() {
    updateGame({
      type: TYPE_REDO
    })
  }

  function onCheck() {
    updateGame({
      type: TYPE_CHECK
    })
  }

  function onAutofillMarks() {
    updateGame({
      type: TYPE_AUTOFILL_MARKS
    })
  }

  let modeGroup = getModeGroup(game.mode)

  const modeButtons = []

  if (modeGroup === 0) {
    // 0
    modeButtons.push(
      <ModeButton mode={MODE_NORMAL} label="Normal"></ModeButton>
    )

    // 1, 2
    if (settings.marksPlacement === MARKS_PLACEMENT_FIXED) {
      modeButtons.push(
        <ModeButton mode={MODE_FIXED} label="Pencil"></ModeButton>
      )
      modeButtons.push(
        <div className="placeholder"><style jsx>{styles}</style></div>
      )
    } else {
      modeButtons.push(
        <ModeButton mode={MODE_CORNER} label="Corner"></ModeButton>
      )
      modeButtons.push(
        <ModeButton mode={MODE_CENTRE} label="Centre"></ModeButton>
      )
    }

    // 3
    modeButtons.push(
      <ModeButton mode={MODE_COLOUR} label="Colour"></ModeButton>
    )
  } else {
    // 0
    modeButtons.push(
      <ModeButton mode={MODE_PEN} label="Pen"></ModeButton>
    )

    // 1, 2, 3
    while (modeButtons.length < 4) {
      modeButtons.push(
        <div className="placeholder"><style jsx>{styles}</style></div>
      )
    }
  }

  const digitButtons = []

  if (modeGroup === 0) {
    if (game.mode !== MODE_COLOUR) {
      for (let i = 1; i <= 10; ++i) {
        let digit = i % 10
        digitButtons.push(
          <Button key={i} noPadding onClick={() => onDigit(digit)}>
            <div className={classNames("digit-container", `digit-${digit}`)}>
              <div>
                {digit}
              </div>
            </div>
            <style jsx>{styles}</style>
          </Button>
        )
      }
    } else if (game.mode === MODE_COLOUR) {
      for (let c of colours) {
        if (c === undefined) {
          continue
        }
        digitButtons.push(
          <Button key={c.digit} noPadding onClick={() => onColour(c.digit)}>
            <div className={classNames("colour-container", { light: c.light })}
              style={{ backgroundColor: c.colour }}>
            </div>
            <style jsx>{styles}</style>
          </Button>
        )
      }
      while (digitButtons.length < 12) {
        digitButtons.push(<div></div>)
      }
    }
  } else {
    while (digitButtons.length < 12) {
      digitButtons.push(<div className="placeholder"><style jsx>{styles}</style></div>)
    }
  }

  return (
    <div className={classNames("pad", `mode-${game.mode}`)} ref={ref}>
      <Button noPadding onClick={onDelete}>
        <div className="delete-container">
          <Delete size="1.05rem" />
        </div>
      </Button>
      <Button noPadding onClick={onUndo}>
        <Undo size="1.05rem" />
      </Button>
      <Button noPadding onClick={onRedo}>
        <Redo size="1.05rem" />
      </Button>
      {modeButtons[0]}
      {digitButtons[0]}
      {digitButtons[1]}
      {digitButtons[2]}
      {modeButtons[1]}
      {digitButtons[3]}
      {digitButtons[4]}
      {digitButtons[5]}
      {modeButtons[2]}
      {digitButtons[6]}
      {digitButtons[7]}
      {digitButtons[8]}
      {modeButtons[3]}
      {game.mode !== MODE_COLOUR && (<>
        <div className="zero-button">
          <Button noPadding onClick={onAutofillMarks}>
            <div className="label-container">Autofill Selection</div>
          </Button>
        </div>
        <div className="placeholder">
        </div>
      </>)}
      {game.mode === MODE_COLOUR && (<>
        {digitButtons[9]}
        {digitButtons[10]}
        {digitButtons[11]}
      </>)}
      <Button noPadding onClick={onCheck} pulsating={!game.solved && checkReady}>
        <Check size="1.05rem" />
      </Button>
      <style jsx>{styles}</style>
    </div>
  )
}

export default Pad
