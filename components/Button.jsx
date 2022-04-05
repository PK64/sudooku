import { useState } from "react"
import classNames from "classnames"
import styles from "./Button.scss"

const Button = ({ active = false, onClick, noPadding = false, disabled = false, pulsating = false, children }) => {
  const [pressed, setPressed] = useState(false)

  function onClickInternal(e) {
    if (!disabled) {
      if (onClick !== undefined) {
        onClick(e)
      }
      e.stopPropagation()
    }
  }

  function onMouseDown() {
    if (!disabled) {
      setPressed(true)
    }
  }

  function onMouseUp() {
    if (!disabled) {
      setPressed(false)
    }
  }

  return <div tabIndex="0" className={classNames("button", { active, pressed, disabled, "no-padding": noPadding, pulsating })}
      onClick={onClickInternal} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
    {children}
    <style jsx>{styles}</style>
  </div>
}

export default Button
