import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatedField } from './components/AnimatedField'
import { SiteFooter } from './components/SiteFooter'
import { WorkflowNav } from './components/WorkflowNav'
import { ExvynProvider, useExvyn } from './context/ExvynContext'
import { BriefPage } from './pages/BriefPage'
import { ReviewPage } from './pages/ReviewPage'
import { UploadPage } from './pages/UploadPage'
import { VisualizePage } from './pages/VisualizePage'

function Shell() {
  const { session } = useExvyn()
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isBrief = location.pathname === '/brief'

  if (isBrief) {
    return (
      <div className="app-shell is-brief">
        <BriefPage />
      </div>
    )
  }

  return (
    <div className={`app-shell ${isLanding ? 'is-landing' : ''}`}>
      {!isLanding ? <AnimatedField density="soft" className="app-field" /> : null}
      <WorkflowNav ready={Boolean(session)} />
      <div className="app-main">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/brief" element={<BriefPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <SiteFooter />
    </div>
  )
}

export default function App() {
  return (
    <ExvynProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ExvynProvider>
  )
}
