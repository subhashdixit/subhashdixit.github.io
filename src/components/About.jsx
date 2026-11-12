import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { FaGraduationCap, FaBriefcase, FaAward, FaMapMarkerAlt } from 'react-icons/fa'
import { resumeUrl } from '../data/experience.mjs'

const About = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const stats = [
    { icon: FaBriefcase, label: 'Experience', value: '5+ Years', highlight: true },
    { icon: FaAward, label: 'Projects', value: '51 Repos', highlight: true },
    { icon: FaGraduationCap, label: 'Education', value: 'NIT Durgapur' },
    { icon: FaMapMarkerAlt, label: 'Location', value: 'Kolkata, India' },
  ]

  return (
    <section id="about" className="py-32 bg-black relative overflow-hidden" ref={ref}>

      {/* Background pattern */}
      <div className="absolute inset-0 pattern-dots opacity-5"></div>

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
            About Me
          </motion.div>
          <h2 className="text-5xl sm:text-6xl font-light text-white mb-6">
            About<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Me</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-6"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + (index * 0.1), duration: 0.8 }}
                whileHover={{ y: -5 }}
                className="relative bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 hover:border-teal-400/30 rounded-lg p-6 overflow-hidden transition-all duration-300 group"
              >
                {/* Pattern overlay */}
                <div className="absolute inset-0 pattern-dots opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-teal-400/10 border border-teal-400/20 rounded-lg flex items-center justify-center mb-4">
                    <stat.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <p className={`text-2xl font-light mb-1 ${stat.highlight ? 'text-green-400' : 'text-white'}`}>{stat.value}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="space-y-4 text-zinc-400 leading-relaxed text-base">
              <p>
                Senior Data Scientist with <span className="text-green-400 font-normal">5+ years</span> of experience helping consumer goods, gaming, and analytics companies make smarter business decisions. Currently at <span className="font-normal text-teal-400">EPAM Systems</span>, building forecasting systems and smart validation tools that catch errors before they impact business.
              </p>
              <p>
                Graduated from <span className="font-normal text-teal-400">NIT Durgapur</span> (B.Tech Civil Engineering, CGPA: 8.71/10).
                Worked with industry leaders including <span className="font-normal text-teal-400">WNS Analytics</span>, <span className="font-normal text-teal-400">Affine Analytics</span>, and <span className="font-normal text-teal-400">Tata Consultancy Services</span>, delivering impactful ML solutions across multiple domains.
              </p>
              <p>
                Core expertise: <span className="font-normal text-teal-400">Demand Forecasting</span>, <span className="font-normal text-teal-400">Price Elasticity Modeling</span>, <span className="font-normal text-teal-400">Customer Segmentation</span>, and <span className="font-normal text-teal-400">Applied AI</span>. Built systems managing 500+ models across 5 countries with 88% accuracy, platforms processing 20,000+ comments monthly, and document intelligence tools using local LLMs.
              </p>
            </div>

            <motion.a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              className="inline-block px-8 py-3 border border-white/20 hover:border-white/40 text-white font-light rounded-sm transition-all duration-300 mt-4"
            >
              Download Resume
            </motion.a>
          </motion.div>
        </div>

      </div>
    </section>
  )
}

export default About
