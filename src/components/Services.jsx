import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { FaBrain, FaChartLine, FaRobot, FaLanguage, FaCube, FaLightbulb, FaArrowRight } from 'react-icons/fa'

const Services = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const services = [
    {
      icon: FaBrain,
      number: '001',
      title: 'Machine Learning',
      description: 'Build predictive models using high-quality data, offering scalable and customizable AI solutions for actionable insights and business intelligence.'
    },
    {
      icon: FaLanguage,
      number: '002',
      title: 'NLP & LLM Solutions',
      description: 'Advanced natural language processing, sentiment analysis, and large language model implementations with transformer architectures for text understanding.'
    },
    {
      icon: FaRobot,
      number: '003',
      title: 'Deep Learning',
      description: 'Neural networks for computer vision, pattern recognition, and complex AI tasks. Leverage deep learning architectures for advanced automation.'
    },
    {
      icon: FaChartLine,
      number: '004',
      title: 'Time Series & Forecasting',
      description: 'Predict future trends with advanced statistical models, anomaly detection for financial and operational data using ARIMA, Prophet, and ML techniques.'
    },
    {
      icon: FaCube,
      number: '005',
      title: 'RAG & Vector Search',
      description: 'Retrieval-Augmented Generation systems with vector databases, semantic search, and document intelligence for knowledge-based AI applications.'
    },
    {
      icon: FaLightbulb,
      number: '006',
      title: 'MLOps & Deployment',
      description: 'Production-ready ML pipelines, model monitoring, CI/CD for ML systems, and scalable API deployment with cloud infrastructure.'
    }
  ]

  return (
    <section id="services" className="py-32 bg-black relative overflow-hidden" ref={ref}>

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
            My Solutions
          </motion.div>
          <h2 className="text-5xl sm:text-6xl font-light text-white mb-6">
            Cutting-Edge<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              AI Solutions
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 + (index * 0.1), duration: 0.8 }}
              whileHover={{ y: -8 }}
              className="group relative bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 hover:border-teal-400/30 rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* Dot pattern overlay */}
              <div className="absolute inset-0 pattern-dots opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              {/* Diagonal line */}
              <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-transparent transform rotate-45"></div>
              </div>

              <div className="relative z-10 p-8">
                {/* Number badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 bg-teal-400/10 border border-teal-400/20 rounded-lg flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-teal-400" />
                  </div>
                  <span className="text-xs text-zinc-600 font-mono">/ {service.number}</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-light text-white mb-4 group-hover:text-teal-400 transition-colors duration-300">
                  {service.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Learn more link */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm text-zinc-500 group-hover:text-teal-400 transition-colors"
                >
                  <span>Learn more</span>
                  <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
