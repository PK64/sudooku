import { createContext, useReducer } from "react"
import { produce } from "immer"
import { ACTION_PUSH, ACTION_POP, ACTION_CLEAR, ACTION_REVERSE, ACTION_REFRESH } from "../lib/Actions"

const State = createContext()
const Dispatch = createContext()

function chainReducer(state, action) {
  return produce(state, draft => {
    switch (action.type) {
      case ACTION_PUSH: {
        let k = action.data.k
        let i = action.data.i
        let cell = action.data.marks.find(e => e.data.k === k)
        let mark = cell.elements[i]
        let ci = draft.waypoints.findIndex(wp => wp.k === k && wp.i === i)
        if (ci < 0 && mark.visible) {
          draft.waypoints.push({ k, i, x: mark.x, y: mark.y })
        } else if (ci === draft.waypoints.length - 1) {
          draft.waypoints.pop()
        } else if (ci === 0) {
          draft.waypoints.reverse()
        }
        return
      }
      case ACTION_CLEAR: {
        draft.waypoints.length = 0
        return
      }
      case ACTION_POP: {
        draft.waypoints.pop()
        return
      }
      case ACTION_REVERSE: {
        draft.waypoints.reverse()
        return
      }
      case ACTION_REFRESH: {
        let update = draft.waypoints.map(wp => {
          let cell = action.data.marks.find(e => e.data.k === wp.k)
          let mark = cell.elements[wp.i]
          return { k: wp.k, i: wp.i, x: mark.x, y: mark.y }
        })
        draft.waypoints = update
        return
      }
    }
  })
}

const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(chainReducer, { waypoints: [] })

  return (
    <State.Provider value={state}>
      <Dispatch.Provider value={dispatch}>{children}</Dispatch.Provider>
    </State.Provider>
  )
}

const ChainContext = {
  State,
  Dispatch,
  Provider
}

export default ChainContext
