import './App.css'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useProgress } from './game/store'
import BossPage from './pages/BossPage'
import CardsPage from './pages/CardsPage'
import CheatSheetPage from './pages/CheatSheetPage'
import ExamPage from './pages/ExamPage'
import LessonPage from './pages/LessonPage'
import NotFound from './pages/NotFound'
import OverworldMap from './pages/OverworldMap'
import ProfilePage from './pages/ProfilePage'
import RegionPage from './pages/RegionPage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'
import StudyPage from './pages/StudyPage'
import { matchRoute, useRoutePath } from './router'
import Header from './ui/Header'
import Confetti from './ui/Confetti'
import Toasts from './ui/Toasts'
import UpdateBanner from './ui/UpdateBanner'

// Dev-only playground; the dynamic import is dropped from production builds.
const EngineLab = import.meta.env.DEV ? lazy(() => import('./dev/EngineLab')) : null
const VizLab = import.meta.env.DEV ? lazy(() => import('./dev/VizLab')) : null

export default function App() {
  const route = matchRoute(useRoutePath())
  const { theme } = useProgress().settings

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  // "Animations: off" is applied as one attribute that the stylesheet keys off.
  const { motion } = useProgress().settings
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', motion ? 'on' : 'off')
  }, [motion])

  // Land at the top of each new page, like a normal site would.
  const path = useRoutePath()
  const firstPath = useRef(true)
  useEffect(() => {
    window.scrollTo(0, 0) // braces matter: an effect must not return scrollTo's value
    // Move keyboard and screen-reader focus to the new page, as a full page load would. Not on first load.
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    const main = document.querySelector<HTMLElement>('main')
    main?.setAttribute('tabindex', '-1')
    main?.focus({ preventScroll: true })
  }, [path])

  let page
  switch (route.name) {
    case 'map': page = <OverworldMap />; break
    case 'region': page = <RegionPage id={route.id} />; break
    case 'boss': page = <BossPage id={route.id} />; break
    case 'lesson': page = <LessonPage id={route.id} lessonId={route.lessonId} />; break
    case 'study': page = <StudyPage />; break
    case 'review': page = <ReviewPage />; break
    case 'exam': page = <ExamPage />; break
    case 'cards': page = <CardsPage />; break
    case 'cheatsheet': page = <CheatSheetPage />; break
    case 'profile': page = <ProfilePage />; break
    case 'settings': page = <SettingsPage />; break
    case 'dev-viz': page = VizLab ? <Suspense fallback={null}><VizLab /></Suspense> : <NotFound />; break
    case 'dev-engine': page = EngineLab ? <Suspense fallback={null}><EngineLab /></Suspense> : <NotFound />; break
    default: page = <NotFound />
  }

  return (
    <>
      <button className="skip-link" onClick={() => { const m = document.querySelector<HTMLElement>('main'); m?.setAttribute('tabindex', '-1'); m?.focus() }}>
        Skip to content
      </button>
      <Header route={route} />
      {page}
      <Toasts />
      <UpdateBanner />
      <Confetti />
    </>
  )
}
