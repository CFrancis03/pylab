import './App.css'
import { lazy, Suspense, useEffect } from 'react'
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
import Toasts from './ui/Toasts'

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

  // Land at the top of each new page, like a normal site would.
  const path = useRoutePath()
  useEffect(() => {
    window.scrollTo(0, 0) // braces matter: an effect must not return scrollTo's value
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
      <Header route={route} />
      {page}
      <Toasts />
    </>
  )
}
