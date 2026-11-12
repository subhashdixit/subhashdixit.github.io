import { motion, useInView } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { useRef, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

import { companies, resumeUrl } from '../data/experience.mjs'

export default function Experience() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [expandedRole, setExpandedRole] = useState(companies[0].roles[0].title)

  return (
    <section id="experience" className="py-32 bg-black relative overflow-hidden" ref={ref} aria-labelledby="career-heading">
      <div className="absolute inset-0 pattern-lines opacity-5" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-2 border border-zinc-700/50 rounded-sm text-xs text-zinc-400 uppercase tracking-wider mb-6"
          >
            Career Journey
          </motion.div>
          <h2 id="career-heading" className="text-5xl sm:text-6xl font-light text-white mb-6">
            Work<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Experience</span>
          </h2>
          <a className="loop-career-resume" href={resumeUrl} target="_blank" rel="noopener noreferrer">
            View résumé <span aria-hidden="true">↗</span>
          </a>
        </motion.div>

        <ol className="loop-career-rail">
          {companies.map((company, index) => (
            <motion.li
              className="loop-career-company"
              key={company.logo}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + index * 0.1, duration: 0.8 }}
            >
              <div className="loop-career-company-body">
                <header className="loop-career-company-header">
                  <h3>
                    <a className="loop-career-company-link" href={company.website} target="_blank" rel="noopener noreferrer">
                      <span className="loop-career-logo">
                        <img src={`${import.meta.env.BASE_URL}experience/${company.logo}.webp`} width="56" height="56" alt="" />
                      </span>
                      {company.name}
                    </a>
                  </h3>
                  <p className="loop-career-location"><MapPin size={15} aria-hidden="true" />{company.location}</p>
                </header>
                <ol className="loop-career-roles">
                  {company.roles.map((role, roleIndex) => {
                    const isExpanded = expandedRole === role.title
                    const panelId = `career-${company.logo}-${roleIndex}`
                    return (
                      <li className="loop-career-role" key={role.title}>
                        <h4 className="loop-career-role-heading">
                          <button
                            className="loop-career-role-toggle"
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={panelId}
                            onClick={() => setExpandedRole(current => current === role.title ? null : role.title)}
                          >
                            <span className="loop-career-role-title">{role.title}</span>
                            <span className="loop-career-period">{role.period}</span>
                            <span className="loop-career-chevron" aria-hidden="true">
                              {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                            </span>
                          </button>
                        </h4>
                        <motion.div
                          id={panelId}
                          initial={false}
                          animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                          inert={!isExpanded}
                        >
                          <div className="loop-career-details">
                            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{role.description}</p>
                            <h5 className="text-sm font-light text-zinc-500 uppercase tracking-wider mb-4">
                              Key Achievements &amp; Projects
                            </h5>
                            <ul className="space-y-3">
                              {role.achievements.map(achievement => (
                                <li key={achievement} className="flex items-start gap-3 text-sm text-zinc-400 leading-relaxed">
                                  <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-2 shrink-0" aria-hidden="true" />
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
