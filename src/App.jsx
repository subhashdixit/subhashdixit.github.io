import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import About from './components/About'
import AiLab from './components/AiLab'
import Experience from './components/Experience'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Contact from './components/Contact'
import profileImage from './assets/profile-soft-teal.webp'
import './App.css'

const pages = [
  { id: 'home', label: 'Home' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'ai-lab', label: 'Ask Subhash' },
  { id: 'contact', label: 'Contact' },
]

const detailPages = ['experience', 'projects', 'ai-lab', 'about', 'contact']

function currentLocation() {
  return window.location.hash.slice(1) || 'home'
}

function Home() {
  return (
    <section className="loop-intro loop-home" aria-labelledby="intro-title">
      <div className="loop-home-intro">
        <div className="loop-home-identity" id="home-experience">
          <p className="loop-label">Senior Data Scientist · Applied AI</p>
          <h1 id="intro-title" className="loop-name">Subhash Dixit</h1>
          <p className="loop-home-tenure">5+ years of experience</p>
        </div>
        <div className="loop-home-summary">
          <p className="loop-tagline">Building forecasting systems, modelling pricing and promotions, and developing AI tools.</p>
          <p>I’ve developed and tuned time-series models for sales and demand forecasting, built econometric models for price elasticity and promotional response, and used NLP and topic modelling to find recurring themes in customer feedback.</p>
          <p id="home-projects">I built <a href="#ai-lab">Ask Subhash</a>, a RAG chatbot that answers questions about my work and links to the original code, notebook, or report. I also build reusable AI skills and agents to help me review code, debug, and test changes.</p>
        </div>
      </div>

      <div className="loop-home-profile">
        <img className="loop-home-portrait" src={profileImage} alt="Subhash Dixit" width={176} height={176} />
        <div className="loop-home-affiliation">
          <p>EPAM Systems</p>
                  <p>B.Tech · NIT&nbsp;Durgapur</p>
        </div>
      </div>

      <dl className="loop-home-skills">
        <div>
          <dt>Data Science</dt>
          <dd>Time-Series Forecasting, Econometrics, Predictive Analytics, Machine Learning, NLP</dd>
        </div>
        <div>
          <dt>Data Tools &amp; Deployment</dt>
          <dd>Python, SQL, PySpark, Databricks</dd>
          <dd>CI/CD, Docker, AWS</dd>
        </div>
        <div>
          <dt>Applied AI</dt>
          <dd>RAG Chatbots, AI Agents, Reusable AI Skills</dd>
        </div>
      </dl>

      <section className="loop-home-work" id="home-contact" aria-labelledby="home-work-title">
        <h2 id="home-work-title">Work with me</h2>
        <p>I’m looking for data science and applied AI roles in the <strong>USA, Europe, UAE, and Australia</strong>. In India, I’m open to select roles at established product companies, large enterprises, and major consulting firms. I’m also open to freelance projects.</p>
        <div className="loop-home-links">
          <a href="#experience">View experience <span aria-hidden="true">↗</span></a>
          <a href="#projects">Explore projects <span aria-hidden="true">↗</span></a>
          <a href="#contact">Get in touch <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </section>
  )
}

export default function App() {
  const [location, setLocation] = useState(currentLocation)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggle = useRef(null)
  const page = detailPages.includes(location) ? location : 'home'

  useEffect(() => {
    const navigate = () => {
      setLocation(currentLocation())
      setMenuOpen(false)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    const section = page === 'home' && document.getElementById(location)

    if (section) {
      section.scrollIntoView({ behavior: 'auto', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location, page])

  return (
    <div className={page === 'ai-lab' ? 'loop-site loop-site--chat' : 'loop-site'}>
      <div className="loop-shell">
        <header className="loop-header" onKeyDown={event => {
          if (menuOpen && event.key === 'Escape') {
            setMenuOpen(false)
            menuToggle.current?.focus()
          }
        }}>
          <a href="#home" className="loop-brand" onClick={() => setMenuOpen(false)}>
            <img className="loop-brand-mark" src="/favicon.svg" width="40" height="40" alt="" />
            <span>Subhash Dixit</span>
          </a>
          <button ref={menuToggle} className="loop-menu-toggle" type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls="portfolio-navigation" aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}>
            {menuOpen ? <X size={23} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
          </button>
          <nav id="portfolio-navigation" aria-label="Portfolio" data-open={menuOpen}>
            {pages.map(({ id, label }) => (
              <a key={id} href={`#${id}`} aria-current={page === id ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className={page === 'home' || page === 'ai-lab' ? '' : 'loop-inner-page'}>
          {page === 'home' && <Home />}
          {page === 'experience' && <Experience />}
          {page === 'projects' && <Projects />}
          <AiLab active={page === 'ai-lab'} />
          {page === 'contact' && <Contact />}
          {page === 'about' && <><About /><Skills /><Contact /></>}
        </main>
      </div>
    </div>
  )
}
