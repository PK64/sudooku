import GameContext from "../components/contexts/GameContext"
import SettingsContext from "../components/contexts/SettingsContext"
import SidebarContext from "../components/contexts/SidebarContext"
import ChainContext from "../components/contexts/ChainContext"
import styles from "./_app.scss?type=global"
import MatomoTracker from "@datapunt/matomo-tracker-js"
import { enableAllPlugins } from "immer"
import { useEffect } from "react"
import "@fontsource/roboto/300.css"
import "@fontsource/roboto/400.css"
import "@fontsource/roboto/500.css"

enableAllPlugins()

const App = ({ Component, pageProps }) => {
  useEffect(() => {
    if (process.env.matomoUrl !== undefined && process.env.matomoSiteId !== undefined) {
      let tracker = new MatomoTracker({
        urlBase: process.env.matomoUrl,
        siteId: process.env.matomoSiteId
      })
      tracker.trackPageView()
    }
  }, [])

  return (<>
    <GameContext.Provider>
      <ChainContext.Provider>
        <SettingsContext.Provider>
          <SidebarContext.Provider>
            <Component {...pageProps} />
          </SidebarContext.Provider>
        </SettingsContext.Provider>
      </ChainContext.Provider>
    </GameContext.Provider>
    <style jsx>{styles}</style>
  </>)
}

export default App
