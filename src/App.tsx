import { AppProvider, useApp } from './state'
import { Notes, NoteCoinScreen } from './screens/Notes'
import { Portfolio } from './screens/Portfolio'
import { PositionScreen } from './screens/Position'
import { SpotCoinScreen } from './screens/SpotCoin'
import { ClosePositionSheet } from './sheets/ClosePosition'
import { NewNoteSheet } from './sheets/NewNote'
import { NewTradeSheet } from './sheets/NewTrade'
import { SellSheet } from './sheets/Sell'
import { useSpot } from './data/model'
import { TabBar } from './ui/TabBar'
import { Toast } from './ui/kit'
import { InstallHint, UpdatePill } from './pwa'

function Screen() {
  const { tab, view } = useApp()
  if (view.name === 'spotCoin') return <SpotCoinScreen id={view.id} />
  if (view.name === 'position') return <PositionScreen id={view.id} />
  if (view.name === 'noteCoin') return <NoteCoinScreen symbol={view.symbol} />
  return tab === 'portfolio' ? <Portfolio /> : <Notes />
}

function Sheets() {
  const { sheet } = useApp()
  if (!sheet) return null
  if (sheet.kind === 'trade') return <NewTradeSheet initialType={sheet.type} initialSymbol={sheet.symbol} />
  if (sheet.kind === 'sell') return <SellSheet coinId={sheet.coinId} />
  if (sheet.kind === 'close') return <ClosePositionSheet positionId={sheet.positionId} />
  return <NewNoteSheet initialSymbol={sheet.symbol} />
}

function Shell() {
  const { tab, view, sheet, openSheet, toastMsg, portfolioSeg } = useApp()
  const spot = useSpot()

  // Плюс контекстний: у Нотатках — нова нотатка, у Портфелі — нова угода поточного розділу.
  const onPlus = () => {
    if (tab === 'notes') {
      return openSheet({ kind: 'note', symbol: view.name === 'noteCoin' ? view.symbol : undefined })
    }
    if (view.name === 'spotCoin') {
      const symbol = spot.all.find((c) => c.coin.id === view.id)?.coin.symbol
      return openSheet({ kind: 'trade', type: 'spot', symbol })
    }
    openSheet({ kind: 'trade', type: view.name === 'position' ? 'futures' : portfolioSeg })
  }

  return (
    <>
      <main
        className="mx-auto w-full max-w-[520px] px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 112px)',
        }}
      >
        <Screen />
      </main>
      {!sheet && <InstallHint />}
      {!sheet && <TabBar onPlus={onPlus} />}
      <UpdatePill />
      <Sheets />
      <Toast message={toastMsg} />
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
