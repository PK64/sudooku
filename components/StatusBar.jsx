import GameContext from "./contexts/GameContext"
import SidebarContext from "./contexts/SidebarContext"
import { ID_RULES, ID_SETTINGS, ID_HELP, ID_ABOUT } from "./lib/SidebarTabs"
import Timer from "./Timer"
import Button from "./Button"
import { TYPE_CHECK, TYPE_SET_GIVEN } from "./lib/Actions"
import { BookOpen, HelpCircle, Info, Sliders, Check } from "lucide-react"
import { useContext, useEffect, useState } from "react"
import styles from "./StatusBar.scss"

const CheckButton = () => {
  const updateGame = useContext(GameContext.Dispatch)
  const game = useContext(GameContext.State)
  const [checkReady, setCheckReady] = useState(false)

  function onCheck() {
    updateGame({
      type: TYPE_CHECK
    })
  }

  useEffect(() => {
    // check if all cells are filled
    if (game.data === undefined) {
      setCheckReady(false)
    } else {
      let nCells = game.data.cells.reduce((acc, v) => acc + v.length, 0)
      setCheckReady(nCells === game.digits.size)
    }
  }, [game.data, game.digits])

  return (
    <Button noPadding onClick={() => onCheck()} pulsating={!game.solved && checkReady}>
      <div className="button-check"><Check /><style jsx>{styles}</style></div>
    </Button>
  )
}

const StatusBar = () => {
  const game = useContext(GameContext.State)
  const updateGame = useContext(GameContext.Dispatch)
  const onTabClick = useContext(SidebarContext.OnTabClick)

  function onSetGiven() {
    updateGame({
      type: TYPE_SET_GIVEN
    })
  }

  return <div className="status-bar">
    <div className="timer-group">
      <Timer solved={game.solved} />
      <div className="spacer"></div>
      {game.givenDigitsCount > 0 && (<CheckButton />)}
      {game.data !== undefined && game.givenDigitsCount === 0 && (
        <Button noPadding onClick={onSetGiven}>
        <div className="button-label">Set Given</div>
      </Button>
    )}
    </div>
    <div className="menu">
      {game.data !== undefined && game.data.title !== undefined && game.data.rules !== undefined && (
        <div className="menu-item" onClick={() => onTabClick(ID_RULES)}>
          <BookOpen />
        </div>
      )}
      <div className="menu-item" onClick={() => onTabClick(ID_SETTINGS)}>
        <Sliders />
      </div>
      <div className="menu-item" onClick={() => onTabClick(ID_HELP)}>
        <HelpCircle />
      </div>
      <div className="menu-item" onClick={() => onTabClick(ID_ABOUT)}>
        <Info />
      </div>
    </div>
    <style jsx>{styles}</style>
  </div>
}

export default StatusBar
