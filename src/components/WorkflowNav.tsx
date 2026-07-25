import { NavLink } from 'react-router-dom'

const steps = [
  { to: '/', label: 'Upload' },
  { to: '/review', label: 'Adjust' },
  { to: '/visualize', label: 'Visualize' },
] as const

export function WorkflowNav({ ready }: { ready: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <NavLink to="/" className="brand-mark">
          <span />
          Exvyn
        </NavLink>
        <NavLink to="/brief" className="brief-menu-link">
          Brief
        </NavLink>
      </div>
      <nav className="workflow" aria-label="Workflow">
        {steps.map((step, index) => (
          <NavLink
            key={step.to}
            to={step.to}
            end={step.to === '/'}
            className={({ isActive }) =>
              `workflow-step ${isActive ? 'is-active' : ''} ${
                step.to !== '/' && !ready ? 'is-locked' : ''
              }`
            }
            onClick={(e) => {
              if (step.to !== '/' && !ready) e.preventDefault()
            }}
          >
            <em>{index + 1}</em>
            {step.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
