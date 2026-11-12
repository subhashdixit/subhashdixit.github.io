import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { FaArrowRight } from 'react-icons/fa'

import { githubPages, githubProfile, projects } from '../data/projects.mjs'

export default function Projects() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })
  const reduceMotion = useReducedMotion()
  const reveal = isInView || reduceMotion

  return (
    <section id="projects" className="py-32 bg-black relative overflow-hidden" ref={sectionRef} aria-labelledby="projects-heading">
      <div className="relative z-10">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          animate={reveal ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reveal ? { opacity: 1 } : undefined}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-2 border border-zinc-700/50 rounded-sm text-xs text-zinc-400 uppercase tracking-wider mb-6"
          >
            Portfolio
          </motion.div>
          <h1 id="projects-heading" className="text-5xl sm:text-6xl font-light text-white mb-6">
            Featured<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Projects</span>
          </h1>
        </motion.div>

        <div className="loop-project-grid mb-16">
          {projects.map(({ slug, title, description, liveUrl = `${githubPages}/${slug}/` }, index) => (
            <motion.article
              key={slug}
              initial={reduceMotion ? false : { opacity: 0, y: 50 }}
              animate={reveal ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
              whileHover={reduceMotion ? undefined : { y: -8, transition: { duration: 0.2, delay: 0 } }}
              className="loop-project-card"
            >
              <div className="loop-project-copy">
                <div className="loop-project-card-header">
                  <h2>
                    <a
                      className="loop-project-live"
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${title} live app`}
                    >
                      {title}
                    </a>
                  </h2>
                  <div className="loop-project-links">
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} live app`}>
                      Live <span aria-hidden="true">↗</span>
                    </a>
                    <a href={`${githubProfile}/${slug}`} target="_blank" rel="noopener noreferrer" aria-label={`${title} on GitHub`}>
                      GitHub <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div>
                <p>{description}</p>
              </div>
              <div className="loop-project-preview">
                <img
                  src={`${import.meta.env.BASE_URL}projects/covers/${slug}.webp`}
                  alt=""
                  width="1080"
                  height="540"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={reveal ? { opacity: 1 } : undefined}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <motion.a
            href={`${githubProfile}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 hover:border-white/40 text-white rounded-sm font-light transition-colors duration-300 group"
          >
            <span>View All Projects</span>
            <FaArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
