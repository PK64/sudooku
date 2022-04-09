import Button from "./Button"
import SettingsContext from "./contexts/SettingsContext"
import GameContext from "./contexts/GameContext"
import ChainContext from "./contexts/ChainContext"
import { TYPE_MODE, TYPE_DIGITS, TYPE_COLOURS, TYPE_UNDO, TYPE_REDO,
  ACTION_SET, ACTION_REMOVE, TYPE_AUTOFILL_MARKS, TYPE_SET_GIVEN,
  TYPE_PAINT_MODE, ACTION_TOGGLE, ACTION_CLEAR, ACTION_REVERSE, ACTION_POP } from "./lib/Actions"
import { MODE_NORMAL, MODE_CORNER, MODE_CENTRE, MODE_FIXED, MODE_COLOUR, MODE_PEN,
  getModeGroup, MODE_CHAIN, MARKS_PLACEMENT_FIXED } from "./lib/Modes"
import { useContext, useEffect, useRef, useState } from "react"
import { Delete, Redo, Undo } from "lucide-react"
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
  const updateChain = useContext(ChainContext.Dispatch)
  const [colours, setColours] = useState([])
  const [digitCount, setDigitCount] = useState([])

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
    let digitCount = [ -1, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
    for (let digits of game.digits.values()) {
      digitCount[digits.digit]++
    }
    setDigitCount(digitCount)

    if (game.paintMode.active && digitCount[game.paintMode.digit] === 9) {
      let nextDigit = 0
      let initialDigit = game.paintMode.digit
      for (let i = (initialDigit + 1) % 10; i !== initialDigit; i = (i + 1) % 10) {
        if (i !== 0) {
          if (digitCount[i] !== 9) {
            nextDigit = i
            break
          }
        }
      }
      updateGame({
        type: TYPE_PAINT_MODE,
        action: ACTION_SET,
        digit: nextDigit
      })
    }
  }, [game.digits, updateGame, game.paintMode])

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

  function onAutofillMarks() {
    updateGame({
      type: TYPE_AUTOFILL_MARKS
    })
  }

  function onSetGiven() {
    updateGame({
      type: TYPE_SET_GIVEN
    })
  }

  function onTogglePaintMode() {
    updateGame({
      type: TYPE_PAINT_MODE,
      action: ACTION_TOGGLE
    })
  }

  function onClearChain() {
    updateChain({ type: ACTION_CLEAR })
  }

  function onReverseChain() {
    updateChain({ type: ACTION_REVERSE })
  }

  function onPopChain() {
    updateChain({ type: ACTION_POP })
  }

  let modeGroup = getModeGroup(game.mode)

  const allButtons = []

  function addButton(classSpec, element) {
    allButtons.push(
      <div className={"button-container " + classSpec}>
        {element}
        <style jsx>{styles}</style>
      </div>
    )
  }

  addButton("delete-button",
    <Button noPadding onClick={onDelete}>
      <div className="delete-container">
        <Delete size="36" />
        <style jsx>{styles}</style>
      </div>
    </Button>
  )

  addButton("undo-button",
    <Button noPadding onClick={onUndo}>
      <Undo size="36" />
    </Button>
  )

  addButton("redo-button",
    <Button noPadding onClick={onRedo}>
      <Redo size="36" />
    </Button>
  )

  if (modeGroup === 0) {
    addButton("normal-mode-button",
      <ModeButton mode={MODE_NORMAL} label="Normal"></ModeButton>
    )

    if (settings.marksPlacement === MARKS_PLACEMENT_FIXED) {
      addButton("pencil-mode-button",
        <ModeButton mode={MODE_FIXED} label="Pencil"></ModeButton>
      )
      addButton("chain-mode-button",
        <ModeButton mode={MODE_CHAIN} label="Chain"></ModeButton>
      )
      addButton("paint-toggle-button",
        <Button active={game.paintMode.active}
          noPadding onClick={() => onTogglePaintMode()}>
          <div className="label-container">Paint<style jsx>{styles}</style></div>
        </Button>
      )
    } else {
      addButton("corner-mode-button",
        <ModeButton mode={MODE_CORNER} label="Corner"></ModeButton>
      )
      addButton("centre-mode-button",
        <ModeButton mode={MODE_CENTRE} label="Centre"></ModeButton>
      )
    }

    addButton("colour-mode-button",
      <ModeButton mode={MODE_COLOUR} label="Colour"></ModeButton>
    )
  } else {
    addButton("pen-mode-button",
      <ModeButton mode={MODE_PEN} label="Pen"></ModeButton>
    )
  }

  if (modeGroup === 0) {
    if (game.mode === MODE_CHAIN) {
      addButton("chain-clear-button",
        <Button noPadding onClick={onClearChain}><div className="label-container">Clear</div><style jsx>{styles}</style></Button>
      )
      addButton("chain-reverse-button",
        <Button noPadding onClick={onReverseChain}><div className="label-container">Reverse</div><style jsx>{styles}</style></Button>
      )
      addButton("chain-pop-button",
        <Button noPadding onClick={onPopChain}><div className="label-container">Pop</div><style jsx>{styles}</style></Button>
      )
    } else if (game.mode !== MODE_COLOUR) {
      let paintDigit = 0
      if (game.paintMode.active) {
        paintDigit = game.paintMode.digit
      }
      for (let i = 1; i <= 9; ++i) {
        let digit = i % 10
        let remaining = 9 - digitCount[digit]
        let disabled = (game.paintMode.active && remaining === 0)
        addButton("digit-" + digit + "-button",
          <Button key={i} noPadding active={digit === paintDigit} onClick={() => onDigit(digit)} disabled={disabled}>
            <div className={classNames("digit-container", `digit-${digit}`)}>
              <div>
                {digit}
              </div>
              {((game.mode === MODE_NORMAL || game.mode === MODE_FIXED) && !isNaN(remaining)) && (
              <div className="digit-remaining">
                {remaining}
              </div>
              )}
            </div>
            <style jsx>{styles}</style>
          </Button>
        )
      }
    } else if (game.mode === MODE_COLOUR) {
      const MAX_COLORS = 9
      let colorCount = 0
      for (let c of colours) {
        if (c === undefined) {
          continue
        }
        colorCount++
        if (colorCount > MAX_COLORS) {
          break
        }
        addButton("colour-" + colorCount + "-button",
          <Button key={c.digit} noPadding onClick={() => onColour(c.digit)}>
            <div className={classNames("colour-container", { light: c.light })}
              style={{ backgroundColor: c.colour }}>
            </div>
            <style jsx>{styles}</style>
          </Button>
        )
      }
    }
  }

  while (allButtons.length < 18) {
    allButtons.push(<div className="placeholder"><style jsx>{styles}</style></div>)
  }

  return (
    <div className={classNames("pad", `mode-${game.mode}`)} ref={ref}>
      {allButtons}
      <style jsx>{styles}</style>
    </div>
  )
}

export default Pad
