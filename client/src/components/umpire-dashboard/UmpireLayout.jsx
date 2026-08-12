import UmpireSidebar from './UmpireSidebar.jsx'
import BackButton from '../common/BackButton.jsx'

// Mirrors AdminLayout.jsx exactly.
export default function UmpireLayout({ title, subtitle, children }) {
  return (
    <main
      className="min-h-screen bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `
          linear-gradient(
            rgba(2,6,23,0.78),
            rgba(2,6,23,0.78)
          ),
          url('/images/cricket-stadium.jpg')
        `,
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
        <UmpireSidebar />

        <div className="min-w-0 flex-1">
          <BackButton fallback="/umpire" className="mb-4" />

          {(title || subtitle) && (
            <div className="mb-6">
              {title && <h1 className="text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>}
              {subtitle && <p className="mt-3 text-slate-300">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </main>
  )
}
